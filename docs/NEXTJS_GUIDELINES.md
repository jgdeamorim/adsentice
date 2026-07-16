# Next.js 15 Best Practices

## Objetivo

Este documento define os padrões obrigatórios para desenvolvimento utilizando
Next.js 15.1.2.

---

# Estrutura

- App Router
- Server Components por padrão
- Client Components somente quando necessário
- TypeScript obrigatório

---

# Organização

app/
components/
hooks/
services/
lib/
types/
actions/
providers/
constants/

Nunca criar arquivos fora desse padrão.

---

# Server Components

✅ Preferir Server Components.

Somente utilizar:

"use client"

quando existir:

- useState
- useEffect
- eventos
- browser APIs

---

# Data Fetching

Sempre utilizar:

fetch()

com cache apropriado.

Evitar axios sem necessidade.

---

# Server Actions

Toda lógica de escrita deve ficar em:

actions/

Nunca colocar lógica dentro da página.

---

# Componentes

Cada componente deve:

- possuir responsabilidade única
- menos de 200 linhas
- receber props tipadas

---

# Hooks

Criar hook apenas quando houver reutilização.

Evitar hook para lógica simples.

---

# Performance

✓ dynamic import

✓ lazy loading

✓ Image

✓ Font Optimization

✓ Metadata API

✓ Suspense

✓ Streaming

✓ Partial Rendering

✓ Cache

---

# Segurança

Nunca:

process.env

no client.

Nunca expor secrets.

Sempre validar entrada.

---

# Código

Evitar:

if aninhado

Preferir:

Guard Clauses

---

# Nomeação

PascalCase

Componentes

camelCase

funções

SCREAMING_SNAKE_CASE

constantes

kebab-case

rotas

---

# Tipagem

Nunca usar:

any

Preferir:

unknown

ou tipos específicos.

---

# Imports

1. React

2. Next

3. Bibliotecas

4. Alias

5. Relativos

---

# ESLint

Nenhum warning permitido.

---

# Build

Todo commit deve passar:

npm run lint

npm run type-check

npm run build
