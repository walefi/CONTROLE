import { prisma } from "@/lib/prisma";
import { qtdDisponivel } from "@/lib/stock";
import type { ProdutoRow } from "@/lib/types";
import { CalculadoraClient } from "@/components/calculadora/calculadora-client";

export const dynamic = "force-dynamic";

export type ContratoResumo = {
  id: number;
  anoProv: string;
  cliente: string;
  status: string;
};

export default async function CalculadoraPage() {
  const produtos = await prisma.produto.findMany({
    orderBy: [{ categoria: "asc" }, { item: "asc" }],
  });

  const contratos = await prisma.contrato.findMany({
    select: { id: true, anoProv: true, cliente: true, status: true },
    orderBy: { atualizadoEm: "desc" },
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

  return <CalculadoraClient produtos={rows} contratos={contratos} />;
}
