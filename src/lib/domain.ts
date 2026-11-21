// Regras de negócio e rótulos da Autoescola Pinheirense.
export const TZ = "America/Sao_Paulo";

export const THEORY: Record<string, string> = {
  nunca_fez: "Nunca fez",
  reprovado: "Reprovado",
  aprovado: "Aprovado",
};
export const FOLLOWUP: Record<string, string> = {
  a_contatar: "A contatar",
  em_preparacao: "Em preparação",
  sem_retorno: "Sem retorno",
  pausa_solicitada: "Pausa solicitada",
  concluido: "Concluído",
};
export const STUDY: Record<string, string> = {
  nao_informado: "Não informado",
  diz_estudando: "Diz estar estudando",
  confirmado: "Estudo confirmado",
  nao_estuda: "Não está estudando",
};
export const PLATFORM: Record<string, string> = {
  nao_informado: "Não informado",
  sim: "Sim",
  nao: "Não",
};
export const DIFFICULTIES: Record<string, string> = {
  acesso_plataforma: "Acesso à plataforma",
  documento_pendente: "Documento pendente",
  questoes: "Dificuldade em questões",
  falta_tempo: "Falta de tempo",
  financeira: "Dificuldade financeira",
  outra: "Outra",
};
export const CHANNELS: Record<string, string> = {
  ligacao: "Ligação",
  audio: "Áudio",
  presencial: "Presencial",
  mensagem: "Mensagem individual",
};
export const RESULTS: Record<string, string> = {
  conversou: "Conversou",
  nao_atendeu: "Não atendeu",
  sem_resposta: "Sem resposta",
  pediu_retorno: "Pediu retorno",
};
export const DECISIONS: Record<string, string> = {
  pausa: "Pediu pausa",
  desistencia: "Desistiu",
  nao_contatar: "Pediu para não receber contatos",
};
export const EXAM_RESULTS: Record<string, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  faltou: "Faltou",
};

export const label = (map: Record<string, string>, v?: string | null) =>
  v ? (map[v] ?? v) : "Não informado";

/** Hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function todaySP(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}
export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function fmtDateTime(ts?: string | null): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}
/** Valor para <input type="datetime-local"> no horário de São Paulo. */
export function nowLocalInput(now: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
}
/** Converte o valor local de São Paulo (UTC-3, sem horário de verão) em ISO. */
export function localInputToISO(v: string): string {
  return new Date(v + ":00-03:00").toISOString();
}

export const onlyDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

/** Login definido pelo gestor: sem "@" vira um e-mail interno. */
export const LOGIN_DOMAIN = "equipe.pinheirense.app";
export function loginToEmail(login: string): string {
  const l = login.trim().toLowerCase();
  return l.includes("@") ? l : `${l}@${LOGIN_DOMAIN}`;
}
/** Textos de contatos são gravados em caixa alta. */
export const upper = (v?: string | null) => (v ?? "").trim().toLocaleUpperCase("pt-BR");
export function fmtCPF(v?: string | null): string {
  const d = onlyDigits(v);
  if (d.length !== 11) return v || "—";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
export function fmtPhone(v?: string | null): string {
  const d = onlyDigits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "—";
}

export type StudentLike = {
  theory_status: string;
  followup_status: string;
  study_status?: string | null;
  platform_access?: string | null;
  main_difficulty?: string | null;
  next_action?: string | null;
  next_return_date?: string | null;
  exam_date?: string | null;
  direction_referral?: string | null;
  last_contact_at?: string | null;
};

export type Deadline = "atrasado" | "hoje" | "agendado" | "concluido" | "pausado" | "sem_info";
export const DEADLINE_LABEL: Record<Deadline, string> = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  agendado: "Agendado",
  concluido: "Concluído",
  pausado: "Pausado",
  sem_info: "Sem data",
};

export function deadlineOf(s: StudentLike, today = todaySP()): Deadline {
  if (s.followup_status === "pausa_solicitada") return "pausado";
  if (s.followup_status === "concluido" && s.direction_referral !== "pendente") return "concluido";
  if (!s.next_return_date) return "sem_info";
  if (s.next_return_date < today) return "atrasado";
  if (s.next_return_date === today) return "hoje";
  return "agendado";
}

const DIFFICULTY_SUGGESTION: Record<string, string> = {
  acesso_plataforma: "Ajudar a acessar a plataforma",
  documento_pendente: "Conferir qual documento falta e combinar retorno",
  questoes: "Encaminhar os assuntos à professora Priscila",
  falta_tempo: "Combinar uma pequena atividade que caiba na rotina",
  financeira: "Entender a despesa que impede a continuidade e encaminhar à gestão",
};

/**
 * Sugestão de próximo passo. É apenas uma sugestão: a equipe revisa antes de confirmar.
 * `lastResult` é o resultado do contato que está sendo registrado (se houver).
 */
export function suggestNext(
  s: StudentLike,
  opts: { lastResult?: string | null; difficulty?: string | null; today?: string } = {},
): string {
  const today = opts.today ?? todaySP();
  if (s.theory_status === "aprovado" && s.direction_referral === "pendente")
    return "Conferir pendências e encaminhar à direção";
  if (opts.lastResult === "nao_atendeu" || opts.lastResult === "sem_resposta")
    return "Tentar contato pessoal em outro dia e horário";
  if (s.exam_date && s.exam_date >= today)
    return "Conferir preparação, documentação e organização da ida";
  const diff = opts.difficulty || s.main_difficulty;
  if (diff && DIFFICULTY_SUGGESTION[diff]) return DIFFICULTY_SUGGESTION[diff];
  if (s.platform_access === "nao") return "Ajudar a acessar a plataforma";
  if (s.theory_status === "reprovado") return "Entender dificuldades e organizar nova preparação";
  if (s.study_status === "diz_estudando")
    return "Perguntar como está estudando e combinar uma atividade inicial";
  if (!s.last_contact_at) return "Fazer primeiro contato e identificar objetivo e dificuldade";
  return "Combinar a próxima atividade de estudo e uma data de retorno";
}

/** Taxa de aprovação = aprovados ÷ (aprovados + reprovados). Faltas não entram. */
export function approvalRate(results: string[]): number | null {
  const a = results.filter((r) => r === "aprovado").length;
  const r = results.filter((x) => x === "reprovado").length;
  if (a + r === 0) return null;
  return a / (a + r);
}

export function pct(correct: number, total: number): number | null {
  if (!total) return null;
  return Math.round((correct / total) * 1000) / 10;
}
