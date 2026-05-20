import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, type OrderSummary } from "@lottery/contracts";
import { Order } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

function toOrderSummary(order: Order & { product: { name: string } }): OrderSummary {
  return {
    orderNo: order.orderNo,
    productId: order.productId,
    productName: order.product.name,
    priceFen: order.priceFen,
    status: order.status as OrderStatus,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserOrder(userId: string, orderNo: string): Promise<OrderSummary> {
    const order = await this.prisma.order.findFirst({
      where: { userId, orderNo },
      include: { product: true },
    });
    if (!order) {
      throw new NotFoundException("order not found");
    }
    return toOrderSummary(order);
  }

  async listUserOrders(userId: string): Promise<OrderSummary[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    return orders.map(toOrderSummary);
  }

  async listAllOrders(): Promise<OrderSummary[]> {
    const orders = await this.prisma.order.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return orders.map(toOrderSummary);
  }
}
