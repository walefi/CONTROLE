"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { aplicarTransicaoDeStatus, qtdDisponivel, stockEffect } from "@/lib/stock";
import { STATUS_LIST, STATUS_META, type Status } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

export type ContratoInput = {
  anoProv: string;
  cliente: string;
  tamanhoPainel: string;
  prazo: string;
  observacoes: string;
  status?: Status;
};

function parsePrazo(prazo: string) {
  return prazo ? new Date(`${prazo}T00:00:00.000Z`) : null;
}

export async function criarContrato(input: ContratoInput): Promise<ActionResult> {
  try {
    if (!input.anoProv.trim()) return { ok: false, message: "Informe o Ano/Prov." };
    if (!input.cliente.trim()) return { ok: false, message: "Informe o nome do cliente." };

    const status: Status =
      input.status && STATUS_LIST.includes(input.status) ? input.status : "ORCAMENTO";

    const contrato = await prisma.contrato.create({
      data: {
        anoProv: input.anoProv.trim(),
        cliente: input.cliente.trim(),
        tamanhoPainel: input.tamanhoPainel.trim(),
        prazo: parsePrazo(input.prazo),
        observacoes: input.observacoes.trim(),
        status,
      },
    });

    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `Contrato ${contrato.anoProv} criado com sucesso.`,
      id: contrato.id,
    };
  } catch {
    return { ok: false, message: "Erro ao criar o contrato." };
  }
}

export async function atualizarContrato(
  id: number,
  input: Omit<ContratoInput, "status">
): Promise<ActionResult> {
  try {
    if (!input.anoProv.trim()) return { ok: false, message: "Informe o Ano/Prov." };
    if (!input.cliente.trim()) return { ok: false, message: "Informe o nome do cliente." };

    await prisma.contrato.update({
      where: { id },
      data: {
        anoProv: input.anoProv.trim(),
        cliente: input.cliente.trim(),
        tamanhoPainel: input.tamanhoPainel.trim(),
        prazo: parsePrazo(input.prazo),
        observacoes: input.observacoes.trim(),
      },
    });

    revalidatePath("/", "layout");
    return { ok: true, message: "Contrato atualizado com sucesso." };
  } catch {
    return { ok: false, message: "Erro ao atualizar o contrato." };
  }
}

export async function alterarStatus(id: number, novoStatus: Status): Promise<ActionResult> {
  try {
    if (!STATUS_LIST.includes(novoStatus)) return { ok: false, message: "Status inválido." };

    await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUniqueOrThrow({ where: { id } });
      if (contrato.status === novoStatus) return;
      await aplicarTransicaoDeStatus(tx, id, contrato.status, novoStatus);
      await tx.contrato.update({ where: { id }, data: { status: novoStatus } });
    });

    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `Status alterado para "${STATUS_META[novoStatus].label}". Estoque atualizado.`,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao alterar o status do contrato.",
    };
  }
}

export async function adicionarItem(
  contratoId: number,
  produtoId: number,
  quantidade: number
): Promise<ActionResult> {
  try {
    if (!produtoId) return { ok: false, message: "Selecione um produto do estoque." };
    if (!Number.isInteger(quantidade) || quantidade <= 0)
      return { ok: false, message: "Informe uma quantidade válida (maior que zero)." };

    await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUniqueOrThrow({ where: { id: contratoId } });
      const produto = await tx.produto.findUniqueOrThrow({ where: { id: produtoId } });
      const efeito = stockEffect(contrato.status);

      if (efeito !== "NONE") {
        const disponivel = qtdDisponivel(produto);
        if (disponivel < quantidade) {
          throw new Error(
            `Estoque insuficiente para "${produto.item}" (disponível: ${disponivel}, solicitado: ${quantidade}).`
          );
        }
        if (efeito === "RESERVE") {
          await tx.produto.update({
            where: { id: produtoId },
            data: { qtdProvisionado: { increment: quantidade } },
          });
        }
        if (efeito === "SHIP") {
          await tx.produto.update({
            where: { id: produtoId },
            data: { qtdTotal: { decrement: quantidade } },
          });
        }
      }

      await tx.contratoItem.upsert({
        where: { contratoId_produtoId: { contratoId, produtoId } },
        create: { contratoId, produtoId, quantidade },
        update: { quantidade: { increment: quantidade } },
      });
    });

    revalidatePath("/", "layout");
    return { ok: true, message: "Componente adicionado ao contrato." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao adicionar o componente.",
    };
  }
}

export async function removerItem(itemId: number): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.contratoItem.findUniqueOrThrow({
        where: { id: itemId },
        include: { contrato: true, produto: true },
      });
      const efeito = stockEffect(item.contrato.status);

      if (efeito === "RESERVE") {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: {
            qtdProvisionado: Math.max(0, item.produto.qtdProvisionado - item.quantidade),
          },
        });
      }
      if (efeito === "SHIP") {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { qtdTotal: { increment: item.quantidade } },
        });
      }

      await tx.contratoItem.delete({ where: { id: itemId } });
    });

    revalidatePath("/", "layout");
    return { ok: true, message: "Componente removido do contrato." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao remover o componente.",
    };
  }
}

export async function excluirContrato(id: number): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUniqueOrThrow({
        where: { id },
        include: { itens: { include: { produto: true } } },
      });

      if (stockEffect(contrato.status) === "RESERVE") {
        for (const item of contrato.itens) {
          await tx.produto.update({
            where: { id: item.produtoId },
            data: {
              qtdProvisionado: Math.max(0, item.produto.qtdProvisionado - item.quantidade),
            },
          });
        }
      }

      await tx.contrato.delete({ where: { id } });
    });

    revalidatePath("/", "layout");
    return { ok: true, message: "Contrato excluído. Reservas de estoque liberadas." };
  } catch {
    return { ok: false, message: "Erro ao excluir o contrato." };
  }
}
