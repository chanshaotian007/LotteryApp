import { Module } from "@nestjs/common";
import { DrawsModule } from "../draws/draws.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";

@Module({
  imports: [DrawsModule, MembershipsModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
