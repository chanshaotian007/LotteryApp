import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { EntitlementsPage } from "./pages/EntitlementsPage";
export function App() {
    return (_jsxs("div", { className: "shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsx("h1", { children: "Lottery Admin" }), _jsxs("nav", { children: [_jsx(NavLink, { to: "/", children: "\u6982\u89C8" }), _jsx(NavLink, { to: "/jobs", children: "\u4EFB\u52A1" }), _jsx(NavLink, { to: "/orders", children: "\u8BA2\u5355" }), _jsx(NavLink, { to: "/entitlements", children: "\u8D60\u9001\u4F1A\u5458" })] })] }), _jsx("main", { className: "content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/jobs", element: _jsx(JobsPage, {}) }), _jsx(Route, { path: "/orders", element: _jsx(OrdersPage, {}) }), _jsx(Route, { path: "/entitlements", element: _jsx(EntitlementsPage, {}) })] }) })] }));
}
//# sourceMappingURL=App.js.map