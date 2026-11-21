import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loginToEmail } from "./domain";

export const createStaffLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; login: string; password: string }) => {
    const name = String(d?.name ?? "").trim();
    const login = String(d?.login ?? "").trim();
    const password = String(d?.password ?? "");
    if (!name || name.length > 100) throw new Error("Informe o nome.");
    if (!/^[a-zA-Z0-9._@-]{3,60}$/.test(login))
      throw new Error("Login deve ter de 3 a 40 letras, números, ponto ou traço.");
    if (password.length < 6 || password.length > 72) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    return { name, login, password };
  })
  .handler(async ({ data, context }) => {
    const { data: isG } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "gestor" });
    if (!isG) throw new Error("Somente gestores podem criar acessos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: loginToEmail(data.login),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (error) throw new Error(error.message.includes("already") ? "Esse login já existe." : error.message);
    return { ok: true };
  });
