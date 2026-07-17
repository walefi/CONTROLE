import type { Prisma } from "@prisma/client";

export type StockEffect = "RESERVE" | "SHIP" | "NONE";

export function stockEffect(status: string): StockEffect {
  if (status === "PROVISIONADO" || status === "SUSPENSO") return "RESERVE";
  if (status === "JA_SAIU") return "SHIP";
  return "NONE";
}

export function qtdDisponivel(p: {
  qtdTotal: number;
  qtdManutencao: number;
  qtdProvisionado: number;
}) {
  return p.qtdTotal - p.qtdManutencao - p.qtdProvisionado;
}

export async function aplicarTransicaoDeStatus(
  tx: Prisma.TransactionClient,
  contratoId: number,
  statusAtual: string,
  novoStatus: string
) {
  const de = stockEffect(statusAtual);
  const para = stockEffect(novoStatus);
  if (de === para) return;

  const itens = await tx.contratoItem.findMany({
    where: { contratoId },
    include: { produto: true },
  });

  for (const item of itens) {
    const p = item.produto;
    const q = item.quantidade;
    let total = p.qtdTotal;
    let provisionado = p.qtdProvisionado;

    if (de === "RESERVE") provisionado = Math.max(0, provisionado - q);
    if (de === "SHIP") total += q;

    const disponivel = total - p.qtdManutencao - provisionado;
    if (para !== "NONE" && disponivel < q) {
      throw new Error(
        `Estoque insuficiente para "${p.item}" (disponível: ${disponivel}, necessário: ${q}).`
      );
    }

    if (para === "RESERVE") provisionado += q;
    if (para === "SHIP") total -= q;

    await tx.produto.update({
      where: { id: p.id },
      data: { qtdTotal: total, qtdProvisionado: provisionado },
    });
  }
}
