"use client";

import Link from "next/link";
import { Button } from "@/components/cpa/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/cpa/ui/dropdown-menu";
import { User, LogOut, Settings } from "lucide-react";

interface UserMenuProps {
  userName: string;
  userEmail?: string;
}

export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const handleLogout = async () => {
    await fetch("/api/ads/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label="תפריט משתמש"
        >
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">{userName}</span>
            {userEmail && (
              <span className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {userEmail}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 sm:hidden">
          <p className="text-sm font-medium">{userName}</p>
          {userEmail && (
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          )}
        </div>
        <DropdownMenuSeparator className="sm:hidden" />
        <DropdownMenuItem asChild>
          <Link href="/ads/settings" className="gap-2 cursor-pointer">
            <Settings className="h-4 w-4" aria-hidden="true" />
            הגדרות
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive cursor-pointer focus:text-destructive"
          onClick={handleLogout}
          aria-label="התנתק"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          התנתק
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
