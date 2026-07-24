const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const \[activeTab, setActiveTab\] = useState<"dashboard" \| "create" \| "profits" \| "settings">\("dashboard"\);\n\s*const \[dashboardSubTab, setDashboardSubTab\] = useState<"overview" \| "timeline">\("overview"\);/;

const replacement = `const [activeTab, setActiveTabState] = useState<"dashboard" | "create" | "profits" | "settings">("dashboard");
  const [dashboardSubTab, setDashboardSubTab] = useState<"overview" | "timeline">("overview");

  const scrollPositions = useRef<Record<string, number>>({});
  
  const setActiveTab = (newTab: "dashboard" | "create" | "profits" | "settings") => {
    if (newTab === activeTab) return;
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTabState(newTab);
    setTimeout(() => {
      window.scrollTo({ top: scrollPositions.current[newTab] || 0, behavior: 'instant' });
    }, 10);
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
