"use client";

import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Boxes,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "sonner";

const LINKS_ADMIN = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/historico", label: "Histórico", icon: History },
];

const LINKS_OPERADOR = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/contratos", label: "Contratos", icon: FileText },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
        <MonitorPlay className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">LED Manager</p>
        <p className="text-xs text-zinc-400">Estoque & Contratos · Firebase</p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const links = isAdmin ? LINKS_ADMIN : LINKS_OPERADOR;

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map((link) => (
        <NavLink
          key={link.href}
          to={link.href}
          end={link.href === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white",
              isActive && "bg-zinc-800 text-white"
            )
          }
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserInfo() {
  const { user, perfil, logout } = useAuth();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-zinc-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {user?.email || "Usuário"}
          </p>
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <ShieldCheck className="h-3 w-3" />
            {perfil}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-zinc-400 hover:text-white"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}

export function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  const ehImpressao = pathname.endsWith("/imprimir");

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex",
          "print:lg:hidden"
        )}
      >
        <div className="flex h-16 items-center border-b border-zinc-800 px-4">
          <Brand />
        </div>
        <div className="flex-1 py-4">
          <NavLinks />
        </div>
        <div className="border-t border-zinc-800 p-4">
          <UserInfo />
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden print:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          onClick={() => setMenuAberto(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold">LED Manager</span>
      </header>

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="gap-0 border-zinc-800 bg-zinc-950 text-white">
          <SheetHeader className="border-b border-zinc-800 p-4">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Brand />
          </SheetHeader>
          <div className="flex-1 py-4">
            <NavLinks onNavigate={() => setMenuAberto(false)} />
          </div>
          <div className="border-t border-zinc-800 p-4">
            <UserInfo />
          </div>
        </SheetContent>
      </Sheet>

      <main
        className={cn(
          "min-h-screen bg-muted/40 pt-14 lg:pl-64 lg:pt-0",
          "print:min-h-0 print:bg-white print:pt-0 lg:print:pl-0",
          ehImpressao && "bg-muted/40"
        )}
      >
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8 print:max-w-none print:p-0">
          <Outlet />
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </>
  );
}
