import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useRefreshStudents, useStudents, useUnits } from "@/lib/data";
import type { TablesInsert } from "@/integrations/supabase/types";
import { onlyDigits } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/app/NativeSelect";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar alunos — Autoescola Pinheirense" },
      { name: "description", content: "Importar a planilha de alunos por arquivo CSV." },
      { property: "og:title", content: "Importar alunos — Autoescola Pinheirense" },
      { property: "og:description", content: "Importação de alunos por planilha CSV." },
    ],
  }),
  component: Importar,
});

type ColIdx = { nome: number; cpf: number; phone: number; unit: number; notes: number; enrollment: number };
type Summary = { inserted: number; dup: number; noName: number; failed: number };

const HEADER_KEYS: Record<keyof ColIdx, string[]> = {
  nome: ["nome completo", "nome do aluno", "nome", "aluno", "name"],
  cpf: ["cpf", "cpf aluno"],
  phone: ["telefone", "celular", "whatsapp", "fone", "telefono", "contato", "tel"],
  unit: ["unidade", "filial", "local", "unid"],
  notes: ["observacoes", "obs", "anotacoes", "historico", "descricao"],
  enrollment: ["matricula", "data de matricula", "entrada", "data de entrada"],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Detecta o separador mais frequente na primeira linha (fora de aspas). */
function detectDelim(text: string): string {
  const line = text.split(/\r?\n/)[0] ?? "";
  let inQ = false;
  const count: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (!inQ && c in count) count[c] = (count[c] ?? 0) + 1;
  }
  return Object.entries(count).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? ",";
}

/** Leitor CSV com aspas, quebras de linha dentro de campos e separador variável. */
function parseCSV(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function mapHeaders(headers: string[]): ColIdx {
  const h = headers.map(norm);
  const find = (keys: string[]) => {
    for (const k of keys) {
      const exact = h.indexOf(k);
      if (exact >= 0) return exact;
    }
    for (const k of keys) {
      const part = h.findIndex((x) => x.includes(k));
      if (part >= 0) return part;
    }
    return -1;
  };
  const out = {} as ColIdx;
  for (const key of Object.keys(HEADER_KEYS) as (keyof ColIdx)[]) out[key] = find(HEADER_KEYS[key]);
  if (out.nome < 0) out.nome = 0;
  return out;
}

function toISO(v: string): string | null {
  const d = onlyDigits(v);
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v.trim())) {
    const [dd, mm, yyyy] = v.trim().split("/");
    if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(v.trim())) return v.trim().slice(0, 10);
  return null;
}

