"use client";

import { useEffect, useState } from "react";

type Props = {
  value: string;                 // ใช้ string เพื่อให้ลบจนว่างได้
  onChange: (v: string) => void; // ส่ง string กลับ
  placeholder?: string;
  className?: string;
  allowNegative?: boolean;
  decimals?: number;             // ปัดตอน blur (default 2)
};

export default function NumericInput({
  value,
  onChange,
  placeholder,
  className = "input",
  allowNegative = false,
  decimals = 2,
}: Props) {
  const [raw, setRaw] = useState(value ?? "");
  useEffect(() => setRaw(value ?? ""), [value]);

  function handleChange(v: string) {
    const cleaned = v.replace(/,/g, "");
    const regex = allowNegative ? /^-?\d*(\.\d*)?$/ : /^\d*(\.\d*)?$/;
    if (cleaned === "" || regex.test(cleaned)) {
      setRaw(cleaned);
      onChange(cleaned);
    }
  }

  function handleBlur() {
    if (raw === "" || raw === "-" || raw === ".") {
      onChange("");
      setRaw("");
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      onChange("");
      setRaw("");
      return;
    }
    const fixed = decimals >= 0 ? n.toFixed(decimals) : String(n);
    onChange(fixed);
    setRaw(fixed);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={className}
      value={raw}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      autoCorrect="off"
      autoCapitalize="none"
    />
  );
}
