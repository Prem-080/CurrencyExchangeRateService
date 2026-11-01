// Popular & Top 15 currencies with symbols and metadata
export const CURRENCY_METADATA = {
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
  KRW: { name: 'South Korean Won', symbol: '₩' },
  SEK: { name: 'Swedish Krona', symbol: 'kr' },
  MXN: { name: 'Mexican Peso', symbol: 'Mex$' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
  AED: { name: 'UAE Dirham', symbol: 'AED' },
  BRL: { name: 'Brazilian Real', symbol: 'R$' },
  ZAR: { name: 'South African Rand', symbol: 'R' },
};

export const BASE_OPTIONS = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'SGD'];

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://currencyexchangerateservice.onrender.com';

