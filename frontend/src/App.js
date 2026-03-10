import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { getSocket, authApi, spotsApi, bookingsApi, paymentsApi, providerApi, adminApi, walletApi } from "./services";
import "./App.css";

// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);

const DARK = {
  bg:"#0A0F1E", card:"#111827", border:"#1E2D3D",
  accent:"#00E5A0", accentSoft:"#00E5A015",
  blue:"#4DA6FF", text:"#F0F4FF", muted:"#6B7A99",
  warn:"#FFB800", danger:"#FF4D6D", purple:"#A855F7",
  inputBg:"#1A2840", navBg:"#0D1525", shadow:"0 40px 120px #000000CC, 0 0 0 2px #1E2D3D",
  mode:"dark",
};
const LIGHT = {
  bg:"#F4F6FA", card:"#FFFFFF", border:"#DDE3EE",
  accent:"#00B87A", accentSoft:"#00B87A15",
  blue:"#2B7FD4", text:"#0D1525", muted:"#6B7A99",
  warn:"#D4860A", danger:"#D93B55", purple:"#7C3AED",
  inputBg:"#EEF1F8", navBg:"#FFFFFF", shadow:"0 20px 60px #0000001A, 0 0 0 1px #DDE3EE",
  mode:"light",
};

// ─── LUCIDE ICONS (inline SVG — no npm, loads from CDN) ───────────────────────
// We use a simple SVG icon component driven by path data from lucide.dev
const Icon = ({ name, size=18, color, strokeWidth=2.2, style:s }) => {
  const C = useTheme();
  const col = color || C.text;
  // Each entry: array of elements — strings = <path d>, objects = {tag, attrs}
  const icons = {
    map:          ["M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z","M9 4v13","M15 7v13"],
    parking:      [{tag:"rect",attrs:{x:3,y:3,width:18,height:18,rx:2}},"M9 17V7h4a3 3 0 010 6H9"],
    user:         ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 11a4 4 0 100-8 4 4 0 000 8z"],
    "map-pin":    ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z","M12 10a1 1 0 100-2 1 1 0 000 2z"],
    navigation:   ["M3 11l19-9-9 19-2-8-8-2z"],
    clock:        [{tag:"circle",attrs:{cx:12,cy:12,r:10}},"M12 6v6l4 2"],
    "credit-card":[{tag:"rect",attrs:{x:1,y:4,width:22,height:16,rx:2,ry:2}},"M1 10h22"],
    star:         ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
    "check-circle":[{tag:"circle",attrs:{cx:12,cy:12,r:10}},"M9 12l2 2 4-4"],
    "x-circle":   [{tag:"circle",attrs:{cx:12,cy:12,r:10}},"M15 9l-6 6M9 9l6 6"],
    settings:     [{tag:"circle",attrs:{cx:12,cy:12,r:3}},"M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
    building:     ["M3 21h18","M9 21V9h6v12","M3 9l9-6 9 6","M3 9h18"],
    "bar-chart":  [{tag:"line",attrs:{x1:12,y1:20,x2:12,y2:10}},{tag:"line",attrs:{x1:18,y1:20,x2:18,y2:4}},{tag:"line",attrs:{x1:6,y1:20,x2:6,y2:16}}],
    "log-out":    [{tag:"path",attrs:{d:"M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"}},"M16 17l5-5-5-5","M21 12H9"],
    "log-in":     [{tag:"path",attrs:{d:"M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"}},"M10 17l5-5-5-5","M15 12H3"],
    car:          ["M1 3h15l3 7H1z","M1 10v6h1m14 0h1v-6","M5 16a2 2 0 100 4 2 2 0 000-4z","M14 16a2 2 0 100 4 2 2 0 000-4z"],
    phone:        ["M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"],
    mail:         [{tag:"path",attrs:{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}},"M22 6l-10 7L2 6"],
    gift:         ["M20 12v10H4V12","M2 7h20v5H2z","M12 22V7","M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z","M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"],
    calendar:     [{tag:"rect",attrs:{x:3,y:4,width:18,height:18,rx:2,ry:2}},"M16 2v4","M8 2v4","M3 10h18"],
    search:       [{tag:"circle",attrs:{cx:11,cy:11,r:8}},"M21 21l-4.35-4.35"],
    "x":          ["M18 6L6 18","M6 6l12 12"],
    plus:         ["M12 5v14","M5 12h14"],
    edit:         ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
    "alert-triangle":["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"],
    info:         [{tag:"circle",attrs:{cx:12,cy:12,r:10}},"M12 16v-4","M12 8h.01"],
    check:        ["M20 6L9 17l-5-5"],
    "trash-2":    ["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2","M10 11v6","M14 11v6"],
    compass:      [{tag:"circle",attrs:{cx:12,cy:12,r:10}},"M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"],
    route:        [{tag:"circle",attrs:{cx:6,cy:19,r:3}},{tag:"circle",attrs:{cx:18,cy:5,r:3}},"M12 19h4.5a3.5 3.5 0 000-7h-8a3.5 3.5 0 010-7H12"],
    sun:          [{tag:"circle",attrs:{cx:12,cy:12,r:5}},"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"],
    moon:         ["M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"],
    "shield-check":["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z","M9 12l2 2 4-4"],
    zap:          ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
    users:        ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75","M9 11a4 4 0 100-8 4 4 0 000 8z"],
    list:         ["M8 6h13","M8 12h13","M8 18h13","M3 6h.01","M3 12h.01","M3 18h.01"],
    "trending-up":["M23 6l-9.5 9.5-5-5L1 18","M17 6h6v6"],
    "dollar-sign":["M12 1v22","M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"],
    "hash":       ["M4 9h16","M4 15h16","M10 3L8 21","M16 3l-2 18"],
    "grid":       [{tag:"rect",attrs:{x:3,y:3,width:7,height:7}},{tag:"rect",attrs:{x:14,y:3,width:7,height:7}},{tag:"rect",attrs:{x:14,y:14,width:7,height:7}},{tag:"rect",attrs:{x:3,y:14,width:7,height:7}}],
    "layers":     ["M12 2L2 7l10 5 10-5-10-5z","M2 17l10 5 10-5","M2 12l10 5 10-5"],
    "tag":        ["M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z","M7 7h.01"],
  };
  const elems = icons[name];
  if (!elems) return <span style={{fontSize:size,lineHeight:1,color:col,...(s||{})}}>{name.slice(0,2).toUpperCase()}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...(s||{})}}>
      {elems.map((el,i) => {
        if (typeof el === "string") return <path key={i} d={el}/>;
        const { tag: Tag, attrs } = el;
        if (Tag === "circle") return <circle key={i} {...attrs}/>;
        if (Tag === "rect") return <rect key={i} {...attrs}/>;
        if (Tag === "line") return <line key={i} x1={attrs.x1} y1={attrs.y1} x2={attrs.x2} y2={attrs.y2}/>;
        return <path key={i} {...attrs}/>;
      })}
    </svg>
  );
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Input = ({ label, ...p }) => {
  const C = useTheme();
  return (
    <div style={{marginBottom:14}}>
      {label && <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>{label}</div>}
      <input {...p} style={{width:"100%",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",...(p.style||{})}}/>
    </div>
  );
};

const Select = ({ label, children, ...p }) => {
  const C = useTheme();
  return (
    <div style={{marginBottom:14}}>
      {label && <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>{label}</div>}
      <select {...p} style={{width:"100%",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",fontFamily:"inherit",...(p.style||{})}}>{children}</select>
    </div>
  );
};

const Btn = ({ children, variant="primary", loading, style:s, ...p }) => {
  const C = useTheme();
  return (
    <button {...p} disabled={loading||p.disabled} style={{
      width:"100%", padding:"14px", borderRadius:12, fontSize:15, fontWeight:700,
      cursor:loading?"wait":"pointer", transition:"all 0.15s",
      background: variant==="primary" ? `linear-gradient(135deg,${C.accent},${C.mode==="dark"?"#00C488":"#00966A"})`
                : variant==="danger"  ? C.danger
                : variant==="purple"  ? C.purple
                : "transparent",
      color: variant==="primary" ? (C.mode==="dark"?"#0A0F1E":"#fff") : variant==="danger"||variant==="purple" ? "#fff" : C.accent,
      border: variant==="outline" ? `1.5px solid ${C.accent}` : "none",
      opacity: loading ? 0.7 : 1,
      boxShadow: variant==="primary" ? `0 6px 20px ${C.accent}40` : "none",
      ...(s||{})
    }}>{loading ? "Please wait…" : children}</button>
  );
};

const Card = ({ children, style:s, onClick }) => {
  const C = useTheme();
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:15,...(s||{})}}>{children}</div>;
};

const Badge = ({ children, color }) => {
  const C = useTheme();
  const col = color || C.accent;
  return <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:`${col}18`,color:col,border:`1px solid ${col}30`}}>{children}</span>;
};

