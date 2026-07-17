import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { qtdDisponivel } from "@/lib/stock";
import type { Status } from "@/lib/constants";
import type { ItemContratoRow, ProdutoRow } from "@/lib/types";
import { StatusBadge } from "@/components/badges";
import { ContratoForm } from "@/components/contratos/contrato-form";
import { ExcluirContratoButton } from "@/components/contratos/excluir-contrato";
import { ItensManager } from "@/components/contratos/itens-manager";
import { StatusCard } from "@/components/contratos/status-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contratoId = Number(id);
  if (!Number.isInteger(contratoId)) notFound();

  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: { itens: { include: { produto: true }, orderBy: { id: "asc" } } },
  });
  if (!contrato) notFound();

  const produtos = await prisma.produto.findMany({
    orderBy: [{ categoria: "asc" }, { item: "asc" }],
  });

  const itens: ItemContratoRow[] = contrato.itens.map((i) => ({
    id: i.id,
    produtoId: i.produtoId,
    quantidade: i.quantidade,
    produto: {
      item: i.produto.item,
      categoria: i.produto.categoria,
      lote: i.produto.lote,
      valorRevenda: i.produto.valorRevenda,
      qtdDisponivel: qtdDisponivel(i.produto),
    },
  }));

  const catalogo: ProdutoRow[] = produtos.map((p) => ({
    id: p.id,
    categoria: p.categoria,
    item: p.item,
    lote: p.lote,
    descricao: p.descricao,
    qtdTotal: p.qtdTotal,
    qtdManutencao: p.qtdManutencao,
    qtdProvisionado: p.qtdProvisionado,
    qtdDisponivel: qtdDisponivel(p),
    valorCusto: p.valorCusto,
    valorRevenda: p.valorRevenda,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/contratos"
          aria-label="Voltar para contratos"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-9 w-9")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{contrato.cliente}</h1>
            <StatusBadge status={contrato.status as Status} />
          </div>
          <p className="text-sm text-muted-foreground">Contrato {contrato.anoProv}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/contratos/${contrato.id}/imprimir`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Printer className="h-4 w-4" />
            Exportar Resumo (PDF)
          </Link>
          <ExcluirContratoButton id={contrato.id} anoProv={contrato.anoProv} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ItensManager
            contratoId={contrato.id}
            status={contrato.status as Status}
            itens={itens}
            produtos={catalogo}
          />
        </div>
        <div className="space-y-6">
          <StatusCard contratoId={contrato.id} status={contrato.status as Status} />
          <ContratoForm
            contrato={{
              id: contrato.id,
              anoProv: contrato.anoProv,
              cliente: contrato.cliente,
              tamanhoPainel: contrato.tamanhoPainel,
              prazo: contrato.prazo,
              observacoes: contrato.observacoes,
            }}
          />
        </div>
      </div>
    </div>
  );
}
