"use client";

import { useMemo, useState } from "react";
import { Link } from "lucide-react";
import { calcular } from "@/lib/calculadora";
import {
  AMBIENTES,
  FONTES,
  GABINETES,
  MODELOS_IMA,
  RECEIVING_CARDS,
  TECNOLOGIAS_MODULO,
  TIPOS_HUB,
  TODOS_MODULOS,
  type GabineteSpec,
  type ModuloLedSpec,
} from "@/lib/calculadora-constants";
import { brl } from "@/lib/format";
import type { CalculadoraConfig, CascadeGroup, ProdutoRow, TipoPainel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VincularDialog } from "@/components/calculadora/vincular-dialog";
import type { ContratoResumo } from "@/app/(app)/calculadora/page";

function formatModuloOption(m: ModuloLedSpec): string {
  return `${m.pitch} — ${m.resolucao.largura}×${m.resolucao.altura}px (${m.dimensao.largura}×${m.dimensao.altura}mm)`;
}

function formatGabineteOption(g: GabineteSpec): string {
  return `${g.largura}×${g.altura}mm`;
}

function formatProdutoOption(p: ProdutoRow): string {
  return `${p.item}${p.lote ? ` — ${p.lote}` : ""} (disp: ${p.qtdDisponivel})`;
}

const defaultModulo = TODOS_MODULOS.find((m) => m.pitch === "P1.86") ?? TODOS_MODULOS[0];
const defaultReceiving = RECEIVING_CARDS[0];

function buildDefaultConfig(): CalculadoraConfig {
  return {
    larguraM: 3,
    alturaM: 2,
    tipoPainel: "personalizado",
    gabinete: null,
    modulo: defaultModulo,
    tecnologia: "SMD Comum",
    tipoHub: "HUB75",
    cascatear: false,
    cascadeGroups: [],
    receivingCard: defaultReceiving,
    ambiente: "Indoor",
    fonteAmperagem: "40A",
    modeloIma: "M3",
    moduloProdutoId: null,
    receivingProdutoId: null,
    fonteProdutoId: null,
    processadoraProdutoId: null,
    gabineteProdutoId: null,
    imaProdutoId: null,
  };
}

