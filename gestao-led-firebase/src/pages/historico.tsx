import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useColecao } from "@/hooks/use-colecao";
import { fmtDataHora } from "@/lib/format";
import type { LogRegistro } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function extrairQuantidade(detalhes: string): number | null {
  const m = detalhes.match(/([+-]\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

export default function Historico() {
  const { dados: logs, carregando } = useColecao<LogRegistro>("logs", {
    ordenarPor: "data",
    direcao: "desc",
    limite: 300,
  });
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return logs;
    return logs.filter((l) =>
      `${l.usuario} ${l.acao} ${l.detalhes}`.toLowerCase().includes(termo)
    );
  }, [logs, busca]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Histórico de Movimentação
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro automático de todas as alterações de estoque (últimos 300 eventos).
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filtrar por usuário, ação ou produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Data / Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead className="w-24 pr-6 text-right">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando && (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!carregando && filtrados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((l) => {
                const qtd = extrairQuantidade(l.detalhes);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap pl-6 text-muted-foreground">
                      {fmtDataHora(l.data)}
                    </TableCell>
                    <TableCell className="font-medium">{l.usuario}</TableCell>
                    <TableCell>{l.acao}</TableCell>
                    <TableCell className="max-w-72 truncate text-muted-foreground">
                      {l.detalhes}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {qtd !== null ? (
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            qtd > 0 ? "text-emerald-700" : "text-red-600"
                          )}
                        >
                          {qtd > 0 ? `+${qtd}` : qtd}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
