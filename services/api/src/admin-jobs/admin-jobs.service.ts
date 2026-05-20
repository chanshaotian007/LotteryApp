import { Injectable, NotFoundException } from "@nestjs/common";
import { GameCode, JobType, type AdminJobRun } from "@lottery/contracts";
import { fetchDraws } from "@lottery/adapters";
import { trainModelDraft } from "@lottery/domain";
import { JobStatusDb } from "@prisma/client";
import { AuditService } from "../common/audit.service";
import { AppConfigService } from "../common/config.service";
import { buildDataVersion, toDateOrNull, toJsonValue } from "../common/database.utils";
import { PrismaService } from "../common/prisma.service";
import { DrawsService } from "../draws/draws.service";
import { MembershipsService } from "../memberships/memberships.service";
import { OrdersService } from "../orders/orders.service";
import { PaymentsService } from "../payments/payments.service";
import { GrantEntitlementDto, ReconcileDto, SyncDto, TrainDto } from "./admin-jobs.dto";

@Injectable()
export class AdminJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly drawsService: DrawsService,
    private readonly membershipsService: MembershipsService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
    private readonly audit: AuditService,
  ) {}

  async listJobs(): Promise<AdminJobRun[]> {
    const jobs = await this.prisma.jobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return jobs.map((job) => ({
      id: job.id,
      jobType: job.jobType as JobType,
      startedAt: job.startedAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
      status: job.status === JobStatusDb.succeeded ? "succeeded" : job.status,
      payload: (job.payload as Record<string, unknown> | null) ?? null,
      result: (job.result as Record<string, unknown> | null) ?? null,
    }));
  }

  async runSync(input: SyncDto, actorUserId?: string): Promise<Record<string, unknown>> {
    const job = await this.prisma.jobRun.create({
      data: {
        jobType: input.gameCode === GameCode.DOUBLE_COLOR_BALL ? JobType.SYNC_SSQ : JobType.SYNC_DLT,
        status: JobStatusDb.running,
        payload: toJsonValue(input),
      },
    });
    try {
      const fetched = await fetchDraws(input.gameCode, input.limit, this.config.cwlUserAgent);
      let inserted = 0;
      let updated = 0;
      for (const draw of fetched) {
        const existing = await this.prisma.draw.findUnique({
          where: {
            gameCode_issue: {
              gameCode: input.gameCode,
              issue: draw.issue,
            },
          },
        });
        if (existing) {
          await this.prisma.draw.update({
            where: { id: existing.id },
            data: {
              drawDate: toDateOrNull(draw.drawDate),
              primaryNumbers: draw.primaryNumbers,
              secondaryNumbers: draw.secondaryNumbers,
              prizeTiers: toJsonValue(draw.prizeTiers),
              sourceUrl: draw.sourceUrl,
              sourceHash: draw.sourceHash,
            },
          });
          updated += 1;
        } else {
          await this.prisma.draw.create({
            data: {
              gameCode: input.gameCode,
              issue: draw.issue,
              drawDate: toDateOrNull(draw.drawDate),
              primaryNumbers: draw.primaryNumbers,
              secondaryNumbers: draw.secondaryNumbers,
              prizeTiers: toJsonValue(draw.prizeTiers),
              sourceUrl: draw.sourceUrl,
              sourceHash: draw.sourceHash,
            },
          });
          inserted += 1;
        }
      }
      const currentDraws = await this.drawsService.listDraws(input.gameCode, 20_000);
      const result = {
        gameCode: input.gameCode,
        fetched: fetched.length,
        inserted,
        updated,
        dataVersion: buildDataVersion(input.gameCode, currentDraws),
      };
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatusDb.succeeded,
          finishedAt: new Date(),
          result: toJsonValue(result),
        },
      });
      await this.audit.write({
        userId: actorUserId ?? null,
        action: "admin.sync",
        resourceType: "jobRun",
        resourceId: job.id,
        payload: result,
      });
      return result;
    } catch (error) {
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatusDb.failed,
          finishedAt: new Date(),
          result: toJsonValue({
            message: error instanceof Error ? error.message : "unknown error",
          }),
        },
      });
      throw error;
    }
  }

  async runTrain(input: TrainDto, actorUserId?: string): Promise<Record<string, unknown>> {
    const job = await this.prisma.jobRun.create({
      data: {
        jobType: input.gameCode === GameCode.DOUBLE_COLOR_BALL ? JobType.TRAIN_SSQ : JobType.TRAIN_DLT,
        status: JobStatusDb.running,
        payload: toJsonValue(input),
      },
    });
    try {
      const draws = await this.drawsService.listDraws(input.gameCode, 20_000);
      const draft = trainModelDraft(
        input.gameCode,
        draws,
        input.rollingWindow,
        input.randomSeed,
        input.trainingWindow,
        input.minTrainingSamples,
      );
      await this.prisma.modelRun.create({
        data: {
          gameCode: draft.gameCode,
          version: draft.version,
          algorithm: draft.algorithm,
          featureSummary: toJsonValue(draft.featureSummary),
          backtestReport: toJsonValue(draft.backtestReport),
        },
      });
      const result = {
        gameCode: input.gameCode,
        modelVersion: draft.version,
        algorithm: draft.algorithm,
        backtestReport: draft.backtestReport,
        trainingReport: draft.featureSummary.training as Record<string, unknown>,
      };
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatusDb.succeeded,
          finishedAt: new Date(),
          result: toJsonValue(result),
        },
      });
      await this.audit.write({
        userId: actorUserId ?? null,
        action: "admin.train",
        resourceType: "jobRun",
        resourceId: job.id,
        payload: result,
      });
      return result;
    } catch (error) {
      await this.prisma.jobRun.update({
        where: { id: job.id },
        data: {
          status: JobStatusDb.failed,
          finishedAt: new Date(),
          result: toJsonValue({
            message: error instanceof Error ? error.message : "unknown error",
          }),
        },
      });
      throw error;
    }
  }

  async grantEntitlement(input: GrantEntitlementDto, actorUserId?: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({ where: { openId: input.openId } });
    if (!user) {
      throw new NotFoundException("user not found");
    }
    const product = input.productCode
      ? await this.prisma.product.findUnique({ where: { code: input.productCode } })
      : null;
    await this.membershipsService.grantEntitlement({
      userId: user.id,
      productId: product?.id ?? null,
      source: "gift",
      durationDays: input.durationDays,
    });
    const membership = await this.membershipsService.getCurrentMembership(user.id);
    await this.audit.write({
      userId: actorUserId ?? null,
      action: "admin.grantEntitlement",
      resourceType: "user",
      resourceId: user.id,
      payload: {
        openId: input.openId,
        durationDays: input.durationDays,
        productCode: input.productCode ?? null,
      },
    });
    return { userId: user.id, membership };
  }

  async listOrders() {
    return this.ordersService.listAllOrders();
  }

  async reconcile(input: ReconcileDto): Promise<Record<string, unknown>> {
    return this.paymentsService.reconcileTradeBill(input.billDate.slice(0, 10));
  }

  async healthcheckSources(): Promise<Record<string, unknown>> {
    const [ssq, dlt] = await Promise.allSettled([
      fetchDraws(GameCode.DOUBLE_COLOR_BALL, 1, this.config.cwlUserAgent),
      fetchDraws(GameCode.SUPER_LOTTO, 1, this.config.cwlUserAgent),
    ]);
    return {
      ssq: ssq.status === "fulfilled" ? { ok: true, count: ssq.value.length } : { ok: false, error: ssq.reason?.message ?? "unknown" },
      dlt: dlt.status === "fulfilled" ? { ok: true, count: dlt.value.length } : { ok: false, error: dlt.reason?.message ?? "unknown" },
      checkedAt: new Date().toISOString(),
    };
  }
}
