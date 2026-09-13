import { FC } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar as AvatarPrimitive,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

interface AvatarProps {
  initials: string;
  bg: string;
  color: string;
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Avatar: FC<AvatarProps> = ({
  initials,
  bg,
  color,
  src,
  alt = "",
  size = "md",
  className,
}) => {
  const sizes = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };
  return (
    <AvatarPrimitive className={cn(sizes[size], className)}>
      {src && <AvatarImage src={src} alt={alt} className="object-cover" />}
      <AvatarFallback
        style={{ background: bg, color }}
        className={cn("font-semibold", sizes[size])}
      >
        {initials}
      </AvatarFallback>
    </AvatarPrimitive>
  );
};