const StatBox = ({ icon, label, value, color }) => {
  const C = useTheme();
  const col = color || C.accent;
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 10px",textAlign:"center",flex:1,minWidth:0}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><Icon name={icon} size={20} color={col}/></div>
      <div style={{fontSize:16,fontWeight:800,color:col,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div>
      <div style={{fontSize:10,color:C.muted,fontWeight:600,marginTop:1}}>{label}</div>
    </div>
  );
};

const Spinner = () => {
  const C = useTheme();
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:40}}>
      <div className="spin" style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`}}/>
    </div>
  );
};

const fmt = (n) => `KES ${(n||0).toLocaleString()}`;
const initials = (n) => (n||"").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?";
const timeAgo = (d) => {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if(s<60) return `${s}s ago`;
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString("en-KE");
};

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const C = useTheme();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("driver");
  const [form, setForm] = useState({ fullName:"", email:"", phone:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const data = mode==="login"
        ? await authApi.login({ email:form.email, password:form.password })
        : await authApi.register({ ...form, role });
      localStorage.setItem("ps_token", data.token);
      onAuth(data.user);
    } catch(e) {
      setError(e.response?.data?.error || "Something went wrong. Check your connection.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{height:"100%",overflowY:"auto",padding:"32px 24px 36px",boxSizing:"border-box"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${C.accent},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
          <Icon name="parking" size={32} color="#fff" strokeWidth={2}/>
        </div>
        <div style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:-0.5}}>ParkSmart</div>
        <div style={{fontSize:13,color:C.muted,marginTop:4}}>Smart Parking · Real Time · M-Pesa</div>
      </div>

      <div style={{display:"flex",background:C.inputBg,borderRadius:12,padding:4,marginBottom:22,border:`1px solid ${C.border}`}}>
        {[["login","Sign In"],["register","Register"]].map(([m,l])=>(
          <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"11px",borderRadius:9,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,background:mode===m?C.accent:"transparent",color:mode===m?(C.mode==="dark"?"#0A0F1E":"#fff"):C.muted,transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>

      {mode==="register" && (
        <>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[["driver","Driver"],["provider","Provider"]].map(([r,l])=>(
              <button key={r} onClick={()=>setRole(r)} style={{flex:1,padding:"11px 8px",borderRadius:11,border:`2px solid ${role===r?C.accent:C.border}`,background:role===r?C.accentSoft:"transparent",color:role===r?C.accent:C.muted,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Icon name={r==="driver"?"car":"building"} size={15} color={role===r?C.accent:C.muted}/>{l}
              </button>
            ))}
          </div>
          <ValidatedInput label="Full Name" name="fullName" placeholder="James Mwangi" value={form.fullName} onChange={e=>set("fullName",e.target.value)}/>
          <ValidatedInput label="Phone Number" name="phone" placeholder="+254 712 345 678" type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
        </>
      )}

      <ValidatedInput label="Email Address" name="email" placeholder="james@email.com" type="email" value={form.email} onChange={e=>set("email",e.target.value)}/>
      <ValidatedInput label="Password" name="password" placeholder="Min. 6 characters" type="password" value={form.password} onChange={e=>set("password",e.target.value)}/>

      {error && (
        <div style={{color:C.danger,fontSize:13,marginBottom:14,padding:"11px 13px",background:`${C.danger}12`,borderRadius:9,border:`1px solid ${C.danger}30`,display:"flex",alignItems:"center",gap:8}}>
          <Icon name="alert-triangle" size={15} color={C.danger}/>{error}
        </div>
      )}

      <Btn loading={loading} onClick={submit}>{mode==="login" ? "Sign In" : "Create Account"}</Btn>

      {mode==="register" && role==="provider" && (
        <div style={{marginTop:14,padding:"11px 13px",background:`${C.blue}10`,borderRadius:10,border:`1px solid ${C.blue}30`,fontSize:12,color:C.muted,display:"flex",gap:8,alignItems:"flex-start"}}>
          <Icon name="info" size={14} color={C.blue} style={{marginTop:1,flexShrink:0}}/>
          List your parking space and receive 80% of each booking directly via M-Pesa. ParkSmart takes 20% commission.
        </div>
      )}
    </div>
  );
}

// ─── LEAFLET MAP ──────────────────────────────────────────────────────────────
let leafletLoaded = false;
function loadLeaflet() {
  if (leafletLoaded || document.getElementById("leaflet-css")) return Promise.resolve();
  leafletLoaded = true;
  return new Promise(resolve => {
    const css = document.createElement("link");
    css.id = "leaflet-css";
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = resolve;
    document.head.appendChild(js);
  });
}

function MapView({ spots, selected, onSelect, userLocation, directions, onDirections }) {
  const C = useTheme();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [ready, setReady] = useState(!!window.L);

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    loadLeaflet().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center:[-1.286389,36.817223], zoom:13, zoomControl:false, attributionControl:false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:19 }).addTo(map);
    L.control.zoom({ position:"bottomright" }).addTo(map);
    mapInstanceRef.current = map;
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const L = window.L;
    spots.forEach(s => {
      if (!s.lat || !s.lng) return;
      const avail = s.available_spaces ?? 0;
      const color = avail===0 ? "#D93B55" : avail<=5 ? "#D4860A" : "#00B87A";
      const isSel = selected?.id === s.id;
      const icon = L.divIcon({
        className:"",
        html:`<div style="width:${isSel?46:30}px;height:${isSel?46:30}px;background:${isSel?color+"E0":"#fff"};border:2.5px solid ${color};border-radius:${isSel?"10px":"50%"};display:flex;align-items:center;justify-content:center;box-shadow:0 2px ${isSel?14:6}px ${color}60;font-size:${isSel?10:8}px;font-weight:800;color:${isSel?"#fff":color};white-space:nowrap;overflow:hidden;padding:0 4px;">${isSel?`KES ${s.price_per_hour}`:"P"}</div>`,
        iconSize:[isSel?46:30,isSel?46:30], iconAnchor:[isSel?23:15,isSel?23:15],
      });
      if (markersRef.current[s.id]) markersRef.current[s.id].setIcon(icon);
      else {
        const m = L.marker([s.lat,s.lng],{icon}).addTo(mapInstanceRef.current).on("click",()=>onSelect(s));
        markersRef.current[s.id] = m;
      }
    });
  }, [ready, spots, selected]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !selected) return;
    mapInstanceRef.current.flyTo([selected.lat, selected.lng], 16, { duration:0.8 });
  }, [ready, selected]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !userLocation) return;
    const L = window.L;
    const icon = L.divIcon({ className:"", html:`<div style="width:14px;height:14px;background:#4DA6FF;border:3px solid white;border-radius:50%;box-shadow:0 0 12px #4DA6FF80;"></div>`, iconSize:[14,14], iconAnchor:[7,7] });
    if (userMarkerRef.current) userMarkerRef.current.setLatLng(userLocation);
    else userMarkerRef.current = L.marker(userLocation,{icon,zIndexOffset:1000}).addTo(mapInstanceRef.current);
  }, [ready, userLocation]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    if (!directions?.route) return;
    routeLayerRef.current = window.L.polyline(directions.route, { color:"#4DA6FF", weight:5, opacity:0.85, dashArray:"8,4" }).addTo(map);
    map.fitBounds(routeLayerRef.current.getBounds(), { padding:[30,30] });
  }, [ready, directions]);

  return (
    <div style={{position:"relative",width:"100%",borderRadius:18,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:10}}>
      <div ref={mapRef} style={{width:"100%",height:220}}/>
      {!ready && (
        <div style={{position:"absolute",inset:0,background:C.card,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div className="spin" style={{width:28,height:28,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`}}/>
        </div>
      )}
      <div style={{position:"absolute",top:8,left:8,background:"#00000088",backdropFilter:"blur(8px)",borderRadius:7,padding:"3px 9px",fontSize:10,color:"#ccd",display:"flex",alignItems:"center",gap:5,pointerEvents:"none"}}>
        <Icon name="map-pin" size={11} color="#aab" strokeWidth={2}/>Nairobi
      </div>
      <div style={{position:"absolute",top:8,right:8,background:"#00000088",backdropFilter:"blur(8px)",borderRadius:7,padding:"3px 9px",fontSize:10,color:C.accent,pointerEvents:"none"}}>
        {spots.filter(s=>(s.available_spaces??0)>0).length}/{spots.length} free
      </div>
      {selected && (
        <button onClick={()=>onDirections(selected)} style={{position:"absolute",bottom:8,right:8,background:C.blue,border:"none",borderRadius:20,padding:"6px 13px",fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer",boxShadow:"0 2px 12px #4DA6FF60",display:"flex",alignItems:"center",gap:5}}>
          <Icon name="navigation" size={12} color="#fff" strokeWidth={2.5}/>Directions
        </button>
      )}
    </div>
  );
}

// ─── DIRECTIONS PANEL ─────────────────────────────────────────────────────────
function DirectionsPanel({ spot, userLocation, directions, loading, onClose }) {
  const C = useTheme();
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:15,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:C.text,display:"flex",alignItems:"center",gap:7}}>
            <Icon name="compass" size={16} color={C.blue}/>Directions to {spot.name}
          </div>
          {directions && !loading && (
            <div style={{fontSize:12,color:C.muted,marginTop:3,display:"flex",gap:12,paddingLeft:23}}>
              <span>{directions.distanceKm} km</span>
              <span>~{directions.durationMin} min drive</span>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{background:C.inputBg,border:`1px solid ${C.border}`,color:C.muted,width:30,height:30,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name="x" size={14} color={C.muted}/>
        </button>
      </div>

      {loading && (
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",color:C.muted,fontSize:13}}>
          <div className="spin" style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,flexShrink:0}}/>
          Calculating route…
        </div>
      )}

      {!loading && !userLocation && (
        <div style={{fontSize:12,color:C.warn,padding:"6px 0",display:"flex",alignItems:"center",gap:6}}>
          <Icon name="alert-triangle" size={14} color={C.warn}/>Enable location access to get directions
        </div>
      )}

      {!loading && directions?.steps?.length > 0 && (
        <div style={{maxHeight:140,overflowY:"auto"}}>
          {directions.steps.map((step,i) => (
            <div key={i} style={{display:"flex",gap:9,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:C.accentSoft,border:`1px solid ${C.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,fontWeight:800,color:C.accent}}>{i+1}</div>
              <div>
                <div style={{fontSize:12,color:C.text,lineHeight:1.4}}>{step.instruction}</div>
                {step.distance > 0 && <div style={{fontSize:10,color:C.muted,marginTop:1}}>{step.distance<1000?`${Math.round(step.distance)}m`:`${(step.distance/1000).toFixed(1)}km`}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=driving`} target="_blank" rel="noreferrer"
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginTop:10,padding:"10px",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12,fontWeight:700,color:C.blue,textDecoration:"none"}}>
        <Icon name="map" size={14} color={C.blue}/>Open in Google Maps
      </a>
      <a href={`https://waze.com/ul?ll=${spot.lat},${spot.lng}&navigate=yes`} target="_blank" rel="noreferrer"
        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginTop:7,padding:"10px",background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12,fontWeight:700,color:C.accent,textDecoration:"none"}}>
        <Icon name="route" size={14} color={C.accent}/>Open in Waze
      </a>
    </div>
  );
}

// ─── SPOT CARD ────────────────────────────────────────────────────────────────
function SpotCard({ spot, onClick, onDirections, isPinned }) {
  const C = useTheme();
  const avail = spot.available_spaces ?? 0;
  const total = spot.total_spaces ?? 1;
  const color = avail===0 ? C.danger : avail<=5 ? C.warn : C.accent;
  const pct = total > 0 ? Math.round((avail/total)*100) : 0;

  return (
    <div style={{
      background: isPinned ? (C.mode==="dark"?"#0D2035":"#EBF8FF") : C.card,
      border: `1.5px solid ${isPinned ? C.accent : C.border}`,
      borderRadius:18, padding:"0 0 12px", marginBottom:10, cursor:"pointer",
      opacity:avail===0?0.7:1, transition:"all 0.2s",
      boxShadow: isPinned ? `0 4px 20px ${C.accent}25` : "none",
      overflow:"hidden",
    }}>
      {/* Top accent bar */}
      <div style={{height:4,background:`linear-gradient(90deg,${color},${color}44)`,borderRadius:"18px 18px 0 0",marginBottom:12}}/>

      {isPinned && (
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 14px",marginBottom:8}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.accent,boxShadow:`0 0 6px ${C.accent}`}}/>
          <span style={{fontSize:10,fontWeight:800,color:C.accent,letterSpacing:1,textTransform:"uppercase"}}>Selected on map</span>
        </div>
      )}

      <div onClick={()=>onClick(spot)} style={{padding:"0 14px"}}>
        {/* Header row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div style={{flex:1,minWidth:0,marginRight:10}}>
            <div style={{display:"flex",gap:5,marginBottom:5,alignItems:"center",flexWrap:"wrap"}}>
              <Badge color={avail===0?C.danger:C.accent}>{spot.type||"Parking"}</Badge>
              <span style={{fontSize:11,color:C.muted,fontWeight:600}}>{spot.area}</span>
            </div>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:3,lineHeight:1.3}}>{spot.name}</div>
            <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
              <Icon name="map-pin" size={12} color={C.muted} strokeWidth={2.5}/>{spot.address}
            </div>
            {spot.amenities?.length > 0 && (
              <div style={{fontSize:10,color:C.muted,marginTop:4,display:"flex",gap:6,flexWrap:"wrap"}}>
                {spot.amenities.slice(0,3).map(a=>(
                  <span key={a} style={{background:C.inputBg,borderRadius:6,padding:"1px 6px"}}>{a}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:20,fontWeight:900,color:C.accent,letterSpacing:-0.5}}>KES {spot.price_per_hour}</div>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>/ hour</div>
            <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
              <Icon name="star" size={12} color={C.warn} strokeWidth={2.5}/>
              <span style={{fontSize:12,fontWeight:700,color:C.warn}}>{spot.rating||"4.5"}</span>
            </div>
          </div>
        </div>

        {/* Availability visual — segmented bar */}
        <div style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:11,color,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:color,display:"inline-block",boxShadow:`0 0 5px ${color}`}}/>
              {avail===0 ? "Full — no spaces" : avail<=5 ? `Only ${avail} of ${total} left` : `${avail} of ${total} spaces free`}
            </span>
            <span style={{fontSize:11,fontWeight:800,color}}>{pct}%</span>
          </div>
          <div style={{width:"100%",height:5,background:C.border,borderRadius:5,overflow:"hidden"}}>
            <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color},${color}BB)`,borderRadius:5,transition:"width 0.6s ease"}}/>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div style={{display:"flex",gap:8,padding:"8px 14px 0",borderTop:`1px solid ${C.border}`}}>
        <button onClick={()=>onClick(spot)} style={{flex:2,padding:"9px",background:avail===0?C.inputBg:`linear-gradient(135deg,${C.accent},${C.mode==="dark"?"#00C488":"#009E6A"})`,border:"none",borderRadius:11,color:avail===0?C.muted:(C.mode==="dark"?"#0A0F1E":"#fff"),fontSize:12,fontWeight:800,cursor:avail===0?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <Icon name="parking" size={14} color={avail===0?C.muted:(C.mode==="dark"?"#0A0F1E":"#fff")} strokeWidth={2.5}/>
          {avail===0 ? "Unavailable" : "Reserve Spot"}
        </button>
        {onDirections && (
          <button onClick={e=>{ e.stopPropagation(); onDirections(spot); }} style={{flex:1,padding:"9px",background:C.inputBg,border:`1.5px solid ${C.blue}40`,borderRadius:11,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            <Icon name="navigation" size={14} color={C.blue} strokeWidth={2.5}/>Nav
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SPOT NUMBER PICKER ───────────────────────────────────────────────────────
// takenSpots: array of numbers already reserved (passed in from parent / backend)
function SpotNumberPicker({ total, available, selected, onSelect, takenSpots = [] }) {
  const C = useTheme();
  const count = Math.min(total || 20, 40);
  // Build grid: slots 1..count. Last (total - available) slots beyond takenSpots are "soft-taken"
  const takenSet = new Set(takenSpots.map(Number));
  // Fill remaining taken slots from the end if takenSpots < (total - available)
  const hardTaken = total - available;
  const autoTaken = new Set(takenSet);
  if (autoTaken.size < hardTaken) {
    for (let i = count; i >= 1 && autoTaken.size < hardTaken; i--) {
      autoTaken.add(i);
    }
  }

  return (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
        <Icon name="grid" size={13} color={C.accent} strokeWidth={2.5}/>Choose Spot Number
        <span style={{marginLeft:"auto",fontSize:10,color:C.muted,fontWeight:500,textTransform:"none"}}>{available} of {total} free</span>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:14,marginBottom:10}}>
        {[[C.accent,"Available"],[C.inputBg,"Taken"],[C.blue,"Yours"]].map(([col,lbl])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
            <div style={{width:12,height:12,borderRadius:3,background:col,border:`1px solid ${col}60`}}/>
            {lbl}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,maxHeight:170,overflowY:"auto",paddingRight:2}}>
        {Array.from({length:count},(_,i)=>i+1).map(num => {
          const taken = autoTaken.has(num) && num !== selected;
          const isSelected = selected === num;
          return (
            <button key={num} disabled={taken} onClick={()=>onSelect(isSelected ? null : num)}
              style={{
                aspectRatio:"1",padding:"8px 2px",borderRadius:10,
                border:`1.5px solid ${isSelected?C.blue:taken?C.border:`${C.accent}50`}`,
                background:isSelected?C.blue:taken?C.inputBg:`${C.accent}12`,
                color:isSelected?"#fff":taken?C.border:C.accent,
                fontSize:13,fontWeight:800,cursor:taken?"not-allowed":"pointer",
                transition:"all 0.15s",position:"relative",opacity:taken?0.4:1,
              }}>
              {num}
              {isSelected && (
                <div style={{position:"absolute",top:-5,right:-5,width:14,height:14,borderRadius:"50%",background:C.accent,border:`2px solid ${C.card}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Icon name="check" size={8} color={C.mode==="dark"?"#0A0F1E":"#fff"} strokeWidth={3}/>
                </div>
              )}
              {taken && (
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:10}}>
                  <Icon name="x" size={12} color={C.border} strokeWidth={2.5}/>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selected ? (
        <div style={{marginTop:9,padding:"9px 12px",background:`${C.blue}15`,borderRadius:10,border:`1px solid ${C.blue}40`,fontSize:12,color:C.blue,fontWeight:700,display:"flex",alignItems:"center",gap:7}}>
          <Icon name="check-circle" size={15} color={C.blue} strokeWidth={2.5}/>
          Spot <span style={{fontSize:14,fontWeight:900,margin:"0 3px"}}>#{selected}</span> locked for you · unavailable to others until you exit
        </div>
      ) : (
        <div style={{marginTop:7,fontSize:11,color:C.muted,textAlign:"center"}}>Tap a green slot to select your space</div>
      )}
    </div>
  );
}
function getNowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}
function addHoursToTime(timeStr, hrs) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + Math.round(hrs * 60);
  return `${String(Math.floor(total/60)%24).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function timeDiffHours(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.max(0.5, parseFloat((mins / 60).toFixed(2)));
}
function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${ampm}`;
}

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
function BookingModal({ spot, user, onClose, onSuccess }) {
  const C = useTheme();
  const nowTime = getNowTime();
  const [startTime, setStartTime] = useState(nowTime);
  const [endTime, setEndTime] = useState(addHoursToTime(nowTime, 1));
  const [plate, setPlate] = useState((user?.vehicles||[])[0]||"");
  const [phone, setPhone] = useState(user?.phone||"");
  const [spotNumber, setSpotNumber] = useState(null);
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");

  const hours = timeDiffHours(startTime, endTime);
  const total = Math.round((spot.price_per_hour||0) * hours);
  const avail = spot.available_spaces ?? 0;
  const quickDurations = [0.5, 1, 2, 3, 4, 6];

  const setDuration = (hrs) => setEndTime(addHoursToTime(startTime, hrs));
  const handleStartChange = (val) => { setStartTime(val); setEndTime(addHoursToTime(val, hours)); };

  const book = async () => {
    if (!plate.trim()) return setError("Please enter your vehicle plate number");
    if (!phone.trim()) return setError("Please enter your M-Pesa phone number");
    if (hours < 0.5) return setError("Minimum parking time is 30 minutes");
    setError(""); setStep("paying");
    try {
      const { booking } = await bookingsApi.create({ spotId:spot.id, hours:parseFloat(hours.toFixed(2)), vehiclePlate:plate.trim(), startTime, endTime, spotNumber });
      await paymentsApi.stkPush({ phone:phone.trim(), amount:booking.total_amount, bookingId:booking.id });
      setTimeout(() => onSuccess({ ...booking, startTime, endTime, spot_lat: spot.lat, spot_lng: spot.lng, spotNumber }), 3500);
    } catch(e) {
      setError(e.response?.data?.error || "Booking failed. Please try again.");
      setStep("form");
    }
  };

  return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(5px)",zIndex:200,display:"flex",alignItems:"flex-end",borderRadius:44}}>
      <div className="slide-up" style={{width:"100%",background:C.card,borderRadius:"24px 24px 0 0",border:`1px solid ${C.border}`,padding:"22px 20px 36px",boxSizing:"border-box",maxHeight:"90%",overflowY:"auto"}}>

        {step==="paying" ? (
          <div style={{textAlign:"center",padding:"28px 0"}}>
            <div className="spin" style={{width:52,height:52,borderRadius:"50%",border:`4px solid ${C.border}`,borderTop:`4px solid ${C.accent}`,margin:"0 auto 20px"}}/>
            <div style={{fontSize:18,fontWeight:800,color:C.text}}>M-Pesa STK Push Sent!</div>
            <div style={{fontSize:13,color:C.muted,marginTop:8}}>Check your phone and enter your PIN</div>
            <div style={{fontSize:15,color:C.accent,fontWeight:700,marginTop:6}}>{phone}</div>
            <div style={{fontSize:14,color:C.text,marginTop:4}}>KES {total.toLocaleString()}</div>
            {spotNumber && <div style={{marginTop:8,fontSize:13,color:C.muted}}>Spot <span style={{color:C.accent,fontWeight:800}}>#{spotNumber}</span> held for you</div>}
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div style={{flex:1,marginRight:10}}>
                <div style={{fontSize:17,fontWeight:800,color:C.text}}>{spot.name}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2,display:"flex",alignItems:"center",gap:4}}>
                  <Icon name="map-pin" size={12} color={C.muted} strokeWidth={2.5}/>{spot.address}
                </div>
                <div style={{fontSize:12,marginTop:5,fontWeight:700,color:avail===0?C.danger:C.accent}}>
                  {avail===0 ? "Currently Full" : `${avail} of ${spot.total_spaces||"?"} spaces available`}
                </div>
              </div>
              <button onClick={onClose} style={{background:C.inputBg,border:`1px solid ${C.border}`,width:34,height:34,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon name="x" size={15} color={C.text} strokeWidth={2.5}/>
              </button>
            </div>

            {avail === 0 ? (
              <div style={{padding:"20px",textAlign:"center",color:C.muted,fontSize:14}}>
                This spot is currently full. Please check back later or choose another location.
              </div>
            ) : (
              <>
                <ValidatedInput label="Vehicle Plate Number" name="plate" placeholder="e.g. KBX 123D" value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} style={{fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase"}}/>

                {/* Numbered spot picker */}
                <SpotNumberPicker
                  total={spot.total_spaces || 20}
                  available={avail}
                  selected={spotNumber}
                  onSelect={setSpotNumber}
                  takenSpots={spot.taken_spots || []}
                />

                {/* Time picker */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10}}>Parking Duration</div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>Start</div>
                      <input type="time" value={startTime} onChange={e=>handleStartChange(e.target.value)}
                        style={{width:"100%",background:C.inputBg,border:`1.5px solid ${C.accent}50`,borderRadius:10,padding:"10px",fontSize:15,fontWeight:700,color:C.accent,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textAlign:"center"}}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",paddingTop:20,color:C.muted,fontSize:18,fontWeight:300}}>→</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>End</div>
                      <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}
                        style={{width:"100%",background:C.inputBg,border:`1.5px solid ${C.blue}50`,borderRadius:10,padding:"10px",fontSize:15,fontWeight:700,color:C.blue,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textAlign:"center"}}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
                    {quickDurations.map(d => {
                      const label = d < 1 ? "30 min" : `${d}hr${d>1?"s":""}`;
                      const isActive = Math.abs(hours - d) < 0.1;
                      return (
                        <button key={d} onClick={()=>setDuration(d)} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",background:isActive?C.accent:C.accentSoft,color:isActive?(C.mode==="dark"?"#0A0F1E":"#fff"):C.accent,border:`1.5px solid ${isActive?C.accent:C.accent+"40"}`,transition:"all 0.15s"}}>{label}</button>
                      );
                    })}
                  </div>
                  <div style={{background:C.inputBg,borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Duration</div>
                      <div style={{fontSize:19,fontWeight:800,color:C.text,marginTop:2}}>
                        {hours < 1 ? "30 min" : hours === Math.floor(hours) ? `${hours} hr${hours>1?"s":""}` : `${Math.floor(hours)}h ${Math.round((hours%1)*60)}m`}
                      </div>
                      <div style={{fontSize:11,color:C.muted,marginTop:1}}>{fmtTime(startTime)} → {fmtTime(endTime)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Total</div>
                      <div style={{fontSize:26,fontWeight:900,color:C.accent,letterSpacing:-0.5}}>KES {total.toLocaleString()}</div>
                      <div style={{fontSize:10,color:C.muted}}>KES {spot.price_per_hour}/hr</div>
                    </div>
                  </div>
                </div>

                <ValidatedInput label="M-Pesa Phone Number" name="mpesaPhone" placeholder="+254 712 345 678" type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/>

                {error && (
                  <div style={{color:C.danger,fontSize:13,marginBottom:14,padding:"11px 13px",background:`${C.danger}12`,borderRadius:9,border:`1px solid ${C.danger}30`,display:"flex",alignItems:"center",gap:8}}>
                    <Icon name="alert-triangle" size={15} color={C.danger} strokeWidth={2.5}/>{error}
                  </div>
                )}

                <Btn onClick={book}>
                  Reserve{spotNumber ? ` Spot #${spotNumber}` : ""} · Pay KES {total.toLocaleString()}
                </Btn>
                <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <Icon name="shield-check" size={13} color={C.muted} strokeWidth={2}/>Secure M-Pesa payment · 80% to provider
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────
function SuccessScreen({ booking, onDone }) {
  const C = useTheme();
  const lat = booking.spot_lat || booking.spotLat;
  const lng = booking.spot_lng || booking.spotLng;
  const spotName = booking.spot_name || booking.spotName || "Destination";

  const openGoogleMaps = () => {
    const url = lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spotName)}`;
    window.open(url, "_blank");
  };

  const openWaze = () => {
    if (lat && lng) window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, "_blank");
    else window.open(`https://waze.com/ul?q=${encodeURIComponent(spotName)}&navigate=yes`, "_blank");
  };

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:24,textAlign:"center"}}>
      <div className="pop-in" style={{width:78,height:78,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.mode==="dark"?"#00C488":"#00966A"})`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:`0 0 30px ${C.accent}60`}}>
        <Icon name="check" size={38} color="#fff" strokeWidth={3}/>
      </div>
      <div style={{fontSize:24,fontWeight:800,color:C.text,marginBottom:6}}>Spot Reserved!</div>
      <div style={{fontSize:14,color:C.muted,marginBottom:24}}>Check your phone for M-Pesa confirmation</div>

      <Card style={{width:"100%",marginBottom:16}}>
        {[
          ["Booking ID", booking.id],
          ["Location", spotName],
          ["Vehicle", booking.vehicle_plate||booking.vehiclePlate],
          ["Duration", `${booking.hours} hour${booking.hours>1?"s":""}`],
          ["Total Paid", `KES ${(booking.total_amount||0).toLocaleString()}`],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,color:C.muted}}>{k}</span>
            <span style={{fontSize:13,fontWeight:700,color:C.text,maxWidth:"55%",textAlign:"right",wordBreak:"break-word"}}>{v}</span>
          </div>
        ))}
      </Card>

      {/* Navigate now — primary actions */}
      <div style={{width:"100%",marginBottom:10}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10,textAlign:"left"}}>Navigate to Parking</div>
        <button onClick={openGoogleMaps} style={{width:"100%",padding:"13px",borderRadius:12,border:`1.5px solid ${C.blue}`,background:`${C.blue}15`,color:C.blue,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:9,marginBottom:8}}>
          <Icon name="map" size={18} color={C.blue}/>Open in Google Maps
        </button>
        <button onClick={openWaze} style={{width:"100%",padding:"13px",borderRadius:12,border:`1.5px solid ${C.accent}`,background:C.accentSoft,color:C.accent,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
          <Icon name="route" size={18} color={C.accent}/>Open in Waze
        </button>
      </div>

      {/* Secondary — back to explore */}
      <button onClick={onDone} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",marginTop:4,textDecoration:"underline"}}>
        Back to Explore
      </button>
    </div>
  );
}

// ─── ACCOUNT SCREEN ───────────────────────────────────────────────────────────
function AccountScreen({ user, setUser, onLogout }) {
  const C = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName:user.full_name||"", phone:user.phone||"", vehicles:user.vehicles||[], currentPassword:"", newPassword:"" });
  const [vi, setVi] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type:"", text:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const addVehicle = () => {
    const v = vi.trim().toUpperCase();
    if (!v || form.vehicles.includes(v)) return;
    set("vehicles", [...form.vehicles, v]);
    setVi("");
  };

  const save = async () => {
    setMsg({ type:"", text:"" }); setLoading(true);
    try {
      const payload = { fullName:form.fullName, phone:form.phone, vehicles:form.vehicles };
      if (form.newPassword) { payload.currentPassword=form.currentPassword; payload.newPassword=form.newPassword; }
      const data = await authApi.update(payload);
      setUser(data.user);
      setMsg({ type:"ok", text:"Profile updated successfully!" });
      setEditing(false);
      setForm(f=>({...f, currentPassword:"", newPassword:""}));
    } catch(e) {
      setMsg({ type:"err", text:e.response?.data?.error||"Update failed" });
    } finally { setLoading(false); }
  };

  const profileFields = [
    ["user", "Full Name", user.full_name||"—"],
    ["mail", "Email", user.email],
    ["phone", "Phone", user.phone||"Not set"],
    ["car", "Vehicles", (user.vehicles||[]).length>0 ? (user.vehicles||[]).join(", ") : "None added"],
    ["gift", "Loyalty Points", `${user.loyalty_points||0} pts`],
    ["calendar", "Member Since", user.created_at ? new Date(user.created_at).toLocaleDateString("en-KE",{month:"long",year:"numeric"}) : "—"],
  ];

  return (
    <div style={{height:"100%",overflowY:"auto",padding:"16px 16px 80px",boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontSize:22,fontWeight:800,color:C.text}}>My Account</div>
        <button onClick={()=>{setEditing(!editing);setMsg({type:"",text:""}); }} style={{background:editing?C.accentSoft:C.inputBg,border:`1px solid ${editing?C.accent:C.border}`,color:editing?C.accent:C.muted,borderRadius:20,padding:"7px 15px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <Icon name={editing?"x":"edit"} size={13} color={editing?C.accent:C.muted}/>{editing?"Cancel":"Edit"}
        </button>
      </div>

      <div style={{background:`linear-gradient(135deg,${C.accent}18,${C.blue}0a)`,border:`1px solid ${C.accent}25`,borderRadius:18,padding:18,marginBottom:18,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},${C.mode==="dark"?"#00C488":"#00966A"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff",flexShrink:0}}>
          {initials(user.full_name||"")}
        </div>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>{user.full_name}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>{user.email}</div>
          <div style={{fontSize:12,color:C.accent,marginTop:4,display:"flex",alignItems:"center",gap:5}}>
            <Icon name="gift" size={13} color={C.accent}/>{user.loyalty_points||0} loyalty points
          </div>
        </div>
      </div>

      {editing ? (
        <div>
          <ValidatedInput label="Full Name" name="fullName" value={form.fullName} onChange={e=>set("fullName",e.target.value)} placeholder="Your full name"/>
          <ValidatedInput label="Phone Number" name="phone" value={form.phone} onChange={e=>set("phone",e.target.value)} type="tel" placeholder="+254 712 345 678"/>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8}}>My Vehicles</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {form.vehicles.map(v => (
                <div key={v} style={{display:"flex",alignItems:"center",gap:5,background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 11px"}}>
                  <span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:C.text}}>{v}</span>
                  <button onClick={()=>set("vehicles",form.vehicles.filter(x=>x!==v))} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",display:"flex",alignItems:"center"}}>
                    <Icon name="x" size={12} color={C.danger}/>
                  </button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={vi} onChange={e=>setVi(e.target.value.toUpperCase())} onKeyDown={e=>{ if(e.key==="Enter") addVehicle(); }} placeholder="Add plate e.g. KBX 123D"
                style={{flex:1,background:C.inputBg,border:`1.5px solid ${vi&&validate.plate&&!validate.plate(vi.toUpperCase())?C.accent:C.border}`,borderRadius:10,padding:"11px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}/>
              <button onClick={addVehicle} style={{background:C.accentSoft,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"11px 15px",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Add</button>
            </div>
            {vi && validate.plate && validate.plate(vi.toUpperCase()) && (
              <div style={{fontSize:11,color:C.danger,marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                <Icon name="alert-triangle" size={11} color={C.danger} strokeWidth={2.5}/>{validate.plate(vi.toUpperCase())}
              </div>
            )}
          </div>
          <Card style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:12,letterSpacing:0.8,textTransform:"uppercase"}}>Change Password</div>
            <Input label="Current Password" type="password" placeholder="Current password" value={form.currentPassword} onChange={e=>set("currentPassword",e.target.value)}/>
            <ValidatedInput label="New Password" name="password" type="password" placeholder="New password (min 6 chars)" value={form.newPassword} onChange={e=>set("newPassword",e.target.value)}/>
          </Card>
          {msg.text && (
            <div style={{color:msg.type==="ok"?C.accent:C.danger,fontSize:13,marginBottom:14,padding:"11px 13px",background:msg.type==="ok"?C.accentSoft:`${C.danger}12`,borderRadius:9,display:"flex",alignItems:"center",gap:8}}>
              <Icon name={msg.type==="ok"?"check-circle":"x-circle"} size={15} color={msg.type==="ok"?C.accent:C.danger}/>{msg.text}
            </div>
          )}
          <Btn loading={loading} onClick={save}>Save Changes</Btn>
        </div>
      ) : (
        <div>
          {profileFields.map(([icon,label,value]) => (
            <Card key={label} style={{marginBottom:8,display:"flex",alignItems:"center",gap:13}}>
              <div style={{width:36,height:36,borderRadius:10,background:C.inputBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon name={icon} size={16} color={C.accent}/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginTop:2}}>{value}</div>
              </div>
            </Card>
          ))}
          <div style={{marginTop:16}}>
            <Btn onClick={onLogout} style={{background:"transparent",border:`1.5px solid ${C.danger}`,color:C.danger,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <Icon name="log-out" size={16} color={C.danger}/>Sign Out
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PARKING LIFECYCLE STATES ────────────────────────────────────────────────
// pending   → booking exists, start time not yet reached
// pre-warn  → 5 min before start time
// active    → parking time running
// expiring  → last 10 min of booked time
// overdue-grace → extra fee charged, 15 min grace window (once)
// grace     → paid overdue fee, 5-min allowance
// overstay  → 5-min grace elapsed, barrier holds car
// done      → exited

function useParkingLifecycle(booking) {
  const [state, setState] = useState("pending");
  const [now, setNow] = useState(Date.now());
  const [extraFeePaid, setExtraFeePaid] = useState(false);
  const [gracePaidAt, setGracePaidAt] = useState(null);

  useEffect(() => {
    if (booking.status !== "confirmed" || booking.payment_status !== "paid") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [booking]);

  useEffect(() => {
    if (booking.status !== "confirmed" || booking.payment_status !== "paid") return;

    // Resolve start and end timestamps from booking
    const startMs = (() => {
      if (booking.start_time) {
        // start_time may be HH:MM string or ISO
        if (booking.start_time.includes("T")) return new Date(booking.start_time).getTime();
        // HH:MM relative to created_at date
        const d = new Date(booking.created_at);
        const [h,m] = booking.start_time.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        return d.getTime();
      }
      return new Date(booking.created_at).getTime();
    })();

    const endMs = (() => {
      if (booking.end_time) {
        if (booking.end_time.includes("T")) return new Date(booking.end_time).getTime();
        const d = new Date(booking.created_at);
        const [h,m] = booking.end_time.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        if (d.getTime() <= startMs) d.setDate(d.getDate()+1);
        return d.getTime();
      }
      return startMs + (booking.hours||1)*3600*1000;
    })();

    const preWarnMs = startMs - 5*60*1000;       // 5 min before start
    const expiringMs = endMs - 10*60*1000;        // last 10 min
    const overdueEndMs = endMs + 15*60*1000;      // 15 min grace window
    const graceEndMs = gracePaidAt ? gracePaidAt + 5*60*1000 : null;

    const t = now;
    if (t < preWarnMs) setState("pending");
    else if (t < startMs) setState("pre-warn");
    else if (t < expiringMs) setState("active");
    else if (t < endMs) setState("expiring");
    else if (!extraFeePaid && t < overdueEndMs) setState("overdue-grace");
    else if (extraFeePaid && graceEndMs && t < graceEndMs) setState("grace");
    else if (extraFeePaid && graceEndMs && t >= graceEndMs) setState("overstay");
    else if (!extraFeePaid && t >= overdueEndMs) setState("overstay");
    else setState("active");

  }, [now, booking, extraFeePaid, gracePaidAt]);

  const startMs = (() => {
    if (booking.start_time) {
      if (typeof booking.start_time === "string" && booking.start_time.includes("T"))
        return new Date(booking.start_time).getTime();
      const d = new Date(booking.created_at);
      const [h,m] = (booking.start_time||"").split(":").map(Number);
      if (!isNaN(h)) { d.setHours(h, m, 0, 0); return d.getTime(); }
    }
    return new Date(booking.created_at).getTime();
  })();

  const endMs = (() => {
    if (booking.end_time) {
      if (typeof booking.end_time === "string" && booking.end_time.includes("T"))
        return new Date(booking.end_time).getTime();
      const d = new Date(booking.created_at);
      const [h,m] = (booking.end_time||"").split(":").map(Number);
      if (!isNaN(h)) {
        d.setHours(h, m, 0, 0);
        if (d.getTime() <= startMs) d.setDate(d.getDate()+1);
        return d.getTime();
      }
    }
    return startMs + (booking.hours||1)*3600*1000;
  })();

  return { state, now, startMs, endMs, extraFeePaid, setExtraFeePaid, gracePaidAt, setGracePaidAt };
}

// ─── SMART COUNTDOWN TIMER ───────────────────────────────────────────────────
function CountdownTimer({ booking, onExtraFeeTriggered }) {
  const C = useTheme();
  const { state, now, startMs, endMs, extraFeePaid, setExtraFeePaid, gracePaidAt, setGracePaidAt } = useParkingLifecycle(booking);
  const [extraFeePrompt, setExtraFeePrompt] = useState(false);
  const [leaveTime, setLeaveTime] = useState("");
  const [extraFeeTriggeredOnce, setExtraFeeTriggeredOnce] = useState(false);

  // Trigger extra fee prompt once when entering overdue-grace
  useEffect(() => {
    if (state === "overdue-grace" && !extraFeeTriggeredOnce && !extraFeePaid) {
      setExtraFeeTriggeredOnce(true);
      setExtraFeePrompt(true);
      // Pre-fill leave time to 15 min from now
      const d = new Date(Date.now() + 15*60*1000);
      setLeaveTime(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`);
      if (onExtraFeeTriggered) onExtraFeeTriggered(booking);
    }
  }, [state, extraFeeTriggeredOnce, extraFeePaid]);

  const handlePayExtraFee = () => {
    // Calculate extra fee based on proposed leave time
    const now = Date.now();
    const leaveMs = leaveTime
      ? (() => { const d = new Date(); const [h,m] = leaveTime.split(":").map(Number); d.setHours(h,m,0,0); if(d.getTime() < now) d.setDate(d.getDate()+1); return d.getTime(); })()
      : endMs + 15*60*1000;
    const overMins = Math.max(15, Math.ceil((leaveMs - endMs) / 60000));
    const rate = (booking.price_per_hour || booking.total_amount / booking.hours) || 100;
    const extraFee = Math.ceil((overMins / 60) * rate * 1.5); // 1.5x for overstay
    setExtraFeePrompt(false);
    setExtraFeePaid(true);
    setGracePaidAt(Date.now());
    if (onExtraFeeTriggered) onExtraFeeTriggered(booking, extraFee, overMins);
  };

  if (booking.status !== "confirmed" || booking.payment_status !== "paid") return null;

  const pad = n => String(n).padStart(2,"0");
  const fmtMs = ms => {
    const s = Math.max(0, Math.floor(ms/1000));
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    return { h, m, sec, total: s };
  };

  // ── PENDING: show pre-start countdown ──
  if (state === "pending" || state === "pre-warn") {
    const diff = startMs - now;
    const { h, m, sec } = fmtMs(diff);
    const isPre = state === "pre-warn";
    return (
      <div style={{background:isPre?`${C.warn}12`:C.accentSoft,border:`1.5px solid ${isPre?C.warn:C.accent}30`,borderRadius:12,padding:"12px 14px",marginTop:8}}>
        <div style={{fontSize:11,fontWeight:700,color:isPre?C.warn:C.accent,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
          <Icon name="clock" size={14} color={isPre?C.warn:C.accent} strokeWidth={2.5}/>
          {isPre ? "⚠ Parking starts in less than 5 minutes!" : "Parking starts in"}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"baseline"}}>
          {h > 0 && <><span style={{fontSize:28,fontWeight:900,color:isPre?C.warn:C.accent}}>{h}</span><span style={{fontSize:11,color:C.muted}}>hr</span></>}
          <span style={{fontSize:28,fontWeight:900,color:isPre?C.warn:C.accent}}>{pad(m)}</span>
          <span style={{fontSize:11,color:C.muted}}>min</span>
          <span style={{fontSize:28,fontWeight:900,color:isPre?C.warn:C.accent}}>{pad(sec)}</span>
          <span style={{fontSize:11,color:C.muted}}>sec</span>
        </div>
        <div style={{fontSize:11,color:C.muted,marginTop:5}}>
          Session starts at {new Date(startMs).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>
    );
  }

  // ── ACTIVE / EXPIRING: main countdown ──
  if (state === "active" || state === "expiring") {
    const diff = endMs - now;
    const { h, m, sec, total } = fmtMs(diff);
    const totalDuration = (booking.hours||1)*3600;
    const pct = Math.min(100,(total/totalDuration)*100);
    const isExpiring = state === "expiring";
    const timerColor = isExpiring ? C.danger : pct < 50 ? C.warn : C.accent;
    const r = 28, circ = 2*Math.PI*r, dash = (pct/100)*circ;

    return (
      <div style={{background:isExpiring?`${C.danger}08`:C.accentSoft,border:`1.5px solid ${timerColor}30`,borderRadius:12,padding:"12px 14px",marginTop:8}}>
        {isExpiring && (
          <div style={{background:`${C.danger}15`,border:`1px solid ${C.danger}30`,borderRadius:8,padding:"8px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
            <Icon name="alert-triangle" size={15} color={C.danger} strokeWidth={2.5}/>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:C.danger}}>Less than 10 minutes remaining!</div>
              <div style={{fontSize:10,color:C.muted}}>Extra fee applies after time expires</div>
            </div>
          </div>
        )}
        <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
          <Icon name="clock" size={12} color={C.muted}/>Time Remaining
        </div>
        <div style={{display:"flex",alignItems:"center",gap:13}}>
          <div style={{position:"relative",width:70,height:70,flexShrink:0}}>
            <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
              <circle cx="35" cy="35" r={r} fill="none" stroke={C.border} strokeWidth="5"/>
              <circle cx="35" cy="35" r={r} fill="none" stroke={timerColor} strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{transition:"stroke-dasharray 1s linear,stroke 0.5s"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:11,fontWeight:800,color:timerColor}}>{pad(m)}:{pad(sec)}</div>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:5,alignItems:"baseline"}}>
              {h>0&&<><span style={{fontSize:28,fontWeight:800,color:timerColor,lineHeight:1}}>{h}</span><span style={{fontSize:11,color:C.muted}}>hr</span></>}
              <span style={{fontSize:28,fontWeight:800,color:timerColor,lineHeight:1}}>{pad(m)}</span>
              <span style={{fontSize:11,color:C.muted}}>min</span>
              <span style={{fontSize:28,fontWeight:800,color:timerColor,lineHeight:1}}>{pad(sec)}</span>
              <span style={{fontSize:11,color:C.muted}}>sec</span>
            </div>
            <div style={{marginTop:6,width:"100%",height:4,background:C.border,borderRadius:4,overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${timerColor},${timerColor}88)`,borderRadius:4,transition:"width 1s linear"}}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── OVERDUE: extra fee prompt (fires once) ──
  if (state === "overdue-grace" || extraFeePrompt) {
    const overMs = now - endMs;
    const { h:oh, m:om, sec:os } = fmtMs(overMs);
    const remainGrace = (endMs + 15*60*1000) - now;
    const { m:gm, sec:gs } = fmtMs(Math.max(0, remainGrace));

    return (
      <div style={{background:`${C.danger}10`,border:`2px solid ${C.danger}`,borderRadius:14,padding:"14px",marginTop:8}}>
        <div style={{fontSize:14,fontWeight:800,color:C.danger,marginBottom:4,display:"flex",alignItems:"center",gap:7}}>
          <Icon name="alert-triangle" size={17} color={C.danger} strokeWidth={2.5}/>Time Expired!
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10}}>
          Overstay: <span style={{color:C.danger,fontWeight:700}}>{oh>0?`${oh}h `:""}{ om}m {pad(os)}s</span>
          {remainGrace > 0 && <span style={{marginLeft:8,color:C.warn}}>· {gm}:{pad(gs)} to settle before barrier locks</span>}
        </div>
        <div style={{background:C.inputBg,borderRadius:10,padding:"10px 12px",marginBottom:12,border:`1px solid ${C.warn}40`}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:6}}>When do you plan to leave?</div>
          <input type="time" value={leaveTime} onChange={e=>setLeaveTime(e.target.value)}
            style={{width:"100%",background:"transparent",border:`1.5px solid ${C.warn}`,borderRadius:8,padding:"9px",fontSize:15,fontWeight:800,color:C.warn,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textAlign:"center"}}/>
          <div style={{fontSize:10,color:C.muted,marginTop:6}}>
            Extra fee: <span style={{color:C.danger,fontWeight:800}}>
              KES {(() => {
                if (!leaveTime) return "—";
                const d2=new Date(); const [h2,m2]=leaveTime.split(":").map(Number); if(isNaN(h2)) return "—"; d2.setHours(h2,m2,0,0); if(d2.getTime()<Date.now()) d2.setDate(d2.getDate()+1);
                const overMins = Math.max(15, Math.ceil((d2.getTime()-endMs)/60000));
                const rate = (booking.price_per_hour||booking.total_amount/booking.hours)||100;
                return Math.ceil((overMins/60)*rate*1.5).toLocaleString();
              })()}
            </span> (1.5× overstay rate)
          </div>
        </div>
        <button onClick={handlePayExtraFee} style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${C.danger},#B02240)`,border:"none",borderRadius:11,color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Icon name="credit-card" size={16} color="#fff" strokeWidth={2.5}/>Pay via M-Pesa & Extend
        </button>
      </div>
    );
  }

  // ── GRACE: 5-minute allowance after paying ──
  if (state === "grace") {
    const graceEnd = gracePaidAt + 5*60*1000;
    const diff = graceEnd - now;
    const { m, sec } = fmtMs(diff);
    return (
      <div style={{background:`${C.warn}12`,border:`2px solid ${C.warn}`,borderRadius:14,padding:"14px",marginTop:8}}>
        <div style={{fontSize:14,fontWeight:800,color:C.warn,marginBottom:6,display:"flex",alignItems:"center",gap:7}}>
          <Icon name="clock" size={17} color={C.warn} strokeWidth={2.5}/>5-Minute Exit Allowance
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Payment received. Please exit within:</div>
        <div style={{display:"flex",gap:5,alignItems:"baseline",marginBottom:8}}>
          <span style={{fontSize:38,fontWeight:900,color:C.warn,lineHeight:1}}>{pad(m)}</span>
          <span style={{fontSize:13,color:C.muted,fontWeight:600}}>min</span>
          <span style={{fontSize:38,fontWeight:900,color:C.warn,lineHeight:1}}>{pad(sec)}</span>
          <span style={{fontSize:13,color:C.muted,fontWeight:600}}>sec</span>
        </div>
        <div style={{width:"100%",height:5,background:C.border,borderRadius:5,overflow:"hidden"}}>
          <div style={{width:`${(Math.max(0,diff)/(5*60*1000))*100}%`,height:"100%",background:C.warn,borderRadius:5,transition:"width 1s linear"}}/>
        </div>
        <div style={{fontSize:11,color:C.warn,fontWeight:700,marginTop:8}}>Drive to the exit now — barrier will open automatically.</div>
      </div>
    );
  }

  // ── OVERSTAY: barrier holds, payment at exit ──
  if (state === "overstay") {
    const overstayMs = now - (gracePaidAt ? gracePaidAt + 5*60*1000 : endMs + 15*60*1000);
    const { h:oh, m:om, sec:os } = fmtMs(overstayMs);
    return (
      <div style={{background:`${C.danger}12`,border:`2px solid ${C.danger}`,borderRadius:14,padding:"14px",marginTop:8,textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:800,color:C.danger,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
          <Icon name="x-circle" size={18} color={C.danger} strokeWidth={2.5}/>Barrier Active
        </div>
        <div style={{fontSize:12,color:C.muted,marginBottom:8}}>
          Overstay: <span style={{color:C.danger,fontWeight:800}}>{oh>0?`${oh}h `:""}{om}m {pad(os)}s</span>
        </div>
        <div style={{background:C.inputBg,borderRadius:10,padding:"10px",marginBottom:4}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text}}>Drive to exit gate</div>
          <div style={{fontSize:11,color:C.muted,marginTop:3}}>Scanner will detect your plate and calculate final fee</div>
        </div>
        <div style={{fontSize:10,color:C.muted,marginTop:8}}>
          Continuing to accrue at standard rate until exit detected
        </div>
      </div>
    );
  }

  return null;
}

