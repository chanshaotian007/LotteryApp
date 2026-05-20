import { listOrders } from "../../utils/api";

Page({
  data: {
    orders: [] as any[],
  },

  async onShow() {
    const orders = await listOrders();
    this.setData({ orders });
  },
});
