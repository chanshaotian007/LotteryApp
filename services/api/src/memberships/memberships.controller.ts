import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { MembershipsService } from "./memberships.service";

@Controller("api/v1/memberships")
@UseGuards(JwtAuthGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get("me")
  async getMembership(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>> {
    const [membership, products] = await Promise.all([
      this.membershipsService.getCurrentMembership(user.userId),
      this.membershipsService.listProducts(),
    ]);
    return { membership, products };
  }
}
