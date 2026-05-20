import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { ComplexPreference, GameCode, GenerateMode } from "@lottery/contracts";

export class GenerateDto {
  @IsEnum(GameCode)
  gameCode!: GameCode;

  @IsEnum(GenerateMode)
  mode: GenerateMode = GenerateMode.RANDOM;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  count = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  budgetMax?: number | null;

  @IsEnum(ComplexPreference)
  complexPreference: ComplexPreference = ComplexPreference.BALANCED;

  @IsBoolean()
  excludeHighPrizeHistory = false;

  @IsBoolean()
  targetPrizeMode = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  randomSeed?: number | null;
}
