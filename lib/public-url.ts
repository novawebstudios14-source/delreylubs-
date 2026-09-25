/** QR codes always lead to the anonymous vehicle history, including on preview builds. */
export function vehiclePublicUrl(publicId: string) {
  const origin = process.env.NODE_ENV === 'production'
    ? 'https://delreylubs.vercel.app'
    : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${origin}/v/${publicId}`;
}
