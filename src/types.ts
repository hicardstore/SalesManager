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
  ownerEmail: string;
  members: ProjectMember[];
  memberEmails?: string[];
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
  { id: "30000", label: "1️⃣ مجموعة 30,000 ريال", packageAmount: 30000, totalInstallmentAmount: 48000, ratioLabel: "1.60x" },
  { id: "20000", label: "2️⃣ مجموعة 20,000 ريال", packageAmount: 20000, totalInstallmentAmount: 33800, ratioLabel: "1.69x" },
  { id: "15500", label: "3️⃣ مجموعة 15,500 ريال", packageAmount: 15500, totalInstallmentAmount: 26400, ratioLabel: "1.70x" },
  { id: "10500", label: "4️⃣ مجموعة 10,500 ريال", packageAmount: 10500, totalInstallmentAmount: 15500, ratioLabel: "1.48x" },
  { id: "9500",  label: "5️⃣ مجموعة 9,500 ريال",  packageAmount: 9500,  totalInstallmentAmount: 14885, ratioLabel: "1.57x" },
  { id: "7000",  label: "6️⃣ مجموعة 7,000 ريال",  packageAmount: 7000,  totalInstallmentAmount: 10000, ratioLabel: "1.43x" },
  { id: "5500",  label: "7️⃣ مجموعة 5,500 ريال",  packageAmount: 5500,  totalInstallmentAmount: 8786,  ratioLabel: "1.60x" },
  { id: "3750",  label: "8️⃣ مجموعة 3,750 ريال",  packageAmount: 3750,  totalInstallmentAmount: 5994,  ratioLabel: "1.60x" },
  { id: "3300",  label: "9️⃣ مجموعة 3,300 ريال",  packageAmount: 3300,  totalInstallmentAmount: 5209,  ratioLabel: "1.58x" },
  { id: "2000",  label: "🔟 مجموعة 2,000 ريال",  packageAmount: 2000,  totalInstallmentAmount: 3907,  ratioLabel: "1.95x" },
  { id: "1800",  label: "1️⃣1️⃣ مجموعة 1,800 ريال", packageAmount: 1800,  totalInstallmentAmount: 3695,  ratioLabel: "2.05x" },
  { id: "1500",  label: "1️⃣2️⃣ مجموعة 1,500 ريال", packageAmount: 1500,  totalInstallmentAmount: 2925,  ratioLabel: "1.95x" },
  { id: "1100",  label: "1️⃣3️⃣ مجموعة 1,100 ريال", packageAmount: 1100,  totalInstallmentAmount: 2230,  ratioLabel: "2.03x" },
  { id: "900",   label: "1️⃣4️⃣ مجموعة 900 ريال",   packageAmount: 900,   totalInstallmentAmount: 1770,  ratioLabel: "1.97x" },
  { id: "700",   label: "1️⃣5️⃣ مجموعة 700 ريال",   packageAmount: 700,   totalInstallmentAmount: 1328,  ratioLabel: "1.90x" },
  { id: "350",   label: "1️⃣6️⃣ مجموعة 350 ريال",   packageAmount: 350,   totalInstallmentAmount: 700,   ratioLabel: "2.00x" },
  { id: "200",   label: "1️⃣7️⃣ مجموعة 200 ريال",   packageAmount: 200,   totalInstallmentAmount: 450,   ratioLabel: "2.25x" },
];
