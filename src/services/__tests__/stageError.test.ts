import { describe, expect, it } from 'vitest';
import { PalcoSetupError, stageError } from '../stageService';

describe('erros do palco', () => {
  it('só "tabela não existe" vira aviso de banco sem palco', () => {
    expect(stageError({ message: "Could not find the table 'public.campaign_scenes' in the schema cache" })).toBeInstanceOf(PalcoSetupError);
    expect(stageError({ message: 'relation "public.scene_tokens" does not exist' })).toBeInstanceOf(PalcoSetupError);
    expect(stageError({ message: "Could not find the function public.move_token(p_token, p_x, p_y) in the schema cache" })).toBeInstanceOf(PalcoSetupError);
  });

  it('outros erros aparecem como são (não escondem o problema real)', () => {
    const perm = stageError({ message: 'permission denied for table campaign_scenes' });
    expect(perm).not.toBeInstanceOf(PalcoSetupError);
    expect(perm.message).toMatch(/permission denied/);
    const col = stageError({ message: 'column campaign_scenes.sort does not exist', code: '42703' });
    expect(col).not.toBeInstanceOf(PalcoSetupError);
    expect(col.message).toMatch(/42703/);
    expect(stageError({ message: 'new row violates row-level security policy for table "campaign_stage"' }).message).toMatch(/só o mestre/);
  });
});
