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
 * Centrally calculates the gateway provider fee (6.99%) with high precision.
 */
export function getOperationFee(op: { packageAmount: number; provider: string }): number {
  const normalizedProvider = (op.provider || "").trim();
  if (["إمكان", "تمارا", "تابي"].includes(normalizedProvider)) {
    // Round to 4 decimal places internally to maintain float precision
    return Number((op.packageAmount * 0.0699).toFixed(4));
  }
  return 0;
}

/**
 * Centrally calculates the net profit.
 * Net Merchant Profit = Total Installment Amount - Package Cost (Cash price) - Provider Fee - Commission Fee.
 * Since the down payment is paid by the client, it does not reduce the merchant's net profit.
 */
export function getOperationProfitWithDownPayment(op: {
  totalInstallmentAmount: number;
  packageAmount: number;
  provider: string;
  commissionFee?: number;
}): number {
  const grossProfit = (op.totalInstallmentAmount || 0) - op.packageAmount;
  const fee = getOperationFee(op);
  const commission = op.commissionFee || 0;
  return Number((grossProfit - fee - commission).toFixed(4));
}

/**
 * Centrally calculates the net profit after down payment.
 * Under standard business rules, since down payment is paid by the customer, the merchant's net profit
 * is NOT reduced by the down payment. Thus, it is identical to getOperationProfitWithDownPayment.
 */
export function getOperationProfitAfterDownPayment(op: {
  totalInstallmentAmount: number;
  packageAmount: number;
  provider: string;
  commissionFee?: number;
  downPayment?: number;
}): number {
  return getOperationProfitWithDownPayment(op);
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
}): CalculatedOperationBreakdown {
  const packageAmount = Math.max(0, params.packageAmount || 0);
  const totalInstallmentAmount = Math.max(0, params.totalInstallmentAmount || 0);
  const downPayment = Math.max(0, params.downPayment || 0);
  const commissionFee = Math.max(0, params.commissionFee || 0);
  const durationMonths = params.durationMonths && params.durationMonths > 0 ? params.durationMonths : 12;

  const providerFee = getOperationFee({ packageAmount, provider: params.provider });
  const netTransferToClient = Math.max(0, Number((packageAmount - downPayment).toFixed(4)));
  const monthlyInstallment = Number((netTransferToClient / durationMonths).toFixed(2));
  const grossProfit = Number((totalInstallmentAmount - packageAmount).toFixed(4));
  const profitWithDownPayment = getOperationProfitWithDownPayment({
    totalInstallmentAmount,
    packageAmount,
    provider: params.provider,
    commissionFee,
  });

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
