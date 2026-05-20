import { ComplexPreference, GameCode, GenerateMode } from "@lottery/contracts";
import { generate, type GenerateFormState } from "../../utils/api";

Page({
  data: {
    form: {
      gameCode: GameCode.DOUBLE_COLOR_BALL,
      mode: GenerateMode.RANDOM,
      count: 1,
      complexPreference: ComplexPreference.BALANCED,
      excludeHighPrizeHistory: false,
      targetPrizeMode: false,
    } as GenerateFormState,
    loading: false,
    result: null as any,
    error: "",
  },

  async onGenerate() {
    this.setData({ loading: true, error: "" });
    try {
      const result = await generate(this.data.form);
      this.setData({ result });
    } catch (error) {
      this.setData({ error: (error as Error).message ?? "生成失败" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onGameChange(event: WechatMiniprogram.CustomEvent) {
    this.setData({ "form.gameCode": event.detail.value });
  },

  onModeChange(event: WechatMiniprogram.CustomEvent) {
    this.setData({ "form.mode": event.detail.value });
  },
});
