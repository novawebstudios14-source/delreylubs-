import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '@/lib/supabase';
import { displayDate, isPublicId, maintenanceStatus, type PublicHistory } from '@/lib/public-history';

export const dynamic = 'force-dynamic';
const dark = rgb(0.12, 0.14, 0.12);
const yellow = rgb(0.91, 0.86, 0);
const grey = rgb(0.36, 0.4, 0.36);
const pageWidth = 595;
const pageHeight = 842;
const margin = 48;

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width && current) {
        lines.push(current);
        current = word;
      } else current = candidate;
    }
    lines.push(current);
  }
  return lines;
}

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!isPublicId(id)) return new Response('Histórico não encontrado.', {status: 404});
  const client = await db();
  const {data, error} = await client.rpc('vehicle_public_history', {p_public_id: id});
  if (error || !data) return new Response('Histórico não encontrado.', {status: 404});
  const vehicle = data as PublicHistory;
  // Keep anonymous PDF rendering within predictable memory and CPU bounds.
  const publicTextSize = [vehicle.brand, vehicle.model, ...vehicle.services.flatMap(service =>
    [service.type, service.description, service.parts ?? ''])].reduce((sum, value) => sum + value.length, 0);
  if (vehicle.services.length > 100 || publicTextSize > 150_000) {
    return new Response('Histórico extenso demais para exportação em PDF.', {
      status: 413, headers: {'Cache-Control': 'no-store'},
    });
  }
  const maintenance = maintenanceStatus(vehicle);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Histórico digital · ${vehicle.brand} ${vehicle.model}`);
  pdf.setAuthor('Del Rey Lubrificantes');
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/DejaVuSans.ttf')),
    readFile(join(process.cwd(), 'public/fonts/DejaVuSans-Bold.ttf')),
  ]);
  const regular = await pdf.embedFont(regularBytes, {subset: true});
  const bold = await pdf.embedFont(boldBytes, {subset: true});
  let page: PDFPage;
  let y = 0;
  function newPage() {
    page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({x: 0, y: pageHeight - 92, width: pageWidth, height: 92, color: dark});
    page.drawRectangle({x: 0, y: pageHeight - 96, width: pageWidth, height: 4, color: yellow});
    page.drawText('DEL REY LUBRIFICANTES', {x: margin, y: pageHeight - 49, size: 19, font: bold, color: yellow});
    page.drawText('HISTÓRICO DIGITAL DO VEÍCULO', {x: margin, y: pageHeight - 69, size: 9, font: regular, color: rgb(1, 1, 1)});
    page.drawText('Consulta pública · dados registrados pela oficina', {x: margin, y: 31, size: 9, font: regular, color: grey});
    y = pageHeight - 132;
  }
  function line(text: string, size = 11, emphasize = false, spacing = 17) {
    const font = emphasize ? bold : regular;
    for (const part of wrap(text.normalize('NFC').replace(/[^\u0000-\u00ff\u2013\u2014\u2018-\u201d\u2022\u20ac]/g, ' '), font, size, pageWidth - 2 * margin)) {
      if (y < 68) newPage();
      if (part) page.drawText(part, {x: margin, y, size, font, color: dark});
      y -= spacing;
    }
  }
  newPage();
  line(`${vehicle.brand} ${vehicle.model}`, 20, true, 30);
  line(`${vehicle.year} · Placa ${vehicle.plate} · ${vehicle.mileage.toLocaleString('pt-BR')} km`, 11);
  line(`Atualizado em ${new Date(vehicle.updated_at).toLocaleDateString('pt-BR')}`, 10);
  y -= 18;
  if (maintenance) {
    line(maintenance.overdue ? 'VENCIDA' : 'PRÓXIMA MANUTENÇÃO', maintenance.overdue ? 22 : 13, true, maintenance.overdue ? 32 : 22);
    const due = [maintenance.service.next_due_date && displayDate(maintenance.service.next_due_date),
      maintenance.service.next_due_mileage !== null && `${maintenance.service.next_due_mileage.toLocaleString('pt-BR')} km`].filter(Boolean).join(' ou ');
    line(`${maintenance.service.type} · ${due}`, 11);
    y -= 14;
  }
  line('HISTÓRICO DE MANUTENÇÕES', 13, true, 24);
  if (!vehicle.services.length) line('Nenhum serviço registrado.');
  for (const service of vehicle.services) {
    if (y < 135) newPage();
    line(`${displayDate(service.date)} · ${service.mileage?.toLocaleString('pt-BR') ?? '—'} km`, 10, false, 17);
    line(service.type, 12, true, 18);
    line(service.description);
    if (service.parts) line(`Peças: ${service.parts}`, 10);
    y -= 16;
  }
  const bytes = await pdf.save();
  const file = new Blob([new Uint8Array(bytes)], {type: 'application/pdf'});
  return new Response(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="historico-${vehicle.plate.replace(/[^A-Za-z0-9]/g, '')}.pdf"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
