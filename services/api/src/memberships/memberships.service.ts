import { Injectable } from "@nestjs/common";
import { MembershipStatus, type MembershipSummary, type ProductSummary } from "@lottery/contracts";
import { MembershipStatusDb } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentMembership(userId: string): Promise<MembershipSummary> {
    const now = new Date();
    const entitlement = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        status: MembershipStatusDb.active,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
      include: { product: true },
    });
    if (!entitlement) {
      return {
        status: MembershipStatus.INACTIVE,
        source: "system",
      };
    }
    return {
      status: MembershipStatus.ACTIVE,
      productId: entitlement.product?.code ?? null,
      expiresAt: entitlement.expiresAt.toISOString(),
      source: entitlement.source === "gift" ? "gift" : "wechatPay",
    };
  }

  async listProducts(): Promise<ProductSummary[]> {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { priceFen: "asc" },
    });
    return products.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      priceFen: product.priceFen,
      durationDays: product.durationDays,
      active: product.active,
    }));
  }

  async isMember(userId: string): Promise<boolean> {
    const membership = await this.getCurrentMembership(userId);
    return membership.status === MembershipStatus.ACTIVE;
  }

  async grantEntitlement(input: {
    userId: string;
    productId: string | null;
    source: "gift" | "wechatPay" | "system";
    durationDays: number;
  }): Promise<void> {
    const now = new Date();
    const existing = await this.prisma.entitlement.findFirst({
      where: {
        userId: input.userId,
        status: MembershipStatusDb.active,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });
    const startsAt = now;
    const expiresAt = new Date(Math.max(existing?.expiresAt.getTime() ?? now.getTime(), now.getTime()));
    expiresAt.setUTCDate(expiresAt.getUTCDate() + input.durationDays);
    await this.prisma.entitlement.create({
      data: {
        userId: input.userId,
        productId: input.productId,
        source: input.source,
        status: MembershipStatusDb.active,
        startsAt,
        expiresAt,
      },
    });
  }
}
