export type ThemeId = "dark" | "light" | "dim" | "blue" | "midnight" | "forest";
export type AccentId =
  | "purple"
  | "pink"
  | "cyan"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "orange"
  | "custom";

export interface ThemeColors {
  surface: string;
  surface1: string;
  surface2: string;
  surface3: string;
  surface4: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderHover: string;
  glassFrom: string;
  glassTo: string;
  scrollTrack: string;
  scrollThumb: string;
}

export interface AccentColors {
  primary: string;
  primaryHover: string;
  glow: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  emoji: string;
  colors: ThemeColors;
}

export interface AccentDefinition {
  id: AccentId;
  name: string;
  color: string;
  colors: AccentColors;
}

export const themes: ThemeDefinition[] = [
  {
    id: "dark",
    name: "Dark",
    emoji: "🌑",
    colors: {
      surface: "10 10 15",
      surface1: "17 17 24",
      surface2: "26 26 36",
      surface3: "36 36 50",
      surface4: "46 46 64",
      text: "255 255 255",
      textSecondary: "255 255 255",
      textTertiary: "255 255 255",
      border: "255 255 255",
      borderHover: "255 255 255",
      glassFrom: "255 255 255",
      glassTo: "255 255 255",
      scrollTrack: "10 10 15",
      scrollThumb: "36 36 50",
    },
  },
  {
    id: "light",
    name: "Light",
    emoji: "☀️",
    colors: {
      surface: "250 250 252",
      surface1: "255 255 255",
      surface2: "243 244 246",
      surface3: "229 231 235",
      surface4: "209 213 219",
      text: "17 24 39",
      textSecondary: "55 65 81",
      textTertiary: "107 114 128",
      border: "209 213 219",
      borderHover: "156 163 175",
      glassFrom: "0 0 0",
      glassTo: "0 0 0",
      scrollTrack: "243 244 246",
      scrollThumb: "209 213 219",
    },
  },
  {
    id: "dim",
    name: "Dim",
    emoji: "🌆",
    colors: {
      surface: "21 23 28",
      surface1: "28 31 37",
      surface2: "36 40 48",
      surface3: "47 52 63",
      surface4: "58 64 78",
      text: "230 233 240",
      textSecondary: "200 205 215",
      textTertiary: "150 158 172",
      border: "255 255 255",
      borderHover: "255 255 255",
      glassFrom: "255 255 255",
      glassTo: "255 255 255",
      scrollTrack: "21 23 28",
      scrollThumb: "47 52 63",
    },
  },
  {
    id: "blue",
    name: "Ocean",
    emoji: "🌊",
    colors: {
      surface: "8 12 21",
      surface1: "13 19 33",
      surface2: "19 28 48",
      surface3: "27 39 65",
      surface4: "35 50 82",
      text: "224 234 255",
      textSecondary: "180 200 240",
      textTertiary: "120 145 195",
      border: "100 150 255",
      borderHover: "130 175 255",
      glassFrom: "100 160 255",
      glassTo: "60 120 220",
      scrollTrack: "8 12 21",
      scrollThumb: "27 39 65",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    emoji: "🌌",
    colors: {
      surface: "5 5 15",
      surface1: "10 10 25",
      surface2: "18 16 38",
      surface3: "28 24 55",
      surface4: "38 34 72",
      text: "220 215 255",
      textSecondary: "180 175 230",
      textTertiary: "130 125 180",
      border: "140 120 255",
      borderHover: "170 150 255",
      glassFrom: "140 120 255",
      glassTo: "100 80 220",
      scrollTrack: "5 5 15",
      scrollThumb: "28 24 55",
    },
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌲",
    colors: {
      surface: "8 14 10",
      surface1: "14 22 16",
      surface2: "22 34 26",
      surface3: "32 48 36",
      surface4: "42 62 48",
      text: "220 240 225",
      textSecondary: "180 210 190",
      textTertiary: "120 160 135",
      border: "60 140 80",
      borderHover: "80 170 100",
      glassFrom: "60 180 90",
      glassTo: "40 130 65",
      scrollTrack: "8 14 10",
      scrollThumb: "32 48 36",
    },
  },
];

export const accents: AccentDefinition[] = [
  {
    id: "purple",
    name: "Purple",
    color: "#a855f7",
    colors: {
      primary: "168 85 247",
      primaryHover: "147 51 234",
      glow: "168 85 247",
      gradientFrom: "#7519ff",
      gradientVia: "#a855f7",
      gradientTo: "#ec4899",
    },
  },
  {
    id: "pink",
    name: "Pink",
    color: "#ec4899",
    colors: {
      primary: "236 72 153",
      primaryHover: "219 39 119",
      glow: "236 72 153",
      gradientFrom: "#db2777",
      gradientVia: "#ec4899",
      gradientTo: "#f472b6",
    },
  },
  {
    id: "cyan",
    name: "Cyan",
    color: "#06b6d4",
    colors: {
      primary: "6 182 212",
      primaryHover: "8 145 178",
      glow: "6 182 212",
      gradientFrom: "#0891b2",
      gradientVia: "#06b6d4",
      gradientTo: "#22d3ee",
    },
  },
  {
    id: "green",
    name: "Green",
    color: "#10b981",
    colors: {
      primary: "16 185 129",
      primaryHover: "5 150 105",
      glow: "16 185 129",
      gradientFrom: "#059669",
      gradientVia: "#10b981",
      gradientTo: "#34d399",
    },
  },
  {
    id: "amber",
    name: "Amber",
    color: "#f59e0b",
    colors: {
      primary: "245 158 11",
      primaryHover: "217 119 6",
      glow: "245 158 11",
      gradientFrom: "#d97706",
      gradientVia: "#f59e0b",
      gradientTo: "#fbbf24",
    },
  },
  {
    id: "red",
    name: "Red",
    color: "#ef4444",
    colors: {
      primary: "239 68 68",
      primaryHover: "220 38 38",
      glow: "239 68 68",
      gradientFrom: "#dc2626",
      gradientVia: "#ef4444",
      gradientTo: "#f87171",
    },
  },
  {
    id: "blue",
    name: "Blue",
    color: "#3b82f6",
    colors: {
      primary: "59 130 246",
      primaryHover: "37 99 235",
      glow: "59 130 246",
      gradientFrom: "#2563eb",
      gradientVia: "#3b82f6",
      gradientTo: "#60a5fa",
    },
  },
  {
    id: "orange",
    name: "Orange",
    color: "#f97316",
    colors: {
      primary: "249 115 22",
      primaryHover: "234 88 12",
      glow: "249 115 22",
      gradientFrom: "#ea580c",
      gradientVia: "#f97316",
      gradientTo: "#fb923c",
    },
  },
];

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "168 85 247";
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
}

export function buildCustomAccent(hex: string): AccentColors {
  const rgb = hexToRgb(hex);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (v: number) => Math.max(0, Math.round(v * 0.8));
  const lighten = (v: number) => Math.min(255, Math.round(v * 1.2));
  const hoverRgb = `${darken(r)} ${darken(g)} ${darken(b)}`;
  const darkHex = `#${darken(r).toString(16).padStart(2, "0")}${darken(g).toString(16).padStart(2, "0")}${darken(b).toString(16).padStart(2, "0")}`;
  const lightHex = `#${lighten(r).toString(16).padStart(2, "0")}${lighten(g).toString(16).padStart(2, "0")}${lighten(b).toString(16).padStart(2, "0")}`;

  return {
    primary: rgb,
    primaryHover: hoverRgb,
    glow: rgb,
    gradientFrom: darkHex,
    gradientVia: hex,
    gradientTo: lightHex,
  };
}
