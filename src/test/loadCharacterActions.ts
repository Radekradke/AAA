import { loadCharacterActions } from '@/store/characterStore';

// As ações da ficha que usam as regras moram fora do pacote de entrada
// (store/character/heavy). No app, as rotas carregam antes de abrir; um teste
// que chama essas ações importa este arquivo primeiro.
await loadCharacterActions();
