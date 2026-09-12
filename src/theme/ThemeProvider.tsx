import { StatusBarStyle } from "expo-status-bar";
import { PropsWithChildren, createContext, useContext } from "react";
import { useColorScheme } from "react-native";

import { usePreferences } from "../settings/PreferencesProvider";

const lightColors = {
  background: "#F2EFE8",
  text: "#191919",
  mutedText: "#4B4944",
  accent: "#E74E36",
  playing: "#F3B63F",
  surface: "#FFFDF8",
  border: "#191919",
  shadow: "#191919",
} as const;

const darkColors = {
  background: "#171716",
  text: "#F7F2E8",
  mutedText: "#C9C3B8",
  accent: "#F0644E",
  playing: "#F3B63F",
  surface: "#292826",
  border: "#F7F2E8",
  shadow: "#000000",
} as const;

interface Theme {
  colors: typeof lightColors | typeof darkColors;
  isDark: boolean;
  statusBarStyle: StatusBarStyle;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const { themePreference } = usePreferences();
  const isDark =
    themePreference === "dark" ||
    (themePreference === "system" && systemScheme === "dark");
  const value: Theme = {
    colors: isDark ? darkColors : lightColors,
    isDark,
    statusBarStyle: isDark ? "light" : "dark",
  };

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return theme;
}
