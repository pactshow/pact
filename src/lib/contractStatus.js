export const CONTRACT_STATUS_LABELS = {
  draft: "Draft",
  sent: "Waiting for counter-signature",
  received: "Awaiting your signature",
  signed: "Fully signed",
  completed: "Completed",
  cancelled: "Cancelled",
  countered: "Counter-offer pending",
};

export function contractStatusLabel(status) {
  if (!status) return "Unknown";
  return CONTRACT_STATUS_LABELS[status] ?? status;
}
