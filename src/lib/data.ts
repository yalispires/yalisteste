import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students">;
export type Contact = Tables<"contacts">;
export type Unit = Tables<"units">;
export type Profile = Tables<"profiles">;

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) return null;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      const isGestor = (roles ?? []).some((r) => r.role === "gestor");
      return {
        id: user.id,
        email: user.email ?? "",
        name: profile?.full_name || user.email || "",
        isGestor,
      };
    },
    staleTime: 60_000,
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").order("sort");
      if (error) throw error;
      return data;
    },
    staleTime: 300_000,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
    staleTime: 300_000,
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const all: Student[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .order("full_name")
          .range(from, from + 999);
        if (error) throw error;
        all.push(...data);
        if (data.length < 1000) break;
      }
      return all;
    },
  });
}

export function useRefreshStudents() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ["students"] });
    if (id) qc.invalidateQueries({ queryKey: ["student", id] });
  };
}
