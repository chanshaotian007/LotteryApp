import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { WeChatPayClient } from "./wechat-pay.client";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WeChatPayClient],
  exports: [PaymentsService, WeChatPayClient],
})
export class PaymentsModule {}
