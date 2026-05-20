import { createCipheriv, createSign, generateKeyPairSync, randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AppConfigService } from "../src/common/config.service";
import { WeChatPayClient } from "../src/payments/wechat-pay.client";

describe("WeChatPayClient", () => {
  let client: WeChatPayClient;
  let privateKeyPem: string;
  let publicKeyPem: string;

  beforeEach(() => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    process.env.WECHAT_MINIPROGRAM_APP_ID = "wx-test";
    process.env.WECHAT_MCH_ID = "1900000109";
    process.env.WECHAT_MCH_CERT_SERIAL = "serial";
    process.env.WECHAT_PRIVATE_KEY_PEM = privateKeyPem;
    process.env.WECHAT_PAY_PLATFORM_CERT_PEM = publicKeyPem;
    process.env.WECHAT_PAY_API_V3_KEY = "0123456789abcdef0123456789abcdef";
    process.env.WECHAT_PAY_NOTIFY_URL = "https://example.com/notify";
    client = new WeChatPayClient(new AppConfigService());
  });

  it("builds miniprogram pay params", () => {
    const params = client.buildMiniprogramPayParams("test");

    expect(params.packageValue).toBe("prepay_id=test");
    expect(params.signType).toBe("RSA");
    expect(params.paySign.length).toBeGreaterThan(20);
  });

  it("verifies callback signatures", () => {
    const timestamp = "1700000000";
    const nonce = "nonce";
    const rawBody = JSON.stringify({ id: "evt_1" });
    const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
    const signature = createSign("RSA-SHA256").update(message).sign(privateKeyPem, "base64");

    expect(
      client.verifyNotificationSignature(
        {
          "wechatpay-signature": signature,
          "wechatpay-nonce": nonce,
          "wechatpay-timestamp": timestamp,
        },
        rawBody,
      ),
    ).toBe(true);
  });

  it("decrypts v3 notification resources", () => {
    const key = Buffer.from(process.env.WECHAT_PAY_API_V3_KEY!, "utf8");
    const nonce = randomBytes(12).toString("hex").slice(0, 12);
    const associatedData = "transaction";
    const plaintext = JSON.stringify({ out_trade_no: "LOT123", trade_state: "SUCCESS" });
    const cipher = createCipheriv("aes-256-gcm", key, Buffer.from(nonce, "utf8"));
    cipher.setAAD(Buffer.from(associatedData, "utf8"));
    const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const ciphertext = Buffer.concat([encrypted, authTag]).toString("base64");

    expect(
      client.decryptNotificationResource({
        associatedData,
        nonce,
        ciphertext,
      }),
    ).toMatchObject({
      out_trade_no: "LOT123",
      trade_state: "SUCCESS",
    });
  });
});
