"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Brand, NavLinks } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden print:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="gap-0 border-zinc-800 bg-zinc-950 text-white"
        >
          <SheetHeader className="border-b border-zinc-800 p-4">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Brand />
          </SheetHeader>
          <div className="py-4">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <span className="text-sm font-semibold">LED Manager</span>
    </header>
  );
}
