import React, { useState, useRef, useEffect } from "react";
import { alertasIA, eventos } from "@/data/mockData";
import { SeveridadBadge } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import type { AlertaIA } from "@/types";
import { Send, Bot, User, ExternalLink, X } from "lucide-react";
import { processQuery, type ChatMessage, type ChatEntity } from "@/lib/chatEngine";

const METRICAS = [
  { label: "5 personas en más de 2 registros este mes", tipo: "reincidencia_persona" },
  { label: "2 terminales con incremento >30% en faltantes", tipo: "terminal_anomala" },
  { label: "3 clientes con más de 3 reclamaciones en 30 días", tipo: "cliente_sospechoso" },
];

const SUGERENCIAS = [
  "Dame un resumen general",
  "Eventos abiertos en Medellín",
  "Busca a Carlos Pérez",
  "Guía 19900293001",
  "Personas bloqueadas",
  "Eventos vencidos",
];

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const processed: React.ReactNode = line;

    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="font-semibold mt-2 mb-1">{line.replace(/\*\*/g, "")}</p>;
    }

    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let partKey = 0;
    let match: RegExpExecArray | null;

    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={partKey++}>{line.slice(lastIndex, match.index)}</span>);
      }
      parts.push(<strong key={partKey++}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(<span key={partKey++}>{line.slice(lastIndex)}</span>);
    }

    if (line.startsWith("- ")) {
      return (
        <div key={i} className="flex gap-1.5 ml-2 mt-0.5">
          <span className="text-muted-foreground mt-0.5">•</span>
          <span className="text-sm leading-relaxed">{parts.length > 0 ? parts : line.slice(2)}</span>
        </div>
      );
    }

    if (line === "") return <div key={i} className="h-1.5" />;

    return <p key={i} className="text-sm leading-relaxed">{parts.length > 0 ? parts : processed}</p>;
  });
}

function EntityChip({ entity, onClick }: { entity: ChatEntity; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-coordinadora-blue/10 text-coordinadora-blue hover:bg-coordinadora-blue/20 transition-colors border border-coordinadora-blue/20"
    >
      <ExternalLink className="w-3 h-3" />
      {entity.label}
    </button>
  );
}

