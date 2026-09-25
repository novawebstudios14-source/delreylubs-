import Link from 'next/link';
import { admin } from '@/lib/auth';
import { formatPhone } from '@/lib/phone';
import { VehicleBrandGroups } from '@/components/vehicle-brand-groups';
import { contacted } from '../actions';

type Item = {
  id: string; vehicle_id: string; type: string; due_date: string | null; due_mileage: number | null;
  services: {service_date: string; updated_at: string};
  vehicles: {id: string; plate: string; brand: string; model: string; mileage: number; customer_id: string; customers: {name: string; phone: string; whatsapp: string | null}};
};

export default async function Page({searchParams}: {searchParams: Promise<{q?: string; status?: string; type?: string}>}) {
  const {q, status, type} = await searchParams;
  const s = await admin();
  const data: Item[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await s.from('maintenance_reminders')
      .select('id,vehicle_id,type,due_date,due_mileage,services(service_date,updated_at),vehicles(id,plate,brand,model,mileage,customer_id,customers(name,phone,whatsapp))')
      .order('due_date', {ascending: true, nullsFirst: false}).order('id', {ascending: true}).range(from, from + 999);
    if (page.error) throw new Error(page.error.message);
    data.push(...((page.data ?? []) as unknown as Item[]));
    if (!page.data || page.data.length < 1000) break;
  }
  const {data: logs} = await s.from('contact_logs').select('vehicle_id,contacted_at').order('contacted_at', {ascending: false}).limit(500);
  const latestContact = new Map<string, string>();
  for (const log of logs ?? []) if (!latestContact.has(log.vehicle_id)) latestContact.set(log.vehicle_id, log.contacted_at);
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const soon = new Date(Date.parse(`${today}T12:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10);
  function category(item: Item) {
    return (item.due_date && item.due_date < today) || (item.due_mileage !== null && item.vehicles.mileage >= item.due_mileage)
      ? 'Vencido' : (item.due_date && item.due_date <= soon) || (item.due_mileage !== null && item.vehicles.mileage >= item.due_mileage - 1000)
        ? 'Próximo' : 'Futuro';
  }
  const latest = new Map<string, Item>();
  for (const item of data) {
    const key = `${item.vehicle_id}:${item.type.trim().toLocaleLowerCase('pt-BR')}`;
    const previous = latest.get(key);
    if (!previous || item.services.service_date > previous.services.service_date ||
      (item.services.service_date === previous.services.service_date && item.services.updated_at > previous.services.updated_at)) latest.set(key, item);
  }
  const filtered = [...latest.values()].filter(item =>
    (!q || `${item.vehicles.plate} ${item.vehicles.brand} ${item.vehicles.model} ${item.vehicles.customers.name}`.toLowerCase().includes(q.toLowerCase())) &&
    (!type || item.type.toLowerCase().includes(type.toLowerCase())) && (!status || category(item) === status));

  return <>
    <div className="head"><div><h1>Retornos</h1><p className="muted">Revisões por data ou quilometragem. Atualize a quilometragem do veículo para manter o alerta preciso.</p></div></div>
    <div className="card"><form className="fields">
      <label>Buscar cliente ou veículo<input name="q" defaultValue={q} placeholder="Nome, placa ou modelo"/></label>
      <label>Status<select name="status" defaultValue={status ?? ''}><option value="">Todos</option>{['Vencido', 'Próximo', 'Futuro'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Tipo<input name="type" defaultValue={type} placeholder="Ex.: Troca de óleo"/></label>
      <div style={{alignSelf: 'end', marginBottom: 12}}><button>Filtrar</button></div>
    </form></div>
    {['Vencido', 'Próximo', 'Futuro'].map(group => {
      const items = filtered.filter(item => category(item) === group).map(item => ({...item, brand: item.vehicles.brand, model: item.vehicles.model}));
      return <section className="card" key={group}>
        <h2>{group}s ({items.length})</h2>
        <VehicleBrandGroups vehicles={items} expandAll={Boolean(q)} renderVehicle={item => {
          const customer = item.vehicles.customers;
          const phone = (customer.whatsapp || customer.phone).replace(/\D/g, '');
          const wa = phone ? `https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}?text=${encodeURIComponent(`Olá, ${customer.name}! Aqui é da Del Rey Lubs. A revisão do seu ${item.vehicles.brand} ${item.vehicles.model} está prevista para ${item.due_date ?? `${item.due_mileage} km`}. Podemos agendar?`)}` : null;
          return <div className="row">
            <div><strong>{customer.name}</strong> · {item.vehicles.plate}
              <div className="muted small">{item.type} · {item.due_date ? new Date(`${item.due_date}T12:00:00`).toLocaleDateString('pt-BR') : ''} {item.due_mileage ? `· ${item.due_mileage.toLocaleString('pt-BR')} km` : ''} · {formatPhone(customer.phone)}</div>
              {latestContact.has(item.vehicle_id) && <div className="small">Último contato: {new Date(latestContact.get(item.vehicle_id)!).toLocaleDateString('pt-BR')}</div>}
            </div>
            <div className="actions"><Link href={`/clientes?id=${item.vehicles.customer_id}`}>Cliente</Link><Link href={`/veiculos?id=${item.vehicle_id}`}>Veículo</Link><Link href={`/servicos?vehicle=${item.vehicle_id}`}>Novo serviço</Link>{wa && <a href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
              <form action={contacted}><input type="hidden" name="vehicle_id" value={item.vehicle_id}/><button className="secondary">{latestContact.has(item.vehicle_id) ? 'Registrar novo contato' : 'Marcar como contatado'}</button></form>
            </div>
          </div>;
        }}/>
      </section>;
    })}
  </>;
}
