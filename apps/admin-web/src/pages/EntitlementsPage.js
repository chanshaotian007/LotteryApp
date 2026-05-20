import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { adminApi } from "../api";
export function EntitlementsPage() {
    const [openId, setOpenId] = useState("");
    const [durationDays, setDurationDays] = useState(30);
    const [productCode, setProductCode] = useState("premium_monthly");
    const [message, setMessage] = useState("");
    async function onSubmit(event) {
        event.preventDefault();
        const result = await adminApi.grantEntitlement({ openId, durationDays, productCode });
        setMessage(JSON.stringify(result, null, 2));
    }
    return (_jsxs("section", { children: [_jsx("h2", { children: "\u8D60\u9001\u4F1A\u5458" }), _jsxs("form", { className: "panel", onSubmit: onSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "OpenID" }), _jsx("input", { value: openId, onChange: (event) => setOpenId(event.target.value) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u5929\u6570" }), _jsx("input", { type: "number", value: durationDays, onChange: (event) => setDurationDays(Number(event.target.value)) })] }), _jsxs("label", { children: [_jsx("span", { children: "\u4EA7\u54C1\u7F16\u7801" }), _jsx("input", { value: productCode, onChange: (event) => setProductCode(event.target.value) })] }), _jsx("button", { type: "submit", children: "\u8D60\u9001" })] }), _jsx("pre", { className: "panel", children: message || "等待提交" })] }));
}
//# sourceMappingURL=EntitlementsPage.js.map