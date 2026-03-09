import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket, authApi, spotsApi, bookingsApi, paymentsApi, providerApi, adminApi } from "./services";
import "./App.css";

const C = {
  bg:"#0A0F1E", card:"#111827", border:"#1E2D3D",
  accent:"#00E5A0", accentSoft:"#00E5A015",
  blue:"#4DA6FF", text:"#F0F4FF", muted:"#6B7A99",
  warn:"#FFB800", danger:"#FF4D6D", purple:"#A855F7",
};

const fmt = (n) => `KES ${(n||0).toLocaleString()}`;
const pct = (a,t) => t ? `${Math.round((a/t)*100)}%` : "0%";
const initials = (n) => n?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?";
const timeAgo = (d) => { const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60)return`${s}s ago`; if(s<3600)return`${Math.floor(s/60)}m ago`; if(s<86400)return`${Math.floor(s/3600)}h ago`; return new Date(d).toLocaleDateString("en-KE"); };

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Input = ({ label, ...p }) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
    <input {...p} style={{width:"100%",background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",fontSize:14,color:C.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",...p.style}}/>
  </div>
);
const Select = ({ label, children, ...p }) => (
  <div style={{marginBottom:12}}>
    {label&&<div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
    <select {...p} style={{width:"100%",background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",fontSize:14,color:C.text,outline:"none",fontFamily:"inherit",...p.style}}>{children}</select>
  </div>
);
const Btn = ({ children, variant="primary", loading, ...p }) => (
  <button {...p} disabled={loading||p.disabled} style={{
    width:"100%",padding:"13px",borderRadius:12,fontSize:14,fontWeight:800,cursor:loading?"wait":"pointer",border:"none",transition:"all 0.15s",
    background:variant==="primary"?`linear-gradient(135deg,${C.accent},#00C488)`:variant==="danger"?C.danger:variant==="purple"?C.purple:C.accentSoft,
    color:variant==="primary"?C.bg:variant==="danger"||variant==="purple"?"#fff":C.accent,
    opacity:loading?0.7:1, boxShadow:variant==="primary"?`0 6px 20px ${C.accent}40`:"none", ...p.style
  }}>{loading?"Please wait…":children}</button>
);
const Card = ({ children, style }) => (
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,...style}}>{children}</div>
);
const Badge = ({ children, color=C.accent }) => (
  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${color}18`,color,border:`1px solid ${color}30`}}>{children}</span>
);
const StatBox = ({ icon, label, value, color=C.accent, sub }) => (
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 10px",textAlign:"center",flex:1}}>
    <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
    <div style={{fontSize:16,fontWeight:800,color}}>{value}</div>
    <div style={{fontSize:9,color:C.muted,fontWeight:600}}>{label}</div>
    {sub&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>{sub}</div>}
  </div>
);

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
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
    } catch(e) { setError(e.response?.data?.error||"Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{height:"100%",overflowY:"auto",padding:"28px 22px 24px"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:44,marginBottom:6}}>🅿️</div>
        <div style={{fontSize:22,fontWeight:800,color:C.text}}>ParkSmart Nairobi</div>
        <div style={{fontSize:11,color:C.muted}}>Smart Parking · Real Time · M-Pesa</div>
      </div>
      <div style={{display:"flex",background:C.card,borderRadius:12,padding:4,marginBottom:20,border:`1px solid ${C.border}`}}>
        {[["login","Sign In"],["register","Register"]].map(([m,l])=>(
          <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:mode===m?C.accent:"none",color:mode===m?C.bg:C.muted,transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>
      {mode==="register"&&(
        <>
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {[["driver","🚗 Driver"],["provider","🏢 Parking Provider"]].map(([r,l])=>(
              <button key={r} onClick={()=>setRole(r)} style={{flex:1,padding:"10px 6px",borderRadius:11,border:`2px solid ${role===r?C.accent:C.border}`,background:role===r?C.accentSoft:"none",color:role===r?C.accent:C.muted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <Input label="Full Name" placeholder="James Mwangi" value={form.fullName} onChange={e=>set("fullName",e.target.value)}/>
          <Input label="Phone" placeholder="+254 712 345 678" type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
        </>
      )}
      <Input label="Email" placeholder="james@email.com" type="email" value={form.email} onChange={e=>set("email",e.target.value)}/>
      <Input label="Password" placeholder="Min. 6 characters" type="password" value={form.password} onChange={e=>set("password",e.target.value)}/>
      {error&&<div style={{color:C.danger,fontSize:12,marginBottom:12,padding:"8px 12px",background:"#FF4D6D10",borderRadius:8}}>⚠ {error}</div>}
      <Btn loading={loading} onClick={submit}>{mode==="login"?"Sign In":"Create Account"}</Btn>
      {mode==="register"&&role==="provider"&&(
        <div style={{marginTop:12,padding:"10px 12px",background:"#4DA6FF10",borderRadius:10,border:`1px solid ${C.blue}30`,fontSize:11,color:C.muted}}>
          🏢 As a provider you can list your parking space, set pricing and receive payments directly via M-Pesa. ParkSmart charges 20% commission per booking.
        </div>
      )}
    </div>
  );
}

// ─── Driver App ───────────────────────────────────────────────────────────────
function MapView({ spots, selected, onSelect }) {
  const toX = (lng) => Math.max(2,Math.min(96,((lng-36.70)/0.22)*100));
  const toY = (lat) => Math.max(2,Math.min(96,((-1.18-lat)/(-0.20))*100));
  return (
    <div style={{position:"relative",width:"100%",height:220,background:"linear-gradient(135deg,#0D1B2A,#0A2540)",borderRadius:18,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
        <path d="M 0 110 Q 200 100 400 110 T 700 105" stroke="#1E5A4025" strokeWidth="12" fill="none"/>
        <path d="M 240 0 Q 245 110 240 220" stroke="#1E5A4025" strokeWidth="8" fill="none"/>
        <path d="M 0 65 Q 300 70 600 55" stroke="#1E5A4018" strokeWidth="4" fill="none"/>
        <path d="M 0 168 Q 350 163 700 173" stroke="#1E5A4018" strokeWidth="4" fill="none"/>
      </svg>
      {spots.map(s=>{
        const x=toX(s.lng||s.lng),y=toY(s.lat||s.lat);
        const sel=selected?.id===s.id;
        const avail=s.available_spaces??s.available??0;
        const dc=avail===0?C.danger:avail<=5?C.warn:C.accent;
        return(
          <button key={s.id} onClick={()=>avail>0&&onSelect(s)} style={{position:"absolute",left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)",background:sel?C.accent:C.card,border:`2px solid ${sel?C.accent:dc}`,borderRadius:sel?8:"50%",padding:sel?"2px 7px":"5px",cursor:avail>0?"pointer":"not-allowed",zIndex:sel?10:5,transition:"all 0.2s",boxShadow:sel?`0 0 12px ${C.accent}60`:`0 0 4px ${dc}40`}}>
            {sel?<span style={{fontSize:9,fontWeight:800,color:C.bg,whiteSpace:"nowrap"}}>KES {s.price_per_hour}/hr</span>
                :<div style={{position:"relative",width:8,height:8}}><div className="pulse-ring" style={{position:"absolute",inset:0,borderRadius:"50%",background:dc,opacity:0.35}}/><div style={{position:"absolute",inset:2,borderRadius:"50%",background:dc}}/></div>}
          </button>
        );
      })}
      <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:12,height:12,borderRadius:"50%",background:C.blue,border:"3px solid white",boxShadow:`0 0 14px ${C.blue}80`}}/>
      <div style={{position:"absolute",top:8,left:8,background:"#00000060",backdropFilter:"blur(8px)",borderRadius:7,padding:"2px 8px",fontSize:9,color:C.muted}}>📍 Nairobi</div>
      <div style={{position:"absolute",top:8,right:8,background:"#00000060",backdropFilter:"blur(8px)",borderRadius:7,padding:"2px 8px",fontSize:9,color:C.accent}}>{spots.filter(s=>(s.available_spaces??0)>0).length}/{spots.length} free</div>
    </div>
  );
}

function SpotCard({ spot, onClick }) {
  const avail = spot.available_spaces??spot.available??0;
  const color = avail===0?C.danger:avail<=5?C.warn:C.accent;
  return (
    <Card style={{cursor:"pointer",opacity:avail===0?0.6:1,marginBottom:8}} onClick={()=>onClick(spot)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
        <div style={{flex:1,minWidth:0,marginRight:10}}>
          <div style={{display:"flex",gap:5,marginBottom:3,alignItems:"center"}}>
            <Badge>{spot.type}</Badge>
            <span style={{fontSize:9,color:C.muted}}>{spot.area}</span>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:1}}>{spot.name}</div>
          <div style={{fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{spot.address}</div>
          {spot.amenities?.length>0&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>{spot.amenities.slice(0,3).join(" · ")}</div>}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:800,color:C.accent}}>KES {spot.price_per_hour}</div>
          <div style={{fontSize:9,color:C.muted}}>per hour</div>
          <div style={{fontSize:9,color:C.muted,marginTop:2}}>⭐ {spot.rating}</div>
        </div>
      </div>
      <div style={{width:"100%",height:3,background:"#1E2D3D",borderRadius:3,overflow:"hidden",marginBottom:5}}>
        <div className="avail-bar" style={{width:`${avail/(spot.total_spaces||spot.total||1)*100}%`,height:"100%",background:color,borderRadius:3}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
        <span style={{color,fontWeight:700}}>{avail===0?"Full":avail<=5?`Only ${avail} left`:`${avail} spaces free`}</span>
        <span className="live-badge">● LIVE</span>
      </div>
    </Card>
  );
}

function BookingModal({ spot, user, onClose, onSuccess }) {
  const [hours, setHours] = useState(1);
  const [plate, setPlate] = useState(user?.vehicles?.[0]||"");
  const [phone, setPhone] = useState(user?.phone||"");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const total = (spot.price_per_hour||spot.price||0)*hours;

  const book = async () => {
    if (!plate.trim()) return setError("Enter your vehicle plate number");
    if (!phone.trim()) return setError("Enter your M-Pesa phone number");
    if ((spot.available_spaces??spot.available??0) <= 0) return setError("This spot is currently full");
    setError(""); setStep("paying");
    try {
      const { booking } = await bookingsApi.create({ spotId:spot.id, hours, vehiclePlate:plate });
      await paymentsApi.stkPush({ phone, amount:booking.total_amount||booking.total, bookingId:booking.id });
      setTimeout(()=>onSuccess(booking), 3500);
    } catch(e) { setError(e.response?.data?.error||"Booking failed"); setStep("form"); }
  };

  return (
    <div style={{position:"absolute",inset:0,background:"#000000CC",backdropFilter:"blur(6px)",zIndex:100,display:"flex",alignItems:"flex-end",borderRadius:40}}>
      <div className="slide-up" style={{width:"100%",background:C.card,borderRadius:"22px 22px 0 0",border:`1px solid ${C.border}`,padding:"20px 18px 28px",boxSizing:"border-box"}}>
        {step==="paying"?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div className="spin" style={{width:48,height:48,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,margin:"0 auto 16px"}}/>
            <div style={{fontSize:16,fontWeight:700,color:C.text}}>M-Pesa STK Push Sent</div>
            <div style={{fontSize:12,color:C.muted,marginTop:6}}>Enter your PIN on {phone}</div>
            <div style={{fontSize:11,color:C.accent,marginTop:4}}>KES {total.toLocaleString()}</div>
          </div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div><div style={{fontSize:15,fontWeight:800,color:C.text}}>{spot.name}</div><div style={{fontSize:10,color:C.muted}}>{spot.address}</div></div>
              <button onClick={onClose} style={{background:"#1E2D3D",border:"none",color:C.muted,width:28,height:28,borderRadius:"50%",cursor:"pointer"}}>✕</button>
            </div>
            <Input label="Vehicle Plate" placeholder="KBX 123D" value={plate} onChange={e=>setPlate(e.target.value)} style={{fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase"}}/>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Duration</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>setHours(Math.max(1,hours-1))} style={{width:36,height:36,borderRadius:"50%",background:"#1E2D3D",border:`1px solid ${C.border}`,color:C.text,fontSize:18,cursor:"pointer"}}>−</button>
                <div style={{textAlign:"center",minWidth:60}}>
                  <div style={{fontSize:28,fontWeight:800,color:C.text}}>{hours}</div>
                  <div style={{fontSize:10,color:C.muted}}>hr{hours>1?"s":""}</div>
                </div>
                <button onClick={()=>setHours(Math.min(12,hours+1))} style={{width:36,height:36,borderRadius:"50%",background:"#1E2D3D",border:`1px solid ${C.border}`,color:C.text,fontSize:18,cursor:"pointer"}}>+</button>
                <div style={{marginLeft:"auto",textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.accent}}>KES {total.toLocaleString()}</div>
                  <div style={{fontSize:10,color:C.muted}}>total · 80% to provider</div>
                </div>
              </div>
            </div>
            <Input label="M-Pesa Number" placeholder="+254 712 345 678" type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/>
            {error&&<div style={{color:C.danger,fontSize:12,marginBottom:10,padding:"8px 12px",background:"#FF4D6D10",borderRadius:8}}>⚠ {error}</div>}
            <Btn onClick={book}>🅿️ Reserve & Pay KES {total.toLocaleString()}</Btn>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessScreen({ booking, onDone }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:24,textAlign:"center"}}>
      <div className="pop-in" style={{width:72,height:72,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},#00C488)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:16,boxShadow:`0 0 30px ${C.accent}60`}}>✓</div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Spot Reserved!</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Check your phone for M-Pesa confirmation</div>
      <Card style={{width:"100%",marginBottom:18}}>
        {[["Booking ID",booking.id],["Location",booking.spot_name||booking.spotName],["Vehicle",booking.vehicle_plate||booking.vehiclePlate],["Duration",`${booking.hours} hr${booking.hours>1?"s":""}`],["Total Paid",`KES ${(booking.total_amount||booking.total||0).toLocaleString()}`]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:11,color:C.muted}}>{k}</span>
            <span style={{fontSize:11,fontWeight:700,color:C.text}}>{v}</span>
          </div>
        ))}
      </Card>
      <Btn onClick={onDone} variant="outline">Back to Explore</Btn>
    </div>
  );
}

function AccountScreen({ user, setUser, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName:user.full_name||user.fullName, phone:user.phone, vehicles:user.vehicles||[], currentPassword:"", newPassword:"" });
  const [vi, setVi] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type:"", text:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    setMsg({ type:"",text:"" }); setLoading(true);
    try {
      const p = { fullName:form.fullName, phone:form.phone, vehicles:form.vehicles };
      if (form.newPassword) { p.currentPassword=form.currentPassword; p.newPassword=form.newPassword; }
      const data = await authApi.update(p);
      setUser(data.user); setMsg({ type:"ok", text:"Profile updated!" }); setEditing(false);
    } catch(e) { setMsg({ type:"err", text:e.response?.data?.error||"Update failed" }); }
    finally { setLoading(false); }
  };

  const name = user.full_name||user.fullName||"";
  return (
    <div style={{padding:"14px 16px 80px",overflowY:"auto",height:"100%",boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text}}>My Account</div>
        <button onClick={()=>{setEditing(!editing);setMsg({type:"",text:""}); }} style={{background:editing?C.accentSoft:"#1E2D3D",border:`1px solid ${editing?C.accent:C.border}`,color:editing?C.accent:C.muted,borderRadius:20,padding:"5px 13px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{editing?"Cancel":"Edit"}</button>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.accent}18,${C.blue}0a)`,border:`1px solid ${C.accent}25`,borderRadius:16,padding:16,marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},#00C488)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:C.bg,flexShrink:0}}>{initials(name)}</div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:C.text}}>{name}</div>
          <div style={{fontSize:11,color:C.muted}}>{user.email}</div>
          <div style={{fontSize:10,color:C.accent,marginTop:2}}>🎁 {user.loyalty_points||user.loyaltyPoints||0} loyalty pts</div>
        </div>
      </div>
      {editing?(
        <div>
          <Input label="Full Name" value={form.fullName} onChange={e=>set("fullName",e.target.value)}/>
          <Input label="Phone" value={form.phone} onChange={e=>set("phone",e.target.value)} type="tel"/>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>My Vehicles</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:7}}>
              {form.vehicles.map(v=>(
                <div key={v} style={{display:"flex",alignItems:"center",gap:4,background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 9px"}}>
                  <span style={{fontSize:11,fontFamily:"monospace",fontWeight:700,color:C.text}}>{v}</span>
                  <button onClick={()=>set("vehicles",form.vehicles.filter(x=>x!==v))} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:11,padding:0}}>✕</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:7}}>
              <input value={vi} onChange={e=>setVi(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&vi.trim()){set("vehicles",[...form.vehicles,vi.trim().toUpperCase()]);setVi("");}}} placeholder="Add plate e.g. KBX 123D" style={{flex:1,background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:9,padding:"8px 11px",fontSize:12,color:C.text,outline:"none",fontFamily:"monospace",textTransform:"uppercase"}}/>
              <button onClick={()=>{if(vi.trim()){set("vehicles",[...form.vehicles,vi.trim().toUpperCase()]);setVi("");}}} style={{background:C.accentSoft,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:9,padding:"8px 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Add</button>
            </div>
          </div>
          <Card style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:8}}>CHANGE PASSWORD (optional)</div>
            <Input label="Current Password" type="password" placeholder="Current password" value={form.currentPassword} onChange={e=>set("currentPassword",e.target.value)}/>
            <Input label="New Password" type="password" placeholder="New password" value={form.newPassword} onChange={e=>set("newPassword",e.target.value)}/>
          </Card>
          {msg.text&&<div style={{color:msg.type==="ok"?C.accent:C.danger,fontSize:12,marginBottom:10,padding:"8px 12px",background:msg.type==="ok"?C.accentSoft:"#FF4D6D10",borderRadius:8}}>{msg.type==="ok"?"✓":"⚠"} {msg.text}</div>}
          <Btn loading={loading} onClick={save}>Save Changes</Btn>
        </div>
      ):(
        <>
          {[["👤","Full Name",name],["📧","Email",user.email],["📱","Phone",user.phone||"Not set"],["🚗","Vehicles",(user.vehicles||[]).length>0?(user.vehicles||[]).join(", "):"None added"],["🎁","Loyalty Points",`${user.loyalty_points||0} pts`],["📅","Member Since",user.created_at?new Date(user.created_at).toLocaleDateString("en-KE",{month:"long",year:"numeric"}):"N/A"]].map(([i,l,v])=>(
            <Card key={l} style={{marginBottom:7,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:17}}>{i}</span>
              <div><div style={{fontSize:10,color:C.muted,fontWeight:600}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{v}</div></div>
            </Card>
          ))}
          <div style={{marginTop:10}}>
            <Btn variant="danger" onClick={onLogout} style={{background:"none",border:`1px solid ${C.danger}`,color:C.danger}}>Sign Out</Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Provider Portal ──────────────────────────────────────────────────────────
function ProviderPortal({ user }) {
  const [tab, setTab] = useState("dashboard");
  const [dash, setDash] = useState(null);
  const [providerDetails, setProviderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ businessName:"", mpesaPhone:"", mpesaAccount:"", idNumber:"", kraPin:"" });
  const [spotForm, setSpotForm] = useState({ name:"", area:"", address:"", lat:"", lng:"", totalSpaces:"", pricePerHour:"", type:"Mall", amenities:"", phone:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([providerApi.getDashboard(), providerApi.getMe()]);
      setDash(d); setProviderDetails(p.provider);
      if (p.provider) setForm({ businessName:p.provider.business_name||"", mpesaPhone:p.provider.mpesa_phone||"", mpesaAccount:p.provider.mpesa_account||"", idNumber:p.provider.id_number||"", kraPin:p.provider.kra_pin||"" });
    } catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const saveDetails = async () => {
    setSaving(true); setMsg("");
    try { await providerApi.register(form); await load(); setMsg("✓ Details saved"); } catch(e) { setMsg("⚠ "+e.response?.data?.error); }
    finally { setSaving(false); }
  };

  const addSpot = async () => {
    setSaving(true); setMsg("");
    try {
      await providerApi.addSpot({ ...spotForm, amenities:spotForm.amenities.split(",").map(a=>a.trim()).filter(Boolean) });
      setSpotForm({ name:"", area:"", address:"", lat:"", lng:"", totalSpaces:"", pricePerHour:"", type:"Mall", amenities:"", phone:"" });
      await load(); setMsg("✓ Spot submitted for approval!");
    } catch(e) { setMsg("⚠ "+e.response?.data?.error); }
    finally { setSaving(false); }
  };

  const sf = (k,v) => setSpotForm(f=>({...f,[k]:v}));
  const pf = (k,v) => setForm(f=>({...f,[k]:v}));

  const tabs = [["dashboard","📊 Dashboard"],["spots","🅿️ My Spots"],["add","➕ Add Spot"],["settings","⚙️ Settings"]];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 16px 0",background:C.card,borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:8}}>🏢 Provider Portal</div>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:8}}>
          {tabs.map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"6px 11px",borderRadius:20,fontSize:10,fontWeight:700,background:tab===id?C.accent:"none",color:tab===id?C.bg:C.muted,border:`1px solid ${tab===id?C.accent:C.border}`,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 20px"}}>
        {loading?<div style={{textAlign:"center",padding:40,color:C.muted}}>Loading…</div>:
        tab==="dashboard"?(
          <>
            <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap"}}>
              <StatBox icon="💰" label="Total Revenue" value={fmt(dash?.stats?.totalRevenue)} color={C.accent}/>
              <StatBox icon="🏦" label="Your Payout (80%)" value={fmt(dash?.stats?.totalPayout)} color={C.blue}/>
            </div>
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              <StatBox icon="📋" label="Commission (20%)" value={fmt(dash?.stats?.totalCommission)} color={C.warn}/>
              <StatBox icon="🔖" label="Bookings" value={dash?.stats?.totalBookings||0} color={C.purple}/>
            </div>
            {/* Cars currently parked */}
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>🚗 Cars Currently Parked ({(dash?.carsCurrentlyParked||[]).length})</div>
            {(dash?.carsCurrentlyParked||[]).length===0?<Card style={{textAlign:"center",color:C.muted,fontSize:12,padding:"20px 0",marginBottom:14}}>No cars currently parked</Card>:(dash?.carsCurrentlyParked||[]).map((b,i)=>(
              <Card key={i} style={{marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{b.vehicle_plate}</div>
                  <div style={{fontSize:10,color:C.muted}}>{b.spot_name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.accent}}>{b.hours}hr{b.hours>1?"s":""}</div>
                  <div style={{fontSize:9,color:C.muted}}>Expires {new Date(b.expires_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </Card>
            ))}
            {/* Recent bookings */}
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>📋 Recent Bookings</div>
            {(dash?.recentBookings||[]).slice(0,5).map(b=>(
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.muted}}>{b.id}</span>
                  <span style={{fontSize:10,color:C.accent,fontWeight:700}}>{fmt(b.provider_amount)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted}}>
                  <span>🚗 {b.vehicle_plate}</span>
                  <span>⏱ {b.hours}hr</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        ):tab==="spots"?(
          <>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10}}>My Parking Locations ({(dash?.spots||[]).length})</div>
            {(dash?.spots||[]).length===0?<Card style={{textAlign:"center",color:C.muted,fontSize:12,padding:"30px 0"}}><div style={{fontSize:28,marginBottom:8}}>🅿️</div>No spots yet. Add one!</Card>:(dash?.spots||[]).map(s=>(
              <Card key={s.id} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</div>
                    <div style={{fontSize:10,color:C.muted}}>{s.address}</div>
                  </div>
                  <Badge color={s.is_approved?C.accent:C.warn}>{s.is_approved?"Approved":"Pending"}</Badge>
                </div>
                <div style={{display:"flex",gap:8,fontSize:10,color:C.muted}}>
                  <span>Total: {s.total_spaces}</span>
                  <span style={{color:s.available_spaces===0?C.danger:C.accent}}>Available: {s.available_spaces}</span>
                  <span>{s.is_active?"🟢 Active":"🔴 Inactive"}</span>
                </div>
              </Card>
            ))}
          </>
        ):tab==="add"?(
          <>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>Add New Parking Location</div>
            <Card>
              <Input label="Location Name" placeholder="Westlands Square Parking" value={spotForm.name} onChange={e=>sf("name",e.target.value)}/>
              <Input label="Area / Neighbourhood" placeholder="Westlands" value={spotForm.area} onChange={e=>sf("area",e.target.value)}/>
              <Input label="Full Address" placeholder="Westlands Rd, Nairobi" value={spotForm.address} onChange={e=>sf("address",e.target.value)}/>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}><Input label="Latitude" placeholder="-1.2676" type="number" value={spotForm.lat} onChange={e=>sf("lat",e.target.value)}/></div>
                <div style={{flex:1}}><Input label="Longitude" placeholder="36.8116" type="number" value={spotForm.lng} onChange={e=>sf("lng",e.target.value)}/></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}><Input label="Total Spaces" placeholder="50" type="number" value={spotForm.totalSpaces} onChange={e=>sf("totalSpaces",e.target.value)}/></div>
                <div style={{flex:1}}><Input label="Price/Hour (KES)" placeholder="150" type="number" value={spotForm.pricePerHour} onChange={e=>sf("pricePerHour",e.target.value)}/></div>
              </div>
              <Select label="Type" value={spotForm.type} onChange={e=>sf("type",e.target.value)}>
                {["Mall","Office","Street","Residential","Other"].map(t=><option key={t} value={t}>{t}</option>)}
              </Select>
              <Input label="Amenities (comma-separated)" placeholder="CCTV, Covered, EV Charging" value={spotForm.amenities} onChange={e=>sf("amenities",e.target.value)}/>
              <Input label="Contact Phone" placeholder="+254 20 123 4567" type="tel" value={spotForm.phone} onChange={e=>sf("phone",e.target.value)}/>
              {msg&&<div style={{color:msg.startsWith("✓")?C.accent:C.danger,fontSize:12,marginBottom:8,padding:"7px 10px",background:msg.startsWith("✓")?C.accentSoft:"#FF4D6D10",borderRadius:8}}>{msg}</div>}
              <Btn loading={saving} onClick={addSpot}>Submit for Approval</Btn>
            </Card>
            <div style={{marginTop:10,padding:"10px 12px",background:"#FFB80010",borderRadius:10,border:`1px solid ${C.warn}30`,fontSize:11,color:C.muted}}>
              ⚠ Spots require admin approval before going live. Usually takes 1-2 business days.
            </div>
          </>
        ):(
          <>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>Payment & Business Details</div>
            <Card style={{marginBottom:12}}>
              <Input label="Business Name" placeholder="Mwangi Parking Ltd" value={form.businessName} onChange={e=>pf("businessName",e.target.value)}/>
              <Input label="M-Pesa Phone (receives payments)" placeholder="+254 712 345 678" type="tel" value={form.mpesaPhone} onChange={e=>pf("mpesaPhone",e.target.value)}/>
              <Input label="M-Pesa Account / Till No. (optional)" placeholder="174379" value={form.mpesaAccount} onChange={e=>pf("mpesaAccount",e.target.value)}/>
              <Input label="ID Number" placeholder="12345678" value={form.idNumber} onChange={e=>pf("idNumber",e.target.value)}/>
              <Input label="KRA PIN (optional)" placeholder="A000000000Z" value={form.kraPin} onChange={e=>pf("kraPin",e.target.value)}/>
              {msg&&<div style={{color:msg.startsWith("✓")?C.accent:C.danger,fontSize:12,marginBottom:8,padding:"7px 10px",background:msg.startsWith("✓")?C.accentSoft:"#FF4D6D10",borderRadius:8}}>{msg}</div>}
              <Btn loading={saving} onClick={saveDetails}>Save Payment Details</Btn>
            </Card>
            <div style={{padding:"10px 12px",background:C.accentSoft,borderRadius:10,border:`1px solid ${C.accent}30`,fontSize:11,color:C.muted}}>
              💳 Payments go directly to your M-Pesa after each booking. ParkSmart deducts 20% commission automatically.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Admin Portal ─────────────────────────────────────────────────────────────
function AdminPortal() {
  const [tab, setTab] = useState("overview");
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await adminApi.getDashboard(); setDash(d); } catch(e) {}
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{load();},[load]);

  const approve = async (id, val) => {
    setApprovingId(id);
    try { await adminApi.approveSpot(id, val); await load(); } catch(e) {}
    finally { setApprovingId(null); }
  };

  const tabs = [["overview","📊 Overview"],["providers","🏢 Providers"],["spots","🅿️ Spots"],["users","👥 Users"],["bookings","📋 Bookings"]];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 16px 0",background:`linear-gradient(135deg,${C.purple}18,${C.card})`,borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:13,fontWeight:800,color:C.purple,marginBottom:8}}>⚡ Admin Panel</div>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:8}}>
          {tabs.map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,fontSize:10,fontWeight:700,background:tab===id?C.purple:"none",color:tab===id?"#fff":C.muted,border:`1px solid ${tab===id?C.purple:C.border}`,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 20px"}}>
        {loading?<div style={{textAlign:"center",padding:40,color:C.muted}}>Loading…</div>:
        tab==="overview"&&dash?(
          <>
            <div style={{display:"flex",gap:7,marginBottom:8}}>
              <StatBox icon="💰" label="Total Revenue" value={fmt(dash.stats.totalRevenue)} color={C.accent}/>
              <StatBox icon="🏦" label="Commission (20%)" value={fmt(dash.stats.totalCommission)} color={C.purple}/>
            </div>
            <div style={{display:"flex",gap:7,marginBottom:8}}>
              <StatBox icon="🅿️" label="Active Spots" value={dash.stats.activeSpots} color={C.blue}/>
              <StatBox icon="📋" label="Bookings" value={dash.stats.totalBookings} color={C.warn}/>
            </div>
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              <StatBox icon="🚗" label="Drivers" value={dash.stats.totalUsers} color={C.accent}/>
              <StatBox icon="🏢" label="Providers" value={dash.stats.totalProviders} color={C.blue}/>
              <StatBox icon="⏳" label="Pending" value={dash.stats.pendingApprovals} color={C.warn}/>
            </div>
            {dash.stats.pendingApprovals>0&&(
              <>
                <div style={{fontSize:12,fontWeight:700,color:C.warn,marginBottom:8}}>⏳ Pending Approvals ({dash.stats.pendingApprovals})</div>
                {(dash.pendingSpots||[]).map(s=>(
                  <Card key={s.id} style={{marginBottom:8,border:`1px solid ${C.warn}40`}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginBottom:8}}>{s.address} · {s.total_spaces} spaces · KES {s.price_per_hour}/hr</div>
                    <div style={{display:"flex",gap:7}}>
                      <button onClick={()=>approve(s.id,true)} disabled={approvingId===s.id} style={{flex:1,padding:"8px",background:C.accent,color:C.bg,border:"none",borderRadius:8,fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Approve</button>
                      <button onClick={()=>approve(s.id,false)} disabled={approvingId===s.id} style={{flex:1,padding:"8px",background:"none",color:C.danger,border:`1px solid ${C.danger}`,borderRadius:8,fontWeight:700,fontSize:12,cursor:"pointer"}}>✕ Reject</button>
                    </div>
                  </Card>
                ))}
              </>
            )}
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>📋 Recent Bookings</div>
            {(dash.recentBookings||[]).slice(0,8).map(b=>(
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.muted}}>{b.id}</span>
                  <span style={{fontSize:11,fontWeight:700,color:C.accent}}>{fmt(b.total_amount)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted}}>
                  <span>Comm: {fmt(b.commission_amount)}</span>
                  <span>🚗 {b.vehicle_plate}</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        ):tab==="providers"&&dash?(
          <>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10}}>Registered Providers ({(dash.providerStats||[]).length})</div>
            {(dash.providerStats||[]).length===0?<Card style={{textAlign:"center",color:C.muted,fontSize:12,padding:"30px 0"}}>No providers yet</Card>:(dash.providerStats||[]).map(p=>(
              <Card key={p.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{p.businessName||p.full_name}</div>
                    <div style={{fontSize:10,color:C.muted}}>{p.email} · {p.spots?.length||0} locations</div>
                  </div>
                  <Badge color={C.purple}>Provider</Badge>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <StatBox icon="💰" label="Revenue" value={fmt(p.totalRevenue)} color={C.accent}/>
                  <StatBox icon="🏦" label="Payout (80%)" value={fmt(p.payout)} color={C.blue}/>
                  <StatBox icon="📋" label="Commission" value={fmt(p.commission)} color={C.purple}/>
                </div>
                <div style={{fontSize:10,color:C.muted}}>{p.bookingCount} paid bookings · M-Pesa: {p.mpesaPhone||"Not set"}</div>
                {(p.spots||[]).map(s=><div key={s.id} style={{fontSize:10,color:C.muted,marginTop:3}}>🅿️ {s.name}</div>)}
              </Card>
            ))}
          </>
        ):tab==="spots"&&dash?(
          <>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10}}>All Parking Locations ({(dash.providerStats||[]).reduce((s,p)=>s+(p.spots?.length||0),0)})</div>
            {(dash.providerStats||[]).flatMap(p=>(p.spots||[]).map(s=>({ ...s, providerName:p.businessName||p.full_name }))).concat(
              (dash.allUsers||[]).filter(u=>u.role==="admin").length>0 ? [] : []
            ).map(s=>(
              <Card key={s.id} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</div><div style={{fontSize:10,color:C.muted}}>{s.providerName}</div></div>
                  <Badge color={s.is_approved?C.accent:C.warn}>{s.is_approved?"Live":"Pending"}</Badge>
                </div>
              </Card>
            ))}
          </>
        ):tab==="users"&&dash?(
          <>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10}}>All Users ({(dash.allUsers||[]).length})</div>
            {(dash.allUsers||[]).map(u=>(
              <Card key={u.id} style={{marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{u.full_name}</div>
                  <div style={{fontSize:10,color:C.muted}}>{u.email} · {timeAgo(u.created_at)}</div>
                </div>
                <Badge color={u.role==="admin"?C.purple:u.role==="provider"?C.blue:C.accent}>{u.role}</Badge>
              </Card>
            ))}
          </>
        ):tab==="bookings"&&dash?(
          <>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10}}>All Paid Bookings ({(dash.recentBookings||[]).length})</div>
            {(dash.recentBookings||[]).map(b=>(
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.muted}}>{b.id}</span>
                  <span style={{fontSize:11,fontWeight:700,color:C.accent}}>{fmt(b.total_amount)}</span>
                </div>
                <div style={{fontSize:11,color:C.text,marginBottom:3}}>{b.spot_name}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted}}>
                  <span>🚗 {b.vehicle_plate}</span>
                  <span>Comm: {fmt(b.commission_amount)}</span>
                  <span>Payout: {fmt(b.provider_amount)}</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        ):null}
      </div>
    </div>
  );
}

