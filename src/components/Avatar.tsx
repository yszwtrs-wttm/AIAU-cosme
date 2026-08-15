export default function Avatar({
  name,
  hue = 330,
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

  return (
    <span
      className={`grid ${sizes[size]} shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
      style={{ background: `hsl(${hue} 70% 62%)` }}
    >
      {name.slice(0, 1) || "?"}
    </span>
  );
}
