"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adicionarItem, removerItem } from "@/app/actions/contratos";
import { STATUS_META, type Status } from "@/lib/constants";
import { brl } from "@/lib/format";
import type { ItemContratoRow, ProdutoRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoriaBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  contratoId: number;
  status: Status;
  itens: ItemContratoRow[];
  produtos: ProdutoRow[];
};

export function ItensManager({ contratoId, status, itens, produtos }: Props) {
  const [comboAberto, setComboAberto] = useState(false);
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [adicionando, setAdicionando] = useState(false);
  const [removendo, setRemovendo] = useState<number | null>(null);

  const selecionado = useMemo(
    () => produtos.find((p) => p.id === produtoId) ?? null,
    [produtos, produtoId]
  );
  const totalUnidades = itens.reduce((s, i) => s + i.quantidade, 0);
  const valorTotal = itens.reduce(
    (s, i) => s + i.quantidade * i.produto.valorRevenda,
    0
  );

  async function onAdicionar() {
    if (!produtoId) {
      toast.error("Selecione um produto do estoque.");
      return;
    }
    setAdicionando(true);
    const res = await adicionarItem(contratoId, produtoId, Number(quantidade));
    setAdicionando(false);
    if (res.ok) {
      toast.success(res.message);
      setProdutoId(null);
      setQuantidade("1");
    } else {
      toast.error(res.message);
    }
  }

  async function onRemover(itemId: number) {
    setRemovendo(itemId);
    const res = await removerItem(itemId);
    setRemovendo(null);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Componentes do Contrato</CardTitle>
        <CardDescription>
          Selecione um produto do estoque, informe a quantidade e vincule ao contrato.{" "}
          {STATUS_META[status].hint}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
          <Popover open={comboAberto} onOpenChange={setComboAberto}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboAberto}
                  className="w-full justify-between font-normal"
                />
              }
            >
              <span className="truncate">
                {selecionado ? selecionado.item : "Selecionar produto do estoque..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-(--anchor-width) p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por item, categoria ou lote..." />
                <CommandList>
                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                  <CommandGroup>
                    {produtos.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.item} ${p.categoria} ${p.lote}`}
                        onSelect={() => {
                          setProdutoId(p.id === produtoId ? null : p.id);
                          setComboAberto(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            produtoId === p.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {p.item}
                          <span className="ml-1 text-xs text-muted-foreground">
                            · {p.categoria} · Lote {p.lote || "—"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            p.qtdDisponivel <= 0
                              ? "font-medium text-red-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {p.qtdDisponivel} disp.
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Qtd"
            aria-label="Quantidade"
          />
          <Button onClick={onAdicionar} disabled={adicionando}>
            <Plus className="h-4 w-4" />
            {adicionando ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>

        {selecionado && (
          <p className="text-xs text-muted-foreground">
            Disponível em estoque:{" "}
            <span
              className={cn(
                "font-medium",
                selecionado.qtdDisponivel < Number(quantidade || 0) && "text-red-600"
              )}
            >
              {selecionado.qtdDisponivel} un.
            </span>{" "}
            · Valor de revenda: {brl(selecionado.valorRevenda)}
          </p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Valor Unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum componente vinculado a este contrato.
                </TableCell>
              </TableRow>
            )}
            {itens.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <p className="font-medium">{i.produto.item}</p>
                  <p className="text-xs text-muted-foreground">
                    Lote {i.produto.lote || "—"}
                  </p>
                </TableCell>
                <TableCell>
                  <CategoriaBadge categoria={i.produto.categoria} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {i.quantidade}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {brl(i.produto.valorRevenda)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {brl(i.quantidade * i.produto.valorRevenda)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    aria-label="Remover componente"
                    disabled={removendo === i.id}
                    onClick={() => onRemover(i.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {itens.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {totalUnidades}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">
                  {brl(valorTotal)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}
