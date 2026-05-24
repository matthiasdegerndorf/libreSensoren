import { useState, useEffect } from "react";

const STORAGE_KEY = "libre3_sensors";

function pad(n) { return String(n).padStart(2, "0"); }

function nowLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });
}

function fmtDT(s) {
  if (!s) return "—";
  return new Date(s).toLocaleString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function wearEnd(setzdatum) {
  if (!setzdatum) return null;
  const d = new Date(setzdatum);
  d.setDate(d.getDate() + 15);
  return d;
}

function wearProgress(setzdatum) {
  if (!setzdatum) return null;
  const now = new Date();
  const start = new Date(setzdatum);
  const end = wearEnd(setzdatum);
  const pct = Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const daysWorn = Math.min(15, Math.max(0, Math.floor((now - start) / 86400000)));
  return { pct, daysLeft, daysWorn, end, expired: now > end };
}

const emptyForm = { seriennummer: "", haltbarkeit: "", setzdatum: nowLocalISO(), setzdatumFix: false, aktiv: true };

// ─── Haltbarkeits-Statistik ───────────────────────────────────────────────────
function HaltbStatistik({ sensors, compact = false }) {
  const now = new Date(); now.setHours(0,0,0,0);
  const withDate = sensors.filter(s => s.haltbarkeit);
  const noDate   = sensors.filter(s => !s.haltbarkeit);
  const groups = {};
  withDate.forEach(s => { if (!groups[s.haltbarkeit]) groups[s.haltbarkeit] = []; groups[s.haltbarkeit].push(s); });
  const sortedDates = Object.keys(groups).sort();
  const maxCount = sortedDates.reduce((m,d) => Math.max(m, groups[d].length), 0);

  function urgColor(dateStr) {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    const diff = Math.ceil((d - now) / 86400000);
    if (diff < 0)    return "#ef4444";
    if (diff <= 30)  return "#f97316";
    if (diff <= 90)  return "#38bdf8";
    return "#22d3ee";
  }
  function urgLabel(dateStr) {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    const diff = Math.ceil((d - now) / 86400000);
    if (diff < 0)    return "abgelaufen";
    if (diff === 0)  return "heute";
    if (diff === 1)  return "morgen";
    if (diff <= 30)  return `in ${diff} Tagen`;
    if (diff <= 90)  return `in ${Math.round(diff/7)} Wo.`;
    return `in ${Math.round(diff/30)} Mon.`;
  }
  function barColor(dateStr) {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    const diff = Math.ceil((d - now) / 86400000);
    if (diff < 0)    return "linear-gradient(90deg,#dc2626,#ef4444)";
    if (diff <= 30)  return "linear-gradient(90deg,#ea580c,#f97316)";
    if (diff <= 90)  return "linear-gradient(90deg,#0e6eb8,#38bdf8)";
    return "linear-gradient(90deg,#0891b2,#22d3ee)";
  }

  if (sortedDates.length === 0 && noDate.length === 0) {
    return <div style={{color:"#334155",fontSize:"0.8rem",padding:"10px 0"}}>Keine Haltbarkeitsdaten erfasst</div>;
  }

  return (
    <div>
      {sortedDates.map(dateStr => {
        const count = groups[dateStr].length;
        const barPct = maxCount > 0 ? Math.round((count/maxCount)*100) : 0;
        const col = urgColor(dateStr);
        return (
          <div key={dateStr} style={{display:"flex",alignItems:"center",gap:"10px",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0}} />
            <div style={{fontSize:"0.72rem",color:"#94a3b8",minWidth:82}}>{fmtDate(dateStr)}</div>
            <div style={{flex:1,height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${barPct}%`,height:"100%",borderRadius:3,background:barColor(dateStr),transition:"width 0.6s ease"}} />
            </div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"0.85rem",minWidth:28,textAlign:"right",color:col}}>{count}</div>
            {!compact && <div style={{fontSize:"0.65rem",color:"#64748b",minWidth:70,textAlign:"right"}}>{urgLabel(dateStr)}</div>}
            {compact && <div style={{fontSize:"0.65rem",color:"#64748b",minWidth:60,textAlign:"right"}}>{urgLabel(dateStr)}</div>}
          </div>
        );
      })}
      {noDate.length > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"6px 0"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#475569",flexShrink:0}} />
          <div style={{fontSize:"0.72rem",color:"#475569",minWidth:82}}>Kein Datum</div>
          <div style={{flex:1,height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
            <div style={{width:`${maxCount>0?Math.round((noDate.length/maxCount)*100):100}%`,height:"100%",borderRadius:3,background:"linear-gradient(90deg,#334155,#475569)"}} />
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"0.85rem",minWidth:28,textAlign:"right",color:"#64748b"}}>{noDate.length}</div>
          {!compact && <div style={{fontSize:"0.65rem",color:"#475569",minWidth:70,textAlign:"right"}}>—</div>}
        </div>
      )}
    </div>
  );
}

// ─── Statistik Tab ────────────────────────────────────────────────────────────
function StatistikTab({ sensors }) {
  const now = new Date(); now.setHours(0,0,0,0);
  const withDate = sensors.filter(s => s.haltbarkeit);
  const expired = withDate.filter(s => { const d=new Date(s.haltbarkeit); d.setHours(0,0,0,0); return d<now; }).length;
  const soon    = withDate.filter(s => { const d=new Date(s.haltbarkeit); d.setHours(0,0,0,0); const diff=Math.ceil((d-now)/86400000); return diff>=0&&diff<=30; }).length;
  const noDate  = sensors.filter(s => !s.haltbarkeit).length;
  const aktiv   = sensors.filter(s => s.aktiv).length;
  const passiv  = sensors.filter(s => !s.aktiv).length;

  // Monthly grouping
  const byMonth = {};
  withDate.forEach(s => {
    const d = new Date(s.haltbarkeit);
    const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
    byMonth[key] = (byMonth[key]||0) + 1;
  });
  const sortedMonths = Object.keys(byMonth).sort();
  const maxMonth = sortedMonths.reduce((m,k)=>Math.max(m,byMonth[k]),0);

  function monthLabel(key) {
    const [y,m] = key.split("-");
    return new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString("de-DE",{month:"short",year:"numeric"});
  }
  function monthColor(key) {
    const [y,m] = key.split("-");
    const d = new Date(parseInt(y),parseInt(m)-1,1);
    const diff = Math.ceil((d - now) / 86400000);
    if (diff < 0)    return "#ef4444";
    if (diff <= 60)  return "#f97316";
    if (diff <= 180) return "#38bdf8";
    return "#22d3ee";
  }

  const kachel = (label, value, color) => (
    <div style={{background:"rgba(10,20,40,0.7)",border:"1px solid rgba(56,189,248,0.1)",borderRadius:8,padding:"12px 10px",textAlign:"center"}}>
      <div style={{fontSize:"0.55rem",color:"#475569",letterSpacing:"0.1em",marginBottom:4}}>{label}</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1.3rem",color}}>{value}</div>
    </div>
  );

  return (
    <div style={{animation:"fadeIn 0.25s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
        {kachel("GESAMT",   sensors.length, "#e8f4ff")}
        {kachel("AKTIV",    aktiv,          "#38bdf8")}
        {kachel("ARCHIV",   passiv,         "#64748b")}
        {kachel("ABGELAUFEN",   expired,    "#f87171")}
        {kachel("LÄUFT BALD AB",soon,       "#fb923c")}
        {kachel("KEIN DATUM",   noDate,     "#475569")}
      </div>

      <div style={{background:"rgba(13,27,46,0.85)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:10,padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:"0.62rem",color:"#475569",letterSpacing:"0.12em",marginBottom:14}}>HALTBARKEIT NACH DATUM — ALLE SENSOREN</div>
        <HaltbStatistik sensors={sensors} />
      </div>

      {sortedMonths.length > 0 && (
        <div style={{background:"rgba(13,27,46,0.85)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:10,padding:"16px 18px"}}>
          <div style={{fontSize:"0.62rem",color:"#475569",letterSpacing:"0.12em",marginBottom:14}}>MONATLICHE ÜBERSICHT</div>
          {sortedMonths.map(k => {
            const pct = Math.round((byMonth[k]/maxMonth)*100);
            const col = monthColor(k);
            return (
              <div key={k} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{fontSize:"0.71rem",color:"#94a3b8",minWidth:96}}>{monthLabel(k)}</div>
                <div style={{flex:1,height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:col,transition:"width 0.6s ease"}} />
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"0.85rem",minWidth:28,textAlign:"right",color:col}}>{byMonth[k]}</div>
                <div style={{fontSize:"0.65rem",color:"#64748b",minWidth:60,textAlign:"right"}}>{byMonth[k]===1?"Sensor":"Sensoren"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sensor Card ──────────────────────────────────────────────────────────────
function SensorCard({ sensor, onEdit, onDelete }) {
  const p = wearProgress(sensor.setzdatum);
  const expired = p?.expired;
  return (
    <div style={{
      background:"rgba(13,27,46,0.85)",
      border:`1px solid ${sensor.aktiv?(expired?"rgba(239,68,68,0.3)":"rgba(56,189,248,0.2)"):"rgba(51,65,85,0.4)"}`,
      borderRadius:10, padding:"16px 18px", opacity:sensor.aktiv?1:0.6, animation:"fadeIn 0.25s ease",
    }}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center"}}>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1rem",color:"#e8f4ff"}}>{sensor.seriennummer}</span>
            <span style={{
              fontSize:"0.62rem",padding:"2px 8px",borderRadius:10,letterSpacing:"0.08em",fontWeight:500,
              border:"1px solid",marginLeft:8,
              ...(sensor.aktiv
                ? expired ? {background:"rgba(239,68,68,0.15)",color:"#f87171",borderColor:"rgba(239,68,68,0.4)"}
                          : {background:"rgba(56,189,248,0.12)",color:"#38bdf8",borderColor:"rgba(56,189,248,0.3)"}
                : {background:"rgba(71,85,105,0.2)",color:"#64748b",borderColor:"#334155"})
            }}>
              {sensor.aktiv ? (expired ? "ABGELAUFEN" : "AKTIV") : "ARCHIV"}
            </span>
          </div>
          <div style={{fontSize:"0.7rem",color:"#475569",marginTop:2}}>Haltbarkeit: {fmtDate(sensor.haltbarkeit)}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onEdit} style={{background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:6,color:"#38bdf8",padding:"6px 11px",cursor:"pointer",fontSize:"0.7rem"}}>Bearb.</button>
          <button onClick={onDelete} style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,color:"#f87171",padding:"6px 10px",cursor:"pointer",fontSize:"0.7rem"}}>✕</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:p&&sensor.aktiv?12:0}}>
        <div><div style={{fontSize:"0.62rem",color:"#475569",marginBottom:2}}>GESETZT AM</div><div style={{fontSize:"0.76rem",color:"#94a3b8"}}>{fmtDT(sensor.setzdatum)}</div></div>
        <div><div style={{fontSize:"0.62rem",color:"#475569",marginBottom:2}}>TRAGEDAUER BIS</div><div style={{fontSize:"0.76rem",color:expired?"#f87171":"#94a3b8"}}>{p?fmtDT(p.end):"—"}</div></div>
      </div>
      {sensor.aktiv && p && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:"0.67rem",color:"#64748b"}}>Tag {p.daysWorn} / 15</span>
            <span style={{fontSize:"0.67rem",color:expired?"#f87171":"#94a3b8"}}>{expired?"Sensor abgelaufen":`noch ${p.daysLeft} Tag${p.daysLeft!==1?"e":""}`}</span>
          </div>
          <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
            <div style={{width:`${p.pct}%`,height:"100%",borderRadius:3,transition:"width 1s ease",background:expired?"linear-gradient(90deg,#dc2626,#f87171)":p.pct>80?"linear-gradient(90deg,#0e6eb8,#fb923c)":"linear-gradient(90deg,#0e6eb8,#38bdf8)"}} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ show, onClose, children, danger }) {
  if (!show) return null;
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(5,10,25,0.88)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)"}}>
      <div style={{background:"#0d1b2e",border:`1px solid ${danger?"rgba(239,68,68,0.3)":"rgba(56,189,248,0.2)"}`,borderRadius:12,padding:24,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",animation:"fadeIn 0.2s ease"}}>
        {children}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [sensors, setSensors] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; } });
  const [tab, setTab] = useState("aktiv");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formAktiv, setFormAktiv] = useState(true);
  const [formFix, setFormFix] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(sensors)); }, [sensors]);

  const aktiv  = sensors.filter(s => s.aktiv);
  const passiv = sensors.filter(s => !s.aktiv);

  function openNew() {
    setEditId(null); setForm({...emptyForm,setzdatum:nowLocalISO()}); setFormAktiv(true); setFormFix(false); setShowForm(true);
  }
  function openEdit(s) {
    setEditId(s.id); setForm({seriennummer:s.seriennummer,haltbarkeit:s.haltbarkeit||"",setzdatum:s.setzdatum||nowLocalISO(),setzdatumFix:s.setzdatumFix,aktiv:s.aktiv});
    setFormAktiv(s.aktiv); setFormFix(s.setzdatumFix); setShowForm(true);
  }
  function handleSave() {
    if (!form.seriennummer.trim()) return;
    const sensor = {...form,aktiv:formAktiv,setzdatumFix:formFix,id:editId||crypto.randomUUID(),savedAt:new Date().toISOString()};
    setSensors(s => editId ? s.map(x=>x.id===editId?sensor:x) : [sensor,...s]);
    setShowForm(false);
  }
  function handleDelete() {
    setSensors(s => s.filter(x=>x.id!==deleteTarget.id)); setDeleteTarget(null);
  }
  function toggleFormAktiv() {
    const next = !formAktiv; setFormAktiv(next); setFormFix(false);
    if (next) setForm(f=>({...f,setzdatum:nowLocalISO(),setzdatumFix:false}));
  }

  const szDisabled = formAktiv && !formFix;

  const inputStyle = {width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid #1e3a5f",borderRadius:6,color:"#e8f4ff",padding:"9px 12px",fontSize:"0.82rem"};

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0f1e 0%,#0d1b35 60%,#061424 100%)",fontFamily:"'DM Mono','Fira Mono','Courier New',monospace",color:"#e8f4ff"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,button,select{font-family:inherit;outline:none;-webkit-appearance:none}
        input[type="checkbox"]{-webkit-appearance:checkbox;appearance:checkbox}
        input:focus{border-color:#38bdf8!important;box-shadow:0 0 0 2px rgba(56,189,248,0.15)}
        input[type="date"]::-webkit-calendar-picker-indicator,input[type="datetime-local"]::-webkit-calendar-picker-indicator{filter:invert(0.6)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a0f1e} ::-webkit-scrollbar-thumb{background:#1e6fb5;border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{background:"rgba(10,20,40,0.9)",borderBottom:"1px solid rgba(56,189,248,0.15)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(10px)"}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.3rem",letterSpacing:"0.06em",color:"#38bdf8"}}>LIBRE 3</div>
          <div style={{fontSize:"0.62rem",color:"#475569",letterSpacing:"0.14em",marginTop:2}}>SENSOR MANAGER</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {aktiv.length > 0 && <div style={{background:"rgba(56,189,248,0.1)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:20,padding:"4px 12px",fontSize:"0.72rem",color:"#38bdf8"}}>{aktiv.length} Aktiv</div>}
          <button onClick={openNew} style={{background:"#0e6eb8",border:"none",borderRadius:8,color:"#fff",padding:"9px 16px",cursor:"pointer",fontSize:"0.8rem",fontWeight:500}}>+ Neuer Sensor</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{display:"flex",background:"rgba(56,189,248,0.06)",borderBottom:"1px solid rgba(56,189,248,0.08)",padding:"12px 20px"}}>
        {[["GESAMT",sensors.length,"#e8f4ff"],["AKTIV",aktiv.length,"#38bdf8"],["ARCHIV",passiv.length,"#64748b"]].map(([l,v,c])=>(
          <div key={l} style={{flex:1,padding:"4px 8px"}}>
            <div style={{fontSize:"0.6rem",color:"#475569",letterSpacing:"0.1em",marginBottom:2}}>{l}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1.4rem",color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Haltb strip */}
      {tab !== "statistik" && sensors.length > 0 && (
        <div style={{background:"rgba(10,20,40,0.6)",borderBottom:"1px solid rgba(56,189,248,0.1)",padding:"14px 20px"}}>
          <div style={{fontSize:"0.62rem",color:"#475569",letterSpacing:"0.12em",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            HALTBARKEIT NACH DATUM
            <div style={{flex:1,height:1,background:"rgba(56,189,248,0.1)"}} />
          </div>
          <HaltbStatistik sensors={sensors} compact />
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(56,189,248,0.1)",padding:"0 20px"}}>
        {[["aktiv",`Aktiv (${aktiv.length})`],["passiv",`Archiv (${passiv.length})`],["statistik","Statistik"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:"transparent",border:"none",borderBottom:tab===key?"2px solid #38bdf8":"2px solid transparent",color:tab===key?"#38bdf8":"#475569",padding:"12px 16px",cursor:"pointer",fontSize:"0.76rem",letterSpacing:"0.07em",marginBottom:-1}}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:"18px 20px",maxWidth:700,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>
        {tab === "statistik" ? (
          <StatistikTab sensors={sensors} />
        ) : (
          (tab==="aktiv"?aktiv:passiv).length === 0 ? (
            <div style={{textAlign:"center",padding:"60px 0",color:"#334155"}}>
              <div style={{fontSize:"2.5rem",marginBottom:12,opacity:0.3}}>◎</div>
              {tab==="aktiv"?"Keine aktiven Sensoren":"Keine archivierten Sensoren"}
            </div>
          ) : (
            (tab==="aktiv"?aktiv:passiv).map(s => (
              <SensorCard key={s.id} sensor={s} onEdit={()=>openEdit(s)} onDelete={()=>setDeleteTarget(s)} />
            ))
          )
        )}
      </div>

      {/* Form Modal */}
      <Modal show={showForm} onClose={()=>setShowForm(false)}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1rem",marginBottom:20}}>{editId?"Sensor bearbeiten":"Neuen Sensor erfassen"}</div>
        <div style={{fontSize:"0.68rem",color:"#64748b",marginBottom:5,marginTop:14}}>Seriennummer *</div>
        <input style={inputStyle} value={form.seriennummer} onChange={e=>setForm(f=>({...f,seriennummer:e.target.value}))} placeholder="z.B. 0M700XXXXX" />
        <div style={{fontSize:"0.68rem",color:"#64748b",marginBottom:5,marginTop:14}}>Haltbarkeitsdatum</div>
        <input type="date" style={inputStyle} value={form.haltbarkeit} onChange={e=>setForm(f=>({...f,haltbarkeit:e.target.value}))} />
        {/* Toggle */}
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0 12px"}}>
          <span style={{fontSize:"0.76rem",color:"#94a3b8"}}>Status:</span>
          <div onClick={toggleFormAktiv} style={{width:42,height:23,borderRadius:12,background:formAktiv?"#0e6eb8":"#1e293b",border:`1px solid ${formAktiv?"#38bdf8":"#334155"}`,position:"relative",cursor:"pointer",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:formAktiv?21:2,width:17,height:17,borderRadius:"50%",background:formAktiv?"#38bdf8":"#475569",transition:"left 0.2s"}} />
          </div>
          <span style={{fontSize:"0.76rem",color:formAktiv?"#38bdf8":"#64748b",fontWeight:500}}>{formAktiv?"Aktiv":"Passiv"}</span>
        </div>
        <div style={{fontSize:"0.68rem",color:"#64748b",marginBottom:5}}>Setzdatum / Uhrzeit</div>
        <input type="datetime-local" style={{...inputStyle,opacity:szDisabled?0.45:1}} disabled={szDisabled} value={form.setzdatum} onChange={e=>setForm(f=>({...f,setzdatum:e.target.value}))} />
        {formAktiv && (
          <label style={{display:"flex",alignItems:"center",gap:8,marginTop:8,cursor:"pointer"}}>
            <input type="checkbox" checked={formFix} onChange={e=>{setFormFix(e.target.checked);if(!e.target.checked)setForm(f=>({...f,setzdatum:nowLocalISO()}));}} style={{width:14,height:14,accentColor:"#38bdf8"}} />
            <span style={{fontSize:"0.74rem",color:"#94a3b8"}}>Setzdatum manuell festlegen</span>
          </label>
        )}
        {form.setzdatum && (
          <div style={{marginTop:14,background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:8,padding:"10px 14px",fontSize:"0.74rem",color:"#94a3b8"}}>
            ⊕ Tragedauer bis: <span style={{color:"#e8f4ff",fontWeight:500}}>{fmtDT(wearEnd(form.setzdatum))}</span>
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:22}}>
          <button onClick={()=>setShowForm(false)} style={{flex:1,background:"transparent",border:"1px solid #334155",borderRadius:6,color:"#64748b",padding:10,cursor:"pointer",fontSize:"0.8rem"}}>Abbrechen</button>
          <button onClick={handleSave} disabled={!form.seriennummer.trim()} style={{flex:2,background:form.seriennummer.trim()?"#0e6eb8":"#1e293b",border:"none",borderRadius:6,color:form.seriennummer.trim()?"#fff":"#475569",padding:10,cursor:form.seriennummer.trim()?"pointer":"not-allowed",fontSize:"0.8rem",fontWeight:500}}>
            {editId?"Speichern":"Sensor anlegen"}
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal show={!!deleteTarget} onClose={()=>setDeleteTarget(null)} danger>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"2rem",marginBottom:12}}>⚠</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1rem",marginBottom:8}}>Sensor löschen?</div>
          <div style={{fontSize:"0.78rem",color:"#94a3b8",marginBottom:20}}>Seriennummer: <span style={{color:"#e8f4ff"}}>{deleteTarget?.seriennummer}</span></div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setDeleteTarget(null)} style={{flex:1,background:"transparent",border:"1px solid #334155",borderRadius:6,color:"#64748b",padding:10,cursor:"pointer",fontSize:"0.8rem"}}>Abbrechen</button>
            <button onClick={handleDelete} style={{flex:1,background:"rgba(127,29,29,0.2)",border:"1px solid rgba(239,68,68,0.5)",borderRadius:6,color:"#f87171",padding:10,cursor:"pointer",fontSize:"0.8rem"}}>Löschen</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
