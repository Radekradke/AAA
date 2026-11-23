import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button, IconButton } from '../Button';
import { Field, Input, Select, Textarea } from '../Field';
import { Badge, Chip, Segmented, Tabs } from '../Choice';
import { nextIndex } from '@/lib/roving';

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe('Button', () => {
  it('usa as classes do app e não envia formulário sem querer', () => {
    const out = html(h(Button, { variant: 'gold', children: 'Salvar' }));
    expect(out).toContain('fv-btn-gold');
    expect(out).toContain('fv-ui-btn--md');
    expect(out).toContain('type="button"');
  });
  it('carregando: desliga, avisa (aria-busy) e mostra o giro', () => {
    const out = html(h(Button, { loading: true, children: 'Salvar' }));
    expect(out).toContain('disabled=""');
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain('fv-ui-spinner');
  });
  it('tamanhos e largura total', () => {
    expect(html(h(Button, { size: 'sm', children: 'x' }))).toContain('fv-ui-btn--sm');
    expect(html(h(Button, { size: 'lg', block: true, children: 'x' }))).toMatch(/fv-ui-btn--lg.*fv-ui-btn--block|fv-ui-btn--block.*fv-ui-btn--lg/);
  });
});

describe('IconButton', () => {
  it('sempre tem nome acessível e dica', () => {
    const out = html(h(IconButton, { label: 'Fechar', icon: '✕' }));
    expect(out).toContain('aria-label="Fechar"');
    expect(out).toContain('title="Fechar"');
    expect(out).toMatch(/<span aria-hidden="true">✕<\/span>/);
  });
  it('liga/desliga com aria-pressed', () => {
    expect(html(h(IconButton, { label: 'Fixar', icon: '★', pressed: true }))).toContain('aria-pressed="true"');
  });
});

describe('Field', () => {
  it('liga rótulo, dica e erro ao controle', () => {
    const out = html(h(Field, { label: 'Nome', hint: 'Como a mesa chama', error: 'Obrigatório', children: h(Input, { defaultValue: '' }) }));
    const id = /<label[^>]*for="([^"]+)"/.exec(out)?.[1];
    expect(id).toBeTruthy();
    expect(out).toContain(`id="${id}"`);
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain(`aria-describedby="${id}-erro ${id}-dica"`);
    expect(out).toContain('role="alert"');
  });
  it('sem erro: nada de aria-invalid; Select e Textarea também ligam', () => {
    for (const control of [h(Select, { children: h('option', null, 'a') }), h(Textarea, {})]) {
      const out = html(h(Field, { label: 'X', hint: 'dica', children: control }));
      expect(out).not.toContain('aria-invalid');
      expect(out).toMatch(/aria-describedby="[^"]+-dica"/);
      expect(out).toContain('fv-input');
    }
  });
  it('fora de um Field, funciona sozinho', () => {
    expect(html(h(Input, { id: 'solto', invalid: true }))).toMatch(/id="solto".*aria-invalid="true"|aria-invalid="true".*id="solto"/);
  });
});

describe('Segmented', () => {
  it('é um grupo de rádio com uma parada só no Tab', () => {
    const out = html(h(Segmented, { label: 'Modo', value: 'b', onChange: () => {}, options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C', disabled: true }] }));
    expect(out).toContain('role="radiogroup"');
    expect(out).toContain('aria-label="Modo"');
    expect(out.match(/role="radio"/g)).toHaveLength(3);
    expect(out.match(/tabindex="0"/g)).toHaveLength(1);
    expect(out).toMatch(/aria-checked="true"[^>]*>B</);
  });
});

describe('Chip e Badge', () => {
  it('chip clicável liga/desliga; sem clique vira etiqueta', () => {
    expect(html(h(Chip, { pressed: true, onClick: () => {}, children: 'Fogo', meta: 3 }))).toMatch(/aria-pressed="true".*Fogo<small>3<\/small>/);
    const fixed = html(h(Chip, { children: 'Fogo' }));
    expect(fixed).toContain('<span');
    expect(fixed).toContain('is-static');
  });
  it('badge por tom', () => {
    expect(html(h(Badge, { tone: 'danger', children: 'Caído' }))).toContain('fv-ui-badge--danger');
  });
});

describe('Tabs', () => {
  it('tablist, tab e tabpanel ligados por id; só a ativa entra no Tab', () => {
    const out = html(h(Tabs, { label: 'Seções', active: 'b', onChange: () => {}, tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], children: 'conteúdo' }));
    expect(out).toContain('role="tablist"');
    expect(out.match(/role="tab"/g)).toHaveLength(2);
    const sel = /id="([^"]+)" aria-selected="true" aria-controls="([^"]+)"/.exec(out);
    expect(sel).toBeTruthy();
    expect(out).toContain(`role="tabpanel" id="${sel![2]}" aria-labelledby="${sel![1]}"`);
    expect(out.match(/role="tab"[^>]*tabindex="0"/g)).toHaveLength(1);
  });
});

describe('nextIndex (setas em grupos)', () => {
  const none = [false, false, false, false];
  it('anda e dá a volta', () => {
    expect(nextIndex('ArrowRight', 0, none)).toBe(1);
    expect(nextIndex('ArrowRight', 3, none)).toBe(0);
    expect(nextIndex('ArrowLeft', 0, none)).toBe(3);
  });
  it('Home e End vão às pontas', () => {
    expect(nextIndex('Home', 2, none)).toBe(0);
    expect(nextIndex('End', 1, none)).toBe(3);
  });
  it('pula as desligadas', () => {
    const d = [false, true, true, false];
    expect(nextIndex('ArrowRight', 0, d)).toBe(3);
    expect(nextIndex('Home', 3, [true, false, false, false])).toBe(1);
    expect(nextIndex('End', 0, [false, false, false, true])).toBe(2);
  });
  it('vertical usa cima/baixo; outras teclas não movem', () => {
    expect(nextIndex('ArrowDown', 0, none, 'vertical')).toBe(1);
    expect(nextIndex('ArrowRight', 0, none, 'vertical')).toBeNull();
    expect(nextIndex('a', 0, none)).toBeNull();
    expect(nextIndex('ArrowRight', 0, [true, true])).toBeNull();
  });
});