// ─── BOOKINGS SCREEN ──────────────────────────────────────────────────────────
function BookingsScreen({ user }) {
  const C = useTheme();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await bookingsApi.mine(); setBookings(d.bookings||[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    try { await bookingsApi.cancel(id); load(); } catch(e) {}
  };

  const active = bookings.filter(b => b.status==="confirmed");
  const past = bookings.filter(b => b.status!=="confirmed");

  return (
    <div style={{height:"100%",overflowY:"auto",padding:"16px 16px 80px",boxSizing:"border-box"}}>
      <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>My Bookings</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Live countdown for active sessions</div>

      {loading ? <Spinner/> : bookings.length===0 ? (
        <div style={{textAlign:"center",padding:"50px 20px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><Icon name="parking" size={48} color={C.border} strokeWidth={1}/></div>
          <div style={{fontSize:15,color:C.muted}}>No bookings yet</div>
          <div style={{fontSize:13,color:C.muted,marginTop:6}}>Find a spot and reserve it</div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <div style={{fontSize:11,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:9,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:C.accent,display:"inline-block"}}/>Active Sessions
              </div>
              {active.map(b => (
                <Card key={b.id} style={{marginBottom:13,border:`1px solid ${C.accent}30`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>{b.id?.slice(0,8)}…</span>
                    <Badge color={C.accent}>Active</Badge>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:2}}>{b.spot_name}</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:7,display:"flex",alignItems:"center",gap:4}}>
                    <Icon name="map-pin" size={12} color={C.muted}/>{b.spot_address}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:2}}>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><Icon name="car" size={13} color={C.muted}/>{b.vehicle_plate}</span>
                    <span style={{display:"flex",alignItems:"center",gap:4}}><Icon name="clock" size={12} color={C.muted}/>{b.hours}hr{b.hours>1?"s":""}</span>
                    <span style={{color:C.accent,fontWeight:700}}>KES {(b.total_amount||0).toLocaleString()}</span>
                  </div>
                  <CountdownTimer booking={b}/>
                  <button onClick={()=>cancel(b.id)} style={{marginTop:11,width:"100%",padding:"9px",background:"transparent",border:`1.5px solid ${C.danger}`,borderRadius:9,color:C.danger,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Icon name="trash-2" size={14} color={C.danger}/>Cancel Booking
                  </button>
                </Card>
              ))}
            </>
          )}

          {past.length > 0 && (
            <>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:9,marginTop:active.length>0?18:0}}>History</div>
              {past.map(b => (
                <Card key={b.id} style={{marginBottom:8,opacity:0.75}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>{b.id?.slice(0,8)}…</span>
                    <Badge color={b.status==="cancelled"?C.danger:C.muted}>{b.status==="cancelled"?"Cancelled":"Done"}</Badge>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{b.spot_name}</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:4}}>{b.spot_address}</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted}}>
                    <span>{b.vehicle_plate}</span>
                    <span>{b.hours}hr{b.hours>1?"s":""}</span>
                    <span style={{fontWeight:700}}>KES {(b.total_amount||0).toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:4}}>
                    <span style={{color:b.payment_status==="paid"?C.accent:C.warn,fontWeight:700}}>{b.payment_status}</span>
                    {" · "}{timeAgo(b.created_at)}
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── INPUT VALIDATION ────────────────────────────────────────────────────────
const validate = {
  fullName: v => /^[A-Za-z\s]{2,60}$/.test(v.trim()) ? "" : "Enter a valid full name (letters only)",
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email address",
  phone: v => /^(\+254|0)[17]\d{8}$/.test(v.replace(/\s/g,"")) ? "" : "Enter valid Kenyan number e.g. +254712345678",
  password: v => v.length >= 6 ? "" : "Password must be at least 6 characters",
  plate: v => /^[A-Z]{2,3}\s?\d{3,4}[A-Z]$/.test(v.replace(/\s/g,"").toUpperCase()) ? "" : "Enter valid plate e.g. KBX 123D",
  kraPin: v => !v || /^[AP]\d{9}[A-Z]$/.test(v.toUpperCase()) ? "" : "Enter valid KRA PIN e.g. A000000000Z",
  idNumber: v => /^\d{7,8}$/.test(v.trim()) ? "" : "Enter valid 7-8 digit ID number",
  mpesaPhone: v => /^(\+254|0)[17]\d{8}$/.test(v.replace(/\s/g,"")) ? "" : "Enter valid M-Pesa number",
  businessName: v => v.trim().length >= 2 ? "" : "Business name required",
  price: v => !isNaN(v) && Number(v) > 0 ? "" : "Enter a valid price",
  spaces: v => !isNaN(v) && Number(v) > 0 && Number(v) <= 500 ? "" : "Enter 1–500 spaces",
  lat: v => !isNaN(v) && Math.abs(Number(v)) <= 90 ? "" : "Enter valid latitude",
  lng: v => !isNaN(v) && Math.abs(Number(v)) <= 180 ? "" : "Enter valid longitude",
};

const ValidatedInput = ({ label, name, value, onChange, placeholder, type="text", style:s }) => {
  const C = useTheme();
  const [touched, setTouched] = useState(false);
  const err = touched && validate[name] ? validate[name](value) : "";
  return (
    <div style={{marginBottom:14}}>
      {label && <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>{label}</div>}
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => { onChange(e); if (!touched) setTouched(true); }}
        onBlur={() => setTouched(true)}
        style={{width:"100%",background:err?`${C.danger}08`:C.inputBg,border:`1.5px solid ${err?C.danger:touched&&!err&&value?C.accent:C.border}`,borderRadius:10,padding:"12px 14px",fontSize:15,color:C.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",...(s||{})}}
      />
      {err && <div style={{fontSize:11,color:C.danger,marginTop:4,display:"flex",alignItems:"center",gap:4}}><Icon name="alert-triangle" size={11} color={C.danger} strokeWidth={2.5}/>{err}</div>}
    </div>
  );
};

// ─── MAP TOGGLE (collapsible) ─────────────────────────────────────────────────
function MapToggle({ spots, selected, onSelect, userLocation, directions, onDirections, loading, directionsSpot, directionsLoading, onCloseDirections }) {
  const C = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{marginBottom:11}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"10px 14px",background:C.card,border:`1.5px solid ${open?C.accent:C.border}`,borderRadius:open?"14px 14px 0 0":14,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"all 0.2s"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:9,background:open?C.accentSoft:C.inputBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name="map" size={16} color={open?C.accent:C.muted} strokeWidth={2.5}/>
          </div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>Map View</div>
            <div style={{fontSize:10,color:C.muted}}>{open?"Tap to collapse":"Tap to explore map"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {selected && !open && (
            <span style={{fontSize:10,fontWeight:700,color:C.accent,background:C.accentSoft,padding:"2px 8px",borderRadius:20}}>{selected.name?.split(" ")[0]}</span>
          )}
          <Icon name={open?"x":"map-pin"} size={16} color={open?C.muted:C.accent} strokeWidth={2.5}/>
        </div>
      </button>

      {open && (
        <div style={{border:`1.5px solid ${C.accent}`,borderTop:"none",borderRadius:"0 0 14px 14px",overflow:"hidden"}}>
          {loading ? (
            <div style={{height:220,background:C.card,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div className="spin" style={{width:28,height:28,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`}}/>
            </div>
          ) : (
            <MapView spots={spots} selected={selected} onSelect={s=>{onSelect(s); setOpen(false);}} userLocation={userLocation} directions={directions} onDirections={onDirections}/>
          )}
          {directionsSpot && (
            <div style={{padding:"0 8px 8px"}}>
              <DirectionsPanel spot={directionsSpot} userLocation={userLocation} directions={directions} loading={directionsLoading} onClose={onCloseDirections}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DRIVER HOME ──────────────────────────────────────────────────────────────
function DriverHome({ user, spots, loading, connected }) {
  const C = useTheme();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [bookingSpot, setBookingSpot] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directionsSpot, setDirectionsSpot] = useState(null);
  const [directions, setDirections] = useState(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  const fetchDirections = async (spot) => {
    setDirectionsSpot(spot); setDirections(null); setDirectionsLoading(true);
    try {
      const origin = userLocation || [-1.286389, 36.817223];
      const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${spot.lng},${spot.lat}?steps=true&geometries=geojson&overview=full`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.length) throw new Error("No route");
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
      const cleanStep = (s) => {
        const type = s.maneuver?.type||""; const mod = s.maneuver?.modifier||""; const name = s.name||"the road";
        if (type==="depart") return `Head onto ${name}`;
        if (type==="arrive") return `Arrive at destination`;
        if (type==="turn") return `Turn ${mod} onto ${name}`;
        if (type==="roundabout") return `Enter roundabout, take exit onto ${name}`;
        return `Continue onto ${name}`;
      };
      setDirections({ route:coords, distanceKm:(route.distance/1000).toFixed(1), durationMin:Math.round(route.duration/60), steps:route.legs[0]?.steps?.map(s=>({ instruction:s.maneuver?.instruction||cleanStep(s), distance:s.distance })) || [] });
    } catch(e) { setDirections({ error:true, steps:[] }); }
    finally { setDirectionsLoading(false); }
  };

  const openDirections = (spot) => { setSelected(spot); fetchDirections(spot); };
  const closeDirections = () => { setDirectionsSpot(null); setDirections(null); };
  const openBooking = (spot) => { setSelected(spot); setBookingSpot(spot); };
  const closeBooking = () => { setBookingSpot(null); setSelected(null); };

  // When a map marker is clicked — put that spot first in the list
  const handleMapSelect = (spot) => {
    setSelected(spot);
    closeDirections();
    setSearch("");
    setFilter("All");
    // Scroll list to top smoothly
    setTimeout(() => { if (listRef.current) listRef.current.scrollTo({ top: 0, behavior: "smooth" }); }, 80);
  };

  // Search suggestions — live match against name, area, address
  const suggestions = search.trim().length >= 1
    ? spots.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.area?.toLowerCase().includes(search.toLowerCase()) ||
        s.address?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : [];

  const pickSuggestion = (spot) => {
    setSearch(spot.name);
    setSearchFocused(false);
    setSelected(spot);
    setFilter("All");
    setTimeout(() => { if (listRef.current) listRef.current.scrollTo({ top: 0, behavior: "smooth" }); }, 80);
    searchRef.current?.blur();
  };

  // Build displayed list — if a spot is selected (from map click), pin it first
  const baseList = spots.filter(s => {
    if (search.trim()) return (
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.area?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
    );
    if (filter === "Available") return (s.available_spaces ?? 0) > 0;
    if (filter === "Mall" || filter === "Office") return s.type === filter;
    return true;
  });

  const displayList = selected && !search.trim()
    ? [selected, ...baseList.filter(s => s.id !== selected.id)]
    : baseList;

  if (success) return <SuccessScreen booking={success} onDone={() => setSuccess(null)}/>;

  return (
    <div style={{position:"relative",height:"100%",overflow:"hidden"}}>
      <div ref={listRef} style={{height:"100%",overflowY:"auto",padding:"6px 16px 20px",boxSizing:"border-box"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:12,color:C.muted}}>Welcome back</div>
            <div style={{fontSize:22,fontWeight:800,color:C.text}}>{(user.full_name||"").split(" ")[0] || "Driver"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 11px"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:connected?C.accent:C.danger,boxShadow:connected?`0 0 7px ${C.accent}`:"none"}}/>
            <span style={{fontSize:10,fontWeight:700,color:connected?C.accent:C.muted}}>{connected?"LIVE":"OFFLINE"}</span>
          </div>
        </div>

        {/* Search with autocomplete */}
        <div style={{position:"relative",marginBottom:13}}>
          <div style={{background:C.card,border:`1.5px solid ${searchFocused?C.accent:C.border}`,borderRadius:searchFocused && suggestions.length>0?"12px 12px 0 0":12,padding:"10px 13px",display:"flex",alignItems:"center",gap:9,transition:"border-color 0.2s"}}>
            <Icon name="search" size={17} color={searchFocused?C.accent:C.muted} strokeWidth={2.5}/>
            <input
              ref={searchRef}
              value={search}
              onChange={e=>{ setSearch(e.target.value); setFilter("All"); }}
              onFocus={()=>setSearchFocused(true)}
              onBlur={()=>setTimeout(()=>setSearchFocused(false),150)}
              placeholder="Search parking spots, areas…"
              style={{background:"none",border:"none",outline:"none",fontSize:14,color:C.text,width:"100%",fontFamily:"inherit"}}
            />
            {search && (
              <button onClick={()=>{ setSearch(""); setSelected(null); setFilter("All"); }} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:2}}>
                <Icon name="x" size={16} color={C.muted} strokeWidth={2.5}/>
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {searchFocused && suggestions.length > 0 && (
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:`1.5px solid ${C.accent}`,borderTop:"none",borderRadius:"0 0 14px 14px",zIndex:100,boxShadow:`0 8px 24px ${C.accent}20`,overflow:"hidden"}}>
              {suggestions.map((s, i) => {
                const avail = s.available_spaces ?? 0;
                const col = avail===0?C.danger:avail<=5?C.warn:C.accent;
                return (
                  <button key={s.id} onMouseDown={()=>pickSuggestion(s)} style={{width:"100%",padding:"11px 14px",background:i%2===0?C.card:C.inputBg,border:"none",borderBottom:i<suggestions.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:11,textAlign:"left"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:`${col}20`,border:`1.5px solid ${col}50`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Icon name="map-pin" size={16} color={col} strokeWidth={2.5}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:1}}>{s.name}</div>
                      <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.area} · {s.address}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:800,color:C.accent}}>KES {s.price_per_hour}</div>
                      <div style={{fontSize:10,color:col,fontWeight:700}}>{avail===0?"Full":`${avail} free`}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Map — collapsible so it doesn't block the list */}
        <MapToggle spots={spots} selected={selected} onSelect={handleMapSelect} userLocation={userLocation} directions={directions} onDirections={openDirections} loading={loading} directionsSpot={directionsSpot} directionsLoading={directionsLoading} onCloseDirections={closeDirections}/>

        {/* Stats */}
        <div style={{display:"flex",gap:6,marginBottom:11}}>
          <StatBox icon="layers" label="Locations" value={spots.length} color={C.accent}/>
          <StatBox icon="check-circle" label="Available" value={spots.filter(s=>(s.available_spaces??0)>0).length} color={C.blue}/>
          <StatBox icon="tag" label="Avg/hr" value={spots.length ? `KES ${Math.round(spots.reduce((a,s)=>a+(s.price_per_hour||0),0)/spots.length)}` : "—"} color={C.warn}/>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:6,marginBottom:11,overflowX:"auto",paddingBottom:2}}>
          {["All","Mall","Office","Available"].map(f=>(
            <button key={f} onClick={()=>{ setFilter(f); setSearch(""); setSelected(null); }} style={{flexShrink:0,padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,background:filter===f?C.accent:C.card,color:filter===f?(C.mode==="dark"?"#0A0F1E":"#fff"):C.muted,border:`1.5px solid ${filter===f?C.accent:C.border}`,cursor:"pointer",transition:"all 0.15s"}}>{f}</button>
          ))}
        </div>

        {/* List label */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <span style={{fontSize:11,color:C.muted}}>
            {loading ? "Loading…" : `${displayList.length} location${displayList.length!==1?"s":""} · real-time`}
          </span>
          {selected && !search && (
            <span style={{fontSize:11,color:C.accent,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
              <Icon name="map-pin" size={12} color={C.accent} strokeWidth={2.5}/>Pinned first
            </span>
          )}
        </div>

        {/* Spot list */}
        {displayList.map((s, i) => (
          <SpotCard key={s.id} spot={s} onClick={openBooking} onDirections={openDirections} isPinned={i===0 && selected?.id===s.id && !search}/>
        ))}
      </div>

      {bookingSpot && <BookingModal spot={bookingSpot} user={user} onClose={closeBooking} onSuccess={b=>{ setSuccess(b); closeBooking(); }}/>}
    </div>
  );
}

// ─── PROVIDER PORTAL ──────────────────────────────────────────────────────────
function ProviderPortal({ user, onLogout }) {
  const C = useTheme();
  const [tab, setTab] = useState("dashboard");
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pform, setPform] = useState({ businessName:"", mpesaPhone:"", mpesaAccount:"", idNumber:"", kraPin:"" });
  const [sform, setSform] = useState({ name:"", area:"", address:"", lat:"", lng:"", totalSpaces:"", pricePerHour:"", type:"Mall", amenities:"", phone:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([providerApi.getDashboard(), providerApi.getMe()]);
      setDash(d);
      if (p.provider) setPform({ businessName:p.provider.business_name||"", mpesaPhone:p.provider.mpesa_phone||"", mpesaAccount:p.provider.mpesa_account||"", idNumber:p.provider.id_number||"", kraPin:p.provider.kra_pin||"" });
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const saveDetails = async () => {
    setSaving(true); setMsg("");
    try { await providerApi.register(pform); setMsg("ok:Details saved successfully"); await load(); }
    catch(e) { setMsg("err:" + (e.response?.data?.error||"Failed to save")); }
    finally { setSaving(false); }
  };

  const addSpot = async () => {
    setSaving(true); setMsg("");
    try {
      await providerApi.addSpot({ ...sform, amenities:sform.amenities.split(",").map(a=>a.trim()).filter(Boolean) });
      setSform({ name:"", area:"", address:"", lat:"", lng:"", totalSpaces:"", pricePerHour:"", type:"Mall", amenities:"", phone:"" });
      setMsg("ok:Spot submitted for admin approval!"); setTab("spots"); await load();
    } catch(e) { setMsg("err:" + (e.response?.data?.error||"Failed to add spot")); }
    finally { setSaving(false); }
  };

  const pf = (k,v) => setPform(f=>({...f,[k]:v}));
  const sf = (k,v) => setSform(f=>({...f,[k]:v}));
  const isOk = msg.startsWith("ok:");
  const msgText = msg.replace(/^(ok|err):/,"");

  const tabs = [["dashboard","bar-chart","Dashboard"],["spots","parking","Spots"],["add","plus","Add Spot"],["settings","settings","Settings"]];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"12px 14px 0",background:C.card,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
          <Icon name="building" size={17} color={C.blue}/>Provider Portal
        </div>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:10}}>
          {tabs.map(([id,icon,l])=>(
            <button key={id} onClick={()=>{ setTab(id); setMsg(""); }} style={{flexShrink:0,padding:"7px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:tab===id?C.accent:"transparent",color:tab===id?(C.mode==="dark"?"#0A0F1E":"#fff"):C.muted,border:`1px solid ${tab===id?C.accent:C.border}`,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
              <Icon name={icon} size={13} color={tab===id?(C.mode==="dark"?"#0A0F1E":"#fff"):C.muted}/>{l}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"15px 14px 20px"}}>
        {loading ? <Spinner/> : tab==="dashboard" ? (
          <>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <StatBox icon="dollar-sign" label="Revenue" value={fmt(dash?.stats?.totalRevenue)} color={C.accent}/>
              <StatBox icon="trending-up" label="Your Payout" value={fmt(dash?.stats?.totalPayout)} color={C.blue}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              <StatBox icon="bar-chart" label="Commission" value={fmt(dash?.stats?.totalCommission)} color={C.warn}/>
              <StatBox icon="list" label="Bookings" value={dash?.stats?.totalBookings||0} color={C.purple}/>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:9,display:"flex",alignItems:"center",gap:6}}>
              <Icon name="car" size={15} color={C.blue}/>Cars Currently Parked ({(dash?.carsCurrentlyParked||[]).length})
            </div>
            {(dash?.carsCurrentlyParked||[]).length===0 ? (
              <Card style={{textAlign:"center",color:C.muted,fontSize:13,padding:"20px 0",marginBottom:16}}>No cars currently parked</Card>
            ) : (dash?.carsCurrentlyParked||[]).map((b,i) => (
              <Card key={i} style={{marginBottom:9,border:`1px solid ${C.accent}20`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:40,height:40,borderRadius:12,background:`${C.accent}20`,border:`1.5px solid ${C.accent}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Icon name="car" size={18} color={C.accent} strokeWidth={2.5}/>
                    </div>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"monospace",letterSpacing:1}}>{b.vehicle_plate}</div>
                      {b.spot_number && <div style={{fontSize:10,color:C.muted,marginTop:1}}>Spot #{b.spot_number}</div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,color:C.accent,fontWeight:700}}>{b.hours}hr</div>
                    <div style={{fontSize:10,color:C.muted}}>Exp {new Date(b.expires_at||Date.now()).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
                {/* Driver info */}
                <div style={{background:C.inputBg,borderRadius:9,padding:"8px 10px",display:"flex",gap:12,flexWrap:"wrap"}}>
                  {b.driver_name && (
                    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}>
                      <Icon name="user" size={13} color={C.muted} strokeWidth={2.5}/>
                      <span style={{color:C.text,fontWeight:600}}>{b.driver_name}</span>
                    </div>
                  )}
                  {b.driver_phone && (
                    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}>
                      <Icon name="phone" size={13} color={C.muted} strokeWidth={2.5}/>
                      <span style={{color:C.text,fontWeight:600}}>{b.driver_phone}</span>
                    </div>
                  )}
                  <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted}}>
                    <Icon name="map-pin" size={13} color={C.muted} strokeWidth={2.5}/>
                    <span>{b.spot_name}</span>
                  </div>
                </div>
              </Card>
            ))}
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:9,display:"flex",alignItems:"center",gap:6}}>
              <Icon name="list" size={15} color={C.blue}/>Recent Bookings
            </div>
            {(dash?.recentBookings||[]).slice(0,5).map(b => (
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontFamily:"monospace",color:C.muted}}>{b.id}</span>
                  <span style={{fontSize:12,color:C.accent,fontWeight:700}}>{fmt(b.provider_amount)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted}}>
                  <span>{b.vehicle_plate}</span>
                  <span>{b.hours}hr</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        ) : tab==="spots" ? (
          <>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:11}}>My Parking Locations ({(dash?.spots||[]).length})</div>
            {(dash?.spots||[]).length===0 ? (
              <Card style={{textAlign:"center",color:C.muted,fontSize:13,padding:"30px 0"}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><Icon name="parking" size={36} color={C.border} strokeWidth={1}/></div>
                No spots yet. Add your first one!
              </Card>
            ) : (dash?.spots||[]).map(s => (
              <Card key={s.id} style={{marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                  <div style={{flex:1,marginRight:8}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.address}</div>
                  </div>
                  <Badge color={s.is_approved?C.accent:C.warn}>{s.is_approved?"Live":"Pending"}</Badge>
                </div>
                <div style={{display:"flex",gap:12,fontSize:11,color:C.muted}}>
                  <span>Total: {s.total_spaces}</span>
                  <span style={{color:(s.available_spaces||0)===0?C.danger:C.accent}}>Free: {s.available_spaces||0}</span>
                  <span style={{color:s.is_active?C.accent:C.danger}}>{s.is_active?"Active":"Inactive"}</span>
                </div>
              </Card>
            ))}
          </>
        ) : tab==="add" ? (
          <>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14}}>Add New Parking Location</div>
            <ValidatedInput label="Location Name" name="businessName" placeholder="Westlands Square Parking" value={sform.name} onChange={e=>sf("name",e.target.value)}/>
            <Input label="Area / Neighbourhood" placeholder="Westlands" value={sform.area} onChange={e=>sf("area",e.target.value)}/>
            <Input label="Full Address" placeholder="Westlands Rd, Nairobi" value={sform.address} onChange={e=>sf("address",e.target.value)}/>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><ValidatedInput label="Latitude" name="lat" placeholder="-1.2676" type="number" value={sform.lat} onChange={e=>sf("lat",e.target.value)}/></div>
              <div style={{flex:1}}><ValidatedInput label="Longitude" name="lng" placeholder="36.8116" type="number" value={sform.lng} onChange={e=>sf("lng",e.target.value)}/></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><ValidatedInput label="Total Spaces" name="spaces" placeholder="50" type="number" value={sform.totalSpaces} onChange={e=>sf("totalSpaces",e.target.value)}/></div>
              <div style={{flex:1}}><ValidatedInput label="Price/Hour (KES)" name="price" placeholder="150" type="number" value={sform.pricePerHour} onChange={e=>sf("pricePerHour",e.target.value)}/></div>
            </div>
            <Select label="Type" value={sform.type} onChange={e=>sf("type",e.target.value)}>
              {["Mall","Office","Street","Residential","Other"].map(t=><option key={t} value={t}>{t}</option>)}
            </Select>
            <Input label="Amenities (comma separated)" placeholder="CCTV, Covered, EV Charging" value={sform.amenities} onChange={e=>sf("amenities",e.target.value)}/>
            <ValidatedInput label="Contact Phone" name="mpesaPhone" placeholder="+254 20 123 4567" value={sform.phone} onChange={e=>sf("phone",e.target.value)}/>
            {msg && <div style={{color:isOk?C.accent:C.danger,fontSize:13,marginBottom:12,padding:"10px 13px",background:isOk?C.accentSoft:`${C.danger}12`,borderRadius:9,display:"flex",alignItems:"center",gap:7}}>
              <Icon name={isOk?"check-circle":"alert-triangle"} size={14} color={isOk?C.accent:C.danger}/>{msgText}
            </div>}
            <Btn loading={saving} onClick={addSpot}>Submit for Approval</Btn>
            <div style={{marginTop:12,padding:"11px 13px",background:`${C.warn}10`,borderRadius:10,border:`1px solid ${C.warn}30`,fontSize:12,color:C.muted,display:"flex",gap:7,alignItems:"flex-start"}}>
              <Icon name="info" size={14} color={C.warn} style={{flexShrink:0,marginTop:1}}/>Spots require admin approval (1-2 business days) before going live.
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14}}>Payment & Business Details</div>
            <ValidatedInput label="Business Name" name="businessName" placeholder="Mwangi Parking Ltd" value={pform.businessName} onChange={e=>pf("businessName",e.target.value)}/>
            <ValidatedInput label="M-Pesa Phone" name="mpesaPhone" placeholder="+254 712 345 678" type="tel" value={pform.mpesaPhone} onChange={e=>pf("mpesaPhone",e.target.value)}/>
            <Input label="M-Pesa Account / Till No." placeholder="174379" value={pform.mpesaAccount} onChange={e=>pf("mpesaAccount",e.target.value)}/>
            <ValidatedInput label="National ID Number" name="idNumber" placeholder="12345678" value={pform.idNumber} onChange={e=>pf("idNumber",e.target.value)}/>
            <ValidatedInput label="KRA PIN (optional)" name="kraPin" placeholder="A000000000Z" value={pform.kraPin} onChange={e=>pf("kraPin",e.target.value)}/>
            {msg && <div style={{color:isOk?C.accent:C.danger,fontSize:13,marginBottom:12,padding:"10px 13px",background:isOk?C.accentSoft:`${C.danger}12`,borderRadius:9,display:"flex",alignItems:"center",gap:7}}>
              <Icon name={isOk?"check-circle":"alert-triangle"} size={14} color={isOk?C.accent:C.danger}/>{msgText}
            </div>}
            <Btn loading={saving} onClick={saveDetails}>Save Payment Details</Btn>
            <div style={{marginTop:13,padding:"11px 13px",background:C.accentSoft,borderRadius:10,border:`1px solid ${C.accent}30`,fontSize:12,color:C.muted,display:"flex",gap:7,alignItems:"flex-start"}}>
              <Icon name="shield-check" size={14} color={C.accent} style={{flexShrink:0,marginTop:1}}/>You receive 80% of every booking directly to your M-Pesa. ParkSmart takes 20% commission automatically.
            </div>
            <div style={{marginTop:18}}>
              <Btn onClick={onLogout} style={{background:"transparent",border:`1.5px solid ${C.danger}`,color:C.danger,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <Icon name="log-out" size={16} color={C.danger}/>Sign Out
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN PORTAL ─────────────────────────────────────────────────────────────
function AdminPortal({ onLogout }) {
  const C = useTheme();
  const [tab, setTab] = useState("overview");
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await adminApi.getDashboard(); setDash(d); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const approve = async (id, val) => {
    setApprovingId(id);
    try { await adminApi.approveSpot(id, val); await load(); }
    catch(e) {}
    finally { setApprovingId(null); }
  };

  const tabs = [["overview","bar-chart","Overview"],["providers","building","Providers"],["users","users","Users"],["bookings","list","Bookings"]];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"12px 14px 0",background:`linear-gradient(135deg,${C.purple}20,${C.card})`,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:15,fontWeight:800,color:C.purple,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
          <Icon name="zap" size={17} color={C.purple}/>Admin Panel
        </div>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:10}}>
          {tabs.map(([id,icon,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"7px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:tab===id?C.purple:"transparent",color:tab===id?"#fff":C.muted,border:`1px solid ${tab===id?C.purple:C.border}`,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
              <Icon name={icon} size={13} color={tab===id?"#fff":C.muted}/>{l}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"15px 14px 20px"}}>
        {loading ? <Spinner/> : !dash ? <div style={{color:C.muted,textAlign:"center",padding:30,fontSize:14}}>Failed to load</div> :
        tab==="overview" ? (
          <>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <StatBox icon="dollar-sign" label="Total Revenue" value={fmt(dash.stats?.totalRevenue)} color={C.accent}/>
              <StatBox icon="zap" label="Commission" value={fmt(dash.stats?.totalCommission)} color={C.purple}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              <StatBox icon="parking" label="Active Spots" value={dash.stats?.activeSpots||0} color={C.blue}/>
              <StatBox icon="list" label="Bookings" value={dash.stats?.totalBookings||0} color={C.warn}/>
            </div>
            {(dash.pendingSpots||[]).length > 0 && (
              <>
                <div style={{fontSize:14,fontWeight:700,color:C.warn,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="alert-triangle" size={15} color={C.warn}/>Pending Approvals ({dash.pendingSpots.length})
                </div>
                {dash.pendingSpots.map(s => (
                  <Card key={s.id} style={{marginBottom:9,border:`1px solid ${C.warn}30`}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:9}}>{s.address}</div>
                    <div style={{display:"flex",gap:7}}>
                      <button onClick={()=>approve(s.id,true)} disabled={approvingId===s.id} style={{flex:1,padding:"9px",background:`${C.accent}18`,border:`1px solid ${C.accent}40`,borderRadius:9,color:C.accent,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <Icon name="check" size={13} color={C.accent}/>Approve
                      </button>
                      <button onClick={()=>approve(s.id,false)} disabled={approvingId===s.id} style={{flex:1,padding:"9px",background:`${C.danger}12`,border:`1px solid ${C.danger}30`,borderRadius:9,color:C.danger,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <Icon name="x" size={13} color={C.danger}/>Reject
                      </button>
                    </div>
                  </Card>
                ))}
              </>
            )}
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <Icon name="list" size={15} color={C.blue}/>Recent Bookings
            </div>
            {(dash.recentBookings||[]).slice(0,5).map(b => (
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontFamily:"monospace",color:C.muted}}>{b.id?.slice(0,10)}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{fmt(b.total_amount)}</span>
                </div>
                <div style={{fontSize:12,color:C.text,marginBottom:3}}>{b.spot_name}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted}}>
                  <span>{b.vehicle_plate}</span>
                  <span>Comm: {fmt(b.commission_amount)}</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        ) : tab==="providers" ? (
          <>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:11}}>All Providers ({(dash.providers||[]).length})</div>
            {(dash.providers||[]).map(p => (
              <Card key={p.id} style={{marginBottom:9}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:7}}>{p.businessName||p.full_name||"Unknown Provider"}</div>
                <div style={{display:"flex",gap:6,marginBottom:7}}>
                  <StatBox icon="dollar-sign" label="Revenue" value={fmt(p.totalRevenue)} color={C.accent}/>
                  <StatBox icon="trending-up" label="Payout" value={fmt(p.payout)} color={C.blue}/>
                  <StatBox icon="bar-chart" label="Commission" value={fmt(p.commission)} color={C.purple}/>
                </div>
                <div style={{fontSize:11,color:C.muted}}>{p.bookingCount} bookings · M-Pesa: {p.mpesaPhone||"Not set"}</div>
                {(p.spots||[]).map(s=><div key={s.id} style={{fontSize:11,color:C.muted,marginTop:2}}>{s.name}</div>)}
              </Card>
            ))}
          </>
        ) : tab==="users" ? (
          <>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:11}}>All Users ({(dash.allUsers||[]).length})</div>
            {(dash.allUsers||[]).map(u => (
              <Card key={u.id} style={{marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{u.full_name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{u.email} · {timeAgo(u.created_at)}</div>
                </div>
                <Badge color={u.role==="admin"?C.purple:u.role==="provider"?C.blue:C.accent}>{u.role}</Badge>
              </Card>
            ))}
          </>
        ) : (
          <>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:11}}>All Paid Bookings ({(dash.recentBookings||[]).length})</div>
            {(dash.recentBookings||[]).map(b => (
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontFamily:"monospace",color:C.muted}}>{b.id}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.accent}}>{fmt(b.total_amount)}</span>
                </div>
                <div style={{fontSize:12,color:C.text,marginBottom:4}}>{b.spot_name}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted}}>
                  <span>{b.vehicle_plate}</span>
                  <span>Comm: {fmt(b.commission_amount)}</span>
                  <span>Payout: {fmt(b.provider_amount)}</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        )}
        <div style={{marginTop:22}}>
          <Btn onClick={onLogout} style={{background:"transparent",border:`1.5px solid ${C.danger}`,color:C.danger,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <Icon name="log-out" size={16} color={C.danger}/>Sign Out
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("ps_theme");
    return saved ? saved === "dark" : true;
  });
  const C = isDark ? DARK : LIGHT;

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("ps_theme", next ? "dark" : "light");
  };

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState("home");
  const [spots, setSpots] = useState([]);
  const [connected, setConnected] = useState(false);
  const [spotsLoading, setSpotsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ps_token");
    if (token) {
      authApi.me()
        .then(u => { setUser(u); setAuthChecked(true); })
        .catch(() => { localStorage.removeItem("ps_token"); setAuthChecked(true); });
    } else { setAuthChecked(true); }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "driver") return;
    spotsApi.getAll().then(d => { setSpots(d.spots||[]); setSpotsLoading(false); }).catch(() => setSpotsLoading(false));
    const socket = getSocket();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("spot:updated", ({ spotId, available }) => { setSpots(prev => prev.map(s => s.id===spotId ? {...s, available_spaces:available} : s)); });
    socket.emit("user:join", user.id);
    return () => { socket.off("connect"); socket.off("disconnect"); socket.off("spot:updated"); };
  }, [user]);

  const logout = () => { localStorage.removeItem("ps_token"); setUser(null); setSpots([]); setSpotsLoading(true); setTab("home"); };

  if (!authChecked) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:C.bg}}>
      <div className="spin" style={{width:44,height:44,borderRadius:"50%",border:`4px solid ${C.border}`,borderTop:`4px solid ${C.accent}`}}/>
    </div>
  );

  const navItems = [["home","map","Explore"],["bookings","parking","Bookings"],["account","user","Account"]];

  return (
    <ThemeCtx.Provider value={C}>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:isDark?"#050810":"#E8ECF4",fontFamily:"'DM Sans','Segoe UI',sans-serif",transition:"background 0.3s"}}>
        <div style={{width:390,height:780,background:C.bg,borderRadius:44,overflow:"hidden",position:"relative",boxShadow:C.shadow,transition:"background 0.3s"}}>

          {/* Notch */}
          <div style={{width:110,height:26,background:"#000",borderRadius:20,position:"absolute",left:"50%",transform:"translateX(-50%)",top:0,zIndex:50}}/>

          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{position:"absolute",top:30,right:18,zIndex:60,background:C.card,border:`1px solid ${C.border}`,borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <Icon name={isDark?"sun":"moon"} size={15} color={C.muted}/>
          </button>

          <div style={{height:"100%",paddingTop:16,boxSizing:"border-box",display:"flex",flexDirection:"column"}}>

            {!user && <AuthScreen onAuth={u=>{ setUser(u); setTab("home"); }}/>}
            {user?.role==="admin" && <AdminPortal onLogout={logout}/>}
            {user?.role==="provider" && <ProviderPortal user={user} onLogout={logout}/>}

            {user?.role==="driver" && (
              <>
                <div style={{flex:1,overflow:"hidden",position:"relative"}}>
                  {tab==="home"     && <DriverHome user={user} spots={spots} loading={spotsLoading} connected={connected}/>}
                  {tab==="bookings" && <BookingsScreen user={user}/>}
                  {tab==="account"  && <AccountScreen user={user} setUser={setUser} onLogout={logout}/>}
                </div>

                <div style={{background:C.navBg,borderTop:`1px solid ${C.border}`,display:"flex",height:68,paddingBottom:8,flexShrink:0}}>
                  {navItems.map(([id,icon,label])=>(
                    <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
                      <Icon name={icon} size={22} color={tab===id?C.accent:C.muted} strokeWidth={tab===id?2:1.5}/>
                      <div style={{fontSize:10,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.muted}}>{label}</div>
                      {tab===id && <div style={{width:18,height:3,borderRadius:2,background:C.accent,position:"absolute",bottom:8}}/>}
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
