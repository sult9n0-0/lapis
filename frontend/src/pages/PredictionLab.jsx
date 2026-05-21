import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NeuralBackground } from "../components/Hero.jsx";
import laptopRows from "../data/laptops.json";
import { cpuScores, gpuScores } from "../data/performanceScores.js";

const EUR_TO_AED_RATE = 4.32;
const INITIAL_RESULT_COUNT = 20;
const RESULT_BATCH_SIZE = 20;

const CURRENCIES = {
  AED: { symbol: "AED", rate: 1 },
  USD: { symbol: "$", rate: 0.27 },
  EUR: { symbol: "€", rate: 1 / EUR_TO_AED_RATE },
  INR: { symbol: "₹", rate: 23.3 }
};

const DEFAULT_FILTERS = {
  currency: "AED",
  query: "",
  minPrice: "",
  maxPrice: "",
  ram: "",
  storage: "",
  year: "",
  newOnly: false,
  brands: [],
  brandSearch: "",
  gpuCompany: "",
  gpuModel: "",
  gpuCompare: "=",
  processorCompany: "",
  processorModel: "",
  processorCompare: "=",
  crossBrandPerformance: false,
  usage: [],
  keywords: ""
};

const BRAND_OPTIONS = ["Apple", "Dell", "HP", "ASUS", "Lenovo", "MSI", "Acer", "Razer", "Samsung", "Microsoft", "LG", "Gigabyte", "Alienware", "Huawei", "Toshiba", "Fujitsu"];
const COMPARE_OPTIONS = [
  { label: ">", value: ">" },
  { label: "=", value: "=" },
  { label: "<", value: "<" }
];
const USAGE_OPTIONS = ["Gaming", "Business", "Student", "Creator"];
const QUICK_BRANDS = ["Apple", "Dell", "ASUS", "HP", "Lenovo", "MSI"];
const SORT_PARAMETERS = [
  { label: "Sort By", value: "" },
  { label: "Price", value: "price" },
  { label: "Performance", value: "performance" },
  { label: "Year", value: "year" },
  { label: "Value", value: "value" },
  { label: "GPU", value: "gpu" },
  { label: "CPU", value: "cpu" }
];
const SORT_DIRECTIONS = [
  { label: "Low to High", value: "asc" },
  { label: "High to Low", value: "desc" }
];

function normalizeBrand(company) {
  if (company === "Asus") return "ASUS";
  return company;
}

function formatRam(value) {
  return Number(value) >= 32 ? "32GB+" : `${value}GB`;
}

function formatStorage(value) {
  if (Number(value) >= 2000) return "2TB+";
  if (Number(value) >= 1000) return "1TB";
  if (Number(value) >= 512) return "512GB";
  return "256GB";
}

function detectProcessorCompany(cpu) {
  if (/amd|ryzen|a[0-9]-series/i.test(cpu)) return "AMD";
  if (/apple|m[123]/i.test(cpu)) return "Apple";
  return "Intel";
}

function detectGpuCompany(gpu) {
  if (/nvidia|geforce|gtx|rtx|quadro/i.test(gpu)) return "NVIDIA";
  if (/amd|radeon/i.test(gpu)) return "AMD";
  if (/apple/i.test(gpu)) return "Apple";
  return "Integrated";
}

function deriveUsage(row) {
  if (row.usageProfile) return row.usageProfile;
  if (/gaming|workstation/i.test(row.typeName) || /RTX|GTX|Radeon|GeForce|Quadro/i.test(row.gpu)) return "Gaming";
  if (/ultrabook|netbook/i.test(row.typeName)) return "Business";
  if (/2 in 1|convertible/i.test(row.typeName)) return "Creator";
  return Number(row.price) < 700 ? "Student" : "Business";
}

function normalizeLaptop(row) {
  const brand = normalizeBrand(row.company);
  const processorCompany = detectProcessorCompany(row.cpu);
  const gpuCompany = detectGpuCompany(row.gpu);
  const ram = formatRam(row.ram);
  const storage = formatStorage(row.storage);
  const priceAed = Math.max(1, Math.round(Number(row.price) * EUR_TO_AED_RATE));
  const trendValue = ((row.id % 13) - 6) / 10;
  const trend = `${trendValue >= 0 ? "+" : ""}${trendValue.toFixed(1)}%`;

  return {
    id: row.id,
    brand,
    title: `${brand} ${row.product}`,
    subtitle: `${row.cpu} - ${row.gpu}`,
    priceAed,
    processor: row.cpu,
    processorCompany,
    processorModel: row.cpu,
    processorScore: row.cpuScore || 4000,
    ram,
    storage,
    gpu: gpuCompany === "Integrated" ? "Integrated" : gpuCompany,
    gpuCompany,
    gpuModel: row.gpu,
    gpuScore: row.gpuScore || 1000,
    gpuLabel: row.gpu,
    condition: row.id % 4 === 0 ? "New" : "Used",
    location: "Dubai",
    usage: deriveUsage(row),
    year: String(2024 - (row.id % 4)),
    confidence: `${88 + (row.id % 10)}%`,
    trend,
    image: row.image,
    raw: row
  };
}

const LAPTOPS = laptopRows.map(normalizeLaptop);

function buildModelMap(items, companyKey, modelKey) {
  return items.reduce((map, item) => {
    const company = item[companyKey];
    if (!map[company]) map[company] = [];
    if (!map[company].includes(item[modelKey])) map[company].push(item[modelKey]);
    return map;
  }, {});
}

function buildScoreMap(items, modelKey, scoreKey) {
  return items.reduce((map, item) => {
    map[item[modelKey]] = Math.max(map[item[modelKey]] || 0, item[scoreKey] || 0);
    return map;
  }, {});
}

const GPU_MODELS_BY_COMPANY = buildModelMap(LAPTOPS, "gpuCompany", "gpuModel");
const PROCESSOR_MODELS_BY_COMPANY = buildModelMap(LAPTOPS, "processorCompany", "processorModel");
const GPU_SCORE_BY_MODEL = buildScoreMap(LAPTOPS, "gpuModel", "gpuScore");
const CPU_SCORE_BY_MODEL = buildScoreMap(LAPTOPS, "processorModel", "processorScore");

