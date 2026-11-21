import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "./NativeSelect";
import { fmtCPF, fmtPhone, onlyDigits } from "@/lib/domain";
import { useMe, useRefreshStudents, useStudents, useUnits } from "@/lib/data";

export function NewStudentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: units = [] } = useUnits();
  const { data: students = [] } = useStudents();
  const { data: me } = useMe();
  const refresh = useRefreshStudents();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setPhone(""); setCpf("");
      setUnit(units.find((u) => u.name === "João Pinheiro")?.id ?? units[0]?.id ?? "");
    }
  }, [open, units]);

  const dups = useMemo(() => {
    const c = onlyDigits(cpf), p = onlyDigits(phone);
    return students.filter(
      (s) => (c.length >= 11 && onlyDigits(s.cpf) === c) || (p.length >= 8 && onlyDigits(s.phone) === p),
    );
  }, [students, cpf, phone]);

  async function save(): Promise<void> {
    if (!name.trim() || !unit) return void toast.error("Informe nome e unidade.");
    if (!onlyDigits(phone) && !onlyDigits(cpf)) return void toast.error("Informe pelo menos telefone ou CPF.");
    if (!onlyDigits(phone)) return void toast.error("Informe um telefone para contato.");
    setSaving(true);
    const { data, error } = await supabase
      .from("students")
      .insert({
        full_name: name.trim(),
        unit_id: unit,
        phone: onlyDigits(phone) || null,
        cpf: onlyDigits(cpf) || null,
        responsible_id: me?.id ?? null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) return void toast.error(error.message);
    toast.success("Aluno cadastrado.");
    refresh();
    onOpenChange(false);
    navigate({ to: "/alunos/$id", params: { id: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo aluno</DialogTitle>
          <DialogDescription>Só nome, unidade e telefone são obrigatórios. O resto pode ser preenchido depois.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome completo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Unidade *</Label><NativeSelect value={unit} onChange={setUnit} options={units.map((u) => [u.id, u.name])} /></div>
          <div><Label>Telefone *</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(38) 99999-9999" /></div>
          <div><Label>CPF</Label><Input inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" /></div>
          {dups.length > 0 && (
            <div className="rounded-md border border-st-today-foreground/30 bg-st-today p-3 text-sm text-st-today-foreground">
              <p className="font-semibold">Possível cadastro repetido:</p>
              {dups.slice(0, 3).map((d) => (
                <button key={d.id} className="block underline" onClick={() => { onOpenChange(false); navigate({ to: "/alunos/$id", params: { id: d.id } }); }}>
                  {d.full_name} · {fmtCPF(d.cpf)} · {fmtPhone(d.phone)}
                </button>
              ))}
              <p className="mt-1 text-xs">Abra o cadastro existente ou continue se for outra pessoa.</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="accent" disabled={saving} onClick={save}>{dups.length ? "Criar mesmo assim" : "Cadastrar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
