import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, Search, Car, Calendar, DollarSign, Check, CheckCircle2, 
  TrendingUp, ExternalLink, Loader2, RefreshCw, Building2, Layers, 
  ChevronRight, ArrowRight, ShieldCheck, Info
} from 'lucide-react';

interface Brand {
  slug: string;
  name: string;
  models: { slug: string; name: string }[];
}

interface ValuationResult {
  suggestedValue: number;
  exactAverage: number;
  minPrice: number;
  maxPrice: number;
  totalListings: number;
  sampleCount: number;
  formula: string;
  sampleListings: {
    title: string;
    priceRaw: string;
    priceVal: number;
    year: number | null;
    url: string;
  }[];
  availableTrims?: { slug: string; name: string }[];
  availableYears?: number[];
  sourceUrl: string;
}

interface MetaCalculatorFormProps {
  carType: string;
  setCarType: (v: string) => void;
  carModel: string;
  setCarModel: (v: string) => void;
  manufactureYear: number;
  setManufactureYear: (v: number) => void;
  carValue: number;
  setCarValueStr: (v: string) => void;
  selectedBank: string;
  setSelectedBank: (v: string) => void;
  profit: string;
  setProfit: (v: string) => void;
  evModel: string;
  setEvModel: (v: string) => void;
  showSeatCount: boolean;
  seatCount: number;
  setSeatCount: (v: number) => void;
  showTonnage: boolean;
  tonnage: number;
  setTonnage: (v: number) => void;
  currentUser: any;
  BANK_OPTIONS: string[];
  EV_MODELS: { id: string; name: string }[];
  vehiclesList: any[];
  triggerNotification?: (type: 'success' | 'error' | 'warning', msg: string) => void;
}

