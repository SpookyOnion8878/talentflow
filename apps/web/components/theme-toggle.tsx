"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Theme toggle. The initial `dark` class is applied server-side from the
 * `tf_theme` cookie (see app/layout.tsx) so there is no flash; this control
 * only flips the live class + persists the choice for later requests.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Sync the icon with the server-applied theme after hydration.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    document.cookie = `tf_theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-lg p-2 text-text-mid transition-colors hover:bg-surface-2 hover:text-text-hi"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
