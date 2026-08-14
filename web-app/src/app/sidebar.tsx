"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC, useState } from "react";
import { Inbox, BarChart2, Settings, PanelLeftOpen, PanelLeftClose, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { signOutAction } from "@/app/(auth)/login/actions";

interface NavItem { label: string; icon: LucideIcon; href: string; count?: number; }

interface AppSidebarProps {
  unreadCount: number;
  email: string;
  businessName: string;
}

export const AppSidebar: FC<AppSidebarProps> = ({ unreadCount, email, businessName }) => {
  const initials = businessName.slice(0, 2).toUpperCase();
  const NAV_ITEMS: NavItem[] = [
    { label: "All messages", icon: Inbox,    href: "/inbox", count: unreadCount },
    { label: "Analytics",    icon: BarChart2, href: "/analytics" },
  ];
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={300}>
      <aside className={cn(
        "flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col transition-all duration-200",
        collapsed ? "w-[52px]" : "w-[200px]"
      )}>
        {/* Logo + toggle */}
        <div className="h-[52px] px-3 flex items-center justify-between border-b border-zinc-200 flex-shrink-0 gap-2">
          <div className={cn(
            "flex items-center gap-2 min-w-0 overflow-hidden transition-all duration-200",
            collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100"
          )}>
            <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <span className="text-sm font-semibold text-zinc-900 whitespace-nowrap">VendAI</span>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors flex-shrink-0 text-zinc-400 hover:text-zinc-600"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 py-2 overflow-hidden">
          {NAV_ITEMS.map(item => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <div key={item.href} className="px-1.5 mb-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-lg transition-colors",
                        collapsed ? "justify-center h-8 w-8 mx-auto" : "justify-between px-2 py-1.5",
                        isActive ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                      )}
                    >
                      <span className={cn("flex items-center", collapsed ? "" : "gap-2")}>
                        <span className="relative">
                          <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-zinc-800" : "text-zinc-400")} />
                          {collapsed && item.count !== undefined && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500" />
                          )}
                        </span>
                        {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                      </span>
                      {!collapsed && item.count !== undefined && (
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums",
                          isActive ? "bg-zinc-200 text-zinc-700" : "bg-zinc-100 text-zinc-500"
                        )}>
                          {item.count}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              </div>
            );
          })}
        </nav>

        {/* Footer: Settings */}
        <div className="border-t border-zinc-100 p-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center rounded-lg transition-colors",
                  collapsed ? "justify-center h-8 w-8 mx-auto" : "px-2 py-1.5 gap-2",
                  pathname.startsWith("/settings") ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                )}
              >
                <Settings className={cn("w-4 h-4 flex-shrink-0", pathname.startsWith("/settings") ? "text-zinc-800" : "text-zinc-400")} />
                {!collapsed && <span className="text-sm">Settings</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>
        </div>

        {/* User row */}
        <div className="border-t border-zinc-100 p-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("flex items-center gap-2 px-1 py-1 rounded-lg overflow-hidden", collapsed ? "justify-center" : "")}>
                <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-600 flex-shrink-0">
                  {initials}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 truncate leading-none">{businessName}</p>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{email}</p>
                    </div>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        title="Sair"
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{email}</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};
