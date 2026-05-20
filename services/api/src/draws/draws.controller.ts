import { Controller, Get, Query } from "@nestjs/common";
import { DrawRecord } from "@lottery/contracts";
import { DrawsQueryDto } from "./draws.dto";
import { DrawsService } from "./draws.service";

@Controller("api/v1/draws")
export class DrawsController {
  constructor(private readonly drawsService: DrawsService) {}

  @Get()
  listDraws(@Query() query: DrawsQueryDto): Promise<DrawRecord[]> {
    return this.drawsService.listDraws(query.gameCode, query.limit);
  }
}
