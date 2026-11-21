import { cn } from "@/lib/utils";
import { DEADLINE_LABEL, type Deadline } from "@/lib/domain";

const tone: Record<string, string> = {
  atrasado: "bg-st-late text-st-late-foreground",
  hoje: "bg-st-today text-st-today-foreground",
  agendado: "bg-st-sched text-st-sched-foreground",
  concluido: "bg-st-done text-st-done-foreground",
  pausado: "bg-st-gray text-st-gray-foreground",
  sem_info: "bg-st-gray text-st-gray-foreground",
};

export function Pill({ kind, children, className }: { kind: keyof typeof tone | string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tone[kind] ?? tone["sem_info"], className)}>
      {children}
    </span>
  );
}

export function DeadlineBadge({ d }: { d: Deadline }) {
  const dot = d === "atrasado" ? "●" : d === "hoje" ? "◐" : d === "agendado" ? "○" : d === "concluido" ? "✓" : "–";
  return <Pill kind={d}>{dot} {DEADLINE_LABEL[d]}</Pill>;
}

/** Diferencia visualmente a origem da informação. */
export function SourceTag({ kind }: { kind: "equipe" | "sugestao" | "compromisso" }) {
  const map = {
    equipe: ["Registrado pela equipe", "bg-secondary text-secondary-foreground"],
    sugestao: ["Sugestão do sistema", "bg-suggest text-suggest-foreground"],
    compromisso: ["Combinado com o aluno", "bg-st-sched text-st-sched-foreground"],
  } as const;
  const [t, c] = map[kind];
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", c)}>{t}</span>;
}
