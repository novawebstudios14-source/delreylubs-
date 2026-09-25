import Link from 'next/link';
import { admin } from '@/lib/auth';
import { contacted } from './actions';
import './dashboard.css';

type Reminder = {
  id: string; vehicle_id: string; type: string; due_date: string | null; due_mileage: number | null;
  services: { service_date: string; updated_at: string };
  vehicles: { plate: string; brand: string; model: string; mileage: number; customers: { name: string; phone: string; whatsapp: string | null } };
};
type RecentService = { id: string; service_date: string; type: string; vehicles: { plate: string; brand: string; model: string } | null };

const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
function status(item: Reminder, today: string, soon: string) {
  if ((item.due_date && item.due_date < today) || (item.due_mileage !== null && item.vehicles.mileage >= item.due_mileage)) return 'Vencido';
  if ((item.due_date && item.due_date <= soon) || (item.due_mileage !== null && item.vehicles.mileage >= item.due_mileage - 1000)) return 'Próximo';
  return 'Futuro';
}
function whatsapp(item: Reminder) {
  const customer = item.vehicles.customers;
  const digits = (customer.whatsapp || customer.phone).replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.startsWith('55') ? digits : `55${digits}`;
  const target = item.due_date ? `para ${dateLabel(item.due_date)}` : `aos ${item.due_mileage?.toLocaleString('pt-BR')} km`;
  const message = `Olá, ${customer.name}! Aqui é da Del Rey Lubrificantes. A revisão do seu ${item.vehicles.brand} ${item.vehicles.model} está prevista ${target}. Podemos agendar?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function loadReminders(s: Awaited<ReturnType<typeof admin>>) {
  const all: Reminder[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from('maintenance_reminders')
      .select('id,vehicle_id,type,due_date,due_mileage,services(service_date,updated_at),vehicles(plate,brand,model,mileage,customers(name,phone,whatsapp))')
      .order('due_date', { ascending: true, nullsFirst: false }).order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as unknown as Reminder[]));
    if (!data || data.length < 1000) return all;
  }
}

export default async function Page() {
  const s = await admin();
  const now = new Date();
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const soon = new Date(Date.parse(`${today}T12:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10);
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(now));
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const [customers, vehicles, month, total, recent, reminders, contacts] = await Promise.all([
    s.from('customers').select('id', { count: 'exact', head: true }),
    s.from('vehicles').select('id', { count: 'exact', head: true }),
    s.from('services').select('id', { count: 'exact', head: true }).gte('service_date', `${today.slice(0, 7)}-01`),
    s.from('services').select('id', { count: 'exact', head: true }),
    s.from('services').select('id,service_date,type,vehicles(plate,brand,model)').order('service_date', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    loadReminders(s),
    s.from('contact_logs').select('vehicle_id,contacted_at').order('contacted_at', { ascending: false }).limit(1000),
  ]);
  const error = [customers, vehicles, month, total, recent, contacts].find(r => r.error)?.error;
  if (error) throw new Error(error.message);
  const services = (recent.data ?? []) as unknown as RecentService[];
  const latestByService = new Map<string, Reminder>();
  for (const item of reminders) {
    const key = `${item.vehicle_id}:${item.type.trim().toLocaleLowerCase('pt-BR')}`;
    const previous = latestByService.get(key);
    if (!previous || item.services.service_date > previous.services.service_date ||
      (item.services.service_date === previous.services.service_date && item.services.updated_at > previous.services.updated_at)) latestByService.set(key, item);
  }
  const current = [...latestByService.values()];
  const overdue = current.filter(item => status(item, today, soon) === 'Vencido');
  const upcoming = current.filter(item => status(item, today, soon) === 'Próximo');
  const priority = [...overdue, ...upcoming].filter((item, index, items) => items.findIndex(other => other.vehicle_id === item.vehicle_id) === index).slice(0, 5);
  const latestContact = new Map<string, string>();
  for (const item of contacts.data ?? []) if (!latestContact.has(item.vehicle_id)) latestContact.set(item.vehicle_id, item.contacted_at);
  const dateHeading = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return <div className="dashboard">
    <section className="dash-heading">
      <div><span className="dash-eyebrow">PAINEL DE CONTROLE <span>•</span> DEL REY LUBRIFICANTES</span><h1>{greeting}, oficina.</h1><p>Seu movimento e os próximos contatos em um só lugar. <span className="dash-date">{dateHeading}</span></p></div>
      <div className="dash-heading-actions"><Link className="dash-action-outline" href="/clientes">+ Novo cliente</Link><Link className="button" href="/servicos">+ Registrar serviço</Link></div>
    </section>
    <section className="dash-hero" aria-label="Prioridade de retornos">
      <div><span className="dash-hero-label">CENTRAL DE RETORNOS</span><h2>{overdue.length + upcoming.length ? `${overdue.length + upcoming.length} ${overdue.length + upcoming.length === 1 ? 'revisão precisa' : 'revisões precisam'} de atenção` : 'Sua agenda de retornos está em dia'}</h2><p>{overdue.length + upcoming.length ? 'Priorize os vencidos, entre em contato e mantenha cada histórico atualizado.' : 'As próximas revisões aparecerão aqui conforme os serviços forem registrados.'}</p><Link className="dash-hero-link" href="/retornos">Ver todos os retornos <span aria-hidden="true">↗</span></Link></div>
      <div className="dash-hero-counts"><div><strong>{overdue.length}</strong><span>Vencidos</span></div><div><strong>{upcoming.length}</strong><span>Próximos 30 dias ou 1.000 km</span></div></div>
    </section>
    <section className="dash-metrics" aria-label="Indicadores da oficina">{[
      { label: 'Clientes cadastrados', value: customers.count ?? 0, note: 'Base de relacionamento', icon: '✦', href: '/clientes' },
      { label: 'Veículos cadastrados', value: vehicles.count ?? 0, note: 'Com histórico digital', icon: '◈', href: '/veiculos' },
      { label: 'Serviços no mês', value: month.count ?? 0, note: 'Registrados neste mês', icon: '✳', href: '/servicos' },
      { label: 'Históricos registrados', value: total.count ?? 0, note: 'Serviços de todos os períodos', icon: '▤', href: '/servicos' },
    ].map(metric => <Link className="dash-metric" href={metric.href} key={metric.label}><div className="dash-metric-top"><span>{metric.label}</span><span className="dash-metric-icon" aria-hidden="true">{metric.icon}</span></div><strong>{metric.value.toLocaleString('pt-BR')}</strong><small>{metric.note}</small></Link>)}</section>
    <div className="dash-content">
      <section className="dash-panel dash-priorities"><div className="dash-panel-heading"><div><span className="dash-section-kicker">RELACIONAMENTO</span><h2>Prioridades de contato</h2><p>Revisões vencidas e próximas, ordenadas por urgência.</p></div><Link href="/retornos">Ver fila completa →</Link></div>
        {priority.length ? <div className="dash-reminder-list">{priority.map(item => { const state = status(item, today, soon); const customer = item.vehicles.customers; const wa = whatsapp(item); const last = latestContact.get(item.vehicle_id); return <article className="dash-reminder" key={item.id}>
          <div className="dash-reminder-mark" aria-hidden="true">{item.vehicles.plate.slice(0, 2)}</div><div className="dash-reminder-info"><div className="dash-reminder-title"><strong>{customer.name}</strong><span className={`dash-status ${state === 'Vencido' ? 'is-overdue' : 'is-soon'}`}>{state}</span></div><p>{item.vehicles.brand} {item.vehicles.model} <span>·</span> {item.vehicles.plate} <span>·</span> {item.type}</p><small>{item.due_date ? dateLabel(item.due_date) : null}{item.due_date && item.due_mileage !== null ? ' · ' : null}{item.due_mileage !== null ? `${item.due_mileage.toLocaleString('pt-BR')} km` : null}{last ? ` · Contato em ${dateLabel(last.slice(0, 10))}` : null}</small></div>
          <div className="dash-reminder-actions">{wa && <a href={wa} target="_blank" rel="noreferrer" className="dash-wa">WhatsApp ↗</a>}<form action={contacted}><input type="hidden" name="vehicle_id" value={item.vehicle_id}/><input type="hidden" name="redirect_to" value="/"/><button className="dash-mark-contact" aria-label={last ? `Registrar novo contato com ${customer.name}` : `Marcar contato com ${customer.name} como realizado`}>{last ? 'Registrar novo contato' : 'Marcar como contatado'}</button></form></div>
        </article>; })}</div> : <div className="dash-empty"><span aria-hidden="true">✓</span><strong>Nenhum retorno urgente</strong><p>As revisões aparecerão aqui quando estiverem próximas da data ou quilometragem.</p></div>}
      </section>
      <aside className="dash-side"><section className="dash-panel"><div className="dash-panel-heading"><div><span className="dash-section-kicker">MOVIMENTO</span><h2>Serviços recentes</h2><p>Últimos registros da oficina.</p></div><Link href="/servicos">Ver todos →</Link></div>
        {services.length ? <div className="dash-service-list">{services.map(service => <Link href={`/servicos?id=${service.id}`} className="dash-service" key={service.id}><span className="dash-service-icon" aria-hidden="true">✳</span><span className="dash-service-main"><strong>{service.type}</strong><small>{service.vehicles?.brand} {service.vehicles?.model} · {service.vehicles?.plate}</small></span><span className="dash-service-date">{dateLabel(service.service_date)}</span></Link>)}</div> : <div className="dash-empty compact"><strong>Nenhum serviço registrado</strong><p>Registre o primeiro serviço para começar o histórico.</p></div>}
      </section><section className="dash-shortcut"><span className="dash-section-kicker">ACESSO RÁPIDO</span><h2>Continue a operação</h2><Link href="/veiculos">Cadastrar veículo <span aria-hidden="true">↗</span></Link><Link href="/servicos">Registrar manutenção <span aria-hidden="true">↗</span></Link><Link href="/retornos">Organizar retornos <span aria-hidden="true">↗</span></Link></section></aside>
    </div>
  </div>;
}
