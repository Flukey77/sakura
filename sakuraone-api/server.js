// CommonJS style (require) — ทำงานได้บน Render แน่นอน
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// ===== Config
const PORT = process.env.PORT || 3001;
const RAW_ORIGINS = process.env.ALLOWED_ORIGINS || "";
const ALLOWED_ORIGINS = RAW_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);

// ===== App
const app = express();
app.use(helmet());
app.use(express.json());

// CORS allowlist
app.use(
  cors({
    origin(origin, cb) {
      // same-origin / curl ไม่มี header origin -> allow
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
      if (ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: false
  })
);

// Rate limit (IP)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// ===== Routes
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/submit", (req, res) => {
  const { name = "", email = "", tel = "", topic = "ทั่วไป", msg = "" } = req.body || {};

  // very simple validation
  const errors = {};
  if (!name.trim()) errors.name = "กรุณากรอกชื่อ";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "อีเมลไม่ถูกต้อง";
  if (tel && !/^(\+66|0)\d{8,9}$/.test(tel)) errors.tel = "รูปแบบเบอร์ไทยไม่ถูกต้อง";

  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, errors });
  }

  // TODO: บันทึก DB/ส่งอีเมล/ยิง webhook ตามจริง
  console.log("Form Submit:", { name, email, tel, topic, msg });

  res.json({ ok: true });
});

// Error handler (รวม CORS error)
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ ok: false, message: "forbidden" });
  }
  res.status(500).json({ ok: false, message: "server_error" });
});

// ===== Start
app.listen(PORT, () => {
  console.log(`sakuraone-api running on port ${PORT}`);
});
