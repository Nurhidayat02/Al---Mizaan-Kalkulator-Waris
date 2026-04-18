/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel, WidthType, BorderStyle, TableLayoutType, VerticalAlign } from "docx";
import { saveAs } from "file-saver";
import { 
  Calculator, 
  Users, 
  Wallet, 
  Info, 
  Scale, 
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Download,
  RefreshCw,
  User
} from 'lucide-react';
import { calculateFaraid, HEIR_LABELS, HEIR_LABELS_AR } from './lib/faraid-logic';
import { cn } from './lib/utils';
import { ApiKeyManager } from './components/ApiKeyManager';
import { HistoryList } from './components/HistoryList';
import { GeminiService, AIConsultationResponse } from './services/geminiService';
import { Sparkles, Loader2, AlertCircle, Save, Check } from 'lucide-react';
import { HeirInput, AssetData, HeirType, HistoryItem } from './types';

const HEIR_OPTIONS: { label: string; type: HeirType; gender: 'MALE' | 'FEMALE' }[] = [
  { label: 'Suami', type: 'HUSBAND', gender: 'MALE' },
  { label: 'Istri', type: 'WIFE', gender: 'FEMALE' },
  { label: 'Anak Laki-laki', type: 'SON', gender: 'MALE' },
  { label: 'Anak Perempuan', type: 'DAUGHTER', gender: 'FEMALE' },
  { label: 'Ayah', type: 'FATHER', gender: 'MALE' },
  { label: 'Ibu', type: 'MOTHER', gender: 'FEMALE' },
  { label: 'Kakek', type: 'GRANDFATHER', gender: 'MALE' },
  { label: 'Nenek', type: 'GRANDMOTHER', gender: 'FEMALE' },
  { label: 'Cucu Laki-laki', type: 'GRANDSON', gender: 'MALE' },
  { label: 'Cucu Perempuan', type: 'GRANDDAUGHTER', gender: 'FEMALE' },
  { label: 'Saudara Kandung Laki-laki', type: 'BROTHER_GERMAN', gender: 'MALE' },
  { label: 'Saudara Kandung Perempuan', type: 'SISTER_GERMAN', gender: 'FEMALE' },
  { label: 'Saudara Seayah Laki-laki', type: 'BROTHER_FATHER', gender: 'MALE' },
  { label: 'Saudara Seayah Perempuan', type: 'SISTER_FATHER', gender: 'FEMALE' },
  { label: 'Saudara Seibu Laki-laki', type: 'BROTHER_MOTHER', gender: 'MALE' },
  { label: 'Saudara Seibu Perempuan', type: 'SISTER_MOTHER', gender: 'FEMALE' },
  { label: 'Keponakan Kandung', type: 'SON_BROTHER_GERMAN', gender: 'MALE' },
  { label: 'Keponakan Seayah', type: 'SON_BROTHER_FATHER', gender: 'MALE' },
  { label: 'Paman Kandung', type: 'UNCLE_GERMAN', gender: 'MALE' },
  { label: 'Paman Seayah', type: 'UNCLE_FATHER', gender: 'MALE' },
];

