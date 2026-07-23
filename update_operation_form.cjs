const fs = require('fs');
let code = fs.readFileSync('src/components/OperationForm.tsx', 'utf-8');

code = code.replace(
  /onClick=\{\(\) => \{\s*setProvider\(prov\);\s*const total = parseFloat\(customTotalInstallmentAmount\);\s*const margin = activeProject\?\.profitMarginPercent !== undefined \? activeProject\.profitMarginPercent : 30;\s*if \(selectedGroupId === "custom" && !isNaN\(total\)\) \{\s*const fee = getOperationFee\(\{ totalInstallmentAmount: total, provider: prov \}, activeProject\);\s*const amountAfterFees = Math\.max\(0, total - fee\);\s*const calculatedPackage = amountAfterFees \* \(1 - margin \/ 100\);\s*setCustomPackageAmount\(Number\(calculatedPackage\.toFixed\(2\)\)\.toString\(\)\);\s*\}\s*\}\}/,
  `onClick={() => {
                    setProvider(prov);
                    const total = parseFloat(customTotalInstallmentAmount);
                    if (selectedGroupId === "custom" && !isNaN(total)) {
                      if (activeProject?.enableProfitMargin === true) {
                        const margin = activeProject.profitMarginPercent !== undefined ? activeProject.profitMarginPercent : 30;
                        const fee = getOperationFee({ totalInstallmentAmount: total, provider: prov }, activeProject);
                        const amountAfterFees = Math.max(0, total - fee);
                        const calculatedPackage = amountAfterFees * (1 - margin / 100);
                        setCustomPackageAmount(Number(calculatedPackage.toFixed(2)).toString());
                      }
                    }
                  }}`
);

code = code.replace(
  /onChange=\{\(e\) => \{\s*const valStr = e\.target\.value;\s*setCustomTotalInstallmentAmount\(valStr\);\s*const total = parseFloat\(valStr\);\s*const margin = activeProject\?\.profitMarginPercent !== undefined \? activeProject\.profitMarginPercent : 30;\s*if \(!isNaN\(total\)\) \{\s*const fee = getOperationFee\(\{ totalInstallmentAmount: total, provider \}, activeProject\);\s*const amountAfterFees = Math\.max\(0, total - fee\);\s*const calculatedPackage = amountAfterFees \* \(1 - margin \/ 100\);\s*setCustomPackageAmount\(Number\(calculatedPackage\.toFixed\(2\)\)\.toString\(\)\);\s*\} else \{\s*setCustomPackageAmount\(""\);\s*\}\s*\}\}/,
  `onChange={(e) => {
                        const valStr = e.target.value;
                        setCustomTotalInstallmentAmount(valStr);
                        const total = parseFloat(valStr);
                        if (!isNaN(total)) {
                          if (activeProject?.enableProfitMargin === true) {
                            const margin = activeProject.profitMarginPercent !== undefined ? activeProject.profitMarginPercent : 30;
                            const fee = getOperationFee({ totalInstallmentAmount: total, provider }, activeProject);
                            const amountAfterFees = Math.max(0, total - fee);
                            const calculatedPackage = amountAfterFees * (1 - margin / 100);
                            setCustomPackageAmount(Number(calculatedPackage.toFixed(2)).toString());
                          }
                        } else {
                          if (activeProject?.enableProfitMargin === true) {
                            setCustomPackageAmount("");
                          }
                        }
                      }}`
);

code = code.replace(
  /<div className="flex items-center justify-between border-b border-neutral-200 pb-2">\s*<div className="flex items-center gap-2">\s*<Sliders className="w-4 h-4 text-neutral-600" \/>\s*<h4 className="text-xs font-black text-neutral-900">تخصيص مبالغ المجموعة التجارية<\/h4>\s*<\/div>\s*<div className="text-\[10px\] bg-emerald-50 text-emerald-700 px-2\.5 py-1 rounded-lg font-black flex items-center gap-1 border border-emerald-100">\s*<Percent className="w-3 h-3" \/>\s*<span>هامش الربح المعتمد: \{activeProject\?\.profitMarginPercent !== undefined \? activeProject\.profitMarginPercent : 30\}%<\/span>\s*<\/div>\s*<\/div>/,
  `<div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-neutral-600" />
                  <h4 className="text-xs font-black text-neutral-900">تخصيص مبالغ المجموعة التجارية</h4>
                </div>
                {activeProject?.enableProfitMargin === true && (
                  <div className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-black flex items-center gap-1 border border-emerald-100">
                    <Percent className="w-3 h-3" />
                    <span>هامش الربح المعتمد: {activeProject.profitMarginPercent !== undefined ? activeProject.profitMarginPercent : 30}%</span>
                  </div>
                )}
              </div>`
);

code = code.replace(
  /<div className="flex items-center justify-between">\s*<label className="text-\[10px\] text-neutral-500 font-black block">صافي التمويل للعميل \(سعر الكاش\)<\/label>\s*<span className="text-\[9px\] text-emerald-600 font-bold bg-emerald-50 px-1\.5 py-0\.5 rounded-sm">خصم تلقائي<\/span>\s*<\/div>/,
  `<div className="flex items-center justify-between">
                    <label className="text-[10px] text-neutral-500 font-black block">صافي التمويل للعميل (سعر الكاش)</label>
                    {activeProject?.enableProfitMargin === true && (
                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm">خصم تلقائي</span>
                    )}
                  </div>`
);


fs.writeFileSync('src/components/OperationForm.tsx', code);
