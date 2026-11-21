import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

function Shell() {
  const { data: me } = useMe();
  const links = [
    { to: "/meu-dia", label: "Meu dia" },
    { to: "/alunos", label: "Alunos" },
    { to: "/importar", label: "Importar" },
    ...(me?.isGestor ? [{ to: "/gestao", label: "Gestão" }, { to: "/configuracoes", label: "Configurações" }] : []),
  ] as const;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b-4 border-accent bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <Link to="/meu-dia" className="flex items-center gap-2">
            <span className="rounded bg-card px-2 py-1"><img src="/logo.webp" alt="Autoescola Pinheirense" className="h-7" /></span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded px-3 py-1.5 text-sm font-semibold text-sidebar-foreground/85 hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:inline">{me?.name}{me?.isGestor ? " · Gestor" : " · Atendimento"}</span>
            <Button size="sm" variant="secondary" onClick={() => supabase.auth.signOut()}>Sair</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-3 py-5 sm:px-4">
        <Outlet />
      </main>
    </div>
  );
}
