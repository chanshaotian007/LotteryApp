import { createDecipheriv, createPrivateKey, createPublicKey, createSign, createVerify, randomUUID } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AppConfigService } from "../common/config.service";

export interface JsapiTransactionRequest {
  description: string;
  outTradeNo: string;
  amount: { total: number; currency: "CNY" };
  payer: { openid: string };
}

@Injectable()
export class WeChatPayClient {
  constructor(private readonly config: AppConfigService) {}

  async createJsapiTransaction(payload: JsapiTransactionRequest): Promise<Record<string, any>> {
    this.assertConfigured();
    const body = {
      appid: this.config.wechatAppId,
      mchid: this.config.wechatMerchantId,
      notify_url: this.config.wechatNotifyUrl,
      ...payload,
    };
    return this.request("POST", "/v3/pay/transactions/jsapi", body);
  }

  async queryOrderByOutTradeNo(orderNo: string): Promise<Record<string, any>> {
    this.assertConfigured();
    return this.request("GET", `/v3/pay/transactions/out-trade-no/${orderNo}?mchid=${this.config.wechatMerchantId}`);
  }

  async downloadTradeBill(billDate: string): Promise<Record<string, any>> {
    this.assertConfigured();
    return this.request("GET", `/v3/bill/tradebill?bill_date=${billDate}&bill_type=ALL`);
  }

  buildMiniprogramPayParams(prepayId: string): {
    prepayId: string;
    timeStamp: string;
    nonceStr: string;
    packageValue: string;
    signType: "RSA";
    paySign: string;
  } {
    this.assertConfigured();
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomUUID().replaceAll("-", "");
    const packageValue = `prepay_id=${prepayId}`;
    const message = `${this.config.wechatAppId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
    const paySign = createSign("RSA-SHA256").update(message).sign(createPrivateKey(this.config.wechatPrivateKeyPem), "base64");
    return {
      prepayId,
      timeStamp,
      nonceStr,
      packageValue,
      signType: "RSA",
      paySign,
    };
  }

  verifyNotificationSignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    if (!this.config.wechatPlatformCertPem) {
      throw new BadRequestException("WECHAT_PAY_PLATFORM_CERT_PEM is not configured");
    }
    const signature = this.readHeader(headers, "wechatpay-signature");
    const nonce = this.readHeader(headers, "wechatpay-nonce");
    const timestamp = this.readHeader(headers, "wechatpay-timestamp");
    const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
    return createVerify("RSA-SHA256")
      .update(message)
      .verify(createPublicKey(this.config.wechatPlatformCertPem), signature, "base64");
  }

  decryptNotificationResource(resource: {
    associatedData: string;
    nonce: string;
    ciphertext: string;
  }): Record<string, any> {
    const key = Buffer.from(this.config.wechatApiV3Key, "utf8");
    const ciphertext = Buffer.from(resource.ciphertext, "base64");
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const data = ciphertext.subarray(0, ciphertext.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(resource.nonce, "utf8"));
    decipher.setAAD(Buffer.from(resource.associatedData, "utf8"));
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as Record<string, any>;
  }

  signForUnitTest(message: string): string {
    this.assertConfigured();
    return createSign("RSA-SHA256").update(message).sign(createPrivateKey(this.config.wechatPrivateKeyPem), "base64");
  }

  private async request(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<Record<string, any>> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomUUID().replaceAll("-", "");
    const serializedBody = body ? JSON.stringify(body) : "";
    const message = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${serializedBody}\n`;
    const signature = createSign("RSA-SHA256").update(message).sign(createPrivateKey(this.config.wechatPrivateKeyPem), "base64");
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.wechatMerchantId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.config.wechatMerchantCertSerial}"`;
    const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
      method,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? serializedBody : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new BadRequestException(`wechat pay request failed: ${response.status} ${text}`);
    }
    return JSON.parse(text) as Record<string, any>;
  }

  private assertConfigured(): void {
    const required = [
      this.config.wechatAppId,
      this.config.wechatMerchantId,
      this.config.wechatMerchantCertSerial,
      this.config.wechatPrivateKeyPem,
      this.config.wechatApiV3Key,
      this.config.wechatNotifyUrl,
    ];
    if (required.some((value) => !value)) {
      throw new BadRequestException("wechat pay is not fully configured");
    }
  }

  private readHeader(headers: Record<string, string | string[] | undefined>, key: string): string {
    const value = headers[key] ?? headers[key.toLowerCase()];
    if (!value) {
      throw new BadRequestException(`missing wechat pay header: ${key}`);
    }
    return Array.isArray(value) ? value[0] : value;
  }
}
