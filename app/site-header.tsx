'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logout } from './actions';

export function SiteHeader() {
  const path = usePathname();
  const privatePage = path !== '/login' && !path.startsWith('/v/');
  return <header>
    {privatePage ? <Link className="logo" href="/" aria-label="Del Rey Lubrificantes — painel"><Image src="/del-rey-logo.png" width={230} height={80} alt="Del Rey Lubrificantes e Troca de Óleo" priority /></Link>
      : <div className="logo"><Image src="/del-rey-logo.png" width={230} height={80} alt="Del Rey Lubrificantes e Troca de Óleo" priority /></div>}
    {privatePage && <><nav aria-label="Navegação da oficina"><Link href="/">Painel</Link><Link href="/clientes">Clientes</Link><Link href="/veiculos">Veículos</Link><Link href="/servicos">Serviços</Link><Link href="/retornos">Retornos</Link></nav><form action={logout}><button className="plain">Sair</button></form></>}
  </header>;
}
