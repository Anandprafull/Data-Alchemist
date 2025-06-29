"use client";

import { Moon, Sun, Bot, AlertTriangle, Home } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState, useEffect } from "react";

interface HeaderProps {
  onValidationToggle: () => void;
  validationPanelOpen: boolean;
  errorCount?: number;
}

export default function Header({
  onValidationToggle,
  validationPanelOpen,
  errorCount = 0,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg transition-all duration-300 bg-background/80 shadow-sm border-b border-border/40">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground">
              <Bot className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">Data Alchemist</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {mounted && theme === "dark" ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-full">
              <Home className="size-4 mr-2" />
              Home
            </Button>
          </Link>

          <Button
            variant={
              validationPanelOpen
                ? "default"
                : errorCount > 0
                ? "destructive"
                : "outline"
            }
            size="sm"
            onClick={onValidationToggle}
            className="rounded-full bg-red-500 text:white hover:none"
          >
            <AlertTriangle className="size-4 mr-2 text-white" />
            Validation Issues
            {errorCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-white/90 text-red-700 text-xs px-1.5 py-0.5 min-w-[20px] h-5"
              >
                {errorCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
