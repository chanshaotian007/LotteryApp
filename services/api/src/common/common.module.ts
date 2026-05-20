import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AppConfigService } from "./config.service";
import { PrismaService } from "./prisma.service";
import { SeedService } from "./seed.service";

@Global()
@Module({
  providers: [AppConfigService, PrismaService, AuditService, SeedService],
  exports: [AppConfigService, PrismaService, AuditService, SeedService],
})
export class CommonModule {}
