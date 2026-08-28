import { useEffect, useState } from "react";

const defaults = {
  fontSize: 19,
  fontFamily: "serif",
  width: "normal",
  lineHeight: 1.8,
  theme: "light",
  background: "#fffdf8",
  color: "#242329",
};
const loadSettings = (key) => {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(key)) || {}) };
  } catch {
    return defaults;
  }
};
export default function ReadingSettings({ userId, onChange }) {
  const key = `uh-reader-${userId || "guest"}`;
  const [settings, setSettings] = useState(() => loadSettings(key));
  useEffect(() => {
    onChange(settings);
    localStorage.setItem(key, JSON.stringify(settings));
  }, [key, onChange, settings]);
  const set = (field, value) =>
    setSettings((current) => ({ ...current, [field]: value }));
  const setTheme = (theme) =>
    setSettings((current) => ({
      ...current,
      theme,
      background: theme === "dark" ? "#17131e" : "#fffdf8",
      color: theme === "dark" ? "#f7f2ff" : "#242329",
    }));
  return (
    <details className="reading-settings-panel">
      <summary>Preferencias de lectura</summary>
      <div className="reading-settings-grid">
        <label className="reader-control">
          Tamaño{" "}
          <input
            type="range"
            min="15"
            max="28"
            value={settings.fontSize}
            onChange={(event) => set("fontSize", Number(event.target.value))}
          />
        </label>
        <label className="reader-control">
          Tipografía
          <select
            value={settings.fontFamily}
            onChange={(event) => set("fontFamily", event.target.value)}
          >
            <option value="serif">Serif</option>
            <option value="system">Sistema</option>
            <option value="inter">Sans</option>
          </select>
        </label>
        <label className="reader-control">
          Ancho
          <select
            value={settings.width}
            onChange={(event) => set("width", event.target.value)}
          >
            <option value="narrow">Estrecho</option>
            <option value="normal">Normal</option>
            <option value="wide">Amplio</option>
          </select>
        </label>
        <label className="reader-control">
          Interlineado{" "}
          <input
            type="range"
            min="1.4"
            max="2.4"
            step="0.1"
            value={settings.lineHeight}
            onChange={(event) => set("lineHeight", Number(event.target.value))}
          />
        </label>
        <label className="reader-control">
          Modo
          <select
            value={settings.theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>
        <label className="reader-control">
          Fondo{" "}
          <input
            type="color"
            value={settings.background}
            onChange={(event) => set("background", event.target.value)}
          />
        </label>
        <label className="reader-control">
          Texto{" "}
          <input
            type="color"
            value={settings.color}
            onChange={(event) => set("color", event.target.value)}
          />
        </label>
      </div>
    </details>
  );
}
