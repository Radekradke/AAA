import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterStore } from '@/store/characterStore';
import { PrintStudio } from '@/components/print/PrintStudio';

/** /ficha/:id/imprimir — a ficha para ver e imprimir (ilustrada no tema ou clássica). */
export function PrintSheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const char = useCharacterStore((s) => s.characters.find((c) => c.id === id));

  useEffect(() => {
    if (char) document.title = `${char.name || 'Ficha'} — Ficha Viva`;
    return () => {
      document.title = 'Ficha Viva AAA';
    };
  }, [char]);

  if (!char) {
    return (
      <main className="fv-printpage">
        <div className="fv-printpage-msg">
          <h1>Ficha não encontrada</h1>
          <p>Ela pode ter sido apagada deste aparelho.</p>
          <div className="fv-printpage-bar" style={{ justifyContent: 'center', margin: 0 }}>
            <button type="button" className="is-primary" onClick={() => navigate('/personagens')}>Ver heróis</button>
          </div>
        </div>
      </main>
    );
  }

  return <PrintStudio char={char} lead={<button type="button" onClick={() => navigate(`/ficha/${char.id}`)}>← Voltar à ficha</button>} />;
}
