import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { EntitlementsPage } from "./pages/EntitlementsPage";

export function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Lottery Admin</h1>
        <nav>
          <NavLink to="/">概览</NavLink>
          <NavLink to="/jobs">任务</NavLink>
          <NavLink to="/orders">订单</NavLink>
          <NavLink to="/entitlements">赠送会员</NavLink>
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/entitlements" element={<EntitlementsPage />} />
        </Routes>
      </main>
    </div>
  );
}
