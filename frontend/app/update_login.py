import re

with open('e:/halleyx/WorkFlow-Automation-main/frontend/app/src/pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Icons and Aurora imports
content = content.replace(
    'import { FiArrowRight, FiCheckCircle, FiShield, FiZap, FiSettings, FiActivity } from "react-icons/fi";',
    'import { FiArrowRight, FiCheckCircle, FiShield, FiZap, FiSettings, FiActivity, FiUser, FiBriefcase, FiUserCheck, FiAward } from "react-icons/fi";\nimport Aurora from "../components/Aurora";'
)

# 2. Update roleCategories icons
content = content.replace(
    '{ role: "employee",        name: "Employee",        icon: "👤", desc: "Start workflows and track progress" },',
    '{ role: "employee",        name: "Employee",        icon: <FiUser />, desc: "Start workflows and track progress" },'
)
content = content.replace(
    '{ role: "department_head", name: "Department Head", icon: "🏢", desc: "Manage department approvals" },',
    '{ role: "department_head", name: "Department Head", icon: <FiBriefcase />, desc: "Manage department approvals" },'
)
content = content.replace(
    '{ role: "manager",         name: "Manager",         icon: "👔", desc: "Review escalated requests" },',
    '{ role: "manager",         name: "Manager",         icon: <FiUserCheck />, desc: "Review escalated requests" },'
)
content = content.replace(
    '{ role: "ceo",             name: "CEO",             icon: "👑", desc: "Final executive approvals" },',
    '{ role: "ceo",             name: "CEO",             icon: <FiAward />, desc: "Final executive approvals" },'
)
content = content.replace(
    '{ role: "admin",           name: "Alice Admin",     icon: "🛡️", desc: "Design workflows and manage system" },',
    '{ role: "admin",           name: "Alice Admin",     icon: <FiShield />, desc: "Design workflows and manage system" },'
)

# 3. Add background wrapper to root return
content = content.replace(
    '''  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-1)",
      fontFamily: "var(--font)",
    }}>''',
    '''  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-1)",
      fontFamily: "var(--font)",
      position: "relative"
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity: 0.3, pointerEvents: "none" }}>
        <Aurora colorStops={["#7cff67","#B19EEF","#5227FF"]} blend={0.5} amplitude={1.0} speed={1} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>'''
)

content = content.replace(
    '''      {guideOpen && (
        <RoleGuideModal cat={guideOpen} onClose={() => setGuideOpen(null)} />
      )}
    </div>
  );
}''',
    '''      {guideOpen && (
        <RoleGuideModal cat={guideOpen} onClose={() => setGuideOpen(null)} />
      )}
      </div>
    </div>
  );
}'''
)

# 4. Remove Log In button
content = content.replace(
    '''        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={scrollToLogin} style={{
            background: "var(--gradient)", color: "#fff", border: "none",
            padding: "8px 16px", borderRadius: "var(--r-md)", fontWeight: 500, fontSize: 14, cursor: "pointer"
          }}>
            Log In
          </button>
        </div>''',
    '''        <div style={{ display: "flex", gap: 16 }}>
        </div>'''
)

# 5. We need to extract the exact Product Preview / Roles Section HTML.
m_roles = re.search(r'(<section id="login-section"[^>]*>.*?</section>)', content, re.DOTALL)
if m_roles:
    roles_section = m_roles.group(1)
    content = content.replace(roles_section, '')
    roles_section = re.sub(r'<div style={{ textAlign: "center", marginBottom: 40 }}>.*?</div>', '', roles_section, flags=re.DOTALL)
    
    hero_buttons = '''        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button onClick={scrollToLogin} style={{
            background: "var(--text-1)", color: "var(--bg-base)", border: "none",
            padding: "14px 28px", borderRadius: "100px", fontWeight: 600, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8
          }}>
            Get Started <FiArrowRight />
          </button>
          <button style={{
            background: "var(--bg-input)", color: "var(--text-1)", border: "1px solid var(--border)",
            padding: "14px 28px", borderRadius: "100px", fontWeight: 600, fontSize: 16, cursor: "pointer",
          }}>
            View Demo
          </button>
        </div>'''
        
    content = content.replace(hero_buttons, roles_section)


# 6. Update How It Works Section to be glassy animated large
how_it_works_old = '''      {/* How it Works Section */}
      <section style={{ padding: "80px 20px", background: "var(--bg-elevated)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 40, textAlign: "center", letterSpacing: "-1px" }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            {[
              { step: "01", title: "Create Workflow", desc: "Design the steps" },
              { step: "02", title: "Set Rules", desc: "Configure logic" },
              { step: "03", title: "Wait Approval", desc: "Auto-routes to heads" },
              { step: "04", title: "Execution", desc: "Completes safely" }
            ].map((s, i) => (
              <div key={i} style={{ padding: 24, borderLeft: "2px solid var(--accent-glow)" }}>
                <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 8 }}>STEP {s.step}</span>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{s.title}</h4>
                <p style={{ color: "var(--text-2)", fontSize: 14 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>'''

how_it_works_new = '''      {/* How it Works Section */}
      <section style={{ padding: "120px 20px", background: "rgba(255, 255, 255, 0.02)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", margin: "40px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: 56, fontWeight: 800, marginBottom: 60, textAlign: "center", letterSpacing: "-2px", background: "var(--gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "pulse 3s infinite alternate" }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
            {[
              { step: "01", title: "Create Workflow", desc: "Design the steps seamlessly." },
              { step: "02", title: "Set Rules", desc: "Configure powerful execution logic." },
              { step: "03", title: "Wait Approval", desc: "Auto-routes to designated heads." },
              { step: "04", title: "Execution", desc: "Completes safely and provides tracking." }
            ].map((s, i) => (
              <div key={i} className="glass-card" style={{ 
                padding: "40px 32px", 
                background: "rgba(255, 255, 255, 0.01)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--r-xl)",
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
                transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.5)";
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px 0 rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.01)";
              }}>
                <span style={{ color: "var(--accent)", fontSize: 16, fontWeight: 800, display: "block", marginBottom: 16, letterSpacing: "2px", textShadow: "0 0 10px var(--accent-glow)" }}>STEP {s.step}</span>
                <h4 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#fff" }}>{s.title}</h4>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>'''

content = content.replace(how_it_works_old, how_it_works_new)

content = content.replace('      <section style={{ padding: "80px 20px", textAlign: "center", maxWidth: 900, margin: "0 auto" }}>', '      <section style={{ padding: "80px 20px", textAlign: "center", maxWidth: 1200, margin: "0 auto" }}>')

content = content.replace(
    '''const CHAIN_NODES = [
  { icon: "👤", label: "Employee",  pos: 0 },
  { icon: "🏢", label: "Dept Head", pos: 1 },
  { icon: "👔", label: "Manager",   pos: 2 },
  { icon: "👑", label: "CEO",       pos: 3 },
];''',
    '''const CHAIN_NODES = [
  { icon: <FiUser />, label: "Employee",  pos: 0 },
  { icon: <FiBriefcase />, label: "Dept Head", pos: 1 },
  { icon: <FiUserCheck />, label: "Manager",   pos: 2 },
  { icon: <FiAward />, label: "CEO",       pos: 3 },
];'''
)

with open('e:/halleyx/WorkFlow-Automation-main/frontend/app/src/pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
