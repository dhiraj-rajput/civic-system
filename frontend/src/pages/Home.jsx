import { Building2, ShieldCheck, User } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import Panel from "../components/ui/Panel.jsx";
import { PriorityBadge, StatusBadge } from "../components/Badges.jsx";

/* Hero shows the product's actual artifact -- a filed case -- rather than a
 * generic gradient banner + feature-icon grid. This is the most
 * characteristic thing in a civic-complaint system's world: a report that
 * becomes a tracked case with a reference number. */
export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h1 className="font-display max-w-lg text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Every civic report, tracked from filing to resolution.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
            Report a pothole, a dead streetlight, a water outage. It gets a case
            number, a priority, and a department — and you can watch it move.
          </p>
          <div className="mt-8 flex gap-3">
            <Button as={Link} to="/register" variant="accent" size="lg">
              Report an issue
            </Button>
            <Button as={Link} to="/login" variant="outline" size="lg">
              Login
            </Button>
          </div>
          <p className="mt-6 text-xs text-ink-soft">
            First time running this deployment?{" "}
            <Link to="/bootstrap-admin" className="text-steel underline underline-offset-2">
              Create the admin account
            </Link>
            .
          </p>
        </div>

        <Panel accent="signal" className="shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="font-ref text-xs text-ink-soft">CMP-2026-0142</span>
            <PriorityBadge priority="High" />
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-ink">
              Streetlight near Gate 3 has been out for a week — the road gets
              very dark after 7pm.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
              <span>Electrical Maintenance</span>
              <StatusBadge status="In Progress" />
            </div>
          </div>
          <div className="space-y-2 border-t border-line bg-paper px-5 py-3 text-xs text-ink-soft">
            <p>Filed · assigned to Electrical Maintenance · officer en route</p>
          </div>
        </Panel>
      </div>

      <div className="mt-16 grid gap-4 border-t border-line pt-10 sm:grid-cols-3">
        <Panel accent="signal" className="p-5">
          <User size={18} className="text-signal" strokeWidth={2} />
          <h3 className="font-display mt-3 font-semibold text-ink">Citizens</h3>
          <p className="mt-1 text-sm text-ink-soft">
            File a report with a photo-free description and a location. Track its status and add comments any time.
          </p>
        </Panel>
        <Panel accent="steel" className="p-5">
          <Building2 size={18} className="text-steel" strokeWidth={2} />
          <h3 className="font-display mt-3 font-semibold text-ink">Department officers</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Work your department's queue only — ranked by a rule-based priority score, not the order they arrived in.
          </p>
        </Panel>
        <Panel accent="civic" className="p-5">
          <ShieldCheck size={18} className="text-civic" strokeWidth={2} />
          <h3 className="font-display mt-3 font-semibold text-ink">Admins</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Full oversight: assign and reassign cases, manage departments, and watch SLA compliance in real time.
          </p>
        </Panel>
      </div>
    </div>
  );
}
