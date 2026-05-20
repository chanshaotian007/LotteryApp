import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AppConfigService } from "../common/config.service";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./admin.guard";
import { InternalJobGuard } from "./internal-job.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtExpiresInSeconds,
        },
      }),
    }),
  ],
  providers: [AuthService, JwtAuthGuard, AdminGuard, InternalJobGuard],
  exports: [AuthService, JwtAuthGuard, AdminGuard, InternalJobGuard, JwtModule],
})
export class AuthModule {}
