import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300 dark:font-semibold shadow-sm",
  accent: "bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold shadow-sm",
  outline: "border border-border text-ink hover:border-amber-500 hover:text-amber-600 dark:hover:border-amber-400 dark:hover:text-amber-400",
  danger: "border border-danger text-danger hover:bg-danger hover:text-white",
  ghost: "text-ink-secondary hover:text-ink hover:bg-hover dark:hover:bg-[#222226] dark:hover:text-amber-400",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm h-[32px]",
  md: "px-4 py-2 text-sm h-[40px]",
  lg: "px-5 py-2.5 text-base h-[44px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  disabled,
  children,
  as: Component = "button",
  ...props
}) {
  return (
    <Component
      disabled={isLoading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </Component>
  );
}
