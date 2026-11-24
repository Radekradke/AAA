import { useState } from 'react';
import type { ReactNode } from 'react';
import { THEMES, THEME_ORDER } from '@/data/themes';
import { themeModeOf, useUiStore } from '@/store/uiStore';
import { toast } from '@/store/feedbackStore';
import type { ThemeName } from '@/types/dnd';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Badge, Chip, Segmented, Tabs } from '@/components/ui/Choice';
import { Popover, Sheet, Tooltip } from '@/components/ui/Layers';
import { Modal } from '@/components/ui/Modal';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/layout/Screen';
import '@/styles/devui.css';
import { InlineIcon } from '@/components/ui/Icon';

/**
 * Catálogo do design system (/dev/ui, só em desenvolvimento): todos os
 * primitivos e camadas, em qualquer tema e modo, num lugar só. Também é o
 * palco dos testes de teclado (e2e/design-system.e2e.ts).
 */
export function DevUi() {
  const theme = useUiStore((s) => s.theme);
  const mode = useUiStore((s) => themeModeOf(s.theme, s.modes));
  const setTheme = useUiStore((s) => s.setTheme);
  const setMode = useUiStore((s) => s.setThemeMode);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [tab, setTab] = useState<'um' | 'dois' | 'tres'>('um');
  const [chips, setChips] = useState<string[]>(['Fogo']);
  const [pressed, setPressed] = useState(false);
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState('');

  return (
    <Screen scroll>
    <div className="fv-devui">
      <header className="fv-devui-head">
        <h1>Design system</h1>
        <div className="fv-devui-controls">
          <Field label="Tema">
            <Select value={theme} onChange={(e) => setTheme(e.target.value as ThemeName)}>
              {THEME_ORDER.map((t) => (
                <option key={t} value={t}>
                  {THEMES[t].label}
                </option>
              ))}
            </Select>
          </Field>
          <Segmented label="Modo" value={mode} onChange={(m) => setMode(m)} options={[{ value: 'dark', label: 'Escuro' }, { value: 'light', label: 'Claro' }]} />
        </div>
      </header>

      <Section title="Botões">
        <div className="fv-devui-row">
          <Button variant="gold">Principal</Button>
          <Button>Secundário</Button>
          <Button variant="accent">Ação viva</Button>
          <Button variant="danger">Apagar</Button>
          <Button loading>Salvando</Button>
          <Button disabled>Desligado</Button>
        </div>
        <div className="fv-devui-row">
          <Button size="sm">Pequeno</Button>
          <Button size="md">Médio</Button>
          <Button size="lg" variant="gold">
            Grande
          </Button>
          <IconButton label="Fixar" icon={<InlineIcon name="starFill" />} pressed={pressed} onClick={() => setPressed((p) => !p)} />
          <IconButton label="Apagar item" icon={<InlineIcon name="close" />} variant="danger" size="sm" />
        </div>
      </Section>

      <Section title="Campos">
        <div className="fv-devui-grid">
          <Field label="Nome do herói" hint="Como a mesa chama você." error={name.length > 0 && name.length < 3 ? 'Use pelo menos 3 letras.' : undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lyra" />
          </Field>
          <Field label="Classe">
            <Select defaultValue="">
              <option value="">Escolha…</option>
              <option>Mago</option>
              <option>Guerreiro</option>
            </Select>
          </Field>
          <Field label="História" optional>
            <Textarea rows={3} />
          </Field>
        </div>
      </Section>

      <Section title="Escolhas">
        <Segmented label="Vantagem" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Normal' }, { value: 'b', label: 'Vantagem' }, { value: 'c', label: 'Desvantagem' }]} />
        <div className="fv-devui-row">
          {['Fogo', 'Gelo', 'Raio'].map((c) => (
            <Chip key={c} pressed={chips.includes(c)} onClick={() => setChips((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))} meta={c.length}>
              {c}
            </Chip>
          ))}
          <Chip>Etiqueta</Chip>
        </div>
        <div className="fv-devui-row">
          {(['neutral', 'accent', 'metal', 'danger', 'ok'] as const).map((t) => (
            <Badge key={t} tone={t}>
              {t}
            </Badge>
          ))}
        </div>
        <Tabs label="Abas de exemplo" active={tab} onChange={setTab} tabs={[{ id: 'um', label: 'Primeira' }, { id: 'dois', label: 'Segunda' }, { id: 'tres', label: 'Terceira', disabled: true }]}>
          <p>Conteúdo da aba {tab}.</p>
        </Tabs>
      </Section>

      <Section title="Camadas">
        <div className="fv-devui-row">
          <Button onClick={() => setModal(true)}>Abrir modal</Button>
          <Button onClick={() => setSheet(true)}>Abrir painel</Button>
          <Popover label="Rolar dano" trigger={<Button variant="accent">Abrir popover</Button>}>
            {(close) => (
              <div className="fv-devui-pop">
                <p>Janela presa ao botão.</p>
                <Button size="sm" onClick={close}>
                  Rolar
                </Button>
              </div>
            )}
          </Popover>
          <Tooltip content="Classe de Armadura">
            <Button size="sm">CA 15</Button>
          </Tooltip>
          <Button onClick={() => toast('Aviso de exemplo.', { tone: 'ok' })}>Mostrar aviso</Button>
        </div>
      </Section>

      <Section title="Painel">
        <Panel>Conteúdo dentro de um painel do tema.</Panel>
      </Section>

      {modal && (
        <Modal title="Modal de exemplo" onClose={() => setModal(false)} footer={<Button variant="gold" onClick={() => setModal(false)}>Confirmar</Button>}>
          <p>Foco preso aqui dentro; Esc fecha.</p>
          <Button>Outro botão</Button>
        </Modal>
      )}
      {sheet && (
        <Sheet title="Painel de exemplo" onClose={() => setSheet(false)} footer={<Button variant="gold" onClick={() => setSheet(false)}>Pronto</Button>}>
          <Field label="Anotação">
            <Input />
          </Field>
        </Sheet>
      )}
    </div>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fv-devui-section" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
