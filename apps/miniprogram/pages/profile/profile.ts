import { getProfile } from "../../utils/api";

Page({
  data: {
    profile: null as any,
  },

  async onShow() {
    const profile = await getProfile();
    this.setData({ profile });
  },
});
