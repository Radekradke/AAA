import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCode, normalizeCode, typingCode } from '@/lib/inviteCode';

/**
 * "Entrar com código": o jogador digita o código que o mestre ditou
 * (XXXX-XXXX) e cai na sala — sem precisar do link. Câmera no QR leva ao
 * mesmo lugar.
 */
export function JoinByCode() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const code = normalizeCode(value);
  const showError = touched && value.length > 0 && !code;

  const go = () => {
    setTouched(true);
    if (code) navigate(`/sala/${formatCode(code)}`);
  };

  return (
    <form
      className="fv-panel fv-joincode"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <label htmlFor="fv-joincode-input" className="fv-label">
        Entrar com código
      </label>
      <p className="fv-joincode-hint">O mestre te passa um código de 8 letras e números (ou um QR para apontar a câmera).</p>
      <div className="fv-joincode-row">
        <input
          id="fv-joincode-input"
          className="fv-input fv-joincode-input"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="XXXX-XXXX"
          value={value}
          onChange={(e) => setValue(typingCode(e.target.value))}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={showError ? 'fv-joincode-err' : undefined}
          maxLength={9}
        />
        <button type="submit" className="fv-btn-gold" disabled={!code}>
          Entrar na mesa
        </button>
      </div>
      {showError && (
        <p id="fv-joincode-err" className="fv-joincode-err" role="alert">
          O código tem 8 caracteres (sem 0, O, 1, I ou L).
        </p>
      )}
    </form>
  );
}
