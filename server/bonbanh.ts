/**
 * Bonbanh.com Integration Module
 * Tra cứu giá trị xe thị trường từ Bonbanh.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CarBrand {
  slug: string;
  name: string;
  models: { slug: string; name: string }[];
}

export interface BonbanhListing {
  title: string;
  priceRaw: string;
  priceVal: number;
  year: number | null;
  url: string;
}

export interface ValuationResult {
  suggestedValue: number;
  exactAverage: number;
  minPrice: number;
  maxPrice: number;
  totalListings: number;
  sampleCount: number;
  formula: string;
  sampleListings: BonbanhListing[];
  availableTrims?: { slug: string; name: string }[];
  availableYears?: number[];
  sourceUrl: string;
}

// Load full catalog of 30 brands & models from bonbanh
let cachedBrands: CarBrand[] = [];

try {
  const catalogPath = path.resolve(__dirname, '../scratch/full_bonbanh_catalog.json');
  if (fs.existsSync(catalogPath)) {
    cachedBrands = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load scratch/full_bonbanh_catalog.json, using fallback');
}

if (!cachedBrands || cachedBrands.length === 0) {
  cachedBrands = [
    {
      slug: 'toyota',
      name: 'Toyota',
      models: [
        { slug: 'toyota-vios', name: 'Vios' },
        { slug: 'toyota-corolla_cross', name: 'Corolla Cross' },
        { slug: 'toyota-veloz', name: 'Veloz' },
        { slug: 'toyota-yaris-cross', name: 'Yaris Cross' },
        { slug: 'toyota-fortuner', name: 'Fortuner' },
        { slug: 'toyota-camry', name: 'Camry' },
        { slug: 'toyota-innova', name: 'Innova' },
        { slug: 'toyota-raize', name: 'Raize' },
        { slug: 'toyota-yaris', name: 'Yaris' },
        { slug: 'toyota-wigo', name: 'Wigo' },
        { slug: 'toyota-corolla_altis', name: 'Corolla Altis' },
        { slug: 'toyota-land_cruiser', name: 'Land Cruiser' },
        { slug: 'toyota-prado', name: 'Prado' },
        { slug: 'toyota-hilux', name: 'Hilux' },
        { slug: 'toyota-alphard', name: 'Alphard' }
      ]
    },
    {
      slug: 'hyundai',
      name: 'Hyundai',
      models: [
        { slug: 'hyundai-accent', name: 'Accent' },
        { slug: 'hyundai-creta', name: 'Creta' },
        { slug: 'hyundai-tucson', name: 'Tucson' },
        { slug: 'hyundai-santafe', name: 'SantaFe' },
        { slug: 'hyundai-i10', name: 'Grand i10' },
        { slug: 'hyundai-custin', name: 'Custin' },
        { slug: 'hyundai-stargazer', name: 'Stargazer' },
        { slug: 'hyundai-elantra', name: 'Elantra' },
        { slug: 'hyundai-palisade', name: 'Palisade' },
        { slug: 'hyundai-venue', name: 'Venue' },
        { slug: 'hyundai-kona', name: 'Kona' }
      ]
    },
    {
      slug: 'kia',
      name: 'Kia',
      models: [
        { slug: 'kia-seltos', name: 'Seltos' },
        { slug: 'kia-sonet', name: 'Sonet' },
        { slug: 'kia-carnival', name: 'Carnival' },
        { slug: 'kia-k3', name: 'K3' },
        { slug: 'kia-morning', name: 'Morning' },
        { slug: 'kia-sorento', name: 'Sorento' },
        { slug: 'kia-carens', name: 'Carens' },
        { slug: 'kia-k5', name: 'K5' },
        { slug: 'kia-soluto', name: 'Soluto' },
        { slug: 'kia-cerato', name: 'Cerato' }
      ]
    },
    {
      slug: 'honda',
      name: 'Honda',
      models: [
        { slug: 'honda-city', name: 'City' },
        { slug: 'honda-crv', name: 'CR-V' },
        { slug: 'honda-hrv', name: 'HR-V' },
        { slug: 'honda-br_v', name: 'BR-V' },
        { slug: 'honda-civic', name: 'Civic' },
        { slug: 'honda-brio', name: 'Brio' },
        { slug: 'honda-accord', name: 'Accord' }
      ]
    },
    {
      slug: 'mazda',
      name: 'Mazda',
      models: [
        { slug: 'mazda-cx_5', name: 'CX-5' },
        { slug: 'mazda-3', name: 'Mazda 3' },
        { slug: 'mazda-2', name: 'Mazda 2' },
        { slug: 'mazda-cx_8', name: 'CX-8' },
        { slug: 'mazda-cx_3', name: 'CX-3' },
        { slug: 'mazda-cx_30', name: 'CX-30' },
        { slug: 'mazda-6', name: 'Mazda 6' },
        { slug: 'mazda-bt_50', name: 'BT-50' }
      ]
    },
    {
      slug: 'ford',
      name: 'Ford',
      models: [
        { slug: 'ford-ranger', name: 'Ranger' },
        { slug: 'ford-everest', name: 'Everest' },
        { slug: 'ford-territory', name: 'Territory' },
        { slug: 'ford-transit', name: 'Transit' },
        { slug: 'ford-explorer', name: 'Explorer' },
        { slug: 'ford-ecosport', name: 'EcoSport' }
      ]
    },
    {
      slug: 'mitsubishi',
      name: 'Mitsubishi',
      models: [
        { slug: 'mitsubishi-xpander', name: 'Xpander' },
        { slug: 'mitsubishi-xforce', name: 'Xforce' },
        { slug: 'mitsubishi-attrage', name: 'Attrage' },
        { slug: 'mitsubishi-outlander', name: 'Outlander' },
        { slug: 'mitsubishi-triton', name: 'Triton' },
        { slug: 'mitsubishi-pajero_sport', name: 'Pajero Sport' }
      ]
    },
    {
      slug: 'vinfast',
      name: 'VinFast',
      models: [
        { slug: 'vinfast-vf3', name: 'VF 3' },
        { slug: 'vinfast-vf5', name: 'VF 5' },
        { slug: 'vinfast-vf6', name: 'VF 6' },
        { slug: 'vinfast-vf7', name: 'VF 7' },
        { slug: 'vinfast-vf8', name: 'VF 8' },
        { slug: 'vinfast-vf9', name: 'VF 9' },
        { slug: 'vinfast-vfe34', name: 'VF e34' },
        { slug: 'vinfast-fadil', name: 'Fadil' },
        { slug: 'vinfast-lux_a2.0', name: 'Lux A2.0' },
        { slug: 'vinfast-lux_sa2.0', name: 'Lux SA2.0' }
      ]
    }
  ];
}

export const TOP_BRANDS: CarBrand[] = cachedBrands;

export function parseBonbanhPrice(text: string): number | null {
  if (!text) return null;
  const clean = text.replace(/<[^>]+>/g, '').replace(/VND/gi, '').trim();
  let total = 0;
  let matched = false;

  const tyMatch = clean.match(/([\d.,]+)\s*(?:Tỷ|ty|tỉ)/i);
  if (tyMatch) {
    const ty = parseFloat(tyMatch[1].replace(',', '.'));
    if (!isNaN(ty)) {
      total += ty * 1_000_000_000;
      matched = true;
    }
  }

  const trMatch = clean.match(/([\d.,]+)\s*(?:Triệu|trieu|Tr)/i);
  if (trMatch) {
    const tr = parseFloat(trMatch[1].replace(',', '.'));
    if (!isNaN(tr)) {
      total += tr * 1_000_000;
      matched = true;
    }
  }

  if (!matched) {
    const num = parseFloat(clean.replace(/\./g, '').replace(/,/g, '.'));
    if (!isNaN(num) && num > 0) {
      if (num < 10000) return num * 1_000_000;
      return num;
    }
    return null;
  }

  return Math.round(total);
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
    }
  });
  if (!res.ok) {
    throw new Error(`Bonbanh returned HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

export function extractListings(html: string): BonbanhListing[] {
  const carItemRe = /<li[^>]*class="[^"]*car-item[^"]*"[\s\S]*?<\/li>/gi;
  const items = html.match(carItemRe) || [];
  const listings: BonbanhListing[] = [];

  for (const item of items) {
    const titleMatch = item.match(/<h3[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h3>/i);
    const priceMatch = item.match(/<b[^>]*itemprop="price"[^>]*>([\s\S]*?)<\/b>/i);
    const yearMatch = item.match(/<div class="cb1">[\s\S]*?<b>(\d{4})<\/b>/i);
    const urlMatch = item.match(/href="([^"]+)"/i);

    if (priceMatch) {
      const priceRaw = priceMatch[1].replace(/<[^>]+>/g, '').trim();
      const priceVal = parseBonbanhPrice(priceRaw);
      if (priceVal && priceVal >= 50_000_000) {
        listings.push({
          title: titleMatch ? titleMatch[1].trim() : '',
          priceRaw,
          priceVal,
          year: yearMatch ? parseInt(yearMatch[1], 10) : null,
          url: urlMatch ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://bonbanh.com/${urlMatch[1]}`) : ''
        });
      }
    }
  }

  return listings;
}

export function extractTrimsAndYears(html: string, modelSlug?: string, year?: number) {
  const trims: { slug: string; name: string }[] = [];
  const years: number[] = [];

  const submodelBlock = html.match(/id="submodel_list"[\s\S]*?<\/div>/i);
  if (submodelBlock) {
    const linkRe = /<a[^>]*href=["'](?:https:\/\/bonbanh\.com\/)?oto\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(submodelBlock[0])) !== null) {
      const slug = m[1];
      const cleanName = m[2].replace(/<[^>]+>/g, '').trim();
      if (cleanName && !trims.some(t => t.slug === slug)) {
        trims.push({ slug, name: cleanName });
      }
    }
  }

  const fmodelBlock = html.match(/id="fmodel_list"[\s\S]*?<\/div>/i);
  if (fmodelBlock) {
    const yearRe = /<a[^>]*href=["'](?:https:\/\/bonbanh\.com\/)?oto\/[^"']*-nam-(\d{4})["'][^>]*>/gi;
    let ym;
    while ((ym = yearRe.exec(fmodelBlock[0])) !== null) {
      const yr = parseInt(ym[1], 10);
      if (yr && !years.includes(yr)) {
        years.push(yr);
      }
    }
  }

  return { trims, years: years.sort((a, b) => b - a) };
}

/**
 * Tính giá trị trung bình phù hợp:
 * - Nếu chỉ có 1-2 xe: lấy giá thấp nhất + 40tr (khoảng 30-50tr)
 * - Nếu 3-5 xe: lấy trung bình các xe ở giữa
 * - Nếu 6-19 xe: loại 1 xe thấp nhất và 1 xe cao nhất, lấy trung bình
 * - Nếu >= 20 xe: lấy 10 xe thấp nhất + 10 xe cao nhất tính trung bình
 */
