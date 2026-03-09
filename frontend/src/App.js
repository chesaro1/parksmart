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
const initials = (n) => (n||"").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?";
const timeAgo = (d) => {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if(s<60) return `${s}s ago`;
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString("en-KE");
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Input = ({ label, ...p }) => (
  <div style={{marginBottom:12}}>
    {label && <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
    <input {...p} style={{width:"100%",background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",fontSize:14,color:C.text,outline:"none",fontFamily:"inherit",boxSizing:"border-box",...(p.style||{})}}/>
  </div>
);

const Select = ({ label, children, ...p }) => (
  <div style={{marginBottom:12}}>
    {label && <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
    <select {...p} style={{width:"100%",background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",fontSize:14,color:C.text,outline:"none",fontFamily:"inherit",...(p.style||{})}}>{children}</select>
  </div>
);

const Btn = ({ children, variant="primary", loading, style:s, ...p }) => (
  <button {...p} disabled={loading||p.disabled} style={{
    width:"100%", padding:"13px", borderRadius:12, fontSize:14, fontWeight:800,
    cursor:loading?"wait":"pointer", border:"none", transition:"all 0.15s",
    background: variant==="primary" ? `linear-gradient(135deg,${C.accent},#00C488)`
              : variant==="danger"  ? C.danger
              : variant==="purple"  ? C.purple
              : "transparent",
    color: variant==="primary" ? C.bg : variant==="danger"||variant==="purple" ? "#fff" : C.accent,
    border: variant==="outline" ? `1px solid ${C.accent}` : "none",
    opacity: loading ? 0.7 : 1,
    boxShadow: variant==="primary" ? `0 6px 20px ${C.accent}40` : "none",
    ...(s||{})
  }}>{loading ? "Please wait…" : children}</button>
);

const Card = ({ children, style:s, onClick }) => (
  <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,...(s||{})}}>{children}</div>
);

const Badge = ({ children, color=C.accent }) => (
  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${color}18`,color,border:`1px solid ${color}30`}}>{children}</span>
);

const StatBox = ({ icon, label, value, color=C.accent }) => (
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 10px",textAlign:"center",flex:1,minWidth:0}}>
    <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
    <div style={{fontSize:15,fontWeight:800,color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div>
    <div style={{fontSize:9,color:C.muted,fontWeight:600}}>{label}</div>
  </div>
);

const Spinner = () => (
  <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:40}}>
    <div className="spin" style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`}}/>
  </div>
);

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
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
    } catch(e) {
      setError(e.response?.data?.error || "Something went wrong. Check your connection.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{height:"100%",overflowY:"auto",padding:"28px 22px 32px",boxSizing:"border-box"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:48,marginBottom:8}}>🅿️</div>
        <div style={{fontSize:24,fontWeight:800,color:C.text}}>ParkSmart</div>
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>Smart Parking · Real Time · M-Pesa</div>
      </div>

      <div style={{display:"flex",background:C.card,borderRadius:12,padding:4,marginBottom:20,border:`1px solid ${C.border}`}}>
        {[["login","Sign In"],["register","Register"]].map(([m,l])=>(
          <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"10px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:mode===m?C.accent:"transparent",color:mode===m?C.bg:C.muted,transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>

      {mode==="register" && (
        <>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["driver","🚗 Driver"],["provider","🏢 Provider"]].map(([r,l])=>(
              <button key={r} onClick={()=>setRole(r)} style={{flex:1,padding:"10px 6px",borderRadius:11,border:`2px solid ${role===r?C.accent:C.border}`,background:role===r?C.accentSoft:"transparent",color:role===r?C.accent:C.muted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <Input label="Full Name" placeholder="James Mwangi" value={form.fullName} onChange={e=>set("fullName",e.target.value)}/>
          <Input label="Phone Number" placeholder="+254 712 345 678" type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
        </>
      )}

      <Input label="Email Address" placeholder="james@email.com" type="email" value={form.email} onChange={e=>set("email",e.target.value)}/>
      <Input label="Password" placeholder="Min. 6 characters" type="password" value={form.password} onChange={e=>set("password",e.target.value)}/>

      {error && <div style={{color:C.danger,fontSize:12,marginBottom:12,padding:"10px 12px",background:"#FF4D6D10",borderRadius:8,border:`1px solid ${C.danger}30`}}>⚠ {error}</div>}

      <Btn loading={loading} onClick={submit}>{mode==="login" ? "Sign In" : "Create Account"}</Btn>

      {mode==="register" && role==="provider" && (
        <div style={{marginTop:12,padding:"10px 12px",background:"#4DA6FF10",borderRadius:10,border:`1px solid ${C.blue}30`,fontSize:11,color:C.muted}}>
          🏢 List your parking space and receive 80% of each booking directly via M-Pesa. ParkSmart takes 20% commission.
        </div>
      )}
    </div>
  );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────────────────
function MapView({ spots, selected, onSelect }) {
  const toX = (lng) => Math.max(3, Math.min(97, ((lng-36.70)/0.22)*100));
  const toY = (lat) => Math.max(3, Math.min(97, ((-1.18-lat)/(-0.20))*100));

  return (
    <div style={{position:"relative",width:"100%",height:220,background:"linear-gradient(135deg,#0D1B2A,#0A2540)",borderRadius:18,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:10}}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
        <path d="M 0 110 Q 200 100 400 110 T 700 105" stroke="#1E5A4025" strokeWidth="12" fill="none"/>
        <path d="M 240 0 Q 245 110 240 220" stroke="#1E5A4025" strokeWidth="8" fill="none"/>
        <path d="M 0 65 Q 300 70 600 55" stroke="#1E5A4018" strokeWidth="4" fill="none"/>
        <path d="M 0 168 Q 350 163 700 173" stroke="#1E5A4018" strokeWidth="4" fill="none"/>
      </svg>
      {spots.map(s => {
        const x = toX(s.lng), y = toY(s.lat);
        const sel = selected?.id === s.id;
        const avail = s.available_spaces ?? 0;
        const dc = avail===0 ? C.danger : avail<=5 ? C.warn : C.accent;
        return (
          <button key={s.id} onClick={()=>onSelect(s)} style={{
            position:"absolute", left:`${x}%`, top:`${y}%`, transform:"translate(-50%,-50%)",
            background:sel?C.accent:C.card, border:`2px solid ${sel?C.accent:dc}`,
            borderRadius:sel?8:"50%", padding:sel?"2px 7px":"5px",
            cursor:"pointer", zIndex:sel?10:5, transition:"all 0.2s",
            boxShadow:sel?`0 0 12px ${C.accent}60`:`0 0 4px ${dc}40`,
          }}>
            {sel
              ? <span style={{fontSize:9,fontWeight:800,color:C.bg,whiteSpace:"nowrap"}}>KES {s.price_per_hour}/hr</span>
              : <div style={{position:"relative",width:8,height:8}}>
                  <div className="pulse-ring" style={{position:"absolute",inset:0,borderRadius:"50%",background:dc,opacity:0.35}}/>
                  <div style={{position:"absolute",inset:2,borderRadius:"50%",background:dc}}/>
                </div>
            }
          </button>
        );
      })}
      <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:12,height:12,borderRadius:"50%",background:C.blue,border:"3px solid white",boxShadow:`0 0 14px ${C.blue}80`}}/>
      <div style={{position:"absolute",top:8,left:8,background:"#00000070",backdropFilter:"blur(8px)",borderRadius:7,padding:"2px 8px",fontSize:9,color:C.muted}}>📍 Nairobi</div>
      <div style={{position:"absolute",top:8,right:8,background:"#00000070",backdropFilter:"blur(8px)",borderRadius:7,padding:"2px 8px",fontSize:9,color:C.accent}}>
        {spots.filter(s=>(s.available_spaces??0)>0).length}/{spots.length} free
      </div>
    </div>
  );
}

// ─── SPOT CARD ────────────────────────────────────────────────────────────────
function SpotCard({ spot, onClick }) {
  const avail = spot.available_spaces ?? 0;
  const total = spot.total_spaces ?? 1;
  const color = avail===0 ? C.danger : avail<=5 ? C.warn : C.accent;
  return (
    <div onClick={()=>onClick(spot)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,marginBottom:8,cursor:"pointer",opacity:avail===0?0.65:1,transition:"all 0.15s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{flex:1,minWidth:0,marginRight:10}}>
          <div style={{display:"flex",gap:5,marginBottom:4,alignItems:"center",flexWrap:"wrap"}}>
            <Badge>{spot.type||"Parking"}</Badge>
            <span style={{fontSize:9,color:C.muted}}>{spot.area}</span>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2,lineHeight:1.3}}>{spot.name}</div>
          <div style={{fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{spot.address}</div>
          {spot.amenities?.length > 0 && (
            <div style={{fontSize:9,color:C.muted,marginTop:3}}>{spot.amenities.slice(0,3).join(" · ")}</div>
          )}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:17,fontWeight:800,color:C.accent}}>KES {spot.price_per_hour}</div>
          <div style={{fontSize:9,color:C.muted}}>per hour</div>
          <div style={{fontSize:10,color:C.muted,marginTop:3}}>⭐ {spot.rating||"4.5"}</div>
        </div>
      </div>
      <div style={{width:"100%",height:3,background:"#1E2D3D",borderRadius:3,overflow:"hidden",marginBottom:6}}>
        <div style={{width:`${(avail/total)*100}%`,height:"100%",background:color,borderRadius:3,transition:"width 0.5s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10}}>
        <span style={{color,fontWeight:700}}>
          {avail===0 ? "🔴 Full" : avail<=5 ? `🟡 Only ${avail} left` : `🟢 ${avail} spaces free`}
        </span>
        <span style={{color:C.accent,fontSize:9,fontWeight:700}}>● LIVE</span>
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
  if (mins <= 0) mins += 24 * 60; // next day
  return Math.max(0.5, parseFloat((mins / 60).toFixed(2)));
}
function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${ampm}`;
}

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
function BookingModal({ spot, user, onClose, onSuccess }) {
  const nowTime = getNowTime();
  const [startTime, setStartTime] = useState(nowTime);
  const [endTime, setEndTime] = useState(addHoursToTime(nowTime, 1));
  const [plate, setPlate] = useState((user?.vehicles||[])[0]||"");
  const [phone, setPhone] = useState(user?.phone||"");
  const [step, setStep] = useState("form"); // form | paying | done
  const [error, setError] = useState("");

  const hours = timeDiffHours(startTime, endTime);
  const total = Math.round((spot.price_per_hour||0) * hours);
  const avail = spot.available_spaces ?? 0;

  // Quick-pick durations
  const quickDurations = [0.5, 1, 2, 3, 4, 6];

  const setDuration = (hrs) => {
    setEndTime(addHoursToTime(startTime, hrs));
  };

  const handleStartChange = (val) => {
    setStartTime(val);
    setEndTime(addHoursToTime(val, hours));
  };

  const book = async () => {
    if (!plate.trim()) return setError("Please enter your vehicle plate number");
    if (!phone.trim()) return setError("Please enter your M-Pesa phone number");
    if (hours < 0.5) return setError("Minimum parking time is 30 minutes");
    setError(""); setStep("paying");
    try {
      const { booking } = await bookingsApi.create({
        spotId: spot.id,
        hours: parseFloat(hours.toFixed(2)),
        vehiclePlate: plate.trim(),
        startTime,
        endTime,
      });
      await paymentsApi.stkPush({ phone:phone.trim(), amount:booking.total_amount, bookingId:booking.id });
      setTimeout(() => onSuccess({ ...booking, startTime, endTime }), 3500);
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
            <div style={{fontSize:17,fontWeight:800,color:C.text}}>M-Pesa STK Push Sent!</div>
            <div style={{fontSize:13,color:C.muted,marginTop:8}}>Check your phone and enter your PIN</div>
            <div style={{fontSize:14,color:C.accent,fontWeight:700,marginTop:6}}>{phone}</div>
            <div style={{fontSize:13,color:C.text,marginTop:4}}>KES {total.toLocaleString()}</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div style={{flex:1,marginRight:10}}>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>{spot.name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{spot.address}</div>
                <div style={{fontSize:10,marginTop:4}}>
                  <span style={{color:avail===0?C.danger:C.accent,fontWeight:700}}>
                    {avail===0 ? "🔴 Full" : `🟢 ${avail} spaces available`}
                  </span>
                </div>
              </div>
              <button onClick={onClose} style={{background:"#1E2D3D",border:`1px solid ${C.border}`,color:C.muted,width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
            </div>

            {avail === 0 ? (
              <div style={{padding:"20px",textAlign:"center",color:C.muted,fontSize:13}}>
                This spot is currently full. Please check back later or choose another location.
              </div>
            ) : (
              <>
                <Input
                  label="Vehicle Plate Number"
                  placeholder="e.g. KBX 123D"
                  value={plate}
                  onChange={e=>setPlate(e.target.value.toUpperCase())}
                  style={{fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase"}}
                />

                {/* ── TIME PICKER ── */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Parking Time</div>

                  {/* Start / End time inputs */}
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Start</div>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e=>handleStartChange(e.target.value)}
                        style={{width:"100%",background:"#1E2D3D",border:`1px solid ${C.accent}40`,borderRadius:10,padding:"10px 10px",fontSize:15,fontWeight:700,color:C.accent,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textAlign:"center"}}
                      />
                    </div>
                    <div style={{display:"flex",alignItems:"center",paddingTop:18,color:C.muted,fontSize:18}}>→</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>End</div>
                      <input
                        type="time"
                        value={endTime}
                        onChange={e=>setEndTime(e.target.value)}
                        style={{width:"100%",background:"#1E2D3D",border:`1px solid ${C.blue}40`,borderRadius:10,padding:"10px 10px",fontSize:15,fontWeight:700,color:C.blue,outline:"none",fontFamily:"inherit",boxSizing:"border-box",textAlign:"center"}}
                      />
                    </div>
                  </div>

                  {/* Quick duration chips */}
                  <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
                    {quickDurations.map(d => {
                      const label = d < 1 ? "30 min" : `${d}hr${d>1?"s":""}`;
                      const isActive = Math.abs(hours - d) < 0.1;
                      return (
                        <button key={d} onClick={()=>setDuration(d)} style={{
                          padding:"5px 11px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer",
                          background:isActive?C.accent:C.accentSoft,
                          color:isActive?C.bg:C.accent,
                          border:`1px solid ${isActive?C.accent:C.accent+"40"}`,
                          transition:"all 0.15s"
                        }}>{label}</button>
                      );
                    })}
                  </div>

                  {/* Duration summary bar */}
                  <div style={{background:"#0A0F1E",borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Duration</div>
                      <div style={{fontSize:18,fontWeight:800,color:C.text,marginTop:1}}>
                        {hours < 1 ? "30 min" : hours === Math.floor(hours) ? `${hours} hr${hours>1?"s":""}` : `${Math.floor(hours)}h ${Math.round((hours%1)*60)}m`}
                      </div>
                      <div style={{fontSize:10,color:C.muted,marginTop:1}}>{fmtTime(startTime)} → {fmtTime(endTime)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Total</div>
                      <div style={{fontSize:22,fontWeight:800,color:C.accent}}>KES {total.toLocaleString()}</div>
                      <div style={{fontSize:9,color:C.muted}}>KES {spot.price_per_hour}/hr</div>
                    </div>
                  </div>
                </div>

                <Input
                  label="M-Pesa Phone Number"
                  placeholder="+254 712 345 678"
                  type="tel"
                  value={phone}
                  onChange={e=>setPhone(e.target.value)}
                />

                {error && (
                  <div style={{color:C.danger,fontSize:12,marginBottom:12,padding:"10px 12px",background:"#FF4D6D10",borderRadius:8,border:`1px solid ${C.danger}30`}}>⚠ {error}</div>
                )}

                <Btn onClick={book}>
                  🅿️ Reserve & Pay KES {total.toLocaleString()}
                </Btn>

                <div style={{textAlign:"center",fontSize:10,color:C.muted,marginTop:10}}>
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
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:24,textAlign:"center"}}>
      <div className="pop-in" style={{width:76,height:76,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},#00C488)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,marginBottom:18,boxShadow:`0 0 30px ${C.accent}60`}}>✓</div>
      <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:6}}>Spot Reserved!</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:24}}>Check your phone for M-Pesa confirmation</div>
      <Card style={{width:"100%",marginBottom:20}}>
        {[
          ["Booking ID", booking.id],
          ["Location", booking.spot_name||booking.spotName],
          ["Vehicle", booking.vehicle_plate||booking.vehiclePlate],
          ["Duration", `${booking.hours} hour${booking.hours>1?"s":""}`],
          ["Total Paid", `KES ${(booking.total_amount||0).toLocaleString()}`],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.muted}}>{k}</span>
            <span style={{fontSize:12,fontWeight:700,color:C.text}}>{v}</span>
          </div>
        ))}
      </Card>
      <Btn variant="outline" onClick={onDone}>Back to Explore</Btn>
    </div>
  );
}

// ─── ACCOUNT SCREEN ───────────────────────────────────────────────────────────
function AccountScreen({ user, setUser, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user.full_name||"",
    phone: user.phone||"",
    vehicles: user.vehicles||[],
    currentPassword: "",
    newPassword: "",
  });
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

  return (
    <div style={{height:"100%",overflowY:"auto",padding:"14px 16px 80px",boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.text}}>My Account</div>
        <button onClick={()=>{setEditing(!editing);setMsg({type:"",text:""}); }} style={{background:editing?C.accentSoft:"#1E2D3D",border:`1px solid ${editing?C.accent:C.border}`,color:editing?C.accent:C.muted,borderRadius:20,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
          {editing ? "Cancel" : "✏️ Edit"}
        </button>
      </div>

      <div style={{background:`linear-gradient(135deg,${C.accent}18,${C.blue}0a)`,border:`1px solid ${C.accent}25`,borderRadius:18,padding:18,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:54,height:54,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},#00C488)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:C.bg,flexShrink:0}}>
          {initials(user.full_name||"")}
        </div>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:C.text}}>{user.full_name}</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{user.email}</div>
          <div style={{fontSize:11,color:C.accent,marginTop:4}}>🎁 {user.loyalty_points||0} loyalty points</div>
        </div>
      </div>

      {editing ? (
        <div>
          <Input label="Full Name" value={form.fullName} onChange={e=>set("fullName",e.target.value)} placeholder="Your full name"/>
          <Input label="Phone Number" value={form.phone} onChange={e=>set("phone",e.target.value)} type="tel" placeholder="+254 712 345 678"/>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>My Vehicles</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {form.vehicles.map(v => (
                <div key={v} style={{display:"flex",alignItems:"center",gap:5,background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:20,padding:"4px 10px"}}>
                  <span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:C.text}}>{v}</span>
                  <button onClick={()=>set("vehicles",form.vehicles.filter(x=>x!==v))} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:12,lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input
                value={vi}
                onChange={e=>setVi(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"){ addVehicle(); }}}
                placeholder="Add plate e.g. KBX 123D"
                style={{flex:1,background:"#1E2D3D",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",fontSize:12,color:C.text,outline:"none",fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}
              />
              <button onClick={addVehicle} style={{background:C.accentSoft,border:`1px solid ${C.accent}`,color:C.accent,borderRadius:10,padding:"10px 14px",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>Add</button>
            </div>
          </div>

          <Card style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:10,letterSpacing:1}}>CHANGE PASSWORD (optional)</div>
            <Input label="Current Password" type="password" placeholder="Current password" value={form.currentPassword} onChange={e=>set("currentPassword",e.target.value)}/>
            <Input label="New Password" type="password" placeholder="New password (min 6 chars)" value={form.newPassword} onChange={e=>set("newPassword",e.target.value)}/>
          </Card>

          {msg.text && (
            <div style={{color:msg.type==="ok"?C.accent:C.danger,fontSize:12,marginBottom:12,padding:"10px 12px",background:msg.type==="ok"?C.accentSoft:"#FF4D6D10",borderRadius:8}}>
              {msg.type==="ok" ? "✓" : "⚠"} {msg.text}
            </div>
          )}
          <Btn loading={loading} onClick={save}>Save Changes</Btn>
        </div>
      ) : (
        <div>
          {[
            ["👤", "Full Name", user.full_name||"—"],
            ["📧", "Email", user.email],
            ["📱", "Phone", user.phone||"Not set"],
            ["🚗", "Vehicles", (user.vehicles||[]).length>0 ? (user.vehicles||[]).join(", ") : "None added"],
            ["🎁", "Loyalty Points", `${user.loyalty_points||0} pts`],
            ["📅", "Member Since", user.created_at ? new Date(user.created_at).toLocaleDateString("en-KE",{month:"long",year:"numeric"}) : "—"],
          ].map(([icon,label,value]) => (
            <Card key={label} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:18}}>{icon}</span>
              <div>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginTop:2}}>{value}</div>
              </div>
            </Card>
          ))}
          <div style={{marginTop:14}}>
            <Btn onClick={onLogout} style={{background:"transparent",border:`1px solid ${C.danger}`,color:C.danger}}>Sign Out</Btn>
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

    // Calculate end time from booking data
    const getEndMs = () => {
      // If booking has explicit end_time stored
      if (booking.end_time) return new Date(booking.end_time).getTime();
      // Otherwise calculate from created_at + hours
      const start = new Date(booking.created_at).getTime();
      const durationMs = (booking.hours || 1) * 60 * 60 * 1000;
      return start + durationMs;
    };

    const tick = () => {
      const diff = getEndMs() - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking]);

  return remaining;
}

// ─── COUNTDOWN DISPLAY ────────────────────────────────────────────────────────
function CountdownTimer({ booking }) {
  const remaining = useCountdown(booking);

  if (remaining === null) return null;

  if (remaining <= 0) {
    return (
      <div style={{background:"#FF4D6D12",border:`1px solid ${C.danger}30`,borderRadius:10,padding:"10px 12px",marginTop:8,textAlign:"center"}}>
        <div style={{fontSize:11,fontWeight:700,color:C.danger}}>⏰ Parking Time Expired</div>
        <div style={{fontSize:9,color:C.muted,marginTop:2}}>Please move your vehicle</div>
      </div>
    );
  }

  const totalSecs = Math.floor(remaining / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  // Percentage left for progress ring
  const totalDuration = (booking.hours || 1) * 3600;
  const pct = Math.min(100, (totalSecs / totalDuration) * 100);
  const isLow = pct < 20;
  const timerColor = isLow ? C.danger : pct < 50 ? C.warn : C.accent;

  // SVG ring
  const r = 28, circ = 2 * Math.PI * r;
  const strokeDash = (pct / 100) * circ;

  return (
    <div style={{background:isLow?"#FF4D6D08":"#00E5A008",border:`1px solid ${timerColor}25`,borderRadius:12,padding:"10px 12px",marginTop:8}}>
      <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>⏱ Time Remaining</div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {/* Ring */}
        <div style={{position:"relative",width:70,height:70,flexShrink:0}}>
          <svg width="70" height="70" style={{transform:"rotate(-90deg)"}}>
            <circle cx="35" cy="35" r={r} fill="none" stroke={C.border} strokeWidth="5"/>
            <circle cx="35" cy="35" r={r} fill="none" stroke={timerColor} strokeWidth="5"
              strokeDasharray={`${strokeDash} ${circ}`}
              strokeLinecap="round"
              style={{transition:"stroke-dasharray 1s linear, stroke 0.5s"}}
            />
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
            <div style={{fontSize:10,fontWeight:800,color:timerColor,lineHeight:1}}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
          </div>
        </div>

        {/* Digital readout */}
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:6,alignItems:"baseline"}}>
            {hrs > 0 && (
              <>
                <span style={{fontSize:26,fontWeight:800,color:timerColor,lineHeight:1}}>{hrs}</span>
                <span style={{fontSize:10,color:C.muted,fontWeight:600}}>hr</span>
              </>
            )}
            <span style={{fontSize:26,fontWeight:800,color:timerColor,lineHeight:1}}>{String(mins).padStart(2,"0")}</span>
            <span style={{fontSize:10,color:C.muted,fontWeight:600}}>min</span>
            <span style={{fontSize:26,fontWeight:800,color:timerColor,lineHeight:1}}>{String(secs).padStart(2,"0")}</span>
            <span style={{fontSize:10,color:C.muted,fontWeight:600}}>sec</span>
          </div>
          <div style={{marginTop:6,width:"100%",height:3,background:C.border,borderRadius:3,overflow:"hidden"}}>
            <div style={{width:`${pct}%`,height:"100%",background:timerColor,borderRadius:3,transition:"width 1s linear"}}/>
          </div>
          {isLow && <div style={{fontSize:9,color:C.danger,fontWeight:700,marginTop:4}}>⚠ Less than 20% time left!</div>}
        </div>
      </div>
    </div>
  );
}

// ─── BOOKINGS SCREEN ──────────────────────────────────────────────────────────
function BookingsScreen({ user }) {
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
    <div style={{height:"100%",overflowY:"auto",padding:"14px 16px 80px",boxSizing:"border-box"}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>My Bookings</div>
      <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Live countdown for active sessions</div>

      {loading ? <Spinner/> : bookings.length===0 ? (
        <div style={{textAlign:"center",padding:"50px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>🅿️</div>
          <div style={{fontSize:14,color:C.muted}}>No bookings yet</div>
          <div style={{fontSize:12,color:C.muted,marginTop:6}}>Find a spot and reserve it</div>
        </div>
      ) : (
        <>
          {/* Active bookings with countdown */}
          {active.length > 0 && (
            <>
              <div style={{fontSize:10,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>● Active Sessions</div>
              {active.map(b => (
                <Card key={b.id} style={{marginBottom:12,border:`1px solid ${C.accent}30`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{b.id?.slice(0,8)}…</span>
                    <Badge color={C.accent}>● Active</Badge>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>{b.spot_name}</div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:6}}>{b.spot_address}</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:2}}>
                    <span>🚗 {b.vehicle_plate}</span>
                    <span>⏱ {b.hours}hr{b.hours>1?"s":""} booked</span>
                    <span style={{color:C.accent,fontWeight:700}}>KES {(b.total_amount||0).toLocaleString()}</span>
                  </div>

                  {/* ── COUNTDOWN ── */}
                  <CountdownTimer booking={b}/>

                  <button onClick={()=>cancel(b.id)} style={{marginTop:10,width:"100%",padding:"8px",background:"transparent",border:`1px solid ${C.danger}`,borderRadius:8,color:C.danger,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    Cancel Booking
                  </button>
                </Card>
              ))}
            </>
          )}

          {/* Past bookings */}
          {past.length > 0 && (
            <>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8,marginTop:active.length>0?16:0}}>History</div>
              {past.map(b => (
                <Card key={b.id} style={{marginBottom:8,opacity:0.75}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{b.id?.slice(0,8)}…</span>
                    <Badge color={b.status==="cancelled"?C.danger:C.muted}>
                      {b.status==="cancelled"?"✕ Cancelled":"✓ Done"}
                    </Badge>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{b.spot_name}</div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{b.spot_address}</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted}}>
                    <span>🚗 {b.vehicle_plate}</span>
                    <span>⏱ {b.hours}hr{b.hours>1?"s":""}</span>
                    <span style={{fontWeight:700}}>KES {(b.total_amount||0).toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:10,color:C.muted,marginTop:4}}>
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
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [bookingSpot, setBookingSpot] = useState(null);
  const [success, setSuccess] = useState(null);

  const filtered = spots.filter(s => {
    if (search) return (
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.area?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
    );
    if (filter==="Available") return (s.available_spaces??0)>0;
    if (filter==="Mall" || filter==="Office") return s.type===filter;
    return true;
  });

  const openBooking = (spot) => {
    setSelected(spot);
    setBookingSpot(spot);
  };

  const closeBooking = () => {
    setBookingSpot(null);
    setSelected(null);
  };

  if (success) return (
    <SuccessScreen booking={success} onDone={()=>setSuccess(null)}/>
  );

  return (
    <div style={{position:"relative",height:"100%",overflow:"hidden"}}>
      {/* Scrollable content */}
      <div style={{height:"100%",overflowY:"auto",padding:"6px 16px 20px",boxSizing:"border-box"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontSize:10,color:C.muted}}>Welcome back 👋</div>
            <div style={{fontSize:20,fontWeight:800,color:C.text}}>
              {(user.full_name||"").split(" ")[0] || "Driver"}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"4px 10px"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:connected?C.accent:C.danger,boxShadow:connected?`0 0 6px ${C.accent}`:"none"}}/>
            <span style={{fontSize:9,fontWeight:700,color:connected?C.accent:C.muted}}>{connected?"LIVE":"OFFLINE"}</span>
          </div>
        </div>

        {/* Search */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"9px 12px",display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{color:C.muted,fontSize:14}}>🔍</span>
          <input
            value={search}
            onChange={e=>{ setSearch(e.target.value); setFilter("All"); }}
            placeholder="Search parking spots…"
            style={{background:"none",border:"none",outline:"none",fontSize:13,color:C.text,width:"100%",fontFamily:"inherit"}}
          />
          {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>}
        </div>

        {/* Map */}
        {loading ? (
          <div style={{height:220,background:C.card,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.border}`,marginBottom:10}}>
            <div className="spin" style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`}}/>
          </div>
        ) : (
          <MapView spots={spots} selected={selected} onSelect={openBooking}/>
        )}

        {/* Stats */}
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <StatBox icon="🅿️" label="Locations" value={spots.length} color={C.accent}/>
          <StatBox icon="✅" label="Available" value={spots.filter(s=>(s.available_spaces??0)>0).length} color={C.blue}/>
          <StatBox icon="💳" label="Avg/hr" value={spots.length ? `KES ${Math.round(spots.reduce((a,s)=>a+(s.price_per_hour||0),0)/spots.length)}` : "—"} color={C.warn}/>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
          {["All","Mall","Office","Available"].map(f=>(
            <button key={f} onClick={()=>{ setFilter(f); setSearch(""); }} style={{flexShrink:0,padding:"6px 13px",borderRadius:20,fontSize:11,fontWeight:700,background:filter===f?C.accent:C.card,color:filter===f?C.bg:C.muted,border:`1px solid ${filter===f?C.accent:C.border}`,cursor:"pointer",transition:"all 0.15s"}}>{f}</button>
          ))}
        </div>

        <div style={{fontSize:10,color:C.muted,marginBottom:8}}>
          {loading ? "Loading spots…" : `${filtered.length} location${filtered.length!==1?"s":""} · real-time updates`}
        </div>

        {/* Spot list */}
        {filtered.map(s => (
          <SpotCard key={s.id} spot={s} onClick={openBooking}/>
        ))}
      </div>

      {/* Booking Modal — outside scroll, positioned over everything */}
      {bookingSpot && (
        <BookingModal
          spot={bookingSpot}
          user={user}
          onClose={closeBooking}
          onSuccess={b=>{ setSuccess(b); closeBooking(); }}
        />
      )}
    </div>
  );
}

// ─── PROVIDER PORTAL ──────────────────────────────────────────────────────────
function ProviderPortal({ user, onLogout }) {
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
    try { await providerApi.register(pform); setMsg("✓ Details saved successfully"); await load(); }
    catch(e) { setMsg("⚠ " + (e.response?.data?.error||"Failed to save")); }
    finally { setSaving(false); }
  };

  const addSpot = async () => {
    setSaving(true); setMsg("");
    try {
      await providerApi.addSpot({ ...sform, amenities:sform.amenities.split(",").map(a=>a.trim()).filter(Boolean) });
      setSform({ name:"", area:"", address:"", lat:"", lng:"", totalSpaces:"", pricePerHour:"", type:"Mall", amenities:"", phone:"" });
      setMsg("✓ Spot submitted for admin approval!");
      setTab("spots");
      await load();
    } catch(e) { setMsg("⚠ " + (e.response?.data?.error||"Failed to add spot")); }
    finally { setSaving(false); }
  };

  const pf = (k,v) => setPform(f=>({...f,[k]:v}));
  const sf = (k,v) => setSform(f=>({...f,[k]:v}));

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header tabs */}
      <div style={{padding:"10px 14px 0",background:C.card,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:8}}>🏢 Provider Portal</div>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:8}}>
          {[["dashboard","📊 Dashboard"],["spots","🅿️ Spots"],["add","➕ Add Spot"],["settings","⚙️ Settings"]].map(([id,l])=>(
            <button key={id} onClick={()=>{ setTab(id); setMsg(""); }} style={{flexShrink:0,padding:"6px 11px",borderRadius:20,fontSize:10,fontWeight:700,background:tab===id?C.accent:"transparent",color:tab===id?C.bg:C.muted,border:`1px solid ${tab===id?C.accent:C.border}`,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 14px 20px"}}>
        {loading ? <Spinner/> : tab==="dashboard" ? (
          <>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <StatBox icon="💰" label="Revenue" value={fmt(dash?.stats?.totalRevenue)} color={C.accent}/>
              <StatBox icon="🏦" label="Your Payout" value={fmt(dash?.stats?.totalPayout)} color={C.blue}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <StatBox icon="📋" label="Commission" value={fmt(dash?.stats?.totalCommission)} color={C.warn}/>
              <StatBox icon="🔖" label="Bookings" value={dash?.stats?.totalBookings||0} color={C.purple}/>
            </div>

            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>🚗 Cars Currently Parked ({(dash?.carsCurrentlyParked||[]).length})</div>
            {(dash?.carsCurrentlyParked||[]).length===0 ? (
              <Card style={{textAlign:"center",color:C.muted,fontSize:12,padding:"20px 0",marginBottom:14}}>No cars currently parked</Card>
            ) : (dash?.carsCurrentlyParked||[]).map((b,i) => (
              <Card key={i} style={{marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{b.vehicle_plate}</div>
                  <div style={{fontSize:10,color:C.muted}}>{b.spot_name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:C.accent,fontWeight:700}}>{b.hours}hr</div>
                  <div style={{fontSize:9,color:C.muted}}>Exp {new Date(b.expires_at).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </Card>
            ))}

            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>📋 Recent Bookings</div>
            {(dash?.recentBookings||[]).slice(0,5).map(b => (
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.muted}}>{b.id}</span>
                  <span style={{fontSize:11,color:C.accent,fontWeight:700}}>{fmt(b.provider_amount)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted}}>
                  <span>🚗 {b.vehicle_plate}</span>
                  <span>⏱ {b.hours}hr</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        ) : tab==="spots" ? (
          <>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>My Parking Locations ({(dash?.spots||[]).length})</div>
            {(dash?.spots||[]).length===0 ? (
              <Card style={{textAlign:"center",color:C.muted,fontSize:12,padding:"30px 0"}}>
                <div style={{fontSize:28,marginBottom:8}}>🅿️</div>
                No spots yet. Add your first one!
              </Card>
            ) : (dash?.spots||[]).map(s => (
              <Card key={s.id} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1,marginRight:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.address}</div>
                  </div>
                  <Badge color={s.is_approved?C.accent:C.warn}>{s.is_approved?"✓ Live":"⏳ Pending"}</Badge>
                </div>
                <div style={{display:"flex",gap:10,fontSize:10,color:C.muted}}>
                  <span>Total: {s.total_spaces}</span>
                  <span style={{color:(s.available_spaces||0)===0?C.danger:C.accent}}>Free: {s.available_spaces||0}</span>
                  <span>{s.is_active?"🟢 Active":"🔴 Inactive"}</span>
                </div>
              </Card>
            ))}
          </>
        ) : tab==="add" ? (
          <>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Add New Parking Location</div>
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
            {msg && <div style={{color:msg.startsWith("✓")?C.accent:C.danger,fontSize:12,marginBottom:10,padding:"8px 12px",background:msg.startsWith("✓")?C.accentSoft:"#FF4D6D10",borderRadius:8}}>{msg}</div>}
            <Btn loading={saving} onClick={addSpot}>Submit for Approval</Btn>
            <div style={{marginTop:10,padding:"10px 12px",background:"#FFB80010",borderRadius:10,border:`1px solid ${C.warn}30`,fontSize:11,color:C.muted}}>
              ⚠ Spots require admin approval (1-2 business days) before going live.
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Payment & Business Details</div>
            <Input label="Business Name" placeholder="Mwangi Parking Ltd" value={pform.businessName} onChange={e=>pf("businessName",e.target.value)}/>
            <Input label="M-Pesa Phone (receives payments)" placeholder="+254 712 345 678" type="tel" value={pform.mpesaPhone} onChange={e=>pf("mpesaPhone",e.target.value)}/>
            <Input label="M-Pesa Account / Till No." placeholder="174379 (optional)" value={pform.mpesaAccount} onChange={e=>pf("mpesaAccount",e.target.value)}/>
            <Input label="National ID Number" placeholder="12345678" value={pform.idNumber} onChange={e=>pf("idNumber",e.target.value)}/>
            <Input label="KRA PIN (optional)" placeholder="A000000000Z" value={pform.kraPin} onChange={e=>pf("kraPin",e.target.value)}/>
            {msg && <div style={{color:msg.startsWith("✓")?C.accent:C.danger,fontSize:12,marginBottom:10,padding:"8px 12px",background:msg.startsWith("✓")?C.accentSoft:"#FF4D6D10",borderRadius:8}}>{msg}</div>}
            <Btn loading={saving} onClick={saveDetails}>Save Payment Details</Btn>
            <div style={{marginTop:12,padding:"10px 12px",background:C.accentSoft,borderRadius:10,border:`1px solid ${C.accent}30`,fontSize:11,color:C.muted}}>
              💳 You receive 80% of every booking directly to your M-Pesa. ParkSmart takes 20% commission automatically.
            </div>
            <div style={{marginTop:16}}>
              <Btn onClick={onLogout} style={{background:"transparent",border:`1px solid ${C.danger}`,color:C.danger}}>Sign Out</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN PORTAL ─────────────────────────────────────────────────────────────
function AdminPortal({ onLogout }) {
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

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"10px 14px 0",background:`linear-gradient(135deg,${C.purple}20,${C.card})`,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:14,fontWeight:800,color:C.purple,marginBottom:8}}>⚡ Admin Panel</div>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:8}}>
          {[["overview","📊 Overview"],["providers","🏢 Providers"],["users","👥 Users"],["bookings","📋 Bookings"]].map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,fontSize:10,fontWeight:700,background:tab===id?C.purple:"transparent",color:tab===id?"#fff":C.muted,border:`1px solid ${tab===id?C.purple:C.border}`,cursor:"pointer",whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 14px 20px"}}>
        {loading ? <Spinner/> : !dash ? <div style={{color:C.muted,textAlign:"center",padding:30}}>Failed to load</div> :
        tab==="overview" ? (
          <>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <StatBox icon="💰" label="Total Revenue" value={fmt(dash.stats.totalRevenue)} color={C.accent}/>
              <StatBox icon="🏦" label="Commission (20%)" value={fmt(dash.stats.totalCommission)} color={C.purple}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <StatBox icon="🅿️" label="Active Spots" value={dash.stats.activeSpots} color={C.blue}/>
              <StatBox icon="📋" label="Bookings" value={dash.stats.totalBookings} color={C.warn}/>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:16}}>
              <StatBox icon="🚗" label="Drivers" value={dash.stats.totalUsers} color={C.accent}/>
              <StatBox icon="🏢" label="Providers" value={dash.stats.totalProviders} color={C.blue}/>
              <StatBox icon="⏳" label="Pending" value={dash.stats.pendingApprovals} color={C.warn}/>
            </div>

            {dash.stats.pendingApprovals > 0 && (
              <>
                <div style={{fontSize:13,fontWeight:700,color:C.warn,marginBottom:8}}>⏳ Pending Approvals</div>
                {(dash.pendingSpots||[]).map(s => (
                  <Card key={s.id} style={{marginBottom:8,border:`1px solid ${C.warn}40`}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginBottom:10}}>{s.address} · {s.total_spaces} spaces · KES {s.price_per_hour}/hr</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>approve(s.id,true)} disabled={approvingId===s.id} style={{flex:1,padding:"9px",background:C.accent,color:C.bg,border:"none",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ Approve</button>
                      <button onClick={()=>approve(s.id,false)} disabled={approvingId===s.id} style={{flex:1,padding:"9px",background:"transparent",color:C.danger,border:`1px solid ${C.danger}`,borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer"}}>✕ Reject</button>
                    </div>
                  </Card>
                ))}
              </>
            )}

            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>📋 Recent Bookings</div>
            {(dash.recentBookings||[]).slice(0,10).map(b => (
              <Card key={b.id} style={{marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.muted}}>{b.id}</span>
                  <span style={{fontSize:11,fontWeight:700,color:C.accent}}>{fmt(b.total_amount)}</span>
                </div>
                <div style={{fontSize:11,color:C.text,marginBottom:3}}>{b.spot_name}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted}}>
                  <span>🚗 {b.vehicle_plate}</span>
                  <span>Comm: {fmt(b.commission_amount)}</span>
                  <span>{timeAgo(b.created_at)}</span>
                </div>
              </Card>
            ))}
          </>
        ) : tab==="providers" ? (
          <>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>Providers ({(dash.providerStats||[]).length})</div>
            {(dash.providerStats||[]).length===0 ? (
              <Card style={{textAlign:"center",color:C.muted,fontSize:12,padding:"30px 0"}}>No providers registered yet</Card>
            ) : (dash.providerStats||[]).map(p => (
              <Card key={p.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{p.businessName||p.full_name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{p.email} · {p.spots?.length||0} locations</div>
                  </div>
                  <Badge color={C.purple}>Provider</Badge>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <StatBox icon="💰" label="Revenue" value={fmt(p.totalRevenue)} color={C.accent}/>
                  <StatBox icon="🏦" label="Payout" value={fmt(p.payout)} color={C.blue}/>
                  <StatBox icon="📋" label="Commission" value={fmt(p.commission)} color={C.purple}/>
                </div>
                <div style={{fontSize:10,color:C.muted}}>{p.bookingCount} bookings · M-Pesa: {p.mpesaPhone||"Not set"}</div>
                {(p.spots||[]).map(s=><div key={s.id} style={{fontSize:10,color:C.muted,marginTop:2}}>🅿️ {s.name}</div>)}
              </Card>
            ))}
          </>
        ) : tab==="users" ? (
          <>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>All Users ({(dash.allUsers||[]).length})</div>
            {(dash.allUsers||[]).map(u => (
              <Card key={u.id} style={{marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{u.full_name}</div>
                  <div style={{fontSize:10,color:C.muted}}>{u.email} · {timeAgo(u.created_at)}</div>
                </div>
                <Badge color={u.role==="admin"?C.purple:u.role==="provider"?C.blue:C.accent}>{u.role}</Badge>
              </Card>
            ))}
          </>
        ) : (
          <>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>All Paid Bookings ({(dash.recentBookings||[]).length})</div>
            {(dash.recentBookings||[]).map(b => (
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
        )}

        <div style={{marginTop:20}}>
          <Btn onClick={onLogout} style={{background:"transparent",border:`1px solid ${C.danger}`,color:C.danger}}>Sign Out</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState("home");
  const [spots, setSpots] = useState([]);
  const [connected, setConnected] = useState(false);
  const [spotsLoading, setSpotsLoading] = useState(true);

  // Check saved token on load
  useEffect(() => {
    const token = localStorage.getItem("ps_token");
    if (token) {
      authApi.me()
        .then(u => { setUser(u); setAuthChecked(true); })
        .catch(() => { localStorage.removeItem("ps_token"); setAuthChecked(true); });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Load spots and socket (drivers only)
  useEffect(() => {
    if (!user || user.role !== "driver") return;

    // Load spots immediately via HTTP
    spotsApi.getAll()
      .then(d => { setSpots(d.spots||[]); setSpotsLoading(false); })
      .catch(() => setSpotsLoading(false));

    // Socket for real-time updates
    const socket = getSocket();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("spot:updated", ({ spotId, available }) => {
      setSpots(prev => prev.map(s => s.id===spotId ? {...s, available_spaces:available} : s));
    });
    socket.emit("user:join", user.id);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("spot:updated");
    };
  }, [user]);

  const logout = () => {
    localStorage.removeItem("ps_token");
    setUser(null);
    setSpots([]);
    setSpotsLoading(true);
    setTab("home");
  };

  if (!authChecked) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"#050810"}}>
      <div className="spin" style={{width:44,height:44,borderRadius:"50%",border:`4px solid #1E2D3D`,borderTop:`4px solid #00E5A0`}}/>
    </div>
  );

  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"#050810",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{width:390,height:780,background:C.bg,borderRadius:44,overflow:"hidden",position:"relative",boxShadow:"0 40px 120px #000000CC, 0 0 0 2px #1E2D3D"}}>

        {/* Phone notch */}
        <div style={{width:110,height:26,background:"#000",borderRadius:20,position:"absolute",left:"50%",transform:"translateX(-50%)",top:0,zIndex:50}}/>

        <div style={{height:"100%",paddingTop:16,boxSizing:"border-box",display:"flex",flexDirection:"column"}}>

          {/* ── NOT LOGGED IN ── */}
          {!user && <AuthScreen onAuth={u=>{ setUser(u); setTab("home"); }}/>}

          {/* ── ADMIN ── */}
          {user?.role==="admin" && <AdminPortal onLogout={logout}/>}

          {/* ── PROVIDER ── */}
          {user?.role==="provider" && <ProviderPortal user={user} onLogout={logout}/>}

          {/* ── DRIVER ── */}
          {user?.role==="driver" && (
            <>
              <div style={{flex:1,overflow:"hidden",position:"relative"}}>
                {tab==="home"     && <DriverHome user={user} spots={spots} loading={spotsLoading} connected={connected}/>}
                {tab==="bookings" && <BookingsScreen user={user}/>}
                {tab==="account"  && <AccountScreen user={user} setUser={setUser} onLogout={logout}/>}
              </div>

              {/* Bottom nav */}
              <div style={{background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",height:68,paddingBottom:8,flexShrink:0}}>
                {[["home","🗺️","Explore"],["bookings","🅿️","Bookings"],["account","👤","Account"]].map(([id,icon,label])=>(
                  <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
                    <div style={{fontSize:19,filter:tab===id?"none":"grayscale(1) opacity(0.4)"}}>{icon}</div>
                    <div style={{fontSize:9,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.muted}}>{label}</div>
                    {tab===id && <div style={{width:18,height:3,borderRadius:2,background:C.accent,position:"absolute",bottom:8}}/>}
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
