import { describe, it, expect } from 'vitest';
import { createOutbox, isNetworkError } from '../outbox';

const offline = new Error('TypeError: Failed to fetch');
const isOff = (e: unknown) => e === offline;

describe('fila de gravações sem rede', () => {
  it('a mesma chave guarda só a última e a ordem é a da última mudança', async () => {
    const box = createOutbox(isOff);
    const sent: string[] = [];
    box.put('move:a', async () => sent.push('a1'));
    box.put('move:b', async () => sent.push('b'));
    box.put('move:a', async () => sent.push('a2'));
    expect(box.size).toBe(2);
    expect(await box.flush()).toEqual({ sent: 2, dropped: [], left: 0 });
    expect(sent).toEqual(['b', 'a2']);
  });

  it('a rede cai de novo no meio: para e guarda o resto', async () => {
    const box = createOutbox(isOff);
    const sent: string[] = [];
    let down = true;
    box.put('x', async () => sent.push('x'));
    box.put('y', async () => {
      if (down) throw offline;
      sent.push('y');
    });
    box.put('z', async () => sent.push('z'));
    expect(await box.flush()).toEqual({ sent: 1, dropped: [], left: 2 });
    down = false;
    expect(await box.flush()).toEqual({ sent: 2, dropped: [], left: 0 });
    expect(sent).toEqual(['x', 'y', 'z']);
  });

  it('o banco recusa uma: ela sai da fila e as outras seguem', async () => {
    const box = createOutbox(isOff);
    const denied = new Error('Esse peão não é seu');
    box.put('a', async () => {
      throw denied;
    });
    box.put('b', async () => undefined);
    const r = await box.flush();
    expect(r.sent).toBe(1);
    expect(r.dropped).toEqual([{ key: 'a', error: denied }]);
    expect(box.size).toBe(0);
  });

  it('mudança nova durante o envio não se perde, e dois flush juntos viram um', async () => {
    const box = createOutbox(isOff);
    const sent: string[] = [];
    let release!: () => void;
    box.put('a', () => new Promise<void>((r) => (release = () => (sent.push('a1'), r()))));
    const f1 = box.flush();
    const f2 = box.flush();
    expect(f1).toBe(f2);
    box.put('a', async () => sent.push('a2'));
    release();
    await f1;
    expect(box.size).toBe(1);
    await box.flush();
    expect(sent).toEqual(['a1', 'a2']);
  });

  it('reconhece falha de rede pela mensagem', () => {
    expect(isNetworkError(new Error('Palco: TypeError: Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('Load failed'))).toBe(true);
    expect(isNetworkError(new Error('Esse peão não é seu'))).toBe(false);
  });
});
