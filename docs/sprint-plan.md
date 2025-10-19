# WhatsKovi - Roadmap de Entregas Incrementais

Este documento organiza as proximas melhorias em sprints curtas, mantendo o repositorio estavel e permitindo validacoes graduais. Cada sprint tem entregaveis claros, dependencias e observacoes para facilitar o acompanhamento.

| Sprint | Objetivos principais | Dependencias | Entregaveis |
| ------ | ------------------- | ------------ | ----------- |
| 1 OK. Fundamentos de layout | - Criar pasta oficial de assets (favicons/imagens).<br>- Ajustar proporcao das colunas (tickets vs. chat) e o header do dashboard com status WhatsApp.<br>- Preparar placeholders nos paineis para futuras integracoes. | Nenhuma | - `frontend/src/app/dashboard/page.tsx` com layout atualizado.<br>- Pasta `frontend/assets/` estruturada (ex.: `assets/icons`, `assets/images`).<br>- Header exibindo status/numero do WhatsApp (dados do store de conexoes). |
| 2 OK. Backend de mensagens e notas | - Atualizar schema Prisma com relacionamentos (quoted message, reactions, edited metadata).<br>- Criar tabela de reacoes e campos `editedAt/editedBy`.<br>- Expor rotas para editar/apagar mensagens, citar, reagir (HTTP + eventos socket).<br>- Garantir migracao reversivel e documentada. | Sprint 1 | - `prisma/migrations` + schema atualizado.<br>- Endpoints REST e eventos WebSocket documentados (`messageController`, `routes/index`).<br>- Atualizacao do README/CHANGELOG com instrucoes de migracao. |
| 3 OK. Camada de dados no frontend | - Atualizar stores (`ticketStore`, `metadataStore`) para suportar novos campos e acoes (edit, delete, reactions, quoted).<br>- Garantir fetch/control de avatares do contato.<br>- Criar hooks utilitarios (ex.: formatacao de notas). | Sprint 2 | - Stores com tipagem estendida e chamadas as novas rotas.<br>- Tratamento de avatares e fallback centralizados.<br>- Testes manuais minimos (lint + chamada de API fake). |
| 4 OK. Painel do contato e notas | - Implantar scroll nos atendimentos recentes (mostrar 3 ultimos + overflow).<br>- Transformar notas internas em cards com modal detalhado (nome, telefone, autor, data/hora, conteudo).<br>- Persistir leitura/criacao via backend (usando mensagens internas). | Sprints 2 e 3 | - `ContactPanel` com UI nova, modais e scroll.<br>- Reuso de notas internas vindas do backend (mensagens `isPrivate`).<br>- Documentacao de uso e prints para QA. |
| 5 OK. Chat - UX avancada (Parte 1) | - Baloes de notas internas com cor `#f58a32` e legenda "nao visivel para o cliente".<br>- Suporte a midia (envio/upload + visualizacao) e botao de microfone funcional.<br>- Emoji picker funcional (biblioteca leve). | Sprints 2 e 3 | - `ChatArea` com novos componentes de item de mensagem.<br>- Uploads integrados com backend (feedback de progresso/erro).<br>- Emoji picker integrado ao texto. |
| 6 OK. Chat - UX avancada (Parte 2) | - Responder citando mensagem (renderizacao do quote + foco ao clicar).<br>- Reacoes (curtir) com contadores.<br>- Editar/apagar mensagens (menu contextual + modal).<br>- Exibir marcacao "editada" ao lado do horario. | Sprint 5 | - UI completa de reply/reaction/edit.<br>- Fluxos de edicao/remocao validados (incl. sockets).<br>- Atualizacao do manual do atendente (novo fluxo). |

## Observacoes Gerais

- **Controle de versoes**: todas as sprints devem atualizar `CHANGELOG.md` (ou arquivo equivalente) e reforcar testes (`npm run lint`, `npm run build`).
- **Migracoes Prisma**: execute `npm run prisma:migrate dev` em ambiente local antes da entrega; documentar passos de rollback.
- **Sockets**: garantir que cada evento emitido tenha payload consistente (incluir `ticketId`, `messageId`, etc.).
- **UX e QA**: ao final de cada sprint, anexar prints ou rapidas gravacoes GIF para facilitar validacao.
- **Assets**: manter arquivos em `frontend/assets/` referenciados com caminhos relativos claros; evitar colocar imagens em `public/` sem padrao.
- **Feature toggles (opcional)**: caso necessario, considerar flags simples para liberar funcionalidades gradualmente para a equipe.

Com esse plano, atacamos primeiro as bases visuais e arquiteturais, depois evoluimos backend e stores, e somente entao refinamos as experiencias complexas na conversa. Isso reduz riscos e mantem o repositorio saudavel a cada entrega. Varra cada sprint com PRs dedicados e revisoes focadas. Boa implementacao!
