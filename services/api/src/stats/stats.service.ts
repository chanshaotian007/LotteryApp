import { Injectable } from "@nestjs/common";
import { GameCode, type StatsResponseContract } from "@lottery/contracts";
import { buildStats } from "@lottery/domain";
import { buildDataVersion } from "../common/database.utils";
import { DrawsService } from "../draws/draws.service";

@Injectable()
export class StatsService {
  constructor(private readonly drawsService: DrawsService) {}

  async getStats(gameCode: GameCode): Promise<StatsResponseContract> {
    const draws = await this.drawsService.listDraws(gameCode, 5000);
    return buildStats(gameCode, draws, buildDataVersion(gameCode, draws));
  }
}
