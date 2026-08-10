import type { Status } from "./constants";
import type {
  Ambiente,
  GabineteSpec,
  ModuloLedSpec,
  ModeloIma,
  ReceivingCardSpec,
  TecnologiaModulo,
  TipoHub,
} from "./calculadora-constants";

export type ActionResult = { ok: boolean; message: string; id?: number };

export type ProdutoRow = {
  id: number;
  categoria: string;
  item: string;
  lote: string;
  descricao: string;
  qtdTotal: number;
  qtdManutencao: number;
  qtdProvisionado: number;
  qtdDisponivel: number;
  valorCusto: number;
  valorRevenda: number;
};

export type ContratoCard = {
  id: number;
  anoProv: string;
  status: Status;
  cliente: string;
  tamanhoPainel: string;
  prazo: Date | null;
  totalItens: number;
  valorTotal: number;
};

export type ItemContratoRow = {
  id: number;
  produtoId: number;
  quantidade: number;
  produto: {
    item: string;
    categoria: string;
    lote: string;
    valorRevenda: number;
    qtdDisponivel: number;
  };
};

export type TipoPainel = "personalizado" | "gabinete";

export type CascadeGroup = {
  receivers: number;
  cascadeCount: number;
};

export type CalculadoraConfig = {
  larguraM: number;
  alturaM: number;
  tipoPainel: TipoPainel;
  gabinete: GabineteSpec | null;
  modulo: ModuloLedSpec;
  tecnologia: TecnologiaModulo;
  tipoHub: TipoHub;
  cascatear: boolean;
  cascadeGroups: CascadeGroup[];
  receivingCard: ReceivingCardSpec;
  ambiente: Ambiente;
  fonteAmperagem: "40A" | "60A";
  modeloIma: ModeloIma;
  moduloProdutoId: number | null;
  receivingProdutoId: number | null;
  fonteProdutoId: number | null;
  processadoraProdutoId: number | null;
  gabineteProdutoId: number | null;
  imaProdutoId: number | null;
};

export type CalculadoraResult = {
  larguraMm: number;
  alturaMm: number;
  totalPixels: { largura: number; altura: number };
  modulosHorizontais: number;
  modulosVerticais: number;
  totalModulos: number;
  modulosPorGabineteH: number;
  modulosPorGabineteV: number;
  modulosPorGabinete: number;
  gabinetesHorizontais: number;
  gabinetesVerticais: number;
  totalGabinetes: number;
  totalReceivingCards: number;
  pixelsPorReceiving: { largura: number; altura: number };
  totalFontes: number;
  modulosPorFonte: number;
  totalImas: number;
  totalProcessadoras: number;
  custoUnitario: Record<string, number>;
  custoTotal: Record<string, number>;
  custoTotalGeral: number;
};
