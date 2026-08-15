"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand-100 px-3 py-2.5 pr-11 text-sm outline-none focus:border-brand-300"
      />
      <button
        type="button"
        onClick={() => setShow((visible) => !visible)}
        aria-label={show ? "パスワードを隠す" : "パスワードを表示"}
        className="absolute inset-y-0 right-3 text-ink-500"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
