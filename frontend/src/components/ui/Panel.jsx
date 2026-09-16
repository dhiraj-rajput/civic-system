const VARIANTS = {
  default: "",
  highlighted: "border-l-4 border-l-brand",
  danger: "border-l-4 border-l-danger",
};

export default function Panel({ variant = "default", className = "", children, ...props }) {
  return (
    <div
      className={`rounded-md border border-border bg-card shadow-[var(--shadow-card)] ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
