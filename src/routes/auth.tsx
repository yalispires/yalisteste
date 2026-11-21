import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginToEmail } from "@/lib/domain";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Autoescola Pinheirense" },
      { name: "description", content: "Acesso da equipe ao acompanhamento de alunos da Autoescola Pinheirense." },
      { property: "og:title", content: "Entrar — Autoescola Pinheirense" },
      { property: "og:description", content: "Acesso da equipe ao acompanhamento de alunos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/meu-dia" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/meu-dia" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: loginToEmail(email), password });
      if (error) toast.error("Login ou senha incorretos.");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else toast.success("Conta criada. Confira seu e-mail para confirmar o acesso.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com Google.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <img src="/logo.webp" alt="Autoescola Pinheirense" className="mx-auto w-56" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-primary">{mode === "in" ? "Entrar" : "Criar acesso"}</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de alunos</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <div><Label>Seu nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          )}
          <div><Label>{mode === "in" ? "Login ou e-mail" : "E-mail"}</Label><Input type={mode === "in" ? "text" : "email"} autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" variant="accent" className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Criar acesso"}</Button>
        </form>
        <Button variant="outline" className="w-full" onClick={google}>Continuar com Google</Button>
        <button className="w-full text-center text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
