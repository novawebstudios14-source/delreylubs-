'use client';

import { useState } from 'react';
import { formatPhone } from '@/lib/phone';

type Props = { name: string; value?: string | null; required?: boolean };

export function PhoneInput({ name, value, required }: Props) {
  const [phone, setPhone] = useState(() => formatPhone(value));
  return <input name={name} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="(11) 9 9999-9999" maxLength={16} value={phone} onChange={event => setPhone(formatPhone(event.target.value))} required={required} />;
}
