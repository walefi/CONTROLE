import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  PackageCheck,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { qtdDisponivel } from "@/lib/stock";
import { brl, fmtData } from "@/lib/format";
import { ESTOQUE_BAIXO, STATUS_ATIVOS, type Status } from "@/lib/constants";
import { MetricCard } from "@/components/metric-card";
import { CategoriaBadge, StatusBadge } from "@/components/badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [produtos, contratos] = await Promise.all([
    prisma.produto.findMany({ orderBy: { item: "asc" } }),
    prisma.contrato.findMany({ orderBy: { atualizadoEm: "desc" } }),
  ]);

  const valorCusto = produtos.reduce((s, p) => s + p.qtdTotal * p.valorCusto, 0);
  const valorRevenda = produtos.reduce((s, p) => s + p.qtdTotal * p.valorRevenda, 0);
  const ativos = contratos.filter((c) => STATUS_ATIVOS.includes(c.status as Status));
  const provisionados = contratos.filter((c) => c.status === "PROVISIONADO").length;
  const unidadesProvisionadas = produtos.reduce((s, p) => s + p.qtdProvisionado, 0);
  const estoqueBaixo = produtos
    .map((p) => ({ ...p, disponivel: qtdDisponivel(p) }))
    .filter((p) => p.disponivel < ESTOQUE_BAIXO)
    .sort((a, b) => a.disponivel - b.disponivel);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do estoque e dos contratos de painéis de LED.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Valor do Estoque (Custo)"
          value={brl(valorCusto)}
          sub={`Potencial de revenda: ${brl(valorRevenda)}`}
          icon={Wallet}
          iconClass="bg-blue-50 text-blue-600"
        />
        <MetricCard
          title="Contratos Ativos"
          value={String(ativos.length)}
          sub={`${provisionados} provisionado(s) no momento`}
          icon={FileText}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="Unidades Provisionadas"
          value={String(unidadesProvisionadas)}
          sub="Reservadas para contratos"
          icon={PackageCheck}
          iconClass="bg-violet-50 text-violet-600"
        />
        <MetricCard
          title="Alertas de Estoque"
          value={String(estoqueBaixo.length)}
          sub={`Produtos com disponível abaixo de ${ESTOQUE_BAIXO} un.`}
          icon={AlertTriangle}
          iconClass="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alertas de Estoque Baixo
            </CardTitle>
            <CardDescription>
              Produtos com quantidade disponível inferior a {ESTOQUE_BAIXO} unidades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estoqueBaixo.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum alerta de estoque no momento.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Disponível</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estoqueBaixo.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.item}</p>
                        <p className="text-xs text-muted-foreground">
                          Lote {p.lote || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <CategoriaBadge categoria={p.categoria} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="tabular-nums">
                          {p.disponivel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.qtdTotal}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contratos Recentes</CardTitle>
            <CardDescription>Últimas movimentações de contratos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {contratos.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum contrato cadastrado.
              </p>
            )}
            {contratos.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/contratos/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.anoProv} · Prazo: {fmtData(c.prazo)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={c.status as Status} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
