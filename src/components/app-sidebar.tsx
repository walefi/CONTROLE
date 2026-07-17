"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FileText, LayoutDashboard, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/contratos", label: "Contratos", icon: FileText },
];

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
        <MonitorPlay className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">LED Manager</p>
        <p className="text-xs text-zinc-400">Estoque & Contratos</p>
      </div>
    </div>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_LINKS.map((link) => {
        const ativo =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white",
              ativo && "bg-zinc-800 text-white"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex print:lg:hidden">
      <div className="flex h-16 items-center border-b border-zinc-800 px-4">
        <Brand />
      </div>
      <div className="flex-1 py-4">
        <NavLinks />
      </div>
      <div className="border-t border-zinc-800 p-4">
        <p className="text-xs text-zinc-500">v1.0 · Protótipo local</p>
      </div>
    </aside>
  );
}
