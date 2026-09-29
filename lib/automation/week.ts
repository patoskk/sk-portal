// La semana de la lección, en hora argentina. El lunes a las 18 se ofrecen los temas y la semana va de
// lunes a domingo: la clave es la fecha del lunes (YYYY-MM-DD).
const AR_OFFSET_H = -3; // Argentina no tiene horario de verano

export function arNow(now = new Date()): Date {
  return new Date(now.getTime() + AR_OFFSET_H * 3600e3);
}

export function weekStartAR(now = new Date()): string {
  const d = arNow(now);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** 'YYYY-MM' del mes anterior al actual (hora argentina). */
export function previousPeriodAR(now = new Date()): string {
  const d = arNow(now);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/** [desde, hasta) como fechas YYYY-MM-DD, y el nombre del mes ("septiembre"). */
export function periodRange(period: string): { from: string; to: string; label: string } | null {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const to = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
  return { from: `${period}-01`, to, label: MESES[mo - 1] };
}
