import { Body, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrepayDto } from "./payments.dto";
import { PaymentsService } from "./payments.service";

@Controller("api/v1/payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("prepay")
  @UseGuards(JwtAuthGuard)
  createPrepay(@CurrentUser() user: AuthenticatedUser, @Body() body: PrepayDto) {
    return this.paymentsService.createPrepay(user.userId, user.openId, body.productCode);
  }

  @Post("notify")
  async notify(@Req() request: any, @Headers() headers: Record<string, string | string[] | undefined>) {
    const rawBody =
      typeof request.rawBody === "string" ? request.rawBody : Buffer.from(request.rawBody ?? JSON.stringify(request.body)).toString("utf8");
    return this.paymentsService.handleNotify(rawBody, headers);
  }
}
