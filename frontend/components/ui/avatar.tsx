"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { User } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils/helpers";

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Root ref={ref} className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-accent/20", className)} {...props} />
  ),
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Image>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>>(
  ({ className, ...props }, ref) => <AvatarPrimitive.Image ref={ref} className={cn("h-full w-full object-cover", className)} {...props} />,
);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Fallback>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>>(
  ({ className, children, ...props }, ref) => (
    <AvatarPrimitive.Fallback ref={ref} className={cn("flex h-full w-full items-center justify-center bg-accent/20 text-sm font-medium text-foreground/80", className)} {...props}>
      {children || <User className="h-4 w-4" />}
    </AvatarPrimitive.Fallback>
  ),
);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

interface AvatarStackProps {
  users: { id: string | number; name: string; image?: string }[];
  maxVisible?: number;
}

function AvatarStack({ users, maxVisible = 3 }: AvatarStackProps) {
  const visible = users.slice(0, maxVisible);
  const extra = users.length - visible.length;

  return (
    <div className="flex -space-x-3">
      {visible.map((user) => (
        <Avatar key={user.id} className="ring-2 ring-white">
          {user.image ? <AvatarImage src={user.image} alt={user.name} /> : <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>}
        </Avatar>
      ))}
      {extra > 0 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border bg-white text-xs font-medium text-foreground/70">
          +{extra}
        </div>
      )}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarStack };
