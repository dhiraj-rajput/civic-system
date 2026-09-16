import { Building2, ShieldCheck, User, LandPlot, ArrowRight, Activity, FileCheck, Search } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import Panel from "../components/ui/Panel.jsx";
import { PriorityBadge, StatusBadge } from "../components/Badges.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg relative selection:bg-brand/20 selection:text-ink">
      {/* Dot Pattern Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-2 text-ink">
            <LandPlot size={24} className="text-brand" strokeWidth={2.25} />
            <span className="font-display text-xl font-bold">CivicPortal</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-ink-secondary hover:text-ink transition-colors">
                Sign in
              </Link>
              <Button as={Link} to="/register" variant="primary" size="sm">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-12 md:px-6 md:pt-12 md:pb-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-sm font-medium text-brand mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
              </span>
              Modernizing municipal infrastructure
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              Every civic report, <br className="hidden sm:block" /> tracked from filing to resolution.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary sm:text-xl">
              Report a pothole, a dead streetlight, or a water outage. It gets a real case number, a priority, and routes directly to the right department.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button as={Link} to="/register" variant="primary" size="lg" className="w-full sm:w-auto">
                Report an issue <ArrowRight size={18} />
              </Button>
              <Button as={Link} to="/login" variant="outline" size="lg" className="w-full sm:w-auto bg-card">
                Check status
              </Button>
            </div>
            <p className="mt-8 text-sm text-ink-muted flex items-center gap-1.5">
              <Activity size={16} /> First time running? <Link to="/bootstrap-admin" className="font-medium text-brand hover:underline underline-offset-2">Create the admin account</Link>.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            {/* Decorative background glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-brand to-accent opacity-20 blur-2xl"></div>
            
            <Panel variant="highlighted" className="relative shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-ink-secondary">CMP-2026-0142</span>
                </div>
                <PriorityBadge priority="High" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-ink mb-2">Streetlight near Gate 3 has been out for a week</h3>
                <p className="text-sm text-ink-secondary leading-relaxed mb-6">
                  The road gets very dark after 7pm, creating a safety hazard for pedestrians walking from the station.
                </p>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 size={16} className="text-brand" />
                    <span className="font-medium text-ink">Electrical Maintenance</span>
                  </div>
                  <StatusBadge status="In Progress" />
                </div>
              </div>
              <div className="border-t border-border bg-muted/50 px-6 py-4 text-xs font-medium text-ink-secondary flex justify-between items-center">
                <span>Filed · assigned · officer en route</span>
                <span className="text-ink-muted">2 hours ago</span>
              </div>
            </Panel>
            
            {/* Floating elements */}
            <div className="absolute -right-6 top-12 hidden rounded-lg border border-border bg-card p-3 shadow-lg lg:block animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-success/20 p-2 text-success"><FileCheck size={16} /></div>
                <div className="text-sm font-medium">Issue Resolved</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 border-t border-border bg-card/50 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-ink">A unified platform for everyone</h2>
            <p className="mt-4 text-ink-secondary max-w-2xl mx-auto">Different tools for different roles, bringing citizens and municipal workers into a single, transparent workflow.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-3">
            <Panel className="p-6 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-lg bg-brand/10 p-3 text-brand">
                <User size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">Citizens</h3>
              <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
                File a report with a description and location. Track its status in real-time, get notified on updates, and add comments anytime.
              </p>
            </Panel>
            
            <Panel className="p-6 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3 text-accent-dark">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">Department Officers</h3>
              <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
                Work your department's queue efficiently — ranked by a rule-based priority score, not just the order they arrived in.
              </p>
            </Panel>
            
            <Panel className="p-6 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-lg bg-success/10 p-3 text-success">
                <Search size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">Administrators</h3>
              <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
                Full oversight: assign and reassign cases, manage departments, monitor SLA compliance, and view system analytics.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <div className="flex items-center gap-2 text-ink">
            <LandPlot size={20} className="text-brand" />
            <span className="font-display font-semibold">CivicPortal</span>
          </div>
          <div className="text-sm text-ink-muted">
            &copy; {new Date().getFullYear()} Municipal Corporation. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