export function computeValuation(listings: BonbanhListing[], sourceUrl: string, trims?: { slug: string; name: string }[], years?: number[]): ValuationResult | null {
  if (!listings || listings.length === 0) {
    return null;
  }

  const sorted = [...listings].sort((a, b) => a.priceVal - b.priceVal);
  const n = sorted.length;
  let finalAvg = 0;

  if (n <= 2) {
    finalAvg = sorted[0].priceVal + 40_000_000;
  } else if (n >= 3 && n <= 5) {
    const slice = n >= 4 ? sorted.slice(1, -1) : sorted;
    const sum = slice.reduce((acc, item) => acc + item.priceVal, 0);
    finalAvg = Math.round(sum / slice.length);
  } else if (n >= 6 && n <= 19) {
    const slice = sorted.slice(1, -1);
    const sum = slice.reduce((acc, item) => acc + item.priceVal, 0);
    finalAvg = Math.round(sum / slice.length);
  } else {
    const lowest10 = sorted.slice(0, 10);
    const highest10 = sorted.slice(-10);
    const selected = [...lowest10, ...highest10];
    const sum = selected.reduce((acc, item) => acc + item.priceVal, 0);
    finalAvg = Math.round(sum / selected.length);
  }

  const suggestedValue = Math.round(finalAvg / 1_000_000) * 1_000_000;

  return {
    suggestedValue,
    exactAverage: finalAvg,
    minPrice: sorted[0].priceVal,
    maxPrice: sorted[n - 1].priceVal,
    totalListings: n,
    sampleCount: n,
    formula: '',
    sampleListings: sorted.slice(0, 4),
    availableTrims: trims,
    availableYears: years,
    sourceUrl
  };
}

