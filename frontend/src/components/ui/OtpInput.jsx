// Shared UI component: OtpInput
// 6-digit OTP entry with auto-advance and paste support

import { useRef } from "react";

export default function OtpInput({ value = "", onChange }) {
  const inputs = useRef([]);
  // Always create exactly 6 slots — fixes padEnd("") bug
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");


  function handleChange(idx, e) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    onChange(next.join("").trimEnd());
    if (char && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === "Backspace") {
      if (!digits[idx] && idx > 0) {
        inputs.current[idx - 1]?.focus();
      }
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        direction: "ltr",
      }}
    >
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          className="otp-input"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            borderColor: digit ? "var(--primary)" : undefined,
            background: digit ? "rgba(108,99,255,0.12)" : undefined,
          }}
        />
      ))}
    </div>
  );
}
