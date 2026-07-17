"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/types";
import type { ProdutoImportado } from "@/lib/csv";

export type ProdutoInput = {
  categoria: string;
  item: string;
  lote: string;
  descricao: string;
  qtdTotal: number;
  qtdManutencao: number;
  valorCusto: number;
  valorRevenda: number;
};

function validar(input: ProdutoInput): string | null {
  if (!input.categoria) return "Selecione a categoria do produto.";
  if (!input.item.trim()) return "Informe o nome do item.";
  if (input.qtdTotal < 0 || input.qtdManutencao < 0)
    return "As quantidades não podem ser negativas.";
  if (input.valorCusto < 0 || input.valorRevenda < 0)
    return "Os valores não podem ser negativos.";
  return null;
}

export async function salvarProduto(
  input: ProdutoInput,
  id?: number
): Promise<ActionResult> {
  try {
    const erro = validar(input);
    if (erro) return { ok: false, message: erro };

    const data = {
      categoria: input.categoria,
      item: input.item.trim(),
      lote: input.lote.trim(),
      descricao: input.descricao.trim(),
      qtdTotal: Math.trunc(input.qtdTotal),
      qtdManutencao: Math.trunc(input.qtdManutencao),
      valorCusto: input.valorCusto,
      valorRevenda: input.valorRevenda,
    };

    if (id) {
      await prisma.produto.update({ where: { id }, data });
    } else {
      await prisma.produto.create({ data });
    }

    revalidatePath("/", "layout");
    return {
      ok: true,
      message: id ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.",
    };
  } catch {
    return { ok: false, message: "Erro ao salvar o produto." };
  }
}

export async function excluirProduto(id: number): Promise<ActionResult> {
  try {
    const vinculos = await prisma.contratoItem.count({ where: { produtoId: id } });
    if (vinculos > 0) {
      return {
        ok: false,
        message: "Produto vinculado a contratos. Remova os vínculos antes de excluir.",
      };
    }
    await prisma.produto.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Produto excluído com sucesso." };
  } catch {
    return { ok: false, message: "Erro ao excluir o produto." };
  }
}

export type ImportacaoResult = ActionResult & {
  criados?: number;
  atualizados?: number;
};

function sanitizarImportacao(i: ProdutoImportado) {
  const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const inteiro = (v: unknown) => Math.max(0, Math.trunc(Number(v) || 0));
  const valor = (v: unknown) => Math.max(0, Number(v) || 0);

  const descricao = texto(i.descricao, 500);
  const lote = texto(i.lote, 100);
  const categoria = texto(i.categoria, 60) || "Outros";

  return {
    categoria,
    item:
      texto(i.item, 200) ||
      descricao ||
      `${categoria} ${lote}`.trim() ||
      "Item importado",
    lote,
    descricao,
    qtdTotal: inteiro(i.qtdTotal),
    qtdManutencao: inteiro(i.qtdManutencao),
    qtdProvisionado: inteiro(i.qtdProvisionado),
    valorCusto: valor(i.valorCusto),
    valorRevenda: valor(i.valorRevenda),
  };
}

export async function importarProdutos(
  itens: ProdutoImportado[]
): Promise<ImportacaoResult> {
  try {
    if (!Array.isArray(itens) || itens.length === 0) {
      return { ok: false, message: "Nenhum item válido para importar." };
    }
    if (itens.length > 5000) {
      return { ok: false, message: "Limite de 5000 linhas por importação excedido." };
    }

    const linhas = itens.map(sanitizarImportacao);
    let criados = 0;
    let atualizados = 0;

    await prisma.$transaction(
      async (tx) => {
        const existentes = await tx.produto.findMany({
          select: { id: true, lote: true },
        });
        const porLote = new Map<string, number>();
        for (const p of existentes) {
          const chave = p.lote.trim().toUpperCase();
          if (chave && !porLote.has(chave)) porLote.set(chave, p.id);
        }

        for (const linha of linhas) {
          const chave = linha.lote.trim().toUpperCase();
          const idExistente = chave ? porLote.get(chave) : undefined;
          if (idExistente) {
            await tx.produto.update({ where: { id: idExistente }, data: linha });
            atualizados++;
          } else {
            const novo = await tx.produto.create({ data: linha });
            criados++;
            if (chave) porLote.set(chave, novo.id);
          }
        }
      },
      { timeout: 120000, maxWait: 10000 }
    );

    revalidatePath("/", "layout");
    return {
      ok: true,
      criados,
      atualizados,
      message: `Importação concluída: ${criados} produto(s) adicionado(s), ${atualizados} atualizado(s).`,
    };
  } catch {
    return {
      ok: false,
      message: "Erro ao importar os produtos. Nenhum dado foi salvo.",
    };
  }
}
