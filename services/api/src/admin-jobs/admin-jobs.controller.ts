import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InternalJobGuard } from "../auth/internal-job.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { AdminJobsService } from "./admin-jobs.service";
import { GrantEntitlementDto, ReconcileDto, SyncDto, TrainDto } from "./admin-jobs.dto";

@Controller()
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Post("api/admin/v1/sync")
  @UseGuards(JwtAuthGuard, AdminGuard)
  runSync(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncDto) {
    return this.adminJobsService.runSync(body, user.userId);
  }

  @Post("api/admin/v1/train")
  @UseGuards(JwtAuthGuard, AdminGuard)
  runTrain(@CurrentUser() user: AuthenticatedUser, @Body() body: TrainDto) {
    return this.adminJobsService.runTrain(body, user.userId);
  }

  @Get("api/admin/v1/jobs")
  @UseGuards(JwtAuthGuard, AdminGuard)
  listJobs() {
    return this.adminJobsService.listJobs();
  }

  @Get("api/admin/v1/orders")
  @UseGuards(JwtAuthGuard, AdminGuard)
  listOrders() {
    return this.adminJobsService.listOrders();
  }

  @Post("api/admin/v1/entitlements/grant")
  @UseGuards(JwtAuthGuard, AdminGuard)
  grantEntitlement(@CurrentUser() user: AuthenticatedUser, @Body() body: GrantEntitlementDto) {
    return this.adminJobsService.grantEntitlement(body, user.userId);
  }

  @Post("api/internal/v1/jobs/sync")
  @UseGuards(InternalJobGuard)
  runInternalSync(@Body() body: SyncDto) {
    return this.adminJobsService.runSync(body);
  }

  @Post("api/internal/v1/jobs/train")
  @UseGuards(InternalJobGuard)
  runInternalTrain(@Body() body: TrainDto) {
    return this.adminJobsService.runTrain(body);
  }

  @Post("api/internal/v1/jobs/reconcile")
  @UseGuards(InternalJobGuard)
  reconcile(@Body() body: ReconcileDto) {
    return this.adminJobsService.reconcile(body);
  }

  @Post("api/internal/v1/jobs/healthcheck")
  @UseGuards(InternalJobGuard)
  healthcheck() {
    return this.adminJobsService.healthcheckSources();
  }
}
