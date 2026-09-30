/** Tipos mínimos de @3d-dice/dice-box-threejs (o pacote não traz .d.ts). */
declare module '@3d-dice/dice-box-threejs' {
  export interface DiceBoxColorset {
    name: string;
    foreground: string;
    background: string;
    outline: string;
    texture?: string;
    material?: 'none' | 'metal' | 'wood' | 'glass' | 'plastic';
  }

  export interface DiceBoxConfig {
    assetPath?: string;
    sounds?: boolean;
    shadows?: boolean;
    theme_surface?: string;
    theme_customColorset?: DiceBoxColorset | null;
    theme_material?: 'none' | 'metal' | 'wood' | 'glass' | 'plastic';
    light_intensity?: number;
    gravity_multiplier?: number;
    baseScale?: number;
    strength?: number;
  }

  export default class DiceBox {
    constructor(selector: string, config?: DiceBoxConfig);
    initialize(): Promise<void>;
    /** Notação com resultado predeterminado: "2d20@7,15". */
    roll(notation: string): Promise<unknown>;
    updateConfig(config: DiceBoxConfig): Promise<void>;
    clearDice(): void;
  }
}
