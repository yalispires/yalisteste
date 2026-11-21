# Autoescola Pinheirense — Sistema de Acompanhamento de Alunos

Sistema de acompanhamento de alunos de autoescola, do cadastro até a aprovação na prova
teórica: quem procurar hoje, o que foi conversado, qual o próximo passo, quando é a prova
e quem já foi aprovado.

**Papéis:** `gestor` (todos os acessos e configurações) e `atendimento` (unidades liberadas).
**Unidades:** João Pinheiro, Luizlândia do Oeste–JK, Varjão de Minas e São Gonçalo do Abaeté.

## Stack

- TanStack Start (React 19 + Vite) — front e funções de servidor
- Tailwind CSS v4
- Banco de dados, login e armazenamento de arquivos: Supabase (Lovable Cloud)
- Deploy de servidor: Nitro (detecta automaticamente a Vercel, Cloudflare, Netlify…)

## Rodando localmente

Pré-requisitos: Node.js 20+ (ou Bun).

```bash
npm install        # ou: bun install
cp .env.example .env
npm run dev        # abre em http://localhost:8080
```

## Variáveis de ambiente

| Variável | Onde é lida | Para que serve |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | navegador | endereço do backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | navegador | chave pública (publishable) de acesso |
| `VITE_SUPABASE_PROJECT_ID` | navegador | id do projeto |
| `SUPABASE_URL` | servidor | endereço do backend nas funções de servidor |
| `SUPABASE_PUBLISHABLE_KEY` | servidor | chave pública nas funções de servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | **secreta** — usada só em "Criar acesso para atendente" |

As chaves `sb_publishable_...` são públicas por design (o navegador as baixa mesmo).
A `SUPABASE_SERVICE_ROLE_KEY` **nunca** vai para o GitHub: ela existe apenas como variável
de ambiente no painel do backend e no Vercel.

## Banco de dados

O schema completo está em `drizzle/migrations/`:

- `0000_migration.sql` — tabelas, índices, permissões, RLS, gatilhos de negócio e as
  unidades iniciais.
- `0001_gestor_only_identity_edit.sql` — só o gestor altera nome, CPF e telefone do aluno.

Para apontar para um Supabase seu, rode os dois arquivos na ordem (SQL editor do projeto
ou `supabase db push`) e depois ajuste as variáveis de ambiente acima.

O login cria o perfil e o papel automaticamente: o primeiro usuário vira `gestor`, os
demais `atendimento` em João Pinheiro.

## Subindo para o GitHub

```bash
git init
git add .
git commit -m "Sistema de acompanhamento de alunos"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Antes do primeiro `git add .`, confirme que nenhuma chave secreta está sendo commitada:
`SUPABASE_SERVICE_ROLE_KEY` não deve existir em `.env` nem em nenhum arquivo do repositório.

## Publicando na Vercel

1. Em [vercel.com](https://vercel.com), **Add New → Project** e importe o repositório do GitHub.
2. Em **Environment Variables**, adicione:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (sem ela, o botão "Criar acesso para atendente" não funciona)
3. Deixe o build como está (`npm run build`). O Vercel reconhece o Nitro sozinho e o Nitro
   gera a saída `.vercel/output` no formato que a Vercel espera, sem configuração extra.
4. Clique em **Deploy**.

Se um dia o build gerar o alvo errado, force o formato da Vercel de uma destas formas:

- variável de ambiente `NITRO_PRESET=vercel` no projeto da Vercel; ou
- `nitro: { preset: "vercel" }` dentro de `defineConfig({ ... })` em `vite.config.ts`
  (isso só vale para builds fora do Lovable, o publish do Lovable continua no Cloudflare).

## Testes

```bash
npm run test
```

Cobre as regras de negócio (prazos, taxa de aprovação, formatação de CPF/telefone, login
interno, caixa alta) e o roteamento das páginas.

## Estrutura

```
src/
  routes/
    __root.tsx            layout e metadados gerais
    auth.tsx              tela de entrada (e-mail/senha e Google)
    index.tsx             redireciona para /meu-dia
    _authenticated/
      route.tsx           cabeçalho e navegação
      meu-dia.tsx         tarefas do dia
      alunos.index.tsx    planilha de alunos (em acompanhamento / aprovados)
      alunos.$id.tsx      cadastro do aluno (histórico, estudos, provas, anexos)
      importar.tsx        importação de planilha CSV
      gestao.tsx          indicadores do gestor
      configuracoes.tsx   equipe, unidades e parâmetros
  lib/
    domain.ts             regras e rótulos
    data.ts               consultas ao banco
    team.functions.ts     criação de acesso de atendente (servidor)
  integrations/supabase/  clientes de banco e autenticação (gerados)
drizzle/migrations/       schema e gatilhos do banco
public/                   logo e favicon
```
