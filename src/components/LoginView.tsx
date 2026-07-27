import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Flame, Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

export function LoginView() {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearState = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Por favor, preencha todos os campos.');
        }
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Informe seu nome completo.');
        }
        if (!email || !password) {
          throw new Error('Por favor, preencha o e-mail e a senha.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Verifique a confirmação.');
        }
        await registerWithEmail(name, email, password);
      } else if (mode === 'forgot') {
        if (!email) {
          throw new Error('Informe seu e-mail para redefinir a senha.');
        }
        await resetPassword(email);
        setSuccess('Instruções de redefinição de senha enviadas para o seu e-mail.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearState();
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login com o Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-red-900 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 shadow-xl shadow-red-900/30 p-3 mb-2 border border-red-500/20">
            <Flame className="w-8 h-8 text-white fill-amber-300" />
          </div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-white flex items-center justify-center gap-2">
            Gestor <span className="text-red-500">PPCI</span>
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Sistema Integrado de Projetos & Vistorias CBM
          </p>
        </div>

        {/* Auth Card Container */}
        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
          {/* Mode Tabs */}
          {mode !== 'forgot' ? (
            <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => { setMode('login'); clearState(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); clearState(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-500" />
                Redefinir Senha
              </h2>
              <button
                type="button"
                onClick={() => { setMode('login'); clearState(); }}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Eng. Alessandro Zandoná"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); clearState(); }}
                      className="text-[11px] text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aguarde...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Acessar Conta'}
                    {mode === 'register' && 'Criar Conta de Acesso'}
                    {mode === 'forgot' && 'Enviar E-mail de Recuperação'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social login divider */}
          {mode !== 'forgot' && (
            <div className="space-y-4 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-850 w-full" />
                <span className="bg-zinc-950 px-3 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold absolute">
                  ou continue com
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
                <span>Google Workspace</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-zinc-500 text-center font-medium">
          Ao acessar, você concorda com os termos do Gestor PPCI.
        </p>
      </div>
    </div>
  );
}
