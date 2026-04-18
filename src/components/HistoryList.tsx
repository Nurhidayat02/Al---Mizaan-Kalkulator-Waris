import React from 'react';
import { History, Trash2, Clock, ChevronRight, Calendar } from 'lucide-react';
import { HistoryItem } from '../types';
import { cn } from '../lib/utils';

interface HistoryListProps {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onLoad, onDelete, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 text-center space-y-4">
        <div className="p-4 bg-emerald-50 rounded-full w-fit mx-auto">
          <History className="w-8 h-8 text-emerald-200" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Riwayat Kosong</h3>
          <p className="text-xs text-slate-400 font-medium">Belum ada perhitungan yang disimpan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Riwayat</h2>
        </div>
        <button 
          onClick={onClear}
          className="text-[9px] sm:text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest"
        >
          Hapus Semua
        </button>
      </div>

      <div className="divide-y divide-slate-50 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
        {history.map((item) => (
          <div 
            key={item.id}
            className="group p-3 sm:p-4 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-3 sm:gap-4"
            onClick={() => onLoad(item)}
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:border-emerald-100 transition-colors shrink-0">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 group-hover:text-emerald-500" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    Rp {item.calculation.afterPreDistribution.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
                  {item.heirs.length} Ahli Waris • {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="p-2 text-emerald-500">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
