const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /\{activeTab === "create" && \(\s*<OperationForm/g,
  `<div className={activeTab === "create" ? "block" : "hidden"}>\n            <OperationForm`
);
code = code.replace(
  /onCancelEdit=\{\(\) => \{\s*setEditingOperation\(null\);\s*setActiveTab\("dashboard"\);\s*\}\}\s*\/>\s*\)/g,
  `onCancelEdit={() => {
                setEditingOperation(null);
                setActiveTab("dashboard");
              }}
            />
          </div>`
);

code = code.replace(
  /\{activeTab === "dashboard" && \(\s*<div className="space-y-6">/g,
  `<div className={activeTab === "dashboard" ? "block" : "hidden"}>\n            <div className="space-y-6">`
);
code = code.replace(
  /activeProject=\{activeProject\}\s*\/>\s*\)\}\s*<\/div>\s*\)/g,
  `activeProject={activeProject}
                />
              )}
            </div>
          </div>`
);

code = code.replace(
  /\{activeTab === "profits" && \(\s*<ProfitsDashboard/g,
  `<div className={activeTab === "profits" ? "block" : "hidden"}>\n            <ProfitsDashboard`
);
code = code.replace(
  /activeProject=\{activeProject\}\s*\/>\s*\)/g,
  `activeProject={activeProject}
            />
          </div>`
);

code = code.replace(
  /\{activeTab === "settings" && \(\s*<Settings/g,
  `<div className={activeTab === "settings" ? "block" : "hidden"}>\n            <Settings`
);
code = code.replace(
  /onDeleteDevice=\{handleDeleteDevice\}\s*\/>\s*\)/g,
  `onDeleteDevice={handleDeleteDevice}
            />
          </div>`
);

fs.writeFileSync('src/App.tsx', code);
