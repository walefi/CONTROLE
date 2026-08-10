import {
  DISTANCIA_MAXIMA_CABO,
  IMAS_POR_MODULO,
  MAX_ALTURA_MODULOS_POR_RECEIVER,
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

function calcReceivingCardsPorLinhas(
  modulosH: number,
  modulosV: number,
  cascadeCount: number,
  modPxW: number,
  modPxH: number,
  receiving: ReceivingCardSpec,
): number {
  const maxRowsByPixel = Math.floor(receiving.maxPixels.altura / modPxH);
  const maxColsByPixel = Math.floor(receiving.maxPixels.largura / modPxW);

  const rowsPerRx = Math.min(
    receiving.portas,
    MAX_ALTURA_MODULOS_POR_RECEIVER,
    maxRowsByPixel,
  );

  const modulosPorPorta = 1 + cascadeCount;
  const colsPerRxCol = Math.min(modulosPorPorta, maxColsByPixel);

  if (rowsPerRx <= 0 || colsPerRxCol <= 0) {
    return modulosH * modulosV;
  }

  const rxCols = Math.ceil(modulosH / colsPerRxCol);
  const rxRows = Math.ceil(modulosV / rowsPerRx);

  return rxCols * rxRows;
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
  let modulosPorUnidadeH = modulos.horizontais;
  let modulosPorUnidadeV = modulos.verticais;

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
    const g = calcGabinetes(
      modulos.horizontais,
      modulos.verticais,
      mpc.h,
      mpc.v,
    );
    gabinetesH = g.horizontais;
    gabinetesV = g.verticais;
    totalGabinetes = g.total;
    if (modulosPorGabinete > 0) {
      unidades = totalGabinetes;
      modulosPorUnidadeH = mpc.h;
      modulosPorUnidadeV = mpc.v;
    }
  }

  const { receivingCard } = config;
  const cascadeCount = config.cascatear ? 1 : 0;

  const receiversPorUnidade = calcReceivingCardsPorLinhas(
    modulosPorUnidadeH,
    modulosPorUnidadeV,
    cascadeCount,
    modPxW,
    modPxH,
    receivingCard,
  );

  let totalReceivingCards = receiversPorUnidade * unidades;

  if (!distanciaMaximaOk(larguraMm, alturaMm, totalReceivingCards)) {
    const areaTotal = larguraMm * alturaMm;
    const areaPorReceiver =
      Math.PI * Math.pow(DISTANCIA_MAXIMA_CABO * 1000, 2);
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

  const rowsPerRx = Math.min(
    receivingCard.portas,
    MAX_ALTURA_MODULOS_POR_RECEIVER,
    Math.floor(receivingCard.maxPixels.altura / modPxH),
  );
  const modulosPorPorta = 1 + cascadeCount;
  const colsPorRx = Math.min(
    modulosPorPorta,
    Math.floor(receivingCard.maxPixels.largura / modPxW),
  );

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
      largura: colsPorRx * modPxW,
      altura: rowsPerRx * modPxH,
    },
    totalFontes,
    modulosPorFonte: mpf,
    totalImas,
    totalProcessadoras,
    custoUnitario: {},
    custoTotal: {},
    custoTotalGeral: 0,
  };
}
