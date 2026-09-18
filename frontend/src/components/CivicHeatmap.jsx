import React, { useEffect, useState, useMemo } from "react";
import { Filter, Layers, AlertTriangle, RefreshCw, X, ShieldAlert, Clock, MapPin } from "lucide-react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/Toast";
import ComplaintMap from "./ComplaintMap";
import { PriorityBadge, StatusBadge } from "./Badges";
import { CATEGORIES, STATUSES } from "@/constants";

const PRIORITIES = ["All", "Critical", "High", "Medium", "Low"];
const DATE_RANGES = [
  { label: "All Time", value: null },
  { label: "Past 7 Days", value: 7 },
  { label: "Past 14 Days", value: 14 },
  { label: "Past 30 Days", value: 30 },
];

export default function CivicHeatmap() {
  const { toast } = useToast();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedDays, setSelectedDays] = useState(null);
  const [recurringOnly, setRecurringOnly] = useState(false);

  // Selected drilldown item
  const [selectedPin, setSelectedPin] = useState(null);

  const fetchHeatmapData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "All") params.append("category", selectedCategory);
      if (selectedPriority !== "All") params.append("priority", selectedPriority);
      if (selectedStatus !== "All") params.append("status", selectedStatus);
      if (selectedDays) params.append("days", selectedDays);
      if (recurringOnly) params.append("recurring_only", "true");

      const data = await api.get(`/analytics/heatmap?${params.toString()}`);
      setPoints(data || []);
    } catch (err) {
      toast.error("Failed to load geographic heatmap points");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  }, [selectedCategory, selectedPriority, selectedStatus, selectedDays, recurringOnly]);

  const summaryStats = useMemo(() => {
    const total = points.length;
    const criticalHigh = points.filter(
      (p) => p.priority_label === "Critical" || p.priority_label === "High"
    ).length;
    const recurring = points.filter((p) => p.is_duplicate).length;
    const breached = points.filter((p) => p.is_sla_breached).length;
    return { total, criticalHigh, recurring, breached };
  }, [points]);

  return (
    <div className="space-y-6">
      {/* Top Filter Controls */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2 text-ink">
            <Layers size={18} className="text-brand" />
            <h3 className="text-sm font-bold">Civic Heatmap Controls</h3>
          </div>
          <button
            onClick={fetchHeatmapData}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-input px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-input px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-input px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Date Range
            </label>
            <select
              value={selectedDays || ""}
              onChange={(e) => setSelectedDays(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-border bg-surface-input px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.label} value={r.value || ""}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recurring Cluster Toggle */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => setRecurringOnly(!recurringOnly)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                recurringOnly
                  ? "border-amber-500 bg-amber-500/10 text-amber-500 font-semibold"
                  : "border-border bg-surface-input text-ink-secondary hover:text-ink"
              }`}
            >
              <AlertTriangle size={13} />
              <span>Recurring Clusters Only</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-ink-secondary border-t border-border">
          <span>
            Total Pins: <strong className="text-ink">{summaryStats.total}</strong>
          </span>
          <span>
            Critical / High: <strong className="text-danger">{summaryStats.criticalHigh}</strong>
          </span>
          <span>
            Recurring Clusters: <strong className="text-warning">{summaryStats.recurring}</strong>
          </span>
          <span>
            SLA Breaches: <strong className="text-danger">{summaryStats.breached}</strong>
          </span>
        </div>
      </div>

      {/* Map + Side Drilldown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Interactive Map */}
        <div className="lg:col-span-2">
          <ComplaintMap
            mode="multi"
            complaints={points}
            onPinClick={(c) => setSelectedPin(c)}
            style={{ height: "480px", width: "100%" }}
          />
        </div>

        {/* Selected Hotspot Drilldown Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Hotspot Inspection Details
            </h4>
            {selectedPin && (
              <button
                onClick={() => setSelectedPin(null)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {selectedPin ? (
            <div className="space-y-3.5 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-ink">
                  {selectedPin.complaint_id}
                </span>
                <PriorityBadge priority={selectedPin.priority_label} />
              </div>

              <div>
                <div className="text-ink-muted text-[11px]">Category & Status</div>
                <div className="font-medium text-ink capitalize flex items-center gap-2 mt-0.5">
                  <span>{selectedPin.category}</span>
                  <StatusBadge status={selectedPin.status} />
                </div>
              </div>

              <div>
                <div className="text-ink-muted text-[11px]">Coordinates & Address</div>
                <div className="font-mono text-ink mt-0.5">
                  {selectedPin.lat?.toFixed?.(4)}, {selectedPin.lng?.toFixed?.(4)}
                </div>
                <div className="text-ink-secondary text-[11px] mt-0.5">
                  📍 {selectedPin.address_text || "No address specified"}
                </div>
              </div>

              {selectedPin.is_duplicate && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-600">
                  <strong>Duplicate Cluster: </strong>
                  Linked to master case <code>{selectedPin.duplicate_group_id || selectedPin.complaint_id}</code>.
                </div>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between text-ink-muted">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Age: {selectedPin.hours_elapsed}h
                </span>
                {selectedPin.is_sla_breached && (
                  <span className="text-danger font-bold">⚠️ SLA Breached</span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-ink-muted space-y-2">
              <MapPin size={24} className="mx-auto text-brand opacity-60" />
              <p className="text-xs">
                Click any complaint pin on the map to inspect its real-time priority score, cluster grouping, and SLA tracking data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
