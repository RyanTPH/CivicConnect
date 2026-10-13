import {
  Clock3,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  CircleHelp,
} from "lucide-react";

import styles from "./UI.module.css";

// Maps request statuses to accessible labels and visual indicators.
const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock3,
    className: styles.statusPending,
  },
  in_progress: {
    label: "In Progress",
    icon: LoaderCircle,
    className: styles.statusProgress,
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: styles.statusResolved,
  },
  closed: {
    label: "Closed",
    icon: CheckCircle2,
    className: styles.statusResolved,
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: styles.statusCancelled,
  },
};

export default function StatusBadge({ status }) {
  const normalized = String(status ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  const config = statusConfig[normalized] || {
    label: String(status || "Unknown"),
    icon: CircleHelp,
    className: styles.statusUnknown,
  };

  const Icon = config.icon;

  return (
    <span className={`${styles.statusBadge} ${config.className}`}>
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
}