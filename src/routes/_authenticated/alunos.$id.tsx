import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useProfiles, useRefreshStudents, useUnits, type Student } from "@/lib/data";
import {
  CHANNELS, DECISIONS, DIFFICULTIES, EXAM_RESULTS, FOLLOWUP, PLATFORM, RESULTS, STUDY, THEORY,
  deadlineOf, fmtCPF, fmtDate, fmtDateTime, fmtPhone, label, onlyDigits, pct, suggestNext, todaySP,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeSelect } from "@/components/app/NativeSelect";
import { DeadlineBadge, Pill, SourceTag } from "@/components/app/StatusBadge";
import { ContactDialog, RescheduleDialog } from "@/components/app/ContactDialog";

export const Route = createFileRoute("/_authenticated/alunos/$id")({
  head: () => ({
    meta: [
      { title: "Cadastro do aluno — Autoescola Pinheirense" },
      { name: "description", content: "Cadastro, histórico de contatos, estudos e provas do aluno." },
      { property: "og:title", content: "Cadastro do aluno — Autoescola Pinheirense" },
      { property: "og:description", content: "Cadastro e histórico do aluno." },
    ],
  }),
  component: StudentPage,
});

function useStudentBundle(id: string) {
  return useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const [s, c, e, m, l, a] = await Promise.all([
        supabase.from("students").select("*").eq("id", id).maybeSingle(),
        supabase.from("contacts").select("*").eq("student_id", id).order("contacted_at", { ascending: false }),
        supabase.from("exam_attempts").select("*").eq("student_id", id).order("exam_date"),
        supabase.from("mock_tests").select("*").eq("student_id", id).order("test_date"),
        supabase.from("lessons").select("*").eq("student_id", id).order("lesson_date"),
        supabase.from("attachments").select("*").eq("student_id", id).order("created_at", { ascending: false }),
      ]);
      if (s.error) throw s.error;
      return { student: s.data, contacts: c.data ?? [], exams: e.data ?? [], mocks: m.data ?? [], lessons: l.data ?? [], files: a.data ?? [] };
    },
  });
}

function StudentPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useStudentBundle(id);
  const { data: units = [] } = useUnits();
  const { data: profiles = [] } = useProfiles();
  const [contactOpen, setContactOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const refresh = useRefreshStudents();

  if (isLoading) return <p>Carregando…</p>;
  if (!data?.student) return <p>Aluno não encontrado. <Link to="/alunos" className="underline">Voltar</Link></p>;
  const s = data.student;
  const profName = (uid?: string | null) => profiles.find((p) => p.id === uid)?.full_name ?? "—";

  async function markReferred(): Promise<void> {
    const { error } = await supabase.from("students").update({ direction_referral: "realizado", next_action: null, next_return_date: null }).eq("id", s.id);
    if (error) return void toast.error(error.message);
    toast.success("Encaminhamento à direção registrado.");
    refresh(s.id);
  }

  return (
    <div className="space-y-4">
      <Link to="/alunos" className="text-sm text-primary underline">← Alunos</Link>
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-primary">{s.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>📞 {fmtPhone(s.phone)}</span>
              <span className="flex items-center gap-1">
                CPF {fmtCPF(s.cpf)}
                {s.cpf && (
                  <button className="rounded border px-1.5 text-xs hover:bg-secondary" onClick={() => { navigator.clipboard.writeText(onlyDigits(s.cpf)); toast.success("CPF copiado (só números)."); }}>
                    copiar números
                  </button>
                )}
              </span>
              <span>{units.find((u) => u.id === s.unit_id)?.name}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill kind={s.theory_status === "aprovado" ? "concluido" : s.theory_status === "reprovado" ? "atrasado" : "sem_info"}>Teórica: {label(THEORY, s.theory_status)}</Pill>
              <Pill kind="agendado">{label(FOLLOWUP, s.followup_status)}</Pill>
              <DeadlineBadge d={deadlineOf(s)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => setContactOpen(true)}>Registrar contato</Button>
            <Button variant="secondary" onClick={() => setReschedOpen(true)}>Reagendar retorno</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-muted p-3 text-sm">
            <SourceTag kind="compromisso" />
            <p className="mt-1 font-semibold">{s.next_action || "Nenhuma ação combinada"}</p>
            <p className="text-muted-foreground">Retorno: {fmtDate(s.next_return_date)}</p>
          </div>
          <div className="rounded-md bg-suggest p-3 text-sm text-suggest-foreground">
            <SourceTag kind="sugestao" />
            <p className="mt-1 font-semibold">{suggestNext(s)}</p>
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <SourceTag kind="equipe" />
            <p className="mt-1">{s.last_contact_summary || "Sem conversa registrada"}</p>
            <p className="text-muted-foreground">Último contato: {fmtDateTime(s.last_contact_at)}</p>
          </div>
        </div>
        {s.theory_status === "aprovado" && s.direction_referral === "pendente" && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-st-done p-3 text-st-done-foreground">
            <span className="font-semibold">✓ Aprovado na teórica — confira pendências e encaminhe à direção.</span>
            <Button size="sm" onClick={markReferred}>Marcar como encaminhado</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="historico">
        <TabsList className="flex-wrap">
          <TabsTrigger value="historico">Histórico ({data.contacts.length})</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="estudos">Estudos e simulados</TabsTrigger>
          <TabsTrigger value="provas">Provas ({data.exams.length})</TabsTrigger>
          <TabsTrigger value="anexos">Anexos ({data.files.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="historico">
          <div className="rounded-lg border bg-card p-4">
            {data.contacts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p>}
            <ol className="relative space-y-4 border-l-2 border-secondary pl-5">
              {data.contacts.map((c) => (
                <li key={c.id} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-accent" />
                  <div className="text-sm font-semibold">{fmtDateTime(c.contacted_at)} · {label(CHANNELS, c.channel)} · {label(RESULTS, c.result)}</div>
                  <div className="text-xs text-muted-foreground">por {c.created_by_name || profName(c.created_by)}</div>
                  {c.report && <p className="mt-1 text-sm">{c.report}</p>}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {c.difficulty && <Pill kind="hoje">Dificuldade: {label(DIFFICULTIES, c.difficulty)}</Pill>}
                    {c.decision && <Pill kind="pausado">{label(DECISIONS, c.decision)}</Pill>}
                    {c.next_action && <span>→ {c.next_action} até {fmtDate(c.return_date)}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>
        <TabsContent value="cadastro"><EditForm s={s} /></TabsContent>
        <TabsContent value="estudos"><Studies s={s} mocks={data.mocks} lessons={data.lessons} /></TabsContent>
        <TabsContent value="provas"><Exams s={s} exams={data.exams} /></TabsContent>
        <TabsContent value="anexos"><Files s={s} files={data.files} /></TabsContent>
      </Tabs>

      <ContactDialog student={s} open={contactOpen} onOpenChange={setContactOpen} />
      <RescheduleDialog student={s} open={reschedOpen} onOpenChange={setReschedOpen} />
    </div>
  );
}

function Field({ label: l, hint, children }: { label: string; hint?: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <Label>{l}</Label>
      {children}
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EditForm({ s }: { s: Student }) {
  const { data: units = [] } = useUnits();
  const { data: profiles = [] } = useProfiles();
  const refresh = useRefreshStudents();
  const { data: me } = useMe();
  const locked = !me?.isGestor;
  const [f, setF] = useState<Student>(s);
  useEffect(() => setF(s), [s]);
  const set = <K extends keyof Student>(k: K, v: Student[K]) => setF((p) => ({ ...p, [k]: v }));
  const str = (v: string) => (v.trim() === "" ? null : v);

  async function save(): Promise<void> {
    if (!f.full_name.trim() || !f.unit_id) return void toast.error("Nome e unidade são obrigatórios.");
    const { error } = await supabase.from("students").update({
      full_name: f.full_name.trim(), cpf: onlyDigits(f.cpf) || null, phone: onlyDigits(f.phone) || null, unit_id: f.unit_id,
      responsible_id: f.responsible_id || null, enrollment_date: f.enrollment_date || null, theory_status: f.theory_status,
      attempts_count: f.attempts_count, followup_status: f.followup_status, study_status: f.study_status,
      platform_access: f.platform_access, main_difficulty: f.main_difficulty || null, next_action: str(f.next_action ?? ""),
      next_return_date: f.next_return_date || null, exam_date: f.exam_date || null, direction_referral: f.direction_referral || null,
      notes: str(f.notes ?? ""),
    }).eq("id", s.id);
    if (error) return void toast.error(error.message);
    toast.success("Cadastro salvo.");
    refresh(s.id);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nome completo *" hint={locked ? "Somente o gestor altera." : undefined}><Input disabled={locked} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
        <Field label="CPF" hint={locked ? "Somente o gestor altera." : "Guardado como texto; zeros à esquerda são mantidos."}><Input disabled={locked} value={f.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" /></Field>
        <Field label="Telefone" hint={locked ? "Somente o gestor altera." : undefined}><Input disabled={locked} value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Unidade *"><NativeSelect value={f.unit_id} onChange={(v) => set("unit_id", v)} options={units.map((u) => [u.id, u.name])} /></Field>
        <Field label="Responsável pelo acompanhamento"><NativeSelect value={f.responsible_id ?? ""} onChange={(v) => set("responsible_id", v || null)} placeholder="Não definido" options={profiles.map((p) => [p.id, p.full_name ?? p.email ?? ""])} /></Field>
        <Field label="Data da matrícula"><Input type="date" value={f.enrollment_date ?? ""} onChange={(e) => set("enrollment_date", e.target.value || null)} /></Field>
        <Field label="Situação na teórica"><NativeSelect value={f.theory_status} onChange={(v) => set("theory_status", v)} options={THEORY} /></Field>
        <Field label="Tentativas (se souber)" hint="Deixe vazio se não souber."><Input type="number" min={0} value={f.attempts_count ?? ""} onChange={(e) => set("attempts_count", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field label="Situação do acompanhamento"><NativeSelect value={f.followup_status} onChange={(v) => set("followup_status", v)} options={FOLLOWUP} /></Field>
        <Field label="Estudo"><NativeSelect value={f.study_status} onChange={(v) => set("study_status", v)} options={STUDY} /></Field>
        <Field label="Acesso à plataforma"><NativeSelect value={f.platform_access} onChange={(v) => set("platform_access", v)} options={PLATFORM} /></Field>
        <Field label="Principal dificuldade"><NativeSelect value={f.main_difficulty ?? ""} onChange={(v) => set("main_difficulty", v || null)} placeholder="Não informado" options={DIFFICULTIES} /></Field>
        <Field label="Próxima ação"><Input value={f.next_action ?? ""} onChange={(e) => set("next_action", e.target.value)} /></Field>
        <Field label="Data do próximo retorno"><Input type="date" value={f.next_return_date ?? ""} onChange={(e) => set("next_return_date", e.target.value || null)} /></Field>
        <Field label="Data da prova (se marcada)"><Input type="date" value={f.exam_date ?? ""} onChange={(e) => set("exam_date", e.target.value || null)} /></Field>
        <Field label="Encaminhamento à direção"><NativeSelect value={f.direction_referral ?? ""} onChange={(v) => set("direction_referral", v || null)} placeholder="Não se aplica" options={{ pendente: "Pendente", realizado: "Realizado" }} /></Field>
      </div>
      <Field label="Observações"><Textarea rows={3} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Criado por {profiles.find((p) => p.id === s.created_by)?.full_name ?? "—"} · Alterado por {profiles.find((p) => p.id === s.updated_by)?.full_name ?? "—"} em {fmtDateTime(s.updated_at)}</span>
        <Button variant="accent" onClick={save}>Salvar cadastro</Button>
      </div>
    </div>
  );
}

function Studies({ s, mocks, lessons }: { s: Student; mocks: { id: string; test_date: string; correct: number; total: number; subjects: string | null }[]; lessons: { id: string; lesson_date: string; notes: string | null }[] }) {
  const qc = useQueryClient();
  const refresh = useRefreshStudents();
  const { data: lessonsDefault } = useQuery({
    queryKey: ["setting", "lessons_default"],
    queryFn: async () => (await supabase.from("app_settings").select("value").eq("key", "lessons_default").maybeSingle()).data?.value as number | undefined,
  });
  const [f, setF] = useState({ prep_type: s.prep_type ?? "", lessons_included: s.lessons_included?.toString() ?? "", study_activity: s.study_activity ?? "", study_activity_due: s.study_activity_due ?? "", teacher_guidance: s.teacher_guidance ?? "" });
  const [lesson, setLesson] = useState({ date: todaySP(), notes: "" });
  const [mock, setMock] = useState({ date: todaySP(), correct: "", total: "30", subjects: "" });
  const reload = () => qc.invalidateQueries({ queryKey: ["student", s.id] });

  async function saveStudy(): Promise<void> {
    const { error } = await supabase.from("students").update({
      prep_type: f.prep_type || null, lessons_included: f.lessons_included === "" ? null : Number(f.lessons_included),
      study_activity: f.study_activity || null, study_activity_due: f.study_activity_due || null, teacher_guidance: f.teacher_guidance || null,
    }).eq("id", s.id);
    if (error) return void toast.error(error.message);
    toast.success("Estudos salvos."); refresh(s.id);
  }
  async function addLesson(): Promise<void> {
    const { error } = await supabase.from("lessons").insert({ student_id: s.id, lesson_date: lesson.date, notes: lesson.notes || null });
    if (error) return void toast.error(error.message);
    setLesson({ date: todaySP(), notes: "" }); reload();
  }
  async function addMock(): Promise<void> {
    const c = Number(mock.correct), t = Number(mock.total);
    if (!mock.correct || !t || c > t || c < 0) return void toast.error("Confira acertos e total de questões.");
    const { error } = await supabase.from("mock_tests").insert({ student_id: s.id, test_date: mock.date, correct: c, total: t, subjects: mock.subjects || null });
    if (error) return void toast.error(error.message);
    setMock({ date: todaySP(), correct: "", total: mock.total, subjects: "" }); reload();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-bold text-primary">Preparação</h3>
        <Field label="Preparação contratada ou incluída"><Input value={f.prep_type} onChange={(e) => setF({ ...f, prep_type: e.target.value })} placeholder="Ex.: Curso teórico completo" /></Field>
        <Field label="Quantidade de aulas incluídas" hint={lessonsDefault ? `Padrão configurado: ${lessonsDefault}. Cada aluno pode ter um valor diferente.` : undefined}>
          <Input type="number" min={0} value={f.lessons_included} onChange={(e) => setF({ ...f, lessons_included: e.target.value })} />
        </Field>
        <Field label="Atividade de estudo combinada"><Input value={f.study_activity} onChange={(e) => setF({ ...f, study_activity: e.target.value })} /></Field>
        <Field label="Prazo da atividade"><Input type="date" value={f.study_activity_due} onChange={(e) => setF({ ...f, study_activity_due: e.target.value })} /></Field>
        <Field label="Orientação da professora"><Textarea rows={2} value={f.teacher_guidance} onChange={(e) => setF({ ...f, teacher_guidance: e.target.value })} /></Field>
        <Button onClick={saveStudy}>Salvar</Button>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-bold text-primary">Aulas frequentadas: {lessons.length}{s.lessons_included ? ` de ${s.lessons_included}` : ""}</h3>
          <ul className="my-2 text-sm">{lessons.map((l) => <li key={l.id}>• {fmtDate(l.lesson_date)} {l.notes ? `— ${l.notes}` : ""}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            <Input type="date" className="w-40" value={lesson.date} onChange={(e) => setLesson({ ...lesson, date: e.target.value })} />
            <Input className="flex-1" placeholder="Observação (opcional)" value={lesson.notes} onChange={(e) => setLesson({ ...lesson, notes: e.target.value })} />
            <Button variant="secondary" onClick={addLesson}>Adicionar aula</Button>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-bold text-primary">Simulados</h3>
          <p className="text-xs text-muted-foreground">Evolução dos acertos. Não existe nota mínima de “pronto para a prova”.</p>
          <table className="sheet my-2">
            <thead><tr><th>Data</th><th>Acertos</th><th>%</th><th>Assuntos com dificuldade</th></tr></thead>
            <tbody>
              {mocks.length === 0 && <tr><td colSpan={4} className="text-muted-foreground">Nenhum simulado.</td></tr>}
              {mocks.map((m) => {
                const p = pct(m.correct, m.total) ?? 0;
                return (
                  <tr key={m.id}>
                    <td>{fmtDate(m.test_date)}</td><td>{m.correct}/{m.total}</td>
                    <td className="min-w-28"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded bg-secondary"><div className="h-2 rounded bg-accent" style={{ width: `${p}%` }} /></div>{p}%</div></td>
                    <td>{m.subjects || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input type="date" value={mock.date} onChange={(e) => setMock({ ...mock, date: e.target.value })} />
            <Input type="number" placeholder="Acertos" value={mock.correct} onChange={(e) => setMock({ ...mock, correct: e.target.value })} />
            <Input type="number" placeholder="Total" value={mock.total} onChange={(e) => setMock({ ...mock, total: e.target.value })} />
            <Input placeholder="Assuntos" value={mock.subjects} onChange={(e) => setMock({ ...mock, subjects: e.target.value })} />
          </div>
          <Button variant="secondary" className="mt-2" onClick={addMock}>Adicionar simulado</Button>
        </div>
      </div>
    </div>
  );
}

function Exams({ s, exams }: { s: Student; exams: { id: string; exam_date: string; result: string; score: number | null; difficulties: string | null; next_step: string | null }[] }) {
  const refresh = useRefreshStudents();
  const [f, setF] = useState({ date: todaySP(), result: "", score: "", difficulties: "", next_step: "" });
  async function add(): Promise<void> {
    if (!f.result) return void toast.error("Escolha o resultado.");
    const { error } = await supabase.from("exam_attempts").insert({
      student_id: s.id, exam_date: f.date, result: f.result, score: f.score === "" ? null : Number(f.score),
      difficulties: f.difficulties || null, next_step: f.next_step || null,
    });
    if (error) return void toast.error(error.message);
    toast.success(f.result === "aprovado" ? "Aprovação registrada! Tarefa de encaminhamento à direção criada." : "Prova registrada.");
    setF({ date: todaySP(), result: "", score: "", difficulties: "", next_step: "" });
    refresh(s.id);
  }
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <table className="sheet">
        <thead><tr><th>#</th><th>Data</th><th>Resultado</th><th>Nota</th><th>Dificuldades</th><th>Próximo passo</th></tr></thead>
        <tbody>
          {exams.length === 0 && <tr><td colSpan={6} className="text-muted-foreground">Nenhuma prova registrada.</td></tr>}
          {exams.map((e, i) => (
            <tr key={e.id}>
              <td>{i + 1}ª</td><td>{fmtDate(e.exam_date)}</td>
              <td><Pill kind={e.result === "aprovado" ? "concluido" : e.result === "reprovado" ? "atrasado" : "pausado"}>{label(EXAM_RESULTS, e.result)}</Pill></td>
              <td>{e.score ?? "—"}</td><td>{e.difficulties || "—"}</td><td>{e.next_step || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid gap-2 sm:grid-cols-5">
        <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <NativeSelect value={f.result} onChange={(v) => setF({ ...f, result: v })} placeholder="Resultado" options={EXAM_RESULTS} />
        <Input type="number" placeholder="Nota (se souber)" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} />
        <Input placeholder="Dificuldades relatadas" value={f.difficulties} onChange={(e) => setF({ ...f, difficulties: e.target.value })} />
        <Input placeholder="Próximo passo" value={f.next_step} onChange={(e) => setF({ ...f, next_step: e.target.value })} />
      </div>
      <Button variant="accent" onClick={add}>Registrar prova</Button>
    </div>
  );
}

function Files({ s, files }: { s: Student; files: { id: string; path: string; file_name: string; created_at: string }[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function upload(file: File): Promise<void> {
    setBusy(true);
    const path = `${s.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("student-files").upload(path, file);
    if (up.error) { setBusy(false); return void toast.error(up.error.message); }
    const { error } = await supabase.from("attachments").insert({ student_id: s.id, path, file_name: file.name });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Arquivo anexado. Confira e registre os dados manualmente, se necessário.");
    qc.invalidateQueries({ queryKey: ["student", s.id] });
  }
  async function open(path: string): Promise<void> {
    const { data, error } = await supabase.storage.from("student-files").createSignedUrl(path, 120);
    if (error) return void toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">Arquivos privados. Anexar não altera nenhum dado do aluno automaticamente.</p>
      <Input type="file" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <ul className="divide-y text-sm">
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between py-2">
            <span>{f.file_name} <span className="text-xs text-muted-foreground">· {fmtDateTime(f.created_at)}</span></span>
            <Button size="sm" variant="outline" onClick={() => open(f.path)}>Abrir</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
