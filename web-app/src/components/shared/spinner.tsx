import { FC } from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps { className?: string; }

export const Spinner: FC<SpinnerProps> = ({ className }) => (
  <div className={cn("w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin", className)} />
);
