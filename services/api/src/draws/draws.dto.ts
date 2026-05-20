import { Type } from "class-transformer";
import { IsEnum, IsInt, Max, Min } from "class-validator";
import { GameCode } from "@lottery/contracts";

export class DrawsQueryDto {
  @IsEnum(GameCode)
  gameCode!: GameCode;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 50;
}
