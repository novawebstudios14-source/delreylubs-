import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { isPublicId } from '@/lib/public-history';

export const dynamic = 'force-dynamic';

export default async function Page({searchParams}: {searchParams: Promise<{placa?: string}>}) {
  const {placa} = await searchParams;
  const normalized = (placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let message = '';
  if (placa !== undefined) {
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalized)) {
      message = 'Digite uma placa válida, como ABC1234 ou ABC1D23.';
    } else {
      const client = await db();
      const {data, error} = await client.rpc('vehicle_public_id_by_plate', {p_plate: normalized});
      if (error) message = 'Não foi possível consultar agora. Tente novamente em instantes.';
      else if (typeof data === 'string' && isPublicId(data)) redirect(`/v/${data}`);
      else message = 'Nenhum histórico encontrado para esta placa. Confira a placa ou fale com a oficina.';
    }
  }
  return <div className="public"><section className="card">
    <span className="badge">DEL REY LUBRIFICANTES</span>
    <h1 style={{marginTop: 14}}>Consulte o histórico do seu veículo</h1>
    <p className="muted">Digite a placa para ver os serviços e as próximas manutenções.</p>
    <form action="/consulta" method="get">
      <label htmlFor="plate">Placa do veículo</label>
      <input id="plate" name="placa" defaultValue={placa || ''} placeholder="ABC1D23" maxLength={8} autoCapitalize="characters" autoComplete="off" required style={{textTransform: 'uppercase'}} aria-describedby={message ? 'plate-message' : undefined}/>
      {message && <p id="plate-message" role="status">{message}</p>}
      <button type="submit">Consultar histórico</button>
    </form>
  </section></div>;
}
