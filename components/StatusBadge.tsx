type StatusBadgeProps = {
  isOpen: boolean;
  className?: string;
};

export function StatusBadge({ isOpen, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-4 py-1 text-sm font-semibold uppercase tracking-wide",
        isOpen ? "border-accent bg-accent/10 text-accent" : "border-slate-600 bg-slate-800/80 text-slate-300",
        className,
      ].join(" ")}
    >
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}
