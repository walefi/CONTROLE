import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db, obterUsuario } from "@/lib/firebase";
import { STATUS_LIST, STATUS_META, type Status } from "@/lib/constants";
import { calcularTransicao, stockEffect } from "@/lib/stock";
import { qtdDisponivel, type Contrato, type ContratoForm, type Produto } from "@/lib/types";
import type { ConfigCalculadoraContrato } from "@/lib/types-calculadora";
import type { Resultado } from "./produtos";

export type ResultadoContrato = Resultado & { id?: string };

function dadosLog(
  acao: string,
  detalhes: string,
  extras?: { id_produto?: string; lote?: string; quantidade_alterada?: number }
) {
  return {
    data: serverTimestamp(),
    usuario: obterUsuario(),
    acao,
    detalhes,
    ...extras,
  };
}

async function buscarItens(contratoId: string) {
  const snap = await getDocs(
    query(collection(db, "contrato_itens"), where("id_contrato", "==", contratoId))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    id_produto: String(d.data().id_produto),
    quantidade: Number(d.data().quantidade) || 0,
  }));
}

export async function criarContrato(input: ContratoForm): Promise<ResultadoContrato> {
  try {
    if (!input.ano_prov.trim()) return { ok: false, message: "Informe o Ano/Prov." };
    if (!input.cliente.trim()) return { ok: false, message: "Informe o nome do cliente." };
    const status: Status =
      input.status && STATUS_LIST.includes(input.status) ? input.status : "ORCAMENTO";

    const ref = await addDoc(collection(db, "contratos"), {
      ano_prov: input.ano_prov.trim(),
      cliente: input.cliente.trim(),
      tamanho_painel: input.tamanho_painel.trim(),
      prazo: input.prazo,
      observacoes: input.observacoes.trim(),
      status,
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp(),
    });
    await addDoc(
      collection(db, "logs"),
      dadosLog("Contrato criado", `Contrato ${input.ano_prov.trim()} — ${input.cliente.trim()}`)
    );
    return { ok: true, message: `Contrato ${input.ano_prov.trim()} criado com sucesso.`, id: ref.id };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Erro ao criar o contrato." };
  }
}

