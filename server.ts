import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client on server if key exists
let aiClient: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
} catch (e) {
  console.error("Failed to initialize Gemini client:", e);
}

// Data Store Path
const DATA_FILE = path.join(process.cwd(), "db_store.json");

// Default initial data
const defaultDb = {
  clients: [
    { id: "CL-8821", name: "أحمد محمد العتيبي", date: "2023-10-15", activeOperationsCount: 2 },
    { id: "CL-9042", name: "سارة خالد الشمري", date: "2023-10-10", activeOperationsCount: 1 },
    { id: "CL-7731", name: "فيصل بن عبد العزيز", date: "2023-09-25", activeOperationsCount: 3 },
    { id: "CL-4412", name: "نورة الصالح", date: "2023-10-05", activeOperationsCount: 1 },
    { id: "CL-3321", name: "عبد الله المنصور", date: "2023-10-18", activeOperationsCount: 1 }
  ],
  operations: [
    {
      id: "C-8921",
      clientId: "CL-8821",
      clientName: "أحمد محمد العتيبي",
      date: "2023-10-24",
      status: "مكتمل",
      packageAmount: 5700,
      totalInstallmentAmount: 8230,
      downPayment: 1000,
      remainingAmount: 7230,
      provider: "تابي",
      monthlyInstallment: 602.50,
      durationMonths: 12
    },
    {
      id: "C-8922",
      clientId: "CL-9042",
      clientName: "سارة خالد الشمري",
      date: "2023-10-23",
      status: "مكتمل",
      packageAmount: 3000,
      totalInstallmentAmount: 4500,
      downPayment: 1000,
      remainingAmount: 3500,
      provider: "تمارا",
      monthlyInstallment: 291.60,
      durationMonths: 12
    },
    {
      id: "C-8923",
      clientId: "CL-7731",
      clientName: "فيصل بن عبد العزيز",
      date: "2023-10-22",
      status: "قيد المراجعة",
      packageAmount: 5700,
      totalInstallmentAmount: 8230,
      downPayment: 1500,
      remainingAmount: 6730,
      provider: "تابي",
      monthlyInstallment: 560.80,
      durationMonths: 12
    },
    {
      id: "C-8924",
      clientId: "CL-4412",
      clientName: "نورة الصالح",
      date: "2023-10-21",
      status: "مكتمل",
      packageAmount: 5700,
      totalInstallmentAmount: 8230,
      downPayment: 1200,
      remainingAmount: 7030,
      provider: "تابي",
      monthlyInstallment: 585.83,
      durationMonths: 12
    }
  ]
};

// Utility to read data
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultDb, null, 2), "utf-8");
      return defaultDb;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading db file, falling back default data:", e);
    return defaultDb;
  }
}

// Utility to save data
function writeData(data: typeof defaultDb) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving to db file:", e);
  }
}

// API Routes

// GET /api/operations
app.get("/api/operations", (req, res) => {
  const db = readData();
  res.json(db.operations);
});

// POST /api/operations - Add new transaction
app.post("/api/operations", (req, res) => {
  const db = readData();
  const { clientId, clientName, packageAmount, downPayment, provider, status, totalInstallmentAmount: bodyTotalInstallmentAmount, monthlyInstallment: bodyMonthlyInstallment } = req.body;

  if (!clientId || !clientName || !packageAmount) {
    return res.status(400).json({ error: "الرجاء تعبئة الحقول المطلوبة" });
  }

  // Calculate installment details based on package amount or accept explicit client selection
  const ratio = packageAmount >= 5700 ? 1.4439 : 1.5;
  const totalInstallmentAmount = bodyTotalInstallmentAmount ? parseFloat(bodyTotalInstallmentAmount) : Math.round(packageAmount * ratio);
  const remainingAmount = Math.max(0, totalInstallmentAmount - parseFloat(downPayment || 0));
  const durationMonths = 12;
  const monthlyInstallment = bodyMonthlyInstallment ? parseFloat(bodyMonthlyInstallment) : parseFloat((remainingAmount / durationMonths).toFixed(2));

  const newOp = {
    id: `C-${Math.floor(1000 + Math.random() * 9000)}`,
    clientId,
    clientName,
    date: new Date().toISOString().split("T")[0],
    status: status || "مكتمل",
    packageAmount: parseFloat(packageAmount),
    totalInstallmentAmount,
    downPayment: parseFloat(downPayment || 0),
    remainingAmount,
    provider: provider || "تابي",
    monthlyInstallment,
    durationMonths
  };

  db.operations.unshift(newOp);

  // Check if client already exists, otherwise add them
  const existingClientIdx = db.clients.findIndex(c => c.id === clientId);
  if (existingClientIdx !== -1) {
    db.clients[existingClientIdx].activeOperationsCount += 1;
  } else {
    db.clients.push({
      id: clientId,
      name: clientName,
      date: new Date().toISOString().split("T")[0],
      activeOperationsCount: 1
    });
  }

  writeData(db);
  res.status(201).json(newOp);
});

// GET /api/clients
app.get("/api/clients", (req, res) => {
  const db = readData();
  res.json(db.clients);
});

// POST /api/clients - Add new client
app.post("/api/clients", (req, res) => {
  const db = readData();
  const { id, name } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: "يرجى توفير رقم المعرف والاسم بالكامل" });
  }

  const existingClient = db.clients.find(c => c.id === id);
  if (existingClient) {
    return res.status(400).json({ error: "اسم العميل أو المعرّف مسجل مسبقاً" });
  }

  const newClient = {
    id,
    name,
    date: new Date().toISOString().split("T")[0],
    activeOperationsCount: 0
  };

  db.clients.push(newClient);
  writeData(db);
  res.status(201).json(newClient);
});

