import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { createContext, forwardRef, useContext, useId } from 'react';

interface FieldCtx {
  id: string;
  describedBy?: string;
  invalid: boolean;
}
const Ctx = createContext<FieldCtx | null>(null);

export interface FieldProps {
  label: ReactNode;
  /** Explicação curta abaixo do campo. */
  hint?: ReactNode;
  /** Mensagem de erro: marca o campo como inválido e é lida pelo leitor de tela. */
  error?: ReactNode;
  /** Mostra "(opcional)" ao lado do rótulo. */
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Campo com rótulo, dica e erro já ligados ao controle (id, aria-describedby,
 * aria-invalid). Use com <Input>, <Select> ou <Textarea> dentro.
 */
export function Field({ label, hint, error, optional, className = '', children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-dica` : undefined;
  const errId = error ? `${id}-erro` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`fv-ui-field${error ? ' is-invalid' : ''} ${className}`.trim()}>
      <label className="fv-ui-field-label" htmlFor={id}>
        {label}
        {optional && <small> (opcional)</small>}
      </label>
      <Ctx.Provider value={{ id, describedBy, invalid: !!error }}>{children}</Ctx.Provider>
      {error && (
        <p className="fv-ui-field-error" id={errId} role="alert">
          {error}
        </p>
      )}
      {hint && (
        <p className="fv-ui-field-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Liga o controle ao <Field> em volta (se houver). */
function useField(id?: string, describedBy?: string, invalid?: boolean) {
  const f = useContext(Ctx);
  return {
    id: id ?? f?.id,
    'aria-describedby': [describedBy, f?.describedBy].filter(Boolean).join(' ') || undefined,
    'aria-invalid': invalid || f?.invalid || undefined,
  };
}

type Common = { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(function Input({ className = '', id, invalid, 'aria-describedby': d, ...rest }, ref) {
  return <input ref={ref} className={`fv-input ${className}`.trim()} {...useField(id, d, invalid)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Common>(function Select({ className = '', id, invalid, 'aria-describedby': d, children, ...rest }, ref) {
  return (
    <select ref={ref} className={`fv-input ${className}`.trim()} {...useField(id, d, invalid)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(function Textarea({ className = '', id, invalid, 'aria-describedby': d, ...rest }, ref) {
  return <textarea ref={ref} className={`fv-input ${className}`.trim()} {...useField(id, d, invalid)} {...rest} />;
});
