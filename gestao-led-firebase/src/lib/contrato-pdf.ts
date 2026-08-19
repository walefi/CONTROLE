import { semAcentos } from "@/lib/csv";

export type ItemIdentificado = {
  produtoId: string;
  item: string;
  categoria: string;
  lote: string;
  quantidade: number;
};

export type DimensoesPainel = { larguraM: number; alturaM: number };

export type LinhaContrato = {
  nome: string;
  quantidade: number;
  valor: number | null;
};

export type ResultadoIdentificacao = {
  linhas: LinhaContrato[];
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

function parseDecimal(texto: string): number | null {
  let t = texto.replace(/\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
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

/** Linhas que não são itens da tabela (totais, rodapés, campos do contrato). */
const PREFIXOS_IGNORADOS =
  /^(?:PAGINA?|PAGE|TOTAL|SUBTOTAL|SUB\s+TOTAL|OBSERVACOES?|OBS|PRAZO|GARANTIA|VALIDADE|ENTREGA|DATA|ENDERECO?|CNPJ|CEP|TELEFONE|CONDICOES|CONDIÇÕES|FORMA\s+DE\s+PAGAMENTO|PAGAMENTO|ASSINATURA|RESPONS[ÁA]VEL|FATURAMENTO|ANO|PAINEL)/i;

type TokenNumerico = { indice: number; texto: string; inteiro: number | null };

function tokensNumericos(linha: string): TokenNumerico[] {
  const tokens: TokenNumerico[] = [];
  for (const m of linha.matchAll(/\d+(?:[.,]\d+)*/g)) {
    tokens.push({ indice: m.index ?? -1, texto: m[0], inteiro: inteiroDeToken(m[0]) });
  }
  return tokens;
}

/**
 * Interpreta uma linha da tabela ITEM/QTD/VALOR.
 * A quantidade é o último inteiro que não faz parte do nome (M3, 40A, MRV416-N) nem de um preço (R$ 45).
 */
function parseLinhaTabela(linha: string): LinhaContrato | null {
  const tokens = tokensNumericos(linha);
  if (tokens.length === 0) return null;

  let qtdIdx = -1;
  let qtdValor = 0;
  for (const t of tokens) {
    if (t.inteiro === null) continue;
    const antes = linha.slice(0, t.indice);
    if (/[A-Za-zÀ-ÿ]$/.test(antes)) continue; // parte de um nome (M3, 40A, MRV416)
    if (/R\$\s*$/i.test(antes)) continue; // parte de um preço sem centavos
    qtdIdx = t.indice;
    qtdValor = t.inteiro;
  }
  if (qtdIdx < 0) return null;

  // Valor unitário: primeiro decimal (com vírgula) depois da quantidade; senão um "R$ ..." explícito.
  let valor: number | null = null;
  for (const t of tokens) {
    if (t.indice <= qtdIdx || !t.texto.includes(",")) continue;
    valor = parseDecimal(t.texto);
    break;
  }
  if (valor === null) {
    const m = linha.slice(qtdIdx).match(/R\$\s*(\d+(?:[.,]\d+)*)/i);
    if (m) valor = parseDecimal(m[1]);
  }

  const nome = linha
    .slice(0, qtdIdx)
    .replace(/[|:;–—]+/g, " ") // separadores de célula (hífen "-" é parte de nomes como MRV416-N)
    .replace(/^[\d.]+\s+/, "") // número de linha ("1 Módulo ...")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!nome) return null;

  return { nome: nome.slice(0, 150), quantidade: qtdValor, valor };
}

/**
 * Extrai as linhas da tabela de itens do contrato (colunas ITEM/QTD/VALOR).
 * Retorna todos os componentes listados, sem tentar casar com o estoque —
 * o vínculo com o item de estoque é escolhido pelo usuário.
 */
export function extrairTabelaContrato(texto: string): LinhaContrato[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim());
  const idxCabecalho = linhas.findIndex((l) => {
    const n = normalizar(l);
    return n.includes("ITEM") && (n.includes("QTD") || n.includes("QUANTIDADE"));
  });
  if (idxCabecalho < 0) return [];

  const itens: LinhaContrato[] = [];
  for (let i = idxCabecalho + 1; i < linhas.length && itens.length < 200; i++) {
    const linha = linhas[i];
    if (!linha) continue;
    const n = normalizar(linha);
    if (n.includes("ITEM") && (n.includes("QTD") || n.includes("VALOR"))) continue; // cabeçalho repetido
    if (PREFIXOS_IGNORADOS.test(linha)) continue;
    const item = parseLinhaTabela(linha);
    if (item) itens.push(item);
  }
  return itens;
}

/** Pontua (0..1) o quanto um item do estoque se parece com o nome do componente no contrato. */
export function pontuacaoItemEstoque(nomeContrato: string, itemEstoque: string): number {
  const alvo = normalizar(itemEstoque).trim();
  const nome = normalizar(nomeContrato);
  if (!alvo || !nome) return 0;
  const tokens = alvo.split(/[^A-Z0-9]+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return 0;
  let acertos = 0;
  for (const t of tokens) {
    if (nome.includes(t)) acertos++;
  }
  return acertos / tokens.length;
}

export async function extrairTudoDoContrato(arquivo: File): Promise<ResultadoIdentificacao> {
  const texto = await extrairTextoPdf(arquivo);
  return {
    linhas: extrairTabelaContrato(texto),
    cliente: extrairCliente(texto),
    anoProv: extrairAnoProv(texto),
    ...extrairTamanhoPainel(texto),
  };
}
