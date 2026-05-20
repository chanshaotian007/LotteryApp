import { Injectable } from "@nestjs/common";

@Injectable()
export class AppConfigService {
  readonly appEnv = process.env.APP_ENV ?? "development";
  readonly port = Number(process.env.PORT ?? 3000);
  readonly databaseUrl = process.env.DATABASE_URL ?? "mysql://root:root@127.0.0.1:3306/lotteryapp";
  readonly jwtSecret = process.env.JWT_SECRET ?? "replace-with-long-random-secret";
  readonly jwtExpiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7);
  readonly jobSharedSecret = process.env.JOB_SHARED_SECRET ?? "replace-with-job-secret";
  readonly rateLimitPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 60);
  readonly cwlUserAgent =
    process.env.CWL_USER_AGENT ??
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
  readonly wechatAppId = process.env.WECHAT_MINIPROGRAM_APP_ID ?? "";
  readonly wechatMerchantId = process.env.WECHAT_MCH_ID ?? "";
  readonly wechatMerchantCertSerial = process.env.WECHAT_MCH_CERT_SERIAL ?? "";
  readonly wechatPrivateKeyPem = process.env.WECHAT_PRIVATE_KEY_PEM ?? "";
  readonly wechatPlatformCertPem = process.env.WECHAT_PAY_PLATFORM_CERT_PEM ?? "";
  readonly wechatApiV3Key = process.env.WECHAT_PAY_API_V3_KEY ?? "";
  readonly wechatNotifyUrl = process.env.WECHAT_PAY_NOTIFY_URL ?? "";
}
