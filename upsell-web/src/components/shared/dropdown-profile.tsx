"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconBell,
  IconChevronDown,
  IconLogout,
  IconUserCircle,
} from "@icons";
import { signOutAction } from "@/app/(auth)/login/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Availability = "Online" | "Away" | "Offline";

interface DropdownProfileProps {
  businessName: string;
  email: string;
  initials: string;
}

const AVAILABILITY: Array<{
  label: Availability;
  dotClassName: string;
}> = [
  { label: "Online", dotClassName: "bg-emerald-500" },
  { label: "Away", dotClassName: "bg-amber-400" },
  { label: "Offline", dotClassName: "bg-zinc-400" },
];

export function DropdownProfile({
  businessName,
  email,
  initials,
}: DropdownProfileProps) {
  const [availability, setAvailability] = useState<Availability>("Online");
  const [statusOpen, setStatusOpen] = useState(false);
  const currentAvailability = AVAILABILITY.find(
    (item) => item.label === availability,
  )!;

  return (
    <DropdownMenu onOpenChange={(open) => !open && setStatusOpen(false)}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg outline-none transition-colors hover:bg-primary-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-500 text-xs font-semibold text-zinc-50">
            {initials}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={10}
        className="w-[284px] rounded-xl border-zinc-200 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.13)]"
      >
        <div className="flex items-start justify-between gap-3 px-2.5 pb-3 pt-1.5">
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-base font-bold leading-5 text-zinc-800">
              {businessName}
            </p>
            <p className="mt-0.5 truncate text-sm text-zinc-400">{email}</p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              aria-expanded={statusOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setStatusOpen((open) => !open);
              }}
              className="flex h-8 items-center gap-2 rounded-lg border border-zinc-200 px-2.5 text-sm text-zinc-800 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  currentAvailability.dotClassName,
                )}
              />
              {availability}
              <IconChevronDown
                size={16}
                className={cn("transition-transform", statusOpen && "rotate-180")}
              />
            </button>

            {statusOpen && (
              <div className="absolute right-0 top-9 z-10 w-28 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
                {AVAILABILITY.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setAvailability(item.label);
                      setStatusOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    <span className={cn("h-2 w-2 rounded-full", item.dotClassName)} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DropdownMenuItem asChild className="h-10 gap-3 rounded-lg px-2.5 text-sm">
          <Link href="/settings#profile">
            <IconUserCircle size={20} stroke={1.8} />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="h-10 gap-3 rounded-lg px-2.5 text-sm">
          <Link href="/settings#notifications">
            <IconBell size={20} stroke={1.8} />
            Notification settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="mx-0 my-1.5 bg-zinc-200" />

        <form action={signOutAction}>
          <DropdownMenuItem asChild className="h-10 gap-3 rounded-lg px-2.5 text-sm">
            <button type="submit" className="w-full">
              <IconLogout size={20} stroke={1.8} />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
