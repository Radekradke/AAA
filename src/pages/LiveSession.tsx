import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import type { SharedHero } from '@/components/session/MasterDeck';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { campaignService } from '@/services/campaignService';
import { cloudEnabled } from '@/services/supabaseClient';
import { music } from '@/lib/music';
import { useCampaignNpcs } from '@/components/campaign/NpcGallery';
import { useStageStore } from '@/store/stageStore';
import { MasterWorkspace } from '@/features/master/MasterWorkspace';
import { PlayerWorkspace } from '@/features/live/PlayerWorkspace';
import type { Campaign } from '@/types/models';

/**
 * Mesa ao vivo (/mesa/:id/jogar): só o BOOTSTRAP — entra na campanha, liga
 * sessão e palco (realtime), carrega heróis e NPCs uma vez — e escolhe a
 * tela: o console do mestre (MasterWorkspace) ou a mesa do jogador
 * (PlayerWorkspace). A verdade está no banco; as telas espelham os stores.
 */
export function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const user = useAuthStore((u) => u.user);
  const s = useSessionStore();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [heroes, setHeroes] = useState<SharedHero[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canPlay = cloudEnabled() && !!user && !user.guest;
  const isMaster = !!campaign && !!user && campaign.masterId === user.id;
  // uma única assinatura de NPCs para a tela inteira (o console repassa por contexto)
  const { npcs, secrets, reload: reloadNpcs } = useCampaignNpcs(campaign?.id, isMaster);

  // nome no ping do jogador acompanha o herói escolhido
  const myHeroName = s.me?.characterName ?? null;
  useEffect(() => {
    if (campaign && user && !isMaster) useStageStore.setState({ who: myHeroName ?? user.name });
  }, [myHeroName, campaign, user, isMaster]);

  // entra na mesa (idempotente: voltar da ficha não reconecta)
  useEffect(() => {
    if (!id || !user || !canPlay) return;
    let alive = true;
    campaignService
      .getCampaign(id)
      .then((c) => {
        if (!alive) return;
        if (!c) return setLoadError('Mesa não encontrada — você faz parte dela?');
        setCampaign(c);
        const cur = useSessionStore.getState().me;
        useStageStore.getState().open(c.id, {
          isMaster: c.masterId === user.id,
          userId: user.id,
          who: c.masterId === user.id ? 'Mestre' : cur?.characterName ?? user.name,
        });
        void s.join(c.id, {
          userId: user.id,
          name: user.name,
          isMaster: c.masterId === user.id,
          characterId: cur?.characterId ?? null,
          characterName: cur?.characterName ?? null,
        });
      })
      .catch((e) => setLoadError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [id, user?.id, canPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  // fichas vinculadas (heróis que podem entrar no encontro)
  const encId = s.encounter?.id;
  useEffect(() => {
    if (!id || !canPlay) return;
    campaignService.sharedSheets(id).then(setHeroes).catch(() => undefined);
  }, [id, canPlay, encId, s.session?.id]);

  // começou o combate com a trilha tocando → música de batalha
  const combatOn = s.encounter?.status === 'active';
  useEffect(() => {
    if (combatOn && music.get().playing) music.setMood('combate');
  }, [combatOn]);

  const backToRoom = (
    <Button onClick={() => nav(`/mesa/${id}`)} style={{ fontSize: 12.5 }}>
      Sala
    </Button>
  );

  if (!canPlay) {
    return (
      <Screen scroll actions={backToRoom}>
        <div className="fv-live">
          <section className="fv-panel fv-live-card fv-live-center">
            <div className="fv-label">Mesa ao vivo</div>
            <p className="fv-live-hint">A sessão ao vivo precisa da nuvem e de uma conta (não funciona como convidado). Sua ficha continua funcionando offline normalmente.</p>
          </section>
        </div>
      </Screen>
    );
  }

  if (isMaster && campaign && user) {
    return (
      <Screen actions={backToRoom}>
        <MasterWorkspace campaign={campaign} userId={user.id} heroes={heroes} npcs={npcs} secrets={secrets} reloadNpcs={reloadNpcs} loadError={loadError} />
      </Screen>
    );
  }

  return (
    <Screen scroll actions={backToRoom}>
      <PlayerWorkspace campaign={campaign} heroes={heroes} npcs={npcs} loadError={loadError} />
    </Screen>
  );
}
