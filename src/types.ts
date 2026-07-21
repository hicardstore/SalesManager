export interface Client {
  id: string;
  name: string;
  date: string;
  activeOperationsCount: number;
}

export interface ProjectMember {
  email: string;
  name: string;
  role: "مالك" | "محرر" | "عارض";
  status: "نشط" | "معلق";
}

export interface ProjectWorkspace {
  id: string;
  name: string;
  ownerId?: string;
  ownerEmail: string;
  members: ProjectMember[];
  memberEmails?: string[];
  customRates?: Record<string, number>;
  customFlatFees?: Record<string, number>;
  taxRate?: number;
  profitMarginPercent?: number;
  numberSystem?: string;
  currencySymbol?: string;
  calendarSystem?: string;
}

export type OperationStatus = "مكتمل" | "قيد المراجعة";
export type InstallmentProvider = "إمكان" | "تابي" | "تمارا";

export interface Operation {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: OperationStatus;
  packageAmount: number; // Cash price
  totalInstallmentAmount: number; // Total installment
  downPayment: number;
  remainingAmount: number;
  provider: InstallmentProvider;
  monthlyInstallment: number;
  durationMonths: number;
  commissionFee?: number; // Commission fee recorded with the operation
  advancePaidBy?: "كلنا" | "نواف" | "عبدالله";
  downPaymentPaidBy?: "العميل" | "كلنا" | "نواف" | "عبدالله";
  transferFeePaidBy?: "كلنا" | "نواف" | "عبدالله";
  deductDownPaymentFromFunding?: boolean;
  enableCommissionFee?: boolean;
}

export interface FinancialStats {
  totalSales: number;
  totalProfits: number;
  netProfit: number;
  downPayments: number;
}

export interface AIRecommendation {
  summary: string;
  riskScore: "منخفض" | "متوسط" | "مرتفع";
  tips: string[];
}

export interface PredefinedGroup {
  id: string;
  label: string;
  packageAmount: number;
  totalInstallmentAmount: number;
  ratioLabel: string;
}

export const PREDEFINED_GROUPS: PredefinedGroup[] = [
  { id: "7000",  label: "مجموعة 7,000 ريال",  packageAmount: 7000,  totalInstallmentAmount: 10000, ratioLabel: "1.43x" },
  { id: "5700",  label: "مجموعة 5,700 ريال",  packageAmount: 5700,  totalInstallmentAmount: 8230,  ratioLabel: "1.44x" },
  { id: "3750",  label: "مجموعة 3,750 ريال",  packageAmount: 3750,  totalInstallmentAmount: 5230,  ratioLabel: "1.39x" },
  { id: "3500",  label: "مجموعة 3,500 ريال",  packageAmount: 3500,  totalInstallmentAmount: 5000,  ratioLabel: "1.43x" },
  { id: "2100",  label: "مجموعة 2,100 ريال",  packageAmount: 2100,  totalInstallmentAmount: 3270,  ratioLabel: "1.56x" },
  { id: "1800",  label: "مجموعة 1,800 ريال",  packageAmount: 1800,  totalInstallmentAmount: 2943,  ratioLabel: "1.64x" },
  { id: "1500",  label: "مجموعة 1,500 ريال",  packageAmount: 1500,  totalInstallmentAmount: 2398,  ratioLabel: "1.60x" },
  { id: "1100",  label: "مجموعة 1,100 ريال",  packageAmount: 1100,  totalInstallmentAmount: 1962,  ratioLabel: "1.78x" },
  { id: "850",   label: "مجموعة 850 ريال",   packageAmount: 850,   totalInstallmentAmount: 1635,  ratioLabel: "1.92x" },
  { id: "590",   label: "مجموعة 590 ريال",   packageAmount: 590,   totalInstallmentAmount: 1090,  ratioLabel: "1.85x" },
  { id: "320",   label: "مجموعة 320 ريال",   packageAmount: 320,   totalInstallmentAmount: 763,   ratioLabel: "2.38x" },
  { id: "200",   label: "مجموعة 200 ريال",   packageAmount: 200,   totalInstallmentAmount: 450,   ratioLabel: "2.25x" },
  { id: "150",   label: "مجموعة 150 ريال",   packageAmount: 150,   totalInstallmentAmount: 327,   ratioLabel: "2.18x" },
];
