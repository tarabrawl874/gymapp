import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  header: string;
  button: string;
  modalBg: string;
  placeholder: string;
  inputBorder: string;
}

const lightColors: ThemeColors = {
  background: "#f0f0f0",
  card: "#ffffff",
  text: "#000000",
  textSecondary: "#555555",
  border: "#cccccc",
  header: "#1f2937",
  button: "#1f2937",
  modalBg: "rgba(0,0,0,0.4)",
  placeholder: "#999999",
  inputBorder: "#cccccc",
};

const darkColors: ThemeColors = {
  background: "#0f172a",
  card: "#1e293b",
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  border: "#334155",
  header: "#0f172a",
  button: "#3b82f6",
  modalBg: "rgba(0,0,0,0.7)",
  placeholder: "#64748b",
  inputBorder: "#334155",
};

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("@theme");
      if (stored === "dark") setIsDark(true);
    };
    load();
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem("@theme", next ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? darkColors : lightColors }}>
      {children}
    </ThemeContext.Provider>
  );
}
