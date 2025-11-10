'use client';
import { useState } from 'react';

export default function QuickStockAdjust() {
  const [code, setCode] = useState('');
  const [stock, setStock] = useState<number | ''>('');
  const [cost, setCost] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [mode, setMode] = useState<'set'|'purchase'|'increase'|'decrease'>('set');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const payload: any = { mode, items: [{ code: code.trim() }] };
      if (stock !== '') payload.items[0].stock = Number(stock);
      if (cost !== '') payload.items[0].cost = Number(cost);
      if (price !== '') payload.items[0].price = Number(price);
      if (mode !== 'set') {
        // สำหรับ purchase/increase/decrease ใช้ qty แทน stock
        payload.items[0].qty = Number(stock || 0);
        delete payload.items[0].stock;
      }
      const res = await fetch('/api/products/adjust', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      alert(json.ok ? 'ปรับคลังสำเร็จ' : (json.message || 'ปรับคลังไม่สำเร็จ'));
    } finally { setBusy(false); }
  }

  return (
    <div className="flex gap-2 items-end">
      <select className="input" value={mode} onChange={e=>setMode(e.target.value as any)}>
        <option value="set">ตั้งค่า (stock/cost/price)</option>
        <option value="purchase">ซื้อเข้า (เฉลี่ยต้นทุน)</option>
        <option value="increase">เพิ่มสต๊อก</option>
        <option value="decrease">ลดสต๊อก</option>
      </select>
      <input className="input" placeholder="รหัสสินค้า" value={code} onChange={e=>setCode(e.target.value)} />
      <input className="input w-28" placeholder={mode==='set'?'stock':'qty'} value={stock}
             onChange={e=>setStock(e.target.value===''?'':Number(e.target.value))} />
      <input className="input w-28" placeholder="cost" value={cost}
             onChange={e=>setCost(e.target.value===''?'':Number(e.target.value))} />
      <input className="input w-28" placeholder="price" value={price}
             onChange={e=>setPrice(e.target.value===''?'':Number(e.target.value))} />
      <button className="rounded-xl bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
              onClick={submit} disabled={busy || !code}>
        {busy ? 'กำลังบันทึก...' : 'ปรับคลัง'}
      </button>
    </div>
  );
}

