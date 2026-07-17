import { prisma } from "@/lib/prisma";
import type { Status } from "@/lib/constants";
import type { ContratoCard } from "@/lib/types";
import { Kanban } from "@/components/contratos/kanban";
import { NovoContratoDialog } from "@/components/contratos/novo-contrato-dialog";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const contratos = await prisma.contrato.findMany({
    include: { itens: { include: { produto: true } } },
    orderBy: { atualizadoEm: "desc" },
  });

  const cards: ContratoCard[] = contratos.map((c) => ({
    id: c.id,
    anoProv: c.anoProv,
    status: c.status as Status,
    cliente: c.cliente,
    tamanhoPainel: c.tamanhoPainel,
    prazo: c.prazo,
    totalItens: c.itens.reduce((s, i) => s + i.quantidade, 0),
    valorTotal: c.itens.reduce((s, i) => s + i.quantidade * i.produto.valorRevenda, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os pedidos por status. Clique em um card para ver os detalhes.
          </p>
        </div>
        <NovoContratoDialog />
      </div>
      <Kanban contratos={cards} />
    </div>
  );
}
