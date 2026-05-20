import { GameCode } from "@lottery/contracts";
import { getStats } from "../../utils/api";

Page({
  data: {
    gameCode: GameCode.DOUBLE_COLOR_BALL,
    stats: null as any,
  },

  async onShow() {
    const stats = await getStats(this.data.gameCode);
    this.setData({ stats });
  },
});
