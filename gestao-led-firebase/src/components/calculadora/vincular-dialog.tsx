"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adicionarItem, criarContrato } from "@/services/contratos";
import { STATUS_META } from "@/lib/constants";
import type { Contrato, Produto } from "@/lib/types";
import type { CalculadoraConfig, CalculadoraResult } from "@/lib/types-calculadora";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ItemParaVincular = {
  categoria: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
};

function collectItems(
  config: CalculadoraConfig,
  result: CalculadoraResult,
  produtos: Produto[],
): ItemParaVincular[] {
  const items: ItemParaVincular[] = [];
  const map: [string, keyof CalculadoraConfig, number][] = [
    ["Módulo", "moduloProdutoId", result.totalModulos],
    ["Receiver", "receivingProdutoId", result.totalReceivingCards],
    ["Fonte", "fonteProdutoId", result.totalFontes],
    ["Processadora", "processadoraProdutoId", result.totalProcessadoras],
    ["Gabinete", "gabineteProdutoId", result.totalGabinetes],
    ...(config.tipoPainel !== "gabinete"
      ? [["Imã", "imaProdutoId" as keyof CalculadoraConfig, result.totalImas] as [string, keyof CalculadoraConfig, number]]
      : []),
  ];

  for (const [cat, key, qtd] of map) {
    const produtoId = config[key] as string | null;
    if (!produtoId || qtd <= 0) continue;
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) continue;
    items.push({ categoria: cat, produtoId, produtoNome: produto.item, quantidade: qtd });
  }

  return items;
}

export function VincularDialog({
  open,
  onOpenChange,
  config,
  result,
  produtos,
  contratos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CalculadoraConfig;
  result: CalculadoraResult | null;
  produtos: Produto[];
  contratos: Contrato[];
}) {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"existente" | "novo">("existente");
  const [contratoId, setContratoId] = useState("");
  const [cliente, setCliente] = useState("");
  const [anoProv, setAnoProv] = useState("");
  const [prazo, setPrazo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!result) return null;

  const itens = collectItems(config, result, produtos);

  async function handleVincular() {
    if (!result) return;
    setLoading(true);
    try {
      if (modo === "existente") {
        if (!contratoId) {
          toast.error("Selecione um contrato.");
          setLoading(false);
          return;
        }
        let erros = 0;
        for (const item of itens) {
          const res = await adicionarItem(contratoId, item.produtoId, item.quantidade);
          if (!res.ok) erros++;
        }
        if (erros === 0) {
          toast.success(`${itens.length} item(ns) vinculado(s) com sucesso.`);
          onOpenChange(false);
          navigate(`/contratos/${contratoId}`);
        } else {
          toast.error(`${erros} item(ns) falharam ao vincular.`);
        }
      } else {
        if (!cliente.trim() || !anoProv.trim()) {
          toast.error("Preencha o cliente e o Ano/Prov.");
          setLoading(false);
          return;
        }
        const tamanhoPainel = `${result.larguraMm}×${result.alturaMm}mm`;
        const res = await criarContrato({
          ano_prov: anoProv,
          cliente,
          tamanho_painel: tamanhoPainel,
          prazo,
          observacoes: "",
          status: "ORCAMENTO",
        });

        if (!res.ok || !res.id) {
          toast.error(res.message);
          setLoading(false);
          return;
        }

        let erros = 0;
        for (const item of itens) {
          const r = await adicionarItem(res.id, item.produtoId, item.quantidade);
          if (!r.ok) erros++;
        }

        if (erros === 0) {
          toast.success(res.message);
          onOpenChange(false);
          navigate(`/contratos/${res.id}`);
        } else {
          toast.error(`${erros} item(ns) falharam ao vincular. Contrato criado.`);
          navigate(`/contratos/${res.id}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular ao Contrato</DialogTitle>
          <DialogDescription>
            Os itens calculados serão vinculados ao contrato selecionado, dando baixa no estoque
            conforme o status do contrato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(["existente", "novo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  modo === m
                    ? "border-blue-600 bg-blue-600/10 text-blue-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600",
                )}
              >
                {m === "existente" ? "Contrato existente" : "Novo contrato"}
              </button>
            ))}
          </div>

          {modo === "existente" ? (
            <div className="space-y-2">
              <Label>Selecione o contrato</Label>
              <Select
                items={contratos.map((c) => ({
                  value: c.id,
                  label: `${c.ano_prov} — ${c.cliente}`,
                }))}
                value={contratoId}
                onValueChange={(v) => setContratoId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Buscar contrato..." />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center justify-between gap-2 w-full">
                        <span>{c.ano_prov} — {c.cliente}</span>
                        <span className="text-xs text-zinc-500">
                          {STATUS_META[c.status as keyof typeof STATUS_META]?.label}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="vinc-cliente">Cliente</Label>
                <Input
                  id="vinc-cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vinc-anoprov">Ano/Prov</Label>
                  <Input
                    id="vinc-anoprov"
                    value={anoProv}
                    onChange={(e) => setAnoProv(e.target.value)}
                    placeholder="2025/001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vinc-prazo">Prazo</Label>
                  <Input
                    id="vinc-prazo"
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              {itens.length} item(ns) a ser(em) vinculado(s)
            </Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
              {itens.length === 0 && (
                <p className="p-2 text-center text-xs text-zinc-500">
                  Selecione itens do estoque na calculadora para vinculá-los.
                </p>
              )}
              {itens.map((item) => (
                <div
                  key={item.categoria}
                  className="flex items-center justify-between rounded px-2 py-1 text-sm"
                >
                  <span className="text-zinc-300">{item.produtoNome}</span>
                  <span className="tabular-nums text-zinc-500">
                    {item.categoria}: <span className="font-semibold text-zinc-300">{item.quantidade}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={loading || itens.length === 0}
            onClick={handleVincular}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {modo === "existente" ? "Vincular ao contrato" : "Criar contrato e vincular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
