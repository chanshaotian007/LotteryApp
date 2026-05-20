import { bootstrapSession } from "./utils/session";

App({
  globalData: {
    session: null as null | {
      token: string;
      expiresIn: number;
      profile: {
        id: string;
        openId: string;
        nickname?: string | null;
        avatarUrl?: string | null;
        isAdmin: boolean;
      };
    },
  },

  async onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true,
      });
    }
    try {
      const session = await bootstrapSession();
      this.globalData.session = session;
    } catch (error) {
      console.warn("bootstrap session failed", error);
    }
  },
});
