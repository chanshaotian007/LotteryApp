import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { GameCode } from "@lottery/contracts";

export class SyncDto {
  @IsEnum(GameCode)
  gameCode!: GameCode;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit = 100;
}

export class TrainDto {
  @IsEnum(GameCode)
  gameCode!: GameCode;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(1000)
  rollingWindow = 100;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(1000)
  trainingWindow = 100;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200000)
  minTrainingSamples = 10_000;

  @Type(() => Number)
  @IsInt()
  randomSeed = 20260509;
}

export class GrantEntitlementDto {
  @IsString()
  openId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays = 30;

  @IsOptional()
  @IsString()
  productCode?: string;
}

export class ReconcileDto {
  @IsDateString()
  billDate!: string;
}
