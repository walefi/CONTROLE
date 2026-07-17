"use client";

import { useState } from "react";
import { toast } from "sonner";
import { atualizarContrato } from "@/app/actions/contratos";
import { dateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  contrato: {
    id: number;
    anoProv: string;
    cliente: string;
    tamanhoPainel: string;
    prazo: Date | null;
    observacoes: string;
  };
};

export function ContratoForm({ contrato }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    anoProv: contrato.anoProv,
    cliente: contrato.cliente,
    tamanhoPainel: contrato.tamanhoPainel,
    prazo: dateInputValue(contrato.prazo),
    observacoes: contrato.observacoes,
  });

  function set(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await atualizarContrato(contrato.id, form);
    setLoading(false);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informações do Contrato</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anoProv">Ano/Prov</Label>
            <Input
              id="anoProv"
              value={form.anoProv}
              onChange={(e) => set("anoProv", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input
              id="cliente"
              value={form.cliente}
              onChange={(e) => set("cliente", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tamanhoPainel">Tamanho do Painel</Label>
            <Input
              id="tamanhoPainel"
              value={form.tamanhoPainel}
              onChange={(e) => set("tamanhoPainel", e.target.value)}
              placeholder="Ex: 4,00m x 2,00m"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo</Label>
            <Input
              id="prazo"
              type="date"
              value={form.prazo}
              onChange={(e) => set("prazo", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
