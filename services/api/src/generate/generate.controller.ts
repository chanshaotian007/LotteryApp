import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { GenerateResponseContract } from "@lottery/contracts";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { GenerateDto } from "./generate.dto";
import { GenerateService } from "./generate.service";

@Controller("api/v1/generate")
@UseGuards(JwtAuthGuard)
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post()
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: GenerateDto,
    @Headers("x-forwarded-for") forwardedFor?: string,
  ): Promise<GenerateResponseContract> {
    const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
    return this.generateService.generate(user.userId, body, ip);
  }
}
