import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ExternalLink } from "lucide-react";
import { processQuery, generateInsights, type ChatMessage, type ChatEntity } from "@/lib/chatEngine";
import { useApp } from "@/context/AppContext";

const SUGERENCIAS = [
  "Dame un resumen general",
  "Eventos abiertos en Medellín",
  "Busca a Carlos Pérez",
  "¿Qué alertas IA hay?",
  "Guía 19900293001",
  "Personas bloqueadas",
  "Estado de evidencias",
  "Vehículo PLT-456",
  "Eventos vencidos",
  "RCE pendientes",
];

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const processed: React.ReactNode = line;

    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="font-semibold mt-2 mb-1">{line.replace(/\*\*/g, "")}</p>;
    }

    const parts: React.ReactNode[] = [];
    const remaining = line;
    let partKey = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = boldRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={partKey++}>{remaining.slice(lastIndex, match.index)}</span>);
      }
      parts.push(<strong key={partKey++}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      parts.push(<span key={partKey++}>{remaining.slice(lastIndex)}</span>);
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

const severityStyles = {
  critica: { bg: "bg-red-50 border-red-200", icon: "text-red-500", dot: "bg-red-500" },
  alta: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-500", dot: "bg-amber-500" },
  media: { bg: "bg-blue-50 border-blue-200", icon: "text-blue-500", dot: "bg-blue-500" },
};

export default function AsistenteChat() {
  const { abrirRegistro, abrirPersona, abrirVehiculo, abrirGuia, abrirTerminal } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const insights = generateInsights();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Insights strip */}
      <div className="flex-shrink-0 px-6 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-coordinadora-blue" />
          <h3 className="text-sm font-semibold text-foreground">Insights principales</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.slice(0, 3).map((insight, i) => {
            const style = severityStyles[insight.severity];
            return (
              <div key={i} className={`rounded-xl border p-3.5 ${style.bg} transition-all hover:shadow-sm`}>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full ${style.dot} mt-1.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                    {insight.entities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {insight.entities.slice(0, 3).map((ent, j) => (
                          <EntityChip key={j} entity={ent} onClick={() => handleEntityClick(ent)} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coordinadora-blue to-blue-700 flex items-center justify-center mb-4 shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Consulta inteligente</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Pregunta lo que necesites sobre eventos, personas, guías, terminales o el estado general del sistema.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGERENCIAS.slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:bg-muted hover:border-coordinadora-blue/30 transition-all text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

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
                  {msg.entities.map((ent, i) => (
                    <EntityChip key={i} entity={ent} onClick={() => handleEntityClick(ent)} />
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

      {/* Suggestions bar when chatting */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 px-6 pb-1">
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
      )}

      {/* Input area */}
      <div className="flex-shrink-0 px-6 pb-4 pt-2">
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2 shadow-sm focus-within:border-coordinadora-blue/50 focus-within:ring-2 focus-within:ring-coordinadora-blue/10 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta sobre eventos, personas, guías..."
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
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
          Consulta operando sobre datos del sistema en tiempo real
        </p>
      </div>
    </div>
  );
}
