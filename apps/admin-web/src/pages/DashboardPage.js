import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { adminApi, setAdminToken } from "../api";
export function DashboardPage() {
    const [token, updateToken] = useState("");
    const [message, setMessage] = useState("");
    async function onSync(gameCode) {
        const result = await adminApi.sync({ gameCode, limit: 100 });
        setMessage(JSON.stringify(result, null, 2));
    }
    async function onTrain(gameCode) {
        const result = await adminApi.train({
            gameCode,
            rollingWindow: 100,
            trainingWindow: 100,
            minTrainingSamples: 10_000,
            randomSeed: 20260509,
        });
        setMessage(JSON.stringify(result, null, 2));
    }
    function onSaveToken(event) {
        event.preventDefault();
        setAdminToken(token);
        setMessage("管理员 Bearer Token 已保存到本地浏览器");
    }
    return (_jsxs("section", { children: [_jsx("h2", { children: "\u63A7\u5236\u53F0" }), _jsxs("form", { className: "panel", onSubmit: onSaveToken, children: [_jsxs("label", { children: [_jsx("span", { children: "\u7BA1\u7406\u5458 Bearer Token" }), _jsx("textarea", { value: token, onChange: (event) => updateToken(event.target.value), rows: 3 })] }), _jsx("button", { type: "submit", children: "\u4FDD\u5B58\u4EE4\u724C" })] }), _jsxs("div", { className: "grid", children: [_jsx("button", { onClick: () => onSync("ssq"), children: "\u540C\u6B65\u53CC\u8272\u7403" }), _jsx("button", { onClick: () => onSync("dlt"), children: "\u540C\u6B65\u5927\u4E50\u900F" }), _jsx("button", { onClick: () => onTrain("ssq"), children: "\u8BAD\u7EC3\u53CC\u8272\u7403" }), _jsx("button", { onClick: () => onTrain("dlt"), children: "\u8BAD\u7EC3\u5927\u4E50\u900F" })] }), _jsx("pre", { className: "panel", children: message || "等待操作" })] }));
}
//# sourceMappingURL=DashboardPage.js.map