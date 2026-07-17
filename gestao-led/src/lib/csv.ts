export const CAMPOS_IMPORTACAO = [
  "categoria",
  "lote",
  "descricao",
  "qtdTotal",
  "qtdManutencao",
  "qtdProvisionado",
  "valorCusto",
  "valorRevenda",
] as const;

export type CampoImportacao = (typeof CAMPOS_IMPORTACAO)[number];

export type ProdutoImportado = {
  categoria: string;
  item: string;
  lote: string;
  descricao: string;
  qtdTotal: number;
  qtdManutencao: number;
  qtdProvisionado: number;
  valorCusto: number;
  valorRevenda: number;
};

export type ResultadoCsv = {
  produtos: ProdutoImportado[];
  ignoradas: number;
  colunas: Record<CampoImportacao, string | null>;
};

export const CAMPO_LABEL: Record<CampoImportacao, string> = {
  categoria: "Categoria",
  lote: "Lote",
  descricao: "Descrição",
  qtdTotal: "Qtd Total",
  qtdManutencao: "Qtd Manutenção",
  qtdProvisionado: "Qtd Provisionado",
  valorCusto: "Valor Custo",
  valorRevenda: "Valor Revenda",
};

const CANDIDATOS: Record<CampoImportacao, string[]> = {
  qtdManutencao: ["MANUTENCAO", "QTD MANUTENCAO", "MANUT"],
  qtdProvisionado: ["PROVISIONADO", "QTD PROVISIONADO", "PROVISAO", "PROV"],
  qtdTotal: ["QTD TOTAL", "QUANTIDADE TOTAL", "QTD", "ESTOQUE", "TOTAL"],
  valorRevenda: ["REVENDA", "VALOR REVENDA", "VL REVENDA", "VALOR VENDA", "VENDA"],
  valorCusto: ["VALOR UNIT", "VALOR UNITARIO", "VALOR CUSTO", "CUSTO", "VL UNIT"],
  categoria: ["ITEM", "CATEGORIA", "TIPO"],
  lote: ["LOTE"],
  descricao: ["DESCRICAO", "PRODUTO", "DESC"],
};

export function semAcentos(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizarHeader(header: string) {
  return semAcentos(header)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function decodificarCsv(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("windows-1252").decode(buffer);
}

function detectarDelimitador(linha: string) {
  const contar = (ch: string) => linha.split(ch).length - 1;
  const pv = contar(";");
  const virgula = contar(",");
  const tab = contar("\t");
  if (pv >= virgula && pv >= tab) return ";";
  if (tab > virgula) return "\t";
  return ",";
}

export function parseCsv(texto: string): string[][] {
  const limpo = texto.replace(/^\uFEFF/, "");
  const primeiraLinha = limpo.split(/\r?\n/, 1)[0] ?? "";
  const delimitador = detectarDelimitador(primeiraLinha);

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let dentroDeAspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === delimitador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((celula) => celula.trim() !== ""));
}

export function parseInteiro(texto: string): number {
  const limpo = String(texto ?? "").replace(/[^\d-]/g, "");
  const n = parseInt(limpo, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function parseValor(texto: string): number {
  let t = String(texto ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .trim();
  if (!t) return 0;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  const n = parseFloat(t.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function normalizarCategoria(texto: string): string {
  const t = semAcentos(String(texto ?? "")).toUpperCase();
  if (t.includes("MODULO")) return "Módulo";
  if (t.includes("FONTE")) return "Fonte";
  if (t.includes("PROCESSADOR")) return "Processadora";
  if (t.includes("RECEIV") || t.includes("RECEPTOR")) return "Receiver";
  if (t.includes("GABINETE")) return "Gabinete";
  return "Outros";
}

function mapearColunas(headers: string[]) {
  const normalizados = headers.map(normalizarHeader);
  const usados = new Set<number>();
  const indices = {} as Record<CampoImportacao, number>;
  const colunas = {} as Record<CampoImportacao, string | null>;

  for (const campo of Object.keys(CANDIDATOS) as CampoImportacao[]) {
    let achado = -1;
    for (const candidato of CANDIDATOS[campo]) {
      achado = normalizados.findIndex((h, i) => !usados.has(i) && h === candidato);
      if (achado >= 0) break;
    }
    if (achado < 0) {
      for (const candidato of CANDIDATOS[campo]) {
        achado = normalizados.findIndex(
          (h, i) => !usados.has(i) && h.includes(candidato)
        );
        if (achado >= 0) break;
      }
    }
    if (achado >= 0) {
      usados.add(achado);
      indices[campo] = achado;
      colunas[campo] = headers[achado].trim();
    } else {
      indices[campo] = -1;
      colunas[campo] = null;
    }
  }

  return { indices, colunas };
}

export function lerCsvProdutos(texto: string): ResultadoCsv {
  const matriz = parseCsv(texto);
  if (matriz.length < 2) {
    throw new Error(
      "O arquivo precisa ter uma linha de cabeçalho e ao menos uma linha de dados."
    );
  }

  const [cabecalho, ...linhas] = matriz;
  const { indices, colunas } = mapearColunas(cabecalho);
  const encontradas = Object.values(colunas).filter(Boolean).length;
  if (encontradas < 2) {
    throw new Error(
      "Não foi possível identificar as colunas do CSV. Esperado: ITEM, LOTE, DESCRIÇÃO, QTD TOTAL, MANUTENÇÃO, PROVISIONADO, Valor Unit, REVENDA."
    );
  }

  const assinaturaCabecalho = cabecalho.map(normalizarHeader).join("|");
  const produtos: ProdutoImportado[] = [];
  let ignoradas = 0;

  for (const linha of linhas) {
    if (linha.map(normalizarHeader).join("|") === assinaturaCabecalho) {
      ignoradas++;
      continue;
    }
    const valorDe = (campo: CampoImportacao) =>
      indices[campo] >= 0 ? (linha[indices[campo]] ?? "").trim() : "";

    const categoriaBruta = valorDe("categoria");
    const lote = valorDe("lote");
    const descricao = valorDe("descricao");

    if (!categoriaBruta && !lote && !descricao) {
      ignoradas++;
      continue;
    }

    produtos.push({
      categoria: normalizarCategoria(categoriaBruta),
      item:
        descricao ||
        [categoriaBruta, lote].filter(Boolean).join(" ") ||
        "Item importado",
      lote,
      descricao,
      qtdTotal: parseInteiro(valorDe("qtdTotal")),
      qtdManutencao: parseInteiro(valorDe("qtdManutencao")),
      qtdProvisionado: parseInteiro(valorDe("qtdProvisionado")),
      valorCusto: parseValor(valorDe("valorCusto")),
      valorRevenda: parseValor(valorDe("valorRevenda")),
    });
  }

  return { produtos, ignoradas, colunas };
}