export const MetaCalculatorForm: React.FC<MetaCalculatorFormProps> = ({
  carType,
  setCarType,
  carModel,
  setCarModel,
  manufactureYear,
  setManufactureYear,
  carValue,
  setCarValueStr,
  selectedBank,
  setSelectedBank,
  profit,
  setProfit,
  evModel,
  setEvModel,
  showSeatCount,
  seatCount,
  setSeatCount,
  showTonnage,
  tonnage,
  setTonnage,
  currentUser,
  BANK_OPTIONS,
  EV_MODELS,
  triggerNotification
}) => {
  // Input method: 'smart' (Smart Text) or 'step' (Step by step bonbanh picker)
  const [activeMethod, setActiveMethod] = useState<'smart' | 'step'>('smart');

  // Smart input state
  const [smartInputText, setSmartInputText] = useState('');
  const [isValuating, setIsValuating] = useState(false);
  const [valuationData, setValuationData] = useState<ValuationResult | null>(null);
  const [valuationError, setValuationError] = useState('');

  // Bonbanh Catalog state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string>('toyota');
  const [selectedModelSlug, setSelectedModelSlug] = useState<string>('toyota-vios');
  const [selectedTrimSlug, setSelectedTrimSlug] = useState<string>('');
  const [availableTrims, setAvailableTrims] = useState<{ slug: string; name: string }[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Sample quick prompt tags
  const QUICK_PROMPTS = [
    'Toyota Vios 2025 số tự động bản Pre, không kinh doanh, không vay ngân hàng',
    'Aceent 2025 số tự động bản thường',
    'Ford Ranger 2023 số tự động vay VPBank',
    'Mazda CX-5 2024 không kinh doanh',
    'Kia Seltos 2024 tự động không vay',
    'Mitsubishi Xpander 2024 chạy Grab'
  ];

  // Fetch catalog on mount
  useEffect(() => {
    fetch('/api/bonbanh/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.brands && data.brands.length > 0) {
          setBrands(data.brands);
        }
      })
      .catch(err => console.error('Failed to load bonbanh catalog:', err));
  }, []);

  const currentBrand = useMemo(() => {
    return brands.find(b => b.slug === selectedBrandSlug) || brands[0];
  }, [brands, selectedBrandSlug]);

  const currentModels = useMemo(() => {
    return currentBrand?.models || [];
  }, [currentBrand]);

  // Handle Smart Parse & Estimate
  const handleSmartEstimate = async (textToEstimate?: string) => {
    const text = (textToEstimate !== undefined ? textToEstimate : smartInputText).trim();
    if (!text) return;

    setIsValuating(true);
    setValuationError('');

    try {
      const res = await fetch('/api/bonbanh/smart-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi phân tích xe');

      const { parsed, estimate } = data;

      // Auto update parent calculator state!
      if (parsed) {
        if (parsed.model) {
          setCarModel(parsed.model.name);
          const brandMatch = brands.find(b => b.slug === parsed.brand?.slug);
          if (brandMatch) {
            setSelectedBrandSlug(brandMatch.slug);
            setSelectedModelSlug(parsed.model.slug);
          }
        }
        if (parsed.year) {
          setManufactureYear(parsed.year);
        }
        if (parsed.carType) {
          setCarType(parsed.carType);
        }
        if (parsed.selectedBank) {
          setSelectedBank(parsed.selectedBank);
        }
      }

      if (estimate && estimate.suggestedValue) {
        setValuationData(estimate);
        setCarValueStr(estimate.suggestedValue.toString());
        if (estimate.availableTrims) {
          setAvailableTrims(estimate.availableTrims);
        }
        if (estimate.availableYears) {
          setAvailableYears(estimate.availableYears);
        }
        if (triggerNotification) {
          triggerNotification('success', `Đã tìm thấy giá thị trường: ${new Intl.NumberFormat('vi-VN').format(estimate.suggestedValue)} VNĐ`);
        }
      } else {
        setValuationError('Không tìm thấy tin xe phù hợp trên Bonbanh để định giá. Vui lòng thử chọn theo danh mục.');
      }
    } catch (err: any) {
      console.error(err);
      setValuationError(err.message || 'Không thể kết nối đến Bonbanh');
    } finally {
      setIsValuating(false);
    }
  };

  // Handle Step-by-Step Estimate
  const handleFetchModelValuation = async (brandSlug: string, modelSlug: string, year: number, trimSlug?: string) => {
    setIsValuating(true);
    setValuationError('');

    try {
      const queryParams = new URLSearchParams();
      if (modelSlug) queryParams.set('modelSlug', modelSlug);
      if (year) queryParams.set('year', year.toString());
      if (trimSlug) queryParams.set('trimSlug', trimSlug);

      const res = await fetch(`/api/bonbanh/estimate?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Lỗi định giá');

      setValuationData(data);
      if (data.suggestedValue) {
        setCarValueStr(data.suggestedValue.toString());
      }
      if (data.availableTrims) {
        setAvailableTrims(data.availableTrims);
      }
      if (data.availableYears) {
        setAvailableYears(data.availableYears);
      }

      // Update model name in parent state
      const modelObj = currentModels.find(m => m.slug === modelSlug);
      if (modelObj) {
        setCarModel(`${currentBrand.name} ${modelObj.name}`);
      }
      setManufactureYear(year);

      if (triggerNotification) {
        triggerNotification('success', `Định giá BonBanh: ${new Intl.NumberFormat('vi-VN').format(data.suggestedValue)} VNĐ`);
      }
    } catch (err: any) {
      console.error(err);
      setValuationError(err.message || 'Không tìm thấy dữ liệu trên Bonbanh');
    } finally {
      setIsValuating(false);
    }
  };

  // Quick adjust car value helper (+/- 5tr, +/- 10tr)
  const adjustValue = (delta: number) => {
    const newVal = Math.max(0, carValue + delta);
    setCarValueStr(newVal.toString());
  };

  return (
    <div className="space-y-6">
      {/* Meta Mode Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-4 md:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
            <Sparkles className="text-yellow-300 animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base md:text-lg tracking-tight">Bản Meta: Tự Động Định Giá Bonbanh.com</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                Real-Time
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              Hệ thống crawl tin xe từ Bonbanh, lấy 10 tin thấp nhất + 10 tin cao nhất tính trung bình cộng để tối ưu phí bảo hiểm.
            </p>
          </div>
        </div>

        {/* Input Switch Tabs */}
        <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-sm border border-white/10 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveMethod('smart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMethod === 'smart' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            Nhập nhanh AI
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMethod('step');
              if (brands.length > 0 && !selectedModelSlug) {
                setSelectedBrandSlug(brands[0].slug);
                if (brands[0].models.length > 0) {
                  setSelectedModelSlug(brands[0].models[0].slug);
                }
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMethod === 'step' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Layers size={13} />
            Chọn theo danh mục
          </button>
        </div>
      </div>

      {/* METHOD 1: SMART TEXT INPUT */}
      {activeMethod === 'smart' && (
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              Nhập thông tin xe dạng tự do (Tự nhận diện dòng xe, năm sx, mục đích & ngân hàng)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={smartInputText}
                onChange={(e) => setSmartInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSmartEstimate();
                  }
                }}
                placeholder="Toyota Vios 2025 số tự động bản Pre, không kinh doanh, không vay ngân hàng"
                className="w-full pl-4 pr-36 py-3.5 rounded-xl border-2 border-indigo-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400 bg-white transition-all shadow-sm"
              />
              <button
                type="button"
                disabled={isValuating || !smartInputText.trim()}
                onClick={() => handleSmartEstimate()}
                className="absolute right-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md hover:shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isValuating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Đang định giá...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Định giá ngay
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Mẫu câu nhập gợi ý (bấm để thử ngay):</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSmartInputText(prompt);
                    handleSmartEstimate(prompt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-xs text-slate-600 font-medium transition-all text-left flex items-center gap-1"
                >
                  <ArrowRight size={11} className="text-slate-400 shrink-0" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* METHOD 2: STEP-BY-STEP PICKER ACCORDING TO BONBANH */}
      {activeMethod === 'step' && (
        <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
          {/* Step 1: Brand */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-600" />
                Bước 1: Chọn Hãng xe
              </label>
              <select
                value={selectedBrandSlug}
                onChange={(e) => {
                  const bSlug = e.target.value;
                  setSelectedBrandSlug(bSlug);
                  const brandObj = brands.find(b => b.slug === bSlug);
                  if (brandObj && brandObj.models.length > 0) {
                    setSelectedModelSlug(brandObj.models[0].slug);
                    setSelectedTrimSlug('');
                  }
                }}
                className="text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg px-2.5 py-1 outline-none"
              >
                {brands.map(b => (
                  <option key={b.slug} value={b.slug}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Brand Chips */}
            <div className="flex flex-wrap gap-2">
              {brands.slice(0, 10).map(b => (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => {
                    setSelectedBrandSlug(b.slug);
                    if (b.models.length > 0) {
                      setSelectedModelSlug(b.models[0].slug);
                      setSelectedTrimSlug('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedBrandSlug === b.slug
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Model */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Car size={14} className="text-blue-600" />
              Bước 2: Chọn Dòng xe ({currentBrand?.name})
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
              {currentModels.map(m => (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => {
                    setSelectedModelSlug(m.slug);
                    setSelectedTrimSlug('');
                    setCarModel(`${currentBrand.name} ${m.name}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    selectedModelSlug === m.slug
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Year & Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                Bước 3: Chọn Năm sản xuất (Đời xe)
              </label>
              <div className="flex flex-wrap gap-2">
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map(yr => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setManufactureYear(yr);
                      handleFetchModelValuation(selectedBrandSlug, selectedModelSlug, yr);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      manufactureYear === yr
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={isValuating || !selectedModelSlug}
                onClick={() => handleFetchModelValuation(selectedBrandSlug, selectedModelSlug, manufactureYear, selectedTrimSlug)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isValuating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                Tra cứu giá trên Bonbanh ({currentBrand?.name} {currentModels.find(m => m.slug === selectedModelSlug)?.name} - {manufactureYear})
              </button>
            </div>
          </div>

          {/* Step 4: Trims if available */}
          {availableTrims.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                Bước 4: Chọn Phiên bản chi tiết (Bản xe)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrimSlug('');
                    handleFetchModelValuation(selectedBrandSlug, selectedModelSlug, manufactureYear);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    !selectedTrimSlug
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tất cả các bản
                </button>
                {availableTrims.map(t => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => {
                      setSelectedTrimSlug(t.slug);
                      handleFetchModelValuation(selectedBrandSlug, selectedModelSlug, manufactureYear, t.slug);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      selectedTrimSlug === t.slug
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ERROR MESSAGE IF ANY */}
      {valuationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <Info size={16} className="text-amber-600 shrink-0" />
          <span>{valuationError}</span>
        </div>
      )}

      {/* BONBANH LIVE VALUATION RESULT CARD */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-2xl p-5 md:p-6 text-white shadow-lg border border-indigo-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-300">Kết quả định giá xe thị trường</span>
              <h3 className="font-extrabold text-sm text-white">
                {carModel || 'Chưa chọn xe'} • Đời {manufactureYear}
              </h3>
            </div>
          </div>

          {valuationData && (
            <a
              href={valuationData.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors self-start sm:self-auto"
            >
              <span>Xem nguồn tin Bonbanh</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Big Price Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          <div className="md:col-span-2 space-y-2">
            <span className="text-xs text-slate-300 font-medium">Giá trị xe tự động đề xuất để tính phí:</span>
            <div className="flex flex-wrap items-baseline gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={new Intl.NumberFormat('vi-VN').format(carValue)}
                  onChange={(e) => setCarValueStr(e.target.value.replace(/\D/g, ''))}
                  className="text-2xl md:text-3xl font-black text-amber-300 bg-transparent border-b-2 border-amber-400/50 focus:border-amber-400 outline-none pr-8 max-w-[280px]"
                />
                <span className="absolute right-0 bottom-2 text-sm font-bold text-amber-400">VNĐ</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 size={13} />
                Đang áp dụng vào báo giá
              </span>
            </div>

            {/* Algorithm info badge */}
            <div className="text-xs text-slate-300 flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>
                {valuationData?.formula || 'Lấy 10 tin thấp nhất + 10 tin cao nhất trên Bonbanh tính trung bình cộng'}
              </span>
            </div>
          </div>

          {/* Quick Adjustment Buttons */}
          <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide block">Điều chỉnh nhanh giá trị xe:</span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => adjustValue(-10_000_000)}
                className="py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold transition-all"
              >
                -10Tr
              </button>
              <button
                type="button"
                onClick={() => adjustValue(-5_000_000)}
                className="py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold transition-all"
              >
                -5Tr
              </button>
              <button
                type="button"
                onClick={() => adjustValue(5_000_000)}
                className="py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold transition-all text-amber-300"
              >
                +5Tr
              </button>
              <button
                type="button"
                onClick={() => adjustValue(10_000_000)}
                className="py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold transition-all text-amber-300"
              >
                +10Tr
              </button>
            </div>
          </div>
        </div>

        {/* Live Market Spread Statistics if available */}
        {valuationData && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Giá thấp nhất</span>
              <div className="font-bold text-white mt-0.5">
                {new Intl.NumberFormat('vi-VN').format(valuationData.minPrice)} đ
              </div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Giá cao nhất</span>
              <div className="font-bold text-white mt-0.5">
                {new Intl.NumberFormat('vi-VN').format(valuationData.maxPrice)} đ
              </div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Tổng tin khảo sát</span>
              <div className="font-bold text-indigo-300 mt-0.5">
                {valuationData.totalListings} xe đang bán
              </div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Mẫu lấy trung bình</span>
              <div className="font-bold text-emerald-400 mt-0.5">
                {valuationData.sampleCount} xe (10 min + 10 max)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PURPOSE & BANK - SIMPLIFIED 1-TOUCH CONTROLS */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Purpose selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Car size={14} className="text-blue-600" />
            Mục đích sử dụng (Ảnh hưởng đến biểu phí)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCarType('personal_under_9')}
              className={`p-3 rounded-xl border text-left transition-all ${
                carType === 'personal_under_9'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold text-xs">🚗 Gia đình (Không KD)</div>
              <div className={`text-[10px] mt-0.5 ${carType === 'personal_under_9' ? 'text-blue-100' : 'text-slate-400'}`}>
                Xe dưới 9 chỗ cá nhân
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCarType('grab')}
              className={`p-3 rounded-xl border text-left transition-all ${
                carType === 'grab'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold text-xs">🚕 Grab / Dịch vụ (KD)</div>
              <div className={`text-[10px] mt-0.5 ${carType === 'grab' ? 'text-blue-100' : 'text-slate-400'}`}>
                Xe công nghệ, dịch vụ
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCarType('pickup')}
              className={`p-3 rounded-xl border text-left transition-all ${
                carType === 'pickup'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold text-xs">🛻 Bán tải Pickup</div>
              <div className={`text-[10px] mt-0.5 ${carType === 'pickup' ? 'text-blue-100' : 'text-slate-400'}`}>
                Ranger, Hilux, Triton...
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCarType('truck_commercial_under_10')}
              className={`p-3 rounded-xl border text-left transition-all ${
                carType === 'truck_commercial_under_10'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold text-xs">📦 Xe tải & Khác</div>
              <div className={`text-[10px] mt-0.5 ${carType === 'truck_commercial_under_10' ? 'text-blue-100' : 'text-slate-400'}`}>
                Xe tải chở hàng
              </div>
            </button>
          </div>
        </div>

        {/* Bank Referral */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Building2 size={14} className="text-blue-600" />
            Tình trạng vay ngân hàng
          </label>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedBank('Không vay ngân hàng')}
                className={`py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                  selectedBank === 'Không vay ngân hàng'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                }`}
              >
                🟢 Không vay (Tiền mặt)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedBank === 'Không vay ngân hàng') {
                    setSelectedBank('TP BANK - VAY MỚI');
                  }
                }}
                className={`py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                  selectedBank !== 'Không vay ngân hàng'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                🏦 Có vay ngân hàng
              </button>
            </div>

            {selectedBank !== 'Không vay ngân hàng' && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Chọn ngân hàng giải ngân:</span>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-xs text-slate-800"
                >
                  {BANK_OPTIONS.filter(b => b !== 'Không vay ngân hàng').map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Extra attributes if logged in */}
      {currentUser && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Lợi nhuận mong muốn:</span>
            <div className="relative">
              <input
                type="text"
                value={Number(profit).toLocaleString('vi-VN')}
                onChange={(e) => setProfit(e.target.value.replace(/\D/g, ''))}
                className="pl-3 pr-10 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800 w-36"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">VNĐ</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Loại động cơ:</span>
            <select
              value={evModel}
              onChange={(e) => setEvModel(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-bold text-xs text-slate-700"
            >
              {EV_MODELS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
