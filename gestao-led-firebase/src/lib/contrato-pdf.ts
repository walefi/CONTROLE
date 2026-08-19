import { semAcentos } from "@/lib/csv";
import type { Produto } from "@/lib/types";

export type ItemIdentificado = {
  produtoId: string;
  item: string;
  categoria: string;
  lote: string;
  quantidade: number;
};

export type DimensoesPainel = { larguraM: number; alturaM: number };

export type ResultadoIdentificacao = {
  itens: ItemIdentificado[];
  cliente: string;
  anoProv: string;
  tamanhoPainel: string;
  dimensoes: DimensoesPainel | null;
};

/** Carrega o pdfjs sob demanda (mantém o bundle principal leve). */
async function obterPdfjs(): Promise<typeof import("pdfjs-dist")> {
  const [pdfjsLib, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjsLib;
}

/** Extrai o texto selecionável de um PDF (contratos escaneados/imagem retornam vazio). */
export async function extrairTextoPdf(arquivo: File): Promise<string> {
  const pdfjsLib = await obterPdfjs();
  const data = new Uint8Array(await arquivo.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  try {
    let texto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const pagina = await pdf.getPage(i);
      const conteudo = await pagina.getTextContent();
      for (const item of conteudo.items) {
        if (!("str" in item)) continue;
        texto += item.str;
        texto += item.hasEOL ? "\n" : " ";
      }
    }
    return texto;
  } finally {
    await loadingTask.destroy();
  }
}

function normalizar(texto: string): string {
  return semAcentos(texto).toUpperCase();
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Itens curtos (ex.: "M3") exigem fronteira de palavra para evitar falsos positivos. */
function contemAlvo(texto: string, alvo: string): boolean {
  if (alvo.length >= 5) return texto.includes(alvo);
  return new RegExp(`(^|[^A-Z0-9])${escaparRegex(alvo)}($|[^A-Z0-9])`).test(texto);
}

/** Remove preços e medidas (320x160mm, 4,00m x 2,00m, R$ 45,00) antes de procurar a quantidade. */
function limparLinhaParaQuantidade(linha: string): string {
  return linha
    .replace(/R\$\s*\d+(?:[.,]\d+)*/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*[xX×]\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m)?/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*(?:mm|cm|m\b)/g, " ")
    .replace(/\d+\s*portas?\b/gi, " ")
    .replace(/\b(?:un|und|unid|unidades?|qtd|quantidade|pç|pcs?|und\.)\b/gi, " ");
}

function inteiroDeToken(token: string): number | null {
  let t = token;
  if (t.includes(",")) return null; // decimal -> preço
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // milhar: 1.200
  const n = Number(t);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > 50000) return null;
  if (n >= 1900 && n <= 2100) return null; // ano
  return n;
}

/** Procura a quantidade em uma linha, dando preferência a números após o nome do item. */
function primeiraQuantidade(linha: string, alvo: string): number {
  const limpa = limparLinhaParaQuantidade(linha);
  const normalizada = normalizar(limpa);
  const fimAlvo = normalizada.lastIndexOf(alvo) + alvo.length;

  const antes: number[] = [];
  for (const m of limpa.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const valor = inteiroDeToken(m[0]);
    if (valor === null) continue;
    if (fimAlvo > 0 && (m.index ?? -1) < fimAlvo) {
      antes.push(valor);
      continue;
    }
    return valor;
  }
  return antes.length === 1 ? antes[0] : 0;
}

function extrairCliente(texto: string): string {
  const linha = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^(cliente|contratante|cliente\s+final)\s*[:.-]?\s*\S+/i.test(l));
  if (!linha) return "";
  return linha
    .replace(/^(cliente|contratante|cliente\s+final)\s*[:.-]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

function extrairAnoProv(texto: string): string {
  const m = texto.match(/ano\s*\/?\s*prov\s*[:.-]?\s*([^\n]{1,40})/i);
  if (!m) return "";
  return m[1].replace(/\s{2,}/g, " ").trim();
}

function parseDecimal(texto: string): number | null {
  let t = texto.replace(/\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extrairTamanhoPainel(texto: string): {
  tamanhoPainel: string;
  dimensoes: DimensoesPainel | null;
} {
  const vazio = { tamanhoPainel: "", dimensoes: null };
  let m = texto.match(/(\d+(?:[.,]\d+)?)\s*m?\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*m\b/i);
  let divisor = 1;
  if (!m) {
    m = texto.match(/(\d+(?:[.,]\d+)?)\s*mm\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*mm/i);
    divisor = 1000;
  }
  if (!m) return vazio;

  const largura = parseDecimal(m[1]);
  const altura = parseDecimal(m[2]);
  if (!largura || !altura) return vazio;
  const larguraM = largura / divisor;
  const alturaM = altura / divisor;
  // Medidas em mm precisam ser de painel real (>= 0,5m), senão capturam dimensões de módulo (320x160mm).
  if (larguraM > 100 || alturaM > 100 || (divisor === 1000 && (larguraM < 0.5 || alturaM < 0.5))) {
    return vazio;
  }

  const fmt = (n: number) => String(n).replace(".", ",");
  return {
    tamanhoPainel: `${fmt(larguraM)}m x ${fmt(alturaM)}m`,
    dimensoes: { larguraM, alturaM },
  };
}

/**
 * Identifica no texto do contrato quais produtos do estoque estão sendo vendidos,
 * tentando extrair a quantidade de cada um a partir da linha em que aparece.
 */
export function identificarItensDoContrato(
  texto: string,
  produtos: Produto[]
): ResultadoIdentificacao {
  const linhas = texto.split(/\r?\n/);
  const textoNormalizado = normalizar(texto);
  const itens: ItemIdentificado[] = [];

  for (const produto of produtos) {
    const alvo = normalizar(produto.item).trim();
    if (!alvo) continue;
    if (!contemAlvo(textoNormalizado, alvo)) continue;

    let quantidade = 0;
    for (const linha of linhas) {
      if (!contemAlvo(normalizar(linha), alvo)) continue;
      const q = primeiraQuantidade(linha, alvo);
      if (q > quantidade) quantidade = q;
    }

    itens.push({
      produtoId: produto.id,
      item: produto.item,
      categoria: produto.categoria,
      lote: produto.lote,
      quantidade,
    });
  }

  return {
    itens,
    cliente: extrairCliente(texto),
    anoProv: extrairAnoProv(texto),
    ...extrairTamanhoPainel(texto),
  };
}