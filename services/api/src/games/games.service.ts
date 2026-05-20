import { Injectable } from "@nestjs/common";
import { type GameSummary } from "@lottery/contracts";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async listGames(): Promise<GameSummary[]> {
    const games = await this.prisma.game.findMany({
      orderBy: { code: "asc" },
    });

    return Promise.all(
      games.map(async (game) => {
        const [latest, count] = await Promise.all([
          this.prisma.draw.findFirst({
            where: { gameCode: game.code },
            orderBy: { issue: "desc" },
            select: { issue: true },
          }),
          this.prisma.draw.count({
            where: { gameCode: game.code },
          }),
        ]);
        return {
          code: game.code as GameSummary["code"],
          name: game.name,
          ticketPrice: game.ticketPrice,
          ruleSourceUrl: game.ruleSourceUrl,
          drawSourceUrl: game.drawSourceUrl,
          latestIssue: latest?.issue ?? null,
          drawCount: count,
        };
      }),
    );
  }
}
