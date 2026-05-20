import { Controller, Get, Query } from "@nestjs/common";
import { StatsResponseContract } from "@lottery/contracts";
import { StatsQueryDto } from "./stats.dto";
import { StatsService } from "./stats.service";

@Controller("api/v1/stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@Query() query: StatsQueryDto): Promise<StatsResponseContract> {
    return this.statsService.getStats(query.gameCode);
  }
}
