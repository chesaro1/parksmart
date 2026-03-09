# 🅿️ ParkSmart Nairobi – Full Production Guide

---

## 🚫 Fix: node_modules Too Large for GitHub

node_modules are NEVER uploaded to GitHub. The `.gitignore` files already exclude them. GitHub only stores your code — anyone who clones it runs `npm install` to rebuild node_modules on their machine.

### First-time GitHub upload:

```bash
cd parksmart-prod
git init
git add .
git commit -m "Initial commit – ParkSmart Nairobi"

# Create repo on github.com, copy the URL, then:
git remote add origin https://github.com/YOUR_USERNAME/parksmart-nairobi.git
git branch -M main
git push -u origin main
```

Your repo will be a few hundred KB, not gigabytes. After someone clones it:
```bash
cd backend  && npm install
cd frontend && npm install
```

---

## 🚀 Run Locally

```bash
# Terminal 1
cd backend && cp .env.example .env && npm install && npm start

# Terminal 2
cd frontend && npm install && npm start

# Gate Scanner (open on each gate tablet in browser)
scanner-terminal/index.html?scanner=SCN-WS-ENTRY&server=http://localhost:4000

# Admin Dashboard
scanner-terminal/dashboard.html?server=http://localhost:4000
```

---

## 🔲 Scanner System

### How it works

```
[Gate Tablet / ANPR Camera]
        │  plate read (manual or automatic)
        ▼
[scanner-terminal/index.html?scanner=SCN-WS-ENTRY]
        │  socket.emit("scan:plate", { scannerId, plate })
        ▼
[Backend server.js]
        │  scannerId → spotId + role (entry/exit)
        │  finds valid paid booking for plate at that spot
        ├──▶ gate:open  → ✅ GREEN, barrier opens
        └──▶ gate:deny  → 🚫 RED, barrier stays closed
        ▼
[dashboard.html] – admin sees all events live
```

### Scanner IDs

| Scanner ID | Location | Role |
|---|---|---|
| SCN-WS-ENTRY | Westlands Square | Entry |
| SCN-WS-EXIT | Westlands Square | Exit |
| SCN-SC-ENTRY | Sarit Centre P2 | Entry |
| SCN-IM-ENTRY | I&M Bank Tower | Entry |
| SCN-VM-ENTRY | Village Market Main | Entry |
| SCN-VM-EXIT | Village Market | Exit |
| SCN-VM-VIP | Village Market VIP | Entry |
| SCN-KC-ENTRY | KICC Basement | Entry |
| SCN-NJ-ENTRY | Nakumatt Junction | Entry |
| SCN-TR-ENTRY | Two Rivers L1 | Entry |
| SCN-TR-EXIT | Two Rivers L1 Exit | Exit |
| SCN-TR-L2 | Two Rivers L2 | Entry |
| SCN-AB-ENTRY | ABC Place | Entry |

Each gate tablet gets its own URL:
```
https://yourdomain.com/scanner/?scanner=SCN-WS-ENTRY
https://yourdomain.com/scanner/?scanner=SCN-VM-VIP
```

### HTTP fallback (scanners without WebSocket)
```bash
curl -X POST https://yourdomain.com/api/scan \
  -H "Content-Type: application/json" \
  -d '{"scannerId":"SCN-WS-ENTRY","plate":"KBX 123D","apiKey":"parksmart-scanner-key"}'
```

---

## ☁️ Deploy to the Internet

### Railway.app (easiest, free tier)
1. Push to GitHub (above)
2. railway.app → New Project → Deploy from GitHub
3. Two services: backend/ and frontend/
4. Add env vars in Railway dashboard
5. Set REACT_APP_API_URL in frontend to backend URL

### Docker (VPS)
```bash
docker compose up -d --build
certbot --nginx -d yourdomain.com
```

---

## 💳 M-Pesa Live
Register at developer.safaricom.co.ke, add keys to .env, replace mock STK push in server.js.

---

## 📂 Structure

```
parksmart-prod/
├── .gitignore                ← Excludes node_modules ✅
├── backend/
│   ├── server.js             ← API + Socket.IO + Scanner gate logic
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── src/App.js            ← React app with live socket updates
├── scanner-terminal/
│   ├── index.html            ← Gate tablet (add ?scanner=ID to URL)
│   └── dashboard.html        ← Admin: all scanners + live logs
└── nginx/default.conf
```
