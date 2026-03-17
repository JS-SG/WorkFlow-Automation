import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const ROLE_GUIDE = {
  employee: {
    color: "#6366f1",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.35)",
    steps: [
      { icon: "1️⃣", text: "Go to Workflows and click ▶ Run on any workflow" },
      { icon: "2️⃣", text: "Fill in the input form and click Start Execution" },
      { icon: "3️⃣", text: "Track live progress in the Workflow Tracker" },
      { icon: "4️⃣", text: "Check Notifications for status updates from approvers" },
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
      { icon: "1️⃣", text: "Open Pending Approvals from the sidebar" },
      { icon: "2️⃣", text: "You'll see requests from employees in your department only" },
      { icon: "3️⃣", text: "Click Review & Act to open the approval screen" },
      { icon: "4️⃣", text: "Add optional notes and click Approve or Reject" },
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
      { icon: "1️⃣", text: "Open Pending Approvals from the sidebar" },
      { icon: "2️⃣", text: "Requests appear here after Department Head approves" },
      { icon: "3️⃣", text: "Click Review & Act to open the execution detail" },
      { icon: "4️⃣", text: "Approve or Reject — final escalation goes to CEO" },
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
      { icon: "1️⃣", text: "Open Pending Approvals from the sidebar" },
      { icon: "2️⃣", text: "Requests appear here after Manager approves" },
      { icon: "3️⃣", text: "Click Review & Act for the full request details" },
      { icon: "4️⃣", text: "CEO Approval is final — workflow completes on Approve" },
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
      { icon: "1️⃣", text: "Create a new Workflow from the Workflows list" },
      { icon: "2️⃣", text: "Add steps: choose Approval, Task, or Notification type" },
      { icon: "3️⃣", text: "Set assignee_role on approval steps (e.g. department_head)" },
      { icon: "4️⃣", text: "Set the Start Step, add routing rules, then execute" },
    ],
    abilities: ["Create & edit all workflows", "Add/remove steps and rules", "View all executions and audit logs"],
    cannotDo: [],
    chainPosition: -1,
  },
};

const CHAIN_NODES = [
  { icon: "👤", label: "Employee",  pos: 0 },
  { icon: "🏢", label: "Dept Head", pos: 1 },
  { icon: "👔", label: "Manager",   pos: 2 },
  { icon: "👑", label: "CEO",       pos: 3 },
];

