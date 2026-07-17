import { prisma } from "@/lib/prisma";
import { qtdDisponivel } from "@/lib/stock";
import type { ProdutoRow } from "@/lib/types";
import { EstoqueClient } from "@/components/estoque/estoque-client";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const produtos = await prisma.produto.findMany({
    orderBy: [{ categoria: "asc" }, { item: "asc" }],
  });

  const rows: ProdutoRow[] = produtos.map((p) => ({
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

  return <EstoqueClient produtos={rows} />;
}
