import { SiteHeader } from './site-header';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import './style.css';
export const metadata={title:'Del Rey Lubs | Oficina',description:'Histórico digital e gestão de revisões'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body><SiteHeader/><main>{children}</main><footer>Del Rey Lubrificantes · Histórico digital do veículo</footer></body></html>}