export async function atualizarContrato(
  id: string,
  input: Omit<ContratoForm, "status">
): Promise<Resultado> {
  try {
    if (!input.ano_prov.trim()) return { ok: false, message: "Informe o Ano/Prov." };
    if (!input.cliente.trim()) return { ok: false, message: "Informe o nome do cliente." };
    await runTransaction(db, async (trx) => {
      const ref = doc(db, "contratos", id);
      const snap = await trx.get(ref);
      if (!snap.exists()) throw new Error("Contrato não encontrado.");
      trx.update(ref, {
        ano_prov: input.ano_prov.trim(),
        cliente: input.cliente.trim(),
        tamanho_painel: input.tamanho_painel.trim(),
        prazo: input.prazo,
        observacoes: input.observacoes.trim(),
        atualizado_em: serverTimestamp(),
      });
    });
    return { ok: true, message: "Contrato atualizado com sucesso." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Erro ao atualizar o contrato." };
  }
}

export async function alterarStatus(contratoId: string, novoStatus: Status): Promise<Resultado> {
  try {
    if (!STATUS_LIST.includes(novoStatus)) return { ok: false, message: "Status inválido." };
    const itens = await buscarItens(contratoId);

    await runTransaction(db, async (trx) => {
      const contratoRef = doc(db, "contratos", contratoId);
      const contratoSnap = await trx.get(contratoRef);
      if (!contratoSnap.exists()) throw new Error("Contrato não encontrado.");
      const contrato = contratoSnap.data() as Contrato;
      if (contrato.status === novoStatus) return;

      const leituras: { itemId: string; quantidade: number; produto: Produto; ref: ReturnType<typeof doc> }[] = [];
      for (const item of itens) {
        const produtoRef = doc(db, "produtos", item.id_produto);
        const produtoSnap = await trx.get(produtoRef);
        if (!produtoSnap.exists()) continue;
        leituras.push({
          itemId: item.id,
          quantidade: item.quantidade,
          produto: { id: produtoSnap.id, ...produtoSnap.data() } as Produto,
          ref: produtoRef,
        });
      }

      for (const leitura of leituras) {
        const resultado = calcularTransicao(
          leitura.produto,
          leitura.quantidade,
          contrato.status,
          novoStatus,
          contrato.ano_prov
        );
        trx.update(leitura.ref, {
          qtd_total: resultado.qtd_total,
          qtd_provisionado: resultado.qtd_provisionado,
        });
        for (const log of resultado.logs) {
          trx.set(
            doc(collection(db, "logs")),
            dadosLog(
              log.acao,
              `${leitura.produto.item} (Lote ${leitura.produto.lote || "—"}): ${log.quantidade > 0 ? "+" : ""}${log.quantidade}`,
              {
                id_produto: leitura.produto.id,
                lote: leitura.produto.lote,
                quantidade_alterada: log.quantidade,
              }
            )
          );
        }
      }

      trx.update(contratoRef, { status: novoStatus, atualizado_em: serverTimestamp() });
    });

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
  contratoId: string,
  produtoId: string,
  quantidade: number
): Promise<Resultado> {
  try {
    if (!produtoId) return { ok: false, message: "Selecione um produto do estoque." };
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return { ok: false, message: "Informe uma quantidade válida (maior que zero)." };
    }

    const existentes = await getDocs(
      query(
        collection(db, "contrato_itens"),
        where("id_contrato", "==", contratoId),
        where("id_produto", "==", produtoId)
      )
    );
    const itemExistenteRef = existentes.empty ? null : existentes.docs[0].ref;

    await runTransaction(db, async (trx) => {
      const contratoRef = doc(db, "contratos", contratoId);
      const produtoRef = doc(db, "produtos", produtoId);
      const [contratoSnap, produtoSnap] = [await trx.get(contratoRef), await trx.get(produtoRef)];
      if (!contratoSnap.exists()) throw new Error("Contrato não encontrado.");
      if (!produtoSnap.exists()) throw new Error("Produto não encontrado.");

      const itemSnap = itemExistenteRef ? await trx.get(itemExistenteRef) : null;

      const contrato = contratoSnap.data() as Contrato;
      const produto = { id: produtoSnap.id, ...produtoSnap.data() } as Produto;
      const efeito = stockEffect(contrato.status);

      if (efeito !== "NONE") {
        const disponivel = qtdDisponivel(produto);
        if (disponivel < quantidade) {
          throw new Error(
            `Estoque insuficiente para "${produto.item}" (disponível: ${disponivel}, solicitado: ${quantidade}).`
          );
        }
        if (efeito === "RESERVE") {
          trx.update(produtoRef, { qtd_provisionado: produto.qtd_provisionado + quantidade });
          trx.set(
            doc(collection(db, "logs")),
            dadosLog(
              `Provisionamento — Contrato ${contrato.ano_prov}`,
              `${produto.item} (Lote ${produto.lote || "—"}): -${quantidade}`,
              { id_produto: produto.id, lote: produto.lote, quantidade_alterada: -quantidade }
            )
          );
        }
        if (efeito === "SHIP") {
          trx.update(produtoRef, { qtd_total: produto.qtd_total - quantidade });
          trx.set(
            doc(collection(db, "logs")),
            dadosLog(
              `Baixa por Contrato ${contrato.ano_prov}`,
              `${produto.item} (Lote ${produto.lote || "—"}): -${quantidade}`,
              { id_produto: produto.id, lote: produto.lote, quantidade_alterada: -quantidade }
            )
          );
        }
      }

      if (itemExistenteRef && itemSnap?.exists()) {
        trx.update(itemExistenteRef, {
          quantidade: (Number(itemSnap.data().quantidade) || 0) + quantidade,
        });
      } else {
        trx.set(doc(collection(db, "contrato_itens")), {
          id_contrato: contratoId,
          id_produto: produtoId,
          quantidade,
        });
      }
    });

    return { ok: true, message: "Componente adicionado ao contrato." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao adicionar o componente.",
    };
  }
}

export async function removerItem(itemId: string): Promise<Resultado> {
  try {
    await runTransaction(db, async (trx) => {
      const itemRef = doc(db, "contrato_itens", itemId);
      const itemSnap = await trx.get(itemRef);
      if (!itemSnap.exists()) throw new Error("Item não encontrado.");
      const item = itemSnap.data();
      const quantidade = Number(item.quantidade) || 0;

      const contratoSnap = await trx.get(doc(db, "contratos", String(item.id_contrato)));
      const produtoRef = doc(db, "produtos", String(item.id_produto));
      const produtoSnap = await trx.get(produtoRef);

      if (contratoSnap.exists() && produtoSnap.exists()) {
        const contrato = contratoSnap.data() as Contrato;
        const produto = { id: produtoSnap.id, ...produtoSnap.data() } as Produto;
        const efeito = stockEffect(contrato.status);
        if (efeito === "RESERVE") {
          trx.update(produtoRef, {
            qtd_provisionado: Math.max(0, produto.qtd_provisionado - quantidade),
          });
          trx.set(
            doc(collection(db, "logs")),
            dadosLog(
              `Liberação de reserva — Contrato ${contrato.ano_prov} (item removido)`,
              `${produto.item} (Lote ${produto.lote || "—"}): +${quantidade}`,
              { id_produto: produto.id, lote: produto.lote, quantidade_alterada: quantidade }
            )
          );
        }
        if (efeito === "SHIP") {
          trx.update(produtoRef, { qtd_total: produto.qtd_total + quantidade });
          trx.set(
            doc(collection(db, "logs")),
            dadosLog(
              `Estorno de baixa — Contrato ${contrato.ano_prov} (item removido)`,
              `${produto.item} (Lote ${produto.lote || "—"}): +${quantidade}`,
              { id_produto: produto.id, lote: produto.lote, quantidade_alterada: quantidade }
            )
          );
        }
      }

      trx.delete(itemRef);
    });
    return { ok: true, message: "Componente removido do contrato." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao remover o componente.",
    };
  }
}

export async function excluirContrato(contratoId: string): Promise<Resultado> {
  try {
    const itens = await buscarItens(contratoId);

    await runTransaction(db, async (trx) => {
      const contratoRef = doc(db, "contratos", contratoId);
      const contratoSnap = await trx.get(contratoRef);
      if (!contratoSnap.exists()) throw new Error("Contrato não encontrado.");
      const contrato = contratoSnap.data() as Contrato;
      const efeito = stockEffect(contrato.status);

      const leituras: { produto: Produto; quantidade: number; ref: ReturnType<typeof doc> }[] = [];
      if (efeito === "RESERVE") {
        for (const item of itens) {
          const produtoRef = doc(db, "produtos", item.id_produto);
          const produtoSnap = await trx.get(produtoRef);
          if (!produtoSnap.exists()) continue;
          leituras.push({
            produto: { id: produtoSnap.id, ...produtoSnap.data() } as Produto,
            quantidade: item.quantidade,
            ref: produtoRef,
          });
        }
      }

      for (const leitura of leituras) {
        trx.update(leitura.ref, {
          qtd_provisionado: Math.max(0, leitura.produto.qtd_provisionado - leitura.quantidade),
        });
        trx.set(
          doc(collection(db, "logs")),
          dadosLog(
            `Liberação de reserva — Contrato ${contrato.ano_prov} (contrato excluído)`,
            `${leitura.produto.item} (Lote ${leitura.produto.lote || "—"}): +${leitura.quantidade}`,
            {
              id_produto: leitura.produto.id,
              lote: leitura.produto.lote,
              quantidade_alterada: leitura.quantidade,
            }
          )
        );
      }

      for (const item of itens) {
        trx.delete(doc(db, "contrato_itens", item.id));
      }
      trx.delete(contratoRef);
      trx.set(
        doc(collection(db, "logs")),
        dadosLog("Contrato excluído", `Contrato ${contrato.ano_prov} — ${contrato.cliente}`)
      );
    });

    return { ok: true, message: "Contrato excluído. Reservas de estoque liberadas." };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao excluir o contrato.",
    };
  }
}

