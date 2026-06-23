import { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionLabelProps { children: ReactNode; className?: string; }

export const SectionLabel: FC<SectionLabelProps> = ({ children, className }) => (
  <p className={cn("text-[10px] font-semibold text-zinc-400 uppercase tracking-widest", className)}>
    {children}
  </p>
);