function getTomorrowDateValue() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function formatDateLabel(dateValue) {
  if (!dateValue) return "";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${dateValue}T00:00:00`));
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-medium text-white shadow-sm outline-none transition focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchSelect({ label, value, onChange, options, placeholder = "Search...", disabled = false, large = false }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options
    .filter((option) => option.toLowerCase().includes(normalizedQuery))
    .slice(0, 5);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  function choose(option) {
    setQuery(option);
    onChange(option);
    setOpen(false);
  }

  return (
    <div className="relative min-w-0">
      <label>
        {label && <span className="mb-2 block text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/70">{label}</span>}
        <div className="relative">
          <input
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            className={`${large ? "h-14 text-base" : "h-11 text-sm"} w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 pr-10 font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-45`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-cyan-100" />
        </div>
      </label>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-cyan-100/20 bg-slate-950 p-2 shadow-[0_0_36px_rgba(34,211,238,0.16)]"
          >
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-cyan-300/10 hover:text-white"
              >
                {option}
              </button>
            ))}
            {filteredOptions.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No matching options</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatPrice(priceAed, currency) {
  const { symbol, rate } = CURRENCIES[currency];
  const value = Math.round(priceAed * rate);
  return currency === "AED" ? `AED ${value.toLocaleString()}` : `${symbol}${value.toLocaleString()}`;
}

function currencyValueToAed(value, currency) {
  if (value === "") return null;
  return Number(value) / CURRENCIES[currency].rate;
}

function PriceField({ label, value, onChange, currency, placeholder }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60">{label}</span>
      <div className="flex h-11 items-center rounded-xl border border-white/10 bg-slate-950/70 px-3 shadow-sm transition focus-within:border-cyan-200/70 focus-within:ring-4 focus-within:ring-cyan-300/10">
        <span className="mr-2 shrink-0 text-xs font-semibold text-cyan-100/60">{currency}</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
        />
      </div>
    </label>
  );
}

function PillButton({ selected, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        selected
          ? "border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
          : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-200/60 hover:bg-cyan-300/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function toggleArray(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function comparePerformance(actualScore, selectedScore, operator) {
  if (!selectedScore) return true;
  if (operator === ">") return actualScore > selectedScore;
  if (operator === "<") return actualScore < selectedScore;
  return Math.abs(actualScore - selectedScore) <= 8;
}

function BrandComboBox({ draft, setDraft }) {
  const [open, setOpen] = useState(false);
  const query = draft.brandSearch.trim().toLowerCase();
  const filteredBrands = BRAND_OPTIONS.filter(
    (brand) => brand.toLowerCase().includes(query) && !draft.brands.includes(brand)
  );
  const previewBrands = filteredBrands.slice(0, 5);

  function selectBrand(brand) {
    setDraft((current) => ({
      ...current,
      brands: current.brands.includes(brand) ? current.brands : [...current.brands, brand],
      brandSearch: ""
    }));
    setOpen(false);
  }

  function removeBrand(brand) {
    setDraft((current) => ({ ...current, brands: current.brands.filter((item) => item !== brand) }));
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && previewBrands[0]) {
      event.preventDefault();
      selectBrand(previewBrands[0]);
    }
  }

  return (
    <div className="relative">
      <label>
        <span className="mb-2 block text-sm font-semibold text-slate-100">Brand</span>
        <input
          value={draft.brandSearch}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setDraft((current) => ({ ...current, brandSearch: event.target.value }));
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search brand..."
          className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10"
        />
      </label>

      {draft.brands.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {draft.brands.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => removeBrand(brand)}
              className="rounded-full border border-cyan-200 bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950"
            >
              {brand} x
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 right-0 top-[4.7rem] z-20 rounded-xl border border-cyan-100/15 bg-slate-950/95 p-2 shadow-[0_0_32px_rgba(34,211,238,0.16)] backdrop-blur-xl"
          >
            {previewBrands.map((brand) => (
              <button
                key={brand}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectBrand(brand)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-cyan-300/10 hover:text-white"
              >
                {brand}
              </button>
            ))}
            {filteredBrands.length > 5 && <div className="px-3 py-2 text-sm font-semibold text-slate-500">...</div>}
            {filteredBrands.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No more brands</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PerformanceFilter({ title, companyValue, modelValue, compareValue, modelMap, onCompanyChange, onModelChange, onCompareChange }) {
  const companies = Object.keys(modelMap);
  const models = companyValue ? modelMap[companyValue] : [];

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-100">{title}</h3>
      <div className="grid grid-cols-[1fr_1fr_4rem] gap-2">
        <select
          value={companyValue}
          onChange={(event) => onCompanyChange(event.target.value)}
          className="h-11 min-w-0 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-medium text-white outline-none focus:border-cyan-200/70"
        >
          <option value="">Company</option>
          {companies.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>
        <SearchSelect
          value={modelValue}
          onChange={onModelChange}
          options={models}
          placeholder="Search model..."
          disabled={!companyValue}
        />
        <select
          value={compareValue}
          onChange={(event) => onCompareChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/70"
        >
          {COMPARE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilterPanel({ draft, setDraft, onClear, onApply, mobile = false }) {
  const updateArray = (key, value) => {
    setDraft((current) => ({ ...current, [key]: toggleArray(current[key], value) }));
  };

  return (
    <aside
      className={`${mobile ? "" : "sticky top-6"} rounded-2xl border border-cyan-100/15 bg-slate-950/72 p-5 shadow-[0_0_50px_rgba(14,165,233,0.12)] backdrop-blur-2xl`}
    >
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Signal Filters</h2>
        <p className="text-sm text-slate-400">Refine the current-price model output.</p>
      </div>

      <div className="space-y-6">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-purple-200/20 bg-purple-300/10 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-purple-100">Cross-brand performance exploration</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              Compare CPU and GPU benchmark levels across different chip makers.
            </span>
          </span>
          <input
            type="checkbox"
            checked={draft.crossBrandPerformance}
            onChange={(event) => setDraft((current) => ({ ...current, crossBrandPerformance: event.target.checked }))}
            className="mt-1 h-5 w-5 shrink-0 accent-purple-300"
          />
        </label>

        <BrandComboBox draft={draft} setDraft={setDraft} />

        <PerformanceFilter
          title="GPU Performance"
          companyValue={draft.gpuCompany}
          modelValue={draft.gpuModel}
          compareValue={draft.gpuCompare}
          modelMap={GPU_MODELS_BY_COMPANY}
          onCompanyChange={(value) => setDraft((current) => ({ ...current, gpuCompany: value, gpuModel: "" }))}
          onModelChange={(value) => setDraft((current) => ({ ...current, gpuModel: value }))}
          onCompareChange={(value) => setDraft((current) => ({ ...current, gpuCompare: value }))}
        />

        <PerformanceFilter
          title="Processor Performance"
          companyValue={draft.processorCompany}
          modelValue={draft.processorModel}
          compareValue={draft.processorCompare}
          modelMap={PROCESSOR_MODELS_BY_COMPANY}
          onCompanyChange={(value) => setDraft((current) => ({ ...current, processorCompany: value, processorModel: "" }))}
          onModelChange={(value) => setDraft((current) => ({ ...current, processorModel: value }))}
          onCompareChange={(value) => setDraft((current) => ({ ...current, processorCompare: value }))}
        />

        <FilterSection title="Usage Profile">
          {USAGE_OPTIONS.map((usage) => (
            <PillButton key={usage} selected={draft.usage.includes(usage)} onClick={() => updateArray("usage", usage)}>
              {usage}
            </PillButton>
          ))}
        </FilterSection>

        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-100">Keywords</span>
          <input
            value={draft.keywords}
            onChange={(event) => setDraft((current) => ({ ...current, keywords: event.target.value }))}
            placeholder="Enter Keyword..."
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={onClear}
            className="h-12 rounded-xl border border-white/15 bg-white/[0.03] text-sm font-bold text-slate-200 transition hover:border-cyan-200/50 hover:text-white"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-12 rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.25)] transition hover:bg-cyan-200"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </aside>
  );
}

function FilterSection({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-100">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function getStorageScore(storage) {
  if (storage === "2TB+") return 4;
  if (storage === "1TB") return 3;
  if (storage === "512GB") return 2;
  if (storage === "256GB") return 1;
  return 0;
}

function getListPredictedPrice(priceAed, predictionDate, laptop) {
  if (!predictionDate) return priceAed;
  const today = new Date();
  const target = new Date(`${predictionDate}T00:00:00`);
  const daysAhead = Math.max(1, Math.ceil((target - today) / 86400000));
  const storageLift = laptop ? getStorageScore(laptop.storage) * 0.004 : 0;
  const projectedLift = Math.min(0.2, daysAhead * 0.0009 + storageLift);
  return Math.round(priceAed * (1 + projectedLift));
}

function getSupportedConfig(laptop) {
  const sameModel = LAPTOPS.filter((item) => item.brand === laptop.brand && item.raw.product === laptop.raw.product);
  const source = sameModel.length > 1 ? sameModel : LAPTOPS.filter((item) => item.brand === laptop.brand && item.raw.typeName === laptop.raw.typeName);
  const byRam = (first, second) => Number.parseInt(first, 10) - Number.parseInt(second, 10);
  const byStorage = (first, second) => getStorageScore(first) - getStorageScore(second);

  return {
    ram: [...new Set(source.map((item) => item.ram))].sort(byRam),
    storage: [...new Set(source.map((item) => item.storage))].sort(byStorage),
    gpu: [...new Set(source.map((item) => item.gpuModel))],
    cpu: [...new Set(source.map((item) => item.processorModel))]
  };
}

function getPredictedPrice(modelID,date,specs) {
  const laptop=LAPTOPS.find((item)=>item.id===modelID);
  if (!laptop) return { predictedPrice: 0, confidenceScore: "0%" };
  const config=getSupportedConfig(laptop);
  const ramBoost=Math.max(0, config.ram.indexOf(specs.selectedRAM)) * 0.045;
  const storageBoost=Math.max(0, config.storage.indexOf(specs.selectedStorage)) * 0.04;
  const gpuBoost=Math.max(0, config.gpu.indexOf(specs.selectedGPU)) * 0.07;
  const cpuBoost=Math.max(0, config.cpu.indexOf(specs.selectedCPU)) * 0.055;
  const target=new Date(`${date || getTomorrowDateValue()}T00:00:00`);
  const daysAhead=Math.max(1, Math.ceil((target - new Date()) / 86400000));
  const timeLift=Math.min(0.14, daysAhead * 0.0008);
  const multiplier=1 + timeLift + ramBoost + storageBoost + gpuBoost + cpuBoost;
  const predictedPrice=Math.round(laptop.priceAed * multiplier);
  const confidenceBase=97 - (Math.max(0, config.ram.indexOf(specs.selectedRAM)) * 2 + Math.max(0, config.storage.indexOf(specs.selectedStorage)) * 2 + Math.max(0, config.gpu.indexOf(specs.selectedGPU)) * 3 + Math.max(0, config.cpu.indexOf(specs.selectedCPU)) * 2);
  const confidenceScore=`${Math.max(82, confidenceBase)}%`;
  return { predictedPrice, confidenceScore };
}

function getPerformanceScore(laptop) {
  return laptop.processorScore * 0.52 + laptop.gpuScore * 0.38 + getStorageScore(laptop.storage) * 550;
}

function sortLaptops(laptops, sortParameter, sortDirection, predictionDate) {
  const sorted = [...laptops];

  return sorted.sort((first, second) => {
    const firstPrice = predictionDate ? getListPredictedPrice(first.priceAed, predictionDate, first) : first.priceAed;
    const secondPrice = predictionDate ? getListPredictedPrice(second.priceAed, predictionDate, second) : second.priceAed;
    const firstPerformance = getPerformanceScore(first);
    const secondPerformance = getPerformanceScore(second);
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortParameter === "price") return (firstPrice - secondPrice) * direction;
    if (sortParameter === "performance") return (firstPerformance - secondPerformance) * direction;
    if (sortParameter === "year") return (Number(first.year) - Number(second.year)) * direction;
    if (sortParameter === "value") return (firstPerformance / firstPrice - secondPerformance / secondPrice) * direction;
    if (sortParameter === "gpu") return (first.gpuScore - second.gpuScore) * direction;
    if (sortParameter === "cpu") return (first.processorScore - second.processorScore) * direction;
    return first.id - second.id;
  });
}

function LaptopCard({ laptop, currency, predictionDate, onPreview }) {
  const isPredicting = Boolean(predictionDate);
  const displayPrice = isPredicting ? getListPredictedPrice(laptop.priceAed, predictionDate, laptop) : laptop.priceAed;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
      className="overflow-hidden rounded-2xl border border-cyan-100/12 bg-white/[0.055] shadow-[0_0_44px_rgba(14,165,233,0.08)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/[0.075] sm:grid sm:grid-cols-[220px_1fr]"
    >
      <div className="h-52 overflow-hidden bg-slate-950 sm:h-full">
        <img src={laptop.image} alt={laptop.title} className="h-full w-full object-cover opacity-90 saturate-125" />
      </div>
      <div className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-2xl font-semibold text-cyan-100">{formatPrice(displayPrice, currency)}</div>
            <h3 className="mt-2 text-lg font-semibold text-white">{laptop.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{laptop.subtitle}</p>
          </div>
          {isPredicting && (
            <div className="rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
              Confidence {laptop.confidence}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Spec label="RAM" value={laptop.ram} />
          <Spec label="Storage" value={`${laptop.storage} SSD`} />
          <Spec label="GPU" value={laptop.gpuLabel} />
          <Spec label="Processor" value={laptop.processor} />
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {isPredicting
              ? `Predicted price for ${formatDateLabel(predictionDate)}`
              : "Current market price"}
          </span>
          <div className="flex items-center gap-3">
            <span className={laptop.trend.startsWith("+") ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
              30-day trend {laptop.trend}
            </span>
            <button
              type="button"
              onClick={() => onPreview(laptop)}
              className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-300 hover:text-slate-950"
            >
              Preview
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function getInitialLaptopState(laptop) {
  return {
    modelID: laptop.id,
    selectedRAM: laptop.ram,
    selectedStorage: laptop.storage,
    selectedGPU: laptop.gpuModel,
    selectedCPU: laptop.processorModel,
    predictedPrice: null,
    confidenceScore: null,
    predictionDate: ""
  };
}

function getScoreValue(key, value) {
  if (key === "CPU") return CPU_SCORE_BY_MODEL[value] || cpuScores[value] || 0;
  if (key === "GPU") return GPU_SCORE_BY_MODEL[value] || gpuScores[value] || 0;
  if (key === "RAM") return Number.parseInt(value, 10) || 0;
  if (key === "Storage") return getStorageScore(value);
  return 0;
}

function CompareRow({ label, leftValue, rightValue, leftScore, rightScore }) {
  const leftBetter=leftScore>rightScore;
  const rightBetter=rightScore>leftScore;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-base sm:text-lg">
      <div className={`font-bold ${leftBetter ? "text-emerald-300" : rightBetter ? "text-rose-300" : "text-slate-100"}`}>{leftValue}</div>
      <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`text-right font-bold ${rightBetter ? "text-emerald-300" : leftBetter ? "text-rose-300" : "text-slate-100"}`}>{rightValue}</div>
    </div>
  );
}

function ConfigSelect({ label, value, onChange, options }) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/70">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full appearance-none rounded-2xl border border-cyan-200/30 bg-slate-950/90 px-4 pr-12 text-base font-bold text-white shadow-sm outline-none transition focus:border-cyan-200/80 focus:ring-4 focus:ring-cyan-300/15"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/10">
          <span className="h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-cyan-100" />
        </span>
      </div>
    </label>
  );
}

function LaptopSearchPicker({ onPickLaptop, pickOptions, selectedLaptop, headerMode = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const search=query.trim().toLowerCase();
  const filteredOptions=pickOptions.filter((item) => {
    const text=`${item.brand} ${item.title} ${item.subtitle} ${item.processor} ${item.gpuLabel}`.toLowerCase();
    return !search || text.includes(search);
  });

  function selectLaptop(id) {
    onPickLaptop(id);
    const selected=pickOptions.find((item) => item.id === id);
    setQuery(selected ? selected.title : "");
    setOpen(false);
  }

  return (
    <div className="relative w-full">
      <label>
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder={selectedLaptop ? selectedLaptop.title : "Search laptop model, brand, CPU, or GPU"}
          className={`w-full rounded-2xl border border-cyan-200/30 bg-slate-950/80 px-4 font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/80 focus:ring-4 focus:ring-cyan-300/15 ${
            headerMode ? "h-12 text-2xl" : "h-14 text-base"
          }`}
        />
      </label>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 right-0 top-[5.2rem] z-30 max-h-72 overflow-y-auto rounded-2xl border border-cyan-100/20 bg-slate-950 p-2 shadow-[0_0_44px_rgba(34,211,238,0.18)]"
          >
            {filteredOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectLaptop(item.id)}
                className="block w-full rounded-xl px-4 py-3 text-left transition hover:bg-cyan-300/10"
              >
                <span className="block text-base font-bold text-white">{item.title}</span>
                <span className="mt-1 block text-sm text-slate-400">{item.subtitle} - {formatPrice(item.priceAed, "AED")}</span>
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-3 text-base font-semibold text-slate-400">No matching laptops</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LaptopPanel({ laptop, state, setState, currency, predictionDate, canPickLaptop = false, onPickLaptop, pickOptions, heading }) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState(state.predictionDate || predictionDate || getTomorrowDateValue());
  const config=getSupportedConfig(laptop);
  const minPredictionDate=getTomorrowDateValue();
  const currentPrice=formatPrice(laptop.priceAed, currency);
  const predictedDisplay=state.predictedPrice===null ? "--" : formatPrice(state.predictedPrice, currency);
  const confidenceDisplay=state.confidenceScore || "--";
  const dateDisplay=state.predictionDate ? formatDateLabel(state.predictionDate) : "--";

  function runPrediction() {
    const nextDate=dateDraft < minPredictionDate ? minPredictionDate : dateDraft;
    const { predictedPrice, confidenceScore }=getPredictedPrice(laptop.id,nextDate,{ selectedRAM: state.selectedRAM, selectedStorage: state.selectedStorage, selectedGPU: state.selectedGPU, selectedCPU: state.selectedCPU });
    setDateDraft(nextDate);
    setState((current)=>({ ...current, predictedPrice, confidenceScore, predictionDate: nextDate }));
    setDatePickerOpen(false);
  }

  function clearPanelPrediction() {
    setDateDraft(minPredictionDate);
    setState((current)=>({ ...current, predictedPrice: null, confidenceScore: null, predictionDate: "" }));
    setDatePickerOpen(false);
  }

  return (
    <article className="rounded-2xl border border-cyan-100/15 bg-white/[0.05] p-6 shadow-[0_0_42px_rgba(34,211,238,0.09)]">
      <div className="mb-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-200/70">{heading}</p>
          {!canPickLaptop && <h2 className="mt-2 text-2xl font-bold text-white">{laptop.title}</h2>}
        </div>
        {canPickLaptop && (
          <div className="mt-2">
            <LaptopSearchPicker onPickLaptop={onPickLaptop} pickOptions={pickOptions} selectedLaptop={laptop} headerMode />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Spec label="Brand" value={laptop.brand} />
        <Spec label="Year" value={laptop.year} />
        <Spec label="CPU Score" value={(getScoreValue("CPU", state.selectedCPU) || laptop.processorScore).toLocaleString()} />
        <Spec label="GPU Score" value={(getScoreValue("GPU", state.selectedGPU) || laptop.gpuScore).toLocaleString()} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[0.65fr_0.95fr_1.25fr_1.25fr]">
        <ConfigSelect label="RAM" value={state.selectedRAM} onChange={(value) => setState((current)=>({ ...current, selectedRAM: value }))} options={config.ram.map((item) => ({ label: item, value: item }))} />
        <ConfigSelect label="Storage" value={state.selectedStorage} onChange={(value) => setState((current)=>({ ...current, selectedStorage: value }))} options={config.storage.map((item) => ({ label: item, value: item }))} />
        <SearchSelect label="GPU" value={state.selectedGPU} onChange={(value) => setState((current)=>({ ...current, selectedGPU: value }))} options={config.gpu} placeholder="Search GPU..." large />
        <SearchSelect label="CPU" value={state.selectedCPU} onChange={(value) => setState((current)=>({ ...current, selectedCPU: value }))} options={config.cpu} placeholder="Search CPU..." large />
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => {
            setDateDraft(state.predictionDate || predictionDate || minPredictionDate);
            setDatePickerOpen((open) => !open);
          }}
          className="h-12 rounded-2xl bg-cyan-300 px-5 text-base font-bold text-slate-950 hover:bg-cyan-200"
        >
          Predict Price
        </button>
        <span className="text-base text-slate-300">Current Price: <span className="font-bold text-cyan-100">{currentPrice}</span></span>
        <span className="text-base text-slate-300">Predicted Price: <span className="font-bold text-cyan-100">{predictedDisplay}</span></span>
        <span className="text-base text-slate-300">Confidence: <span className="font-bold text-cyan-100">{confidenceDisplay}</span></span>
        <span className="text-base text-slate-300">Prediction Date: <span className="font-bold text-cyan-100">{dateDisplay}</span></span>

        <AnimatePresence>
          {datePickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 top-14 z-40 w-80 rounded-2xl border border-purple-200/25 bg-slate-950 p-4 shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            >
              <label>
                <span className="mb-2 block text-sm font-semibold text-white">Predict price for</span>
                <input
                  type="date"
                  min={minPredictionDate}
                  value={dateDraft}
                  onChange={(event) => setDateDraft(event.target.value)}
                  className="lapis-date-input h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-base font-semibold text-white outline-none focus:border-purple-200/70 focus:ring-4 focus:ring-purple-300/10"
                />
              </label>
              <p className="mt-2 text-sm leading-5 text-slate-400">
                Select a future date for this laptop prediction.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearPanelPrediction}
                  className="h-11 rounded-xl border border-white/15 text-sm font-semibold text-slate-200 hover:border-purple-200/50"
                >
                  Current
                </button>
                <button
                  type="button"
                  onClick={runPrediction}
                  className="h-11 rounded-xl bg-purple-300 text-sm font-bold text-slate-950 hover:bg-purple-200"
                >
                  Predict
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

function EmptyComparisonPanel({ onPickLaptop, pickOptions }) {
  return (
    <article className="flex min-h-[28rem] flex-col justify-center rounded-2xl border border-dashed border-cyan-100/20 bg-white/[0.035] p-6 shadow-[0_0_42px_rgba(34,211,238,0.07)]">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-200/70">Compare With</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Search and choose a laptop</h2>
        <div className="mt-5">
          <LaptopSearchPicker onPickLaptop={onPickLaptop} pickOptions={pickOptions} />
        </div>
      </div>
    </article>
  );
}

function LaptopPreview({ laptop, currency, onCurrencyChange, predictionDate, onBack }) {
  const [compareMode, setCompareMode] = useState(false);
  const [comparePriceMode, setComparePriceMode] = useState("current");
  const [rightLaptopID, setRightLaptopID] = useState(null);
  const [leftLaptopState, setLeftLaptopState] = useState(getInitialLaptopState(laptop));
  const [rightLaptopState, setRightLaptopState] = useState(null);
  const rightLaptop=rightLaptopID ? LAPTOPS.find((item) => item.id === rightLaptopID) : null;

  const leftCurrentPrice=laptop.priceAed;
  const rightCurrentPrice=rightLaptop?.priceAed || 0;
  const leftPredictedPrice=leftLaptopState.predictedPrice ?? leftCurrentPrice;
  const rightPredictedPrice=rightLaptopState?.predictedPrice ?? rightCurrentPrice;
  const priceLabel=comparePriceMode === "current" ? "Current Price" : "Predicted Price";
  const leftPriceScore=comparePriceMode === "current" ? leftCurrentPrice : leftPredictedPrice;
  const rightPriceScore=comparePriceMode === "current" ? rightCurrentPrice : rightPredictedPrice;
  const pickOptions=LAPTOPS.filter((item) => item.id !== laptop.id);

  function loadRightLaptop(id) {
    const selected=LAPTOPS.find((item) => item.id === id);
    if (!selected) return;
    setRightLaptopID(id);
    setRightLaptopState(getInitialLaptopState(selected));
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 22, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -18, filter: "blur(12px)" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[1.6rem] border border-cyan-100/15 bg-white/[0.055] p-5 shadow-[0_0_60px_rgba(34,211,238,0.1)] backdrop-blur-2xl"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-200/60 hover:text-white"
          >
            Back to results
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/65">Laptop Preview</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-5xl">{laptop.title}</h1>
          <p className="mt-2 text-slate-400">{laptop.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-32">
            <SelectField
              label="Currency"
              value={currency}
              onChange={onCurrencyChange}
              options={[
                { label: "AED", value: "AED" },
                { label: "USD", value: "USD" },
                { label: "EUR", value: "EUR" },
                { label: "INR", value: "INR" }
              ]}
            />
          </div>
          {!compareMode ? (
            <button type="button" onClick={() => setCompareMode(true)} className="h-10 rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20">
              Compare Laptop
            </button>
          ) : (
            <button type="button" onClick={() => setCompareMode(false)} className="h-10 rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:border-cyan-200/60">
              Remove Comparison
            </button>
          )}
          {predictionDate && (
            <div className="rounded-2xl border border-purple-200/25 bg-purple-300/10 px-5 py-2.5 text-purple-100">
              <div className="text-xs uppercase tracking-[0.22em] text-purple-100/60">Prediction Date</div>
              <div className="text-sm font-semibold">{formatDateLabel(predictionDate)}</div>
            </div>
          )}
        </div>
      </div>

      <div className={`grid gap-5 transition-all duration-300 ${compareMode ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        <LaptopPanel
          laptop={laptop}
          state={leftLaptopState}
          setState={setLeftLaptopState}
          currency={currency}
          predictionDate={predictionDate}
          heading="Selected Model"
        />

        {compareMode && rightLaptop && rightLaptopState && (
          <LaptopPanel
            laptop={rightLaptop}
            state={rightLaptopState}
            setState={setRightLaptopState}
            currency={currency}
            predictionDate={predictionDate}
            canPickLaptop
            onPickLaptop={loadRightLaptop}
            pickOptions={pickOptions}
            heading="Compare With"
          />
        )}

        {compareMode && (!rightLaptop || !rightLaptopState) && (
          <EmptyComparisonPanel onPickLaptop={loadRightLaptop} pickOptions={pickOptions} />
        )}
      </div>

      {compareMode && rightLaptop && rightLaptopState && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-2xl font-bold text-white">Comparison</h3>
            <div className="flex rounded-xl border border-white/15 bg-slate-950/70 p-1">
              <button type="button" onClick={() => setComparePriceMode("current")} className={`rounded-lg px-4 py-2 text-base font-bold ${comparePriceMode === "current" ? "bg-cyan-300 text-slate-950" : "text-slate-300"}`}>
                Compare Current Price
              </button>
              <button type="button" onClick={() => setComparePriceMode("predicted")} className={`rounded-lg px-4 py-2 text-base font-bold ${comparePriceMode === "predicted" ? "bg-cyan-300 text-slate-950" : "text-slate-300"}`}>
                Compare Predicted Price
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <CompareRow label="CPU Score" leftValue={(getScoreValue("CPU", leftLaptopState.selectedCPU) || laptop.processorScore).toLocaleString()} rightValue={(getScoreValue("CPU", rightLaptopState.selectedCPU) || rightLaptop.processorScore).toLocaleString()} leftScore={getScoreValue("CPU", leftLaptopState.selectedCPU)} rightScore={getScoreValue("CPU", rightLaptopState.selectedCPU)} />
            <CompareRow label="GPU Score" leftValue={(getScoreValue("GPU", leftLaptopState.selectedGPU) || laptop.gpuScore).toLocaleString()} rightValue={(getScoreValue("GPU", rightLaptopState.selectedGPU) || rightLaptop.gpuScore).toLocaleString()} leftScore={getScoreValue("GPU", leftLaptopState.selectedGPU)} rightScore={getScoreValue("GPU", rightLaptopState.selectedGPU)} />
            <CompareRow label="RAM" leftValue={leftLaptopState.selectedRAM} rightValue={rightLaptopState.selectedRAM} leftScore={getScoreValue("RAM", leftLaptopState.selectedRAM)} rightScore={getScoreValue("RAM", rightLaptopState.selectedRAM)} />
            <CompareRow label="Storage" leftValue={leftLaptopState.selectedStorage} rightValue={rightLaptopState.selectedStorage} leftScore={getScoreValue("Storage", leftLaptopState.selectedStorage)} rightScore={getScoreValue("Storage", rightLaptopState.selectedStorage)} />
            <CompareRow label={priceLabel} leftValue={formatPrice(leftPriceScore, currency)} rightValue={formatPrice(rightPriceScore, currency)} leftScore={-leftPriceScore} rightScore={-rightPriceScore} />
          </div>
        </div>
      )}
    </motion.section>
  );
}

