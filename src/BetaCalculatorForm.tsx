import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

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
  availableTrims?: { slug: string; name: string }[];
  availableYears?: number[];
  sourceUrl: string;
}

interface BetaCalculatorFormProps {
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
  carModelRef: React.RefObject<HTMLInputElement | null>;
  yearRef: React.RefObject<HTMLInputElement | null>;
  valueRef: React.RefObject<HTMLInputElement | null>;
  currentYear: number;
  triggerNotification?: (type: 'success' | 'error' | 'warning', msg: string) => void;
}

export const BetaCalculatorForm: React.FC<BetaCalculatorFormProps> = ({
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
  vehiclesList,
  carModelRef,
  yearRef,
  valueRef,
  currentYear,
  triggerNotification
}) => {
  // Mode tra cứu: 'quick' (Nhập nhanh) hoặc 'catalog' (Chọn theo danh mục)
  const [lookupMode, setLookupMode] = useState<'quick' | 'catalog'>('quick');

  // Input text
  const [quickInputText, setQuickInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [valuationData, setValuationData] = useState<ValuationResult | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Catalog state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string>('toyota');
  const [selectedModelSlug, setSelectedModelSlug] = useState<string>('toyota-vios');
  const [selectedTrimSlug, setSelectedTrimSlug] = useState<string>('');
  const [catalogYear, setCatalogYear] = useState<number>(currentYear);
  const [availableTrims, setAvailableTrims] = useState<{ slug: string; name: string }[]>([]);

  // Tải danh mục hãng & dòng xe từ backend
  useEffect(() => {
    fetch('/api/bonbanh/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.brands && data.brands.length > 0) {
          setBrands(data.brands);
        }
      })
      .catch(err => console.error('Lỗi tải danh mục:', err));
  }, []);

  const currentBrand = useMemo(() => {
    return brands.find(b => b.slug === selectedBrandSlug) || brands[0];
  }, [brands, selectedBrandSlug]);

  const currentModels = useMemo(() => {
    return currentBrand?.models || [];
  }, [currentBrand]);

  // Xử lý tra cứu nhanh từ chuỗi mô tả
  const handleQuickLookup = async () => {
    const text = quickInputText.trim();
    if (!text) return;

    setIsLoading(true);
    setLookupError('');

    try {
      const res = await fetch('/api/bonbanh/quick-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tra cứu xe');

      const { parsed, estimate } = data;

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
          setCatalogYear(parsed.year);
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
        if (triggerNotification) {
          triggerNotification('success', `Đã lấy giá Bonbanh: ${new Intl.NumberFormat('vi-VN').format(estimate.suggestedValue)} VNĐ`);
        }
      } else {
        setLookupError('Không tìm thấy tin xe trên Bonbanh. Bạn có thể chọn xe qua danh mục hoặc nhập thủ công.');
      }
    } catch (err: any) {
      setLookupError(err.message || 'Lỗi kết nối tra cứu');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý tra cứu từ danh mục
  const handleCatalogLookup = async () => {
    setIsLoading(true);
    setLookupError('');

    try {
      const queryParams = new URLSearchParams();
      if (selectedModelSlug) queryParams.set('modelSlug', selectedModelSlug);
      if (catalogYear) queryParams.set('year', catalogYear.toString());
      if (selectedTrimSlug) queryParams.set('trimSlug', selectedTrimSlug);

      const res = await fetch(`/api/bonbanh/estimate?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Không tìm thấy dữ liệu giá');

      setValuationData(data);
      if (data.suggestedValue) {
        setCarValueStr(data.suggestedValue.toString());
      }
      if (data.availableTrims) {
        setAvailableTrims(data.availableTrims);
      }

      // Điền thông tin dòng xe và năm sản xuất vào form
      const modelObj = currentModels.find(m => m.slug === selectedModelSlug);
      if (modelObj) {
        setCarModel(`${currentBrand.name} ${modelObj.name}`);
      }
      setManufactureYear(catalogYear);

      if (triggerNotification) {
        triggerNotification('success', `Đã lấy giá Bonbanh: ${new Intl.NumberFormat('vi-VN').format(data.suggestedValue)} VNĐ`);
      }
    } catch (err: any) {
      setLookupError(err.message || 'Không tìm thấy dữ liệu trên Bonbanh');
    } finally {
      setIsLoading(false);
    }
  };

  // Điều chỉnh nhanh giá trị xe +- 10, 20, 50 triệu
  const adjustValue = (delta: number) => {
    const newVal = Math.max(0, carValue + delta);
    setCarValueStr(newVal.toString());
  };

  // Kiểm tra xe đang là kinh doanh hay không kinh doanh
  const isBusinessCar = carType === 'grab' || carType === 'taxi' || carType.includes('commercial');

  return (
    <div className="space-y-6">
      {/* KHUNG TRA CỨU GIÁ TRỊ XE TỪ BONBANH (HỖ TRỢ ĐIỀN NHANH DÒNG XE, NĂM SX, GIÁ TRỊ XE) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Xác định nhanh giá trị xe từ Bonbanh.com
          </span>

          {/* Toggle 2 chế độ tra cứu */}
          <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setLookupMode('quick')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                lookupMode === 'quick' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nhập nhanh
            </button>
            <button
              type="button"
              onClick={() => setLookupMode('catalog')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                lookupMode === 'catalog' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chọn theo danh mục
            </button>
          </div>
        </div>

        {/* 1. Nhập nhanh */}
        {lookupMode === 'quick' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={quickInputText}
              onChange={(e) => setQuickInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickLookup();
                }
              }}
              placeholder="VD: Toyota Vios 2025 số tự động bản Pre, không kinh doanh, không vay ngân hàng..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400 bg-white"
            />
            <button
              type="button"
              disabled={isLoading || !quickInputText.trim()}
              onClick={handleQuickLookup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Tra cứu giá
            </button>
          </div>
        )}

        {/* 2. Chọn theo danh mục (đầy đủ các hãng & dòng xe như Bonbanh) */}
        {lookupMode === 'catalog' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Hãng xe */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Hãng xe</label>
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
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none"
              >
                {brands.map(b => (
                  <option key={b.slug} value={b.slug}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Dòng xe */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dòng xe</label>
              <select
                value={selectedModelSlug}
                onChange={(e) => {
                  setSelectedModelSlug(e.target.value);
                  setSelectedTrimSlug('');
                }}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none"
              >
                {currentModels.map(m => (
                  <option key={m.slug} value={m.slug}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Năm sản xuất */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Năm sản xuất</label>
              <select
                value={catalogYear}
                onChange={(e) => setCatalogYear(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg outline-none"
              >
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Nút lấy giá */}
            <div className="flex items-end">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCatalogLookup}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Lấy giá xe
              </button>
            </div>

            {/* Phiên bản nếu có */}
            {availableTrims.length > 0 && (
              <div className="sm:col-span-2 md:col-span-4 pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Bản xe:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrimSlug('');
                    handleCatalogLookup();
                  }}
                  className={`px-2.5 py-1 rounded text-xs transition-all border ${
                    !selectedTrimSlug ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tất cả bản
                </button>
                {availableTrims.map(t => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => {
                      setSelectedTrimSlug(t.slug);
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition-all border ${
                      selectedTrimSlug === t.slug ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {lookupError && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            {lookupError}
          </div>
        )}

        {/* Nút cộng/trừ nhanh giá trị xe +- 10, 20, 50tr & Link nguồn */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Cộng/trừ giá:</span>
            <button
              type="button"
              onClick={() => adjustValue(-50_000_000)}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-slate-700 text-xs"
            >
              -50Tr
            </button>
            <button
              type="button"
              onClick={() => adjustValue(-20_000_000)}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-slate-700 text-xs"
            >
              -20Tr
            </button>
            <button
              type="button"
              onClick={() => adjustValue(-10_000_000)}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-slate-700 text-xs"
            >
              -10Tr
            </button>
            <button
              type="button"
              onClick={() => adjustValue(10_000_000)}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-blue-700 text-xs"
            >
              +10Tr
            </button>
            <button
              type="button"
              onClick={() => adjustValue(20_000_000)}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-blue-700 text-xs"
            >
              +20Tr
            </button>
            <button
              type="button"
              onClick={() => adjustValue(50_000_000)}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 font-semibold text-blue-700 text-xs"
            >
              +50Tr
            </button>
          </div>

          {valuationData && (
            <a
              href={valuationData.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>Xem nguồn tin Bonbanh</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* MỤC ĐÍCH SỬ DỤNG: 2 NÚT CHỌN NHANH KHÔNG KINH DOANH / KINH DOANH */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mục đích sử dụng:</span>
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => {
              if (carType === 'pickup') {
                // giữ pickup nếu đang là bán tải
              } else {
                setCarType('personal_under_9');
              }
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              !isBusinessCar
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Không kinh doanh
          </button>
          <button
            type="button"
            onClick={() => setCarType('grab')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              isBusinessCar
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kinh doanh (Grab, Taxi, Dịch vụ...)
          </button>
        </div>
      </div>

      {/* CÁC TRƯỜNG THÔNG TIN TÍNH PHÍ ĐẦY ĐỦ (ĐƯỢC ĐIỀN TỰ ĐỘNG NHƯNG CHO PHÉP CHỈNH SỬA TẤT CẢ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Loại xe */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            Loại xe
          </label>
          <select 
            value={carType}
            onChange={(e) => {
              setCarType(e.target.value);
              carModelRef.current?.focus();
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium text-sm text-slate-800"
          >
            {(() => {
              const recentIds = [
                'personal_under_9',
                'grab',
                'pickup',
                'tractor',
                'truck_non_commercial_under_10',
                'truck_commercial_under_10',
                'commercial_under_9'
              ];
              const recentOptions = recentIds
                .map(id => vehiclesList.find(v => v.id === id))
                .filter((v): v is NonNullable<typeof v> => v !== undefined);

              const groups: Record<string, any[]> = {};
              vehiclesList.forEach(opt => {
                if (!groups[opt.group]) groups[opt.group] = [];
                groups[opt.group].push(opt);
              });

              return (
                <>
                  <optgroup label="GẦN ĐÂY">
                    {recentOptions.map(opt => (
                      <option key={`recent-${opt.id}`} value={opt.id}>{opt.name}</option>
                    ))}
                  </optgroup>
                  {Object.entries(groups).map(([groupName, options]) => (
                    <optgroup key={groupName} label={groupName}>
                      {options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </>
              );
            })()}
          </select>
        </div>

        {/* Dòng xe */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            Dòng xe
          </label>
          <input 
            ref={carModelRef}
            type="text" 
            placeholder="VD: Toyota Vios..."
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') yearRef.current?.focus();
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
          />
        </div>

        {/* Năm sản xuất */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            Năm sản xuất
          </label>
          <input 
            ref={yearRef}
            type="number" 
            value={manufactureYear}
            onChange={(e) => setManufactureYear(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') valueRef.current?.focus();
            }}
            min={1990}
            max={currentYear}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
          />
        </div>

        {/* Giá trị xe (VNĐ) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
            Giá trị xe (VNĐ)
          </label>
          <div className="relative">
            <input 
              ref={valueRef}
              type="text" 
              value={new Intl.NumberFormat('vi-VN').format(carValue)}
              onChange={(e) => setCarValueStr(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-sm text-slate-800"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">VNĐ</div>
          </div>
        </div>
      </div>

      {/* Hàng thuộc tính bổ sung: Ngân hàng, Lợi nhuận, Số chỗ/Tải, Động cơ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        {/* Cột 1: Ngân hàng vay */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ngân hàng vay</span>
          <select 
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-bold text-xs text-slate-700"
          >
            {BANK_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Cột 2: Lợi nhuận mong muốn (nếu đăng nhập) */}
        {currentUser && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Lợi nhuận mong muốn</span>
            <div className="relative">
              <input
                type="text"
                value={Number(profit).toLocaleString('vi-VN')}
                onChange={(e) => setProfit(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
                placeholder="Nhập lợi nhuận..."
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">VNĐ</span>
            </div>
          </div>
        )}

        {/* Cột 3: Số chỗ / Trọng tải */}
        {showSeatCount && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Số chỗ</span>
            <input 
              type="number" 
              value={seatCount}
              onChange={(e) => setSeatCount(Number(e.target.value))}
              min={1}
              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
            />
          </div>
        )}
        {showTonnage && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Trọng tải</span>
            <input 
              type="number" 
              value={tonnage}
              onChange={(e) => setTonnage(Number(e.target.value))}
              min={0.1}
              step={0.1}
              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
            />
          </div>
        )}
        {!showSeatCount && !showTonnage && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Số chỗ / Tải</span>
            <input 
              type="text" 
              disabled 
              placeholder="Không áp dụng"
              className="w-full px-3 py-2 bg-slate-100/50 rounded-xl border border-slate-200 outline-none text-xs font-semibold text-slate-400 cursor-not-allowed"
            />
          </div>
        )}

        {/* Cột 4: Động cơ */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Động cơ / Dòng xe</span>
          <select 
            value={evModel}
            onChange={(e) => setEvModel(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-bold text-xs text-slate-700"
          >
            {EV_MODELS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
