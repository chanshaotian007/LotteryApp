import { FormEvent, useState } from "react";
import { adminApi } from "../api";

export function EntitlementsPage() {
  const [openId, setOpenId] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [productCode, setProductCode] = useState("premium_monthly");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await adminApi.grantEntitlement({ openId, durationDays, productCode });
    setMessage(JSON.stringify(result, null, 2));
  }

  return (
    <section>
      <h2>赠送会员</h2>
      <form className="panel" onSubmit={onSubmit}>
        <label>
          <span>OpenID</span>
          <input value={openId} onChange={(event) => setOpenId(event.target.value)} />
        </label>
        <label>
          <span>天数</span>
          <input type="number" value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))} />
        </label>
        <label>
          <span>产品编码</span>
          <input value={productCode} onChange={(event) => setProductCode(event.target.value)} />
        </label>
        <button type="submit">赠送</button>
      </form>
      <pre className="panel">{message || "等待提交"}</pre>
    </section>
  );
}
