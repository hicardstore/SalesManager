const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// We will add a state to store scroll positions for each tab, and a useEffect to restore them.
const scrollLogic = `  const [activeTab, setActiveTab] = useState<"dashboard" | "create" | "profits" | "settings">("dashboard");
  const [dashboardSubTab, setDashboardSubTab] = useState<"overview" | "timeline">("overview");

  // Scroll preservation logic
  const scrollPositions = useRef<Record<string, number>>({});
  
  const handleTabChange = (newTab: "dashboard" | "create" | "profits" | "settings") => {
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTab(newTab);
    setTimeout(() => {
      window.scrollTo({ top: scrollPositions.current[newTab] || 0, behavior: 'instant' });
    }, 0);
  };
`;

code = code.replace(/const \[activeTab, setActiveTab\] = useState<"dashboard" \| "create" \| "profits" \| "settings">\("dashboard"\);\n\s*const \[dashboardSubTab, setDashboardSubTab\] = useState<"overview" \| "timeline">\("overview"\);/, scrollLogic);

code = code.replace(/setActiveTab\(/g, "handleTabChange(");
// wait, handleTabChange itself calls setActiveTab, so replacing all of them will create an infinite loop/syntax error inside handleTabChange.
// Better let's just do it carefully.
