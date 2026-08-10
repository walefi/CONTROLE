import type {
  Ambiente,
  GabineteSpec,
  ModuloLedSpec,
  ModeloIma,
  ReceivingCardSpec,
  TecnologiaModulo,
  TipoHub,
} from "./calculadora-constants";

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
  moduloProdutoId: string | null;
  receivingProdutoId: string | null;
  fonteProdutoId: string | null;
  processadoraProdutoId: string | null;
  gabineteProdutoId: string | null;
  imaProdutoId: string | null;
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
