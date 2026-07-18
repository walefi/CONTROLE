import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useColecao } from "@/hooks/use-colecao";
import type { Contrato, ContratoItem, Produto } from "@/lib/types";
import { StatusBadge } from "@/components/badges";
import { ContratoForm } from "@/components/contratos/contrato-form";
import { ExcluirContratoButton } from "@/components/contratos/excluir-contrato";
import { ItensManager } from "@/components/contratos/itens-manager";
import { StatusCard } from "@/components/contratos/status-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { dados: contratos, carregando } = useColecao<Contrato>("contratos");
  const { dados: todosItens } = useColecao<ContratoItem>("contrato_itens");
  const { dados: produtos } = useColecao<Produto>("produtos");

  const contrato = contratos.find((c) => c.id === id) ?? null;
  const itens = useMemo(
    () => todosItens.filter((i) => i.id_contrato === id),
    [todosItens, id]
  );
  const catalogo = useMemo(
    () =>
      [...produtos].sort(
        (a, b) => a.categoria.localeCompare(b.categoria) || a.item.localeCompare(b.item)
      ),
    [produtos]
  );

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Contrato não encontrado.</p>
        <Link to="/contratos" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para Contratos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/contratos"
          aria-label="Voltar para contratos"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-9 w-9")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{contrato.cliente}</h1>
            <StatusBadge status={contrato.status} />
          </div>
          <p className="text-sm text-muted-foreground">Contrato {contrato.ano_prov}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/contratos/${contrato.id}/imprimir`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Printer className="h-4 w-4" />
            Exportar Resumo (PDF)
          </Link>
          {isAdmin && (
            <ExcluirContratoButton id={contrato.id} anoProv={contrato.ano_prov} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ItensManager
            contratoId={contrato.id}
            status={contrato.status}
            itens={itens}
            produtos={catalogo}
          />
        </div>
        <div className="space-y-6">
          <StatusCard contratoId={contrato.id} status={contrato.status} />
          {isAdmin && (
            <ContratoForm key={contrato.id + contrato.atualizado_em?.toMillis()} contrato={contrato} />
          )}
        </div>
      </div>
    </div>
  );
}
