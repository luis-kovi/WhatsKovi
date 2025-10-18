# Changelog

## [Sprint 5] - 2025-10-18

### Added
- `MessageItem` centraliza o rendering de mensagens, oferecendo baloes especiais para notas internas (#f58a32) com legenda "nao visivel para o cliente" e suporte completo a reacoes.
- Emoji picker com `@emoji-mart/react` integrado ao composer, inserindo emojis na posicao do cursor e fechando automaticamente ao clicar fora.
- Gravacao de audio inline via `MediaRecorder`, com envio automatizado como mensagens `type: AUDIO` respeitando notas internas (`isPrivate`).

### Changed
- Uploads de midia exibem barra de progresso e desabilitam acoes conflitantes enquanto o envio ocorre (anexos e audios gravados).
- Composer reorganizado com novos controles (emoji, anexos, microfone) e melhorias visuais nas respostas rapidas.
- Backend aplica overrides para `tar-fs` e `ws`, eliminando alertas de vulnerabilidade herdados de `whatsapp-web.js`.

## [Sprint 4] - 2025-10-18

### Added
- Contact panel agora exibe notas internas como cards com modal de detalhes e criacao, reaproveitando o fluxo de mensagens privadas (`type: NOTE` + `isPrivate`).
- Endpoint `GET /api/contacts/:id` passa a retornar `internalNotes` agregadas (ate 50) com autor, fila e status do ticket para cada anotacao.
- Documento `docs/contact-notes-qa.md` orienta o uso da feature e lista cenarios de validacao com referencias visuais.

### Changed
- A textarea de notas no painel foi substituida por cards interativos, modais e area de atendimentos recentes com rolagem controlada.

## [Sprint 2] - 2025-10-17

### Added
- Prisma schema support for message quoting, reactions, and edit metadata (`20251017090000_messages_enhancements` migration).
- REST endpoints to edit, delete, and react to messages (`PUT /api/messages/:id`, `DELETE /api/messages/:id`, `POST /api/messages/:id/reactions`, `DELETE /api/messages/:id/reactions/:reactionId`).
- WebSocket broadcasts for updates and removals (`message:update`, `message:delete`) aligned with the new workflows.

### Migration
- Run `cd backend && npm run prisma:migrate` to apply the latest schema before starting the API.

### Rollback
- If you need to revert, run `cd backend && npx prisma migrate resolve --rolled-back "20251017090000_messages_enhancements"` and then execute `npm run prisma:migrate` to reapply after adjustments.

## [Sprint 3] - 2025-10-17

### Added
- Frontend data layer now mirrors the enhanced messaging API (`ticketStore` caches messages, handles edits/deletes/reactions, and normalizes avatars and media URLs).
- `useMessages`, `useAvatar`, and `useNotesFormatter` hooks encapsulate messaging workflows, avatar fallbacks, and note formatting utilities for shared use.
- Reaction palette defaults (`metadataStore.reactionPalette`) drive UI toggles for emoji reactions while keeping state centralized.
