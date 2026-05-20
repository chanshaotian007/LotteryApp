import { Controller, Get } from "@nestjs/common";
import { GameSummary } from "@lottery/contracts";
import { GamesService } from "./games.service";

@Controller("api/v1/games")
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  listGames(): Promise<GameSummary[]> {
    return this.gamesService.listGames();
  }
}
