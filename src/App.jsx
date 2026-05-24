import { useState, useEffect } from "react";

const STORAGE_KEY = "libre3_sensors";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(dtStr) {
  if (!dtStr) return "—";
  const d = new Date(dtStr);
  return d.toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function calcWearEnd(setzdatum) {
  if (!setzdatum) return null;
  const d = new Date(setzdatum);
  d.setDate(d.getDate() + 15);
  return d;
}

function getWearProgress(setzdatum) {
  if (!setzdatum) return null;
  const now = new Date();
  const start = new Date(setzdatum);
  const end = calcWearEnd(setzdatum);
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const daysWorn = Math.min(15, Math.max(0, Math.floor(elapsed / 86400000)));
  return { pct, daysLeft, daysWorn, end, expired: now > end };
}

function nowLocalISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

const emptyForm = {
  seriennummer: "",
  haltbarkeit: "",
  setzdatum: nowLocalISO(),
  setzdatumFix: false,
  aktiv: true,
};

export default function App() {
  const [sensors, setSensors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  });
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [tab, setTab] = useState("aktiv");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sensors));
  }, [sensors]);

  // If aktiv and setzdatum not fixed, suggest today on form open
  useEffect(() => {
    if (showForm && !editId && form.aktiv && !form.setzdatumFix) {
      setForm(f => ({ ...f, setzdatum: nowLocalISO() }));
    }
  }, [showForm]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: type === "checkbox" ? checked : value };
      // If aktiv toggled on and not fixed, suggest now
      if (name === "aktiv" && checked && !f.setzdatumFix) {
        updated.setzdatum = nowLocalISO();
      }
      // If setzdatumFix unchecked and aktiv, reset to now
      if (name === "setzdatumFix" && !checked && f.aktiv) {
        updated.setzdatum = nowLocalISO();
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!form.seriennummer.trim()) return;
    const sensor = {
      ...form,
      id: editId || crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    setSensors(s =>
      editId ? s.map(x => x.id === editId ? sensor : x) : [sensor, ...s]
    );
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (sensor) => {
    setForm({
      seriennummer: sensor.seriennummer,
      haltbarkeit: sensor.haltbarkeit,
      setzdatum: sensor.setzdatum,
      setzdatumFix: sensor.setzdatumFix,
      aktiv: sensor.aktiv,
    });
    setEditId(sensor.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setSensors(s => s.filter(x => x.id !== id));
    setDeleteConfirm(null);
  };

  const aktivSensors = sensors.filter(s => s.aktiv);
  const passivSensors = sensors.filter(s => !s.aktiv);
  const displayed = tab === "aktiv" ? aktivSensors : passivSensors;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b35 60%, #061424 100%)",
      fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace",
      color: "#e8f4ff",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0f1e; }
        ::-webkit-scrollbar-thumb { background: #1e6fb5; border-radius: 2px; }
        input, select { outline: none; }
        input:focus, select:focus { border-color: #38bdf8 !important; box-shadow: 0 0 0 2px rgba(56,189,248,0.15); }
        .sensor-card { transition: transform 0.15s, box-shadow 0.15s; }
        .sensor-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(14,100,200,0.25); }
        .btn-primary { transition: background 0.15s, transform 0.1s; }
        .btn-primary:hover { background: #1d6fb5 !important; transform: scale(1.02); }
        .btn-danger { transition: background 0.15s; }
        .btn-danger:hover { background: #7f1d1d !important; }
        .tab-btn { transition: color 0.15s, border-color 0.15s; }
        .progress-bar { transition: width 1s ease; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "rgba(10,20,40,0.85)",
        borderBottom: "1px solid rgba(56,189,248,0.15)",
        padding: "18px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: "0.05em", color: "#38bdf8" }}>
            LIBRE 3
          </div>
          <div style={{ fontSize: "0.68rem", color: "#64748b", letterSpacing: "0.12em", marginTop: "1px" }}>
            SENSOR MANAGER
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {aktivSensors.length > 0 && (
            <div style={{
              background: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "0.75rem",
              color: "#38bdf8",
            }}>
              {aktivSensors.length} Aktiv{aktivSensors.length !== 1 ? "" : ""}
            </div>
          )}
          <button
            className="btn-primary"
            onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
            style={{
              background: "#0e6eb8",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.8rem",
              fontWeight: 500,
              letterSpacing: "0.05em",
            }}
          >
            + Neuer Sensor
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: "flex",
        gap: "1px",
        background: "rgba(56,189,248,0.08)",
        borderBottom: "1px solid rgba(56,189,248,0.1)",
        padding: "14px 24px",
      }}>
        <StatBox label="Sensoren Gesamt" value={sensors.length} />
        <StatBox label="Aktiv" value={aktivSensors.length} accent="#38bdf8" />
        <StatBox label="Passiv / Archiv" value={passivSensors.length} accent="#64748b" />
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,10,25,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, backdropFilter: "blur(4px)",
        }}>
          <div className="fade-in" style={{
            background: "#0d1b2e",
            border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: "12px",
            padding: "28px",
            width: "100%",
            maxWidth: "440px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: "22px", color: "#e8f4ff", letterSpacing: "0.04em" }}>
              {editId ? "Sensor bearbeiten" : "Neuen Sensor erfassen"}
            </div>

            <Label>Seriennummer *</Label>
            <input
              name="seriennummer"
              value={form.seriennummer}
              onChange={handleChange}
              placeholder="z.B. 0M700XXXXX"
              style={inputStyle}
            />

            <Label>Haltbarkeitsdatum</Label>
            <input
              type="date"
              name="haltbarkeit"
              value={form.haltbarkeit}
              onChange={handleChange}
              style={inputStyle}
            />

            {/* Status Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0 12px" }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Status:</span>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <div
                  onClick={() => setForm(f => ({ ...f, aktiv: !f.aktiv, setzdatum: !f.aktiv && !f.setzdatumFix ? nowLocalISO() : f.setzdatum }))}
                  style={{
                    width: "40px", height: "22px", borderRadius: "11px",
                    background: form.aktiv ? "#0e6eb8" : "#1e293b",
                    border: "1px solid " + (form.aktiv ? "#38bdf8" : "#334155"),
                    position: "relative", cursor: "pointer", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: "2px",
                    left: form.aktiv ? "19px" : "2px",
                    width: "16px", height: "16px",
                    borderRadius: "50%",
                    background: form.aktiv ? "#38bdf8" : "#475569",
                    transition: "left 0.2s",
                  }} />
                </div>
                <span style={{ fontSize: "0.8rem", color: form.aktiv ? "#38bdf8" : "#64748b", fontWeight: 500 }}>
                  {form.aktiv ? "Aktiv" : "Passiv"}
                </span>
              </label>
            </div>

            <Label>Setzdatum / Uhrzeit</Label>
            <input
              type="datetime-local"
              name="setzdatum"
              value={form.setzdatum}
              onChange={handleChange}
              disabled={form.aktiv && !form.setzdatumFix}
              style={{ ...inputStyle, opacity: form.aktiv && !form.setzdatumFix ? 0.5 : 1 }}
            />

            {form.aktiv && (
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="setzdatumFix"
                  checked={form.setzdatumFix}
                  onChange={handleChange}
                  style={{ accentColor: "#38bdf8", width: "14px", height: "14px" }}
                />
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Setzdatum manuell festlegen
                </span>
              </label>
            )}

            {form.setzdatum && (
              <div style={{
                marginTop: "14px",
                background: "rgba(56,189,248,0.06)",
                border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "0.75rem",
                color: "#94a3b8",
              }}>
                <span style={{ color: "#38bdf8" }}>⊕</span> Tragedauer bis:{" "}
                <span style={{ color: "#e8f4ff", fontWeight: 500 }}>
                  {formatDateTime(calcWearEnd(form.setzdatum))}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
              <button
                onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                style={{
                  flex: 1, background: "transparent",
                  border: "1px solid #334155", borderRadius: "6px",
                  color: "#64748b", padding: "9px", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: "0.8rem",
                }}
              >
                Abbrechen
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!form.seriennummer.trim()}
                style={{
                  flex: 2, background: form.seriennummer.trim() ? "#0e6eb8" : "#1e293b",
                  border: "none", borderRadius: "6px",
                  color: form.seriennummer.trim() ? "#fff" : "#475569",
                  padding: "9px", cursor: form.seriennummer.trim() ? "pointer" : "not-allowed",
                  fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", fontWeight: 500,
                }}
              >
                {editId ? "Speichern" : "Sensor anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,10,25,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, backdropFilter: "blur(4px)",
        }}>
          <div className="fade-in" style={{
            background: "#0d1b2e",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "28px",
            maxWidth: "360px",
            width: "100%",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: "8px" }}>Sensor löschen?</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "20px" }}>
              Seriennummer: <span style={{ color: "#e8f4ff" }}>{deleteConfirm.seriennummer}</span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, background: "transparent", border: "1px solid #334155", borderRadius: "6px", color: "#94a3b8", padding: "9px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem" }}
              >
                Abbrechen
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(deleteConfirm.id)}
                style={{ flex: 1, background: "#7f1d1d33", border: "1px solid rgba(239,68,68,0.5)", borderRadius: "6px", color: "#f87171", padding: "9px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem" }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(56,189,248,0.1)", padding: "0 24px", marginTop: "4px" }}>
        {[["aktiv", `Aktiv (${aktivSensors.length})`], ["passiv", `Archiv (${passivSensors.length})`]].map(([key, label]) => (
          <button
            key={key}
            className="tab-btn"
            onClick={() => setTab(key)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: tab === key ? "2px solid #38bdf8" : "2px solid transparent",
              color: tab === key ? "#38bdf8" : "#475569",
              padding: "12px 16px",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.78rem",
              letterSpacing: "0.06em",
              marginBottom: "-1px",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sensor List */}
      <div style={{ padding: "20px 24px", maxWidth: "800px", margin: "0 auto" }}>
        {displayed.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0",
            color: "#334155", fontSize: "0.85rem",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px", opacity: 0.3 }}>◎</div>
            {tab === "aktiv" ? "Keine aktiven Sensoren" : "Keine archivierten Sensoren"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {displayed.map(sensor => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                onEdit={() => handleEdit(sensor)}
                onDelete={() => setDeleteConfirm(sensor)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SensorCard({ sensor, onEdit, onDelete }) {
  const progress = getWearProgress(sensor.setzdatum);
  const isExpired = progress?.expired;

  return (
    <div className="sensor-card fade-in" style={{
      background: "rgba(13,27,46,0.8)",
      border: `1px solid ${sensor.aktiv ? (isExpired ? "rgba(239,68,68,0.3)" : "rgba(56,189,248,0.2)") : "rgba(51,65,85,0.4)"}`,
      borderRadius: "10px",
      padding: "18px 20px",
      opacity: sensor.aktiv ? 1 : 0.6,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.04em", color: "#e8f4ff" }}>
              {sensor.seriennummer}
            </span>
            <span style={{
              fontSize: "0.65rem",
              padding: "2px 8px",
              borderRadius: "10px",
              background: sensor.aktiv
                ? (isExpired ? "rgba(239,68,68,0.15)" : "rgba(56,189,248,0.12)")
                : "rgba(71,85,105,0.2)",
              color: sensor.aktiv
                ? (isExpired ? "#f87171" : "#38bdf8")
                : "#64748b",
              border: `1px solid ${sensor.aktiv ? (isExpired ? "rgba(239,68,68,0.4)" : "rgba(56,189,248,0.3)") : "#334155"}`,
              letterSpacing: "0.08em",
              fontWeight: 500,
            }}>
              {sensor.aktiv ? (isExpired ? "ABGELAUFEN" : "AKTIV") : "ARCHIV"}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px", letterSpacing: "0.04em" }}>
            Haltbarkeit: {formatDate(sensor.haltbarkeit) || "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onEdit}
            style={{
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: "6px",
              color: "#38bdf8",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Bearb.
          </button>
          <button
            onClick={onDelete}
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "6px",
              color: "#f87171",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: sensor.aktiv && progress ? "14px" : "0", fontSize: "0.75rem" }}>
        <InfoCell label="Gesetzt am" value={formatDateTime(sensor.setzdatum)} />
        <InfoCell label="Tragedauer bis" value={progress ? formatDateTime(progress.end) : "—"} accent={isExpired} />
      </div>

      {sensor.aktiv && progress && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.68rem", color: "#64748b" }}>
              Tag {progress.daysWorn} / 15
            </span>
            <span style={{ fontSize: "0.68rem", color: isExpired ? "#f87171" : "#94a3b8" }}>
              {isExpired ? "Sensor abgelaufen" : `noch ${progress.daysLeft} Tag${progress.daysLeft !== 1 ? "e" : ""}`}
            </span>
          </div>
          <div style={{ height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div
              className="progress-bar"
              style={{
                width: `${progress.pct}%`,
                height: "100%",
                borderRadius: "3px",
                background: isExpired
                  ? "linear-gradient(90deg, #dc2626, #f87171)"
                  : progress.pct > 80
                    ? "linear-gradient(90deg, #0e6eb8, #fb923c)"
                    : "linear-gradient(90deg, #0e6eb8, #38bdf8)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: "0.65rem", color: "#475569", letterSpacing: "0.06em", marginBottom: "2px" }}>{label}</div>
      <div style={{ color: accent ? "#f87171" : "#94a3b8", fontSize: "0.78rem" }}>{value}</div>
    </div>
  );
}

function StatBox({ label, value, accent }) {
  return (
    <div style={{ flex: 1, padding: "8px 16px" }}>
      <div style={{ fontSize: "0.65rem", color: "#475569", letterSpacing: "0.08em", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: accent || "#e8f4ff" }}>{value}</div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: "0.7rem", color: "#64748b", letterSpacing: "0.08em", marginBottom: "5px", marginTop: "14px" }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid #1e3a5f",
  borderRadius: "6px",
  color: "#e8f4ff",
  padding: "9px 12px",
  fontFamily: "'DM Mono', monospace",
  fontSize: "0.82rem",
  transition: "border-color 0.15s",
};
