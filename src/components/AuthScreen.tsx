import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { registerAccount, signIn, type AuthUser } from '../services/auth'

interface Props {
  onAuthenticated: (user: AuthUser) => void
}

export function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const user = mode === 'register' ? await registerAccount(email, password) : await signIn(email, password)
      onAuthenticated(user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to authenticate.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-screen">
    <section className="auth-copy">
      <span className="eyebrow">QUANTA / ENVIRONMENTAL INTELLIGENCE</span>
      <div className="auth-orbit" aria-hidden="true"><i/><i/><i/><span/></div>
      <h1>Read the basin.<br/><em>See what connects.</em></h1>
      <p>One workspace for hydrological data, connected monitoring nodes, and terrain-aware flood intelligence.</p>
      <div className="auth-security"><ShieldCheck/><span>PRIVATE WORKSPACE<br/><small>SESSION-BASED ACCESS CONTROL</small></span></div>
    </section>
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-form-heading"><span className="auth-lock"><LockKeyhole/></span><span className="eyebrow">SECURE ACCESS</span><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>{mode === 'login' ? 'Sign in to your Quanta workspace.' : 'Start a private workspace for your team.'}</p></div>
      <div className="auth-tabs" role="tablist" aria-label="Account access">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>SIGN IN</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>CREATE ACCOUNT</button>
      </div>
      <label><span>EMAIL ADDRESS</span><input autoComplete="email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@organization.org"/></label>
      <label><span>PASSWORD</span><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 12 characters"/></label>
      {mode === 'register' && <label><span>CONFIRM PASSWORD</span><input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Re-enter your password"/></label>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={submitting} type="submit"><span>{submitting ? 'VERIFYING ACCESS…' : mode === 'login' ? 'SIGN IN TO WORKSPACE' : 'CREATE PRIVATE ACCOUNT'}</span><ArrowRight/></button>
      <small className="auth-password-note">Passwords are stored as salted hashes. Sessions expire after seven days.</small>
    </form>
  </main>
}