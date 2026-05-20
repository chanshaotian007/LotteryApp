import { BadRequestException, Injectable } from "@nestjs/common";
import { type PaymentNotifyPayload, type PaymentPrepayResponseContract } from "@lottery/contracts";
import { MembershipStatusDb, OrderStatusDb } from "@prisma/client";
import { AuditService } from "../common/audit.service";
import { toJsonValue } from "../common/database.utils";
import { PrismaService } from "../common/prisma.service";
import { WeChatPayClient } from "./wechat-pay.client";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPay: WeChatPayClient,
    private readonly audit: AuditService,
  ) {}

  async createPrepay(userId: string, openId: string, productCode: string): Promise<PaymentPrepayResponseContract> {
    const product = await this.prisma.product.findUnique({
      where: { code: productCode },
    });
    if (!product || !product.active) {
      throw new BadRequestException("product not found");
    }
    const orderNo = `LOT${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    const transaction = await this.wechatPay.createJsapiTransaction({
      description: product.name,
      outTradeNo: orderNo,
      amount: {
        total: product.priceFen,
        currency: "CNY",
      },
      payer: { openid: openId },
    });

    const payParams = this.wechatPay.buildMiniprogramPayParams(transaction.prepay_id as string);
    await this.prisma.order.create({
      data: {
        orderNo,
        userId,
        productId: product.id,
        priceFen: product.priceFen,
        status: OrderStatusDb.pending,
        prepayId: transaction.prepay_id as string,
        rawPrepay: toJsonValue(transaction),
      },
    });
    await this.audit.write({
      userId,
      action: "payments.prepay",
      resourceType: "order",
      resourceId: orderNo,
      payload: { productCode },
    });
    return {
      orderNo,
      prepayId: payParams.prepayId,
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      packageValue: payParams.packageValue,
      signType: payParams.signType,
      paySign: payParams.paySign,
    };
  }

  async handleNotify(rawBody: string, headers: Record<string, string | string[] | undefined>): Promise<{ code: string; message: string }> {
    if (!this.wechatPay.verifyNotificationSignature(headers, rawBody)) {
      throw new BadRequestException("invalid wechat pay signature");
    }
    const payload = JSON.parse(rawBody) as PaymentNotifyPayload;
    const transaction = this.wechatPay.decryptNotificationResource(payload.resource);
    const orderNo = String(transaction.out_trade_no ?? "");
    if (!orderNo) {
      throw new BadRequestException("out_trade_no is required");
    }
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: { product: true },
    });
    if (!order) {
      throw new BadRequestException("order not found");
    }

    const tradeState = String(transaction.trade_state ?? "");
    if (tradeState !== "SUCCESS") {
      await this.prisma.order.update({
        where: { orderNo },
        data: {
          status: OrderStatusDb.failed,
          rawCallback: toJsonValue(transaction),
        },
      });
      return { code: "SUCCESS", message: "ignored non-success trade state" };
    }

    if (order.status !== OrderStatusDb.paid) {
      const paidAt = transaction.success_time ? new Date(String(transaction.success_time)) : new Date();
      const expiresAt = new Date(paidAt);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + order.product.durationDays);

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { orderNo },
          data: {
            status: OrderStatusDb.paid,
            transactionId: String(transaction.transaction_id ?? ""),
            rawCallback: toJsonValue(transaction),
            paidAt,
            expiresAt,
          },
        });
        await tx.entitlement.create({
          data: {
            userId: order.userId,
            productId: order.productId,
            source: "wechatPay",
            status: MembershipStatusDb.active,
            startsAt: paidAt,
            expiresAt,
          },
        });
      });
      await this.audit.write({
        userId: order.userId,
        action: "payments.notify",
        resourceType: "order",
        resourceId: orderNo,
        payload: {
          tradeState,
          transactionId: transaction.transaction_id,
        },
      });
    }
    return { code: "SUCCESS", message: "success" };
  }

  async reconcileTradeBill(billDate: string): Promise<Record<string, unknown>> {
    const bill = await this.wechatPay.downloadTradeBill(billDate);
    return {
      billDate,
      bill,
      checkedAt: new Date().toISOString(),
    };
  }
}
