import {login} from '../actions';
import { SubmitButton } from '@/components/submit-button';
export default async function Page({searchParams}:{searchParams:Promise<{erro?:string}>}) {
  const {erro}=await searchParams;
  return <div className="public"><div className="auth-intro"><h1>Acesso da oficina</h1><p className="muted">Entre para gerenciar clientes, veículos e revisões.</p></div>
    <section className="card"><form action={login} className="auth-form">
      <label>Usuário ou e-mail<input name="identifier" required autoComplete="username" spellCheck={false} autoCapitalize="none" aria-invalid={!!erro}/></label>
      <label>Senha<input name="password" type="password" required autoComplete="current-password" aria-invalid={!!erro}/></label>
      {erro&&<p className="form-message" role="alert">Usuário ou senha inválidos. Confira os dados e tente novamente.</p>}
      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
    </form></section></div>;
}
