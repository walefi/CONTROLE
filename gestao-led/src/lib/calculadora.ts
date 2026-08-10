import {
  DISTANCIA_MAXIMA_CABO,
  IMAS_POR_MODULO,
  MODULOS_POR_FONTE,
  PROCESSADORAS,
  type ReceivingCardSpec,
} from "./calculadora-constants";
import type { CalculadoraConfig, CalculadoraResult } from "./types";

function moduloDimensaoKey(config: CalculadoraConfig): string {
  const { largura, altura } = config.modulo.dimensao;
  return `${largura}x${altura}`;
}

function modulosPorFonte(config: CalculadoraConfig): number {
  const chave = `${config.fonteAmperagem}-${config.ambiente.toLowerCase()}-${moduloDimensaoKey(config)}`;
  return MODULOS_POR_FONTE[chave] ?? 1;
}

function calcModulosNoPainel(
  larguraMm: number,
  alturaMm: number,
  modW: number,
  modH: number,
) {
  const h = Math.ceil(larguraMm / modW);
  const v = Math.ceil(alturaMm / modH);
  return { horizontais: h, verticais: v, total: h * v };
}

function calcModulosPorGabinete(
  gabW: number,
  gabH: number,
  modW: number,
  modH: number,
) {
  const h = Math.floor(gabW / modW);
  const v = Math.floor(gabH / modH);
  return { h, v, total: h * v };
}

function calcGabinetes(
  modulosH: number,
  modulosV: number,
  mpcH: number,
  mpcV: number,
) {
  const h = Math.ceil(modulosH / mpcH);
  const v = Math.ceil(modulosV / mpcV);
  return { horizontais: h, verticais: v, total: h * v };
}

function calcReceivingCards(
  modulos: number,
  cascadeCount: number,
  portsPerCard: number,
) {
  const modulosPorPorta = 1 + cascadeCount;
  const portasNecessarias = Math.ceil(modulos / modulosPorPorta);
  const receivers = Math.ceil(portasNecessarias / portsPerCard);
  return receivers;
}

function calcReceivingCardsAvancado(
  modulos: number,
  groups: { receivers: number; cascadeCount: number }[],
  portsPerCard: number,
) {
  let modulosAtendidos = 0;
  let totalReceivers = 0;
  for (const g of groups) {
    const modulosPorPorta = 1 + g.cascadeCount;
    const modulosPorReceiver = portsPerCard * modulosPorPorta;
    modulosAtendidos += g.receivers * modulosPorReceiver;
    totalReceivers += g.receivers;
  }
  const faltam = modulos - modulosAtendidos;
  if (faltam > 0) {
    totalReceivers += Math.ceil(faltam / portsPerCard);
  }
  return totalReceivers;
}

function verificarPixelCapacity(
  receivers: number,
  modulos: number,
  moduloPxW: number,
  moduloPxH: number,
  receiving: ReceivingCardSpec,
): number {
  const modulosPorReceiver = Math.ceil(modulos / receivers);
  const pxPorReceiver = modulosPorReceiver * moduloPxW * moduloPxH;
  const maxPx = receiving.maxPixels.largura * receiving.maxPixels.altura;
  if (pxPorReceiver > maxPx) {
    return Math.ceil((modulos * moduloPxW * moduloPxH) / maxPx);
  }
  return receivers;
}

function verificarDimensoesPixel(
  receivers: number,
  modulos: number,
  modulosHorizontais: number,
  moduloPxW: number,
  moduloPxH: number,
  receiving: ReceivingCardSpec,
): number {
  const modulosPorReceiver = Math.ceil(modulos / receivers);
  const colsPorReceiver = Math.min(modulosPorReceiver, modulosHorizontais);
  const pxW = colsPorReceiver * moduloPxW;
  const remainingModulos = modulosPorReceiver - colsPorReceiver;
  const rows = remainingModulos > 0 ? Math.ceil(remainingModulos / colsPorReceiver) + 1 : 1;
  const pxH = rows * moduloPxH;
  if (pxW > receiving.maxPixels.largura || pxH > receiving.maxPixels.altura) {
    const byWidth = Math.ceil(pxW / receiving.maxPixels.largura);
    const byHeight = Math.ceil(pxH / receiving.maxPixels.altura);
    return receivers * Math.max(byWidth, byHeight);
  }
  return receivers;
}

function distanciaMaximaOk(
  larguraMm: number,
  alturaMm: number,
  receivers: number,
): boolean {
  const maxDistanciaMm = DISTANCIA_MAXIMA_CABO * 1000;
  if (receivers <= 1) return true;
  const areaPorReceiver = (larguraMm * alturaMm) / receivers;
  const raioEstimado = Math.sqrt(areaPorReceiver) / 2;
  return raioEstimado <= maxDistanciaMm;
}

