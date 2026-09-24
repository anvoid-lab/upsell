"use client";

import { FC, useEffect, useState } from "react";
import Image from "next/image";
import type { Platform } from "@/types";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { PlatformBadge } from "@/components/shared/platform-badge";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string | null;
  background?: string | null;
  color?: string | null;
  platform?: Platform | null;
  size?: "sm" | "md" | "lg";
  showPlatformBadge?: boolean;
  className?: string;
  fallbackClassName?: string;
  badgeClassName?: string;
}

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-sm",
  lg: "h-10 w-10 text-sm",
} as const;

function isSupportedImageSource(src: string): boolean {
  if (src.startsWith("/") || src.startsWith("data:")) return true;
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      (url.hostname === "cdninstagram.com" ||
        url.hostname.endsWith(".cdninstagram.com"))
    );
  } catch {
    return false;
  }
}

export const UserAvatar: FC<UserAvatarProps> = ({
  src,
  alt = "",
  initials,
  background,
  color,
  platform,
  size = "md",
  showPlatformBadge = true,
  className,
  fallbackClassName,
  badgeClassName,
}) => {
  const [hasImageError, setHasImageError] = useState(false);
  const imageSource = src && isSupportedImageSource(src) ? src : null;

  useEffect(() => {
    setHasImageError(false);
  }, [src]);

  return (
    <div className="relative shrink-0">
      <Avatar className={cn(SIZES[size], className)}>
        {imageSource && !hasImageError && (
          <Image
            src={imageSource}
            alt={alt}
            width={100}
            height={100}
            className="absolute inset-0 z-10 h-full w-full object-cover"
            onError={() => setHasImageError(true)}
          />
        )}
        <AvatarFallback
          style={{
            background: background ?? undefined,
            color: color ?? undefined,
          }}
          className={cn(SIZES[size], fallbackClassName)}
        >
          {initials?.trim() || "?"}
        </AvatarFallback>
      </Avatar>
      {showPlatformBadge && platform && (
        <PlatformBadge
          platform={platform}
          iconOnly
          className={cn(
            "absolute -bottom-1 -right-1 z-20 h-5 w-5 justify-center rounded-full border-2 border-white bg-white p-0 shadow-sm",
            badgeClassName,
          )}
        />
      )}
    </div>
  );
};
