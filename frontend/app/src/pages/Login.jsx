import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { FiArrowRight, FiCheckCircle, FiShield, FiZap, FiSettings, FiActivity, FiUser, FiBriefcase, FiUserCheck, FiAward, FiLock, FiPlay } from "react-icons/fi";
import Aurora from "../components/Aurora";
const ROLE_GUIDE = {
  employee: {
    color: "#6366f1",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.35)",
    steps: [
      { num: 1, text: "Go to Workflows and click ▶ Run on any workflow" },
      { num: 2, text: "Fill in the input form and click Start Execution" },
      { num: 3, text: "Track live progress in the Workflow Tracker" },
      { num: 4, text: "Check Notifications for status updates from approvers" },
    ],
    abilities: ["Submit new workflow requests", "Track your own submissions", "View notifications & history"],
    cannotDo: ["Approve requests", "Edit workflows", "See other users' requests"],
    chainPosition: 0,
  },
  department_head: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.35)",
    steps: [
      { num: 1, text: "Open Pending Approvals from the sidebar" },
      { num: 2, text: "You'll see requests from employees in your department only" },
      { num: 3, text: "Click Review & Act to open the approval screen" },
      { num: 4, text: "Add optional notes and click Approve or Reject" },
    ],
    abilities: ["Review your department's requests", "Approve or reject submissions", "Decision passes to Manager"],
    cannotDo: ["See other departments' requests", "See Manager or CEO steps", "Edit workflows"],
    chainPosition: 1,
  },
  manager: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.35)",
    steps: [
      { num: 1, text: "Open Pending Approvals from the sidebar" },
      { num: 2, text: "Requests appear here after Department Head approves" },
      { num: 3, text: "Click Review & Act to open the execution detail" },
      { num: 4, text: "Approve or Reject — final escalation goes to CEO" },
    ],
    abilities: ["Review escalated requests", "Approve or reject manager-stage items", "Approval escalates to CEO"],
    cannotDo: ["See dept head steps", "Submit workflows", "Edit workflows"],
    chainPosition: 2,
  },
  ceo: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.35)",
    steps: [
      { num: 1, text: "Open Pending Approvals from the sidebar" },
      { num: 2, text: "Requests appear here after Manager approves" },
      { num: 3, text: "Click Review & Act for the full request details" },
      { num: 4, text: "CEO Approval is final — workflow completes on Approve" },
    ],
    abilities: ["Final approval authority", "See fully-escalated requests only", "Workflow completes on your approval"],
    cannotDo: ["See earlier approval steps", "Submit workflows", "Edit workflows"],
    chainPosition: 3,
  },
  admin: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.35)",
    steps: [
      { num: 1, text: "Create a new Workflow from the Workflows list" },
      { num: 2, text: "Add steps: choose Approval, Task, or Notification type" },
      { num: 3, text: "Set assignee_role on approval steps (e.g. department_head)" },
      { num: 4, text: "Set the Start Step, add routing rules, then execute" },
    ],
    abilities: ["Create & edit all workflows", "Add/remove steps and rules", "View all executions and audit logs"],
    cannotDo: [],
    chainPosition: -1,
  },
};

const CHAIN_NODES = [
  { icon: <FiUser />, label: "Employee",  pos: 0 },
  { icon: <FiBriefcase />, label: "Dept Head", pos: 1 },
  { icon: <FiUserCheck />, label: "Manager",   pos: 2 },
  { icon: <FiAward />, label: "CEO",       pos: 3 },
];

