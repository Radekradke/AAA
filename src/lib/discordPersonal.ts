import { useUiStore } from '@/store/uiStore';
import { useSessionStore } from '@/store/sessionStore';
import { useCharacterStore } from '@/store/characterStore';
import { isDiscordWebhook } from '@/engine/discord';
import { sendRoll, tableWebhook } from './discordRelay';

/**
 * Webhook pessoal: quem joga com um mestre que não usa a mesa ao vivo manda
 * as próprias rolagens para o canal. Respeita "Só eu" e "Só mestre" (não
 * envia) e não duplica o que o Discord da mesa já manda.
 */
useUiStore.subscribe((s, prev) => {
  const r = s.history[0];
  if (!r || r === prev.history[0] || !isDiscordWebhook(s.discordWebhook)) return;
  if (Date.now() - r.timestamp > 5000) return; // histórico salvo voltando, não é rolagem nova
  const st = useSessionStore.getState();
  if (st.rollVisibility !== 'public') return;
  const live = !!st.session && st.session.status === 'active';
  if (live && tableWebhook(st.campaignId) === s.discordWebhook.trim()) return;
  const hero = r.charId ? useCharacterStore.getState().getCharacter(r.charId) : undefined;
  const who = live && st.me?.isMaster ? 'Mestre' : hero?.name || st.me?.characterName || 'Ficha Viva';
  void sendRoll(s.discordWebhook, { who, label: r.label, total: r.total, expr: r.expr, rolls: r.rolls, crit: r.crit, fail: r.fail, damage: !!r.damage, d20: r.sides === 20 && !r.damage });
});
