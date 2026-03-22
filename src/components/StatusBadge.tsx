interface StatusBadgeProps {
  status: "achitat" | "partial" | "neachitat";
}

const labels: Record<string, string> = {
  achitat: "Achitat",
  partial: "Parțial",
  neachitat: "Neachitat",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls =
    status === "achitat"
      ? "status-paid"
      : status === "partial"
      ? "status-partial"
      : "status-unpaid";

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {labels[status]}
    </span>
  );
}
