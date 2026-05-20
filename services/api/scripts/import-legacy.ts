import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { toDateOrNull, toJsonValue } from "../src/common/database.utils";

interface LegacyExport {
  games: Array<{
    code: string;
    name: string;
    draw_source_url: string;
    rule_source_url: string;
    ticket_price: number;
  }>;
  draws: Array<{
    game_code: string;
    issue: string;
    draw_date: string | null;
    primary_numbers: number[];
    secondary_numbers: number[];
    prize_tiers: Array<Record<string, unknown>>;
    source_url: string;
    source_hash: string;
  }>;
  model_runs: Array<{
    game_code: string;
    version: string;
    algorithm: string;
    feature_summary: Record<string, unknown>;
    backtest_report: Record<string, unknown>;
    created_at?: string | null;
  }>;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: pnpm --filter @lottery/api legacy:import <legacy-export.json>");
  }

  const prisma = new PrismaClient();
  const payload = JSON.parse(readFileSync(resolve(inputPath), "utf8")) as LegacyExport;

  await prisma.$transaction(async (tx) => {
    for (const game of payload.games) {
      await tx.game.upsert({
        where: { code: game.code },
        create: {
          code: game.code,
          name: game.name,
          drawSourceUrl: game.draw_source_url,
          ruleSourceUrl: game.rule_source_url,
          ticketPrice: game.ticket_price,
        },
        update: {
          name: game.name,
          drawSourceUrl: game.draw_source_url,
          ruleSourceUrl: game.rule_source_url,
          ticketPrice: game.ticket_price,
        },
      });
    }

    for (const draw of payload.draws) {
      await tx.draw.upsert({
        where: {
          gameCode_issue: {
            gameCode: draw.game_code,
            issue: draw.issue,
          },
        },
        create: {
          gameCode: draw.game_code,
          issue: draw.issue,
          drawDate: toDateOrNull(draw.draw_date),
          primaryNumbers: draw.primary_numbers,
          secondaryNumbers: draw.secondary_numbers,
          prizeTiers: toJsonValue(draw.prize_tiers),
          sourceUrl: draw.source_url,
          sourceHash: draw.source_hash,
        },
        update: {
          drawDate: toDateOrNull(draw.draw_date),
          primaryNumbers: draw.primary_numbers,
          secondaryNumbers: draw.secondary_numbers,
          prizeTiers: toJsonValue(draw.prize_tiers),
          sourceUrl: draw.source_url,
          sourceHash: draw.source_hash,
        },
      });
    }

    for (const run of payload.model_runs) {
      await tx.modelRun.upsert({
        where: { version: run.version },
        create: {
          gameCode: run.game_code,
          version: run.version,
          algorithm: run.algorithm,
          featureSummary: toJsonValue(run.feature_summary),
          backtestReport: toJsonValue(run.backtest_report),
          createdAt: run.created_at ? new Date(run.created_at) : undefined,
        },
        update: {
          algorithm: run.algorithm,
          featureSummary: toJsonValue(run.feature_summary),
          backtestReport: toJsonValue(run.backtest_report),
        },
      });
    }
  });

  await prisma.$disconnect();
  console.log(
    JSON.stringify(
      {
        importedGames: payload.games.length,
        importedDraws: payload.draws.length,
        importedModelRuns: payload.model_runs.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
