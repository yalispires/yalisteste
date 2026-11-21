import { describe, it, expect } from "vitest";
import { approvalRate, deadlineOf, suggestNext, fmtCPF, pct } from "./domain";

const base = { theory_status: "nunca_fez", followup_status: "a_contatar" };

describe("regras", () => {
  it("aprovação exclui faltas", () => {
    expect(approvalRate(["aprovado", "reprovado", "faltou", "aprovado"])).toBeCloseTo(2 / 3);
  });
  it("sem provas realizadas retorna null", () => {
    expect(approvalRate(["faltou"])).toBeNull();
  });
  it("retorno vencido fica atrasado", () => {
    expect(deadlineOf({ ...base, next_return_date: "2026-10-01" }, "2026-10-26")).toBe("atrasado");
    expect(deadlineOf({ ...base, next_return_date: "2026-10-26" }, "2026-10-26")).toBe("hoje");
  });
  it("pausa não vira cobrança", () => {
    expect(deadlineOf({ ...base, followup_status: "pausa_solicitada", next_return_date: "2026-01-01" }, "2026-10-26")).toBe("pausado");
  });
  it("cadastro novo sugere primeiro contato", () => {
    expect(suggestNext(base)).toBe("Fazer primeiro contato e identificar objetivo e dificuldade");
  });
  it("sem resposta sugere outro horário", () => {
    expect(suggestNext({ ...base, last_contact_at: "x" }, { lastResult: "sem_resposta" })).toBe(
      "Tentar contato pessoal em outro dia e horário",
    );
  });
  it("dificuldade em questões vai à professora Priscila", () => {
    expect(suggestNext({ ...base, last_contact_at: "x" }, { difficulty: "questoes" })).toContain("Priscila");
  });
  it("CPF preserva zeros iniciais", () => {
    expect(fmtCPF("01234567890")).toBe("012.345.678-90");
  });
  it("percentual de simulado", () => {
    expect(pct(21, 30)).toBe(70);
  });
});