export async function getBonbanhValuation(params: {
  modelSlug?: string;
  year?: number;
  trimSlug?: string;
  query?: string;
}): Promise<ValuationResult | null> {
  let targetUrl = '';
  const { modelSlug, year, trimSlug, query } = params;

  if (trimSlug) {
    targetUrl = trimSlug.startsWith('http') ? trimSlug : `https://bonbanh.com/oto/${trimSlug.replace(/^oto\//, '')}`;
  } else if (modelSlug && year) {
    targetUrl = `https://bonbanh.com/oto/${modelSlug}-nam-${year}`;
  } else if (modelSlug) {
    targetUrl = `https://bonbanh.com/oto/${modelSlug}`;
  } else if (query) {
    targetUrl = `https://bonbanh.com/oto?q=${encodeURIComponent(query)}`;
  } else {
    throw new Error('Cần cung cấp dòng xe hoặc từ khóa tìm kiếm');
  }

  try {
    const html = await fetchHtml(targetUrl);
    let listings = extractListings(html);
    const { trims, years } = extractTrimsAndYears(html, modelSlug, year);

    if (listings.length >= 20 && !targetUrl.includes('?q=')) {
      try {
        const page2Url = `${targetUrl}/page,2`;
        const htmlPage2 = await fetchHtml(page2Url);
        const p2Listings = extractListings(htmlPage2);
        if (p2Listings.length > 0) {
          listings = [...listings, ...p2Listings];
        }
      } catch (err) {}
    }

    if (listings.length === 0 && query && modelSlug) {
      const fallbackUrl = `https://bonbanh.com/oto?q=${encodeURIComponent(query)}`;
      const fallbackHtml = await fetchHtml(fallbackUrl);
      listings = extractListings(fallbackHtml);
    }

    return computeValuation(listings, targetUrl, trims, years);
  } catch (err) {
    console.error('Bonbanh scraping error:', err);
    throw err;
  }
}

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

