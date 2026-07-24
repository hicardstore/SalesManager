const fs = require('fs');
let code = fs.readFileSync('src/components/ProfitsDashboard.tsx', 'utf-8');

// Replace grid columns
code = code.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">/,
  '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">'
);

// We want to insert the new card AFTER "Card 2: Total Package Capital".
const card2End = `            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>إجمالي قيمة المبيعات المسجلة</span>
            </div>
          </div>
        </div>`;

const newCard = `        {/* Card 2.5: Total Package Capital After Merchant Fees */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_25px_rgba(0,0,0,0.01)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold text-neutral-500">رأس المال (بعد الخصم)</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 relative">
            <div className="text-2xl font-black text-neutral-900 flex items-baseline gap-1">
              <span>{(stats.salesTotal - stats.providerFeesTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-bold text-neutral-400">ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>رأس المال بعد خصم رسوم التاجر</span>
            </div>
          </div>
        </div>`;

code = code.replace(card2End, card2End + '\n\n' + newCard);

fs.writeFileSync('src/components/ProfitsDashboard.tsx', code);
