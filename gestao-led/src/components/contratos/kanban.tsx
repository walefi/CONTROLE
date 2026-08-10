"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, GripVertical, Monitor, Package } from "lucide-react";
import { toast } from "sonner";
import { alterarStatus } from "@/app/actions/contratos";
import { STATUS_LIST, STATUS_META, type Status } from "@/lib/constants";
import { brl, fmtData } from "@/lib/format";
import type { ContratoCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function Kanban({ contratos: initialContratos }: { contratos: ContratoCard[] }) {
  const [contratos, setContratos] = useState(initialContratos);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);
  const dragSourceStatus = useRef<Status | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: number, status: Status) => {
    setDraggedId(id);
    dragSourceStatus.current = status;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
    const el = e.currentTarget as HTMLElement;
    el.classList.add("opacity-40");
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverStatus(null);
    dragSourceStatus.current = null;
    const el = e.currentTarget as HTMLElement;
    el.classList.remove("opacity-40");
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, status: Status) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragOverStatus !== status) {
        setDragOverStatus(status);
      }
    },
    [dragOverStatus],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (!el.contains(e.relatedTarget as Node)) {
      setDragOverStatus(null);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStatus: Status) => {
      e.preventDefault();
      const id = Number(e.dataTransfer.getData("text/plain"));
      const sourceStatus = dragSourceStatus.current;
      setDragOverStatus(null);

      if (!id || !sourceStatus || sourceStatus === targetStatus) return;

      const card = contratos.find((c) => c.id === id);
      if (!card) return;

      setContratos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: targetStatus } : c)),
      );

      const res = await alterarStatus(id, targetStatus);
      if (!res.ok) {
        setContratos((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: sourceStatus } : c)),
        );
        toast.error(res.message);
      } else {
        toast.success(res.message);
      }
    },
    [contratos],
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_LIST.map((status) => {
        const meta = STATUS_META[status];
        const doStatus = contratos.filter((c) => c.status === status);
        const isOver = dragOverStatus === status;
        return (
          <div
            key={status}
            className={cn(
              "w-72 shrink-0 rounded-xl p-3 transition-colors",
              isOver
                ? "bg-blue-600/10 ring-2 ring-blue-500/50"
                : "bg-muted/60",
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              <span className="text-sm font-semibold">{meta.label}</span>
              <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {doStatus.length}
              </span>
            </div>
            <div className="space-y-3">
              {doStatus.map((c) => {
                const isDragging = draggedId === c.id;
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id, c.status)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "group relative cursor-grab active:cursor-grabbing",
                      isDragging && "opacity-40",
                    )}
                  >
                    <Link
                      href={`/contratos/${c.id}`}
                      className={cn("block", isDragging && "pointer-events-none")}
                      tabIndex={isDragging ? -1 : undefined}
                      onClick={(e) => {
                        if (draggedId) e.preventDefault();
                      }}
                    >
                      <Card className="py-0 transition-shadow hover:shadow-md">
                        <CardContent className="space-y-2.5 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {c.anoProv}
                            </span>
                            <span className="text-xs font-semibold">
                              {brl(c.valorTotal)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold leading-snug">{c.cliente}</p>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {c.tamanhoPainel && (
                              <p className="flex items-center gap-1.5">
                                <Monitor className="h-3.5 w-3.5" />
                                {c.tamanhoPainel}
                              </p>
                            )}
                            <p className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Prazo: {fmtData(c.prazo)}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5" />
                              {c.totalItens} unidade(s) vinculada(s)
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="h-4 w-4 text-zinc-500" />
                    </div>
                  </div>
                );
              })}
              {doStatus.length === 0 && (
                <p
                  className={cn(
                    "rounded-lg border border-dashed p-4 text-center text-xs transition-colors",
                    isOver
                      ? "border-blue-400 text-blue-400"
                      : "border-zinc-700 text-muted-foreground",
                  )}
                >
                  {isOver ? "Solte aqui" : "Nenhum contrato"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
