"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

/** El tema real lo aplicó el script de app/layout.tsx antes de pintar; acá solo
 *  se sincroniza el estado de React con lo que ya está en el DOM. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || "light");
  }, []);

  function apply(t: Theme) {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {}
    setTheme(t);
  }

  return (
    <div className="segmented" role="group" aria-label="Tema de la interfaz">
      <button
        type="button"
        className={theme === "light" ? "is-on" : ""}
        aria-pressed={theme === "light"}
        onClick={() => apply("light")}
      >
        <Sun size={15} strokeWidth={1.9} /> Claro
      </button>
      <button
        type="button"
        className={theme === "dark" ? "is-on" : ""}
        aria-pressed={theme === "dark"}
        onClick={() => apply("dark")}
      >
        <Moon size={15} strokeWidth={1.9} /> Oscuro
      </button>
    </div>
  );
}
