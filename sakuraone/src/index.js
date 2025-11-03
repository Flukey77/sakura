import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// ===== Mobile viewport height fix (iOS / Messenger / TikTok) =====
function setVhVar() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setVhVar();
window.addEventListener("resize", setVhVar);
window.addEventListener("orientationchange", setVhVar);

// (dev) หา element ที่กว้างเกินจอ: ใช้ ?debug=overflow
if (window.location.search.includes("debug=overflow")) {
  const over = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > document.documentElement.clientWidth + 1) over.push(el);
  });
  if (over.length) console.warn("🚨 Overflow elements:", over);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
