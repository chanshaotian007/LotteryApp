import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { OrderSummary } from "@lottery/contracts";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { OrdersService } from "./orders.service";

@Controller("api/v1/orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listOrders(@CurrentUser() user: AuthenticatedUser): Promise<OrderSummary[]> {
    return this.ordersService.listUserOrders(user.userId);
  }

  @Get(":orderNo")
  getOrder(@CurrentUser() user: AuthenticatedUser, @Param("orderNo") orderNo: string): Promise<OrderSummary> {
    return this.ordersService.getUserOrder(user.userId, orderNo);
  }
}
