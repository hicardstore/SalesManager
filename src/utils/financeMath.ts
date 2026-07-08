import { Operation } from "../types";

export interface CalculatedOperationBreakdown {
  packageAmount: number;
  totalInstallmentAmount: number;
  downPayment: number;
  commissionFee: number;
  providerFee: number;
  netTransferToClient: number;
  monthlyInstallment: number;
  grossProfit: number;
  profitWithDownPayment: number;
  profitAfterDownPayment: number;
}

/**
 * Centrally calculates the gateway provider fee (6.99% or custom rate) with high precision.
 */
export function getOperationFee(
  op: { packageAmount: number; provider: string },
  customRates?: { [key: string]: number }
): number {
  const normalizedProvider = (op.provider || "").trim();
  if (["إمكان", "تمارا", "تابي"].includes(normalizedProvider)) {
    const rate = customRates && customRates[normalizedProvider] !== undefined
      ? customRates[normalizedProvider] / 100
      : 0.0699;
    return Number((op.packageAmount * rate).toFixed(4));
  }
  return 0;
}

/**
 * Centrally calculates the net profit.
 * Net Merchant Profit = Total Installment Amount - Package Cost (Cash price) - Provider Fee - Commission Fee.
 * Since the down payment is paid by the client, it does not reduce the merchant's net profit.
 */
export function getOperationProfitWithDownPayment(
  op: {
    totalInstallmentAmount: number;
    packageAmount: number;
    provider: string;
    commissionFee?: number;
  },
  customRates?: { [key: string]: number }
): number {
  const grossProfit = (op.totalInstallmentAmount || 0) - op.packageAmount;
  const fee = getOperationFee(op, customRates);
  const commission = op.commissionFee || 0;
  return Number((grossProfit - fee - commission).toFixed(4));
}

/**
 * Centrally calculates the net profit after down payment.
 * Under standard business rules, since down payment is paid by the customer, the merchant's net profit
 * is NOT reduced by the down payment. Thus, it is identical to getOperationProfitWithDownPayment.
 */
export function getOperationProfitAfterDownPayment(
  op: {
    totalInstallmentAmount: number;
    packageAmount: number;
    provider: string;
    commissionFee?: number;
    downPayment?: number;
  },
  customRates?: { [key: string]: number }
): number {
  return getOperationProfitWithDownPayment(op, customRates);
}

/**
 * Centrally calculates all financial figures for an operation breakdown.
 */
export function calculateOperationBreakdown(params: {
  packageAmount: number;
  totalInstallmentAmount: number;
  downPayment?: number;
  commissionFee?: number;
  provider: string;
  durationMonths?: number;
  customRates?: { [key: string]: number };
}): CalculatedOperationBreakdown {
  const packageAmount = Math.max(0, params.packageAmount || 0);
  const totalInstallmentAmount = Math.max(0, params.totalInstallmentAmount || 0);
  const downPayment = Math.max(0, params.downPayment || 0);
  const commissionFee = Math.max(0, params.commissionFee || 0);
  const durationMonths = params.durationMonths && params.durationMonths > 0 ? params.durationMonths : 12;

  const providerFee = getOperationFee({ packageAmount, provider: params.provider }, params.customRates);
  const netTransferToClient = Math.max(0, Number((packageAmount - downPayment).toFixed(4)));
  const monthlyInstallment = Number((netTransferToClient / durationMonths).toFixed(2));
  const grossProfit = Number((totalInstallmentAmount - packageAmount).toFixed(4));
  const profitWithDownPayment = getOperationProfitWithDownPayment({
    totalInstallmentAmount,
    packageAmount,
    provider: params.provider,
    commissionFee,
  }, params.customRates);

  return {
    packageAmount,
    totalInstallmentAmount,
    downPayment,
    commissionFee,
    providerFee: Number(providerFee.toFixed(2)),
    netTransferToClient,
    monthlyInstallment,
    grossProfit,
    profitWithDownPayment: Number(profitWithDownPayment.toFixed(2)),
    profitAfterDownPayment: Number(profitWithDownPayment.toFixed(2)),
  };
}

/**
 * Centrally formats money values based on the active project's currency and number system preferences.
 */
export function formatMoney(val: number, activeProject?: any): string {
  const currency = activeProject?.currencySymbol || "ر.س";
  
  // Format with thousands separator
  const formattedEn = Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return `${formattedEn} ${currency}`;
}

/**
 * Centrally formats date values based on the active project's preferred calendar system (Gregorian vs Hijri).
 * Always uses Western/English numerals as requested by the user.
 */
export function formatDate(
  dateVal: any,
  activeProject?: any,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "";

  const calendarSystem = activeProject?.calendarSystem || "gregorian"; // "gregorian" or "hijri"
  
  // Use Arabic locale with Western/English numerals (latn) as requested ("الأرقام الانجليزية فقط")
  const locale = calendarSystem === "hijri" 
    ? "ar-SA-u-ca-islamic-umalqura-nu-latn" 
    : "ar-SA-u-ca-gregory-nu-latn";

  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  };

  try {
    return date.toLocaleString(locale, defaultOptions);
  } catch (err) {
    console.error("Failed to format date with custom locale, falling back:", err);
    return date.toLocaleString("en-US", defaultOptions);
  }
}
