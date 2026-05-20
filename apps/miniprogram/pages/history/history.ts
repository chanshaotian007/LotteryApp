import { GameCode } from "@lottery/contracts";
import { getDraws } from "../../utils/api";

Page({
  data: {
    gameCode: GameCode.DOUBLE_COLOR_BALL,
    draws: [] as any[],
  },

  async onShow() {
    const draws = await getDraws(this.data.gameCode, 20);
    this.setData({ draws });
  },
});