// ─── Driver Home ──────────────────────────────────────────────────────────────
function DriverHome({ user, spots, setSpots, loading, connected }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);
  const [success, setSuccess] = useState(null);

  const filtered = spots.filter(s => {
    if (filter==="Available") return (s.available_spaces??0)>0;
    if (filter==="Mall"||filter==="Office") return s.type===filter;
    if (search) return s.name?.toLowerCase().includes(search.toLowerCase())||s.area?.toLowerCase().includes(search.toLowerCase())||s.address?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  if (success) return (
    <SuccessScreen booking={success} onDone={()=>setSuccess(null)}/>
  );

  return (
    <div style={{position:"relative",height:"100%"}}>
    <div style={{padding:"6px 16px 20px",height:"100%",overflowY:"auto",boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <div style={{fontSize:10,color:C.muted}}>Welcome back 👋</div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>{(user.full_name||user.fullName||"").split(" ")[0]}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 9px"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:connected?C.accent:C.danger,boxShadow:connected?`0 0 5px ${C.accent}`:"none"}}/>
          <span style={{fontSize:9,fontWeight:700,color:connected?C.accent:C.muted}}>{connected?"LIVE":"OFFLINE"}</span>
        </div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"8px 11px",display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
        <span style={{color:C.muted}}>🔍</span>
        <input value={search} onChange={e=>{setSearch(e.target.value);setFilter("All");}} placeholder="Search by name, area or address…" style={{background:"none",border:"none",outline:"none",fontSize:12,color:C.text,width:"100%"}}/>
        {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>✕</button>}
      </div>
      {loading?<div style={{height:220,background:C.card,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.border}`,marginBottom:10}}><div className="spin" style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`}}/></div>:<MapView spots={spots} selected={selected} onSelect={s=>{setSelected(s);setBooking(s);}}/>}
      <div style={{display:"flex",gap:6,margin:"10px 0 8px"}}>
        <StatBox icon="🅿️" label="Locations" value={spots.length} color={C.accent}/>
        <StatBox icon="✅" label="Available" value={spots.filter(s=>(s.available_spaces??0)>0).length} color={C.blue}/>
        <StatBox icon="💳" label="Avg/hr" value={`KES ${spots.length?Math.round(spots.reduce((a,s)=>a+(s.price_per_hour||0),0)/spots.length):0}`} color={C.warn}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto"}}>
        {["All","Mall","Office","Available"].map(f=>(
          <button key={f} onClick={()=>{setFilter(f);setSearch("");}} style={{flexShrink:0,padding:"5px 11px",borderRadius:20,fontSize:10,fontWeight:700,background:filter===f?C.accent:C.card,color:filter===f?C.bg:C.muted,border:`1px solid ${filter===f?C.accent:C.border}`,cursor:"pointer"}}>{f}</button>
        ))}
      </div>
      <div style={{fontSize:10,color:C.muted,marginBottom:7}}>{loading?"Loading…":`${filtered.length} location${filtered.length!==1?"s":""} · real-time data`}</div>
      {filtered.map(s=><SpotCard key={s.id} spot={s} onClick={s=>{setSelected(s);setBooking(s);}}/>)}
    </div>
    {booking&&<BookingModal spot={booking} user={user} onClose={()=>{setBooking(null);setSelected(null);}} onSuccess={b=>{ setSuccess(b);setBooking(null);setSelected(null); }}/>}
    </div>
  );
}

// ─── Bookings Screen ──────────────────────────────────────────────────────────
function BookingsScreen({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async()=>{
    setLoading(true);
    try { const d=await bookingsApi.mine(); setBookings(d.bookings||[]); } catch(e) {}
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const cancel = async (id) => {
    try { await bookingsApi.cancel(id); await load(); } catch(e) {}
  };

  return (
    <div style={{padding:"14px 16px 80px",height:"100%",overflowY:"auto",boxSizing:"border-box"}}>
      <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:14}}>My Bookings</div>
      {loading?<div style={{textAlign:"center",padding:40,color:C.muted}}>Loading…</div>:bookings.length===0?(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:36,marginBottom:10}}>🅿️</div>
          <div style={{fontSize:13,color:C.muted}}>No bookings yet</div>
        </div>
      ):bookings.map(b=>(
        <Card key={b.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
            <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{b.id}</span>
            <Badge color={b.status==="confirmed"?C.accent:b.status==="cancelled"?C.danger:C.muted}>{b.status==="confirmed"?"● Active":b.status==="cancelled"?"✕ Cancelled":"✓ Done"}</Badge>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{b.spot_name}</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:7}}>{b.spot_address}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted}}>
            <span>🚗 {b.vehicle_plate}</span>
            <span>⏱ {b.hours}hr{b.hours>1?"s":""}</span>
            <span style={{color:C.accent,fontWeight:700}}>KES {(b.total_amount||0).toLocaleString()}</span>
          </div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>Payment: <span style={{color:b.payment_status==="paid"?C.accent:C.warn}}>{b.payment_status}</span> · {timeAgo(b.created_at)}</div>
          {b.status==="confirmed"&&(
            <button onClick={()=>cancel(b.id)} style={{marginTop:9,width:"100%",padding:"7px",background:"none",border:`1px solid ${C.danger}`,borderRadius:8,color:C.danger,fontSize:11,fontWeight:700,cursor:"pointer"}}>Cancel Booking</button>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState("home");
  const [spots, setSpots] = useState([]);
  const [connected, setConnected] = useState(false);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const socketRef = useRef(null);

  // Check token
  useEffect(()=>{
    const token = localStorage.getItem("ps_token");
    if (token) {
      authApi.me().then(u=>{ setUser(u); setAuthChecked(true); }).catch(()=>{ localStorage.removeItem("ps_token"); setAuthChecked(true); });
    } else { setAuthChecked(true); }
  },[]);

  // Socket connect (drivers only)
  useEffect(()=>{
    if (!user || user.role!=="driver") return;
    const socket = getSocket();
    socketRef.current = socket;
    socket.on("connect",()=>setConnected(true));
    socket.on("disconnect",()=>setConnected(false));
    socket.on("spot:updated",({spotId,available})=>setSpots(prev=>prev.map(s=>s.id===spotId?{...s,available_spaces:available}:s)));
    socket.on("spots:refresh",async()=>{ const d=await spotsApi.getAll(); setSpots(d.spots||[]); setSpotsLoading(false); });
    socket.emit("user:join",user.id);
    // Always load via HTTP first - fast and reliable
    spotsApi.getAll().then(d=>{ setSpots(d.spots||[]); setSpotsLoading(false); }).catch(()=>setSpotsLoading(false));
    const t = setTimeout(()=>{}, 100);
    return()=>{ clearTimeout(t); socket.off("spots:snapshot"); socket.off("spot:updated"); socket.off("spots:refresh"); };
  },[user]);

  const logout = ()=>{ localStorage.removeItem("ps_token"); setUser(null); setSpots([]); setTab("home"); };

  if (!authChecked) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"#050810"}}>
      <div className="spin" style={{width:40,height:40,borderRadius:"50%",border:`3px solid #1E2D3D`,borderTop:`3px solid #00E5A0`}}/>
    </div>
  );

  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"#050810",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{width:390,height:780,background:C.bg,borderRadius:44,overflow:"hidden",position:"relative",boxShadow:"0 40px 120px #000000CC, 0 0 0 2px #1E2D3D"}}>
        {/* Notch */}
        <div style={{width:110,height:26,background:"#000",borderRadius:20,position:"absolute",left:"50%",transform:"translateX(-50%)",top:0,zIndex:50}}/>

        {/* Content */}
        <div style={{height:"100%",paddingTop:14,boxSizing:"border-box",display:"flex",flexDirection:"column"}}>
          {!user ? (
            <AuthScreen onAuth={u=>{ setUser(u); setTab("home"); }}/>
          ) : user.role==="admin" ? (
            <AdminPortal/>
          ) : user.role==="provider" ? (
            <>
              <ProviderPortal user={user}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",height:64,paddingBottom:6}}>
                <button onClick={()=>logout()} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer"}}>
                  <div style={{fontSize:16}}>🚪</div>
                  <div style={{fontSize:9,fontWeight:700,color:C.muted}}>Sign Out</div>
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{flex:1,overflow:"hidden",position:"relative"}}>
                {tab==="home"&&<DriverHome user={user} spots={spots} setSpots={setSpots} loading={spotsLoading} connected={connected}/>}
                {tab==="bookings"&&<BookingsScreen user={user}/>}
                {tab==="account"&&<AccountScreen user={user} setUser={setUser} onLogout={logout}/>}
              </div>
              <div style={{background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",height:68,paddingBottom:8,flexShrink:0}}>
                {[["home","🗺️","Explore"],["bookings","🅿️","Bookings"],["account","👤","Account"]].map(([id,icon,label])=>(
                  <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
                    <div style={{fontSize:18,filter:tab===id?"none":"grayscale(1) opacity(0.4)"}}>{icon}</div>
                    <div style={{fontSize:9,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.muted}}>{label}</div>
                    {tab===id&&<div style={{width:16,height:3,borderRadius:2,background:C.accent,position:"absolute",bottom:8}}/>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
