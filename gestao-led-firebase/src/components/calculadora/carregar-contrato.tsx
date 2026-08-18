import { useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  AMBIENTES,
  FONTES,
  GABINETES,
  MODELOS_IMA,
  PROCESSADORAS,
  RECEIVING_CARDS,
  TECNOLOGIAS_MODULO,
  TIPOS_HUB,
  TODOS_MODULOS,
} from "@/lib/calculadora-constants";
import { STATUS_META } from "@/lib/constants";
import { stockEffect } from "@/lib/stock";
import { qtdDisponivel, type Contrato, type ContratoItem, type Produto } from "@/lib/types";
import type { ConfigCalculadoraContrato, TipoPainel } from "@/lib/types-calculadora";
import { cn } from "@/lib/utils";
import { CategoriaBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { salvarPlanejamentoContrato } from "@/services/contratos";

function configPadrao(): ConfigCalculadoraContrato {
  return {
    tipoPainel: "personalizado",
    moduloPitch: "P1.86",
    tecnologia: "SMD Comum",
    tipoHub: "HUB75",
    receivingModelo: "MRV416-N",
    fonteAmperagem: "40A",
    ambiente: "Indoor",
    modeloIma: "M3",
    processadoraModelo: null,
    gabineteLargura: null,
    gabineteAltura: null,
  };
}

function configDoContrato(c: Contrato): ConfigCalculadoraContrato {
  return { ...configPadrao(), ...(c.config_calculadora ?? {}) };
}

export function CarregarContrato({
  produtos,
  contratos,
  itens,
}: {
  produtos: Produto[];
  contratos: Contrato[];
  itens: ContratoItem[];
}) {
  const [contratoId, setContratoId] = useState("");
  const [novosLotes, setNovosLotes] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<ConfigCalculadoraContrato>(configPadrao);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const contrato = contratos.find((c) => c.id === contratoId) ?? null;
  const efeitoEstoque = contrato ? stockEffect(contrato.status) : "NONE";

  const produtoPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const itensContrato = useMemo(
    () => itens.filter((i) => i.id_contrato === contratoId),
    [itens, contratoId]
  );

  const receiversCompativeis = RECEIVING_CARDS.filter(
    (r) => r.tipoHub === (config.tipoHub ?? "HUB75")
  );

  function selecionarContrato(id: string) {
    setContratoId(id);
    setNovosLotes({});
    setSujo(false);
    const c = contratos.find((x) => x.id === id);
    setConfig(c ? configDoContrato(c) : configPadrao());
  }

  function alterarConfig<K extends keyof ConfigCalculadoraContrato>(
    key: K,
    value: ConfigCalculadoraContrato[K]
  ) {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "tipoHub" && value) {
        const compativeis = RECEIVING_CARDS.filter((r) => r.tipoHub === value);
        if (compativeis.length > 0 && !compativeis.some((r) => r.modelo === prev.receivingModelo)) {
          next.receivingModelo = compativeis[0].modelo;
        }
      }
      return next;
    });
    setSujo(true);
  }

  function alterarLote(itemId: string, novoProdutoId: string) {
    setNovosLotes((prev) => ({ ...prev, [itemId]: novoProdutoId }));
    setSujo(true);
  }

  async function salvar() {
    if (!contrato) return;
    setSalvando(true);
    const alteracoes: { itemId: string; novoProdutoId: string }[] = [];
    for (const item of itensContrato) {
      const novoId = novosLotes[item.id];
      if (novoId && novoId !== item.id_produto) {
        alteracoes.push({ itemId: item.id, novoProdutoId: novoId });
      }
    }
    const res = await salvarPlanejamentoContrato(contrato.id, alteracoes, config);
    setSalvando(false);
    if (res.ok) {
      toast.success(res.message);
      setNovosLotes({});
      setSujo(false);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Planejamento por Contrato</CardTitle>
        <CardDescription>
          Carregue um contrato, veja os produtos vendidos e defina o lote e os modelos dos
          componentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Contrato</Label>
          <Select
            items={contratos.map((c) => ({
              value: c.id,
              label: `${c.ano_prov} — ${c.cliente}`,
            }))}
            value={contratoId}
            onValueChange={(v) => v && selecionarContrato(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o contrato..." />
            </SelectTrigger>
            <SelectContent>
              {contratos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center justify-between gap-2 w-full">
                    <span>
                      {c.ano_prov} — {c.cliente}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {STATUS_META[c.status]?.label}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {contrato && (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
              <StatusBadge status={contrato.status} />
              <span className="text-sm text-zinc-400">
                Painel:{" "}
                <span className="font-medium text-zinc-200">
                  {contrato.tamanho_painel || "—"}
                </span>
              </span>
              <span className="text-sm text-zinc-400">
                {itensContrato.length} item(ns) no contrato
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Produtos do contrato</Label>
              <p className="text-xs text-zinc-500">
                Quantidade vendida e lote do estoque que será usado em cada item.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Lote a usar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensContrato.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-16 text-center text-sm text-muted-foreground"
                      >
                        Nenhum componente vinculado a este contrato.
                      </TableCell>
                    </TableRow>
                  )}
                  {itensContrato.map((item) => {
                    const produto = item.id_produto
                      ? produtoPorId.get(item.id_produto)
                      : undefined;
                    const opcoes = produto
                      ? produtos.filter((p) => p.item === produto.item)
                      : [];
                    const selecionadoId = novosLotes[item.id] ?? item.id_produto;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{produto?.item ?? "Produto removido"}</p>
                          <p className="text-xs text-muted-foreground">
                            Lote atual: {produto?.lote || "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          {produto ? <CategoriaBadge categoria={produto.categoria} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {item.quantidade}
                        </TableCell>
                        <TableCell>
                          <Select
                            items={opcoes.map((p) => ({
                              value: p.id,
                              label: `${p.lote || "Sem lote"} (${qtdDisponivel(p)} disp.)`,
                            }))}
                            value={produto ? selecionadoId : ""}
                            onValueChange={(v) => v && alterarLote(item.id, v)}
                          >
                            <SelectTrigger size="sm" className="w-52">
                              <SelectValue placeholder="Indisponível" />
                            </SelectTrigger>
                            <SelectContent>
                              {opcoes.length === 0 && (
                                <SelectItem value="" disabled>
                                  Nenhum lote disponível
                                </SelectItem>
                              )}
                              {opcoes.map((p) => {
                                const disp = qtdDisponivel(p);
                                const semEstoque =
                                  efeitoEstoque !== "NONE" && disp < item.quantidade;
                                return (
                                  <SelectItem key={p.id} value={p.id} disabled={semEstoque}>
                                    <span className="flex items-center justify-between gap-2 w-full">
                                      <span>{p.lote || "Sem lote"}</span>
                                      <span
                                        className={cn(
                                          "text-xs tabular-nums",
                                          semEstoque ? "text-red-500" : "text-zinc-500"
                                        )}
                                      >
                                        {disp} disp.
                                      </span>
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Modelos dos Componentes</Label>
              <p className="text-xs text-zinc-500">
                Modelos específicos usados na montagem deste contrato.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Tipo de Painel</Label>
                  <div className="flex gap-3">
                    {(["personalizado", "gabinete"] as TipoPainel[]).map((t) => (
                      <label
                        key={t}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                          config.tipoPainel === t
                            ? "border-blue-600 bg-blue-600/10 text-blue-400"
                            : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                        )}
                      >
                        <input
                          type="radio"
                          name="tipoPainelPlanejamento"
                          className="sr-only"
                          checked={config.tipoPainel === t}
                          onChange={() => alterarConfig("tipoPainel", t)}
                        />
                        {t === "personalizado" ? "Personalizado" : "Gabinete"}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Modelo do Módulo</Label>
                  <Select
                    items={TODOS_MODULOS.map((m) => ({
                      value: m.pitch,
                      label: `${m.pitch} — ${m.resolucao.largura}×${m.resolucao.altura}px (${m.dimensao.largura}×${m.dimensao.altura}mm)`,
                    }))}
                    value={config.moduloPitch ?? ""}
                    onValueChange={(v) => v && alterarConfig("moduloPitch", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TODOS_MODULOS.map((m) => (
                        <SelectItem key={m.pitch} value={m.pitch}>
                          {m.pitch} — {m.resolucao.largura}×{m.resolucao.altura}px (
                          {m.dimensao.largura}×{m.dimensao.altura}mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Tecnologia</Label>
                  <Select
                    items={TECNOLOGIAS_MODULO.map((t) => ({ value: t, label: t }))}
                    value={config.tecnologia ?? ""}
                    onValueChange={(v) => v && alterarConfig("tecnologia", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TECNOLOGIAS_MODULO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Tipo de HUB</Label>
                  <Select
                    items={TIPOS_HUB.map((h) => ({ value: h, label: h }))}
                    value={config.tipoHub ?? ""}
                    onValueChange={(v) => v && alterarConfig("tipoHub", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_HUB.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Receiving Card</Label>
                  <Select
                    items={receiversCompativeis.map((r) => ({
                      value: r.modelo,
                      label: `${r.modelo} (${r.portas} portas ${r.tipoHub})`,
                    }))}
                    value={config.receivingModelo ?? ""}
                    onValueChange={(v) => v && alterarConfig("receivingModelo", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {receiversCompativeis.length === 0 && (
                        <SelectItem value="" disabled>
                          Nenhum receiver compatível
                        </SelectItem>
                      )}
                      {receiversCompativeis.map((r) => (
                        <SelectItem key={r.modelo} value={r.modelo}>
                          {r.modelo} ({r.portas} portas {r.tipoHub})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Fonte</Label>
                  <Select
                    items={FONTES.map((f) => ({ value: f.amperagem, label: f.amperagem }))}
                    value={config.fonteAmperagem ?? ""}
                    onValueChange={(v) =>
                      v && alterarConfig("fonteAmperagem", v as "40A" | "60A")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTES.map((f) => (
                        <SelectItem key={f.amperagem} value={f.amperagem}>
                          {f.amperagem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Ambiente</Label>
                  <Select
                    items={AMBIENTES.map((a) => ({ value: a, label: a }))}
                    value={config.ambiente ?? ""}
                    onValueChange={(v) => v && alterarConfig("ambiente", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AMBIENTES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Modelo do Imã</Label>
                  <Select
                    items={MODELOS_IMA.map((m) => ({ value: m, label: m }))}
                    value={config.modeloIma ?? ""}
                    onValueChange={(v) => v && alterarConfig("modeloIma", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELOS_IMA.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Processadora</Label>
                  <Select
                    items={[
                      { value: "", label: "Nenhuma" },
                      ...PROCESSADORAS.map((p) => ({ value: p.modelo, label: p.modelo })),
                    ]}
                    value={config.processadoraModelo ?? ""}
                    onValueChange={(v) => alterarConfig("processadoraModelo", v || null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {PROCESSADORAS.map((p) => (
                        <SelectItem key={p.modelo} value={p.modelo}>
                          {p.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Gabinete</Label>
                  <Select
                    items={[
                      { value: "", label: "Nenhum" },
                      ...GABINETES.map((g, i) => ({
                        value: String(i),
                        label: `${g.largura}×${g.altura}mm`,
                      })),
                    ]}
                    value={
                      config.gabineteLargura && config.gabineteAltura
                        ? String(
                            GABINETES.findIndex(
                              (g) =>
                                g.largura === config.gabineteLargura &&
                                g.altura === config.gabineteAltura
                            )
                          )
                        : ""
                    }
                    onValueChange={(v) => {
                      if (v === "") {
                        alterarConfig("gabineteLargura", null);
                        alterarConfig("gabineteAltura", null);
                        return;
                      }
                      const g = GABINETES[Number(v)];
                      if (g) {
                        alterarConfig("gabineteLargura", g.largura);
                        alterarConfig("gabineteAltura", g.altura);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {GABINETES.map((g, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {g.largura}×{g.altura}mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={salvar} disabled={salvando || !sujo}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Salvar alterações
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
