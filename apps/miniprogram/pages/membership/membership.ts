import { createPrepay, getMembership } from "../../utils/api";

Page({
  data: {
    membership: null as any,
    products: [] as any[],
  },

  async onShow() {
    const result = await getMembership();
    this.setData({
      membership: result.membership,
      products: result.products,
    });
  },

  async onBuy(event: WechatMiniprogram.CustomEvent<{ code: string }>) {
    const prepay = await createPrepay(event.currentTarget.dataset.code);
    await wx.requestPayment({
      timeStamp: prepay.timeStamp,
      nonceStr: prepay.nonceStr,
      package: prepay.packageValue,
      signType: prepay.signType,
      paySign: prepay.paySign,
    });
  },
});
