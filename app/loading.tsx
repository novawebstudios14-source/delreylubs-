export default function Loading() {
  return <div className="loading-shell" role="status" aria-label="Carregando página">
    <div aria-hidden="true"><div className="loading-bar loading-heading"/><div className="loading-cards">{[0,1,2,3].map(i=><div key={i} className="loading-block"/>)}</div><div className="loading-block loading-content"/></div>
    <span className="muted">Carregando…</span>
  </div>;
}