export function CalculadoraClient({
  produtos,
  contratos,
}: {
  produtos: ProdutoRow[];
  contratos: ContratoResumo[];
}) {
  const [config, setConfig] = useState<CalculadoraConfig>(buildDefaultConfig);
  const [dialogOpen, setDialogOpen] = useState(false);

  function update<K extends keyof CalculadoraConfig>(key: K, value: CalculadoraConfig[K]) {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "tipoPainel" && value === "personalizado") {
        next.gabinete = null;
        next.cascadeGroups = [];
      }
      if (key === "tipoHub") {
        const compativeis = RECEIVING_CARDS.filter((r) => r.tipoHub === value);
        if (compativeis.length > 0 && !compativeis.some((r) => r.modelo === prev.receivingCard.modelo)) {
          next.receivingCard = compativeis[0];
        }
      }
      if (key === "modulo" && prev.tipoPainel === "gabinete" && prev.gabinete) {
        const mod = value as typeof prev.modulo;
        const h = Math.floor(prev.gabinete.largura / mod.dimensao.largura);
        const v = Math.floor(prev.gabinete.altura / mod.dimensao.altura);
        if (h * v === 0) {
          const primeiraComp = GABINETES.find((g) => {
            const gh = Math.floor(g.largura / mod.dimensao.largura);
            const gv = Math.floor(g.altura / mod.dimensao.altura);
            return gh * gv > 0;
          });
          next.gabinete = primeiraComp ?? null;
        }
      }
      return next;
    });
  }

  const result = useMemo(() => {
    if (config.larguraM <= 0 || config.alturaM <= 0) return null;
    return calcular(config);
  }, [config]);

  const produtosPorCategoria = useMemo(() => {
    const map: Record<string, ProdutoRow[]> = {};
    for (const p of produtos) {
      if (!map[p.categoria]) map[p.categoria] = [];
      map[p.categoria].push(p);
    }
    return map;
  }, [produtos]);

  const gabinetesCompativeis = useMemo(() => {
    const modW = config.modulo.dimensao.largura;
    const modH = config.modulo.dimensao.altura;
    return GABINETES.map((g, i) => {
      const h = Math.floor(g.largura / modW);
      const v = Math.floor(g.altura / modH);
      return { gabinete: g, index: i, compativel: h * v > 0, modulosH: h, modulosV: v };
    });
  }, [config.modulo]);

  const receiversCompativeis = useMemo(() => {
    return RECEIVING_CARDS.filter((r) => r.tipoHub === config.tipoHub);
  }, [config.tipoHub]);

  function selecionarProduto(categoria: string): ProdutoRow | null {
    const keyMap: Record<string, keyof CalculadoraConfig> = {
      Módulo: "moduloProdutoId",
      Receiver: "receivingProdutoId",
      Fonte: "fonteProdutoId",
      Processadora: "processadoraProdutoId",
      Gabinete: "gabineteProdutoId",
      Imã: "imaProdutoId",
    };
    const idKey = keyMap[categoria];
    if (!idKey) return null;
    const id = config[idKey] as number | null;
    if (!id) return null;
    return produtos.find((p) => p.id === id) ?? null;
  }

  function custosExtras() {
    if (!result) return { unitario: {} as Record<string, number>, total: {} as Record<string, number>, geral: 0 };
    const unitario: Record<string, number> = {};
    const total: Record<string, number> = {};
    let geral = 0;

    const items: { categoria: string; qtd: number }[] = [
      { categoria: "Módulo", qtd: result.totalModulos },
      { categoria: "Receiver", qtd: result.totalReceivingCards },
      { categoria: "Fonte", qtd: result.totalFontes },
      { categoria: "Processadora", qtd: result.totalProcessadoras },
      { categoria: "Gabinete", qtd: result.totalGabinetes },
      { categoria: "Imã", qtd: result.totalImas },
    ];

    for (const { categoria, qtd } of items) {
      const p = selecionarProduto(categoria);
      if (p) {
        unitario[categoria] = p.valorRevenda;
        total[categoria] = p.valorRevenda * qtd;
        geral += total[categoria];
      }
    }

    return { unitario, total, geral };
  }

  const custos = result ? custosExtras() : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calculadora de Materiais</h1>
        <p className="text-sm text-muted-foreground">
          Calcule automaticamente os insumos necessários para montagem de painéis de LED
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimensões do Painel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="largura">Largura (m)</Label>
                <Input
                  id="largura"
                  type="number"
                  min={0.1}
                  step={0.01}
                  value={config.larguraM}
                  onChange={(e) => update("larguraM", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="altura">Altura (m)</Label>
                <Input
                  id="altura"
                  type="number"
                  min={0.1}
                  step={0.01}
                  value={config.alturaM}
                  onChange={(e) => update("alturaM", Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Painel</Label>
              <div className="flex gap-3">
                {(["personalizado", "gabinete"] as TipoPainel[]).map((t) => (
                  <label
                    key={t}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      config.tipoPainel === t
                        ? "border-blue-600 bg-blue-600/10 text-blue-400"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600",
                    )}
                  >
                    <input
                      type="radio"
                      name="tipoPainel"
                      className="sr-only"
                      checked={config.tipoPainel === t}
                      onChange={() => update("tipoPainel", t)}
                    />
                    {t === "personalizado" ? "Personalizado" : "Gabinete"}
                  </label>
                ))}
              </div>
            </div>
            {config.tipoPainel === "gabinete" && (
              <div className="space-y-2">
                <Label>Modelo do Gabinete</Label>
                <Select
                  items={gabinetesCompativeis
                    .filter((g) => g.compativel)
                    .map((g) => ({ value: String(g.index), label: formatGabineteOption(g.gabinete) }))}
                  value={config.gabinete ? String(GABINETES.indexOf(config.gabinete)) : ""}
                  onValueChange={(v) => update("gabinete", GABINETES[Number(v)])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gabinete" />
                  </SelectTrigger>
                  <SelectContent>
                    {gabinetesCompativeis.map((g) => (
                      <SelectItem key={g.index} value={String(g.index)} disabled={!g.compativel}>
                        <span>
                          {formatGabineteOption(g.gabinete)}
                          {!g.compativel && (
                            <span className="ml-2 text-xs text-red-500">incompatível</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {config.gabinete && (() => {
                  const gc = gabinetesCompativeis.find((g) => g.gabinete === config.gabinete);
                  if (gc && !gc.compativel) {
                    return (
                      <p className="text-xs text-red-500">
                        O módulo {config.modulo.pitch} ({config.modulo.dimensao.largura}×{config.modulo.dimensao.altura}mm) não cabe neste gabinete.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração do Módulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo do Módulo</Label>
              <Select
                items={TODOS_MODULOS.map((m) => ({ value: m.pitch, label: formatModuloOption(m) }))}
                value={config.modulo.pitch}
                onValueChange={(v) => {
                  const found = TODOS_MODULOS.find((m) => m.pitch === v);
                  if (found) update("modulo", found);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TODOS_MODULOS.map((m) => (
                    <SelectItem key={m.pitch} value={m.pitch}>
                      {formatModuloOption(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tecnologia</Label>
                <Select
                  items={TECNOLOGIAS_MODULO.map((t) => ({ value: t, label: t }))}
                  value={config.tecnologia}
                  onValueChange={(v) => update("tecnologia", v as typeof config.tecnologia)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TECNOLOGIAS_MODULO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de HUB</Label>
                <Select
                  items={TIPOS_HUB.map((h) => ({ value: h, label: h }))}
                  value={config.tipoHub}
                  onValueChange={(v) => update("tipoHub", v as typeof config.tipoHub)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_HUB.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-blue-600"
                checked={config.cascatear}
                onChange={(e) => update("cascatear", e.target.checked)}
              />
              <span className="text-sm font-medium text-zinc-300">Módulo cascateia (jumper)</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receiving Card, Fonte e Imã</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo do Receiving Card</Label>
              <Select
                items={receiversCompativeis.map((r) => ({
                  value: r.modelo,
                  label: `${r.modelo} (${r.portas} portas ${r.tipoHub})`,
                }))}
                value={config.receivingCard.modelo}
                onValueChange={(v) => {
                  const found = receiversCompativeis.find((r) => r.modelo === v);
                  if (found) update("receivingCard", found);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {receiversCompativeis.length === 0 && (
                    <SelectItem value="" disabled>
                      Nenhum receiver compatível com {config.tipoHub}
                    </SelectItem>
                  )}
                  {receiversCompativeis.map((r) => (
                    <SelectItem key={r.modelo} value={r.modelo}>
                      {r.modelo} ({r.portas} portas {r.tipoHub})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {receiversCompativeis.length === 0 && (
                <p className="text-xs text-red-500">
                  Nenhum receiving card disponível para o HUB selecionado ({config.tipoHub}).
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fonte</Label>
                <Select
                  items={FONTES.map((f) => ({ value: f.amperagem, label: f.amperagem }))}
                  value={config.fonteAmperagem}
                  onValueChange={(v) => update("fonteAmperagem", v as "40A" | "60A")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTES.map((f) => (
                      <SelectItem key={f.amperagem} value={f.amperagem}>{f.amperagem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select
                  items={AMBIENTES.map((a) => ({ value: a, label: a }))}
                  value={config.ambiente}
                  onValueChange={(v) => update("ambiente", v as typeof config.ambiente)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AMBIENTES.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modelo do Imã</Label>
                <Select
                  items={MODELOS_IMA.map((m) => ({ value: m, label: m }))}
                  value={config.modeloIma}
                  onValueChange={(v) => update("modeloIma", v as typeof config.modeloIma)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELOS_IMA.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seleção de Itens do Estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["Módulo", "Receiver", "Fonte", "Processadora", "Gabinete", "Imã"] as const).map((cat) => {
              const keyMap: Record<string, keyof CalculadoraConfig> = {
                Módulo: "moduloProdutoId",
                Receiver: "receivingProdutoId",
                Fonte: "fonteProdutoId",
                Processadora: "processadoraProdutoId",
                Gabinete: "gabineteProdutoId",
                Imã: "imaProdutoId",
              };
              const items = produtosPorCategoria[cat] ?? [];
              const idKey = keyMap[cat];
              const selectedId = config[idKey] as number | null;
              const selected = items.find((p) => p.id === selectedId);

              return (
                <div key={cat} className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">{cat}</Label>
                  <Select
                    items={[
                      { value: "", label: "Nenhum selecionado" },
                      ...items.map((p) => ({ value: String(p.id), label: formatProdutoOption(p) })),
                    ]}
                    value={selectedId ? String(selectedId) : ""}
                    onValueChange={(v) => update(idKey, v ? Number(v) : null)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Buscar no estoque..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum selecionado</SelectItem>
                      {items.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="flex items-center justify-between gap-2 w-full">
                            <span>{p.item}{p.lote ? ` (${p.lote})` : ""}</span>
                            <span className={cn("text-xs tabular-nums", p.qtdDisponivel < 10 ? "text-red-500" : "text-zinc-500")}>
                              {p.qtdDisponivel} un.
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected && (
                    <p className="text-xs text-zinc-500">
                      Custo: {brl(selected.valorCusto)} · Revenda: {brl(selected.valorRevenda)}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {config.tipoPainel === "gabinete" && config.cascatear && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cascateamento por Receiver (Avançado)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newGroup: CascadeGroup = { receivers: 1, cascadeCount: 1 };
                update("cascadeGroups", [...config.cascadeGroups, newGroup]);
              }}
            >
              + Adicionar Grupo
            </Button>
          </CardHeader>
          <CardContent>
            {config.cascadeGroups.length === 0 && (
              <p className="text-sm text-zinc-500">
                Nenhum grupo configurado. Usando cascateamento uniforme (1 módulo extra por porta).
              </p>
            )}
            <div className="space-y-2">
              {config.cascadeGroups.map((g, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Receivers</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-sm"
                      value={g.receivers}
                      onChange={(e) => {
                        const updated = [...config.cascadeGroups];
                        updated[i] = { ...g, receivers: Number(e.target.value) || 1 };
                        update("cascadeGroups", updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Módulos em cascade</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-sm"
                      value={g.cascadeCount}
                      onChange={(e) => {
                        const updated = [...config.cascadeGroups];
                        updated[i] = { ...g, cascadeCount: Number(e.target.value) || 0 };
                        update("cascadeGroups", updated);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-5 h-8 w-8 text-red-500 hover:text-red-400"
                    onClick={() => {
                      const updated = config.cascadeGroups.filter((_, idx) => idx !== i);
                      update("cascadeGroups", updated);
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Componente</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Detalhe</TableHead>
                <TableHead className="text-right pr-6">Custo Est. (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!result && (
                <TableRow>
                  <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                    Preencha as dimensões do painel para calcular.
                  </TableCell>
                </TableRow>
              )}
              {result && (
                <>
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Painel</TableCell>
                    <TableCell className="text-right tabular-nums">—</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {result.larguraMm}×{result.alturaMm}mm · {result.totalPixels.largura}×{result.totalPixels.altura}px
                    </TableCell>
                    <TableCell className="text-right pr-6">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Módulos</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{result.totalModulos}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {result.modulosHorizontais}×{result.modulosVerticais} · {config.modulo.pitch} {config.tecnologia}
                    </TableCell>
                    <TableCell className="text-right pr-6 tabular-nums">
                      {custos?.total["Módulo"] ? brl(custos.total["Módulo"]) : "—"}
                    </TableCell>
                  </TableRow>
                  {result.totalGabinetes > 0 && (
                    <TableRow>
                      <TableCell className="pl-6 font-medium">Gabinetes</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{result.totalGabinetes}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {result.gabinetesHorizontais}×{result.gabinetesVerticais} · {result.modulosPorGabinete} mód./gab.
                      </TableCell>
                      <TableCell className="text-right pr-6 tabular-nums">
                        {custos?.total["Gabinete"] ? brl(custos.total["Gabinete"]) : "—"}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Receiving Cards</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{result.totalReceivingCards}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {config.receivingCard.modelo} · {result.pixelsPorReceiving.largura}×{result.pixelsPorReceiving.altura}px
                    </TableCell>
                    <TableCell className="text-right pr-6 tabular-nums">
                      {custos?.total["Receiver"] ? brl(custos.total["Receiver"]) : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Fontes</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{result.totalFontes}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {config.fonteAmperagem} {config.ambiente} · {result.modulosPorFonte} mód./fonte
                    </TableCell>
                    <TableCell className="text-right pr-6 tabular-nums">
                      {custos?.total["Fonte"] ? brl(custos.total["Fonte"]) : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Processadoras</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{result.totalProcessadoras}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {result.totalPixels.largura * result.totalPixels.altura > 0
                        ? `${((result.totalPixels.largura * result.totalPixels.altura) / 1_000_000).toFixed(2)}M pixels`
                        : ""}
                    </TableCell>
                    <TableCell className="text-right pr-6 tabular-nums">
                      {custos?.total["Processadora"] ? brl(custos.total["Processadora"]) : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Imãs</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{result.totalImas}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      Modelo {config.modeloIma} · 4 por módulo
                    </TableCell>
                    <TableCell className="text-right pr-6 tabular-nums">
                      {custos?.total["Imã"] ? brl(custos.total["Imã"]) : "—"}
                    </TableCell>
                  </TableRow>
                  {custos && custos.geral > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="pl-6 font-bold">Total Geral</TableCell>
                      <TableCell className="text-right" />
                      <TableCell className="text-right" />
                      <TableCell className="text-right pr-6 text-lg font-bold tabular-nums text-emerald-400">
                        {brl(custos.geral)}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {result && result.totalModulos > 0 && (
        <div className="flex justify-end">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <Link className="h-4 w-4" />
            Vincular ao Contrato
          </Button>
        </div>
      )}

      <VincularDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={config}
        result={result}
        produtos={produtos}
        contratos={contratos}
      />
    </div>
  );
}