function Importar() {
  const { data: units = [] } = useUnits();
  const { data: students = [] } = useStudents();
  const { data: me } = useMe();
  const refresh = useRefreshStudents();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<ColIdx | null>(null);
  const [fallbackUnit, setFallbackUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const headers = useMemo(() => {
    if (!rows.length) return [];
    if (hasHeader) return (rows[0] ?? []).map((c, i) => c.trim() || `Coluna ${i + 1}`);
    return (rows[0] ?? []).map((_, i) => `Coluna ${i + 1}`);
  }, [rows, hasHeader]);

  const dataRows = useMemo(() => (hasHeader ? rows.slice(1) : rows), [rows, hasHeader]);

  async function onFile(file?: File): Promise<void> {
    if (!file) return;
    setSummary(null);
    const text = await file.text();
    const parsed = parseCSV(text.replace(/^\uFEFF/, ""), detectDelim(text));
    if (!parsed.length) return void toast.error("Arquivo vazio ou ilegível.");
    setRows(parsed);
    setFileName(file.name);
    const first = parsed[0] ?? [];
    setMap(mapHeaders(hasHeader ? first.map((c) => c.trim()) : first));
    if (!fallbackUnit) setFallbackUnit(units.find((u) => u.name === "João Pinheiro")?.id ?? units[0]?.id ?? "");
  }

  function downloadModelo(): void {
    const csv =
      "nome completo;cpf;telefone;unidade;data de matricula;observacoes\n" +
      "Maria da Silva;123.456.789-00;(38) 99999-0000;João Pinheiro;01/02/2026;Precisa de ajuda com a plataforma\n";
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-importacao-alunos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const preview = useMemo(() => {
    if (!map) return [];
    return dataRows.slice(0, 8).map((r) => ({
      nome: (r[map.nome] ?? "").trim(),
      cpf: (r[map.cpf] ?? "").trim(),
      phone: (r[map.phone] ?? "").trim(),
      unit: (r[map.unit] ?? "").trim(),
    }));
  }, [map, dataRows]);

  async function runImport(): Promise<void> {
    if (!map) return void toast.error("Selecione o arquivo primeiro.");
    if (!fallbackUnit) return void toast.error("Escolha a unidade de destino.");
    const unitByName = new Map(units.map((u) => [norm(u.name), u.id]));
    const knownCpf = new Set(students.map((s) => onlyDigits(s.cpf)).filter((c) => c.length === 11));
    const knownPhone = new Set(students.map((s) => onlyDigits(s.phone)).filter((c) => c.length >= 10));
    const seenCpf = new Set<string>();
    const seenPhone = new Set<string>();
    const toInsert: TablesInsert<"students">[] = [];
    const res: Summary = { inserted: 0, dup: 0, noName: 0, failed: 0 };

    for (const r of dataRows) {
      const full_name = (r[map.nome] ?? "").trim();
      if (!full_name) {
        res.noName++;
        continue;
      }
      const cpf = onlyDigits(r[map.cpf] ?? "");
      const phone = onlyDigits(r[map.phone] ?? "");
      const dup =
        (cpf.length === 11 && (knownCpf.has(cpf) || seenCpf.has(cpf))) ||
        (phone.length >= 10 && (knownPhone.has(phone) || seenPhone.has(phone)));
      if (dup) {
        res.dup++;
        continue;
      }
      if (cpf.length === 11) seenCpf.add(cpf);
      if (phone.length >= 10) seenPhone.add(phone);
      const unitName = norm(r[map.unit] ?? "");
      const unit_id = (unitName && unitByName.get(unitName)) || fallbackUnit;
      const enrollment = map.enrollment >= 0 ? toISO(r[map.enrollment] ?? "") : null;
      const notes = map.notes >= 0 ? (r[map.notes] ?? "").trim() || null : null;
      toInsert.push({
        full_name,
        unit_id,
        cpf: cpf || null,
        phone: phone || null,
        responsible_id: me?.id ?? null,
        ...(enrollment ? { enrollment_date: enrollment } : {}),
        ...(notes ? { notes } : {}),
      });
    }

    setBusy(true);
    for (let i = 0; i < toInsert.length; i += 100) {
      const { error } = await supabase.from("students").insert(toInsert.slice(i, i + 100));
      if (error) {
        res.failed += toInsert.length - i;
        toast.error(error.message);
        break;
      }
      res.inserted += Math.min(100, toInsert.length - i);
    }
    setBusy(false);
    setSummary(res);
    refresh();
    if (res.inserted) toast.success(`${res.inserted} aluno(s) importado(s).`);
  }

  const colOptions = (required = false) => [
    ...(required ? [] : [["-1", "(não usar)"] as [string, string]]),
    ...headers.map((h, i) => [String(i), h] as [string, string]),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Importar alunos</h1>
          <p className="text-sm text-muted-foreground">
            Envie um arquivo CSV (ou TXT separado por vírgula, ponto e vírgula ou TAB). Repetidos são ignorados.
          </p>
        </div>
        <Button variant="outline" onClick={downloadModelo}>
          Baixar modelo CSV
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="block w-full max-w-md text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            Primeira linha é cabeçalho
          </label>
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
        </div>

        {map && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Nome *
              <NativeSelect
                className="mt-1"
                value={String(map.nome)}
                onChange={(v) => setMap({ ...map, nome: Number(v) })}
                options={colOptions(true)}
              />
            </label>
            <label className="text-sm">
              Telefone
              <NativeSelect
                className="mt-1"
                value={String(map.phone)}
                onChange={(v) => setMap({ ...map, phone: Number(v) })}
                options={colOptions()}
              />
            </label>
            <label className="text-sm">
              CPF
              <NativeSelect
                className="mt-1"
                value={String(map.cpf)}
                onChange={(v) => setMap({ ...map, cpf: Number(v) })}
                options={colOptions()}
              />
            </label>
            <label className="text-sm">
              Unidade (nome na planilha)
              <NativeSelect
                className="mt-1"
                value={String(map.unit)}
                onChange={(v) => setMap({ ...map, unit: Number(v) })}
                options={colOptions()}
              />
            </label>
            <label className="text-sm">
              Data de matrícula
              <NativeSelect
                className="mt-1"
                value={String(map.enrollment)}
                onChange={(v) => setMap({ ...map, enrollment: Number(v) })}
                options={colOptions()}
              />
            </label>
            <label className="text-sm">
              Observações
              <NativeSelect
                className="mt-1"
                value={String(map.notes)}
                onChange={(v) => setMap({ ...map, notes: Number(v) })}
                options={colOptions()}
              />
            </label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">
              Unidade de destino (para linhas sem unidade ou com nome não reconhecido) *
              <NativeSelect
                className="mt-1"
                value={fallbackUnit}
                onChange={setFallbackUnit}
                options={units.map((u) => [u.id, u.name])}
              />
            </label>
          </div>
        )}

        {map && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="accent" disabled={busy} onClick={() => void runImport()}>
              {busy ? "Importando…" : `Importar ${dataRows.length} linha(s)`}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/alunos">Ver alunos</Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              Alunos sem telefone ou CPF também entram; a equipe completa depois.
            </span>
          </div>
        )}
      </div>

      {map && preview.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="sheet">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Unidade na planilha</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p, i) => (
                <tr key={i}>
                  <td className="min-w-48">{p.nome || "—"}</td>
                  <td className="whitespace-nowrap">{p.cpf || "—"}</td>
                  <td className="whitespace-nowrap">{p.phone || "—"}</td>
                  <td className="whitespace-nowrap">{p.unit || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            Prévia das 8 primeiras linhas de {dataRows.length}.
          </p>
        </div>
      )}

      {summary && (
        <div className="rounded-lg border-l-4 border-st-done-foreground bg-card p-4 shadow-sm">
          <h2 className="font-bold text-primary">Resultado da importação</h2>
          <ul className="mt-1 text-sm">
            <li>Importados: {summary.inserted}</li>
            <li>Repetidos ignorados: {summary.dup}</li>
            <li>Sem nome (ignorados): {summary.noName}</li>
            {summary.failed > 0 && <li>Não importados por erro: {summary.failed}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
