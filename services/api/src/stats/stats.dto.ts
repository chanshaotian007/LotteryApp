import { IsEnum } from "class-validator";
import { GameCode } from "@lottery/contracts";

export class StatsQueryDto {
  @IsEnum(GameCode)
  gameCode!: GameCode;
}
