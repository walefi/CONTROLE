"use client";

import { useState } from "react";
import { toast } from "sonner";
import { salvarProduto } from "@/app/actions/produtos";
import { CATEGORIAS } from "@/lib/constants";
import type { ProdutoRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: ProdutoRow | null;
};

export function ProdutoDialog({ open, onOpenChange, produto }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    categoria: produto?.categoria ?? "Módulo",
    item: produto?.item ?? "",
    lote: produto?.lote ?? "",
    descricao: produto?.descricao ?? "",
    qtdTotal: produto ? String(produto.qtdTotal) : "0",
    qtdManutencao: produto ? String(produto.qtdManutencao) : "0",
    valorCusto: produto ? String(produto.valorCusto) : "",
    valorRevenda: produto ? String(produto.valorRevenda) : "",
  });

  function set(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await salvarProduto(
      {
        categoria: form.categoria,
        item: form.item,
        lote: form.lote,
        descricao: form.descricao,
        qtdTotal: Number(form.qtdTotal) || 0,
        qtdManutencao: Number(form.qtdManutencao) || 0,
        valorCusto: Number(form.valorCusto) || 0,
        valorRevenda: Number(form.valorRevenda) || 0,
      },
      produto?.id
    );
    setLoading(false);
    if (res.ok) {
      toast.success(res.message);
      onOpenChange(false);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          <DialogDescription>
            {produto
              ? "Atualize os dados do produto no estoque."
              : "Cadastre um novo produto no estoque."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => set("categoria", String(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Input
                id="lote"
                value={form.lote}
                onChange={(e) => set("lote", e.target.value)}
                placeholder="Ex: P25-B032"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="item">Item *</Label>
              <Input
                id="item"
                value={form.item}
                onChange={(e) => set("item", e.target.value)}
                placeholder="Ex: Módulo LED P2.5 Indoor"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)}
                placeholder="Detalhes técnicos do produto..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtdTotal">Qtd Total</Label>
              <Input
                id="qtdTotal"
                type="number"
                min={0}
                value={form.qtdTotal}
                onChange={(e) => set("qtdTotal", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtdManutencao">Qtd Manutenção</Label>
              <Input
                id="qtdManutencao"
                type="number"
                min={0}
                value={form.qtdManutencao}
                onChange={(e) => set("qtdManutencao", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorCusto">Valor Custo (R$)</Label>
              <Input
                id="valorCusto"
                type="number"
                min={0}
                step="0.01"
                value={form.valorCusto}
                onChange={(e) => set("valorCusto", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorRevenda">Valor Revenda (R$)</Label>
              <Input
                id="valorRevenda"
                type="number"
                min={0}
                step="0.01"
                value={form.valorRevenda}
                onChange={(e) => set("valorRevenda", e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          {produto && (
            <p className="text-xs text-muted-foreground">
              Qtd Provisionado: {produto.qtdProvisionado} · Qtd Disponível:{" "}
              {produto.qtdDisponivel} — valores gerenciados automaticamente pelos
              contratos.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
