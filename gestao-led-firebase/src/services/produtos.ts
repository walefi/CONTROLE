import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, obterUsuario } from "@/lib/firebase";
import type { ProdutoImportado } from "@/lib/csv";
import type { ProdutoForm } from "@/lib/types";

export type Resultado = { ok: boolean; message: string };

function docLog() {
  return doc(collection(db, "logs"));
}

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

function sanitizar(input: ProdutoForm) {
  return {
    categoria: input.categoria.trim() || "Outros",
    item: input.item.trim(),
    lote: input.lote.trim(),
    descricao: input.descricao.trim(),
    qtd_total: Math.max(0, Math.trunc(Number(input.qtd_total) || 0)),
    qtd_manutencao: Math.max(0, Math.trunc(Number(input.qtd_manutencao) || 0)),
    valor_custo: Math.max(0, Number(input.valor_custo) || 0),
    valor_revenda: Math.max(0, Number(input.valor_revenda) || 0),
  };
}

export async function salvarProduto(input: ProdutoForm, id?: string): Promise<Resultado> {
  try {
    if (!input.categoria) return { ok: false, message: "Selecione a categoria do produto." };
    if (!input.item.trim()) return { ok: false, message: "Informe o nome do item." };

    const dados = sanitizar(input);
    const batch = writeBatch(db);

    if (id) {
      const ref = doc(db, "produtos", id);
      const atual = await getDoc(ref);
      if (!atual.exists()) return { ok: false, message: "Produto não encontrado." };
      const delta = dados.qtd_total - (atual.data().qtd_total ?? 0);
      batch.update(ref, dados);
      if (delta !== 0) {
        batch.set(
          docLog(),
          dadosLog(
            "Ajuste manual de estoque",
            `${dados.item} (Lote ${dados.lote || "—"}): ${delta > 0 ? "+" : ""}${delta}`,
            { id_produto: id, lote: dados.lote, quantidade_alterada: delta }
          )
        );
      }
      await batch.commit();
      return { ok: true, message: "Produto atualizado com sucesso." };
    }

    const novoRef = doc(collection(db, "produtos"));
    batch.set(novoRef, {
      ...dados,
      qtd_provisionado: 0,
      criado_em: serverTimestamp(),
    });
    if (dados.qtd_total > 0) {
      batch.set(
        docLog(),
        dadosLog(
          "Entrada manual (cadastro)",
          `${dados.item} (Lote ${dados.lote || "—"}): +${dados.qtd_total}`,
          { id_produto: novoRef.id, lote: dados.lote, quantidade_alterada: dados.qtd_total }
        )
      );
    }
    await batch.commit();
    return { ok: true, message: "Produto cadastrado com sucesso." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Erro ao salvar o produto." };
  }
}

export async function excluirProduto(id: string): Promise<Resultado> {
  try {
    const vinculos = await getDocs(
      query(collection(db, "contrato_itens"), where("id_produto", "==", id))
    );
    if (!vinculos.empty) {
      return {
        ok: false,
        message: "Produto vinculado a contratos. Remova os vínculos antes de excluir.",
      };
    }
    await deleteDoc(doc(db, "produtos", id));
    return { ok: true, message: "Produto excluído com sucesso." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Erro ao excluir o produto." };
  }
}

export type ResultadoImportacao = Resultado & { criados?: number; atualizados?: number };

export async function importarProdutos(itens: ProdutoImportado[]): Promise<ResultadoImportacao> {
  try {
    if (!itens.length) return { ok: false, message: "Nenhum item válido para importar." };
    if (itens.length > 2000) {
      return { ok: false, message: "Limite de 2000 linhas por importação excedido." };
    }

    const existentes = await getDocs(collection(db, "produtos"));
    const porLote = new Map<string, string>();
    for (const d of existentes.docs) {
      const lote = String(d.data().lote ?? "").trim().toUpperCase();
      if (lote && !porLote.has(lote)) porLote.set(lote, d.id);
    }

    let criados = 0;
    let atualizados = 0;
    let batch = writeBatch(db);
    let operacoes = 0;

    const commitSePreciso = async () => {
      if (operacoes >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        operacoes = 0;
      }
    };

    for (const item of itens) {
      const dados = {
        categoria: item.categoria.trim() || "Outros",
        item: item.item.trim() || "Item importado",
        lote: item.lote.trim(),
        descricao: item.descricao.trim(),
        qtd_total: Math.max(0, Math.trunc(item.qtdTotal)),
        qtd_manutencao: Math.max(0, Math.trunc(item.qtdManutencao)),
        qtd_provisionado: Math.max(0, Math.trunc(item.qtdProvisionado)),
        valor_custo: Math.max(0, item.valorCusto),
        valor_revenda: Math.max(0, item.valorRevenda),
      };
      const chave = dados.lote.toUpperCase();
      const idExistente = chave ? porLote.get(chave) : undefined;

      if (idExistente) {
        batch.update(doc(db, "produtos", idExistente), dados);
        atualizados++;
      } else {
        const novoRef = doc(collection(db, "produtos"));
        batch.set(novoRef, { ...dados, criado_em: serverTimestamp() });
        criados++;
        if (chave) porLote.set(chave, novoRef.id);
      }
      operacoes++;
      await commitSePreciso();
    }

    batch.set(
      docLog(),
      dadosLog(
        "Importação CSV",
        `${criados} produto(s) adicionado(s), ${atualizados} atualizado(s).`
      )
    );
    await batch.commit();

    return {
      ok: true,
      criados,
      atualizados,
      message: `Importação concluída: ${criados} produto(s) adicionado(s), ${atualizados} atualizado(s).`,
    };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Erro ao importar os produtos." };
  }
}
