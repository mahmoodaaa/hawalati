// ============================================================
// PROVIDERS DATA — Demo Only (Fictional list for presentation)
// ============================================================

export const EXCHANGE_PROVIDERS = [
  {
    id: "alawneh_exchange",
    name: "Al-Alawneh Exchange",
    nameEn: "Al-Alawneh Exchange",
    nameAr: "صرافة العلاونة",
    type: "local",
    logo: "🏦",
    referenceLabel: "Reference No.",
    referencePlaceholder: "ALW-XXXX-XXX",
    country: "Jordan",
  },
  {
    id: "zamzam_exchange",
    name: "Zamzam Exchange",
    nameEn: "Zamzam Exchange",
    nameAr: "صرافة زمزم",
    type: "local",
    logo: "💎",
    referenceLabel: "Reference No.",
    referencePlaceholder: "ZAM-XXXX-XXX",
    country: "Jordan",
  },
  {
    id: "sarie_exchange",
    name: "Sarie Exchange",
    nameEn: "Sarie Exchange",
    nameAr: "صرافة صاري",
    type: "local",
    logo: "🏛️",
    referenceLabel: "Reference No.",
    referencePlaceholder: "SARF-XXXX-XXX",
    country: "Jordan",
  },
  {
    id: "noor_exchange",
    name: "Noor Exchange",
    nameEn: "Noor Exchange",
    nameAr: "صرافة نور",
    type: "local",
    logo: "💰",
    referenceLabel: "Reference No.",
    referencePlaceholder: "NOOR-XXXX",
    country: "Jordan",
  },
  {
    id: "ahli_exchange",
    name: "Ahli Exchange",
    nameEn: "Ahli Exchange",
    nameAr: "صرافة الأهلي",
    type: "local",
    logo: "🔷",
    referenceLabel: "Reference No.",
    referencePlaceholder: "AHLI-XXXX",
    country: "Jordan",
  },
  {
    id: "western_union",
    name: "Western Union",
    nameEn: "Western Union",
    nameAr: "ويسترن يونيون",
    type: "international",
    logo: "🌐",
    referenceLabel: "MTCN Number",
    referencePlaceholder: "XXXXXXXXXX (10 digits)",
    country: "International",
  },
  {
    id: "moneygram",
    name: "MoneyGram",
    nameEn: "MoneyGram",
    nameAr: "موني جرام",
    type: "international",
    logo: "💸",
    referenceLabel: "Reference No.",
    referencePlaceholder: "XXXXXXXXXX",
    country: "International",
  },
  {
    id: "ria",
    name: "Ria Money Transfer",
    nameEn: "Ria Money Transfer",
    nameAr: "ريا للتحويل",
    type: "international",
    logo: "✈️",
    referenceLabel: "Reference No.",
    referencePlaceholder: "RIA-XXXXXXXX",
    country: "International",
  },
];


export const LOCAL_PROVIDERS = EXCHANGE_PROVIDERS.filter((p) => p.type === "local");
export const INTERNATIONAL_PROVIDERS = EXCHANGE_PROVIDERS.filter((p) => p.type === "international");

export const BANKS = [
  { id: "arab_bank", name: "البنك العربي", nameEn: "Arab Bank" },
  { id: "cairo_amman", name: "بنك القاهرة عمان", nameEn: "Cairo Amman Bank" },
  { id: "jordan_ahli", name: "البنك الأهلي الأردني", nameEn: "Jordan Ahli Bank" },
  { id: "housing_urban", name: "بنك الإسكان والتعمير", nameEn: "Housing Bank" },
  { id: "jordan_islamic", name: "البنك الإسلامي الأردني", nameEn: "Jordan Islamic Bank" },
  { id: "etihad", name: "البنك الأردني الكويتي", nameEn: "Jordan Kuwait Bank" },
  { id: "invest", name: "بنك الاستثمار العربي", nameEn: "Arab Investment Bank" },
];

export const WALLETS = [
  { id: "zain_cash", name: "زين كاش", nameEn: "Zain Cash", icon: "📱" },
  { id: "orange_money", name: "أورنج موني", nameEn: "Orange Money", icon: "🟠" },
  { id: "umniah_joy", name: "أمنية جوي", nameEn: "Umniah Joy", icon: "💜" },
  { id: "cliq", name: "كليك - CliQ", nameEn: "CliQ", icon: "⚡" },
];

export const JORDANIAN_CITIES = [
  "عمّان",
  "إربد",
  "الزرقاء",
  "العقبة",
  "المفرق",
  "جرش",
  "مادبا",
  "الكرك",
  "الطفيلة",
  "معان",
  "عجلون",
  "السلط",
];
