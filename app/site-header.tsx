'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logout } from './actions';

const items = [
  {href: '/', label: 'Painel', index: '01'},
  {href: '/clientes', label: 'Clientes', index: '02'},
  {href: '/veiculos', label: 'Veículos', index: '03'},
  {href: '/servicos', label: 'Serviços', index: '04'},
  {href: '/retornos', label: 'Retornos', index: '05'},
];

export function SiteHeader() {
  const path = usePathname();
  const privatePage = path !== '/login' && !path.startsWith('/v/');
  return <header className={`site-header ${privatePage ? 'is-admin' : 'is-public'}`}>
    <div className="header-inner">
      {privatePage ? <Link className="logo" href="/" aria-label="Del Rey Lubrificantes — painel"><Image src="/del-rey-logo.png" width={230} height={80} alt="Del Rey Lubrificantes e Troca de Óleo" priority /></Link>
        : <div className="logo"><Image src="/del-rey-logo.png" width={230} height={80} alt="Del Rey Lubrificantes e Troca de Óleo" priority /></div>}
      {privatePage && <>
        <nav aria-label="Navegação da oficina">{items.map(item => {
          const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}><span className="nav-index" aria-hidden="true">{item.index}</span>{item.label}</Link>;
        })}</nav>
        <div className="header-account"><span className="header-account-label">ÁREA DA OFICINA</span><form action={logout}><button className="plain">Sair <span aria-hidden="true">↗</span></button></form></div>
      </>}
    </div>
  </header>;
}
