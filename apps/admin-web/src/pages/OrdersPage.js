import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api";
export function OrdersPage() {
    const orders = useQuery({
        queryKey: ["orders"],
        queryFn: adminApi.listOrders,
    });
    return (_jsxs("section", { children: [_jsx("h2", { children: "\u8BA2\u5355\u5217\u8868" }), _jsx("div", { className: "panel", children: orders.data?.map((order) => (_jsxs("article", { className: "job", children: [_jsx("strong", { children: order.productName }), _jsx("p", { children: order.orderNo }), _jsx("p", { children: order.status }), _jsxs("p", { children: [order.priceFen, " \u5206"] })] }, order.orderNo))) })] }));
}
//# sourceMappingURL=OrdersPage.js.map