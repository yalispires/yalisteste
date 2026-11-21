import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Autoescola Pinheirense — Acompanhamento de alunos" },
      { name: "description", content: "Sistema da equipe para acompanhar alunos da matrícula à aprovação." },
      { property: "og:title", content: "Autoescola Pinheirense — Acompanhamento de alunos" },
      { property: "og:description", content: "Sistema da equipe para acompanhar alunos da matrícula à aprovação." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/meu-dia" });
  },
});
