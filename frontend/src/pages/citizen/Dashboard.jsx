import { FileText, LayoutDashboard, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/complaints/mine")
      .then(setComplaints)
      .catch((e) => setError(e.detail || "Could not load complaints"));
  }, []);

  const total = complaints?.length ?? null;
  const open = complaints?.filter((c) => c.status === "New" || c.status === "Assigned").length ?? null;
  const inProgress = complaints?.filter((c) => c.status === "In Progress").length ?? null;
  const resolved = complaints?.filter((c) => c.status === "Resolved").length ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader icon={LayoutDashboard} title={`Welcome, ${user?.name}`} description="Your civic reports at a glance." />

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total filed" value={total ?? "—"} tone="steel" />
        <StatCard label="Open" value={open ?? "—"} tone="brick" />
        <StatCard label="In progress" value={inProgress ?? "—"} tone="signal" />
        <StatCard label="Resolved" value={resolved ?? "—"} tone="civic" />
      </div>

      <div className="mt-8 flex gap-3">
        <Button as={Link} to="/citizen/submit" variant="accent" size="lg">
          <FileText size={16} strokeWidth={2} /> Submit a complaint
        </Button>
        <Button as={Link} to="/citizen/complaints" variant="outline" size="lg">
          <ListChecks size={16} strokeWidth={2} /> View my complaints
        </Button>
      </div>
    </div>
  );
}
