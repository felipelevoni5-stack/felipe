# Configuração do agente EITECH Marketing AI

O que precisa estar pronto para o agente rodar sozinho. Itens marcados ✅ já estão
prontos; ⏳ dependem do proprietário.

## 1. Diretrizes da marca ⏳

Preencha `marca/diretrizes.md` e coloque o logo em `marca/logo.png`. Sem isso o agente
produz apenas conteúdo genérico e não divulga produtos, preços nem contatos.

## 2. Publicação no Instagram ⏳

Hoje **não existe** integração com o Instagram neste ambiente, e o acesso de rede a
`graph.facebook.com` está bloqueado (teste de 2026-10-21: proxy respondeu 403).
Enquanto isso não for resolvido, o agente prepara os posts completos e eles são
publicados manualmente.

Para ativar a publicação automática (API oficial da Meta — Instagram Graph API):

1. Converter o perfil da EITECH em conta **Profissional (Empresa ou Criador)**.
2. Vincular o perfil a uma **Página do Facebook**.
3. Criar um app em developers.facebook.com com as permissões
   `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights` e
   `pages_show_list`, e gerar um **token de acesso de longa duração**.
4. No ambiente do Claude Code (claude.ai/code → configurações do ambiente):
   - adicionar o token como **segredo/variável de ambiente** (`IG_ACCESS_TOKEN`) e o ID
     da conta (`IG_USER_ID`) — nunca colar o token no chat nem em arquivos do repositório;
   - liberar na política de rede os domínios `graph.facebook.com` e `graph.instagram.com`.
5. A API exige que cada imagem esteja numa **URL pública**. Opção sugerida: um bucket
   público no Supabase Storage (o conector do Supabase já está disponível nesta conta).

Observação: o token da Meta expira (cerca de 60 dias) e precisa ser renovado. O agente
não tem autorização para alterar credenciais — quando a publicação começar a falhar por
token expirado, isso aparece no relatório semanal.

Alternativa sem API: usar uma ferramenta de agendamento (Meta Business Suite, mLabs,
etc.) e publicar manualmente os posts que o agente deixa `pronto`.

## 3. Execução automática (Rotina agendada) ⏳

O agente roda por uma **Rotina** do Claude Code que abre uma sessão nova em cada
execução, com este repositório, e envia o prompt abaixo.

- Frequência sugerida: 1 vez por dia, às 8h40 (horário de Brasília).
- Prompt da rotina:

  > Você é o agente EITECH Marketing AI. Leia e siga integralmente
  > `marketing/eitech-instagram/AGENTE.md`, executando a rodada de hoje. Ao final,
  > faça commit e push das alterações.

## 4. Relatório semanal ✅ (Gmail conectado)

- Enviar para: PREENCHER (e-mail do proprietário)
- Dia: segunda-feira

## 5. Onde o trabalho fica salvo ✅

Tudo nesta pasta, no GitHub (`felipelevoni5-stack/felipe`). Cada rodada faz commit e
push, então o histórico de decisões fica acessível de qualquer computador ou chat.
