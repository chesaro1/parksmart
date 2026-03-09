import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { getSocket, authApi, spotsApi, bookingsApi, paymentsApi, providerApi, adminApi } from "./services";
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
const Icon = ({ name, size=18, color, strokeWidth=1.8, style:s }) => {
  const C = useTheme();
  const col = color || C.muted;
  const paths = {
    map:         [["M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z","M9 4v13","M15 7v13"]],
    parking:     [["rect x=3 y=3 width=18 height=18 rx=2","M9 17V7h4a3 3 0 010 6H9"]],
    user:        [["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 3a4 4 0 100 8 4 4 0 000-8z"]],
    "map-pin":   [["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z","M12 7a3 3 0 100 6 3 3 0 000-6z"]],
    navigation:  [["M3 11l19-9-9 19-2-8-8-2z"]],
    clock:       [["M12 2a10 10 0 100 20 10 10 0 000-20z","M12 6v6l4 2"]],
    "credit-card":[["M1 4h22v16H1z","M1 9h22"]],
    star:        [["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"]],
    "check-circle":[["M22 11.08V12a10 10 0 11-5.93-9.14","M22 4L12 14.01l-3-3"]],
    "x-circle":  [["M22 12a10 10 0 11-20 0 10 10 0 0120 0z","M15 9l-6 6M9 9l6 6"]],
    settings:    [["M12 20a8 8 0 100-16 8 8 0 000 16z","M12 14a2 2 0 100-4 2 2 0 000 4z","M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"]],
    building:    [["M3 21h18","M3 7v14","M21 7v14","M3 7h18","M9 21V10h6v11","M3 3h18v4H3z"]],
    "bar-chart": [["M12 20V10","M18 20V4","M6 20v-6"]],
    "log-out":   [["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4","M16 17l5-5-5-5","M21 12H9"]],
    "log-in":    [["M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4","M10 17l5-5-5-5","M15 12H3"]],
    car:         [["M5 17H3v-5l2-5h14l2 5v5h-2","M7 17a2 2 0 100 4 2 2 0 000-4z","M17 17a2 2 0 100 4 2 2 0 000-4z"]],
    phone:       [["M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"]],
    mail:        [["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"]],
    gift:        [["M20 12v10H4V12","M2 7h20v5H2z","M12 22V7","M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z","M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"]],
    calendar:    [["M3 4h18v18H3z","M16 2v4","M8 2v4","M3 10h18"]],
    search:      [["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35"]],
    "x":         [["M18 6L6 18","M6 6l12 12"]],
    plus:        [["M12 5v14","M5 12h14"]],
    edit:        [["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"]],
    "alert-triangle":[["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"]],
    info:        [["M12 2a10 10 0 100 20 10 10 0 000-20z","M12 16v-4","M12 8h.01"]],
    "check":     [["M20 6L9 17l-5-5"]],
    "trash-2":   [["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"]],
    "compass":   [["M12 2a10 10 0 100 20 10 10 0 000-20z","M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"]],
    "route":     [["M3 17h3a4 4 0 008 0h3","M3 7h3a4 4 0 018 0h3","M7 17V7"]],
    sun:         [["M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42","M12 5a7 7 0 100 14A7 7 0 0012 5z"]],
    moon:        [["M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"]],
    "shield-check":[["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z","M9 12l2 2 4-4"]],
    zap:         [["M13 2L3 14h9l-1 8 10-12h-9l1-8z"]],
    users:       [["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75","M9 7a4 4 0 100 8 4 4 0 000-8z"]],
    "list":      [["M8 6h13","M8 12h13","M8 18h13","M3 6h.01","M3 12h.01","M3 18h.01"]],
    "trending-up":[["M23 6l-9.5 9.5-5-5L1 18","M17 6h6v6"]],
    "dollar-sign":[["M12 1v22","M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"]],
  };
  const d = paths[name];
  if (!d) return <span style={{fontSize:size,lineHeight:1,...s}}>{name[0].toUpperCase()}</span>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...(s||{})}}>
      {d.map((path,i) => <path key={i} d={path}/>)}
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
          <Input label="Full Name" placeholder="James Mwangi" value={form.fullName} onChange={e=>set("fullName",e.target.value)}/>
          <Input label="Phone Number" placeholder="+254 712 345 678" type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
        </>
      )}

      <Input label="Email Address" placeholder="james@email.com" type="email" value={form.email} onChange={e=>set("email",e.target.value)}/>
      <Input label="Password" placeholder="Min. 6 characters" type="password" value={form.password} onChange={e=>set("password",e.target.value)}/>

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
function SpotCard({ spot, onClick, onDirections }) {
  const C = useTheme();
  const avail = spot.available_spaces ?? 0;
  const total = spot.total_spaces ?? 1;
  const color = avail===0 ? C.danger : avail<=5 ? C.warn : C.accent;
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:15,marginBottom:9,cursor:"pointer",opacity:avail===0?0.65:1,transition:"all 0.15s"}}>
      <div onClick={()=>onClick(spot)} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
        <div style={{flex:1,minWidth:0,marginRight:10}}>
          <div style={{display:"flex",gap:5,marginBottom:5,alignItems:"center",flexWrap:"wrap"}}>
            <Badge>{spot.type||"Parking"}</Badge>
            <span style={{fontSize:11,color:C.muted}}>{spot.area}</span>
          </div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:3,lineHeight:1.3}}>{spot.name}</div>
          <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <Icon name="map-pin" size={11} color={C.muted}/>{spot.address}
          </div>
          {spot.amenities?.length > 0 && (
            <div style={{fontSize:10,color:C.muted,marginTop:4}}>{spot.amenities.slice(0,3).join(" · ")}</div>
          )}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:18,fontWeight:800,color:C.accent}}>KES {spot.price_per_hour}</div>
          <div style={{fontSize:10,color:C.muted}}>per hour</div>
          <div style={{fontSize:11,color:C.muted,marginTop:3,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
            <Icon name="star" size={11} color={C.warn} strokeWidth={2}/>{spot.rating||"4.5"}
          </div>
        </div>
      </div>
      <div style={{width:"100%",height:3,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:7}}>
        <div style={{width:`${(avail/total)*100}%`,height:"100%",background:color,borderRadius:3,transition:"width 0.5s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color,fontWeight:700}}>
          {avail===0 ? "Full" : avail<=5 ? `Only ${avail} left` : `${avail} spaces free`}
        </span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{color:C.accent,fontSize:10,fontWeight:700}}>Live</span>
          {onDirections && (
            <button onClick={e=>{ e.stopPropagation(); onDirections(spot); }} style={{background:`${C.blue}15`,border:`1px solid ${C.blue}40`,borderRadius:20,padding:"4px 10px",fontSize:10,fontWeight:700,color:C.blue,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <Icon name="navigation" size={11} color={C.blue}/>Directions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────
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
      const { booking } = await bookingsApi.create({ spotId:spot.id, hours:parseFloat(hours.toFixed(2)), vehiclePlate:plate.trim(), startTime, endTime });
      await paymentsApi.stkPush({ phone:phone.trim(), amount:booking.total_amount, bookingId:booking.id });
      setTimeout(() => onSuccess({ ...booking, startTime, endTime, spot_lat: spot.lat, spot_lng: spot.lng }), 3500);
    } catch(e) {
      setError(e.response?.data?.error || "Booking failed. Please try again.");
      setStep("form");
    }
  };

  return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(5px)",zIndex:200,display:"flex",alignItems:"flex-end",borderRadius:44}}>
      <div className="slide-up" style={{width:"100%",background:C.card,borderRadius:"24px 24px 0 0",border:`1px solid ${C.border}`,padding:"22px 20px 36px",boxSizing:"border-box",maxHeight:"88%",overflowY:"auto"}}>

        {step==="paying" ? (
          <div style={{textAlign:"center",padding:"28px 0"}}>
            <div className="spin" style={{width:52,height:52,borderRadius:"50%",border:`4px solid ${C.border}`,borderTop:`4px solid ${C.accent}`,margin:"0 auto 20px"}}/>
            <div style={{fontSize:18,fontWeight:800,color:C.text}}>M-Pesa STK Push Sent!</div>
            <div style={{fontSize:13,color:C.muted,marginTop:8}}>Check your phone and enter your PIN</div>
            <div style={{fontSize:15,color:C.accent,fontWeight:700,marginTop:6}}>{phone}</div>
            <div style={{fontSize:14,color:C.text,marginTop:4}}>KES {total.toLocaleString()}</div>
          </div>
        ) : (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
              <div style={{flex:1,marginRight:10}}>
                <div style={{fontSize:17,fontWeight:800,color:C.text}}>{spot.name}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2,display:"flex",alignItems:"center",gap:4}}>
                  <Icon name="map-pin" size={12} color={C.muted}/>{spot.address}
                </div>
                <div style={{fontSize:12,marginTop:5,fontWeight:700,color:avail===0?C.danger:C.accent}}>
                  {avail===0 ? "Currently Full" : `${avail} spaces available`}
                </div>
              </div>
              <button onClick={onClose} style={{background:C.inputBg,border:`1px solid ${C.border}`,color:C.muted,width:34,height:34,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon name="x" size={15} color={C.muted}/>
              </button>
            </div>

            {avail === 0 ? (
              <div style={{padding:"20px",textAlign:"center",color:C.muted,fontSize:14}}>
                This spot is currently full. Please check back later or choose another location.
              </div>
            ) : (
              <>
                <Input label="Vehicle Plate Number" placeholder="e.g. KBX 123D" value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} style={{fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase"}}/>

                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10}}>Parking Time</div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>Start</div>
                      <input type="time" value={startTime} onChange={e=>handleStartChange(e.target.value)}
                        style={{width:"100%",background:C.inputBg,border:`1px solid ${C.accent}40`,borderRadius:10,padding:"10px",fontSize:15,fontWeight:700,color:C.accent,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textAlign:"center"}}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",paddingTop:20,color:C.muted,fontSize:20}}>→</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:4}}>End</div>
                      <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}
                        style={{width:"100%",background:C.inputBg,border:`1px solid ${C.blue}40`,borderRadius:10,padding:"10px",fontSize:15,fontWeight:700,color:C.blue,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textAlign:"center"}}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
                    {quickDurations.map(d => {
                      const label = d < 1 ? "30 min" : `${d}hr${d>1?"s":""}`;
                      const isActive = Math.abs(hours - d) < 0.1;
                      return (
                        <button key={d} onClick={()=>setDuration(d)} style={{padding:"5px 11px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",background:isActive?C.accent:C.accentSoft,color:isActive?(C.mode==="dark"?"#0A0F1E":"#fff"):C.accent,border:`1px solid ${isActive?C.accent:C.accent+"40"}`,transition:"all 0.15s"}}>{label}</button>
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
                      <div style={{fontSize:24,fontWeight:800,color:C.accent}}>KES {total.toLocaleString()}</div>
                      <div style={{fontSize:10,color:C.muted}}>KES {spot.price_per_hour}/hr</div>
                    </div>
                  </div>
                </div>

                <Input label="M-Pesa Phone Number" placeholder="+254 712 345 678" type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/>

                {error && (
                  <div style={{color:C.danger,fontSize:13,marginBottom:14,padding:"11px 13px",background:`${C.danger}12`,borderRadius:9,border:`1px solid ${C.danger}30`,display:"flex",alignItems:"center",gap:8}}>
                    <Icon name="alert-triangle" size={14} color={C.danger}/>{error}
                  </div>
                )}

                <Btn onClick={book}>Reserve & Pay KES {total.toLocaleString()}</Btn>
                <div style={{textAlign:"center",fontSize:11,color:C.muted,marginTop:10}}>
                  Secure payment via M-Pesa · 80% goes to parking provider
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
          <Input label="Full Name" value={form.fullName} onChange={e=>set("fullName",e.target.value)} placeholder="Your full name"/>
          <Input label="Phone Number" value={form.phone} onChange={e=>set("phone",e.target.value)} type="tel" placeholder="+254 712 345 678"/>
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
              <input value={vi} onChange={e=>setVi(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") addVehicle(); }} placeholder="Add plate e.g. KBX 123D"
                style={{flex:1,background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 12px",fontSize:13,color:C.text,outline:"none",fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}/>
              <button onClick={addVehicle} style={{background:C.accentSoft,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"11px 15px",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>Add</button>
            </div>
          </div>
          <Card style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:12,letterSpacing:0.8,textTransform:"uppercase"}}>Change Password</div>
            <Input label="Current Password" type="password" placeholder="Current password" value={form.currentPassword} onChange={e=>set("currentPassword",e.target.value)}/>
            <Input label="New Password" type="password" placeholder="New password (min 6 chars)" value={form.newPassword} onChange={e=>set("newPassword",e.target.value)}/>
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

// ─── COUNTDOWN HOOK ───────────────────────────────────────────────────────────
function useCountdown(booking) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (booking.status !== "confirmed" || booking.payment_status !== "paid") return;
    const getEndMs = () => {
      if (booking.end_time) return new Date(booking.end_time).getTime();
      return new Date(booking.created_at).getTime() + (booking.hours||1)*60*60*1000;
    };
    const tick = () => { const diff = getEndMs() - Date.now(); setRemaining(diff > 0 ? diff : 0); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking]);
  return remaining;
}

// ─── COUNTDOWN DISPLAY ────────────────────────────────────────────────────────
function CountdownTimer({ booking }) {
  const C = useTheme();
  const remaining = useCountdown(booking);
  if (remaining === null) return null;
  if (remaining <= 0) {
    return (
      <div style={{background:`${C.danger}12`,border:`1px solid ${C.danger}30`,borderRadius:10,padding:"11px 13px",marginTop:8,textAlign:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.danger,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <Icon name="alert-triangle" size={15} color={C.danger}/>Parking Time Expired
        </div>
        <div style={{fontSize:11,color:C.muted,marginTop:3}}>Please move your vehicle</div>
      </div>
    );
  }
  const totalSecs = Math.floor(remaining / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const totalDuration = (booking.hours || 1) * 3600;
  const pct = Math.min(100, (totalSecs / totalDuration) * 100);
  const isLow = pct < 20;
  const timerColor = isLow ? C.danger : pct < 50 ? C.warn : C.accent;
  const r = 28, circ = 2 * Math.PI * r;
  const strokeDash = (pct / 100) * circ;

  return (
    <div style={{background:isLow?`${C.danger}08`:C.accentSoft,border:`1px solid ${timerColor}25`,borderRadius:12,padding:"11px 13px",marginTop:8}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
        <Icon name="clock" size={12} color={C.muted}/>Time Remaining
      </div>
      <div style={{display:"flex",alignItems:"center",gap:13}}>
        <div style={{position:"relative",width:70,height:70,flexShrink:0}}>
          <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
            <circle cx="35" cy="35" r={r} fill="none" stroke={C.border} strokeWidth="5"/>
            <circle cx="35" cy="35" r={r} fill="none" stroke={timerColor} strokeWidth="5" strokeDasharray={`${strokeDash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1s linear, stroke 0.5s"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:11,fontWeight:800,color:timerColor}}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:5,alignItems:"baseline"}}>
            {hrs > 0 && <><span style={{fontSize:28,fontWeight:800,color:timerColor,lineHeight:1}}>{hrs}</span><span style={{fontSize:11,color:C.muted,fontWeight:600}}>hr</span></>}
            <span style={{fontSize:28,fontWeight:800,color:timerColor,lineHeight:1}}>{String(mins).padStart(2,"0")}</span>
            <span style={{fontSize:11,color:C.muted,fontWeight:600}}>min</span>
            <span style={{fontSize:28,fontWeight:800,color:timerColor,lineHeight:1}}>{String(secs).padStart(2,"0")}</span>
            <span style={{fontSize:11,color:C.muted,fontWeight:600}}>sec</span>
          </div>
          <div style={{marginTop:6,width:"100%",height:3,background:C.border,borderRadius:3,overflow:"hidden"}}>
            <div style={{width:`${pct}%`,height:"100%",background:timerColor,borderRadius:3,transition:"width 1s linear"}}/>
          </div>
          {isLow && <div style={{fontSize:10,color:C.danger,fontWeight:700,marginTop:4}}>Less than 20% time remaining</div>}
        </div>
      </div>
    </div>
  );
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

// ─── DRIVER HOME ──────────────────────────────────────────────────────────────
function DriverHome({ user, spots, loading, connected }) {
  const C = useTheme();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [bookingSpot, setBookingSpot] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directionsSpot, setDirectionsSpot] = useState(null);
  const [directions, setDirections] = useState(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);

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
    } catch(e) {
      setDirections({ error:true, steps:[] });
    } finally { setDirectionsLoading(false); }
  };

  const openDirections = (spot) => { setSelected(spot); fetchDirections(spot); };
  const closeDirections = () => { setDirectionsSpot(null); setDirections(null); };

  const filtered = spots.filter(s => {
    if (search) return s.name?.toLowerCase().includes(search.toLowerCase()) || s.area?.toLowerCase().includes(search.toLowerCase()) || s.address?.toLowerCase().includes(search.toLowerCase());
    if (filter==="Available") return (s.available_spaces??0)>0;
    if (filter==="Mall" || filter==="Office") return s.type===filter;
    return true;
  });

  const openBooking = (spot) => { setSelected(spot); setBookingSpot(spot); };
  const closeBooking = () => { setBookingSpot(null); setSelected(null); };

  if (success) return <SuccessScreen booking={success} onDone={()=>setSuccess(null)}/>;

  return (
    <div style={{position:"relative",height:"100%",overflow:"hidden"}}>
      <div style={{height:"100%",overflowY:"auto",padding:"6px 16px 20px",boxSizing:"border-box"}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:12,color:C.muted}}>Welcome back</div>
            <div style={{fontSize:22,fontWeight:800,color:C.text}}>{(user.full_name||"").split(" ")[0] || "Driver"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 11px"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:connected?C.accent:C.danger,boxShadow:connected?`0 0 6px ${C.accent}`:"none"}}/>
            <span style={{fontSize:10,fontWeight:700,color:connected?C.accent:C.muted}}>{connected?"LIVE":"OFFLINE"}</span>
          </div>
        </div>

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 13px",display:"flex",alignItems:"center",gap:9,marginBottom:13}}>
          <Icon name="search" size={16} color={C.muted}/>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setFilter("All"); }} placeholder="Search parking spots…"
            style={{background:"none",border:"none",outline:"none",fontSize:14,color:C.text,width:"100%",fontFamily:"inherit"}}/>
          {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"}}>
            <Icon name="x" size={15} color={C.muted}/>
          </button>}
        </div>

        {loading ? (
          <div style={{height:220,background:C.card,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.border}`,marginBottom:10}}>
            <div className="spin" style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`}}/>
          </div>
        ) : (
          <MapView spots={spots} selected={selected} onSelect={s=>{ setSelected(s); closeDirections(); }} userLocation={userLocation} directions={directions} onDirections={openDirections}/>
        )}

        {directionsSpot && <DirectionsPanel spot={directionsSpot} userLocation={userLocation} directions={directions} loading={directionsLoading} onClose={closeDirections}/>}

        <div style={{display:"flex",gap:6,marginBottom:11}}>
          <StatBox icon="parking" label="Locations" value={spots.length} color={C.accent}/>
          <StatBox icon="check-circle" label="Available" value={spots.filter(s=>(s.available_spaces??0)>0).length} color={C.blue}/>
          <StatBox icon="credit-card" label="Avg/hr" value={spots.length ? `KES ${Math.round(spots.reduce((a,s)=>a+(s.price_per_hour||0),0)/spots.length)}` : "—"} color={C.warn}/>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:11,overflowX:"auto",paddingBottom:2}}>
          {["All","Mall","Office","Available"].map(f=>(
            <button key={f} onClick={()=>{ setFilter(f); setSearch(""); }} style={{flexShrink:0,padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700,background:filter===f?C.accent:C.card,color:filter===f?(C.mode==="dark"?"#0A0F1E":"#fff"):C.muted,border:`1px solid ${filter===f?C.accent:C.border}`,cursor:"pointer",transition:"all 0.15s"}}>{f}</button>
          ))}
        </div>

        <div style={{fontSize:11,color:C.muted,marginBottom:9}}>
          {loading ? "Loading spots…" : `${filtered.length} location${filtered.length!==1?"s":""} · real-time updates`}
        </div>

        {filtered.map(s => <SpotCard key={s.id} spot={s} onClick={openBooking} onDirections={openDirections}/>)}
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
              <Card key={i} style={{marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{b.vehicle_plate}</div>
                  <div style={{fontSize:11,color:C.muted}}>{b.spot_name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,color:C.accent,fontWeight:700}}>{b.hours}hr</div>
                  <div style={{fontSize:10,color:C.muted}}>Exp {new Date(b.expires_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
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
            <Input label="Location Name" placeholder="Westlands Square Parking" value={sform.name} onChange={e=>sf("name",e.target.value)}/>
            <Input label="Area / Neighbourhood" placeholder="Westlands" value={sform.area} onChange={e=>sf("area",e.target.value)}/>
            <Input label="Full Address" placeholder="Westlands Rd, Nairobi" value={sform.address} onChange={e=>sf("address",e.target.value)}/>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><Input label="Latitude" placeholder="-1.2676" type="number" value={sform.lat} onChange={e=>sf("lat",e.target.value)}/></div>
              <div style={{flex:1}}><Input label="Longitude" placeholder="36.8116" type="number" value={sform.lng} onChange={e=>sf("lng",e.target.value)}/></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><Input label="Total Spaces" placeholder="50" type="number" value={sform.totalSpaces} onChange={e=>sf("totalSpaces",e.target.value)}/></div>
              <div style={{flex:1}}><Input label="Price/Hour (KES)" placeholder="150" type="number" value={sform.pricePerHour} onChange={e=>sf("pricePerHour",e.target.value)}/></div>
            </div>
            <Select label="Type" value={sform.type} onChange={e=>sf("type",e.target.value)}>
              {["Mall","Office","Street","Residential","Other"].map(t=><option key={t} value={t}>{t}</option>)}
            </Select>
            <Input label="Amenities (comma separated)" placeholder="CCTV, Covered, EV Charging" value={sform.amenities} onChange={e=>sf("amenities",e.target.value)}/>
            <Input label="Contact Phone" placeholder="+254 20 123 4567" value={sform.phone} onChange={e=>sf("phone",e.target.value)}/>
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
            <Input label="Business Name" placeholder="Mwangi Parking Ltd" value={pform.businessName} onChange={e=>pf("businessName",e.target.value)}/>
            <Input label="M-Pesa Phone" placeholder="+254 712 345 678" type="tel" value={pform.mpesaPhone} onChange={e=>pf("mpesaPhone",e.target.value)}/>
            <Input label="M-Pesa Account / Till No." placeholder="174379" value={pform.mpesaAccount} onChange={e=>pf("mpesaAccount",e.target.value)}/>
            <Input label="National ID Number" placeholder="12345678" value={pform.idNumber} onChange={e=>pf("idNumber",e.target.value)}/>
            <Input label="KRA PIN (optional)" placeholder="A000000000Z" value={pform.kraPin} onChange={e=>pf("kraPin",e.target.value)}/>
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
