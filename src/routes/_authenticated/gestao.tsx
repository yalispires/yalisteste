import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents, useUnits } from "@/lib/data";
import { addDays, approvalRate, deadlineOf, todaySP } from "@/lib/domain";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/app/NativeSelect";

export const Route = createFileRoute("/_authenticated/gestao")({
  head: () => ({
    meta: [
      { title: "Resumo para a gestão — Autoescola Pinheirense" },
      { name: "description", content: "Indicadores de acompanhamento, provas e aprovação por período e unidade." },
      { property: "og:title", content: "Resumo para a gestão — Autoescola Pinheirense" },
      { property: "og:description", content: "Indicadores de acompanhamento e aprovação." },
    ],
  }),
  component: Gestao,
});

function Gestao() {
  const { data: students = [] } = useStudents();
  const { data: units = [] } = useUnits();
  const [from, setFrom] = useState(addDays(todaySP(), -30));
  const [to, setTo] = useState(todaySP());
  const [unit, setUnit] = useState("");
  const { data: exams = [] } = useQuery({
    queryKey: ["all-exams"],
    queryFn: async () => (await supabase.from("exam_attempts").select("id, student_id, exam_date, result").order("exam_date")).data ?? [],
  });

  const m = useMemo(() => {
    const st = students.filter((s) => !unit || s.unit_id === unit);
    const ids = new Set(st.map((s) => s.id));
    // ordem de tentativas por aluno (faltas não contam como tentativa realizada)
    const rank = new Map<string, number>();
    const counter = new Map<string, number>();
    for (const e of exams) {
      if (e.result === "faltou") continue;
      const n = (counter.get(e.student_id) ?? 0) + 1;
      counter.set(e.student_id, n);
      rank.set(e.id, n);
    }
    const inPeriod = exams.filter((e) => ids.has(e.student_id) && e.exam_date >= from && e.exam_date <= to);
    const first = inPeriod.filter((e) => rank.get(e.id) === 1);
    const retest = inPeriod.filter((e) => (rank.get(e.id) ?? 0) > 1);
    const fmtRate = (r: number | null) => (r === null ? "sem provas realizadas" : `${Math.round(r * 100)}%`);
    return {
      total: st.filter((s) => s.followup_status !== "concluido").length,
      semContato: st.filter((s) => !s.last_contact_at).length,
      preparo: st.filter((s) => s.followup_status === "em_preparacao").length,
      semRetorno: st.filter((s) => s.followup_status === "sem_retorno").length,
      atrasados: st.filter((s) => deadlineOf(s) === "atrasado").length,
      retomaram: st.filter((s) => s.resumed_at && s.resumed_at >= from && s.resumed_at <= to).length,
      tentativas: inPeriod.filter((e) => e.result !== "faltou").length,
      alunosProva: new Set(inPeriod.filter((e) => e.result !== "faltou").map((e) => e.student_id)).size,
      aprov: inPeriod.filter((e) => e.result === "aprovado").length,
      reprov: inPeriod.filter((e) => e.result === "reprovado").length,
      faltas: inPeriod.filter((e) => e.result === "faltou").length,
      encaminhados: st.filter((s) => s.direction_referral === "realizado").length,
      aguardando: st.filter((s) => s.direction_referral === "pendente").length,
      rate: fmtRate(approvalRate(inPeriod.map((e) => e.result))),
      rateFirst: fmtRate(approvalRate(first.map((e) => e.result))),
      rateRetest: fmtRate(approvalRate(retest.map((e) => e.result))),
    };
  }, [students, exams, unit, from, to]);

  const Card = ({ t, v, hint }: { t: string; v: string | number; hint?: string }) => (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t}</div>
      <div className="mt-1 font-display text-3xl font-extrabold text-primary">{v}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-primary">Resumo para a gestão</h1>
      <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-3">
        <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><Label>Unidade</Label><NativeSelect value={unit} onChange={setUnit} placeholder="Todas" options={units.map((u) => [u.id, u.name])} /></div>
      </div>
      <h2 className="font-bold">Acompanhamento (situação atual)</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card t="Em acompanhamento" v={m.total} />
        <Card t="Sem primeiro contato" v={m.semContato} />
        <Card t="Em preparação" v={m.preparo} />
        <Card t="Sem retorno" v={m.semRetorno} />
        <Card t="Retornos atrasados" v={m.atrasados} />
        <Card t="Retomaram estudos" v={m.retomaram} hint="no período" />
      </div>
      <h2 className="font-bold">Provas no período</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card t="Tentativas realizadas" v={m.tentativas} hint={`${m.alunosProva} aluno(s)`} />
        <Card t="Aprovações" v={m.aprov} />
        <Card t="Reprovações" v={m.reprov} />
        <Card t="Faltas" v={m.faltas} hint="fora do cálculo" />
        <Card t="Encaminhados à direção" v={m.encaminhados} hint={`${m.aguardando} aguardando`} />
        <Card t="Aprovação" v={m.rate} hint="aprovados ÷ (aprovados + reprovados)" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:w-1/2">
        <Card t="Aprovação — 1ª tentativa" v={m.rateFirst} />
        <Card t="Aprovação — retestes" v={m.rateRetest} />
      </div>
    </div>
  );
}
