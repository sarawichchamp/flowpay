"use client";

import { createContext, useContext } from "react";

export type UITheme = "standard" | "neumorphism" | "flat" | "glass" | "colourful";

export const uiThemeStorageKey = "flowpay-ui-theme";

export const UIThemeContext = createContext<{
  uiTheme: UITheme;
  setUITheme: (theme: UITheme) => void;
}>({
  uiTheme: "standard",
  setUITheme: () => undefined
});

export function useUITheme() {
  return useContext(UIThemeContext);
}
