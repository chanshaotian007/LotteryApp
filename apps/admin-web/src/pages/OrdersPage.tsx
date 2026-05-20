import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api";

export function OrdersPage() {
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: adminApi.listOrders,
  });

  return (
    <section>
      <h2>订单列表</h2>
      <div className="panel">
        {orders.data?.map((order) => (
          <article key={order.orderNo} className="job">
            <strong>{order.productName}</strong>
            <p>{order.orderNo}</p>
            <p>{order.status}</p>
            <p>{order.priceFen} 分</p>
          </article>
        ))}
      </div>
    </section>
  );
}