// POST /api/analyze - Call Gemini to perform smart business simulation/audit
app.post("/api/analyze", async (req, res) => {
  const db = readData();
  const { additionalQuery } = req.body;

  // Compile prompt based on database operations
  const operationsSummary = db.operations.map(op => (
    `- عملية رقم ${op.id}: العميل ${op.clientName} (هوية: ${op.clientId})، مزود الخدمة: ${op.provider}، قيمة الكاش الأصلية: ${op.packageAmount} ر.س، قيمة التقسيط الكلية: ${op.totalInstallmentAmount} ر.س، المدفوع كدفعة أولى: ${op.downPayment} ر.س، المتبقي تقسيطه: ${op.remainingAmount} ر.س، القسط الشهري: ${op.monthlyInstallment} ر.س (حالة: ${op.status})`
  )).join("\n");

  const clientsSummary = db.clients.map(c => `- العميل ${c.name} (${c.id}) لديه ${c.activeOperationsCount} معاملات نشطة`).join("\n");

  const prompt = `أنت الخبير المالي والمستشار الذكي لمنصة إدارة المبيعات والتمويل "SalesManager".
إليك سجل العمليات الحالية والعملاء المسجلين في النظام:

أولاً: سجل العمليات المفتوحة:
${operationsSummary}

ثانياً: قائمة العملاء وحالاتهم:
${clientsSummary}

يرجى تقديم تقرير تحليلي باللغة العربية بأسلوب مالي واحترافي رفيع وشيق، يحتوي على التفاصيل التالية:
1. مراجعة شاملة للأداء المالي، وحساب الأرباح المحققة التقديرية (الفرق بين قيمة التقسيط الإجمالية وقدرها وقيمة سعر الكاش) والسيولة الحالية المتاحة من الدفعات الأولى.
2. تحليل لمزودي خدمة التقسيط (تابي، تمارا) والشركة الأكثر استخداماً والمثالية للاستمرارية بناء على السجل.
3. تقدير دقيق لمستويات المخاطر للعملاء المحتملين والعمليات التي تحتاج مراجعة أو مراقبة (وتحليل للعملاء ذوي الحالات قيد المراجعة وعملاء بمديونيات مرتفعة).
4. نصائح مالية تكتيكية وتوصيات مستقبلية لرفع السقف الربحي وتسهيل آليات سداد الدفعات وتقليل نسبة المخاطرة.

${additionalQuery ? `بناءً على طلب المستخدم الخاص: "${additionalQuery}"، يرجى تضمين الإجابة المباشرة والمركزة على هذا السؤال في سياق التحليل المالي.` : ""}

قم بصياغة التقرير بتنسيق Markdown رائع ومقروء بوضوح في الواجهة، مع لمسات بصرية أنيقة، واستخدم الرموز التعبيرية المناسبة لتمثيل المفاهيم المالية.`;

  if (!aiClient) {
    // Elegant fallback simulation if API key is not ready yet
    const fallbackResponse = `### 📊 تقرير التحليل المالي الذكي (نسخة محاكاة)

> ⚠️ تحذير: لم يتم تكوين مفتاح \`GEMINI_API_KEY\` بشكل كامل، لذلك يتم تقديم هذا التقرير كمحاكاة ذكية للبيانات الحالية.

#### 1. لمحة عامة عن الأداء والسيولة
*   **إجمالي حجم المبيعات الإجمالي:** 29,190 ر.س.
*   **إجمالي السيولة المبدئية المحصلة (الدفعات الأولى):** 4,700 ر.س (تمثل نسبة 16% من إجمالي العمليات، وهي مؤشر ممتاز على توفر سيولة مباشرة).
*   **الأرباح الإجمالية المقدرة:** 9,230 ر.س (الفرق الفعلي بين سعر الكاش وخدمات التقسيط).

#### 2. تقدير المخاطر للعملاء والعمليات
*   🔴 **العمليات قيد المراجعة:** العملية رقم **C-8923** لصالح العميل **فيصل بن عبد العزيز** عبر مزود الخدمة **تابي**. يوصى بعدم تفعيل الفواتير حتى الحصول على كشف الحساب المتكامل.
*   🟢 **العملاء المستقرون:** العميل **أحمد محمد العتيبي** والعميلة **نورة الصالح** يظهرون ملاءة نموذجية مع دفعات تابي المنتظمة.

#### 3. تحليل مزودي الخدمة وتفضيلات العملاء
*   🥇 **تابي (Tabby):** صاحب الحصة الكبرى من العمليات بنسبة 50%. يعكس ثقة العملاء العالية في آليات التحصيل الخاصة بها.
*   🥈 **تمارا (Tamara):** الشريك المثالي للعمليات ذات الحجم المتوسط والشرائح الأساسية.

#### 4. توصيات لزيادة الربحية وتحسين آليات الدفع
*   💡 **ميزة الخصم التشجيعي:** ننصح بتقديم خصم 5% على الدفعة الأولى للعملاء الذين يختارون دفعات ربع سنوية كاش بالكامل قبل تاريخ التقسيط لضمان سرعة دوران رأس المال.`;

    return res.json({ analysis: fallbackResponse, isSimulation: true });
  }

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    res.json({ analysis: response.text, isSimulation: false });
  } catch (err: any) {
    console.error("Error generating Gemini analysis:", err);
    res.status(500).json({ error: "فشل الاتصال بمحرك الذكاء الاصطناعي لتوليد التقارير المباشرة" });
  }
});

// Serve frontend assets
if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fallback logic
    app.get("*", (req, res, next) => {
      // Ignore API routes
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(process.cwd(), "index.html"));
    });
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
