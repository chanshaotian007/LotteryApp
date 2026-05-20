import { Injectable } from "@nestjs/common";
import { GameCode, type DrawRecord } from "@lottery/contracts";
import { jsonNumberArray, jsonObjectArray, toDateString } from "../common/database.utils";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class DrawsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDraws(gameCode: GameCode, limit: number): Promise<DrawRecord[]> {
    const draws = await this.prisma.draw.findMany({
      where: { gameCode },
      orderBy: { issue: "desc" },
      take: Math.max(1, Math.min(limit, 20_000)),
    });
    return draws.map((draw) => ({
      gameCode: draw.gameCode as GameCode,
      issue: draw.issue,
      drawDate: toDateString(draw.drawDate),
      primaryNumbers: jsonNumberArray(draw.primaryNumbers),
      secondaryNumbers: jsonNumberArray(draw.secondaryNumbers),
      prizeTiers: jsonObjectArray(draw.prizeTiers),
      sourceUrl: draw.sourceUrl,
      sourceHash: draw.sourceHash,
    }));
  }
}
