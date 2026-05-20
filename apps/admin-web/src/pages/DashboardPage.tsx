import { FormEvent, useState } from "react";
import { adminApi, setAdminToken } from "../api";

export function DashboardPage() {
  const [token, updateToken] = useState("");
  const [message, setMessage] = useState("");

  async function onSync(gameCode: "ssq" | "dlt") {
    const result = await adminApi.sync({ gameCode, limit: 100 });
    setMessage(JSON.stringify(result, null, 2));
  }

  async function onTrain(gameCode: "ssq" | "dlt") {
    const result = await adminApi.train({
      gameCode,
      rollingWindow: 100,
      trainingWindow: 100,
      minTrainingSamples: 10_000,
      randomSeed: 20260509,
    });
    setMessage(JSON.stringify(result, null, 2));
  }

  function onSaveToken(event: FormEvent) {
    event.preventDefault();
    setAdminToken(token);
    setMessage("管理员 Bearer Token 已保存到本地浏览器");
  }

  return (
    <section>
      <h2>控制台</h2>
      <form className="panel" onSubmit={onSaveToken}>
        <label>
          <span>管理员 Bearer Token</span>
          <textarea value={token} onChange={(event) => updateToken(event.target.value)} rows={3} />
        </label>
        <button type="submit">保存令牌</button>
      </form>
      <div className="grid">
        <button onClick={() => onSync("ssq")}>同步双色球</button>
        <button onClick={() => onSync("dlt")}>同步大乐透</button>
        <button onClick={() => onTrain("ssq")}>训练双色球</button>
        <button onClick={() => onTrain("dlt")}>训练大乐透</button>
      </div>
      <pre className="panel">{message || "等待操作"}</pre>
    </section>
  );
}
