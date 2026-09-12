# PDV PRO

Sistema de Ponto de Venda (PDV) multi-tenant para pequenos comércios de varejo.

> Esta versão registra vendas e operações comerciais. A emissão de documentos fiscais
> oficiais (NFC-e/NFS-e) depende de integração fiscal, certificado digital e
> configuração tributária adequados, e será desenvolvida em uma etapa futura.

## Status do projeto

Etapas concluídas:
- **Fundação** — projeto, banco de dados, autenticação, cadastro de empresa, usuários
  e permissões, layout principal.
- **Produtos e Estoque** — categorias, cadastro de produtos (SKU/código de barras
  únicos por empresa), movimentações de estoque (entrada, saída, ajuste, inventário),
  controle de estoque negativo configurável por empresa, alertas de estoque baixo.
- **PDV / Vendas** — busca por nome/SKU/código de barras (compatível com leitor USB),
  carrinho com desconto por item e por venda (limite configurável para operador),
  pagamento com múltiplas formas e valores divididos, troco, proteção contra duplo
  clique, baixa de estoque transacional vinculada à venda, cancelamento de venda
  (somente admin/gerente, devolve estoque) e comprovante não fiscal.
- **Caixa** — abertura com fundo inicial, sangria e suprimento, fechamento com cálculo
  automático do valor esperado em dinheiro (fundo + vendas em dinheiro − troco +
  suprimentos − sangrias), exigência de justificativa quando há diferença, e retrato
  imutável dos totais no momento do fechamento. Vendas agora exigem caixa aberto.
- **Clientes e Relatórios** — cadastro opcional de clientes (nunca obrigatório no PDV),
  seleção do cliente na venda e histórico de compras (admin/gerente). Relatórios de
  Vendas (total, ticket médio, produtos mais vendidos, canceladas), Financeiro (por
  forma de pagamento, sangrias/suprimentos, fechamentos de caixa) e Estoque (baixo
  estoque, sem estoque, valor total em estoque), com filtro por período — acesso
  restrito a admin/gerente.
- **Auditoria e Segurança** — revisão completa de multi-tenant, permissões e
  integridade, com correções de dois problemas reais: e-mail de usuário agora é único
  em toda a plataforma (evita login/redefinição de senha ambíguos entre empresas), e a
  empresa nunca mais fica sem nenhum administrador ativo (bloqueia desativar **ou**
  rebaixar o último ADMIN). Adicionada tela de **Auditoria** (só ADMIN) para consultar
  a trilha de ações sensíveis, auditoria em criação/edição de produtos (com registro
  específico de alteração de preço) e clientes, limite de tentativas em cadastro e
  recuperação de senha, cabeçalhos de segurança HTTP (`helmet`), suporte configurável a
  proxy reverso, e correção de vulnerabilidades conhecidas nas dependências de produção
  (0 vulnerabilidades encontradas hoje).
- **Configurações** — tela (só ADMIN) para editar nome/CNPJ da empresa, ligar/desligar
  estoque negativo e ajustar o limite de desconto do operador — antes só dava para
  mudar direto no banco. A seção fiscal é só informativa, deixando claro que a emissão
  oficial ainda depende de integração futura.

Ainda não implementado (aparecem como "em breve" no sistema ou fora do menu):
Configurações fiscais reais, Administração da plataforma (painel do dono do SaaS para
gerenciar todas as empresas clientes), importação/exportação de produtos via CSV,
suporte a múltiplas lojas por empresa na interface (o modelo de dados já suporta,
falta a tela de gestão).

## Arquitetura

```
apps/
  web/   React + TypeScript + Vite + Tailwind CSS (frontend)
  api/   Node.js + TypeScript + Express + Prisma (backend REST)
```

- **Banco de dados**: PostgreSQL (Vercel Postgres / Neon).
- **ORM**: Prisma.
- **Autenticação**: JWT de acesso (15 min) + refresh token (7 dias, cookie httpOnly,
  revogável) + senha com hash bcrypt.