function ApprovalChain({ highlightPosition }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 11, color: "rgba(255,255,255,0.35)",
        marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600,
      }}>
        Approval Chain
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {CHAIN_NODES.map((node, i) => {
          const isYou = node.pos === highlightPosition;
          const isPast = highlightPosition > -1 && node.pos < highlightPosition;
          return (
            <div key={node.pos} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 12px",
                background: isYou ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isYou ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.09)"}`,
                borderRadius: 8,
                transform: isYou ? "scale(1.08)" : "scale(1)",
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 18 }}>{node.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: isYou ? 700 : 400, whiteSpace: "nowrap",
                  color: isYou ? "#fff" : "rgba(255,255,255,0.4)",
                }}>{node.label}</span>
                {isYou && (
                  <span style={{
                    fontSize: 9, background: "rgba(255,255,255,0.18)", color: "#fff",
                    padding: "1px 5px", borderRadius: 99, fontWeight: 700,
                  }}>YOU</span>
                )}
              </div>
              {i < CHAIN_NODES.length - 1 && (
                <div style={{
                  width: 24, height: 2, flexShrink: 0,
                  background: isPast ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)",
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
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          background: "#13131f",
          border: `1px solid ${guide.border}`,
          borderRadius: "var(--r-xl)",
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{
          padding: "24px 28px",
          background: guide.bg,
          borderBottom: `1px solid ${guide.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 40 }}>{cat.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{cat.name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                How to use the system as {cat.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)", width: 32, height: 32, borderRadius: "50%",
              cursor: "pointer", fontSize: 18, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>

        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "70vh" }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12,
            }}>Step-by-Step Guide</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {guide.steps.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "var(--r-md)",
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: guide.cannotDo.length ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 22 }}>
            <div style={{
              padding: 14, background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--r-md)",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "rgba(34,197,94,0.8)",
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10,
              }}>✅ Can Do</div>
              {guide.abilities.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6, lineHeight: 1.4 }}>• {a}</div>
              ))}
            </div>
            {guide.cannotDo.length > 0 && (
              <div style={{
                padding: 14, background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--r-md)",
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "rgba(239,68,68,0.8)",
                  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10,
                }}>🔒 Cannot Do</div>
                {guide.cannotDo.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6, lineHeight: 1.4 }}>• {c}</div>
                ))}
              </div>
            )}
          </div>

          {guide.chainPosition >= 0 && (
            <div style={{
              padding: 16, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: "var(--r-md)",
              marginBottom: 16,
            }}>
              <ApprovalChain highlightPosition={guide.chainPosition} />
            </div>
          )}

          <div style={{
            padding: "11px 16px",
            background: guide.bg, border: `1px solid ${guide.border}`,
            borderRadius: "var(--r-md)", fontSize: 13, color: "rgba(255,255,255,0.6)",
            textAlign: "center",
          }}>
            👆 Close this and click <strong style={{ color: "#fff" }}>{cat.name}</strong> to log in
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
    { role: "employee",        name: "Employee",        icon: "👤", desc: "Start workflows and track progress" },
    { role: "department_head", name: "Department Head", icon: "🏢", desc: "Manage department approvals" },
    { role: "manager",         name: "Manager",         icon: "👔", desc: "Review escalated requests" },
    { role: "ceo",             name: "CEO",             icon: "👑", desc: "Final executive approvals" },
    { role: "admin",           name: "Alice Admin",     icon: "🛡️", desc: "Design workflows and manage system" },
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

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0f0f1a 100%)",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 900, textAlign: "center" }}>

        {/* ── Title ── */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 48, fontWeight: 800, color: "#fff",
            marginBottom: 12, letterSpacing: "-1px",
          }}>Workflow Agent Enterprise</h1>
          <p style={{ color: "var(--text-3)", fontSize: 18 }}>
            Select a profile to experience role-based automation
          </p>
        </div>
        {!selectedRole && (
          <div style={{
            marginBottom: 36,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--r-xl)",
            padding: "20px 28px",
            textAlign: "left",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16,
            }}>
              🔄 How the approval chain works
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
              {[
                { icon: "👤", label: "Employee",  sub: "Submits" },
                { icon: "🏢", label: "Dept Head", sub: "1st approval" },
                { icon: "👔", label: "Manager",   sub: "2nd approval" },
                { icon: "👑", label: "CEO",        sub: "Final approval" },
                { icon: "✅", label: "Complete",   sub: "Done" },
              ].map((node, i, arr) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%",
                      background: i === arr.length - 1 ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${i === arr.length - 1 ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.1)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>{node.icon}</div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600, whiteSpace: "nowrap" }}>{node.label}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>{node.sub}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ display: "flex", alignItems: "center", padding: "0 4px", marginTop: -18 }}>
                      <div style={{ width: 18, height: 1, background: "rgba(255,255,255,0.12)" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>▶</span>
                      <div style={{ width: 18, height: 1, background: "rgba(255,255,255,0.12)" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.28)", lineHeight: 1.6 }}>
              💡 <strong style={{ color: "rgba(255,255,255,0.45)" }}>Dynamic skipping:</strong> If a Manager starts a workflow, Dept Head approval is skipped automatically. If CEO starts it, it auto-completes.
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: "var(--red-bg)", color: "var(--red)",
            padding: "12px 20px", borderRadius: "var(--r-md)",
            marginBottom: 24, fontSize: 14,
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}>{error}</div>
        )}

        {!selectedRole ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}>
            {roleCategories.map(cat => (
              <div
                key={cat.role}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "var(--r-xl)",
                  overflow: "hidden",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  backdropFilter: "blur(10px)",
                  opacity: fetchingUsers ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (fetchingUsers) return;
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.4)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  onClick={() => !fetchingUsers && handleRoleSelect(cat)}
                  style={{ padding: "40px 30px 20px", cursor: "pointer" }}
                >
                  <div style={{ fontSize: 48, marginBottom: 20 }}>{cat.icon}</div>
                  <h3 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 10 }}>{cat.name}</h3>
                  <p style={{ color: "var(--text-3)", fontSize: 14, lineHeight: 1.6 }}>{cat.desc}</p>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <button
                    onClick={e => { e.stopPropagation(); setGuideOpen(cat); }}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-3)",
                      padding: "5px 12px", borderRadius: "var(--r-md)",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    ℹ️ How it works
                  </button>
                  <button
                    onClick={() => !fetchingUsers && handleRoleSelect(cat)}
                    disabled={fetchingUsers}
                    style={{
                      background: "var(--accent)", border: "none", color: "#fff",
                      padding: "5px 16px", borderRadius: "var(--r-md)",
                      cursor: "pointer", fontSize: 12, fontWeight: 700,
                      opacity: fetchingUsers ? 0.5 : 1,
                    }}
                  >
                    Login →
                  </button>
                </div>
              </div>
            ))}
          </div>

        ) : (
          <div>
            <button
              onClick={() => setSelectedRole(null)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                padding: "8px 16px",
                borderRadius: "var(--r-md)",
                marginBottom: 20,
                cursor: "pointer",
              }}
            >
              ← Back to Roles
            </button>
            <h2 style={{ color: "#fff", marginBottom: 20 }}>Select {selectedRole.name}</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 24,
            }}>
              {roleUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => !loading && handleUserLogin(user)}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "var(--r-xl)",
                    padding: "30px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{user.name}</h3>
                  <p style={{ color: "var(--text-3)", fontSize: 14 }}>{user.email}</p>
                  {user.department_id && (
                    <p style={{ color: "var(--accent)", fontSize: 12, marginTop: 10 }}>Dept: {user.department_id}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          marginTop: 60, color: "rgba(255,255,255,0.2)", fontSize: 12,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap",
        }}>
          <span>✓ Role-Based Access</span>
          <span>✓ Live Notifications</span>
          <span>✓ Audit Logging</span>
          <span>✓ Department Routing</span>
        </div>
      </div>
      {guideOpen && (
        <RoleGuideModal cat={guideOpen} onClose={() => setGuideOpen(null)} />
      )}
    </div>
  );
}