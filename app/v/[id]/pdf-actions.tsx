'use client';

import { useState } from 'react';

export function PdfActions({href, fileName}: {href: string; fileName: string}) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  async function share() {
    setSharing(true);
    setError('');
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error('Não foi possível gerar o PDF.');
      const file = new File([await response.blob()], fileName, {type: 'application/pdf'});
      if (navigator.share && navigator.canShare?.({files: [file]})) {
        await navigator.share({files: [file], title: 'Histórico digital do veículo'});
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError') setError('Não foi possível compartilhar o PDF. Tente baixar o arquivo.');
    } finally {
      setSharing(false);
    }
  }
  return <div className="pdf-actions no-print">
    <a className="button secondary" href={href} download={fileName}>Baixar PDF</a>
    <button type="button" onClick={share} disabled={sharing}>{sharing ? 'Preparando PDF…' : 'Compartilhar PDF'}</button>
    {error && <p role="alert" className="small">{error}</p>}
  </div>;
}
