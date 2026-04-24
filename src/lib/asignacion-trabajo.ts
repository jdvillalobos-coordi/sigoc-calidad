import type { UsuarioApp } from "@/types";

export type FiltroAsignacionTrabajo =
  | "todos"
  | "sin_asignar"
  | "mis_asignados"
  | `usuario:${string}`;

export type OperadorAsignacion = { id: string; nombre: string; cargo: string };

export interface ItemAsignable {
  asignadoA?: { id: string; nombre: string; cargo?: string };
}

export const OPERADORES_ASIGNACION_BASE: OperadorAsignacion[] = [
  { id: "u-sandra", nombre: "Sandra Herrera", cargo: "Coordinadora Nacional de Calidad" },
  { id: "u-jorge", nombre: "Jorge Castaño", cargo: "Interventor de Faltantes" },
  { id: "u-ana", nombre: "Ana Martínez", cargo: "Analista de Seguridad" },
  { id: "u-diego", nombre: "Diego Ramírez", cargo: "Gestor de Calidad" },
  { id: "u-lucia", nombre: "Lucía Gómez", cargo: "Agente Logístico" },
  { id: "u-nicolas", nombre: "Nicolás Ríos Castaño", cargo: "Contralor Nacional de Calidad" },
];

export function crearOperadoresAsignacion<T extends ItemAsignable>(
  items: T[],
  usuarioLogueado: UsuarioApp
): OperadorAsignacion[] {
  const map = new Map<string, OperadorAsignacion>();
  OPERADORES_ASIGNACION_BASE.forEach((op) => map.set(op.id, op));
  map.set(usuarioLogueado.id, {
    id: usuarioLogueado.id,
    nombre: usuarioLogueado.nombre,
    cargo: usuarioLogueado.cargo,
  });
  items.forEach((item) => {
    if (!item.asignadoA) return;
    map.set(item.asignadoA.id, {
      id: item.asignadoA.id,
      nombre: item.asignadoA.nombre,
      cargo: item.asignadoA.cargo ?? "Operador",
    });
  });
  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function cumpleFiltroAsignacion<T extends ItemAsignable>(
  item: T,
  filtro: FiltroAsignacionTrabajo,
  usuarioId: string
): boolean {
  if (filtro === "todos") return true;
  if (filtro === "sin_asignar") return !item.asignadoA;
  if (filtro === "mis_asignados") return item.asignadoA?.id === usuarioId;
  if (filtro.startsWith("usuario:")) return item.asignadoA?.id === filtro.slice("usuario:".length);
  return true;
}

export function labelFiltroAsignacion(
  filtro: FiltroAsignacionTrabajo,
  operadores: OperadorAsignacion[]
): string {
  if (filtro === "todos") return "Todos los asignados";
  if (filtro === "sin_asignar") return "Sin asignar";
  if (filtro === "mis_asignados") return "Mis asignados";
  if (filtro.startsWith("usuario:")) {
    return operadores.find((op) => op.id === filtro.slice("usuario:".length))?.nombre ?? "Usuario";
  }
  return filtro;
}

export function contarCargaAsignacion<T extends ItemAsignable>(
  items: T[],
  operadores: OperadorAsignacion[],
  esPendiente: (item: T) => boolean
): Array<{ id: string; nombre: string; count: number }> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    if (!esPendiente(item) || !item.asignadoA) return;
    counts.set(item.asignadoA.id, (counts.get(item.asignadoA.id) ?? 0) + 1);
  });
  return operadores
    .map((op) => ({ id: op.id, nombre: op.nombre, count: counts.get(op.id) ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.nombre.localeCompare(b.nombre));
}
