import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useProfiles, useUnits } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { createStaffLogin } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Autoescola Pinheirense" },
      { name: "description", content: "Usuários, perfis, unidades autorizadas e cursos." },
      { property: "og:title", content: "Configurações — Autoescola Pinheirense" },
      { property: "og:description", content: "Configurações do sistema de acompanhamento." },
    ],
  }),
  component: Config,
});

type Course = { name: string; value: string; lessons: string };

function Config() {
  const { data: me } = useMe();
  const { data: profiles = [] } = useProfiles();
  const { data: units = [] } = useUnits();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-access"],
    queryFn: async () => {
      const [r, uu, st] = await Promise.all([
        supabase.from("user_roles").select("*"),
        supabase.from("user_units").select("*"),
        supabase.from("app_settings").select("*"),
      ]);
      return { roles: r.data ?? [], uu: uu.data ?? [], settings: st.data ?? [] };
    },
  });
  const [lessons, setLessons] = useState("10");
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    if (!data) return;
    const l = data.settings.find((s) => s.key === "lessons_default")?.value;
    if (l != null) setLessons(String(l));
    const c = data.settings.find((s) => s.key === "courses")?.value;
    if (Array.isArray(c)) setCourses(c as Course[]);
  }, [data]);

  const createLogin = useServerFn(createStaffLogin);
  const [nl, setNl] = useState({ name: "", login: "", password: "" });
  const [creating, setCreating] = useState(false);
  async function addLogin(): Promise<void> {
    setCreating(true);
    try {
      await createLogin({ data: nl });
      toast.success(`Acesso criado. Login: ${nl.login.trim().toLowerCase()}`);
      setNl({ name: "", login: "", password: "" });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setCreating(false);
  }

  if (!me?.isGestor) return <p>Somente gestores acessam esta página.</p>;
  const reload = () => qc.invalidateQueries({ queryKey: ["admin-access"] });

  async function setRole(uid: string, gestor: boolean) {
    await supabase.from("user_roles").delete().eq("user_id", uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: gestor ? "gestor" : "atendimento" });
    if (error) toast.error(error.message); else toast.success("Perfil atualizado.");
    reload();
  }
  async function toggleUnit(uid: string, unit: string, on: boolean) {
    const { error } = on
      ? await supabase.from("user_units").insert({ user_id: uid, unit_id: unit })
      : await supabase.from("user_units").delete().eq("user_id", uid).eq("unit_id", unit);
    if (error) toast.error(error.message);
    reload();
  }
  async function saveSettings() {
    const rows = [
      { key: "lessons_default", value: Number(lessons) || 0 },
      { key: "courses", value: courses },
    ];
    const { error } = await supabase.from("app_settings").upsert(rows);
    if (error) toast.error(error.message); else toast.success("Configurações salvas.");
    reload();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-primary">Configurações</h1>
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-1 font-bold">Equipe e acesso</h2>
        <p className="mb-3 text-sm text-muted-foreground">Gestor vê tudo. Atendimento vê apenas as unidades marcadas. Novos membros entram como Atendimento em João Pinheiro.</p>
        <div className="overflow-x-auto">
          <table className="sheet">
            <thead><tr><th>Pessoa</th><th>Perfil</th>{units.map((u) => <th key={u.id}>{u.name}</th>)}</tr></thead>
            <tbody>
              {profiles.map((p) => {
                const isG = data?.roles.some((r) => r.user_id === p.id && r.role === "gestor") ?? false;
                return (
                  <tr key={p.id}>
                    <td>{p.full_name}<div className="text-xs text-muted-foreground">{p.email}</div></td>
                    <td>
                      <select className="rounded border bg-card px-1 py-1" value={isG ? "g" : "a"} disabled={p.id === me.id} onChange={(e) => setRole(p.id, e.target.value === "g")}>
                        <option value="a">Atendimento</option><option value="g">Gestor</option>
                      </select>
                    </td>
                    {units.map((u) => {
                      const on = data?.uu.some((x) => x.user_id === p.id && x.unit_id === u.id) ?? false;
                      return <td key={u.id} className="text-center"><input type="checkbox" checked={isG || on} disabled={isG} onChange={(e) => toggleUnit(p.id, u.id, e.target.checked)} /></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-bold">Criar acesso para atendente</h2>
        <p className="text-sm text-muted-foreground">Você define o login e a senha e repassa para a atendente. Ela entra direto, sem e-mail de confirmação.</p>
        <div className="grid gap-2 sm:grid-cols-[2fr_1.5fr_1.5fr_auto] sm:items-end">
          <div><Label>Nome</Label><Input value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} /></div>
          <div><Label>Login</Label><Input autoCapitalize="none" placeholder="ex.: maria" value={nl.login} onChange={(e) => setNl({ ...nl, login: e.target.value.replace(/\s/g, "") })} /></div>
          <div><Label>Senha</Label><Input value={nl.password} minLength={6} onChange={(e) => setNl({ ...nl, password: e.target.value })} /></div>
          <Button variant="accent" disabled={creating} onClick={addLogin}>{creating ? "Criando…" : "Criar acesso"}</Button>
        </div>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-bold">Cursos e aulas</h2>
        <div className="max-w-xs"><Label>Quantidade padrão de aulas incluídas</Label><Input type="number" value={lessons} onChange={(e) => setLessons(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Cursos oferecidos (nome, valor e aulas)</Label>
          {courses.map((c, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
              <Input value={c.name} placeholder="Nome" onChange={(e) => setCourses(courses.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input value={c.value} placeholder="Valor (R$)" onChange={(e) => setCourses(courses.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <Input value={c.lessons} placeholder="Aulas" onChange={(e) => setCourses(courses.map((x, j) => (j === i ? { ...x, lessons: e.target.value } : x)))} />
              <Button variant="outline" onClick={() => setCourses(courses.filter((_, j) => j !== i))}>Remover</Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setCourses([...courses, { name: "", value: "", lessons: "" }])}>+ Adicionar curso</Button>
        </div>
        <Button variant="accent" onClick={saveSettings}>Salvar configurações</Button>
      </section>
    </div>
  );
}
