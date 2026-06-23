import { FC } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  bg: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Avatar: FC<AvatarProps> = ({ initials, bg, color, size = "md", className }) => {
  const sizes = { sm: "w-7 h-7 text-[10px]", md: "w-8 h-8 text-xs", lg: "w-10 h-10 text-sm" };
  return (
    <div
      style={{ background: bg, color }}
      className={cn("rounded-full flex items-center justify-center font-semibold flex-shrink-0", sizes[size], className)}
    >
      {initials}
    </div>
  );
};
