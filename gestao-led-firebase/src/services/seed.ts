import { collection, doc, getDocs, limit, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, obterUsuario } from "@/lib/firebase";
import type { Resultado } from "./produtos";

export async function carregarDadosExemplo(): Promise<Resultado> {
  try {
    const existentes = await getDocs(query(collection(db, "produtos"), limit(1)));
    if (!existentes.empty) {
      return { ok: false, message: "O banco já possui produtos cadastrados." };
    }

    const batch = writeBatch(db);
    const usuario = obterUsuario();

    const processadoraRef = doc(collection(db, "produtos"));
    const moduloRef = doc(collection(db, "produtos"));
    const fonteRef = doc(collection(db, "produtos"));

    batch.set(processadoraRef, {
      categoria: "Processadora",
      item: "Processadora Novastar VX400",
      lote: "NV-2025-01",
      descricao: "Processadora de vídeo all-in-one Novastar VX400, capacidade 2.6MP",
      qtd_total: 8,
      qtd_manutencao: 1,
      qtd_provisionado: 1,
      valor_custo: 4800,
      valor_revenda: 7500,
      criado_em: serverTimestamp(),
    });
    batch.set(moduloRef, {
      categoria: "Módulo",
      item: "Módulo LED P2.5 Indoor",
      lote: "P25-B032",
      descricao: "Módulo P2.5 SMD2121 320x160mm, resolução 128x64px, indoor",
      qtd_total: 500,
      qtd_manutencao: 20,
      qtd_provisionado: 100,
      valor_custo: 185.5,
      valor_revenda: 320,
      criado_em: serverTimestamp(),
    });
    batch.set(fonteRef, {
      categoria: "Fonte",
      item: "Fonte Chaveada 5V 60A",
      lote: "FT60-2201",
      descricao: "Fonte 5V 60A 300W bivolt para painéis de LED",
      qtd_total: 80,
      qtd_manutencao: 4,
      qtd_provisionado: 12,
      valor_custo: 98,
      valor_revenda: 175,
      criado_em: serverTimestamp(),
    });

    const contratoRef = doc(collection(db, "contratos"));
    batch.set(contratoRef, {
      ano_prov: "2026/001",
      status: "PROVISIONADO",
      cliente: "Show Eventos Ltda",
      tamanho_painel: "4,00m x 2,00m (P2.5)",
      prazo: "2026-08-15",
      observacoes: "Palco principal. Entrega e montagem inclusas no contrato.",
      criado_em: serverTimestamp(),
      atualizado_em: serverTimestamp(),
    });

    const itens = [
      { ref: moduloRef, nome: "Módulo LED P2.5 Indoor", lote: "P25-B032", quantidade: 100 },
      { ref: fonteRef, nome: "Fonte Chaveada 5V 60A", lote: "FT60-2201", quantidade: 12 },
      { ref: processadoraRef, nome: "Processadora Novastar VX400", lote: "NV-2025-01", quantidade: 1 },
    ];

    for (const item of itens) {
      batch.set(doc(collection(db, "contrato_itens")), {
        id_contrato: contratoRef.id,
        id_produto: item.ref.id,
        quantidade: item.quantidade,
      });
      batch.set(doc(collection(db, "logs")), {
        data: serverTimestamp(),
        usuario,
        acao: "Provisionamento — Contrato 2026/001",
        detalhes: `${item.nome} (Lote ${item.lote}): -${item.quantidade}`,
      });
    }

    batch.set(doc(collection(db, "logs")), {
      data: serverTimestamp(),
      usuario,
      acao: "Carga inicial",
      detalhes: "Dados de exemplo carregados (3 produtos e 1 contrato).",
    });

    await batch.commit();
    return { ok: true, message: "Dados de exemplo carregados com sucesso." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Erro ao carregar os dados de exemplo." };
  }
}