/**
 * Phân tích chuỗi nhập xe tự do
 */
export function parseVehicleInput(text: string) {
  const norm = text.toLowerCase().trim();
  const plain = removeAccents(norm);

  // 1. Year
  const yearMatch = norm.match(/\b(20[12]\d|199\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  // 2. Identify Brand & Model
  let detectedBrand: CarBrand | null = null;
  let detectedModel: { slug: string; name: string } | null = null;

  for (const b of cachedBrands) {
    for (const m of b.models) {
      const modelNorm = m.name.toLowerCase();
      const modelPlain = removeAccents(modelNorm);
      const re = new RegExp(`\\b${modelPlain.replace('-', '[- ]?')}\\b`, 'i');
      if (re.test(plain) || norm.includes(modelNorm)) {
        detectedBrand = b;
        detectedModel = m;
        break;
      }
    }
    if (detectedModel) break;
  }

  if (!detectedModel) {
    if (plain.includes('accent') || plain.includes('aceent') || plain.includes('acent')) {
      detectedBrand = cachedBrands.find(b => b.slug === 'hyundai') || null;
      detectedModel = { slug: 'hyundai-accent', name: 'Accent' };
    } else if (plain.includes('vios') || plain.includes('viot')) {
      detectedBrand = cachedBrands.find(b => b.slug === 'toyota') || null;
      detectedModel = { slug: 'toyota-vios', name: 'Vios' };
    } else if (plain.includes('ranger')) {
      detectedBrand = cachedBrands.find(b => b.slug === 'ford') || null;
      detectedModel = { slug: 'ford-ranger', name: 'Ranger' };
    } else if (plain.includes('cx5') || plain.includes('cx-5')) {
      detectedBrand = cachedBrands.find(b => b.slug === 'mazda') || null;
      detectedModel = { slug: 'mazda-cx_5', name: 'CX-5' };
    } else if (plain.includes('cross') || plain.includes('corolla cross')) {
      detectedBrand = cachedBrands.find(b => b.slug === 'toyota') || null;
      detectedModel = { slug: 'toyota-corolla_cross', name: 'Corolla Cross' };
    } else if (plain.includes('xpander')) {
      detectedBrand = cachedBrands.find(b => b.slug === 'mitsubishi') || null;
      detectedModel = { slug: 'mitsubishi-xpander', name: 'Xpander' };
    }
  }

  // 3. Purpose
  let carType = 'personal_under_9';
  let isBusiness = false;

  const isNonCommercial = 
    plain.includes('khong kinh doanh') || plain.includes('ko kinh doanh') || 
    plain.includes('k kinh doanh') || plain.includes('khong kd') || plain.includes('ko kd') || 
    plain.includes('k kd') || plain.includes('gia dinh') || plain.includes('ca nhan');

  const isCommercial = 
    plain.includes('kinh doanh') || plain.includes('kd') || plain.includes('grab') || 
    plain.includes('be') || plain.includes('taxi') || plain.includes('dich vu');

  if (isNonCommercial) {
    carType = 'personal_under_9';
    isBusiness = false;
  } else if (isCommercial) {
    carType = 'grab';
    isBusiness = true;
  } else if (plain.includes('ban tai') || plain.includes('pickup') || (detectedModel && detectedModel.slug.includes('ranger'))) {
    carType = 'pickup';
  }

  // 4. Bank
  let selectedBank = 'Không vay ngân hàng';
  const isNotBorrowing = 
    plain.includes('khong vay') || plain.includes('ko vay') || 
    plain.includes('k vay') || plain.includes('tien mat') || !plain.includes('vay');

  if (!isNotBorrowing && plain.includes('vay')) {
    if (plain.includes('tp bank') || plain.includes('tpbank')) selectedBank = 'TP BANK - VAY MỚI';
    else if (plain.includes('vp bank') || plain.includes('vpbank')) selectedBank = 'VP BANK - CÁ NHÂN';
    else if (plain.includes('techcombank') || plain.includes('techcom')) selectedBank = 'TECHCOMBANK - NĂM ĐẦU';
    else if (plain.includes('toyota') || plain.includes('tfsvn')) selectedBank = 'CÔNG TY TÀI CHÍNH TOYOTA TFSVN';
    else if (plain.includes('vietcombank') || plain.includes('vcb')) selectedBank = 'VIETCOMBANK';
    else if (plain.includes('pvcombank') || plain.includes('pvcom')) selectedBank = 'PVCOMBANK - CÁ NHÂN';
    else if (plain.includes('ocb')) selectedBank = 'OCB KHỐI CÁ NHÂN';
    else if (plain.includes('acb')) selectedBank = 'ACB - Á CHÂU';
    else if (plain.includes('vib')) selectedBank = 'VIB';
    else selectedBank = 'TP BANK - VAY MỚI';
  }

  // 5. Version / Transmission
  const trimKeywords: string[] = [];
  if (plain.includes('tu dong') || plain.includes('so tu dong') || norm.includes('at') || norm.includes('cvt')) {
    trimKeywords.push('tự động');
  }
  if (plain.includes('so san') || norm.includes('mt')) {
    trimKeywords.push('số sàn');
  }
  if (plain.includes('pre') || plain.includes('premium')) trimKeywords.push('pre');
  if (plain.includes('cao cap')) trimKeywords.push('cao cấp');
  if (plain.includes('dac biet')) trimKeywords.push('đặc biệt');
  if (plain.includes('ban thuong') || plain.includes('tieu chuan') || plain.includes('base')) trimKeywords.push('tiêu chuẩn');

  return {
    rawInput: text,
    year,
    brand: detectedBrand ? { slug: detectedBrand.slug, name: detectedBrand.name } : null,
    model: detectedModel ? { slug: detectedModel.slug, name: detectedModel.name } : null,
    carType,
    isBusiness,
    selectedBank,
    trimKeywords,
    searchQuery: `${detectedModel ? detectedModel.name : ''} ${year} ${trimKeywords.join(' ')}`.trim()
  };
}
