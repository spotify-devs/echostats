"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type ThemeId,
  type AccentId,
  type AccentColors,
  themes,
  accents,
  buildCustomAccent,
} from "@/lib/themes";

interface ThemeContextValue {
  themeId: ThemeId;
  accentId: AccentId;
  customAccentColor: string;
  setTheme: (id: ThemeId) => void;
  setAccent: (id: AccentId) => void;
  setCustomAccentColor: (hex: string) => void;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function applyThemeVars(themeId: ThemeId, accentId: AccentId, customColor: string) {
  const theme = themes.find((t) => t.id === themeId) || themes[0];
  const isLight = themeId === "light";
  const c = theme.colors;

  // Determine accent colors
  let ac: AccentColors;
  if (accentId === "custom" && customColor) {
    ac = buildCustomAccent(customColor);
  } else {
    const accentDef = accents.find((a) => a.id === accentId) || accents[0];
    ac = accentDef.colors;
  }

  const root = document.documentElement;
  const s = root.style;

  // Surface colors
  s.setProperty("--surface", c.surface);
  s.setProperty("--surface-1", c.surface1);
  s.setProperty("--surface-2", c.surface2);
  s.setProperty("--surface-3", c.surface3);
  s.setProperty("--surface-4", c.surface4);

  // Text colors
  s.setProperty("--text", c.text);
  s.setProperty("--text-secondary", c.textSecondary);
  s.setProperty("--text-tertiary", c.textTertiary);

  // Border
  s.setProperty("--border", c.border);
  s.setProperty("--border-hover", c.borderHover);

  // Glass
  s.setProperty("--glass-from", c.glassFrom);
  s.setProperty("--glass-to", c.glassTo);

  // Scrollbar
  s.setProperty("--scroll-track", c.scrollTrack);
  s.setProperty("--scroll-thumb", c.scrollThumb);

  // Accent
  s.setProperty("--accent", ac.primary);
  s.setProperty("--accent-hover", ac.primaryHover);
  s.setProperty("--accent-glow", ac.glow);
  s.setProperty("--accent-gradient-from", ac.gradientFrom);
  s.setProperty("--accent-gradient-via", ac.gradientVia);
  s.setProperty("--accent-gradient-to", ac.gradientTo);

  // Light mode adjustments
  const borderOpacity = isLight ? "0.15" : "0.1";
  const glassOpacity = isLight ? "0.06" : "0.05";
  const glassToOpacity = isLight ? "0.03" : "0.02";
  s.setProperty("--border-opacity", borderOpacity);
  s.setProperty("--glass-opacity", glassOpacity);
  s.setProperty("--glass-to-opacity", glassToOpacity);

  // Toggle class for light mode conditional styling
  if (isLight) {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("dark");
  const [accentId, setAccentId] = useState<AccentId>("purple");
  const [customAccentColor, setCustomAccentColorState] = useState("#a855f7");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("echostats-theme");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.themeId) setThemeId(parsed.themeId);
        if (parsed.accentId) setAccentId(parsed.accentId);
        if (parsed.customAccentColor) setCustomAccentColorState(parsed.customAccentColor);
      } catch {}
    }
    setMounted(true);
  }, []);

  // Apply CSS vars whenever theme/accent changes
  useEffect(() => {
    if (!mounted) return;
    applyThemeVars(themeId, accentId, customAccentColor);
    localStorage.setItem(
      "echostats-theme",
      JSON.stringify({ themeId, accentId, customAccentColor })
    );
  }, [themeId, accentId, customAccentColor, mounted]);

  const setTheme = useCallback((id: ThemeId) => setThemeId(id), []);
  const setAccent = useCallback((id: AccentId) => setAccentId(id), []);
  const setCustomAccentColor = useCallback(
    (hex: string) => {
      setCustomAccentColorState(hex);
      setAccentId("custom");
    },
    []
  );

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          themeId,
          accentId,
          customAccentColor,
          setTheme,
          setAccent,
          setCustomAccentColor,
          isLight: themeId === "light",
        }}
      >
        <div style={{ visibility: "hidden" }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        accentId,
        customAccentColor,
        setTheme,
        setAccent,
        setCustomAccentColor,
        isLight: themeId === "light",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
