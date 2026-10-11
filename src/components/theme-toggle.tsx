"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setTheme, useTheme } from "@/lib/use-theme";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(next)}
          aria-label="Toggle theme"
          className="text-muted-foreground"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Switch to {next} mode</TooltipContent>
    </Tooltip>
  );
}
