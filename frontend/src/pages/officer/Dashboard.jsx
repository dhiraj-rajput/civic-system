import { Building2, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/complaints")
      .then(setComplaints)
      .catch((e) => setError(e.detail || "Could not load queue"));
  }, []);

  const assigned = complaints?.length ?? null;
  const pending = complaints?.filter((c) => c.status === "Assigned").length ?? null;
  const inProgress = complaints?.filter((c) => c.status === "In Progress").length ?? null;
  const resolved = complaints?.filter((c) => c.status === "Resolved").length ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader icon={Building2} title={user?.department} description="Your department's queue at a glance." />

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Assigned" value={assigned ?? "—"} tone="steel" />
        <StatCard label="Pending" value={pending ?? "—"} tone="brick" />
        <StatCard label="In progress" value={inProgress ?? "—"} tone="signal" />
        <StatCard label="Resolved" value={resolved ?? "—"} tone="civic" />
      </div>

      <div className="mt-8">
        <Button as={Link} to="/officer/complaints" variant="accent" size="lg">
          <ListChecks size={16} strokeWidth={2} /> View assigned complaints
        </Button>
      </div>
    </div>
  );
}
