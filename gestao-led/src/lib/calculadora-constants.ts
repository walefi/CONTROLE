// ============================================================
// Constantes da Calculadora de Painéis de LED
// ============================================================

// --- Tipos de Módulo de LED (pré-definidos) ---

export type ModuloLedSpec = {
  pitch: string; // ex: "P1.86"
  resolucao: { largura: number; altura: number }; // pixels
  dimensao: { largura: number; altura: number }; // mm (320x160 ou 250x250)
};

/** Módulos com dimensão física 320×160mm */
export const MODULOS_320_160: ModuloLedSpec[] = [
  { pitch: "P0.9", resolucao: { largura: 360, altura: 180 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P1.0", resolucao: { largura: 320, altura: 160 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P1.25", resolucao: { largura: 256, altura: 128 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P1.53", resolucao: { largura: 208, altura: 104 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P1.86", resolucao: { largura: 172, altura: 86 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P2.0", resolucao: { largura: 160, altura: 80 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P2.5", resolucao: { largura: 128, altura: 64 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P3.0769", resolucao: { largura: 104, altura: 52 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P4.0", resolucao: { largura: 80, altura: 40 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P5.0", resolucao: { largura: 64, altura: 32 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P6.66", resolucao: { largura: 48, altura: 24 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P8.0", resolucao: { largura: 40, altura: 20 }, dimensao: { largura: 320, altura: 160 } },
  { pitch: "P10", resolucao: { largura: 32, altura: 16 }, dimensao: { largura: 320, altura: 160 } },
];

/** Módulos com dimensão física 250×250mm */
export const MODULOS_250_250: ModuloLedSpec[] = [
  { pitch: "P2.6", resolucao: { largura: 96, altura: 96 }, dimensao: { largura: 250, altura: 250 } },
  { pitch: "P2.9", resolucao: { largura: 84, altura: 84 }, dimensao: { largura: 250, altura: 250 } },
  { pitch: "P3.9", resolucao: { largura: 64, altura: 64 }, dimensao: { largura: 250, altura: 250 } },
  { pitch: "P4.81", resolucao: { largura: 52, altura: 52 }, dimensao: { largura: 250, altura: 250 } },
  { pitch: "P5.95", resolucao: { largura: 42, altura: 42 }, dimensao: { largura: 250, altura: 250 } },
];

/** Todos os módulos */
export const TODOS_MODULOS: ModuloLedSpec[] = [...MODULOS_320_160, ...MODULOS_250_250];

// --- Tipos de Tecnologia do Módulo ---

export const TECNOLOGIAS_MODULO = ["SMD Comum", "GOB", "COB", "Mip", "MLED"] as const;
export type TecnologiaModulo = (typeof TECNOLOGIAS_MODULO)[number];

// --- Tipos de HUB ---

export const TIPOS_HUB = ["HUB75", "HUB320"] as const;
export type TipoHub = (typeof TIPOS_HUB)[number];

// --- Receiving Cards ---

export type ReceivingCardSpec = {
  modelo: string;
  portas: number;
  tipoHub: TipoHub;
  maxPixels: { largura: number; altura: number }; // capacidade máxima de pixels
};

export const RECEIVING_CARDS: ReceivingCardSpec[] = [
  { modelo: "MRV416-N", portas: 16, tipoHub: "HUB75", maxPixels: { largura: 512, altura: 512 } },
  { modelo: "MRV208-N", portas: 8, tipoHub: "HUB75", maxPixels: { largura: 512, altura: 384 } },
  { modelo: "MRV532", portas: 10, tipoHub: "HUB320", maxPixels: { largura: 512, altura: 512 } },
];

// --- Fontes de Alimentação ---

export type FonteSpec = {
  amperagem: "40A" | "60A";
};

export const FONTES: FonteSpec[] = [
  { amperagem: "40A" },
  { amperagem: "60A" },
];

/**
 * Quantos módulos cada fonte suporta.
 * Chave: `${amperagem}-${ambiente}-${dimensaoModulo}`
 */
export const MODULOS_POR_FONTE: Record<string, number> = {
  "40A-indoor-320x160": 9,
  "40A-outdoor-320x160": 4,
  "40A-indoor-250x250": 6,
  "40A-outdoor-250x250": 4,
  "60A-indoor-320x160": 12,
  "60A-outdoor-320x160": 6,
  "60A-indoor-250x250": 8,
  "60A-outdoor-250x250": 8,
};

// --- Processadoras ---

export type ProcessadoraSpec = {
  modelo: string;
  capacidade: number; // pixels
  maxLargura: number;
  maxAltura: number;
  portas: number; // portas Ethernet para receivers
};

export const PROCESSADORAS: ProcessadoraSpec[] = [
  { modelo: "TCC160", capacidade: 650_000, maxLargura: 2048, maxAltura: 2048, portas: 1 },
  { modelo: "TB10 PLUS", capacidade: 650_000, maxLargura: 2048, maxAltura: 2048, portas: 1 },
  { modelo: "TB20 PLUS", capacidade: 650_000, maxLargura: 2048, maxAltura: 2048, portas: 1 },
  { modelo: "TB30", capacidade: 650_000, maxLargura: 4096, maxAltura: 4096, portas: 1 },
  { modelo: "TB40", capacidade: 1_300_000, maxLargura: 4096, maxAltura: 4096, portas: 2 },
  { modelo: "TB50", capacidade: 1_300_000, maxLargura: 4096, maxAltura: 4096, portas: 2 },
  { modelo: "TB60", capacidade: 2_300_000, maxLargura: 4096, maxAltura: 4096, portas: 4 },
  { modelo: "MSD300", capacidade: 1_300_000, maxLargura: 3840, maxAltura: 3840, portas: 2 },
  { modelo: "MSD600", capacidade: 2_600_000, maxLargura: 3840, maxAltura: 3840, portas: 4 },
  { modelo: "VC2", capacidade: 1_300_000, maxLargura: 3840, maxAltura: 1920, portas: 2 },
  { modelo: "VC4", capacidade: 2_600_000, maxLargura: 3840, maxAltura: 1920, portas: 4 },
  { modelo: "MCTRL300", capacidade: 1_300_000, maxLargura: 3840, maxAltura: 3840, portas: 2 },
  { modelo: "MBOX600 PRO", capacidade: 2_600_000, maxLargura: 4096, maxAltura: 1920, portas: 4 },
  { modelo: "TU15 PRO", capacidade: 2_600_000, maxLargura: 4096, maxAltura: 1920, portas: 4 },
  { modelo: "TU20 PRO", capacidade: 3_900_000, maxLargura: 4096, maxAltura: 1920, portas: 6 },
  { modelo: "VX400 PRO", capacidade: 2_600_000, maxLargura: 10240, maxAltura: 8192, portas: 4 },
  { modelo: "VX600 PRO", capacidade: 3_900_000, maxLargura: 10240, maxAltura: 8192, portas: 6 },
  { modelo: "VX1000 PRO", capacidade: 6_500_000, maxLargura: 10240, maxAltura: 8192, portas: 10 },
  { modelo: "TU4K PRO", capacidade: 13_000_000, maxLargura: 16384, maxAltura: 8192, portas: 20 },
  { modelo: "VX2000 PRO", capacidade: 13_000_000, maxLargura: 16384, maxAltura: 8192, portas: 20 },
  { modelo: "VX16s", capacidade: 10_400_000, maxLargura: 16384, maxAltura: 8192, portas: 16 },
  { modelo: "H2", capacidade: 41_600_000, maxLargura: 16384, maxAltura: 16384, portas: 64 },
  { modelo: "H5", capacidade: 62_400_000, maxLargura: 16384, maxAltura: 16384, portas: 96 },
  { modelo: "H9", capacidade: 104_000_000, maxLargura: 16384, maxAltura: 16384, portas: 160 },
  { modelo: "H15", capacidade: 208_000_000, maxLargura: 16384, maxAltura: 16384, portas: 320 },
  { modelo: "H20", capacidade: 416_000_000, maxLargura: 16384, maxAltura: 16384, portas: 640 },
];

// --- Gabinetes ---

export type GabineteSpec = {
  largura: number; // mm
  altura: number; // mm
};

export const GABINETES: GabineteSpec[] = [
  { largura: 960, altura: 960 },
  { largura: 500, altura: 1000 },
  { largura: 500, altura: 500 },
  { largura: 640, altura: 480 },
  { largura: 1280, altura: 960 },
];

// --- Imãs ---

export const MODELOS_IMA = ["M3", "M4"] as const;
export type ModeloIma = (typeof MODELOS_IMA)[number];

/** Ímãs por módulo */
export const IMAS_POR_MODULO = 4;

// --- Ambiente ---

export const AMBIENTES = ["Indoor", "Outdoor"] as const;
export type Ambiente = (typeof AMBIENTES)[number];

// --- Distância máxima do cabo entre módulo e receiving card (metros) ---
export const DISTANCIA_MAXIMA_CABO = 1;
