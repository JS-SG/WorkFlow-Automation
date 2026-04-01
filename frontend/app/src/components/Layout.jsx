import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import Aurora from "./Aurora";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

export default function Layout({ children }) {
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout" style={{ position: 'relative', zIndex: 0 }}>
      {/* Background Aurora - ONLY visible in dark theme */}
      {theme === 'dark' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, opacity: 0.15, pointerEvents: 'none' }}>
          <Aurora colorStops={["#7cff67","#B19EEF","#5227FF"]} blend={0.5} amplitude={1.0} speed={0.5} />
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content" style={{ padding: 0, position: 'relative', background: 'transparent', width: '100%', minWidth: 0 }}>
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="main-padding" style={{ padding: '32px' }}>
          {children}
        </div>
      </main>
      
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'mobile-open' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  );
}