function Spec({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

export default function PredictionLab({ onBack }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [predictionPickerOpen, setPredictionPickerOpen] = useState(false);
  const [predictionDraftDate, setPredictionDraftDate] = useState(getTomorrowDateValue());
  const [predictionDate, setPredictionDate] = useState("");
  const [previewLaptop, setPreviewLaptop] = useState(null);
  const [sortParameter, setSortParameter] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [visibleCount, setVisibleCount] = useState(INITIAL_RESULT_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const minPredictionDate = getTomorrowDateValue();

  const filteredLaptops = useMemo(() => {
    const search = filters.query.trim().toLowerCase();
    const keywords = filters.keywords.trim().toLowerCase();

    return LAPTOPS.filter((laptop) => {
      const text = `${laptop.brand} ${laptop.title} ${laptop.subtitle} ${laptop.processor} ${laptop.gpuLabel} ${laptop.usage}`.toLowerCase();
      const minPriceAed = currencyValueToAed(filters.minPrice, filters.currency);
      const maxPriceAed = currencyValueToAed(filters.maxPrice, filters.currency);
      const matchesSearch = !search || text.includes(search);
      const matchesKeywords = !keywords || text.includes(keywords);
      const matchesBrand = filters.brands.length === 0 || filters.brands.includes(laptop.brand);
      const selectedGpuScore = filters.gpuModel ? getScoreValue("GPU", filters.gpuModel) : null;
      const selectedProcessorScore = filters.processorModel ? getScoreValue("CPU", filters.processorModel) : null;
      const shouldLockGpuCompany = !filters.crossBrandPerformance || !filters.gpuModel;
      const shouldLockProcessorCompany = !filters.crossBrandPerformance || !filters.processorModel;
      const matchesGpuCompany =
        !shouldLockGpuCompany ||
        !filters.gpuCompany ||
        laptop.gpuCompany === filters.gpuCompany ||
        (filters.gpuCompany === "Integrated" && laptop.gpu === "Integrated");
      const matchesGpuPerformance = !filters.gpuModel || comparePerformance(laptop.gpuScore, selectedGpuScore, filters.gpuCompare);
      const matchesProcessorCompany =
        !shouldLockProcessorCompany || !filters.processorCompany || laptop.processorCompany === filters.processorCompany;
      const matchesProcessorPerformance =
        !filters.processorModel || comparePerformance(laptop.processorScore, selectedProcessorScore, filters.processorCompare);
      const matchesUsage = filters.usage.length === 0 || filters.usage.includes(laptop.usage);
      const matchesNew = !filters.newOnly || laptop.condition === "New";
      const matchesRam = !filters.ram || laptop.ram === filters.ram;
      const matchesStorage = !filters.storage || laptop.storage === filters.storage;
      const matchesYear = !filters.year || (filters.year === "Older" ? Number(laptop.year) < 2022 : laptop.year === filters.year);
      const matchesMinPrice = minPriceAed === null || laptop.priceAed >= minPriceAed;
      const matchesMaxPrice = maxPriceAed === null || laptop.priceAed <= maxPriceAed;

      return (
        matchesSearch &&
        matchesKeywords &&
        matchesBrand &&
        matchesGpuCompany &&
        matchesGpuPerformance &&
        matchesProcessorCompany &&
        matchesProcessorPerformance &&
        matchesUsage &&
        matchesNew &&
        matchesRam &&
        matchesStorage &&
        matchesYear &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });
  }, [filters]);

  function updateTopFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setDrawerOpen(false);
  }

  function applyFilters() {
    setFilters(draftFilters);
    setDrawerOpen(false);
  }

  function toggleQuickBrand(brand) {
    const nextBrands = toggleArray(filters.brands, brand);
    setFilters((current) => ({ ...current, brands: nextBrands }));
    setDraftFilters((current) => ({ ...current, brands: nextBrands }));
  }

  const averagePrice = filteredLaptops.length
    ? Math.round(filteredLaptops.reduce((sum, laptop) => sum + laptop.priceAed, 0) / filteredLaptops.length)
    : 0;
  const averageDisplayPrice = filteredLaptops.length
    ? Math.round(
        filteredLaptops.reduce(
          (sum, laptop) => sum + (predictionDate ? getListPredictedPrice(laptop.priceAed, predictionDate, laptop) : laptop.priceAed),
          0
        ) / filteredLaptops.length
      )
    : averagePrice;
  const sortedLaptops = useMemo(
    () => sortLaptops(filteredLaptops, sortParameter, sortDirection, predictionDate),
    [filteredLaptops, sortParameter, sortDirection, predictionDate]
  );
  const visibleLaptops = sortedLaptops.slice(0, visibleCount);
  const hasMoreResults = visibleCount < sortedLaptops.length;

  useEffect(() => {
    setVisibleCount(INITIAL_RESULT_COUNT);
    setLoadingMore(false);
  }, [filters, sortParameter, sortDirection, predictionDate]);

  useEffect(() => {
    if (previewLaptop || !hasMoreResults || loadingMore) return undefined;
    const target = loadMoreRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLoadingMore(true);
        window.setTimeout(() => {
          setVisibleCount((current) => Math.min(current + RESULT_BATCH_SIZE, sortedLaptops.length));
          setLoadingMore(false);
        }, 200);
      },
      { rootMargin: "420px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreResults, loadingMore, previewLaptop, sortedLaptops.length]);

  function activatePrediction() {
    if (predictionDraftDate < minPredictionDate) {
      setPredictionDraftDate(minPredictionDate);
      return;
    }
    setPredictionDate(predictionDraftDate);
    setPredictionPickerOpen(false);
  }

  function clearPredictionMode() {
    setPredictionDate("");
    setPredictionDraftDate(minPredictionDate);
    setPredictionPickerOpen(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <NeuralBackground />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_28%),linear-gradient(to_bottom,rgba(2,6,23,0.2),rgba(2,6,23,0.94))]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <button type="button" onClick={onBack} className="text-xl font-semibold tracking-tight text-white">
            LAPIS AI
          </button>
        </header>

        {!previewLaptop && (
        <motion.section
          className="mb-6 rounded-[1.5rem] border border-cyan-100/15 bg-white/[0.055] p-4 shadow-[0_0_60px_rgba(34,211,238,0.1)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 18, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">Prediction Lab</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-5xl">Explore current laptop prices</h1>
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.8fr_2fr_1fr_1fr_1fr_1fr_1fr_auto_auto]">
            <SelectField
              label="Currency"
              value={filters.currency}
              onChange={(value) => updateTopFilter("currency", value)}
              options={[
                { label: "AED", value: "AED" },
                { label: "USD", value: "USD" },
                { label: "EUR", value: "EUR" },
                { label: "INR", value: "INR" }
              ]}
            />
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60">Search</span>
              <input
                value={filters.query}
                onChange={(event) => updateTopFilter("query", event.target.value)}
                placeholder="Search Brand, Model, or Laptop Name"
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm font-medium text-white shadow-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>
            <PriceField
              label="Starting Price"
              value={filters.minPrice}
              currency={filters.currency}
              placeholder="Min"
              onChange={(value) => updateTopFilter("minPrice", value)}
            />
            <PriceField
              label="Ending Price"
              value={filters.maxPrice}
              currency={filters.currency}
              placeholder="Max"
              onChange={(value) => updateTopFilter("maxPrice", value)}
            />
            <SelectField
              label="RAM"
              value={filters.ram}
              onChange={(value) => updateTopFilter("ram", value)}
              options={[
                { label: "Any RAM", value: "" },
                { label: "4GB", value: "4GB" },
                { label: "8GB", value: "8GB" },
                { label: "16GB", value: "16GB" },
                { label: "32GB+", value: "32GB+" }
              ]}
            />
            <SelectField
              label="Storage"
              value={filters.storage}
              onChange={(value) => updateTopFilter("storage", value)}
              options={[
                { label: "Any Storage", value: "" },
                { label: "256GB", value: "256GB" },
                { label: "512GB", value: "512GB" },
                { label: "1TB", value: "1TB" },
                { label: "2TB+", value: "2TB+" }
              ]}
            />
            <SelectField
              label="Year"
              value={filters.year}
              onChange={(value) => updateTopFilter("year", value)}
              options={[
                { label: "Any Year", value: "" },
                { label: "2024", value: "2024" },
                { label: "2023", value: "2023" },
                { label: "2022", value: "2022" },
                { label: "Older", value: "Older" }
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setDraftFilters(filters);
                setDrawerOpen(true);
              }}
              className="h-11 self-end rounded-xl border border-cyan-200/25 bg-cyan-300 px-5 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.25)] transition hover:bg-cyan-200 lg:hidden"
            >
              More Filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 self-end rounded-xl border border-white/15 px-5 text-sm font-bold text-slate-200 transition hover:border-cyan-200/55 hover:text-white"
            >
              Reset
            </button>
          </div>
        </motion.section>
        )}

        <section className={previewLaptop ? "grid gap-6" : "grid gap-6 lg:grid-cols-[1fr_320px]"}>
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {previewLaptop ? (
                <LaptopPreview
                  key={previewLaptop.id}
                  laptop={previewLaptop}
                  currency={filters.currency}
                  onCurrencyChange={(value) => updateTopFilter("currency", value)}
                  predictionDate={predictionDate}
                  onBack={() => setPreviewLaptop(null)}
                />
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
            <div className="relative z-30 mb-5 rounded-2xl border border-cyan-100/15 bg-white/[0.05] p-4 shadow-[0_0_46px_rgba(14,165,233,0.08)] backdrop-blur-2xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-normal text-white">
                    {predictionDate
                      ? `Predicted prices for ${formatDateLabel(predictionDate)}`
                      : "Current prices"}{" "}
                    - {filteredLaptops.length} Models
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Average {predictionDate ? "predicted" : "current"} price {formatPrice(averageDisplayPrice, filters.currency)} based on matching configurations.
                  </p>
                </div>
                <div className="relative flex shrink-0 flex-col gap-3 sm:flex-row">
                  <select
                    value={sortParameter}
                    onChange={(event) => setSortParameter(event.target.value)}
                    className="h-11 rounded-xl border border-cyan-200/20 bg-slate-950/70 px-4 text-sm font-semibold text-white outline-none transition focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10"
                  >
                    {SORT_PARAMETERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value)}
                    disabled={!sortParameter}
                    className="h-11 rounded-xl border border-cyan-200/20 bg-slate-950/70 px-4 text-sm font-semibold text-white outline-none transition focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-45"
                  >
                    {SORT_DIRECTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {sortParameter === "value" && option.value === "desc"
                          ? "Best Value"
                          : sortParameter === "value" && option.value === "asc"
                            ? "Worst Value"
                            : option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPredictionPickerOpen((open) => !open)}
                    className={`h-11 rounded-xl border px-5 text-sm font-semibold transition ${
                      predictionDate
                        ? "border-purple-200 bg-purple-300 text-slate-950 shadow-[0_0_30px_rgba(168,85,247,0.45)]"
                        : "border-purple-200/40 bg-purple-300/10 text-purple-100 hover:border-purple-200 hover:bg-purple-300/20"
                    }`}
                  >
                    {predictionDate ? `Prediction On - ${formatDateLabel(predictionDate)}` : "Predict Price"}
                  </button>

                  <AnimatePresence>
                    {predictionPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 top-14 z-50 w-72 rounded-2xl border border-purple-200/25 bg-slate-950/95 p-4 shadow-[0_0_50px_rgba(168,85,247,0.2)] backdrop-blur-2xl"
                      >
                        <label>
                          <span className="mb-2 block text-sm font-semibold text-white">Predict price for</span>
                          <input
                            type="date"
                            min={minPredictionDate}
                            value={predictionDraftDate}
                            onChange={(event) => setPredictionDraftDate(event.target.value)}
                            className="lapis-date-input h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-purple-200/70 focus:ring-4 focus:ring-purple-300/10"
                          />
                        </label>
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          Select a future date after the current system date.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={clearPredictionMode}
                            className="h-10 rounded-xl border border-white/15 text-sm font-semibold text-slate-200 hover:border-purple-200/50"
                          >
                            Current
                          </button>
                          <button
                            type="button"
                            onClick={activatePrediction}
                            className="h-10 rounded-xl bg-purple-300 text-sm font-bold text-slate-950 hover:bg-purple-200"
                          >
                            Predict
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {QUICK_BRANDS.map((brand) => (
                  <PillButton key={brand} selected={filters.brands.includes(brand)} onClick={() => toggleQuickBrand(brand)}>
                    {brand}
                  </PillButton>
                ))}
              </div>
            </div>

            <motion.div layout className="relative z-0 space-y-4">
              <AnimatePresence>
                {visibleLaptops.map((laptop) => (
                  <LaptopCard
                    key={laptop.id}
                    laptop={laptop}
                    currency={filters.currency}
                    predictionDate={predictionDate}
                    onPreview={setPreviewLaptop}
                  />
                ))}
              </AnimatePresence>

              {hasMoreResults && (
                <div ref={loadMoreRef} className="flex min-h-20 items-center justify-center rounded-2xl border border-cyan-100/10 bg-white/[0.035]">
                  {loadingMore ? (
                    <div className="flex items-center gap-3 text-sm font-semibold text-cyan-100">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200/25 border-t-cyan-200" />
                      Loading more laptops...
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-slate-500">
                      Showing {visibleLaptops.length.toLocaleString()} of {sortedLaptops.length.toLocaleString()} models
                    </div>
                  )}
                </div>
              )}

              {filteredLaptops.length === 0 && (
                <div className="rounded-2xl border border-dashed border-cyan-200/25 bg-white/[0.045] p-10 text-center backdrop-blur-xl">
                  <h2 className="text-xl font-semibold text-white">No matching laptop signals found</h2>
                  <p className="mt-2 text-sm text-slate-400">Try widening the price range or clearing a few filters.</p>
                </div>
              )}
            </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={previewLaptop ? "hidden" : "hidden lg:block"}>
            <FilterPanel draft={draftFilters} setDraft={setDraftFilters} onClear={clearFilters} onApply={applyFilters} />
          </div>
        </section>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border border-cyan-100/15 bg-[#020617] p-4 shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <FilterPanel draft={draftFilters} setDraft={setDraftFilters} onClear={clearFilters} onApply={applyFilters} mobile />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
