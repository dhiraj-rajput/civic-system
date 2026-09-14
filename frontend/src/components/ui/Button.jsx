/* Small variant system instead of one-off className strings scattered
 * across every page -- four variants cover every action in the app:
 * primary (steel, structural actions like nav CTAs), accent (signal amber,
 * reserved for the one action per screen that matters most -- submit,
 * save), outline (secondary actions), danger (destructive only). */
const VARIANTS = {
  primary: "bg-steel text-white hover:bg-steel-dark",
  accent: "bg-signal text-ink hover:bg-signal-dark hover:text-white",
  outline: "border border-line text-ink hover:border-steel hover:text-steel",
  danger: "border border-brick/40 text-brick hover:bg-brick hover:text-white",
  ghost: "text-ink-soft hover:text-ink",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  as: Component = "button",
  ...props
}) {
  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
