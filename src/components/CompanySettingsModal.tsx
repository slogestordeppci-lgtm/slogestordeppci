import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, X, Upload, Trash2 } from 'lucide-react';
import { useStore } from '../store';

export function CompanySettingsModal() {
  const { data, updateData } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [tempName, setTempName] = useState(data.companyName || '');
  const [tempPhone, setTempPhone] = useState(data.companyPhone || '');
  const [tempEmail, setTempEmail] = useState(data.companyEmail || '');
  const [tempCnpj, setTempCnpj] = useState(data.companyCnpj || '');
  const [tempCep, setTempCep] = useState(data.companyCep || '');
  const [tempAddress, setTempAddress] = useState(data.companyAddress || '');
  
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = () => {
    updateData({ 
      companyName: tempName,
      companyPhone: tempPhone,
      companyEmail: tempEmail,
      companyCnpj: tempCnpj,
      companyCep: tempCep,
      companyAddress: tempAddress
    });
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => {
          setTempName(data.companyName || '');
          setTempPhone(data.companyPhone || '');
          setTempEmail(data.companyEmail || '');
          setTempCnpj(data.companyCnpj || '');
          setTempCep(data.companyCep || '');
          setTempAddress(data.companyAddress || '');
          setIsOpen(true);
        }}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white shadow-lg shadow-black/80 hover:bg-zinc-850 hover:scale-105 active:scale-95 transition-all z-45 flex items-center justify-center"
        title="Configurações da Empresa"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-red-600" />
                Dados da Empresa e Logo
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome da Empresa / Profissional</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  placeholder="Ex: Sua Empresa de Engenharia"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    value={tempCnpj}
                    onChange={(e) => setTempCnpj(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                    placeholder="Ex: 00.000.000/0001-00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">CEP</label>
                  <input
                    type="text"
                    value={tempCep}
                    onChange={(e) => setTempCep(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                    placeholder="Ex: 00000-000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  placeholder="Ex: Av. Principal, 1000 - Centro, Cidade/UF"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Telefone de Contato</label>
                  <input
                    type="text"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                    placeholder="Ex: (51) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">E-mail Comercial</label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                    placeholder="Ex: contato@suaempresa.com.br"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Logo da Proposta (JPG/PNG)</label>
                <div className="flex gap-4 items-center">
                  <button 
                    type="button"
                    onClick={handleLogoUploadClick}
                    className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white px-3.5 py-1.5 rounded text-xs font-semibold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Carregar Logo
                  </button>
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    onChange={handleLogoChange} 
                    accept="image/jpeg,image/jpg,image/png" 
                    className="hidden" 
                  />
                  {data.logoUrl && (
                     <button 
                       type="button"
                       onClick={clearLogo}
                       className="flex items-center gap-1.5 text-red-500 hover:text-red-400 px-2 py-1.5 text-xs font-semibold transition-colors"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                       Remover
                     </button>
                  )}
                </div>
                {data.logoUrl && (
                  <div className="mt-3 p-3 border border-zinc-900 bg-zinc-900/40 rounded-lg inline-block">
                    <img src={data.logoUrl} alt="Logo" className="max-h-12 object-contain" />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