function ApprovalChain({ highlightPosition }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 11, color: "var(--text-3)",
        marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600,
      }}>
        Approval Chain
      </div>
      <div className="approval-chain-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        {CHAIN_NODES.map((node, i) => {
          const isYou = node.pos === highlightPosition;
          const isPast = highlightPosition > -1 && node.pos < highlightPosition;
          return (
            <div key={node.pos} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 12px",
                background: isYou ? "var(--bg-hover)" : "transparent",
                border: `1px solid ${isYou ? "var(--border-focus)" : "var(--border)"}`,
                borderRadius: 8,
                transform: isYou ? "scale(1.08)" : "scale(1)",
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 18 }}>{node.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: isYou ? 700 : 400, whiteSpace: "nowrap",
                  color: isYou ? "var(--text-1)" : "var(--text-3)",
                }}>{node.label}</span>
                {isYou && (
                  <span style={{
                    fontSize: 9, background: "var(--accent)", color: "#fff",
                    padding: "1px 5px", borderRadius: 99, fontWeight: 700,
                  }}>YOU</span>
                )}
              </div>
              {i < CHAIN_NODES.length - 1 && (
                <div className="chain-connector" style={{
                  width: 24, height: 2, flexShrink: 0,
                  background: isPast ? "var(--accent)" : "var(--border)",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleGuideModal({ cat, onClose }) {
  const guide = ROLE_GUIDE[cat.role];
  if (!guide) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "var(--backdrop-blur)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          background: "var(--bg-modal)",
          border: `1px solid var(--border)`,
          borderRadius: "var(--r-xl)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{
          padding: "24px 28px",
          borderBottom: `1px solid var(--border)`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 40 }}>{cat.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>{cat.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
                How to use the system as {cat.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--text-2)", width: 32, height: 32, borderRadius: "50%",
              cursor: "pointer", fontSize: 18, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>

        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "70vh" }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "var(--text-3)",
              textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12,
            }}>Step-by-Step Guide</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {guide.steps.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 14px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: guide.bg, color: guide.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, border: `1px solid ${guide.border}`,
                    boxShadow: `0 0 10px ${guide.bg}`, flexShrink: 0,
                    transition: "transform 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    {s.num}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                    {s.text.includes("▶") ? <>{s.text.split("▶")[0]}<FiPlay style={{ color: "var(--accent)", margin: "0 2px", position: "relative", top: 2 }}/>{s.text.split("▶")[1]}</> : s.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="guide-stats-grid" style={{ display: "grid", gridTemplateColumns: guide.cannotDo.length ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 22 }}>
            <div style={{
              padding: 14, background: "var(--green-bg)",
              border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--r-md)",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "var(--green)",
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 6
              }}>
                <FiCheckCircle size={14} /> CAN DO
              </div>
              {guide.abilities.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6, lineHeight: 1.4 }}>• {a}</div>
              ))}
            </div>
            {guide.cannotDo.length > 0 && (
              <div style={{
                padding: 14, background: "var(--red-bg)",
                border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--r-md)",
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "var(--red)",
                  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 6
                }}>
                  <FiLock size={14} /> CANNOT DO
                </div>
                {guide.cannotDo.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6, lineHeight: 1.4 }}>• {c}</div>
                ))}
              </div>
            )}
          </div>

          {guide.chainPosition >= 0 && (
            <div style={{
              padding: 16, background: "var(--bg-input)",
              border: "1px solid var(--border)", borderRadius: "var(--r-md)",
              marginBottom: 16,
            }}>
              <ApprovalChain highlightPosition={guide.chainPosition} />
            </div>
          )}

          <div style={{
            padding: "11px 16px",
            background: "var(--bg-hover)", border: `1px solid var(--border)`,
            borderRadius: "var(--r-md)", fontSize: 13, color: "var(--text-2)",
            textAlign: "center",
          }}>
            👆 Close this and click <strong style={{ color: "var(--text-1)" }}>{cat.name}</strong> to log in
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleUsers, setRoleUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [guideOpen, setGuideOpen] = useState(null);

  const roleCategories = [
    { role: "employee",        name: "Employee",        icon: <FiUser />, desc: "Start workflows and track progress" },
    { role: "department_head", name: "Department Head", icon: <FiBriefcase />, desc: "Manage department approvals" },
    { role: "manager",         name: "Manager",         icon: <FiUserCheck />, desc: "Review escalated requests" },
    { role: "ceo",             name: "CEO",             icon: <FiAward />, desc: "Final executive approvals" },
    { role: "admin",           name: "Alice Admin",     icon: <FiShield />, desc: "Design workflows and manage system" },
  ];

  const handleRoleSelect = async (roleObj) => {
    setSelectedRole(roleObj);
    setFetchingUsers(true);
    setError("");
    try {
      const res = await api.get(`/auth/users/role/${roleObj.role}`);
      if (res.data && res.data.length > 0) {
        setRoleUsers(res.data);
      } else {
        setError(`No users found for role: ${roleObj.name}`);
        setSelectedRole(null);
      }
    } catch (err) {
      setError("Failed to fetch users for this role.");
      setSelectedRole(null);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleUserLogin = async (user) => {
    console.log(user);
    setLoading(true);
    setError("");
    const res = await login(user.id, user.email, "password123");
    if (res.success) {
      navigate("/");
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const scrollToLogin = () => {
    document.getElementById("login-section").scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      color: "var(--text-1)",
      fontFamily: "var(--font)",
      position: "relative",
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity: 0.4, pointerEvents: "none" }}>
        <Aurora colorStops={["#7cff67","#B19EEF","#5227FF"]} blend={0.5} amplitude={1.0} speed={1} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
      {/* Top Navbar */}
      <nav className="login-nav" style={{
        padding: "16px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FiZap size={24} color="var(--accent)" />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>FlowForge</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="login-hero" style={{ padding: "80px 20px 40px", textAlign: "center", maxWidth: 1200, margin: "0 auto" }}>
        <h1 className="hero-title" style={{
          fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 24,
        }}>
          Automate workflows with <br/>
          <span style={{ background: "var(--gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            enterprise precision
          </span>
        </h1>
        <p style={{ fontSize: 20, color: "var(--text-2)", margin: "0 auto 120px", maxWidth: 640 }}>
          Build, execute, and scale role-based approval processes seamlessly. The modern operating system for your business operations.
        </p>

        {error && (
          <div style={{
            background: "var(--red-bg)", color: "var(--red)",
            padding: "16px 24px", borderRadius: "var(--r-md)",
            marginBottom: 24, fontSize: 14,
            border: "1px solid rgba(239, 68, 68, 0.2)",
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto 24px"
          }}>{error}</div>
        )}

        {!selectedRole ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            textAlign: "left"
          }}>
            {roleCategories.map(cat => (
              <div
                key={cat.role}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--r-xl)",
                  overflow: "hidden",
                  transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  opacity: fetchingUsers ? 0.5 : 1,
                  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)"
                }}
                onMouseEnter={e => {
                  if (fetchingUsers) return;
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 12px 48px 0 rgba(0, 0, 0, 0.4)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 32px 0 rgba(0, 0, 0, 0.2)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                }}
              >
                <div
                  onClick={() => !fetchingUsers && handleRoleSelect(cat)}
                  style={{ padding: "32px 24px", cursor: "pointer" }}
                >
                  <div style={{ fontSize: 40, marginBottom: 16 }}>{cat.icon}</div>
                  <h3 style={{ color: "var(--text-1)", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{cat.name}</h3>
                  <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.5 }}>{cat.desc}</p>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 24px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  background: "rgba(0,0,0,0.2)"
                }}>
                  <button
                    onClick={e => { e.stopPropagation(); setGuideOpen(cat); }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-3)",
                      fontSize: 13, fontWeight: 500,
                      cursor: "pointer",
                      transition: "color 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
                  >
                    View Guide
                  </button>
                  <button
                    onClick={() => !fetchingUsers && handleRoleSelect(cat)}
                    disabled={fetchingUsers}
                    style={{
                      background: "var(--accent)", border: "none", color: "#fff",
                      padding: "8px 20px", borderRadius: "100px",
                      cursor: "pointer", fontSize: 13, fontWeight: 600,
                      opacity: fetchingUsers ? 0.5 : 1,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 16px var(--accent-glow)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  >
                    Select →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "left" }}>
            <button
              onClick={() => setSelectedRole(null)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                color: "var(--text-2)",
                padding: "8px 16px",
                borderRadius: "100px",
                marginBottom: 24,
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              ← Back to Roles
            </button>
            <h2 style={{ color: "var(--text-1)", marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Sign in as {selectedRole.name}</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}>
              {roleUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => !loading && handleUserLogin(user)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "var(--r-lg)",
                    padding: "24px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gradient)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16 }}>
                      {user.name.charAt(0)}
                    </div>
                    <FiArrowRight color="var(--text-3)" />
                  </div>
                  <h3 style={{ color: "var(--text-1)", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{user.name}</h3>
                  <p style={{ color: "var(--text-3)", fontSize: 13 }}>{user.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Trust Section */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "40px 20px", background: "var(--bg-elevated)", textAlign: "center" }}>
        <p style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-3)", marginBottom: 24, fontWeight: 600 }}>Trusted by hyper-growth teams</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 60, opacity: 0.6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 700, filter: "grayscale(1)" }}>Acme Corp</span>
          <span style={{ fontSize: 24, fontWeight: 700, filter: "grayscale(1)" }}>GlobalScale</span>
          <span style={{ fontSize: 24, fontWeight: 700, filter: "grayscale(1)" }}>Quantum</span>
          <span style={{ fontSize: 24, fontWeight: 700, filter: "grayscale(1)" }}>Nexus</span>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "80px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, letterSpacing: "-1px" }}>Everything you need to scale</h2>
          <p style={{ fontSize: 16, color: "var(--text-2)", maxWidth: 500, margin: "0 auto" }}>A complete toolkit for modeling the most complex organizational structures and processes.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { icon: <FiSettings />, title: "Visual Rule Engine", desc: "Build dynamic condition-based routing without writing a single line of code." },
            { icon: <FiShield />, title: "Role-Based Approvals", desc: "Granular access controls ensure requests automatically route to the right department head." },
            { icon: <FiActivity />, title: "Real-time Tracking", desc: "Monitor where every request currently sits in the pipeline instantly." }
          ].map((feature, idx) => (
            <div key={idx} style={{
              background: "var(--bg-card)", padding: "32px", borderRadius: "var(--r-xl)",
              border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", transition: "transform 0.2s"
            }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ width: 48, height: 48, background: "var(--bg-hover)", borderRadius: "var(--r-lg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 24, marginBottom: 20 }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{feature.title}</h3>
              <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.5 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section style={{ 
        padding: "120px 20px", 
        background: "transparent", 
        borderTop: "1px solid rgba(255, 255, 255, 0.05)", 
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)", 
        margin: "60px 0" 
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ 
            fontSize: 48, 
            fontWeight: 800, 
            marginBottom: 80, 
            textAlign: "center", 
            letterSpacing: "-1px", 
            color: "var(--text-1)"
          }}>
            How it works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32 }}>
            {[
              { step: "01", title: "Create Workflow", desc: "Design the logic seamlessly with our visual builder." },
              { step: "02", title: "Set Rules", desc: "Configure powerful condition-based routing rules." },
              { step: "03", title: "Wait Approval", desc: "Auto-routes requests to designated department heads." },
              { step: "04", title: "Execution", desc: "Completes safely and provides a full audit trail." }
            ].map((s, i) => (
              <div key={i} style={{ 
                padding: "40px 32px", 
                background: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--r-xl)",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
              }}>
                <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 16, letterSpacing: "1px", textTransform: "uppercase" }}>STEP {s.step}</span>
                <h4 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: "var(--text-1)" }}>{s.title}</h4>
                <p style={{ color: "var(--text-2)", fontSize: 16, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Preview removed as it has been moved to Hero Section */}
      
      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
        FlowForge Enterprise Automation © 2026. Designed for scale.
      </footer>

      {guideOpen && (
        <RoleGuideModal cat={guideOpen} onClose={() => setGuideOpen(null)} />
      )}
      </div>
    </div>
  );
}