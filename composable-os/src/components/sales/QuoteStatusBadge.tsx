import { Badge } from "@/components/ui/badge";

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

const STATUS_MAP: Record<QuoteStatus, {
  variant: "secondary" | "default" | "destructive" | "outline";
  label: string;
  className?: string;
}> = {
  draft:    { variant: "secondary",   label: "Draft" },
  sent:     { variant: "default",     label: "Sent" },
  accepted: { variant: "secondary",   label: "Accepted", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { variant: "destructive", label: "Rejected" },
  expired:  { variant: "secondary",   label: "Expired",  className: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const cfg = STATUS_MAP[status] ?? { variant: "secondary" as const, label: status };
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}
