import type { ReactNode } from 'react';

type VehicleIdentity = { id: string; brand: string; model: string };
type Group<T> = { label: string; items: T[] };
const collator = new Intl.Collator('pt-BR', {sensitivity: 'base', numeric: true});
const key = (value: string) => value.trim().toLocaleLowerCase('pt-BR');

export function groupVehicles<T extends VehicleIdentity>(vehicles: T[]): Group<Group<T>>[] {
  const brands = new Map<string, {label: string; models: Map<string, Group<T>>}>();
  for (const vehicle of vehicles) {
    const brand = vehicle.brand.trim() || 'Marca não informada';
    const model = vehicle.model.trim() || 'Modelo não informado';
    const brandKey = key(brand);
    const modelKey = key(model);
    if (!brands.has(brandKey)) brands.set(brandKey, {label: brand, models: new Map()});
    const models = brands.get(brandKey)!.models;
    if (!models.has(modelKey)) models.set(modelKey, {label: model, items: []});
    models.get(modelKey)!.items.push(vehicle);
  }
  return [...brands.values()].map(({label, models}) => ({
    label,
    items: [...models.values()].sort((a, b) => collator.compare(a.label, b.label)),
  })).sort((a, b) => collator.compare(a.label, b.label));
}

export function VehicleBrandGroups<T extends VehicleIdentity>({
  vehicles, renderVehicle, activeId, expandAll = false,
}: {vehicles: T[]; renderVehicle: (vehicle: T) => ReactNode; activeId?: string; expandAll?: boolean}) {
  if (!vehicles.length) return <p className="muted small">Nenhum veículo encontrado.</p>;
  return <div className="vehicle-brands">{groupVehicles(vehicles).map(brand => {
    const count = brand.items.reduce((total, model) => total + model.items.length, 0);
    const brandActive = brand.items.some(model => model.items.some(vehicle => vehicle.id === activeId));
    return <details className="vehicle-brand" key={key(brand.label)} open={expandAll || brandActive}>
      <summary><span className="vehicle-brand-name">{brand.label}</span><span className="vehicle-group-count">{count} {count === 1 ? 'veículo' : 'veículos'}</span><span className="vehicle-chevron" aria-hidden="true">⌄</span></summary>
      <div className="vehicle-models">{brand.items.map(model =>
        <details className="vehicle-model" key={key(model.label)} open={expandAll || model.items.some(vehicle => vehicle.id === activeId)}>
          <summary><span>{model.label}</span><span className="vehicle-group-count">{model.items.length}</span><span className="vehicle-chevron" aria-hidden="true">⌄</span></summary>
          <div className="vehicle-model-items">{model.items.map(vehicle => <div key={vehicle.id}>{renderVehicle(vehicle)}</div>)}</div>
        </details>
      )}</div>
    </details>;
  })}</div>;
}
