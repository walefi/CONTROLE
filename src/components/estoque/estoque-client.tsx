"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirProduto } from "@/app/actions/produtos";
import { CATEGORIAS, ESTOQUE_BAIXO } from "@/lib/constants";
import { brl } from "@/lib/format";
import type { ProdutoRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoriaBadge } from "@/components/badges";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImportarCsvDialog } from "@/components/estoque/importar-csv-dialog";
import { ProdutoDialog } from "@/components/estoque/produto-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const CATEGORIA_ITEMS = [
  { value: "todas", label: "Todas as categorias" },
  ...CATEGORIAS.map((c) => ({ value: c as string, label: c as string })),
];

export function EstoqueClient({ produtos }: { produtos: ProdutoRow[] }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<ProdutoRow | null>(null);
  const [excluindo, setExcluindo] = useState<ProdutoRow | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (categoria !== "todas" && p.categoria !== categoria) return false;
      if (!termo) return true;
      return `${p.item} ${p.lote} ${p.descricao}`.toLowerCase().includes(termo);
    });
  }, [produtos, busca, categoria]);

  async function confirmarExclusao() {
    if (!excluindo) return;
    setExcluindoLoading(true);
    const res = await excluirProduto(excluindo.id);
    setExcluindoLoading(false);
    if (res.ok) {
      toast.success(res.message);
      setExcluindo(null);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {produtos.length} produto(s) cadastrado(s) · {filtrados.length} exibido(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportarCsvDialog />
          <Button
            onClick={() => {
              setEditando(null);
              setDialogAberto(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por item, lote ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select
          items={CATEGORIA_ITEMS}
          value={categoria}
          onValueChange={(v) => setCategoria(String(v))}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIA_ITEMS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Categoria</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="hidden xl:table-cell">Descrição</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Manut.</TableHead>
                <TableHead className="text-right">Prov.</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Revenda</TableHead>
                <TableHead className="w-24 pr-6 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-6">
                    <CategoriaBadge categoria={p.categoria} />
                  </TableCell>
                  <TableCell className="font-medium">{p.item}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{p.lote || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden max-w-56 truncate text-muted-foreground xl:table-cell">
                    {p.descricao || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.qtdTotal}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.qtdManutencao}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.qtdProvisionado}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        p.qtdDisponivel < ESTOQUE_BAIXO
                          ? "text-red-600"
                          : "text-emerald-700"
                      )}
                    >
                      {p.qtdDisponivel}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(p.valorCusto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(p.valorRevenda)}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Editar produto"
                        onClick={() => {
                          setEditando(p);
                          setDialogAberto(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        aria-label="Excluir produto"
                        onClick={() => setExcluindo(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProdutoDialog
        key={editando?.id ?? "novo"}
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        produto={editando}
      />

      <ConfirmDialog
        open={!!excluindo}
        onOpenChange={(o) => {
          if (!o) setExcluindo(null);
        }}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${excluindo?.item ?? ""}"? Esta ação não pode ser desfeita.`}
        loading={excluindoLoading}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}
