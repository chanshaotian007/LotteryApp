import { Injectable } from "@nestjs/common";
import { toNullableJsonValue } from "./database.utils";
import { PrismaService } from "./prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    userId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    payload?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        payload: toNullableJsonValue(input.payload),
      },
    });
  }
}
