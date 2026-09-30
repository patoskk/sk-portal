// Fechas en hora argentina. La semana de la lección va de lunes a domingo: la clave es la fecha del lunes.
const AR_OFFSET_H = -3; // Argentina no tiene horario de verano

export function arNow(now = new Date()): Date {
  return new Date(now.getTime() + AR_OFFSET_H * 3600e3);
}

/** Hoy, YYYY-MM-DD, en hora argentina. */
export function todayAR(now = new Date()): string {
  return arNow(now).toISOString().slice(0, 10);
}

export function weekStartAR(now = new Date()): string {
  const d = arNow(now);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
