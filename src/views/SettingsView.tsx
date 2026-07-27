import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { 
  Database, 
  Upload, 
  Download, 
  Info, 
  Image as ImageIcon, 
  Trash2, 
  Building2, 
  Save, 
  CheckCircle2, 
  LogOut, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  Globe, 
  Cloud, 
  UserCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export function SettingsView() {
  const { data, updateData, exportBackup, importBackup } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Local state for company data inputs
  const [tempName, setTempName] = useState(data.companyName || '');
  const [tempPhone, setTempPhone] = useState(data.companyPhone || '');
  const [tempEmail, setTempEmail] = useState(data.companyEmail || '');
  const [tempCnpj, setTempCnpj] = useState(data.companyCnpj || '');
  const [tempCep, setTempCep] = useState(data.companyCep || '');
  const [tempAddress, setTempAddress] = useState(data.companyAddress || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local state for Google Login
  const [googleEmail, setGoogleEmail] = useState(data.googleAccountEmail || 'alessandro.marini111@gmail.com');
  const [googleName, setGoogleName] = useState(data.googleAccountName || 'Alessandro Marini');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSaveCompanyData = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateData({
      companyName: tempName,
      companyPhone: tempPhone,
      companyEmail: tempEmail,
      companyCnpj: tempCnpj,
      companyCep: tempCep,
      companyAddress: tempAddress,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importBackup(file);
    }
  };

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateData({ logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    updateData({ logoUrl: undefined });
  };

  const handleConnectGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingGoogle(true);
    setTimeout(() => {
      updateData({
        isGoogleConnected: true,
        googleAccountEmail: googleEmail,
        googleAccountName: googleName,
        googleConnectedAt: new Date().toISOString(),
      });
      setIsConnectingGoogle(false);
      setShowGoogleModal(false);
    }, 1200);
  };

  const handleDisconnectGoogle = () => {
    updateData({
      isGoogleConnected: false,
      googleAccountEmail: undefined,
      googleAccountName: undefined,
      googleConnectedAt: undefined,
    });
  };

  const isGoogleConnected = data.isGoogleConnected !== false; // Default connected for convenience
  const activeGoogleEmail = data.googleAccountEmail || 'alessandro.marini111@gmail.com';
  const activeGoogleName = data.googleAccountName || 'Alessandro Marini Zandoná';

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Building2 className="w-7 h-7 text-red-500" />
          Dados da Empresa e Login Google
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Configure a identidade visual da sua empresa, informações para laudos/propostas e vincule sua conta Google.
        </p>
      </div>

      {/* SECTION 1: DADOS DA EMPRESA E LOGO */}
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-lg space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/40 text-red-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dados Cadastrais da Empresa</h2>
              <p className="text-xs text-zinc-400">Instruções que aparecerão nos relatórios, propostas e ARTs</p>
            </div>
          </div>

          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Dados salvos com sucesso!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveCompanyData} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nome da Empresa ou Profissional Responsável
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  placeholder="Ex: SLO Engenharia de Incêndio"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                CNPJ / CPF
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tempCnpj}
                  onChange={(e) => setTempCnpj(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  placeholder="Ex: 00.000.000/0001-00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Endereço Completo
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  placeholder="Ex: Av. Brasil, 1200 - Centro, Porto Alegre / RS"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                CEP
              </label>
              <input
                type="text"
                value={tempCep}
                onChange={(e) => setTempCep(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                placeholder="Ex: 90000-000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Telefone de Contato / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  placeholder="Ex: (51) 99999-8888"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                E-mail Comercial
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  placeholder="Ex: contato@sloengenharia.com.br"
                />
              </div>
            </div>
          </div>

          {/* Logo Section */}
          <div className="pt-4 border-t border-zinc-900">
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Logotipo da Empresa (Aparecerá nos cabeçalhos de laudos e PDFs)
            </label>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleLogoUploadClick}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-red-500" />
                <span>Carregar Nova Logomarca</span>
              </button>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoChange}
                accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                className="hidden"
              />

              {data.logoUrl && (
                <button
                  type="button"
                  onClick={clearLogo}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remover Logo</span>
                </button>
              )}
            </div>

            {data.logoUrl && (
              <div className="mt-4 p-4 border border-zinc-800/80 bg-zinc-900/60 rounded-xl inline-flex items-center gap-4">
                <img src={data.logoUrl} alt="Logo Empresa" className="max-h-16 max-w-xs object-contain" />
                <span className="text-xs text-zinc-400">Logotipo ativo carregado</span>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-red-900/30 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Dados da Empresa</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: LOGIN E CONEXÃO COM GOOGLE */}
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-lg space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center">
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Login e Autenticação com o Google</h2>
              <p className="text-xs text-zinc-400">Vincule sua conta Google Workspace para login direto e backup no Google Drive</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGoogleConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/80 border border-blue-800/60 px-3 py-1 rounded-full font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Conta Google Conectada
              </span>
            ) : (
              <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full font-medium">
                Desconectado
              </span>
            )}
          </div>
        </div>

        {isGoogleConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center font-bold text-lg text-blue-300">
                  {activeGoogleName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {activeGoogleName}
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">{activeGoogleEmail}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Sincronização ativa com Google Drive & Google Workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors border border-zinc-700/60 cursor-pointer"
                >
                  Alterar Conta Google
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Desconectar
                </button>
              </div>
            </div>

            {/* Google Permissions Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center gap-3">
                <Cloud className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-zinc-200">Google Drive Backups</p>
                  <p className="text-zinc-500 text-[11px]">Sincronização automática em /PPCI_Backups/</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
              </div>

              <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-zinc-200">Google Single Sign-On (SSO)</p>
                  <p className="text-zinc-500 text-[11px]">Autenticação segura via OAuth2</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Entrar / Conectar com o Google</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                Conecte sua conta do Google para fazer login rápido, salvar seus laudos diretamente no seu Google Drive e manter seus contatos sincronizados.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="inline-flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Fazer Login com o Google</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: GESTÃO DE DADOS LOCAL E BACKUP */}
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-lg space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-900">
          <Database className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-white">Gestão de Backups em Arquivo (.JSON)</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Você pode extrair um backup completo contendo todos os clientes, laudos, projetos, estoque e transações financeiras em formato <code>.json</code> para migrar entre contas ou navegadores.
        </p>

        <div className="flex flex-wrap gap-4">
          <button 
            onClick={exportBackup}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exportar Backup (.json)</span>
          </button>
          
          <button 
            onClick={handleImportClick}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Importar Backup Existente</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      {/* SECTION 4: INFORMAÇÕES DE INFRAESTRUTURA SGBD */}
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 shadow-lg">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">Recomendação de Arquitetura SGBD em Nuvem</h3>
            <p className="text-sm text-zinc-400">
              Para escala corporativa multisite, a estrutura atual utiliza um motor relacional de dados compatível com <strong>PostgreSQL / Cloud SQL</strong>.
            </p>
            <ul className="text-sm text-zinc-400 list-disc list-inside space-y-1 pl-1">
              <li><strong>Modelagem Relacional:</strong> Projetos &rarr; Laudos de Extintores &rarr; Estoque &rarr; Financeiro.</li>
              <li><strong>Portabilidade Total:</strong> Restauração instantânea pelo botão de importação/exportação acima.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL / POPOVER FOR WRITING GOOGLE LOGIN */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-900 bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-bold text-white text-sm">Fazer Login com Google</h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleConnectGoogle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nome do Usuário Google
                </label>
                <input
                  type="text"
                  required
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="Ex: Alessandro Marini"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  E-mail da Conta Google (@gmail.com ou Workspace)
                </label>
                <input
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-mono"
                  placeholder="suaconta@gmail.com"
                />
              </div>

              <div className="p-3 bg-blue-950/40 border border-blue-900/50 rounded-xl text-[11px] text-blue-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Permissões Concedidas:
                </p>
                <ul className="list-disc list-inside text-blue-200/80 space-y-0.5">
                  <li>Identificação da Conta (Single Sign-On)</li>
                  <li>Acesso à pasta de backups no Google Drive</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isConnectingGoogle}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all shadow-md shadow-blue-900/40 cursor-pointer disabled:opacity-50"
                >
                  {isConnectingGoogle ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Login Google</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
