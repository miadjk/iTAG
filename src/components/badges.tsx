import { AlertCircle, CheckCircle2, Clock, Package } from "lucide-react";
import type { PropertyCondition, PropertyStatus, SupplyStatus } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";

export function propertyStatusBadge(status: PropertyStatus) {
  const map = {
    active: { label: "Active", tone: "ok" as const, icon: CheckCircle2 },
    idle: { label: "Idle", tone: "neutral" as const, icon: Clock },
    unserviceable: { label: "Unserviceable", tone: "warn" as const, icon: AlertCircle },
    for_disposal: { label: "For Disposal", tone: "warn" as const, icon: AlertCircle },
    lost: { label: "Lost", tone: "danger" as const, icon: AlertCircle },
  };
  const item = map[status];
  return <StatusBadge {...item} />;
}

export function conditionBadge(condition: PropertyCondition) {
  const map = {
    serviceable: { label: "Serviceable", tone: "ok" as const, icon: CheckCircle2 },
    needs_repair: { label: "Needs Repair", tone: "warn" as const, icon: AlertCircle },
    damaged: { label: "Damaged", tone: "danger" as const, icon: AlertCircle },
    unserviceable: { label: "Unserviceable", tone: "warn" as const, icon: AlertCircle },
    missing: { label: "Missing", tone: "danger" as const, icon: AlertCircle },
  };
  return <StatusBadge {...map[condition]} />;
}

export function supplyStatusBadge(status: SupplyStatus) {
  const map = {
    available: { label: "Available", tone: "ok" as const, icon: Package },
    low_stock: { label: "Low Stock", tone: "warn" as const, icon: AlertCircle },
    out_of_stock: { label: "Out of Stock", tone: "danger" as const, icon: AlertCircle },
  };
  return <StatusBadge {...map[status]} />;
}

export function classLabel(value: "low_value" | "high_value") {
  return value === "low_value" ? "Low-Value" : "High-Value";
}
