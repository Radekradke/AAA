import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { errorReport, isChunkLoadError, isOffline, reloadOnceForStaleChunk, reportError } from '@/lib/errorReporter';
import type { ErrorEntry } from '@/lib/errorReporter';

interface Props {
  children: ReactNode;
  /** Nome da peça (vai no relatório). */
  scope: string;
  /** Peças pequenas (dock, tutorial): somem em silêncio em vez de mostrar a tela de erro. */
  silent?: boolean;
}

interface State {
  error: Error | null;
  entry: ErrorEntry | null;
  copied: boolean;
}

/**
 * Airbag de tela: se algo quebrar ao desenhar, mostra uma tela de erro no
 * visual do tema em vez da tela branca — e lembra que a ficha está salva
 * (as fichas vivem no IndexedDB, fora do React). O erro vai para o captador.
 * Use com `key` = rota para limpar o erro ao navegar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, entry: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // pedaço de código antigo depois de atualizar o site: recarrega uma vez
    if (isChunkLoadError(error) && reloadOnceForStaleChunk()) return;
    const withStack = Object.assign(new Error(error.message), { stack: `${error.stack ?? ''}\n--- componentes ---${info.componentStack ?? ''}` });
    this.setState({ entry: reportError(withStack, { kind: 'render', scope: this.props.scope }) });
  }

  private reset = () => this.setState({ error: null, entry: null, copied: false });

  /** Pedaço que não baixou por falta de rede: recarrega sozinho quando a conexão volta. */
  private onOnline = () => {
    if (!this.props.silent && this.state.error && isChunkLoadError(this.state.error)) location.reload();
  };

  componentDidMount() {
    window.addEventListener('online', this.onOnline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.onOnline);
  }

  private copy = async () => {
    const text = errorReport(this.state.entry ? [this.state.entry] : undefined);
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
    } catch {
      window.prompt('Copie o relatório:', text);
    }
  };

  render() {
    const { error, copied } = this.state;
    if (!error) return this.props.children;
    if (this.props.silent) return null;
    const stale = isChunkLoadError(error);
    const offline = stale && isOffline();
    return (
      <div className="fv-crash" role="alert">
        <div className="fv-crash-card">
          <span className="fv-crash-sigil" aria-hidden>
            ✦
          </span>
          <h1>{offline ? 'Sem internet' : stale ? 'O app foi atualizado' : 'Algo deu errado nesta tela'}</h1>
          <p>
            {offline
              ? 'Esta parte do app ainda não foi baixada e o aparelho está sem conexão. Suas fichas estão salvas neste aparelho. Quando a internet voltar, a tela recarrega sozinha.'
              : stale
                ? 'Uma versão nova do Ficha Viva saiu enquanto esta aba estava aberta. Recarregue para continuar.'
                : 'Suas fichas estão salvas neste aparelho — nada foi perdido. Tente de novo ou recarregue o app.'}
          </p>
          <div className="fv-crash-actions">
            {!stale && (
              <button type="button" className="fv-btn-gold" onClick={this.reset}>
                Tentar de novo
              </button>
            )}
            <button type="button" className={stale ? 'fv-btn-gold' : 'fv-btn-ghost'} onClick={() => location.reload()}>
              Recarregar o app
            </button>
            <button type="button" className="fv-btn-ghost" onClick={() => location.assign('/')}>
              Início
            </button>
          </div>
          {!stale && (
            <details className="fv-crash-details">
              <summary>Detalhes técnicos</summary>
              <pre>{error.message}</pre>
              <button type="button" className="fv-textlink" onClick={() => void this.copy()}>
                {copied ? 'Copiado ✓' : 'Copiar relatório'}
              </button>
            </details>
          )}
        </div>
      </div>
    );
  }
}
