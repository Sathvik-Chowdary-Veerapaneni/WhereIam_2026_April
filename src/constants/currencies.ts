/**
 * Currency definitions with symbols, codes, and country flags
 * Top 50+ most common world currencies
 */

export interface Currency {
    code: string;        // ISO 4217 currency code (e.g., USD, EUR)
    symbol: string;      // Currency symbol (e.g., $, €)
    name: string;        // Full name for search (e.g., US Dollar)
    flag: string;        // Country flag emoji
    locale: string;      // Locale for formatting (e.g., en-US)
}

export const CURRENCIES: Currency[] = [
    // Major Global Currencies
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', locale: 'en-US' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'de-DE' },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', locale: 'en-GB' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', locale: 'ja-JP' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', locale: 'zh-CN' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', locale: 'en-IN' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', locale: 'en-AU' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', locale: 'en-CA' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭', locale: 'de-CH' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰', locale: 'zh-HK' },

    // Asia Pacific
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', locale: 'en-SG' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', locale: 'ko-KR' },
    { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', flag: '🇹🇼', locale: 'zh-TW' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', locale: 'th-TH' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', locale: 'ms-MY' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', locale: 'id-ID' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', locale: 'en-PH' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', locale: 'vi-VN' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', locale: 'en-PK' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', locale: 'bn-BD' },
    { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', flag: '🇱🇰', locale: 'si-LK' },
    { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee', flag: '🇳🇵', locale: 'ne-NP' },
    { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', flag: '🇲🇲', locale: 'my-MM' },
    { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', flag: '🇰🇭', locale: 'km-KH' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿', locale: 'en-NZ' },

    // Europe
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', locale: 'sv-SE' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', locale: 'nb-NO' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', locale: 'da-DK' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', locale: 'pl-PL' },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿', locale: 'cs-CZ' },
    { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺', locale: 'hu-HU' },
    { code: 'RON', symbol: 'lei', name: 'Romanian Leu', flag: '🇷🇴', locale: 'ro-RO' },
    { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', flag: '🇧🇬', locale: 'bg-BG' },
    { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', flag: '🇭🇷', locale: 'hr-HR' },
    { code: 'RSD', symbol: 'дин', name: 'Serbian Dinar', flag: '🇷🇸', locale: 'sr-RS' },
    { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', flag: '🇺🇦', locale: 'uk-UA' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', locale: 'ru-RU' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', locale: 'tr-TR' },
    { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', flag: '🇮🇸', locale: 'is-IS' },

    // Americas
    { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽', locale: 'es-MX' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', locale: 'pt-BR' },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso', flag: '🇦🇷', locale: 'es-AR' },
    { code: 'COP', symbol: '$', name: 'Colombian Peso', flag: '🇨🇴', locale: 'es-CO' },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso', flag: '🇨🇱', locale: 'es-CL' },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', flag: '🇵🇪', locale: 'es-PE' },
    { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', flag: '🇺🇾', locale: 'es-UY' },
    { code: 'VES', symbol: 'Bs', name: 'Venezuelan Bolivar', flag: '🇻🇪', locale: 'es-VE' },
    { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', flag: '🇩🇴', locale: 'es-DO' },
    { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', flag: '🇬🇹', locale: 'es-GT' },
    { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon', flag: '🇨🇷', locale: 'es-CR' },
    { code: 'PAB', symbol: 'B/', name: 'Panamanian Balboa', flag: '🇵🇦', locale: 'es-PA' },

    // Middle East
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', locale: 'ar-AE' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦', locale: 'ar-SA' },
    { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', flag: '🇶🇦', locale: 'ar-QA' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', flag: '🇰🇼', locale: 'ar-KW' },
    { code: 'BHD', symbol: 'ب.د', name: 'Bahraini Dinar', flag: '🇧🇭', locale: 'ar-BH' },
    { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial', flag: '🇴🇲', locale: 'ar-OM' },
    { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar', flag: '🇯🇴', locale: 'ar-JO' },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', flag: '🇮🇱', locale: 'he-IL' },
    { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬', locale: 'ar-EG' },
    { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', flag: '🇱🇧', locale: 'ar-LB' },

    // Africa
    { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', locale: 'en-ZA' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', locale: 'en-NG' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪', locale: 'en-KE' },
    { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', flag: '🇬🇭', locale: 'en-GH' },
    { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿', locale: 'sw-TZ' },
    { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', flag: '🇺🇬', locale: 'en-UG' },
    { code: 'MAD', symbol: 'د.م', name: 'Moroccan Dirham', flag: '🇲🇦', locale: 'ar-MA' },
    { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', flag: '🇪🇹', locale: 'am-ET' },
];

// Default currency
export const DEFAULT_CURRENCY: Currency = CURRENCIES[0]; // USD

// Get currency by code
export const getCurrencyByCode = (code: string): Currency => {
    return CURRENCIES.find(c => c.code === code) || DEFAULT_CURRENCY;
};

// Search currencies by code, name, or symbol
export const searchCurrencies = (query: string): Currency[] => {
    if (!query.trim()) return CURRENCIES;

    const lowerQuery = query.toLowerCase().trim();
    return CURRENCIES.filter(currency =>
        currency.code.toLowerCase().includes(lowerQuery) ||
        currency.name.toLowerCase().includes(lowerQuery) ||
        currency.symbol.toLowerCase().includes(lowerQuery)
    );
};

// Format amount with specific currency
export const formatCurrencyAmount = (amount: number, currencyCode: string): string => {
    const currency = getCurrencyByCode(currencyCode);
    try {
        return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency.symbol}${amount.toFixed(2)}`;
    }
};
