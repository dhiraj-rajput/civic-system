import React from "react";
import { Link } from "react-router-dom";
import { CivicLogo } from "../CivicLogo.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import { ShieldCheck, MapPin, Layers } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f12] flex items-center justify-center p-4 sm:p-6 lg:p-8 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Floating Theme Toggle in Top Right */}
      <div className="fixed top-5 right-5 z-50 p-1 rounded-full bg-white/80 dark:bg-[#18181b]/80 border border-slate-200 dark:border-neutral-800 backdrop-blur shadow-sm">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* Left Side: Information & Branding */}
        <div className="bg-slate-100/70 dark:bg-[#141417] p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-neutral-800 flex flex-col justify-between">
          <div>
            <Link to="/" className="inline-block mb-8">
              <CivicLogo size={32} />
            </Link>
            
            <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white tracking-tight">
              NYC 311 Grievance & Rapid Response Portal
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              An open municipal platform connecting city residents, field repair crews, and public works administrators.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-neutral-800 shadow-sm">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#26262b] text-slate-700 dark:text-amber-400 shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Real NYC 311 Ingestion</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Live integration with NYC Open Data Socrata feed</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-neutral-800 shadow-sm">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#26262b] text-slate-700 dark:text-amber-400 shrink-0">
                  <Layers size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">4-Step Duplicate Suppression</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">GPS &le; 200m spatial clustering prevents duplicate work</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-neutral-800 shadow-sm">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#26262b] text-slate-700 dark:text-amber-400 shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Evidence-Backed Verification</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Mandatory photo proof and citizen sign-off</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-neutral-800 text-xs text-slate-500 dark:text-slate-400">
            &copy; 2026 CivicPortal • Built for the Civic Tech Hackathon
          </div>
        </div>

        {/* Right Side: Form Area */}
        <div className="p-8 sm:p-10 bg-white dark:bg-[#18181b] flex flex-col justify-center">
          {children}
        </div>

      </div>
    </div>
  );
}
