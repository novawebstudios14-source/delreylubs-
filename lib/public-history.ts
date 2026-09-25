export type PublicService = {
  date: string;
  mileage: number | null;
  type: string;
  description: string;
  parts: string | null;
  next_due_date: string | null;
  next_due_mileage: number | null;
};

export type PublicHistory = {
  brand: string;
  model: string;
  year: number;
  plate: string;
  mileage: number;
  updated_at: string;
  services: PublicService[];
};

export const isPublicId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const displayDate = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

export function maintenanceStatus(history: PublicHistory) {
  const next = history.services.find(service => service.next_due_date || service.next_due_mileage !== null);
  if (!next) return null;
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const overdue = Boolean((next.next_due_date && next.next_due_date < today) ||
    (next.next_due_mileage !== null && history.mileage >= next.next_due_mileage));
  return {service: next, overdue};
}
