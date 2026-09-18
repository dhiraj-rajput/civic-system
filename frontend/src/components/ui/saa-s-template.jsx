import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ShieldCheck, Activity, Copy, Check, 
  MapPin, Layers, Users, CheckCircle2, Clock, 
  ChevronRight, ExternalLink, Sparkles, Terminal, FileText, CheckCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import CivicLogo, { CivicEmblem } from "@/components/CivicLogo";
import TechMarquee from "@/components/TechStackIcons";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState("admin");
  const [workflowStep, setWorkflowStep] = useState(1);
  const [loggingInRole, setLoggingInRole] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleQuickLogin = async (email, password, redirectPath, roleKey) => {
    setLoggingInRole(roleKey);
    try {
      await login(email, password);
      navigate(redirectPath);
    } catch (err) {
      console.error("Quick login failed:", err);
      navigate("/login");
    } finally {
      setLoggingInRole(null);
    }
  };

  const JUDGE_PERSONAS = [
    {
      key: "admin",
      role: "Chief Administrator",
      badge: "Executive City Ops",
      badgeColor: "bg-slate-100 dark:bg-amber-400/10 text-slate-800 dark:text-amber-400 border-slate-300 dark:border-amber-400/30",
      email: "admin@city.gov",
      password: "Admin@1234",
      redirect: "/admin",
      description: "Oversee municipal departments, review citywide SLA metrics, smart-dispatch officers, and inspect geospatial hotspot heatmaps.",
      actionLabel: "Launch Admin Console",
      testSteps: [
        "Review 30-Day intake velocity and hotspot density",
        "Open any complaint and click 'Smart Assign' to test multi-factor officer dispatch",
        "Add, filter, or delete municipal departments in Department Management",
        "Inspect geospatial incident heatmap and day-vs-hour intake frequency matrix"
      ]
    },
    {
      key: "officer",
      role: "Field Response Officer",
      badge: "Liam O'Connor • Public Works",
      badgeColor: "bg-slate-100 dark:bg-amber-400/10 text-slate-800 dark:text-amber-400 border-slate-300 dark:border-amber-400/30",
      email: "officer.liam@city.gov",
      password: "Officer@1234",
      redirect: "/officer",
      description: "Manage assigned field queue, monitor SLA overdue warnings, and upload mandatory photo evidence before marking work orders resolved.",
      actionLabel: "Launch Officer Work Queue",
      testSteps: [
        "Inspect work queue sorted by explainable priority score",
        "Check SLA timers with high-contrast overdue warning indicators",
        "Click 'Resolve Issue' to upload before/after photos and maintenance notes",
        "Submit resolution to trigger citizen verification loop"
      ]
    },
    {
      key: "citizen",
      role: "NYC Citizen",
      badge: "Public Reporter",
      badgeColor: "bg-slate-100 dark:bg-amber-400/10 text-slate-800 dark:text-amber-400 border-slate-300 dark:border-amber-400/30",
      email: "citizen@example.com",
      password: "Citizen@1234",
      redirect: "/citizen",
      description: "Report civic issues with interactive GPS pins and media evidence, experience automated duplicate clustering, and confirm repair work.",
      actionLabel: "Launch Citizen Portal",
      testSteps: [
        "Submit a complaint with photos, interactive map pin, and AI category detection",
        "File a second report nearby to test 4-step duplicate clustering",
        "Review transparent 'Why this priority?' score breakdown",
        "Verify completed field repairs (Confirm & Close or Dispute & Reopen)"
      ]
    }
  ];

  const ARCHITECTURE_PILLARS = [
    {
      icon: Layers,
      title: "4-Step Duplicate Clustering",
      badge: "NLP + Haversine Spatial",
      summary: "Prevents duplicate work orders and wasted municipal dispatch.",
      details: [
        "Step 1: Category Match (e.g. Pothole to Pothole)",
        "Step 2: Haversine distance radius check ≤ 200 meters",
        "Step 3: Reported within a 14-day rolling window",
        "Step 4: Canonical synonym mapping (trench, crater, asphalt hole → pothole)"
      ]
    },
    {
      icon: Activity,
      title: "Explainable Priority Scoring",
      badge: "Transparent 0-100 Scale",
      summary: "Transparent scoring replaces opaque municipal black boxes.",
      details: [
        "Category Severity baseline (e.g. water leak vs cosmetic paint)",
        "Neighborhood cluster factor: +4 points per duplicate report",
        "Time elapsed and SLA urgency progression multiplier",
        "Full transparent score breakdown viewable by citizens and officers"
      ]
    },
    {
      icon: Users,
      title: "Smart Multi-Factor Dispatch",
      badge: "Proximity + Workload",
      summary: "Optimized officer routing based on operational telemetry.",
      details: [
        "Current active workload scoring (50 points maximum)",
        "Haversine proximity to incident location (35 points maximum)",
        "Officer department readiness and availability (15 points)",
        "Admin can auto-assign or manually override with 1 click"
      ]
    },
    {
      icon: ShieldCheck,
      title: "Two-Party Verified Resolution",
      badge: "No Ghost Closures",
      summary: "Citizens retain final sign-off authority on municipal repairs.",
      details: [
        "Officers must attach mandatory before & after photographic evidence",
        "Resolution evidence stored in Garage S3 distributed object storage",
        "Reporting citizen receives interactive verification prompt",
        "Citizen confirms fix (moves to Closed) or disputes it (reopens case)"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f12] text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-amber-500/25 selection:text-amber-600 dark:selection:text-amber-400 transition-colors">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <CivicLogo size={28} />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-amber-400 transition-colors">How It Works</a>
            <a href="#architecture" className="hover:text-slate-900 dark:hover:text-amber-400 transition-colors">Architecture</a>
            <a href="#sandbox" className="hover:text-slate-900 dark:hover:text-amber-400 transition-colors font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Judge Evaluation Hub
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="p-0.5 rounded-full border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#18181b]">
              <ThemeToggle />
            </div>

            <Link 
              to="/login" 
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1c1c20] transition-all"
            >
              Sign In
            </Link>
            <a 
              href="#sandbox" 
              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 transition-colors shadow-sm"
            >
              Test Personas
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="bg-white dark:bg-[#121214] border-b border-slate-200 dark:border-neutral-800 pt-16 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-[#18181b] text-slate-800 dark:text-amber-400 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
            CONNECTED TO LIVE NYC 311 OPEN DATA (SOCRATA API)
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white leading-tight">
            New York City 311 Grievance & <br />
            Rapid Field Response System
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A modern, transparent operating system connecting city residents, field response crews, and municipal administrators. Ingests live NYC 311 complaints, automatically clusters duplicate reports within 200 meters, and enforces photo proof before tickets are marked resolved.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/citizen/submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 dark:font-semibold shadow-sm transition-all"
            >
              Report an Issue <ArrowRight size={16} />
            </Link>
            <a
              href="#sandbox"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-[#202024] border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-slate-200 shadow-sm transition-all"
            >
              <Terminal size={16} className="text-slate-600 dark:text-amber-400" />
              Judge Evaluation Sandbox
            </a>
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-amber-400 transition-colors"
            >
              <MapPin size={16} className="text-slate-400 dark:text-amber-400/80" />
              Incident Map & Heatmap
            </Link>
          </div>

          {/* Key Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-slate-200 dark:border-neutral-800 mt-10 text-left">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#18181b]">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-amber-400">100+</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Live NYC 311 Records Seeded</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#18181b]">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-amber-400">&le; 200m</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Geo-Clustering Radius</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#18181b]">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-amber-400">100%</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Photo-Verified Resolutions</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#18181b]">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-amber-400">72h</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Enforced Municipal SLA</div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Interactive Lifecycle Walkthrough */}
      <section id="how-it-works" className="py-16 px-6 bg-slate-50 dark:bg-[#0f0f12] border-b border-slate-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-600 dark:text-amber-400 font-bold">
              Transparent Municipal Lifecycle
            </span>
            <h2 className="text-3xl font-bold font-serif text-slate-900 dark:text-white">
              How Complaints Progress from Report to Verified Closure
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Every step is auditable, mathematically verified, and traceable by both citizens and city officials.
            </p>
          </div>

          {/* Workflow Step Selector */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { step: 1, title: "1. Intake & AI Triage", sub: "Citizen Report + Media" },
              { step: 2, title: "2. Duplicate Clustering", sub: "GPS ≤ 200m + Synonyms" },
              { step: 3, title: "3. Verified Repair", sub: "Photo Proof + Citizen Closure" }
            ].map((tab) => (
              <button
                key={tab.step}
                onClick={() => setWorkflowStep(tab.step)}
                className={`flex flex-col items-start px-5 py-3 rounded-xl border text-left transition-all ${
                  workflowStep === tab.step
                    ? "border-slate-900 bg-slate-900 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950 font-semibold shadow-sm"
                    : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-[#202024]"
                }`}
              >
                <span className="text-sm font-bold">{tab.title}</span>
                <span className={`text-xs font-mono mt-0.5 ${
                  workflowStep === tab.step 
                    ? "text-slate-300 dark:text-slate-800 font-semibold" 
                    : "text-slate-500 dark:text-slate-400"
                }`}>
                  {tab.sub}
                </span>
              </button>
            ))}
          </div>

          {/* Step Detail Card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-sm">
            {workflowStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#222226] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-neutral-700 text-xs font-semibold">
                    Phase 1: Resident Submission
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                    Fast issue filing with photos, GPS pins, and automatic category validation
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Residents photograph the issue and pinpoint the exact street location using an interactive Leaflet map. Our lightweight NLP parser checks category suggestions and computes initial severity in real time.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-mono">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Automatic device geolocation or click-to-place map pin
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Garage S3 multi-media upload (JPEG, PNG, MP4, WebM)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Real-time client validation and secure tokenized authentication
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141417] space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-slate-400">
                    <span className="font-mono font-medium">New Intake Sample</span>
                    <span className="font-semibold text-slate-800 dark:text-amber-400">Auto-Categorized</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-neutral-800 space-y-1">
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Resident Description</div>
                      <div className="text-slate-800 dark:text-slate-200 font-medium">"Deep road trench outside 85 Broad Street damaging car tires."</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-neutral-800 space-y-1">
                        <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Detected Category</div>
                        <div className="text-slate-900 dark:text-amber-400 font-bold">Pothole (96% conf)</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-neutral-800 space-y-1">
                        <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Coordinates</div>
                        <div className="text-slate-800 dark:text-slate-200 font-mono">40.7043, -74.0119</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#202025] border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-amber-400">AI Suggestion:</strong> Matched "trench" synonym &rarr; Routed to Roads & Public Works department.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {workflowStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-400/10 text-amber-900 dark:text-amber-400 border border-amber-200 dark:border-amber-400/30 text-xs font-semibold">
                    Phase 2: Automated 4-Step Duplicate Clustering
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                    Never dispatch two crews to the exact same pothole
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Municipal teams frequently waste hours sending multiple trucks to the same location. Our backend clustering checks: same category, within 200m, filed within 14 days, and keyword overlap. Duplicates are linked to the master case while boosting its priority score.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-mono">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Geodesic Haversine spatial radius check (≤ 200m)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Synonym canonicalization (crater/trench → pothole, waste/trash → garbage)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Master complaint priority elevated (+4 pts per duplicate)
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-400/30 bg-amber-50/40 dark:bg-[#141417] space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-amber-200 dark:border-neutral-800 text-amber-900 dark:text-amber-400">
                    <span className="font-mono font-semibold">4-Step Cluster Engine</span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 font-bold text-[10px]">DUPLICATE LINKED</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-white dark:bg-[#1c1c20] border border-amber-200 dark:border-neutral-800 space-y-1.5">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>New Report: #CMP-2026-0128</span>
                        <span>Filed 10 min ago</span>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200">Distance to Master #CMP-0127: <strong className="text-slate-900 dark:text-amber-400">34 meters</strong></div>
                      <div className="text-slate-800 dark:text-slate-200">Keyword match: <strong className="text-slate-900 dark:text-amber-400">"crater", "pothole" (Overlap &ge; 2)</strong></div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-100/70 dark:bg-[#222228] border border-amber-300 dark:border-amber-400/30 text-amber-900 dark:text-amber-300">
                      <strong>Cluster Result:</strong> Linked as duplicate under Master <code>#CMP-2026-0127</code>. Master priority increased from 52.0 to <strong>56.0 pts</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {workflowStep === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold">
                    Phase 3: Verified Field Resolution
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                    Mandatory photo evidence and citizen sign-off eliminate ghost closures
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Officers cannot resolve tickets with empty checkmarks. They must submit before/after repair photos and maintenance logs. The reporting citizen is prompted to confirm the fix or dispute it back to active queue.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-mono">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Mandatory before/after photographic proof upload
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Audit trail logged with timestamp and officer ID
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-slate-900 dark:text-amber-400 shrink-0" />
                      Citizen retains power to reject repair and reopen case
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-[#141417] space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-emerald-200 dark:border-neutral-800 text-emerald-900 dark:text-emerald-400">
                    <span className="font-mono font-semibold">Citizen Verification Audit</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 font-bold text-[10px]">CLOSED & VERIFIED</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-white dark:bg-[#1c1c20] border border-emerald-200 dark:border-neutral-800 space-y-2">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Resolution by: Officer Liam (DOT)</span>
                        <span className="text-emerald-800 dark:text-emerald-400 font-semibold">Repaired</span>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 italic">"Hot asphalt patch applied, steamrolled and cured."</div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-100/70 dark:bg-[#222228] border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300">
                      <strong>Citizen Feedback:</strong> "Confirmed fixed. Road is completely flat now. Thank you!" &rarr; Case marked <strong>Closed</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 4. Tech Stack Marquee */}
      <section id="architecture" className="py-12 bg-white dark:bg-[#121214] border-b border-slate-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 mb-6 text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-600 dark:text-amber-400 font-bold">
            Production Engineering
          </span>
          <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white mt-1">
            Built with Modern Open-Source Technologies
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Containerized with Docker, MongoDB, FastAPI, and S3 distributed storage.
          </p>
        </div>
        <TechMarquee />
      </section>

      {/* 5. Core Architectural Pillars */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-600 dark:text-amber-400 font-bold">
            System Capabilities
          </span>
          <h2 className="text-3xl font-bold font-serif text-slate-900 dark:text-white">
            Engineered to Solve Real Municipal Inefficiencies
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Transparent algorithms designed to replace opaque municipal bureaucracy with measurable accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ARCHITECTURE_PILLARS.map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] hover:border-slate-300 dark:hover:border-amber-400/40 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#222226] text-slate-800 dark:text-amber-400 border border-slate-200 dark:border-neutral-700">
                    <pillar.icon size={20} />
                  </div>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-100 dark:bg-[#222226] text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-neutral-700 font-medium">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {pillar.summary}
                </p>
                <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-2">
                  {pillar.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-amber-400 mt-1.5 shrink-0"></div>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Hackathon Judges' Testing Sandbox */}
      <section id="sandbox" className="py-16 px-6 bg-slate-100/70 dark:bg-[#0f0f12] border-t border-slate-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] text-slate-800 dark:text-amber-400 text-xs font-mono font-semibold">
              <Terminal size={13} /> HACKATHON EVALUATION SANDBOX
            </div>
            <h2 className="text-3xl font-extrabold font-serif text-slate-900 dark:text-white">
              1-Click Persona Testing for Evaluators
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Test all 3 distinct user perspectives with pre-configured credentials. Click any persona button to authenticate and launch directly into their dashboard.
            </p>
          </div>

          {/* Persona Selector Tabs */}
          <div className="flex justify-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] max-w-md mx-auto shadow-sm">
            {JUDGE_PERSONAS.map((p) => (
              <button
                key={p.key}
                onClick={() => setActiveTab(p.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === p.key
                    ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202024]"
                }`}
              >
                {p.role.split(" ")[0]} View
              </button>
            ))}
          </div>

          {/* Selected Persona Card */}
          {(() => {
            const persona = JUDGE_PERSONAS.find((p) => p.key === activeTab);
            const isLoggingIn = loggingInRole === persona.key;

            return (
              <div className="p-8 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-sm space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-neutral-800 pb-6">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">{persona.role}</h3>
                      <span className={`text-xs font-mono px-2.5 py-0.5 rounded border ${persona.badgeColor}`}>
                        {persona.badge}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {persona.description}
                    </p>
                  </div>
                  
                  {/* 1-Click Launch Button */}
                  <button
                    onClick={() => handleQuickLogin(persona.email, persona.password, persona.redirect, persona.key)}
                    disabled={isLoggingIn}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:hover:bg-amber-300 dark:text-slate-950 font-semibold text-sm shadow-sm transition-all shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {isLoggingIn ? "Authenticating..." : persona.actionLabel}
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* Credentials Quick-Copy Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141417] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Email Address</div>
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-amber-400">{persona.email}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(persona.email, `${persona.key}-email`)}
                      className="p-2 rounded-lg bg-white dark:bg-[#202024] border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-[#28282c] text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                      title="Copy email"
                    >
                      {copiedKey === `${persona.key}-email` ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#141417] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Password</div>
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-amber-400">{persona.password}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(persona.password, `${persona.key}-pw`)}
                      className="p-2 rounded-lg bg-white dark:bg-[#202024] border border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-[#28282c] text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                      title="Copy password"
                    >
                      {copiedKey === `${persona.key}-pw` ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Recommended Judge Evaluation Steps */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-amber-400 font-semibold">
                    Recommended Evaluation Steps for Judges:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {persona.testSteps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#141417] p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
                        <CheckCircle size={15} className="text-slate-900 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      </section>

      {/* 7. Clean Minimal Footer */}
      <footer className="py-12 px-6 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121214]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          
          <div className="flex items-center gap-3">
            <CivicEmblem size={24} />
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">CivicPortal 311 Grievance Resolution Platform</div>
              <div className="text-slate-500 dark:text-slate-400">Built by Dhiraj Rajput for the Civic Tech Hackathon 2026</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/bootstrap-admin" className="hover:text-slate-900 dark:hover:text-amber-400 transition-colors">Admin Bootstrap</Link>
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-amber-400 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-900 dark:hover:text-amber-400 transition-colors">Register</Link>
            <Link to="/citizen/submit" className="hover:text-slate-900 dark:hover:text-amber-400 transition-colors">Report Issue</Link>
            <div className="pl-2 border-l border-slate-200 dark:border-neutral-800">
              <ThemeToggle />
            </div>
          </div>
          
        </div>
      </footer>

    </div>
  );
}
