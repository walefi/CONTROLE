import { useState } from "react";
import { toast } from "sonner";
import { alterarStatus } from "@/services/contratos";
import { STATUS_LIST, STATUS_META, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_ITEMS = STATUS_LIST.map((s) => ({
  value: s as string,
  label: STATUS_META[s].label,
}));

export function StatusCard({
  contratoId,
  status,
}: {
  contratoId: string;
  status: Status;
}) {
  const [loading, setLoading] = useState(false);

  async function onChange(novo: string) {
    if (novo === status) return;
    setLoading(true);
    const res = await alterarStatus(contratoId, novo as Status);
    setLoading(false);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status do Contrato</CardTitle>
        <CardDescription>
          O estoque é ajustado automaticamente a cada mudança de status (transação
          atômica no Firestore).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(v) => onChange(String(v))}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                  {STATUS_META[s].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{STATUS_META[status].hint}</p>
      </CardContent>
    </Card>
  );
}
