import jwt from "jsonwebtoken";
import type { BootstrapLoginResponse } from "@lottery/contracts";

interface CloudBaseEvent {
  openId?: string;
  unionId?: string;
  nickName?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

export async function main(event: CloudBaseEvent): Promise<BootstrapLoginResponse> {
  const openId = event.openId ?? process.env.CLOUDBASE_OPENID;
  if (!openId) {
    throw new Error("openId is required");
  }
  const expiresIn = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7);
  const token = jwt.sign(
    {
      sub: openId,
      openId,
      unionId: event.unionId ?? null,
      nickname: event.nickName ?? null,
      avatarUrl: event.avatarUrl ?? null,
      isAdmin: Boolean(event.isAdmin),
    },
    process.env.JWT_SECRET ?? "replace-with-long-random-secret",
    {
      expiresIn,
    },
  );

  return {
    token,
    expiresIn,
    profile: {
      id: openId,
      openId,
      unionId: event.unionId ?? null,
      nickname: event.nickName ?? null,
      avatarUrl: event.avatarUrl ?? null,
      isAdmin: Boolean(event.isAdmin),
    },
  };
}
