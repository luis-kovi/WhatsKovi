# Painel de contato - notas internas

## Visao geral
- Notas internas foram migradas para o fluxo de mensagens privadas (`type NOTE` + `isPrivate`), mantendo historico centralizado por contato.
- O painel exibe cards com resumo, autor e horarios, alem de modal completo com fila/status do ticket relacionado.
- A secao de atendimentos recentes ganhou rolagem com limite visual de tres registros simultaneos.

## Como registrar uma nova nota
1. Abra um ticket e confirme que o painel lateral exibe o contato selecionado.
2. Clique em `Nova nota` no topo do painel.
3. Preencha o conteudo com observacoes relevantes (orientacoes internas, aprendizados ou informacoes sensiveis).
4. Confirme com `Registrar nota`. O modal e fechado automaticamente e a nota aparece no topo da lista.
5. Clique no card da nota para abrir o modal de detalhes e validar autor, data/hora, fila e status.

## Checklist de QA rapido
- Criar nota com texto simples e validar exibicao imediata no card e no modal de detalhes.
- Criar nota longa (multiplas linhas) e garantir quebra correta no card (line clamp) e apresentacao completa no modal.
- Validar que notas antigas continuam visiveis (ate 50 entradas) e respeitam ordenacao descrescente por data.
- Bloquear/desbloquear contato para garantir que o botao de bloqueio continua funcional com a nova estrutura visual.
- Confirmar que a area de `Atendimentos recentes` limita a altura e permite rolagem para listas maiores que tres itens.

## Referencias visuais (substituir por capturas reais)
![Visao geral do painel](https://via.placeholder.com/1200x700/FF355A/FFFFFF?text=Painel+de+Contato+-+Notas)
![Modal de detalhes](https://via.placeholder.com/1200x700/0A0A0A/FFFFFF?text=Modal+de+Detalhes+da+Nota)
![Modal de criacao](https://via.placeholder.com/1200x700/F9F9F9/1E1E1E?text=Nova+Nota+Interna)