export default function App() {
  const [assets, setAssets] = useState<AssetData>({
    totalAssets: 100000000,
    debts: 0,
    funeralCosts: 0,
    will: 0,
    isJointProperty: false,
    familyName: '',
    deceasedGender: 'MALE',
  });

  const [activeHeirs, setActiveHeirs] = useState<{ id: string; type: HeirType; gender: 'MALE' | 'FEMALE' }[]>([
    { id: '1', type: 'WIFE', gender: 'FEMALE' },
    { id: '2', type: 'SON', gender: 'MALE' },
    { id: '3', type: 'DAUGHTER', gender: 'FEMALE' },
  ]);

  const [expandedDalil, setExpandedDalil] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<AIConsultationResponse | null>(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultationError, setConsultationError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const formatIDR = (val: number) => {
    if (!val && val !== 0) return '';
    return val.toLocaleString('id-ID');
  };

  const parseIDR = (str: string) => {
    const clean = str.replace(/[^\d]/g, '');
    return clean ? parseInt(clean, 10) : 0;
  };
  const pdfRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  React.useEffect(() => {
    const savedHistory = localStorage.getItem('FARAID_HISTORY');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = () => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      assets,
      heirs: activeHeirs,
      calculation
    };
    const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('FARAID_HISTORY', JSON.stringify(updatedHistory));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setAssets(item.assets);
    setActiveHeirs(item.heirs);
    setConsultation(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteFromHistory = (id: string) => {
    const updatedHistory = history.filter(h => h.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('FARAID_HISTORY', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    if (window.confirm('Hapus semua riwayat perhitungan?')) {
      setHistory([]);
      localStorage.removeItem('FARAID_HISTORY');
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    
    setIsDownloading(true);
    try {
      // Small delay to ensure the template is rendered in the DOM
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = pdfRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1000,
        onclone: (clonedDoc) => {
          // 1. Strip oklch/oklab from inline styles
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            if (el.style) {
              const styleStr = el.getAttribute('style');
              if (styleStr && (styleStr.includes('oklch') || styleStr.includes('oklab'))) {
                el.setAttribute('style', styleStr.replace(/oklch\([^)]+\)/g, 'rgba(0,0,0,0)').replace(/oklab\([^)]+\)/g, 'rgba(0,0,0,0)'));
              }
            }
          }

          // 2. Strip oklch/oklab from stylesheets
          const styleSheets = clonedDoc.styleSheets;
          for (let i = 0; i < styleSheets.length; i++) {
            try {
              const sheet = styleSheets[i] as CSSStyleSheet;
              const rules = sheet.cssRules || sheet.rules;
              if (!rules) continue;
              
              for (let j = rules.length - 1; j >= 0; j--) {
                const rule = rules[j] as CSSStyleRule;
                if (rule.cssText && (rule.cssText.includes('oklch') || rule.cssText.includes('oklab'))) {
                  sheet.deleteRule(j);
                }
              }
            } catch (e) {
              // Ignore cross-origin stylesheet errors
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 0;

      // First page
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      // Subsequent pages
      while (heightLeft > 0) {
        pageCount++;
        // Use a small overlap (e.g. 10mm) to ensure text cut at the bottom of one page 
        // is visible at the top of the next
        const overlap = 10; 
        position = -(pageHeight * pageCount) + (overlap * pageCount);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= (pageHeight - overlap);
      }
      
      pdf.save(`Laporan_Faraid_Al-Mizaan_${new Date().getTime()}.pdf`);
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Gagal membuat PDF otomatis. Silakan gunakan fitur Cetak (Print) browser sebagai alternatif.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadWord = async () => {
    setIsExportingWord(true);
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: assets.familyName ? assets.familyName.toUpperCase() : "AL-MIZAAN",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),
            assets.familyName ? new Paragraph({
              text: "Laporan Perhitungan Waris Syariah",
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }) : new Paragraph({
              text: "Sistem Perhitungan Faraid Syariah",
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: `Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
              alignment: AlignmentType.RIGHT,
              spacing: { after: 120 },
            }),
            new Paragraph({
              text: `Pewaris: ${assets.deceasedGender === 'MALE' ? 'Laki-laki (Almarhum)' : 'Perempuan (Almarhumah)'}`,
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            
            new Paragraph({
              text: "I. Rincian Harta",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 200 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Total Harta Waris")], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: `Rp ${assets.totalAssets.toLocaleString('id-ID')}`, alignment: AlignmentType.RIGHT })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Harta Bersih (Tirkah)")], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph({ text: `Rp ${calculation.afterPreDistribution.toLocaleString('id-ID')}`, alignment: AlignmentType.RIGHT })] }),
                  ],
                }),
              ],
            }),

            new Paragraph({
              text: "II. Hasil Pembagian Ahli Waris",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ahli Waris", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bagian", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nilai Warisan", bold: true })] })] }),
                  ],
                }),
                ...calculation.distributions.map(dist => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(`${dist.count} ${HEIR_LABELS[dist.heirType]}`)] }),
                    new TableCell({ children: [new Paragraph(dist.isBlocked ? 'Terhijab' : dist.shareDescription)] }),
                    new TableCell({ children: [new Paragraph(`Rp ${dist.amount.toLocaleString('id-ID')}`)] }),
                  ],
                })),
              ],
            }),

            new Paragraph({
              text: "III. Dasar Hukum (Dalil)",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
            ...calculation.distributions.filter(d => !d.isBlocked).map(dist => new Paragraph({
              children: [
                new TextRun({ text: `${dist.label}: `, bold: true }),
                new TextRun({ text: dist.detailedDalil || dist.dalil, italics: true }),
              ],
              spacing: { after: 120 },
            })),

            new Paragraph({
              text: "Catatan: Laporan ini bersifat edukatif dan referensi awal. Untuk kepastian hukum yang mengikat secara syar'i dan kenegaraan, silakan berkonsultasi dengan Lembaga Hukum atau Pengadilan Agama setempat.",
              spacing: { before: 400 },
              alignment: AlignmentType.CENTER,
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Laporan_Faraid_Al-Mizaan_${new Date().getTime()}.docx`);
    } catch (error) {
      console.error('Word Generation Error:', error);
      alert('Gagal membuat dokumen Word.');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleConsult = async () => {
    if (!apiKey) return;
    
    setIsConsulting(true);
    setConsultationError(null);
    
    try {
      const service = new GeminiService(apiKey);
      const response = await service.consult(calculation);
      setConsultation(response);
    } catch (err: any) {
      setConsultationError(err.message);
    } finally {
      setIsConsulting(false);
    }
  };

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (assets.totalAssets < 0) errors.totalAssets = "Total harta tidak boleh negatif";
    if (assets.debts < 0) errors.debts = "Hutang tidak boleh negatif";
    if (assets.funeralCosts < 0) errors.funeralCosts = "Biaya jenazah tidak boleh negatif";
    if (assets.will < 0) errors.will = "Wasiat tidak boleh negatif";

    const netBeforeWill = (assets.isJointProperty ? assets.totalAssets * 0.5 : assets.totalAssets) - (assets.debts + assets.funeralCosts);
    const maxWill = Math.max(0, netBeforeWill * (1/3));
    if (assets.will > maxWill) {
      errors.will = `Wasiat melebihi 1/3 harta bersih (Maks: Rp ${Math.floor(maxWill).toLocaleString('id-ID')})`;
    }

    return errors;
  }, [assets]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  const calculationHeirs = useMemo(() => {
    const grouped: Record<string, number> = {};
    activeHeirs.forEach(h => {
      grouped[h.type] = (grouped[h.type] || 0) + 1;
    });
    return Object.entries(grouped).map(([type, count]) => ({
      id: type,
      type: type as HeirType,
      count
    }));
  }, [activeHeirs]);

  const calculation = useMemo(() => calculateFaraid(assets, calculationHeirs), [assets, calculationHeirs]);

  const addHeir = () => {
    setActiveHeirs([...activeHeirs, { id: Math.random().toString(36).substr(2, 9), type: 'SON', gender: 'MALE' }]);
  };

  const removeHeir = (id: string) => {
    setActiveHeirs(activeHeirs.filter(h => h.id !== id));
  };

  const updateHeirType = (id: string, type: HeirType) => {
    const option = HEIR_OPTIONS.find(o => o.type === type);
    setActiveHeirs(activeHeirs.map(h => h.id === id ? { ...h, type, gender: option?.gender || 'MALE' } : h));
  };

  const setDeceasedGender = (gender: 'MALE' | 'FEMALE') => {
    setAssets({ ...assets, deceasedGender: gender });
    // Remove incompatible spouse if gender changes
    const incompatibleSpouse = gender === 'MALE' ? 'HUSBAND' : 'WIFE';
    setActiveHeirs(prev => prev.filter(h => h.type !== incompatibleSpouse));
  };

  const updateHeirGender = (id: string, gender: 'MALE' | 'FEMALE') => {
    setActiveHeirs(activeHeirs.map(h => h.id === id ? { ...h, gender } : h));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-emerald-100 py-4 px-4 sm:px-8 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-600 rounded-2xl shadow-emerald-200-safe rotate-3 hover:rotate-0 transition-transform duration-300">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600-safe-dim uppercase tracking-[0.3em] mb-1">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">
                Al-Mizaan <span className="text-emerald-600 font-medium">Faraid</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
                  Kalkulator Waris Syariah
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Standar Hukum</span>
              <div className="px-4 py-1.5 bg-emerald-50 rounded-full text-[11px] font-bold text-emerald-700 border border-emerald-100">
                KHI & Madzhab Syafi'i
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* API Key Manager */}
            <ApiKeyManager onKeyChange={setApiKey} />

            {/* Data Harta & Kewajiban */}
            <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">Data Harta & Kewajiban</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 border-b border-slate-50 pb-8 mb-8">
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nama Keluarga Besar (Opsional)</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Users className="w-5 h-5 text-emerald-600" />
                      </div>
                      <input 
                        type="text"
                        value={assets.familyName || ''}
                        onChange={(e) => setAssets({ ...assets, familyName: e.target.value })}
                        placeholder="Contoh: Bani Adam / Keluarga Besar H. Ahmad"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-slate-300 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Total Harta (Bruto)</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-emerald-600 font-black text-sm">Rp</span>
                        <div className="w-px h-4 bg-slate-200" />
                      </div>
                      <input 
                        type="text" 
                        className={cn(
                          "w-full pl-16 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-lg",
                          validationErrors.totalAssets && "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10"
                        )}
                        placeholder="0"
                        value={formatIDR(assets.totalAssets)}
                        onChange={e => setAssets({ ...assets, totalAssets: parseIDR(e.target.value) })}
                      />
                    </div>
                    {validationErrors.totalAssets && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{validationErrors.totalAssets}</p>}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Hutang Pewaris</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-emerald-600 font-black text-sm">Rp</span>
                        <div className="w-px h-4 bg-slate-200" />
                      </div>
                      <input 
                        type="text" 
                        className={cn(
                          "w-full pl-16 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-lg",
                          validationErrors.debts && "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10"
                        )}
                        placeholder="0"
                        value={formatIDR(assets.debts)}
                        onChange={e => setAssets({ ...assets, debts: parseIDR(e.target.value) })}
                      />
                    </div>
                    {validationErrors.debts && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{validationErrors.debts}</p>}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Biaya Jenazah</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-emerald-600 font-black text-sm">Rp</span>
                        <div className="w-px h-4 bg-slate-200" />
                      </div>
                      <input 
                        type="text" 
                        className={cn(
                          "w-full pl-16 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-lg",
                          validationErrors.funeralCosts && "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10"
                        )}
                        placeholder="0"
                        value={formatIDR(assets.funeralCosts)}
                        onChange={e => setAssets({ ...assets, funeralCosts: parseIDR(e.target.value) })}
                      />
                    </div>
                    {validationErrors.funeralCosts && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{validationErrors.funeralCosts}</p>}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Wasiat (Maks 1/3)</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-emerald-600 font-black text-sm">Rp</span>
                        <div className="w-px h-4 bg-slate-200" />
                      </div>
                      <input 
                        type="text" 
                        className={cn(
                          "w-full pl-16 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-lg",
                          validationErrors.will && "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/10"
                        )}
                        placeholder="0"
                        value={formatIDR(assets.will)}
                        onChange={e => setAssets({ ...assets, will: parseIDR(e.target.value) })}
                      />
                    </div>
                    {validationErrors.will && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{validationErrors.will}</p>}
                  </div>
                </div>

                <div className="mt-8 p-4 bg-[#ecfdf5] rounded-2xl border border-[#d1fae5] flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    id="joint"
                    className="w-6 h-6 rounded-lg text-emerald-600 border-slate-300 focus:ring-emerald-500 transition-all cursor-pointer"
                    checked={assets.isJointProperty}
                    onChange={e => setAssets({ ...assets, isJointProperty: e.target.checked })}
                  />
                  <label htmlFor="joint" className="text-[15px] font-bold text-emerald-900 cursor-pointer">
                    Pisahkan Harta Bersama (Gono-Gini 50%) - KHI Pasal 96 & 97
                  </label>
                </div>
              </div>
            </section>

            {/* Daftar Ahli Waris */}
            <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Jenis Kelamin Pewaris (Yang Meninggal)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setDeceasedGender('MALE')}
                      className={cn(
                        "py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border-2",
                        assets.deceasedGender === 'MALE'
                          ? "bg-white border-emerald-500 text-emerald-700 shadow-md shadow-emerald-50"
                          : "bg-transparent border-transparent text-slate-400 hover:bg-white/50"
                      )}
                    >
                      <User className="w-5 h-5" />
                      Laki-laki
                    </button>
                    <button
                      onClick={() => setDeceasedGender('FEMALE')}
                      className={cn(
                        "py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border-2",
                        assets.deceasedGender === 'FEMALE'
                          ? "bg-white border-emerald-500 text-emerald-700 shadow-md shadow-emerald-50"
                          : "bg-transparent border-transparent text-slate-400 hover:bg-white/50"
                      )}
                    >
                      <User className="w-5 h-5" />
                      Perempuan
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-800">Daftar Ahli Waris</h2>
                  </div>
                  <button 
                    onClick={addHeir}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {activeHeirs.map((heir) => (
                      <motion.div 
                        key={heir.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex flex-wrap md:flex-nowrap items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <select 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
                            value={heir.type}
                            onChange={(e) => updateHeirType(heir.id, e.target.value as HeirType)}
                          >
                            {HEIR_OPTIONS.filter(opt => {
                              if (assets.deceasedGender === 'MALE' && opt.type === 'HUSBAND') return false;
                              if (assets.deceasedGender === 'FEMALE' && opt.type === 'WIFE') return false;
                              return true;
                            }).map(opt => (
                              <option key={opt.type} value={opt.type}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 w-full md:w-auto">
                          <button 
                            onClick={() => updateHeirGender(heir.id, 'MALE')}
                            className={cn(
                              "flex-1 md:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all",
                              heir.gender === 'MALE' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            Laki-laki
                          </button>
                          <button 
                            onClick={() => updateHeirGender(heir.id, 'FEMALE')}
                            className={cn(
                              "flex-1 md:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all",
                              heir.gender === 'FEMALE' ? "bg-pink-600 text-white shadow-md shadow-pink-100" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            Perempuan
                          </button>
                        </div>

                        <button 
                          onClick={() => removeHeir(heir.id)}
                          className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {activeHeirs.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium">Belum ada ahli waris. Klik "Tambah" untuk memulai.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Riwayat Perhitungan */}
            <HistoryList 
              history={history} 
              onLoad={loadFromHistory} 
              onDelete={deleteFromHistory} 
              onClear={clearHistory} 
            />
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-5">
            <div className="sticky top-28">
              {hasErrors ? (
                <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-emerald-900-safe-dim border border-slate-100 flex flex-col items-center justify-center text-center min-h-[300px] sm:min-h-[400px]">
                  <div className="p-4 bg-red-50 rounded-full mb-6">
                    <Info className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2">Input Tidak Valid</h3>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-[280px]">
                    Silakan perbaiki kesalahan pada data harta untuk melihat hasil perhitungan.
                  </p>
                </div>
              ) : (
                <div ref={resultsRef} className="bg-[#064e3b] rounded-[2.5rem] shadow-emerald-safe overflow-hidden">
                  <div className="p-6 sm:p-10">
                <div className="flex items-center gap-4 mb-8 sm:mb-10">
                  <div className="p-2.5 bg-emerald-800-safe rounded-xl">
                    <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-[#10b981]" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Ringkasan Distribusi</h2>
                </div>

                {/* Harta Bersih Display */}
                <div className="bg-emerald-900-safe rounded-[2rem] p-6 sm:p-8 border-emerald-800-safe mb-8 sm:mb-10">
                  <p className="text-emerald-400 font-bold text-[10px] sm:text-sm uppercase tracking-widest mb-2">Harta Bersih (Tirkah)</p>
                  <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight break-words">
                    Rp {calculation.afterPreDistribution.toLocaleString('id-ID')}
                  </h3>
                </div>

                <div className="space-y-8">
                  <h4 className="text-emerald-400 font-black text-xs uppercase tracking-[0.2em]">Rincian Pembagian</h4>
                  
                  <div className="space-y-4">
                    {calculation.distributions.map((dist, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "p-6 rounded-[28px] border transition-all",
                          dist.isBlocked 
                            ? "bg-emerald-950-safe-blocked border-emerald-900-safe" 
                            : "bg-emerald-900-safe-light border-emerald-800-safe bg-emerald-900-safe-hover"
                        )}
                      >
                        <div className="flex justify-between items-start mb-4 gap-2">
                          <div className="min-w-0">
                            <h5 className="text-base sm:text-lg font-black text-white mb-1 truncate">{dist.label}</h5>
                            <p className="text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                              {dist.isAshabah ? 'ASHABAH' : 'ASHABUL FURUD'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base sm:text-xl font-black text-white break-all">
                              Rp {dist.amount.toLocaleString('id-ID')}
                            </p>
                            <p className="text-[10px] sm:text-xs font-bold text-emerald-500-safe">
                              {dist.fraction.numerator}/{dist.fraction.denominator}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 p-4 bg-emerald-950-safe-deep rounded-2xl border-emerald-900-safe">
                          <BookOpen className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-[11px] leading-relaxed text-emerald-100-safe font-medium">
                              {dist.shareDescription}. Dalil: {dist.dalil}
                            </p>
                            {dist.detailedDalil && (
                              <button 
                                onClick={() => setExpandedDalil(expandedDalil === idx ? null : idx)}
                                className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                <Info className="w-3 h-3" />
                                {expandedDalil === idx ? 'Tutup Detail' : 'Lihat Detail Dalil'}
                              </button>
                            )}
                            <AnimatePresence>
                              {expandedDalil === idx && dist.detailedDalil && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 p-3 bg-emerald-900-safe rounded-xl border-emerald-800-safe-light text-[10px] text-emerald-100-safe-dim italic leading-relaxed overflow-hidden"
                                >
                                  {dist.detailedDalil}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-4 pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex items-center justify-center gap-3 py-4 bg-emerald-900-safe-deep text-white rounded-2xl font-bold border border-emerald-800-safe hover:bg-emerald-800 transition-all disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-emerald-400" />
                        )}
                        {isDownloading ? 'Processing...' : 'PDF'}
                      </button>
                      <button 
                        onClick={handleDownloadWord}
                        disabled={isExportingWord}
                        className="flex items-center justify-center gap-3 py-4 bg-emerald-900-safe-deep text-white rounded-2xl font-bold border border-emerald-800-safe hover:bg-emerald-800 transition-all disabled:opacity-50"
                      >
                        {isExportingWord ? (
                          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        ) : (
                          <FileText className="w-5 h-5 text-emerald-400" />
                        )}
                        {isExportingWord ? 'Processing...' : 'Word'}
                      </button>
                    </div>
                    
                    <button 
                      onClick={saveToHistory}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold border transition-all",
                        isSaved 
                          ? "bg-emerald-500 text-white border-emerald-400" 
                          : "bg-emerald-900-safe-deep text-white border-emerald-800-safe hover:bg-emerald-800"
                      )}
                    >
                      {isSaved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5 text-emerald-400" />}
                      {isSaved ? 'Tersimpan' : 'Simpan'}
                    </button>
                  </div>

                  {/* AI Consultant Section */}
                  <div className="mt-8 pt-8 border-t border-emerald-800-safe">
                    {!consultation && !isConsulting && !consultationError && (
                      <button
                        onClick={handleConsult}
                        disabled={!apiKey}
                        className={cn(
                          "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all",
                          apiKey 
                            ? "bg-emerald-gradient-safe text-white shadow-emerald-500-safe hover:scale-[1.02]" 
                            : "bg-emerald-900-safe-dim text-emerald-700 cursor-not-allowed border border-emerald-800/30"
                        )}
                      >
                        <Sparkles className="w-5 h-5" />
                        Dapatkan Konsultasi AI
                      </button>
                    )}

                    {isConsulting && (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <p className="text-emerald-100-safe-dim text-sm font-medium">Menganalisis kasus waris Anda...</p>
                      </div>
                    )}

                    {consultationError && (
                      <div className="p-6 bg-red-950-safe border-red-900-safe rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                          <AlertCircle className="w-5 h-5" />
                          <h4 className="font-bold">Gagal Memuat AI</h4>
                        </div>
                        <p className="text-xs text-red-200-safe leading-relaxed">{consultationError}</p>
                        <button 
                          onClick={handleConsult}
                          className="text-xs font-bold text-red-400 hover:text-red-300 underline"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    )}

                    {consultation && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                          <h4 className="text-lg font-black text-white">Analisis AI Consultant</h4>
                        </div>

                        <div className="space-y-4">
                          <div className="p-5 bg-emerald-900-safe rounded-2xl border-emerald-800-safe-dim">
                            <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Penjelasan Kasus</h5>
                            <p className="text-xs text-emerald-100-safe-bright leading-relaxed font-medium">{consultation.explanation}</p>
                          </div>

                          <div className="p-5 bg-emerald-900-safe rounded-2xl border-emerald-800-safe-dim">
                            <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Analisis Dalil</h5>
                            <p className="text-xs text-emerald-100-safe-bright leading-relaxed font-medium">{consultation.dalilAnalysis}</p>
                          </div>

                          <div className="p-5 bg-emerald-950-safe-deep rounded-2xl border-emerald-800-safe italic">
                            <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 not-italic">Nasihat Bijak</h5>
                            <p className="text-xs text-emerald-100-safe leading-relaxed font-medium">"{consultation.advice}"</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => setConsultation(null)}
                          className="w-full py-3 text-[10px] font-bold text-emerald-500-safe-dim hover:text-emerald-400 transition-colors uppercase tracking-widest"
                        >
                          Reset Analisis
                        </button>
                      </motion.div>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Catatan Penting Section */}
        <section className="mt-8 sm:mt-12 bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Info className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Catatan Penting</h2>
          </div>
          <ul className="space-y-3 sm:space-y-4">
            {[
              "Kalkulator ini menggunakan dasar hukum Al-Qur'an Surat An-Nisa ayat 11, 12, dan 176.",
              "Fitur Harta Bersama dan Ahli Waris Pengganti mengacu pada Kompilasi Hukum Islam (KHI).",
              "Hasil perhitungan ini bersifat edukatif. Untuk kepastian hukum, silakan hubungi Pengadilan Agama."
            ].map((note, i) => (
              <li key={i} className="flex gap-3 sm:gap-4 text-slate-500 text-xs sm:text-[15px] font-medium leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 sm:mt-2.5 shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Hidden PDF Template */}
      <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0">
        <div ref={pdfRef} className="w-[1000px] bg-white p-24 text-slate-900 font-sans shadow-2xl">
          {/* Al Mizaan Branding Header */}
          <div className="bg-emerald-700 -mx-24 -mt-24 p-20 mb-16 flex justify-between items-center shadow-lg">
            <div>
              <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
                {assets.familyName ? assets.familyName.toUpperCase() : 'AL-MIZAAN'}
              </h1>
              <p className="text-emerald-100 font-bold tracking-[0.4em] text-xs uppercase opacity-80">
                {assets.familyName ? 'Laporan Perhitungan Waris Syariah' : 'Sistem Perhitungan Waris Presisi'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white mb-1">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest opacity-60">Pewaris: {assets.deceasedGender === 'MALE' ? 'Laki-Laki' : 'Perempuan'}</p>
            </div>
          </div>

          <div className="px-10">
            {/* I. Rincian Harta */}
            <div className="mb-16">
              <h2 className="text-2xl font-black text-emerald-700 mb-8 flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white text-base">I</span>
                Rincian Harta
              </h2>
              <div className="bg-emerald-50/40 rounded-[2.5rem] p-12 border-2 border-emerald-100 shadow-sm relative overflow-hidden">
                <div className="grid grid-cols-2 gap-16">
                  <div>
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4">Total Harta Waris</h3>
                    <p className="text-4xl font-black text-slate-800 tracking-tight">Rp {assets.totalAssets.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Harta Bersih (Tirkah)</h3>
                    <p className="text-4xl font-black text-emerald-600 tracking-tight">Rp {calculation.afterPreDistribution.toLocaleString('id-ID')}</p>
                  </div>
                </div>
                
                <div className="mt-12 pt-10 border-t-2 border-emerald-100/50 flex justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penyesuaian</p>
                    <p className="font-bold text-slate-600">{calculation.adjustmentType !== 'NORMAL' ? 'Aul/Radd Diterapkan' : 'Tidak Ada'}</p>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akurasi</p>
                    <p className="font-bold text-slate-600">{calculation.hasInkisar ? 'Tashih Inkisar' : 'Standar'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asal Masalah</p>
                    <p className="font-bold text-slate-600">{calculation.baseDenominator}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* II. Hasil Pembagian */}
            <div className="mb-16">
              <h2 className="text-2xl font-black text-emerald-700 mb-8 flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white text-base">II</span>
                Hasil Pembagian Ahli Waris
              </h2>
              
              <div className="overflow-hidden rounded-[2.5rem] border-2 border-emerald-100 shadow-sm table-fixed w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-700 text-white">
                      <th className="p-8 font-black text-xs uppercase tracking-widest w-[40%]">Ahli Waris</th>
                      <th className="p-8 font-black text-xs uppercase tracking-widest text-center">Porsi (Bagian)</th>
                      <th className="p-8 font-black text-xs uppercase tracking-widest text-right">Nilai Warisan</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {calculation.distributions.map((dist, idx) => (
                      <tr key={idx} className={cn(
                        "border-b border-emerald-50",
                        idx % 2 === 0 ? "bg-white" : "bg-emerald-50/20",
                        dist.isBlocked && "opacity-50"
                      )}>
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">{dist.count}</span>
                            <div>
                              <p className="font-black text-slate-800 text-lg mb-0.5">{HEIR_LABELS[dist.heirType]}</p>
                              <p className="text-xs text-slate-300 font-arabic" dir="rtl">{HEIR_LABELS_AR[dist.heirType]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <span className={cn(
                            "px-5 py-2 rounded-full font-black text-xs tracking-widest border",
                            dist.isBlocked ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}>
                            {dist.isBlocked ? 'Terhijab' : dist.shareDescription}
                          </span>
                        </td>
                        <td className="p-8 text-right font-black text-2xl text-emerald-600 tracking-tighter">
                          Rp {dist.amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* III. Dasar Hukum */}
            <div className="mb-24">
              <h2 className="text-2xl font-black text-emerald-700 mb-8 flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white text-base">III</span>
                Dasar Hukum (Dalil)
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {calculation.distributions.filter(d => !d.isBlocked).map((dist, idx) => (
                  <div key={idx} className="p-10 bg-white rounded-[2.5rem] border-2 border-emerald-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-700 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-lg font-black text-slate-800 mb-4 tracking-tight flex items-center gap-3">
                      {dist.label} <span className="text-emerald-300 text-xs">— {dist.dalil}</span>
                    </h3>
                    <p className="text-base text-slate-500 leading-relaxed italic font-medium">
                      "{dist.detailedDalil || dist.dalil}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Footer */}
            <div className="mt-32 border-t-4 border-emerald-50 pt-16 text-center pb-40">
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.6em] mb-8">Lampiran Resmi Perhitungan Al-Mizaan</p>
              <div className="max-w-3xl mx-auto space-y-6">
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-[0.1em]">
                  Laporan ini bersifat edukatif dan referensi awal. Untuk kepastian hukum yang mengikat secara syar'i dan kenegaraan, silakan berkonsultasi dengan Lembaga Hukum atau Pengadilan Agama setempat.
                </p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="w-2 h-2 rounded-full bg-emerald-100" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
