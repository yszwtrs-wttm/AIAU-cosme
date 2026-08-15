export default function Avatar({
  name,
  hue = 200,
  avatarUrl,
  size = "md",
  className = "",
}: {
  name: string;
  hue?: number;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-2xl",
  };
  const initial = name.trim().slice(0, 1);

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${name}のアイコン`}
        className={`${sizes[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  if (!initial) {
    return (
      <svg
        viewBox="0 0 40 40"
        role="img"
        aria-label="アイコン未設定"
        className={`${sizes[size]} shrink-0 rounded-full bg-ink-200 text-ink-0 ${className}`}
      >
        <circle cx="20" cy="15" r="7" fill="currentColor" />
        <path d="M20 24c-6.1 0-11 4.9-11 11v5h22v-5c0-6.1-4.9-11-11-11z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <span
      className={`grid ${sizes[size]} shrink-0 place-items-center rounded-full font-bold text-ink-0 ${className}`}
      style={{ background: `hsl(${hue} 70% 62%)` }}
    >
      {initial}
    </span>
  );
}