export default function IAPage() {
  const { abrirPersona, abrirVehiculo, abrirRegistro, abrirGuia, abrirTerminal, abrirResolucionAcumulativa } = useApp();
  const [filtroSeveridad, setFiltroSeveridad] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [alertas, setAlertas] = useState<AlertaIA[]>(alertasIA);
  const [metricaFiltro, setMetricaFiltro] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtradas = alertas
    .filter((a) => filtroSeveridad === "todos" || a.severidad === filtroSeveridad)
    .filter((a) => filtroEstado === "todos" || a.estado === filtroEstado)
    .filter((a) => !metricaFiltro || a.tipo === metricaFiltro);

  function cambiarEstado(id: string, nuevoEstado: AlertaIA["estado"]) {
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, estado: nuevoEstado } : a)));
  }

  function handleEntityClick(entity: ChatEntity) {
    switch (entity.type) {
      case "evento": abrirRegistro(entity.id); break;
      case "persona": abrirPersona(entity.id); break;
      case "vehiculo": abrirVehiculo(entity.id); break;
      case "guia": abrirGuia(entity.id); break;
      case "terminal": abrirTerminal(entity.id); break;
    }
  }

  function handleSend(text?: string) {
    const query = (text || input).trim();
    if (!query) return;

    if (!chatOpen) setChatOpen(true);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const result = processQuery(query);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.content,
        entities: result.entities,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 400 + Math.random() * 600);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function closeChat() {
    setChatOpen(false);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Scrollable content: alertas */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-5xl mx-auto p-6">
          <h1 className="text-xl font-bold mb-1">Asistente IA</h1>
          <p className="text-sm text-muted-foreground mb-6">Patrones detectados automáticamente en los registros</p>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {METRICAS.map((m) => (
              <button
                key={m.tipo}
                onClick={() => setMetricaFiltro(metricaFiltro === m.tipo ? null : m.tipo)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  metricaFiltro === m.tipo
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-card hover:shadow-card-hover"
                }`}
              >
                <div className="text-2xl mb-2">🤖</div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-1">Click para filtrar alertas</p>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-base font-semibold flex-1">Alertas activas</h2>
            <select className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none" value={filtroSeveridad} onChange={(e) => setFiltroSeveridad(e.target.value)}>
              <option value="todos">Todas las severidades</option>
              <option value="critica">🔴 Crítica</option>
              <option value="alta">🟡 Alta</option>
              <option value="media">🔵 Media</option>
              <option value="baja">🟢 Baja</option>
            </select>
            <select className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="nueva">Nueva</option>
              <option value="revisada">Revisada</option>
              <option value="descartada">Descartada</option>
            </select>
            {metricaFiltro && (
              <button onClick={() => setMetricaFiltro(null)} className="text-xs text-coordinadora-blue underline">Limpiar filtro</button>
            )}
          </div>

          {/* Lista de alertas */}
          <div className="space-y-4">
            {filtradas.map((a) => {
              let recomendacionIA: string | null = null;
              let eventosCount = 0;
              if (a.tipo === "reincidencia_persona") {
                const evRel = a.fuentesCruzadas.map(id => eventos.find(e => e.id === id)).filter(Boolean);
                eventosCount = evRel.length;
                const tieneGravisima = evRel.some(e => e?.gravedadFalta === "gravisima");
                const categorias = new Set(evRel.map(e => e?.categoria));
                if (tieneGravisima) {
                  recomendacionIA = "Considerar desvinculación (sugerencia — la decisión es del operador)";
                } else if (eventosCount >= 5 || categorias.size > 1) {
                  recomendacionIA = "Considerar proceso disciplinario (sugerencia — la decisión es del operador)";
                } else if (eventosCount >= 3) {
                  recomendacionIA = "Considerar llamado de atención escrito (sugerencia — la decisión es del operador)";
                }
              }

              return (
              <div
                key={a.id}
                className={`border rounded-xl p-5 ${
                  a.severidad === "critica" ? "bg-red-50 border-red-200" :
                  a.severidad === "alta" ? "bg-amber-50 border-amber-200" :
                  "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <SeveridadBadge severidad={a.severidad} />
                      {a.tipo === "reincidencia_persona" && eventosCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex-shrink-0">
                          {eventosCount}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">Detectado: {a.fechaDeteccion}</span>
                      <select
                        value={a.estado}
                        onChange={(e) => cambiarEstado(a.id, e.target.value as AlertaIA["estado"])}
                        className="text-xs border border-border rounded px-2 py-0.5 bg-white focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="nueva">🔔 Nueva</option>
                        <option value="revisada">👁 Revisada</option>
                        <option value="descartada">✓ Descartada</option>
                      </select>
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{a.titulo}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{a.descripcion}</p>
                    {recomendacionIA && (
                      <div className="mb-3 p-2.5 bg-amber-100/60 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-900 font-medium">🤖 {recomendacionIA}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs text-muted-foreground font-medium">Entidades:</span>
                      {a.entidadesInvolucradas.map((e) => (
                        <button
                          key={e.id}
                          className="text-xs text-coordinadora-blue font-medium underline hover:no-underline"
                          onClick={() => {
                            if (e.tipo === "persona") abrirPersona(e.id);
                            else if (e.tipo === "vehiculo") abrirVehiculo(e.id);
                            else if (e.tipo === "terminal") abrirTerminal(e.nombre);
                          }}
                        >
                          {e.nombre}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Fuentes:</span>
                      {a.fuentesCruzadas.map((f) => (
                        <button
                          key={f}
                          onClick={() => abrirRegistro(f)}
                          className="text-xs px-2 py-0.5 rounded-full bg-white border border-border hover:bg-muted transition-colors font-mono"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  {a.tipo === "reincidencia_persona" && a.estado === "nueva" && (
                    <div className="flex-shrink-0">
                      <button onClick={() => abrirResolucionAcumulativa(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium transition-colors shadow-sm whitespace-nowrap">
                        Iniciar resolución
                      </button>
                    </div>
                  )}
                </div>
              </div>
              );
            })}

            {filtradas.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <span className="text-4xl">🤖</span>
                <p className="mt-3 font-medium">No hay alertas con los filtros seleccionados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat panel overlay — slides up when chatOpen */}
      {chatOpen && (
        <div className="absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col bg-background/95 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-coordinadora-blue to-blue-700 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Consulta IA</p>
                <p className="text-[11px] text-muted-foreground">Operando sobre datos de Sigo Calidad en tiempo real</p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-coordinadora-blue to-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-coordinadora-blue text-white rounded-br-md"
                      : "bg-card border border-border rounded-bl-md shadow-sm"
                  }`}
                >
                  <div className={msg.role === "user" ? "text-sm" : "text-sm text-foreground"}>
                    {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                  </div>
                  {msg.entities && msg.entities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/50">
                      {msg.entities.map((ent, j) => (
                        <EntityChip key={j} entity={ent} onClick={() => handleEntityClick(ent)} />
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-coordinadora-blue to-blue-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions in chat */}
          <div className="flex-shrink-0 px-5 pb-1">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {SUGERENCIAS.filter((s) => !messages.some((m) => m.content === s)).slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-2.5 py-1 text-xs rounded-full border border-border bg-card hover:bg-muted whitespace-nowrap transition-colors text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input inside chat panel */}
          <div className="flex-shrink-0 px-5 pb-4 pt-2">
            <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-coordinadora-blue/50 focus-within:ring-2 focus-within:ring-coordinadora-blue/10 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Haz otra pregunta..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-xl bg-coordinadora-blue text-white flex items-center justify-center hover:bg-coordinadora-blue/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed chat input bar at the bottom — always visible */}
      {!chatOpen && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background to-background/0 pt-8 pb-4 px-6">
          <div className="max-w-3xl mx-auto">
            {/* Quick suggestion chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide justify-center">
              {SUGERENCIAS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1 text-xs rounded-full border border-border bg-card hover:bg-muted hover:border-coordinadora-blue/30 whitespace-nowrap transition-all text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2.5 shadow-lg focus-within:border-coordinadora-blue/50 focus-within:ring-2 focus-within:ring-coordinadora-blue/10 transition-all">
              <Bot className="w-5 h-5 text-coordinadora-blue flex-shrink-0" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre eventos, personas, guías, terminales..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl bg-coordinadora-blue text-white flex items-center justify-center hover:bg-coordinadora-blue/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
              Consulta operando sobre datos de Sigo Calidad en tiempo real
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