- **Multi-tenant**: todo dado comercial pertence a uma empresa (`Tenant`); o backend
  nunca confia no `tenantId` vindo do cliente — ele vem sempre do token JWT verificado.

## Pré-requisitos

- Node.js 20+ (testado com Node 24).
- Uma conta na [Vercel](https://vercel.com) para criar o banco Postgres (gratuito).

## Configuração do banco de dados (Vercel Postgres)

1. Acesse [vercel.com](https://vercel.com/dashboard) → **Storage** → **Create Database**
   → escolha **Postgres** (Neon).
2. Após criado, abra a aba **.env.local** / **Quickstart** do banco e copie a variável
   `DATABASE_URL` (ou `POSTGRES_URL`, com `sslmode=require`).
3. Cole o valor em `apps/api/.env` (crie o arquivo a partir de `apps/api/.env.example`).

## Como rodar localmente

```bash
# 1. instalar dependências (na raiz do monorepo)
npm install

# 2. configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
# edite apps/api/.env e cole a DATABASE_URL do passo anterior
# gere valores aleatórios para JWT_ACCESS_SECRET e JWT_REFRESH_SECRET

cp apps/web/.env.example apps/web/.env

# 3. aplicar o schema no banco
npm run prisma:migrate --workspace apps/api -- --name init

# 4. subir API e frontend em paralelo
npm run dev:api    # http://localhost:3333
npm run dev:web    # http://localhost:5173
```

Rode `npm run dev:api` e `npm run dev:web` em dois terminais separados (o script
combinado `npm run dev` também funciona, mas mistura os logs).

## Testes automatizados (backend)

```bash
npm run test --workspace apps/api
```

Os testes rodam contra o mesmo banco configurado em `apps/api/.env` e limpam as
tabelas usadas antes de cada teste — **não aponte para um banco de produção com dados
reais** ao rodar a suíte.

## Como testar manualmente no navegador

1. Acesse `http://localhost:5173/cadastro-empresa` e crie uma empresa (isso já cria a
   loja principal e o usuário administrador).
2. Você será autenticado automaticamente e redirecionado para a Visão Geral.
3. Vá em **Usuários e permissões** → **Novo usuário** e crie um usuário `OPERADOR`.
4. Clique em **Sair**, entre com o novo usuário operador e confirme que o botão "Novo
   usuário" não aparece (apenas ADMIN pode criar usuários).
5. Em **Minha empresa**, confirme que os dados da empresa e da loja aparecem
   corretamente.
6. Teste "Esqueci minha senha" em `/esqueci-senha` — como não há serviço de e-mail
   configurado, o link de redefinição aparece na própria tela (apenas em
   desenvolvimento) para você poder testar o fluxo completo.
7. Em **Produtos**, clique em "Novo produto", crie uma categoria nova direto no
   formulário e cadastre um produto com código de barras e estoque inicial.
8. Em **Estoque**, use os botões "Entrada", "Saída" e "Ajuste" no produto criado e
   confira o histórico de movimentações. Tente uma saída maior que o estoque atual —
   deve ser bloqueada (por padrão a empresa não permite estoque negativo).
9. Reduza o estoque de um produto para um valor menor ou igual ao "estoque mínimo"
   cadastrado (via Ajuste) e confirme que ele aparece marcado como "Estoque baixo" e
   soma no card correspondente da Visão Geral.
10. No **PDV**, digite o código de barras do produto no campo de busca e pressione
    Enter (ou clique numa sugestão da lista) para adicioná-lo ao carrinho. Ajuste a
    quantidade e, como ADMIN, aplique um desconto.
11. Clique em "Finalizar venda", divida o pagamento entre duas formas (ex.: Dinheiro +
    Pix) e confirme — o comprovante não fiscal deve aparecer com os valores corretos.
    Confira que o estoque do produto baixou e que a Visão Geral mostra a venda do dia.
12. Tente vender uma quantidade maior que o estoque disponível — a finalização deve
    ser bloqueada com uma mensagem clara.
13. Entre como um usuário `OPERADOR` e confirme que ele não consegue aplicar desconto
    (campo desabilitado, a menos que a empresa tenha configurado um limite) nem
    cancelar vendas.
14. Antes de abrir o caixa, tente finalizar uma venda no PDV — deve ser bloqueada com a
    mensagem "Não há caixa aberto".
15. Em **Caixa**, abra o caixa informando um fundo inicial, faça uma sangria e um
    suprimento, depois volte ao PDV e finalize uma venda em dinheiro com troco.
16. Volte ao Caixa e clique em "Fechar caixa". Informe um valor contado igual ao
    "fundo + vendas em dinheiro − troco + suprimentos − sangrias" para fechar sem
    diferença, ou um valor diferente para testar a exigência de justificativa.
17. Em **Clientes**, cadastre um cliente só com o nome (demais campos são opcionais).
    No **PDV**, clique em "Identificar cliente", busque e selecione esse cliente antes
    de finalizar uma venda — o comprovante deve mostrar o nome dele.
18. Volte a **Clientes** e clique em "Histórico" no cliente — a venda que você acabou
    de fazer deve aparecer.
19. Em **Relatórios**, confira as três abas (Vendas, Financeiro, Estoque) com o filtro
    de período "Hoje" — os números devem bater com o que você registrou nos passos
    anteriores. Entre como `OPERADOR` e confirme que o item "Relatórios" some do menu
    e que acessar `/relatorios` diretamente mostra "Você não tem permissão".
20. Em **Auditoria** (só ADMIN), confira que login, cadastro de produto/cliente e
    venda aparecem na lista. Tente desativar a si mesmo em **Usuários e permissões**
    sendo o único ADMIN — deve ser bloqueado com "A empresa precisa de pelo menos um
    administrador ativo."
21. Tente cadastrar um segundo usuário (em qualquer empresa) com um e-mail que já
    exista em outra empresa — deve ser bloqueado com "Já existe uma conta com este
    e-mail."
22. Em **Configurações** (só ADMIN), altere o CNPJ, ligue "Permitir estoque negativo" e
    ajuste o desconto máximo do operador. Salve, recarregue a página e confirme que os
    valores persistiram. Entre como `OPERADOR` ou `GERENTE` e confirme que o item
    "Configurações" não aparece no menu.

## Deploy em produção (Vercel)

O backend (`apps/api`) e o frontend (`apps/web`) são publicados como **dois projetos
Vercel separados**, cada um apontando para uma pasta do mesmo repositório GitHub.

### Backend (`apps/api`)

- **Root Directory**: `apps/api`
- **Framework Preset**: Other
- **Build Command**: `npx prisma generate && npx prisma migrate deploy`
- **Output Directory**: deixar em branco (não gera arquivos estáticos)
- **Variáveis de ambiente**: `DATABASE_URL` (do banco de produção, separado do banco
  usado em desenvolvimento/testes), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (valores
  aleatórios únicos, nunca reaproveitados do `.env` local), `NODE_ENV=production`,
  `TRUST_PROXY=true`, `WEB_ORIGIN` (a URL do projeto do frontend na Vercel, ex.:
  `https://pdv-pro-web.vercel.app`, sem barra no final).

O ponto de entrada usado pela Vercel é `apps/api/api/index.ts` (formato de função
serverless) e `apps/api/vercel.json` redireciona todas as rotas para essa função — o
código do Express em `src/app.ts` continua sendo o mesmo usado em desenvolvimento local.

### Frontend (`apps/web`)

- **Root Directory**: `apps/web`
- **Framework Preset**: Vite (detectado automaticamente)
- **Variáveis de ambiente**: `VITE_API_URL` (a URL do projeto do backend na Vercel, ex.:
  `https://pdv-pro-api.vercel.app`, sem barra no final e sem `/api`).

### Ordem recomendada

1. Criar o projeto do backend primeiro e anotar sua URL.
2. Criar o projeto do frontend usando essa URL em `VITE_API_URL`.
3. Voltar ao projeto do backend e atualizar `WEB_ORIGIN` com a URL final do frontend,
   depois rodar um novo deploy (redeploy) para aplicar a variável.
