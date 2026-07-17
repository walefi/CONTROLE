import { Badge } from "@/components/ui/badge";
import { CATEGORIA_BADGE, STATUS_META, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("font-medium", meta.badge, className)}>
      {meta.label}
    </Badge>
  );
}

export function CategoriaBadge({ categoria }: { categoria: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", CATEGORIA_BADGE[categoria] ?? CATEGORIA_BADGE.Outros)}
    >
      {categoria}
    </Badge>
  );
}
