import { useEffect, type ReactNode } from "react";

/**
 * LAG is dark-only. The provider is kept so existing imports keep working,
 * but it always forces the dark theme and there is no toggle.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    window.localStorage.removeItem("lag-theme");
  }, []);

  return <>{children}</>;
}

export function useTheme() {
  return { theme: "dark" as const, toggle: () => {} };
}
