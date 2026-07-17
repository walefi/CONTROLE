import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  FileText,
  Loader2,
  PackageCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useColecao } from "@/hooks/use-colecao";
import { qtdDisponivel, type Contrato, type Produto } from "@/lib/types";
import { brl, fmtData } from "@/lib/format";
import { ESTOQUE_BAIXO, STATUS_ATIVOS } from "@/lib/constants";
import { carregarDadosExemplo } from "@/services/seed";
import { MetricCard } from "@/components/metric-card";
import { CategoriaBadge, StatusBadge } from "@/components/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function Dashboard() {
  const { dados: produtos, carregando } = useColecao<Produto>("produtos");
  const { dados: contratos } = useColecao<Contrato>("contratos");
  const [seedando, setSeedando] = useState(false);

  const valorCusto = produtos.reduce((s, p) => s + p.qtd_total * p.valor_custo, 0);
  const valorRevenda = produtos.reduce((s, p) => s + p.qtd_total * p.valor_revenda, 0);
  const ativos = contratos.filter((c) => STATUS_ATIVOS.includes(c.status));
  const provisionados = contratos.filter((c) => c.status === "PROVISIONADO").length;
  const unidadesProvisionadas = produtos.reduce((s, p) => s + p.qtd_provisionado, 0);
  const estoqueBaixo = produtos
    .map((p) => ({ ...p, disponivel: qtdDisponivel(p) }))
    .filter((p) => p.disponivel < ESTOQUE_BAIXO)
    .sort((a, b) => a.disponivel - b.disponivel);
  const recentes = [...contratos]
    .sort(
      (a, b) => (b.atualizado_em?.toMillis() ?? 0) - (a.atualizado_em?.toMillis() ?? 0)
    )
    .slice(0, 6);

  async function onCarregarExemplo() {
    setSeedando(true);
    const res = await carregarDadosExemplo();
    setSeedando(false);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do estoque e dos contratos de painéis de LED.
        </p>
      </div>

      {!carregando && produtos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Database className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Banco de dados vazio</p>
              <p className="text-xs text-muted-foreground">
                Carregue os dados de exemplo para ver a lógica de estoque funcionando.
              </p>
            </div>
            <Button onClick={onCarregarExemplo} disabled={seedando}>
              {seedando && <Loader2 className="h-4 w-4 animate-spin" />}
              {seedando ? "Carregando..." : "Carregar dados de exemplo"}
            </Button>
          </CardContent>
        </Card>
      )}

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
                        {p.qtd_total}
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
            {recentes.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum contrato cadastrado.
              </p>
            )}
            {recentes.map((c) => (
              <Link
                key={c.id}
                to={`/contratos/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.ano_prov} · Prazo: {fmtData(c.prazo)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={c.status} />
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
