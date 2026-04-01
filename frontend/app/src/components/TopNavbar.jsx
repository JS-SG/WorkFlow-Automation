import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiBell, FiUser, FiMoon, FiSun, FiMenu, FiGrid } from 'react-icons/fi';

export default function TopNavbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="top-navbar-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      background: 'var(--nav-bg)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      gap: '24px',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button onClick={onMenuClick} className="mobile-menu-btn" style={{ 
            background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-1)', 
            display: 'none', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '12px', transition: 'all 0.2s', cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
        }}>
          <FiGrid size={20} />
        </button>
        <div className="search-wrapper" style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: '100px',
          padding: '10px 18px',
          width: '340px',
          transition: 'all 0.2s',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
        }}>
          <FiSearch style={{ color: 'var(--text-3)', marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Search workflows, approvals..." 
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-1)',
              outline: 'none',
              width: '100%',
              fontSize: '13px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={toggleTheme} className="btn-icon" style={{ 
          background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', borderRadius: '50%', transition: 'all 0.2s', cursor: 'pointer'
        }}>
          {theme === 'light' ? <FiMoon size={16} /> : <FiSun size={16} />}
        </button>
        
        <button className="btn-icon" style={{ 
          background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', borderRadius: '50%', transition: 'all 0.2s', cursor: 'pointer'
        }}>
          <FiBell size={16} />
        </button>

        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'var(--gradient)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 'bold'
        }}>
          {user?.name?.[0] || "?"}
        </div>
      </div>
    </div>
  );
}
