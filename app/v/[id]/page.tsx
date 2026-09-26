import { notFound } from 'next/navigation';
import { publicHistory } from '@/lib/public-data';
import { displayDate, isPublicId, maintenanceStatus, type PublicHistory } from '@/lib/public-history';
import { PdfActions } from './pdf-actions';

export default async function Page({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!isPublicId(id)) notFound();
  const data = await publicHistory(id);
  if (!data) notFound();
  const vehicle = data as PublicHistory;
  const maintenance = maintenanceStatus(vehicle);
  const workshopPhone = (process.env.NEXT_PUBLIC_WORKSHOP_WHATSAPP || '5511999999999').replace(/\D/g, '');
  const isDemoPhone = !process.env.NEXT_PUBLIC_WORKSHOP_WHATSAPP;
  const message = maintenance
    ? `Olá! Consultei o histórico digital do meu ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) e gostaria de agendar a ${maintenance.service.type.toLowerCase()}${maintenance.overdue ? ' que está vencida' : ''}. Podemos conversar?`
    : `Olá! Consultei o histórico digital do meu ${vehicle.brand} ${vehicle.model} (${vehicle.plate}) e gostaria de agendar uma manutenção. Podemos conversar?`;
  const whatsapp = `https://wa.me/${workshopPhone}?text=${encodeURIComponent(message)}`;
  return <div className="public">
    <div className="card">
      <span className="badge">HISTÓRICO DIGITAL DO VEÍCULO</span>
      <h1 style={{marginTop: 14}}>{vehicle.brand} {vehicle.model}</h1>
      <p className="muted">{vehicle.year} · Placa {vehicle.plate}</p>
      <div className="grid">
        <div><span className="muted small">Quilometragem registrada</span><h2>{vehicle.mileage.toLocaleString('pt-BR')} km</h2></div>
        <div><span className="muted small">Atualizado em</span><h2>{new Date(vehicle.updated_at).toLocaleDateString('pt-BR')}</h2></div>
      </div>
      <PdfActions href={`/v/${id}/pdf`} fileName={`historico-${vehicle.plate.replace(/[^A-Za-z0-9]/g, '')}.pdf`} />
    </div>
    {maintenance && <section className="card">
      {maintenance.overdue ? <div className="overdue-alert" role="status"><strong>VENCIDA</strong><span>Esta manutenção já passou do prazo. Agende uma revisão.</span></div> : <span className="badge soon">AGENDAMENTO</span>}
      <h2 style={{marginTop: 14}}>{maintenance.overdue ? 'Manutenção vencida' : 'Próxima manutenção'}</h2>
      <strong>{maintenance.service.type}</strong>
      <p>{maintenance.service.next_due_date && displayDate(maintenance.service.next_due_date)}{maintenance.service.next_due_date && maintenance.service.next_due_mileage !== null ? ' ou ' : ''}{maintenance.service.next_due_mileage !== null && `${maintenance.service.next_due_mileage.toLocaleString('pt-BR')} km`}</p>
      <a className="button whatsapp-button" href={whatsapp} target="_blank" rel="noopener noreferrer">Agendar pelo WhatsApp ↗</a>
      {isDemoPhone && <p className="muted small demo-phone">Número de demonstração. A oficina ainda precisa informar o WhatsApp oficial.</p>}
    </section>}
    <section className="card"><h2>Histórico de manutenções</h2>
      {!vehicle.services.length ? <p className="muted">Nenhum serviço registrado.</p> : <div className="timeline">{vehicle.services.map((service, index) => <article key={index}>
        <span className="muted small">{displayDate(service.date)} · {service.mileage?.toLocaleString('pt-BR') ?? '—'} km</span>
        <h3>{service.type}</h3><p>{service.description}</p>
        {service.parts && <p className="muted small">Peças: {service.parts}</p>}
      </article>)}</div>}
    </section>
  </div>;
}
