import type { Evento } from "@/types";

/** Texto para la fila «Novedad reportada por»: nombre legible + id de usuario (desde historial + usuarioRegistro). */
export function textoQuienReportaNovedad(ev: Evento): string | undefined {
  const id = (ev.usuarioRegistro ?? "").trim();
  const ordenado = [...(ev.historial ?? [])].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  const nombre = (ordenado[0]?.usuarioNombre ?? "").trim();
  if (!nombre && !id) return undefined;
  if (nombre && id && nombre.toLowerCase() !== id.toLowerCase()) return `${nombre} / ${id}`;
  return nombre || id;
}
