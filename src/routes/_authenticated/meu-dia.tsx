import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudents, useUnits, useMe, useRefreshStudents, type Student } from "@/lib/data";
import { deadlineOf, fmtDate, fmtPhone, suggestNext, todaySP } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { DeadlineBadge, SourceTag } from "@/components/app/StatusBadge";
import { ContactDialog, RescheduleDialog } from "@/components/app/ContactDialog";
import { NewStudentDialog } from "@/components/app/NewStudentDialog";

export const Route = createFileRoute("/_authenticated/meu-dia")({
  head: () => ({
    meta: [
      { title: "Meu dia — Autoescola Pinheirense" },
      { name: "description", content: "Quem procurar hoje, por qual motivo e qual o próximo passo." },
      { property: "og:title", content: "Meu dia — Autoescola Pinheirense" },
      { property: "og:description", content: "Tarefas do dia da equipe de acompanhamento." },
    ],
  }),
  component: MeuDia,
});

type Group = { key: string; title: string; reason: string; tone: string; items: Student[] };

function MeuDia() {
  const { data: students = [], isLoading } = useStudents();
  const { data: units = [] } = useUnits();
  const { data: me } = useMe();
  const [contact, setContact] = useState<Student | null>(null);
  const [resched, setResched] = useState<Student | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const refresh = useRefreshStudents();
  async function examResult(s: Student, result: "aprovado" | "reprovado"): Promise<void> {
    const { error } = await supabase.from("exam_attempts").insert({ student_id: s.id, exam_date: s.exam_date ?? todaySP(), result });
    if (error) return void toast.error(error.message);
    toast.success(result === "aprovado" ? `${s.full_name} foi para Aprovados.` : "Reprovação registrada; nova preparação combinada.");
    refresh(s.id);
  }
  const unitName = (id: string) => units.find((u) => u.id === id)?.name ?? "";

  useEffect(() => {
    setShowGuide(localStorage.getItem("guia-visto") !== "1");
  }, []);

  const groups = useMemo<Group[]>(() => {
    const today = todaySP();
        const seen = new Set<string>();
    const take = (pred: (s: Student) => boolean) =>
      students.filter((s) => !seen.has(s.id) && pred(s)).map((s) => (seen.add(s.id), s));
    const active = (s: Student) => s.followup_status !== "pausa_solicitada" && s.followup_status !== "concluido";
    const g: Group[] = [
      { key: "enc", title: "Aprovados aguardando encaminhamento à direção", reason: "Aprovado na teórica", tone: "border-st-done-foreground", items: take((s) => s.theory_status === "aprovado" && s.direction_referral === "pendente") },
      { key: "atr", title: "Retornos atrasados", reason: "Retorno vencido", tone: "border-st-late-foreground", items: take((s) => active(s) && deadlineOf(s, today) === "atrasado") },
      { key: "hoje", title: "Combinados para hoje", reason: "Retorno combinado para hoje", tone: "border-st-today-foreground", items: take((s) => active(s) && s.next_return_date === today) },
      { key: "feita", title: "Prova realizada — confirmar resultado", reason: "Prova feita", tone: "border-accent", items: take((s) => !!s.exam_date && s.exam_date <= today && s.theory_status !== "aprovado") },
      { key: "prova", title: "Provas agendadas (em acompanhamento)", reason: "Prova marcada", tone: "border-accent", items: take((s) => !!s.exam_date && s.exam_date > today && s.theory_status !== "aprovado") },
      { key: "novo", title: "Alunos novos sem primeiro contato", reason: "Cadastro novo", tone: "border-primary", items: take((s) => active(s) && !s.last_contact_at) },
      { key: "sem", title: "Sem próximo passo definido", reason: "Falta combinar o próximo passo", tone: "border-st-gray-foreground", items: take((s) => active(s) && (!s.next_action || !s.next_return_date)) },
    ];
    return g;
  }, [students]);

  const total = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Meu dia</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {me?.name?.split(" ")[0]}. Hoje é {fmtDate(todaySP())}. {isLoading ? "Carregando…" : `${total} tarefa(s) para hoje.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/importar">Importar alunos</Link></Button>
          <Button variant="accent" onClick={() => setNewOpen(true)}>+ Novo aluno</Button>
        </div>
      </div>

      {showGuide && (
        <div className="rounded-lg border-l-4 border-accent bg-card p-4 shadow-sm">
          <h2 className="font-bold text-primary">Como usar, em 5 passos</h2>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
            <li>Cadastre ou importe os alunos.</li>
            <li>Abra “Meu dia”.</li>
            <li>Consulte o histórico antes do contato.</li>
            <li>Registre o que aconteceu.</li>
            <li>Confirme a próxima ação e o retorno.</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">O sistema nunca envia mensagens sozinho — todo contato é feito por você.</p>
          <Button size="sm" className="mt-3" onClick={() => { localStorage.setItem("guia-visto", "1"); setShowGuide(false); }}>Entendi</Button>
        </div>
      )}

      {!isLoading && students.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="font-semibold">Nenhum aluno cadastrado ainda.</p>
          <p className="text-sm text-muted-foreground">Comece importando a planilha ou cadastrando um aluno.</p>
        </div>
      )}

      {groups.filter((g) => g.items.length).map((g) => (
        <section key={g.key} className={"overflow-hidden rounded-lg border border-l-4 bg-card shadow-sm " + g.tone}>
          <h2 className="flex items-center justify-between border-b bg-muted px-4 py-2 text-sm font-bold">
            {g.title} <span className="rounded bg-primary px-2 text-xs text-primary-foreground">{g.items.length}</span>
          </h2>
          <ul className="divide-y">
            {g.items.map((s) => (
              <li key={s.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.3fr_2fr_auto] md:items-center">
                <div>
                  <Link to="/alunos/$id" params={{ id: s.id }} className="font-semibold text-primary hover:underline">{s.full_name}</Link>
                  <div className="text-sm">{fmtPhone(s.phone)}</div>
                  <div className="text-xs text-muted-foreground">{unitName(s.unit_id)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-semibold">Motivo:</span> {g.reason}{g.key === "prova" || g.key === "feita" ? ` em ${fmtDate(s.exam_date)}` : ""}</div>
                  <div className="text-muted-foreground"><span className="font-semibold text-foreground">Última conversa:</span> {s.last_contact_summary || "Sem registro"}</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.next_action ? (
                      <><SourceTag kind="compromisso" /> {s.next_action}</>
                    ) : (
                      <><SourceTag kind="sugestao" /> {suggestNext(s)}</>
                    )}
                    <span className="text-muted-foreground">· prazo {fmtDate(s.next_return_date)}</span>
                    <DeadlineBadge d={deadlineOf(s)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {(g.key === "feita" || g.key === "prova") && (
                    <>
                      <Button size="sm" onClick={() => examResult(s, "aprovado")}>✓ Aprovado</Button>
                      <Button size="sm" variant="outline" onClick={() => examResult(s, "reprovado")}>Reprovado</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" asChild><Link to="/alunos/$id" params={{ id: s.id }}>Abrir aluno</Link></Button>
                  <Button size="sm" variant="accent" onClick={() => setContact(s)}>Registrar contato</Button>
                  <Button size="sm" variant="secondary" onClick={() => setResched(s)}>Reagendar retorno</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!isLoading && students.length > 0 && total === 0 && (
        <div className="rounded-lg border bg-st-done p-6 text-center font-semibold text-st-done-foreground">✓ Tudo em dia! Nenhuma tarefa pendente.</div>
      )}

      <ContactDialog student={contact} open={!!contact} onOpenChange={(o) => !o && setContact(null)} />
      <RescheduleDialog student={resched} open={!!resched} onOpenChange={(o) => !o && setResched(null)} />
      <NewStudentDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
