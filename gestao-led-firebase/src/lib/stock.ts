export type StockEffect = "RESERVE" | "SHIP" | "NONE";

export function stockEffect(status: string): StockEffect {
  if (status === "PROVISIONADO" || status === "SUSPENSO") return "RESERVE";
  if (status === "JA_SAIU") return "SHIP";
  return "NONE";
}

export type MovimentoCalculado = {
  qtd_total: number;
  qtd_provisionado: number;
  logs: { acao: string; quantidade: number }[];
};

export function calcularTransicao(
  produto: { item: string; qtd_total: number; qtd_manutencao: number; qtd_provisionado: number },
  quantidade: number,
  statusAtual: string,
  novoStatus: string,
  anoProv: string
): MovimentoCalculado {
  const de = stockEffect(statusAtual);
  const para = stockEffect(novoStatus);
  let total = produto.qtd_total;
  let provisionado = produto.qtd_provisionado;
  const logs: { acao: string; quantidade: number }[] = [];
  const q = quantidade;

  if (de === para) return { qtd_total: total, qtd_provisionado: provisionado, logs };

  if (de === "RESERVE") provisionado = Math.max(0, provisionado - q);
  if (de === "SHIP") total += q;

  const disponivel = total - produto.qtd_manutencao - provisionado;
  if (para !== "NONE" && disponivel < q) {
    throw new Error(
      `Estoque insuficiente para "${produto.item}" (disponível: ${disponivel}, necessário: ${q}).`
    );
  }

  if (para === "RESERVE") provisionado += q;
  if (para === "SHIP") total -= q;

  if (de === "RESERVE" && para === "SHIP") {
    logs.push({ acao: `Baixa por Contrato ${anoProv}`, quantidade: -q });
  } else if (de === "SHIP" && para === "RESERVE") {
    logs.push({ acao: `Estorno de baixa — Contrato ${anoProv}`, quantidade: q });
  } else {
    if (de === "RESERVE") {
      logs.push({
        acao:
          novoStatus === "CANCELADO"
            ? `Estorno por Cancelamento — Contrato ${anoProv}`
            : `Liberação de reserva — Contrato ${anoProv}`,
        quantidade: q,
      });
    }
    if (de === "SHIP") {
      logs.push({
        acao:
          novoStatus === "CANCELADO"
            ? `Estorno por Cancelamento — Contrato ${anoProv}`
            : `Estorno de baixa — Contrato ${anoProv}`,
        quantidade: q,
      });
    }
    if (para === "RESERVE") {
      logs.push({ acao: `Provisionamento — Contrato ${anoProv}`, quantidade: -q });
    }
    if (para === "SHIP") {
      logs.push({ acao: `Baixa por Contrato ${anoProv}`, quantidade: -q });
    }
  }

  return { qtd_total: total, qtd_provisionado: provisionado, logs };
}
