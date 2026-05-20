import { Module } from "@nestjs/common";
import { AdminJobsModule } from "./admin-jobs/admin-jobs.module";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { DrawsModule } from "./draws/draws.module";
import { GamesModule } from "./games/games.module";
import { GenerateModule } from "./generate/generate.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { ProfileModule } from "./profile/profile.module";
import { StatsModule } from "./stats/stats.module";

@Module({
  imports: [
    CommonModule,
    AuthModule,
    GamesModule,
    DrawsModule,
    StatsModule,
    GenerateModule,
    MembershipsModule,
    PaymentsModule,
    OrdersModule,
    AdminJobsModule,
    ProfileModule,
  ],
})
export class AppModule {}
