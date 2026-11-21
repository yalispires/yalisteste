CREATE OR REPLACE FUNCTION public.students_identity_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'gestor')
     and (new.full_name is distinct from old.full_name or new.cpf is distinct from old.cpf or new.phone is distinct from old.phone) then
    raise exception 'Somente o gestor pode alterar nome, CPF e telefone.';
  end if;
  return new;
end $$;
CREATE TRIGGER students_identity_guard BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.students_identity_guard();