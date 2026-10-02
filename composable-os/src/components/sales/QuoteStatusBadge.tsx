import { Badge } from "@/components/ui/badge";
import { useEnumLabel } from "@/i18n/enumLabel";

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

const STATUS_MAP: Record<QuoteStatus, {
  variant: "secondary" | "default" | "destructive" | "outline";
  className?: string;
}> = {
  draft:    { variant: "secondary" },
  sent:     { variant: "default" },
  accepted: { variant: "secondary", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { variant: "destructive" },
  expired:  { variant: "secondary", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const label = useEnumLabel();
  const cfg = STATUS_MAP[status] ?? { variant: "secondary" as const };
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {label("common:quoteStatus", status)}
    </Badge>
  );
}