function selecionarProcessadora(
  totalPixels: number,
  larguraPx: number,
  alturaPx: number,
) {
  const compativeis = PROCESSADORAS.filter(
    (p) => p.maxLargura >= larguraPx && p.maxAltura >= alturaPx,
  );
  if (compativeis.length === 0) {
    const maiorLargura = Math.max(...PROCESSADORAS.map((p) => p.maxLargura));
    const maiorAltura = Math.max(...PROCESSADORAS.map((p) => p.maxAltura));
    const divisoesW = Math.ceil(larguraPx / maiorLargura);
    const divisoesH = Math.ceil(alturaPx / maiorAltura);
    return divisoesW * divisoesH;
  }
  const menorCapacidade = Math.min(...compativeis.map((p) => p.capacidade));
  if (totalPixels <= menorCapacidade) return 1;
  const maiorCapacidade = Math.max(...compativeis.map((p) => p.capacidade));
  return Math.ceil(totalPixels / maiorCapacidade);
}

export function calcular(config: CalculadoraConfig): CalculadoraResult {
  const larguraMm = config.larguraM * 1000;
  const alturaMm = config.alturaM * 1000;
  const modW = config.modulo.dimensao.largura;
  const modH = config.modulo.dimensao.altura;
  const modPxW = config.modulo.resolucao.largura;
  const modPxH = config.modulo.resolucao.altura;

  const modulos = calcModulosNoPainel(larguraMm, alturaMm, modW, modH);
  const totalPixels = {
    largura: modulos.horizontais * modPxW,
    altura: modulos.verticais * modPxH,
  };

  let modulosPorGabineteH = 0;
  let modulosPorGabineteV = 0;
  let modulosPorGabinete = 0;
  let gabinetesH = 0;
  let gabinetesV = 0;
  let totalGabinetes = 0;
  let unidades = 1;
  let modulosPorUnidade = modulos.total;

  if (config.tipoPainel === "gabinete" && config.gabinete) {
    const mpc = calcModulosPorGabinete(
      config.gabinete.largura,
      config.gabinete.altura,
      modW,
      modH,
    );
    modulosPorGabineteH = mpc.h;
    modulosPorGabineteV = mpc.v;
    modulosPorGabinete = mpc.total;
    const g = calcGabinetes(modulos.horizontais, modulos.verticais, mpc.h, mpc.v);
    gabinetesH = g.horizontais;
    gabinetesV = g.verticais;
    totalGabinetes = g.total;
    if (modulosPorGabinete > 0) {
      unidades = totalGabinetes;
      modulosPorUnidade = modulosPorGabinete;
    }
  }

  const { receivingCard } = config;
  let totalReceivingCards: number;

  if (config.cascadeGroups.length > 0) {
    totalReceivingCards =
      calcReceivingCardsAvancado(
        modulosPorUnidade,
        config.cascadeGroups,
        receivingCard.portas,
      ) * unidades;
  } else {
    const cascadeCount = config.cascatear ? 1 : 0;
    totalReceivingCards =
      calcReceivingCards(modulosPorUnidade, cascadeCount, receivingCard.portas) *
      unidades;
  }

  totalReceivingCards = verificarPixelCapacity(
    totalReceivingCards,
    modulos.total,
    modPxW,
    modPxH,
    receivingCard,
  );

  totalReceivingCards = verificarDimensoesPixel(
    totalReceivingCards,
    modulos.total,
    modulos.horizontais,
    modPxW,
    modPxH,
    receivingCard,
  );

  if (!distanciaMaximaOk(larguraMm, alturaMm, totalReceivingCards)) {
    const areaTotal = larguraMm * alturaMm;
    const areaPorReceiver = Math.PI * Math.pow(DISTANCIA_MAXIMA_CABO * 1000, 2);
    const minPorDistancia = Math.ceil(areaTotal / areaPorReceiver);
    totalReceivingCards = Math.max(totalReceivingCards, minPorDistancia);
  }

  const mpf = modulosPorFonte(config);
  const totalFontes = Math.ceil(modulos.total / mpf);
  const totalImas = modulos.total * IMAS_POR_MODULO;

  const totalPixelsProduto = totalPixels.largura * totalPixels.altura;
  const totalProcessadoras = selecionarProcessadora(
    totalPixelsProduto,
    totalPixels.largura,
    totalPixels.altura,
  );

  const custoUnitario: Record<string, number> = {};
  const custoTotal: Record<string, number> = {};

  return {
    larguraMm,
    alturaMm,
    totalPixels,
    modulosHorizontais: modulos.horizontais,
    modulosVerticais: modulos.verticais,
    totalModulos: modulos.total,
    modulosPorGabineteH,
    modulosPorGabineteV,
    modulosPorGabinete,
    gabinetesHorizontais: gabinetesH,
    gabinetesVerticais: gabinetesV,
    totalGabinetes,
    totalReceivingCards,
    pixelsPorReceiving: {
      largura: Math.min(
        (Math.ceil(modulos.total / totalReceivingCards)) * modPxW,
        totalPixels.largura,
      ),
      altura: Math.min(
        modPxH * (config.cascatear ? 2 : 1),
        totalPixels.altura,
      ),
    },
    totalFontes,
    modulosPorFonte: mpf,
    totalImas,
    totalProcessadoras,
    custoUnitario,
    custoTotal,
    custoTotalGeral: 0,
  };
}
