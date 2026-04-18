import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, ShieldAlert, ExternalLink, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface ApiKeyManagerProps {
  onKeyChange: (key: string | null) => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onKeyChange }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
      onKeyChange(savedKey);
    }
  }, [onKeyChange]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('API Key tidak boleh kosong.');
      return;
    }
    
    // Basic validation for Gemini API Key format (usually starts with AIza)
    if (!apiKey.startsWith('AIza')) {
      setError('Format API Key tidak valid. Biasanya dimulai dengan "AIza".');
      return;
    }

    localStorage.setItem('GEMINI_API_KEY', apiKey);
    setIsSaved(true);
    setError(null);
    onKeyChange(apiKey);
  };

  const handleDelete = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKey('');
    setIsSaved(false);
    onKeyChange(null);
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isSaved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          )}>
            {isSaved ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Gemini AI Consultant</h3>
            <p className="text-xs text-slate-500 font-medium">
              {isSaved ? 'API Key Terkonfigurasi' : 'Belum Terkonfigurasi'}
            </p>
          </div>
        </div>
        
        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase tracking-wider"
        >
          Dapatkan Key <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {!isSaved ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              placeholder="Masukkan Gemini API Key (AIza...)"
              className={cn(
                "w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all",
                error && "border-red-200 ring-1 ring-red-100"
              )}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold px-1">
              <ShieldAlert className="w-3 h-3" />
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-emerald-600-safe-dim"
          >
            Simpan API Key
          </button>
          
          <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
            API Key disimpan secara lokal di browser Anda (localStorage). <br />
            Kami tidak pernah mengirimkan key Anda ke server kami.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              ••••••••••••••••{apiKey.slice(-4)}
            </span>
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Hapus API Key"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
