const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceDashboard.tsx', 'utf-8');

const regex = /\{op\.enableCommissionFee !== false && \(\s*<div className="space-y-1 col-span-2 border-t border-neutral-100 pt-2 flex justify-between items-center px-1">\s*<p className="text-\[10px\] text-neutral-400 font-bold">رسوم العمولة<\/p>\s*<p className="font-black text-\[#dc2626\] text-sm">\s*\{\(op\.commissionFee \|\| 0\)\.toLocaleString\("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }\)\} ر\.س\s*<\/p>\s*<\/div>\s*\)\}\s*\{op\.packageAmount\.toLocaleString\("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }\)\} ر\.س\s*<\/p>\s*<\/div>\s*<div className="space-y-1">\s*<p className="text-\[10px\] text-neutral-400 font-bold text-center">الدفعة المخصومة من صافي تمويل العميل<\/p>\s*<p className="font-black text-neutral-900 text-base">\s*\{op\.downPayment\.toLocaleString\("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }\)\} ر\.س\s*<\/p>\s*<\/div>\s*<div className="space-y-1">\s*<p className="text-\[10px\] text-neutral-400 font-bold text-center">\s*\{op\.deductDownPaymentFromFunding !== false \? "الصافي للعميل بعد خصم الدفعة الأولى" : "الصافي المحول للعميل \(رأس المال\)"\}\s*<\/p>\s*<p className="font-black text-\[#e88024\] text-base">\s*\{\(op\.deductDownPaymentFromFunding !== false \? Math\.max\(0, op\.packageAmount - op\.downPayment\) : op\.packageAmount\)\.toLocaleString\("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }\)\} ر\.س\s*<\/p>\s*<\/div>\s*<div className="space-y-1 col-span-2 border-t border-neutral-100 pt-2 flex justify-between items-center px-1">\s*<p className="text-\[10px\] text-neutral-400 font-bold">رسوم مزود الخدمة<\/p>\s*<p className="font-black text-\[#dc2626\] text-sm">\s*\{getOperationFee\(op\)\.toLocaleString\("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }\)\} ر\.س\s*<\/p>\s*<\/div>\s*<div className="space-y-1 col-span-2 border-t border-neutral-100 pt-2 flex justify-between items-center px-1">\s*<p className="text-\[10px\] text-neutral-400 font-bold">رسوم العمولة<\/p>\s*<p className="font-black text-\[#dc2626\] text-sm">\s*\{\(op\.commissionFee \|\| 0\)\.toLocaleString\("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }\)\} ر\.س\s*<\/p>\s*<\/div>/;

const replacement = `{op.enableCommissionFee !== false && (
                        <div className="space-y-1 col-span-2 border-t border-neutral-100 pt-2 flex justify-between items-center px-1">
                          <p className="text-[10px] text-neutral-400 font-bold">رسوم العمولة</p>
                          <p className="font-black text-[#dc2626] text-sm">
                            {(op.commissionFee || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                          </p>
                        </div>
                      )}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/FinanceDashboard.tsx', code);
