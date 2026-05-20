import { Module } from "@nestjs/common";
import { DrawsModule } from "../draws/draws.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";
import { AdminJobsController } from "./admin-jobs.controller";
import { AdminJobsService } from "./admin-jobs.service";

@Module({
  imports: [DrawsModule, MembershipsModule, PaymentsModule, OrdersModule],
  controllers: [AdminJobsController],
  providers: [AdminJobsService],
})
export class AdminJobsModule {}
