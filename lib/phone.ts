/** Brazilian phone formatting. Keep stored numbers as digits for searching and links. */
export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2, 13) : digits.slice(0, 11);
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = phoneDigits(value);
  if (!digits) return '';
  if (digits.length < 3) return `(${digits}`;
  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${area}) ${local}`;
  if (digits.length <= 10) return `(${area}) ${local.slice(0, 4)}-${local.slice(4)}`;
  return `(${area}) ${local[0]} ${local.slice(1, 5)}-${local.slice(5)}`;
}