export type AlteracaoLoteItem = { itemId: string; novoProdutoId: string };

export async function salvarPlanejamentoContrato(
  contratoId: string,
  alteracoes: AlteracaoLoteItem[],
  config: ConfigCalculadoraContrato | null
): Promise<Resultado> {
  if (alteracoes.length === 0 && !config) return { ok: true, message: "Nada para salvar." };

  try {
    const itensContrato = await getDocs(
      query(collection(db, "contrato_itens"), where("id_contrato", "==", contratoId))
    );

    const atualizados = await runTransaction(db, async (trx) => {
      const contratoRef = doc(db, "contratos", contratoId);
      const contratoSnap = await trx.get(contratoRef);
      if (!contratoSnap.exists()) throw new Error("Contrato não encontrado.");
      const contrato = contratoSnap.data() as Contrato;
      const efeito = stockEffect(contrato.status);

      const leituras: {
        itemRef: ReturnType<typeof doc>;
        quantidade: number;
        antigoRef: ReturnType<typeof doc>;
        antigo: Produto | null;
        novoRef: ReturnType<typeof doc>;
        novo: Produto;
        mergeRef: ReturnType<typeof doc> | null;
        mergeQuantidade: number;
      }[] = [];

      for (const alteracao of alteracoes) {
        const itemRef = doc(db, "contrato_itens", alteracao.itemId);
        const itemSnap = await trx.get(itemRef);
        if (!itemSnap.exists()) continue;
        const item = itemSnap.data();
        const quantidade = Number(item.quantidade) || 0;
        if (String(item.id_produto) === alteracao.novoProdutoId) continue;

        const novoRef = doc(db, "produtos", alteracao.novoProdutoId);
        const novoSnap = await trx.get(novoRef);
        if (!novoSnap.exists()) throw new Error("Produto não encontrado.");
        const novo = { id: novoSnap.id, ...novoSnap.data() } as Produto;

        const antigoRef = doc(db, "produtos", String(item.id_produto));
        const antigoSnap = await trx.get(antigoRef);
        const antigo = antigoSnap.exists()
          ? ({ id: antigoSnap.id, ...antigoSnap.data() } as Produto)
          : null;

        let mergeRef: ReturnType<typeof doc> | null = null;
        let mergeQuantidade = 0;
        const mergeItem = itensContrato.docs.find(
          (d) =>
            d.id !== alteracao.itemId &&
            String(d.data().id_produto) === alteracao.novoProdutoId
        );
        if (mergeItem) {
          const mergeSnap = await trx.get(mergeItem.ref);
          if (mergeSnap.exists()) {
            mergeRef = mergeItem.ref;
            mergeQuantidade = Number(mergeSnap.data().quantidade) || 0;
          }
        }

        leituras.push({ itemRef, quantidade, antigoRef, antigo, novoRef, novo, mergeRef, mergeQuantidade });
      }

      let atualizados = 0;
      for (const leitura of leituras) {
        if (efeito !== "NONE") {
          const disponivel = qtdDisponivel(leitura.novo);
          if (disponivel < leitura.quantidade) {
            throw new Error(
              `Estoque insuficiente para "${leitura.novo.item}" (disponível: ${disponivel}, solicitado: ${leitura.quantidade}).`
            );
          }
        }

        if (leitura.antigo) {
          if (efeito === "RESERVE") {
            trx.update(leitura.antigoRef, {
              qtd_provisionado: Math.max(0, leitura.antigo.qtd_provisionado - leitura.quantidade),
            });
            trx.set(
              doc(collection(db, "logs")),
              dadosLog(
                `Liberação de reserva — Contrato ${contrato.ano_prov} (troca de lote)`,
                `${leitura.antigo.item} (Lote ${leitura.antigo.lote || "—"}): +${leitura.quantidade}`,
                {
                  id_produto: leitura.antigo.id,
                  lote: leitura.antigo.lote,
                  quantidade_alterada: leitura.quantidade,
                }
              )
            );
          }
          if (efeito === "SHIP") {
            trx.update(leitura.antigoRef, { qtd_total: leitura.antigo.qtd_total + leitura.quantidade });
            trx.set(
              doc(collection(db, "logs")),
              dadosLog(
                `Estorno de baixa — Contrato ${contrato.ano_prov} (troca de lote)`,
                `${leitura.antigo.item} (Lote ${leitura.antigo.lote || "—"}): +${leitura.quantidade}`,
                {
                  id_produto: leitura.antigo.id,
                  lote: leitura.antigo.lote,
                  quantidade_alterada: leitura.quantidade,
                }
              )
            );
          }
        }

        if (efeito === "RESERVE") {
          trx.update(leitura.novoRef, {
            qtd_provisionado: leitura.novo.qtd_provisionado + leitura.quantidade,
          });
          trx.set(
            doc(collection(db, "logs")),
            dadosLog(
              `Provisionamento — Contrato ${contrato.ano_prov} (troca de lote)`,
              `${leitura.novo.item} (Lote ${leitura.novo.lote || "—"}): -${leitura.quantidade}`,
              {
                id_produto: leitura.novo.id,
                lote: leitura.novo.lote,
                quantidade_alterada: -leitura.quantidade,
              }
            )
          );
        }
        if (efeito === "SHIP") {
          trx.update(leitura.novoRef, { qtd_total: leitura.novo.qtd_total - leitura.quantidade });
          trx.set(
            doc(collection(db, "logs")),
            dadosLog(
              `Baixa por Contrato ${contrato.ano_prov} (troca de lote)`,
              `${leitura.novo.item} (Lote ${leitura.novo.lote || "—"}): -${leitura.quantidade}`,
              {
                id_produto: leitura.novo.id,
                lote: leitura.novo.lote,
                quantidade_alterada: -leitura.quantidade,
              }
            )
          );
        }

        if (leitura.mergeRef) {
          trx.update(leitura.mergeRef, {
            quantidade: leitura.mergeQuantidade + leitura.quantidade,
          });
          trx.delete(leitura.itemRef);
        } else {
          trx.update(leitura.itemRef, { id_produto: leitura.novo.id });
        }
        atualizados++;
      }

      trx.update(contratoRef, {
        ...(config ? { config_calculadora: config } : {}),
        atualizado_em: serverTimestamp(),
      });

      return atualizados;
    });

    return { ok: true, message: `Planejamento salvo: ${atualizados} lote(s) atualizado(s).` };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao salvar o planejamento.",
    };
  }
}
