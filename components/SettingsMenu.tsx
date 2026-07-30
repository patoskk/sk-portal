"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SettingsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // avisos de lecciones nuevas: se carga recién al abrir el menú (no encarece la página)
  const [avisos, setAvisos] = useState<boolean | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "light" | "dark") || "light");
  }, []);

  useEffect(() => {
    if (!open || avisos !== null) return;
    void (async () => {
      const res = await fetch("/api/notify/prefs");
      if (!res.ok) return;
      const d = (await res.json()) as { role: string | null; notify_lessons: boolean | null };
      setEsAdmin(d.role === "admin");
      // null = el usuario no está asociado a un cliente: no mostramos el toggle
      if (d.notify_lessons !== null) setAvisos(d.notify_lessons);
    })();
  }, [open, avisos]);

  async function toggleAvisos() {
    const nuevo = !avisos;
    setGuardando(true);
    setAvisos(nuevo); // optimista
    const res = await fetch("/api/notify/prefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notify_lessons: nuevo }),
    });
    setGuardando(false);
    if (!res.ok) setAvisos(!nuevo); // volvemos atrás si falló
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function setThemeAndPersist(t: "light" | "dark") {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {}
    setTheme(t);
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const itemBtn = {
    width: "100%",
    textAlign: "left" as const,
    padding: "9px 12px",
    background: "transparent",
    border: 0,
    borderRadius: 8,
    color: "var(--ink)",
    fontSize: 13,
    cursor: "pointer",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Configuración"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--card)",
          color: "var(--ink-soft)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        ⚙ Configuración
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 230,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "var(--shadow-hi)",
            padding: 10,
            zIndex: 30,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--ink-soft)", padding: "4px 12px 8px" }}>TEMA</div>
          <div style={{ display: "flex", gap: 6, padding: "0 8px 8px" }}>
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setThemeAndPersist(t)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: `1px solid ${theme === t ? "var(--accent)" : "var(--line)"}`,
                  background: theme === t ? "var(--tint)" : "transparent",
                  color: "var(--ink)",
                  fontSize: 12.5,
                  fontWeight: theme === t ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {t === "light" ? "☀ Claro" : "🌙 Oscuro"}
              </button>
            ))}
          </div>
          {avisos !== null && !esAdmin && (
            <>
              <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
              <div style={{ fontSize: 11, color: "var(--ink-soft)", padding: "8px 12px 6px" }}>AVISOS</div>
              <button
                onClick={() => void toggleAvisos()}
                disabled={guardando}
                style={{ ...itemBtn, display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
              >
                <span
                  aria-hidden
                  style={{
                    flex: "none",
                    width: 30,
                    height: 17,
                    borderRadius: 99,
                    background: avisos ? "var(--accent)" : "var(--line)",
                    position: "relative",
                    transition: "background .15s ease",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: avisos ? 15 : 2,
                      width: 13,
                      height: 13,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left .15s ease",
                    }}
                  />
                </span>
                Avisarme por mail las lecciones nuevas
              </button>
            </>
          )}
          <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
          <button onClick={logout} style={{ ...itemBtn, color: "var(--warn)", fontWeight: 600 }}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
