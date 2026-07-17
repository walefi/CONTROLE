import { Link } from "react-router-dom";
import { CalendarDays, Monitor, Package } from "lucide-react";
import { STATUS_LIST, STATUS_META } from "@/lib/constants";
import { brl, fmtData } from "@/lib/format";
import type { Contrato } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type CartaoContrato = Contrato & {
  totalItens: number;
  valorTotal: number;
};

export function Kanban({ contratos }: { contratos: CartaoContrato[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_LIST.map((status) => {
        const meta = STATUS_META[status];
        const doStatus = contratos.filter((c) => c.status === status);
        return (
          <div key={status} className="w-72 shrink-0 rounded-xl bg-muted/60 p-3">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              <span className="text-sm font-semibold">{meta.label}</span>
              <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {doStatus.length}
              </span>
            </div>
            <div className="space-y-3">
              {doStatus.map((c) => (
                <Link key={c.id} to={`/contratos/${c.id}`} className="block">
                  <Card className="py-0 transition-shadow hover:shadow-md">
                    <CardContent className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.ano_prov}
                        </span>
                        <span className="text-xs font-semibold">{brl(c.valorTotal)}</span>
                      </div>
                      <p className="text-sm font-semibold leading-snug">{c.cliente}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {c.tamanho_painel && (
                          <p className="flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5" />
                            {c.tamanho_painel}
                          </p>
                        )}
                        <p className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Prazo: {fmtData(c.prazo)}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                          {c.totalItens} unidade(s) vinculada(s)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {doStatus.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Nenhum contrato
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
