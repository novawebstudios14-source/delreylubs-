import { SiteHeader } from './site-header';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import './style.css';
import './refinement.css';
export const preferredRegion = 'gru1';
export const metadata={title:'Del Rey Lubs | Oficina',description:'Histórico digital e gestão de revisões'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><SiteHeader/><main id="conteudo" tabIndex={-1}>{children}</main><footer>Del Rey Lubrificantes · Histórico digital do veículo</footer></body></html>}
