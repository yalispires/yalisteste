import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProfiles, useStudents, useUnits } from "@/lib/data";
import { DIFFICULTIES, FOLLOWUP, THEORY, DEADLINE_LABEL, deadlineOf, fmtDate, fmtDateTime, fmtPhone, label, onlyDigits } from "@/lib/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/app/NativeSelect";
import { DeadlineBadge, Pill } from "@/components/app/StatusBadge";
import { NewStudentDialog } from "@/components/app/NewStudentDialog";

export const Route = createFileRoute("/_authenticated/alunos/")({
  head: () => ({
    meta: [
      { title: "Alunos — Autoescola Pinheirense" },
      { name: "description", content: "Planilha de alunos com filtros por unidade, situação e prazo." },
      { property: "og:title", content: "Alunos — Autoescola Pinheirense" },
      { property: "og:description", content: "Planilha de alunos em acompanhamento." },
    ],
  }),
  component: Alunos,
});

function Alunos() {
  const { data: students = [], isLoading } = useStudents();
  const { data: units = [] } = useUnits();
  const { data: profiles = [] } = useProfiles();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("");
  const [resp, setResp] = useState("");
  const [theory, setTheory] = useState("");
  const [follow, setFollow] = useState("");
  const [diff, setDiff] = useState("");
  const [dl, setDl] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [tab, setTab] = useState<"acomp" | "aprov">("acomp");
  const approvedCount = students.filter((s) => s.theory_status === "aprovado").length;

  const unitName = (id: string) => units.find((u) => u.id === id)?.name ?? "";
  const profName = (id?: string | null) => profiles.find((p) => p.id === id)?.full_name ?? "—";

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const td = onlyDigits(q);
    return students.filter((s) => {
      if ((tab === "aprov") !== (s.theory_status === "aprovado")) return false;
      if (t && !(s.full_name.toLowerCase().includes(t) || (td.length >= 3 && (onlyDigits(s.cpf).includes(td) || onlyDigits(s.phone).includes(td))))) return false;
      if (unit && s.unit_id !== unit) return false;
      if (resp && s.responsible_id !== resp) return false;
      if (theory && s.theory_status !== theory) return false;
      if (follow && s.followup_status !== follow) return false;
      if (diff && s.main_difficulty !== diff) return false;
      if (dl && deadlineOf(s) !== dl) return false;
      return true;
    });
  }, [students, tab, q, unit, resp, theory, follow, diff, dl]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Alunos</h1>
          <p className="text-sm text-muted-foreground">{rows.length} de {students.length} aluno(s). Clique no nome para abrir o cadastro.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/importar">Importar alunos</Link></Button>
          <Button variant="accent" onClick={() => setNewOpen(true)}>+ Novo aluno</Button>
        </div>
      </div>
      <div className="flex gap-1 border-b">
        {([["acomp", `Em acompanhamento (${students.length - approvedCount})`], ["aprov", `Aprovados (${approvedCount})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={"-mb-px border-b-2 px-4 py-2 text-sm font-semibold " + (tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>
      <div className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-7">
        <Input className="lg:col-span-2" placeholder="Pesquisar nome, CPF ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
        <NativeSelect value={unit} onChange={setUnit} placeholder="Todas as unidades" options={units.map((u) => [u.id, u.name])} />
        <NativeSelect value={resp} onChange={setResp} placeholder="Todos os responsáveis" options={profiles.map((p) => [p.id, p.full_name ?? p.email ?? ""])} />
        <NativeSelect value={follow} onChange={setFollow} placeholder="Acompanhamento" options={FOLLOWUP} />
        <NativeSelect value={theory} onChange={setTheory} placeholder="Teórica" options={THEORY} />
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect value={diff} onChange={setDiff} placeholder="Dificuldade" options={DIFFICULTIES} />
          <NativeSelect value={dl} onChange={setDl} placeholder="Prazo" options={DEADLINE_LABEL} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="sheet">
          <thead>
            <tr>
              <th>Nome</th><th>Unidade</th><th>Responsável</th><th>Teórica</th><th>Acompanhamento</th>
              <th>Dificuldade</th><th>Último contato</th><th>Próxima ação</th><th>Retorno</th><th>Prazo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10}>Carregando…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={10} className="text-center text-muted-foreground">Nenhum aluno encontrado.</td></tr>}
            {rows.map((s) => (
              <tr key={s.id} className="cursor-pointer" onClick={() => navigate({ to: "/alunos/$id", params: { id: s.id } })}>
                <td className="min-w-48"><span className="font-semibold text-primary">{s.full_name}</span><div className="text-xs text-muted-foreground">{fmtPhone(s.phone)}</div></td>
                <td className="whitespace-nowrap">{unitName(s.unit_id)}</td>
                <td className="whitespace-nowrap">{profName(s.responsible_id)}</td>
                <td><Pill kind={s.theory_status === "aprovado" ? "concluido" : s.theory_status === "reprovado" ? "atrasado" : "sem_info"}>{label(THEORY, s.theory_status)}</Pill></td>
                <td className="whitespace-nowrap">{label(FOLLOWUP, s.followup_status)}</td>
                <td>{s.main_difficulty ? label(DIFFICULTIES, s.main_difficulty) : "—"}</td>
                <td className="whitespace-nowrap">{fmtDateTime(s.last_contact_at)}</td>
                <td className="min-w-48">{s.next_action || "—"}</td>
                <td className="whitespace-nowrap">{fmtDate(s.next_return_date)}</td>
                <td><DeadlineBadge d={deadlineOf(s)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NewStudentDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
