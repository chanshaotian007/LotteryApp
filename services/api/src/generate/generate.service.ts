import { createHash } from "node:crypto";
import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { ComplexPreference, GameCode, GenerateMode, defaultRiskTips, type DrawRecord, type GenerateResponseContract } from "@lottery/contracts";
import { generateCandidates } from "@lottery/domain";
import { GenerationModeDb } from "@prisma/client";
import { AuditService } from "../common/audit.service";
import { AppConfigService } from "../common/config.service";
import { buildDataVersion, toJsonValue, toNullableJsonValue } from "../common/database.utils";
import { PrismaService } from "../common/prisma.service";
import { DrawsService } from "../draws/draws.service";
import { MembershipsService } from "../memberships/memberships.service";
import { GenerateDto } from "./generate.dto";

@Injectable()
export class GenerateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drawsService: DrawsService,
    private readonly membershipsService: MembershipsService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  async generate(userId: string, payload: GenerateDto, ip?: string | null): Promise<GenerateResponseContract> {
    if (
      payload.budgetMin !== undefined &&
      payload.budgetMin !== null &&
      payload.budgetMax !== undefined &&
      payload.budgetMax !== null &&
      payload.budgetMin > payload.budgetMax
    ) {
      throw new BadRequestException("budgetMin must be less than or equal to budgetMax");
    }
    await this.checkRateLimit(userId);
    const member = await this.membershipsService.isMember(userId);
    const usesMemberFeature =
      payload.mode !== GenerateMode.RANDOM ||
      payload.excludeHighPrizeHistory ||
      payload.budgetMin !== undefined && payload.budgetMin !== null ||
      payload.budgetMax !== undefined && payload.budgetMax !== null;
    if (usesMemberFeature && !member) {
      throw new ForbiddenException("membership is required for history exclusion, model prediction, and budget generation");
    }

    const draws = await this.drawsService.listDraws(payload.gameCode, 20_000);
    const exclude =
      payload.excludeHighPrizeHistory ||
      payload.mode === GenerateMode.EXCLUDE_HISTORY ||
      payload.mode === GenerateMode.MODEL_PREDICTION;
    const latestRun = await this.prisma.modelRun.findFirst({
      where: { gameCode: payload.gameCode },
      orderBy: { createdAt: "desc" },
    });
    const latestModelReport = latestRun
      ? {
          modelVersion: latestRun.version,
          algorithm: latestRun.algorithm,
          featureSummary: latestRun.featureSummary as Record<string, unknown>,
          backtestReport: latestRun.backtestReport as Record<string, unknown>,
        }
      : null;
    const latestModelProfile =
      latestRun && typeof latestRun.featureSummary === "object" && latestRun.featureSummary
        ? {
            featureWeights:
              ((latestRun.featureSummary as Record<string, any>).trainedModel?.featureWeights as Record<string, number> | undefined) ??
              null,
          }
        : null;
    const generated = this.generateWithCompatibilityFallback(payload, draws, exclude, latestModelProfile);
    if (generated.candidates.length === 0) {
      throw new UnprocessableEntityException("no candidate matched the requested budget and exclusion constraints");
    }

    const response: GenerateResponseContract = {
      mode: payload.mode,
      candidates: generated.candidates,
      dataVersion: buildDataVersion(payload.gameCode, draws),
      modelVersion: latestRun?.version ?? null,
      memberFeature: usesMemberFeature,
      riskTips: [...defaultRiskTips],
      modelReport: generated.report
        ? {
            ...generated.report,
            ...(latestModelReport ? { latestModelBacktest: latestModelReport } : {}),
          }
        : latestModelReport,
    };

    await this.prisma.generationLog.create({
      data: {
        userId,
        gameCode: payload.gameCode,
        mode: payload.mode as GenerationModeDb,
        memberFeature: usesMemberFeature,
        requestPayload: toJsonValue(payload),
        responsePayload: toNullableJsonValue(response),
        ipHash: ip ? createHash("sha256").update(ip).digest("hex") : null,
      },
    });
    await this.audit.write({
      userId,
      action: "generate",
      resourceType: "generation",
      payload: {
        gameCode: payload.gameCode,
        mode: payload.mode,
        memberFeature: usesMemberFeature,
      },
    });
    return response;
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const limit = this.config.rateLimitPerMinute;
    if (limit <= 0) {
      return;
    }
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const count = await this.prisma.generationLog.count({
      where: {
        userId,
        createdAt: { gte: oneMinuteAgo },
      },
    });
    if (count >= limit) {
      throw new HttpException("generate rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private generateWithCompatibilityFallback(
    payload: GenerateDto,
    draws: DrawRecord[],
    exclude: boolean,
    modelProfile: { featureWeights?: Record<string, number> | null } | null,
  ): { candidates: GenerateResponseContract["candidates"]; report: Record<string, unknown> | null } {
    const attempts: Array<{
      preference: ComplexPreference;
      targetPrizeMode: boolean;
      budgetMin?: number | null;
      budgetMax?: number | null;
      excludeHistory: boolean;
      fallbackReason: string | null;
    }> = [
      {
        preference: payload.complexPreference,
        targetPrizeMode: payload.targetPrizeMode,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        excludeHistory: exclude,
        fallbackReason: null,
      },
    ];

    if (payload.targetPrizeMode) {
      attempts.push({
        preference: payload.complexPreference,
        targetPrizeMode: false,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        excludeHistory: exclude,
        fallbackReason: "disabled targetPrizeMode because it exceeded the requested budget",
      });
    }

    for (const preference of [
      ComplexPreference.SINGLE,
      ComplexPreference.CONSERVATIVE,
      ComplexPreference.BALANCED,
    ]) {
      if (preference === payload.complexPreference && !payload.targetPrizeMode) {
        continue;
      }
      attempts.push({
        preference,
        targetPrizeMode: false,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        excludeHistory: exclude,
        fallbackReason: `reduced complexPreference to ${preference} to satisfy budget constraints`,
      });
    }

    if (exclude) {
      attempts.push({
        preference: ComplexPreference.SINGLE,
        targetPrizeMode: false,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        excludeHistory: false,
        fallbackReason: "disabled history exclusion after stricter attempts produced no candidates",
      });
    }

    if (payload.budgetMin !== undefined || payload.budgetMax !== undefined) {
      attempts.push({
        preference: ComplexPreference.SINGLE,
        targetPrizeMode: false,
        budgetMin: null,
        budgetMax: null,
        excludeHistory: false,
        fallbackReason: "relaxed budget constraints because no legal ticket matched the requested range",
      });
    }

    const seen = new Set<string>();
    for (const attempt of attempts) {
      const key = JSON.stringify(attempt);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const result = generateCandidates({
        gameCode: payload.gameCode,
        mode: payload.mode,
        count: payload.count,
        preference: attempt.preference,
        budgetMin: attempt.budgetMin,
        budgetMax: attempt.budgetMax,
        excludeHistory: attempt.excludeHistory,
        targetPrizeMode: attempt.targetPrizeMode,
        randomSeed: payload.randomSeed,
        draws,
        modelProfile,
      });
      if (result.candidates.length > 0) {
        if (attempt.fallbackReason) {
          result.report = {
            ...(result.report ?? {}),
            compatibilityFallback: {
              reason: attempt.fallbackReason,
              appliedPreference: attempt.preference,
              targetPrizeMode: attempt.targetPrizeMode,
              budgetMin: attempt.budgetMin,
              budgetMax: attempt.budgetMax,
              excludeHistory: attempt.excludeHistory,
            },
          };
        }
        return result;
      }
    }
    return { candidates: [], report: null };
  }
}
