export interface MiniProgramSession {
  token: string;
  expiresIn: number;
  profile: {
    id: string;
    openId: string;
    nickname?: string | null;
    avatarUrl?: string | null;
    isAdmin: boolean;
  };
}

export async function bootstrapSession(): Promise<MiniProgramSession> {
  const response = await wx.cloud.callFunction({
    name: "bootstrapLogin",
    data: {},
  });
  return response.result as MiniProgramSession;
}

export function getSession(): MiniProgramSession | null {
  const app = getApp<{ globalData: { session: MiniProgramSession | null } }>();
  return app.globalData.session;
}
