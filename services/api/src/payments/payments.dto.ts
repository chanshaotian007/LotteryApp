import { IsString, MinLength } from "class-validator";

export class PrepayDto {
  @IsString()
  @MinLength(1)
  productCode!: string;
}
