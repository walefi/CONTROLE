import { useState } from "react";
import { toast } from "sonner";
import { salvarProduto } from "@/services/produtos";
import { CATEGORIAS } from "@/lib/constants";
import type { Produto } from "@/lib/types";
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
  produto: Produto | null;
};

export function ProdutoDialog({ open, onOpenChange, produto }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    categoria: produto?.categoria ?? "Módulo",
    item: produto?.item ?? "",
    lote: produto?.lote ?? "",
    descricao: produto?.descricao ?? "",
    qtd_total: produto ? String(produto.qtd_total) : "0",
    qtd_manutencao: produto ? String(produto.qtd_manutencao) : "0",
    valor_custo: produto ? String(produto.valor_custo) : "",
    valor_revenda: produto ? String(produto.valor_revenda) : "",
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
        qtd_total: Number(form.qtd_total) || 0,
        qtd_manutencao: Number(form.qtd_manutencao) || 0,
        valor_custo: Number(form.valor_custo) || 0,
        valor_revenda: Number(form.valor_revenda) || 0,
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
              <Label htmlFor="qtd_total">Qtd Total</Label>
              <Input
                id="qtd_total"
                type="number"
                min={0}
                value={form.qtd_total}
                onChange={(e) => set("qtd_total", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtd_manutencao">Qtd Manutenção</Label>
              <Input
                id="qtd_manutencao"
                type="number"
                min={0}
                value={form.qtd_manutencao}
                onChange={(e) => set("qtd_manutencao", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_custo">Valor Custo (R$)</Label>
              <Input
                id="valor_custo"
                type="number"
                min={0}
                step="0.01"
                value={form.valor_custo}
                onChange={(e) => set("valor_custo", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_revenda">Valor Revenda (R$)</Label>
              <Input
                id="valor_revenda"
                type="number"
                min={0}
                step="0.01"
                value={form.valor_revenda}
                onChange={(e) => set("valor_revenda", e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          {produto && (
            <p className="text-xs text-muted-foreground">
              Qtd Provisionado: {produto.qtd_provisionado} — valor gerenciado
              automaticamente pelos contratos.
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
