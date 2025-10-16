# 🤝 Guia de Contribuição - WhatsKovi

Obrigado por considerar contribuir com o WhatsKovi! Este documento fornece diretrizes para contribuir com o projeto.

## 📋 Código de Conduta

- Seja respeitoso e inclusivo
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

## 🚀 Como Contribuir

### Reportar Bugs

1. Verifique se o bug já foi reportado nas Issues
2. Se não, crie uma nova Issue com:
   - Título claro e descritivo
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots (se aplicável)
   - Versão do sistema e ambiente

### Sugerir Melhorias

1. Abra uma Issue com a tag `enhancement`
2. Descreva claramente a melhoria
3. Explique por que seria útil
4. Forneça exemplos de uso

### Pull Requests

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 💻 Padrões de Código

### TypeScript

```typescript
// ✅ Bom
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  // implementação
};

// ❌ Evitar
const getUser = async (id) => {
  // sem tipos
};
```

### Nomenclatura

- **Variáveis e Funções**: camelCase
  ```typescript
  const userName = 'João';
  const getUserById = () => {};
  ```

- **Componentes React**: PascalCase
  ```typescript
  const UserProfile = () => {};
  ```

- **Constantes**: UPPER_SNAKE_CASE
  ```typescript
  const MAX_TICKETS = 10;
  ```

- **Arquivos**: 
  - Componentes: PascalCase (UserProfile.tsx)
  - Utilitários: camelCase (formatDate.ts)

### Estrutura de Componentes React

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store';

interface Props {
  id: string;
  name: string;
}

export default function MyComponent({ id, name }: Props) {
  const [state, setState] = useState('');

  useEffect(() => {
    // efeitos
  }, []);

  const handleAction = () => {
    // handlers
  };

  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Commits

Use Conventional Commits:

```
feat: adiciona funcionalidade X
fix: corrige bug Y
docs: atualiza documentação
style: formata código
refactor: refatora componente Z
test: adiciona testes
chore: atualiza dependências
```

Exemplos:
```
feat: adiciona filtro por data nos tickets
fix: corrige erro ao enviar mensagem
docs: atualiza README com instruções de deploy
refactor: melhora performance da lista de tickets
```

## 🧪 Testes

### Backend

```typescript
// Exemplo de teste
describe('AuthController', () => {
  it('deve fazer login com credenciais válidas', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

### Frontend

```typescript
// Exemplo de teste de componente
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

describe('UserProfile', () => {
  it('deve renderizar nome do usuário', () => {
    render(<UserProfile name="João" />);
    expect(screen.getByText('João')).toBeInTheDocument();
  });
});
```

## 📁 Estrutura de Arquivos

### Adicionar novo Controller (Backend)

```
backend/src/controllers/
└── meuController.ts
```

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const minhaFuncao = async (req: AuthRequest, res: Response) => {
  try {
    // implementação
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Mensagem de erro' });
  }
};
```

### Adicionar novo Componente (Frontend)

```
frontend/src/components/
└── meuComponente/
    └── MeuComponente.tsx
```

## 🎨 Estilo e UI

### Cores

Use as cores definidas no tema:

```typescript
// Tailwind classes
className="bg-primary text-white"
className="bg-secondary border-secondary"
className="bg-gray-50 text-gray-800"
```

### Componentes

- Use componentes reutilizáveis
- Mantenha componentes pequenos e focados
- Extraia lógica complexa para hooks customizados

## 📝 Documentação

- Documente funções complexas
- Adicione comentários quando necessário
- Atualize README.md se adicionar features
- Mantenha ARCHITECTURE.md atualizado

### Exemplo de Documentação

```typescript
/**
 * Envia uma mensagem para um ticket específico
 * 
 * @param ticketId - ID do ticket
 * @param message - Conteúdo da mensagem
 * @param userId - ID do usuário que está enviando
 * @returns Promise com a mensagem criada
 * @throws Error se o ticket não existir
 */
const sendMessage = async (
  ticketId: string,
  message: string,
  userId: string
): Promise<Message> => {
  // implementação
};
```

## 🔍 Code Review

Ao revisar PRs, verifique:

- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Não há código comentado desnecessário
- [ ] Não há console.logs esquecidos
- [ ] Performance não foi degradada
- [ ] Segurança foi considerada

## 🐛 Debug

### Backend

```typescript
// Use o debugger do VS Code
// Adicione breakpoints
// Ou use console.log temporariamente (remova antes do commit)
console.log('Debug:', { variable });
```

### Frontend

```typescript
// Use React DevTools
// Console do navegador
console.log('State:', state);
```

## 📦 Dependências

### Adicionar Nova Dependência

```bash
# Backend
cd backend
npm install nome-do-pacote

# Frontend
cd frontend
npm install nome-do-pacote
```

- Justifique a necessidade da dependência
- Verifique licença e manutenção
- Prefira pacotes bem mantidos

## 🚀 Deploy

Antes de fazer merge:

- [ ] Código foi testado localmente
- [ ] Build passa sem erros
- [ ] Migrations foram testadas
- [ ] Variáveis de ambiente documentadas
- [ ] README atualizado se necessário

## 📞 Dúvidas?

- Abra uma Issue com a tag `question`
- Entre em contato: dev@whatskovi.com
- Consulte a documentação existente

## 🎯 Prioridades Atuais

### Alta Prioridade
- Testes automatizados
- Melhorias de performance
- Correção de bugs críticos

### Média Prioridade
- Novas features da Fase 2
- Melhorias de UX
- Refatorações

### Baixa Prioridade
- Otimizações menores
- Melhorias de documentação
- Features experimentais

## 🏆 Reconhecimento

Todos os contribuidores serão reconhecidos no README.md e terão seus nomes listados na seção de contribuidores.

---

Obrigado por contribuir com o WhatsKovi! 🚀
