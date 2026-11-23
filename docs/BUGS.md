# Registro de bugs

Lista viva usada pelas etapas do `docs/PLANO-PROFISSIONAL.md`. Todo bug encontrado entra aqui antes de ser corrigido. Quando for corrigido, ganha um teste e muda para **Corrigido**, com o PR.

## Como registrar

Copie o modelo para a seção certa, com o próximo número livre:

```md
### B-000 · Título curto do que acontece
- **Prioridade:** P1
- **Área:** Ficha › Magias
- **Passos:** 1. … 2. … 3. …
- **Esperado:** …
- **Acontece:** …
- **Status:** Aberto · Corrigido em #PR (teste: arquivo)
```

### Prioridades
| | Quando usar | Prazo |
|---|---|---|
| **P0** | Perde dados, trava o app ou bloqueia uma sessão de jogo | Corrigir já, antes de outro item |
| **P1** | Regra errada, conta errada ou função principal quebrada | Na etapa atual |
| **P2** | Algo funciona, mas confunde ou atrapalha; visual quebrado | Na etapa da área |
| **P3** | Detalhe, texto ou polimento | Quando passar pela tela |

## Abertos

### B-001 · Patrulheiro 14: idioma extra do Explorador Natural não é pedido no Evoluir
- **Prioridade:** P1
- **Área:** Ficha › Evoluir
- **Passos:** 1. Patrulheiro nível 13. 2. Evoluir para o 14. 3. Ver as escolhas do nível.
- **Esperado:** pedir o idioma que acompanha o novo inimigo favorito (`favoredLanguage`), como no 1º e no 6º.
- **Acontece:** a escolha acumulada não aparece. A Trilha de níveis e o Herói rápido preenchem, mas a aba Evoluir não pede.
- **Status:** Aberto

### B-002 · Alertas de segurança só nas ferramentas de desenvolvimento
- **Prioridade:** P3
- **Área:** Dependências
- **Passos:** `npm audit` (sem `--omit=dev`).
- **Esperado:** zero alertas.
- **Acontece:** 2 alertas moderados, que não vão para o app publicado:
  - `vitest` (via `@vitest/mocker`): corrigido no 4.1.11 ou mais novo.
  - `esbuild` do `vite`: corrigido no vite 8, que é uma versão maior.
- **Status:** Aberto. Subir junto com a etapa 4, testando build e testes.

### B-003 · Memorizações das abas Magias e Retrato ignoram parte da ficha
- **Prioridade:** P3
- **Área:** Ficha › Magias, Retrato
- **Passos:** `npm run lint` mostra 4 avisos `react-hooks/exhaustive-deps`:
  - `TabMagias.tsx` linhas 75, 85 e 104;
  - `TabRetrato.tsx` linha 94.
- **Esperado:** dependências completas ou o motivo escrito na linha.
- **Acontece:** os `useMemo` dependem só de campos escolhidos da ficha, de propósito, para não recalcular a cada mudança. Se outro campo usado lá dentro mudar, a tela pode mostrar um valor antigo.
- **Status:** Aberto. Revisar na migração dessas telas (3.6).

## Corrigidos

_Nenhum ainda._
