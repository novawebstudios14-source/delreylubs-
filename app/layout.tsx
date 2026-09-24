import Link from 'next/link';
import { logout } from './actions';
import './style.css';
export const metadata={title:'Del Rey Lubs | Oficina',description:'Histórico digital e gestão de revisões'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body><header><Link className="logo" href="/">DEL REY <strong>LUBS</strong></Link><nav><Link href="/">Painel</Link><Link href="/clientes">Clientes</Link><Link href="/veiculos">Veículos</Link><Link href="/servicos">Serviços</Link><Link href="/retornos">Retornos</Link></nav><form action={logout}><button className="plain">Sair</button></form></header><main>{children}</main><footer>Del Rey Lubs · Histórico digital do veículo</footer></body></html>}
