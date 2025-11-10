export function formatThaiDMY(date: Date | string | number) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// แปลงค่าวันจาก <input type="date"> (YYYY-MM-DD) -> Date
export function fromInputDate(value: string) {
  // ป้องกัน timezone เพี้ยน: สร้างเป็น UTC แล้วค่อยใช้
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

