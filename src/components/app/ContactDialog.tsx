import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CHANNELS, DECISIONS, DIFFICULTIES, RESULTS, localInputToISO, nowLocalInput, suggestNext, upper } from "@/lib/domain";
import { useMe, useRefreshStudents, type Student } from "@/lib/data";
import { SourceTag } from "./StatusBadge";
import { useQueryClient } from "@tanstack/react-query";

function Chips({ options, value, onChange }: { options: Record<string, string>; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(options).map(([k, v]) => (
        <button
          type="button"
          key={k}
          onClick={() => onChange(value === k ? "" : k)}
          className={
            "rounded-md border px-3 py-1.5 text-sm transition-colors " +
            (value === k ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-secondary")
          }
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function ContactDialog({ student, open, onOpenChange }: { student: Student | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: me } = useMe();
  const refresh = useRefreshStudents();
  const qc = useQueryClient();
  const [when, setWhen] = useState(nowLocalInput());
  const [channel, setChannel] = useState("ligacao");
  const [result, setResult] = useState("");
  const [report, setReport] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [decision, setDecision] = useState("");
  const [saving, setSaving] = useState(false);
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    if (open) {
      setWhen(nowLocalInput());
      setChannel("ligacao");
      setResult("");
      setReport("");
      setDifficulty("");
      setNextAction("");
      setReturnDate("");
      setDecision("");
      setExamDate(student?.exam_date ?? "");
    }
  }, [open, student]);

  const suggestion = useMemo(
    () => (student ? suggestNext(student, { lastResult: result, difficulty }) : ""),
    [student, result, difficulty],
  );

  if (!student) return null;
  const needsNext = !decision;

  async function save(): Promise<void> {
    if (!result) return void toast.error("Escolha o resultado do contato.");
    if (needsNext && (!nextAction.trim() || !returnDate))
      return void toast.error("Defina a próxima ação e a data do retorno (ou registre pausa/desistência).");
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      student_id: student!.id,
      contacted_at: localInputToISO(when),
      channel,
      result,
      report: upper(report) || null,
      difficulty: difficulty || null,
      next_action: needsNext ? upper(nextAction) : null,
      return_date: needsNext ? returnDate : null,
      decision: decision || null,
      created_by_name: me?.name ?? null,
    });
    if (!error && examDate !== (student!.exam_date ?? "")) {
      const r = await supabase.from("students").update({ exam_date: examDate || null }).eq("id", student!.id);
      if (r.error) toast.error("Contato salvo, mas a data da prova não: " + r.error.message);
    }
    setSaving(false);
    if (error) return void toast.error("Não foi possível salvar: " + error.message);
    toast.success("Contato registrado.");
    refresh(student!.id);
    qc.invalidateQueries({ queryKey: ["contacts"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar contato — {student.full_name}</DialogTitle>
          <DialogDescription>Responsável: {me?.name ?? "—"}. Nada é enviado ao aluno; aqui você só registra o que aconteceu.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>1. Data e horário</Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">2. Canal</Label>
            <Chips options={CHANNELS} value={channel} onChange={(v) => setChannel(v || "ligacao")} />
          </div>
          <div>
            <Label className="mb-1.5 block">3. Resultado</Label>
            <Chips options={RESULTS} value={result} onChange={setResult} />
          </div>
          <div>
            <Label>4. Relato da conversa</Label>
            <Textarea rows={3} value={report} onChange={(e) => setReport(e.target.value)} className="uppercase" placeholder="O que o aluno contou, em poucas palavras" />
          </div>
          <div>
            <Label className="mb-1.5 block">5. Dificuldade identificada (se houver)</Label>
            <Chips options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
          </div>
          <div className="rounded-md border p-3">
            <Label>Prova agendada? Data da prova</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Com data marcada, o aluno fica em acompanhamento no Meu dia até você confirmar o resultado.</p>
          </div>
          <div>
            <Label className="mb-1.5 block">O aluno pediu para parar?</Label>
            <Chips options={DECISIONS} value={decision} onChange={setDecision} />
            {decision && <p className="mt-1 text-xs text-muted-foreground">O aluno sai das cobranças. O histórico continua salvo.</p>}
          </div>
          {needsNext && (
            <div className="space-y-3 rounded-md border border-dashed p-3">
              <div className="flex items-start gap-2 rounded bg-suggest p-2 text-sm text-suggest-foreground">
                <SourceTag kind="sugestao" />
                <span className="flex-1">{suggestion}</span>
                <Button size="sm" variant="outline" type="button" onClick={() => setNextAction(suggestion)}>
                  Usar
                </Button>
              </div>
              <div>
                <Label>6. Próxima ação <SourceTag kind="compromisso" /></Label>
                <Input className="uppercase" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="O que foi combinado" />
              </div>
              <div>
                <Label>7. Data do retorno</Label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="accent" disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar contato"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RescheduleDialog({ student, open, onOpenChange }: { student: Student | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const refresh = useRefreshStudents();
  const [date, setDate] = useState("");
  const [action, setAction] = useState("");
  useEffect(() => {
    if (open && student) {
      setDate(student.next_return_date ?? "");
      setAction(student.next_action ?? "");
    }
  }, [open, student]);
  if (!student) return null;
  async function save(): Promise<void> {
    if (!date) return void toast.error("Escolha a nova data.");
    const { error } = await supabase.from("students").update({ next_return_date: date, next_action: upper(action) || null }).eq("id", student!.id);
    if (error) return void toast.error(error.message);
    toast.success("Retorno reagendado.");
    refresh(student!.id);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar retorno — {student.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nova data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Próxima ação</Label><Input className="uppercase" value={action} onChange={(e) => setAction(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
