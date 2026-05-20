import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserProfile } from "@lottery/contracts";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { ProfileService } from "./profile.service";

@Controller("api/v1/profile")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.profileService.getProfile(user.userId);
  }
}
