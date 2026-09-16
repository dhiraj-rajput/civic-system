import { LandPlot } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle.jsx";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left panel - Branding/Illustration (Hidden on mobile) */}
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-12 text-sidebar-text lg:flex">
        <div>
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
              <LandPlot size={24} className="text-white" strokeWidth={2.25} />
            </div>
            <span className="font-display text-2xl font-bold">CivicPortal</span>
          </div>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-sidebar-text">
            Streamlining civic operations and citizen requests into one cohesive, traceable municipal platform.
          </p>
        </div>

        {/* Abstract structural graphic */}
        <div className="relative aspect-video w-full max-w-lg rounded-2xl border border-sidebar-hover bg-sidebar-hover/30 p-8 shadow-2xl backdrop-blur-sm">
          <div className="grid h-full grid-cols-3 gap-4 opacity-70">
            <div className="col-span-2 rounded bg-brand/20"></div>
            <div className="rounded bg-accent/20"></div>
            <div className="rounded bg-success/20"></div>
            <div className="col-span-2 rounded bg-brand-light/20"></div>
          </div>
          <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full border-4 border-sidebar bg-accent/90 shadow-lg"></div>
        </div>

        <div>
          <blockquote className="space-y-2">
            <p className="text-lg font-medium text-white">"Finally, a civic platform that treats complaints as traceable cases, not just suggestions."</p>
            <footer className="text-sm text-sidebar-text">— Public Works Director</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel - Form area */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <div className="flex items-center justify-center gap-2 text-ink">
              <LandPlot size={28} className="text-brand" strokeWidth={2.25} />
              <span className="font-display text-2xl font-bold">CivicPortal</span>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
