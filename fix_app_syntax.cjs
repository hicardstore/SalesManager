const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /<MonthlyTimeline\s+operations=\{operations\}\s+activeProject=\{activeProject\}\s*\/>\s*<\/div>\s*<\/div>\s*<\/div>/,
  `<MonthlyTimeline 
                  operations={operations}
                  activeProject={activeProject}
                />
              )}
            </div>
          </div>`
);

fs.writeFileSync('src/App.tsx', code);
