/**
 * Tipos PQR donde el referente principal es la recogida (N° I.D 8 dígitos),
 * frente a flujos centrados en guía de entrega (11 dígitos).
 */
export function pqrReferenciaEsRecogida(tipoEvento: string): boolean {
  if (!tipoEvento.trim()) return false;
  const t = tipoEvento.toLowerCase();
  if (t.includes("recogida") || t.includes("recogidas")) return true;
  if (t.includes("recogidas efectivas sin guía")) return true;
  return false;
}
