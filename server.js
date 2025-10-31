const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path'); // <<< 1. ต้องใช้ 'path'
const fetch = require('node-fetch'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = "Your_Very_Secret_Key_12345";

const app = express();
app.use(express.json()); 
app.use(cors()); 

// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// [V7.1] 2. เสิร์ฟ "หน้าบ้าน" (React) จากโฟลเดอร์ 'build'
// (นี่คือโฟลเดอร์ที่คุณคัดลอกมาวาง)
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
app.use(express.static(path.join(__dirname, 'build')));
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const db = new sqlite3.Database('./database.db'); 
console.log("Database V7.1 (Combined) is ready.");

// --- 1. สร้างฐานข้อมูล (เหมือน V7.0) ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user')`);
    db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, cost_price REAL DEFAULT 0, sale_price REAL DEFAULT 0, stock_on_hand INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS ad_spend (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, amount REAL NOT NULL, created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime')), created_by_user_id INTEGER, FOREIGN KEY (created_by_user_id) REFERENCES users (id))`);
    db.run(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE NOT NULL, order_date DATETIME DEFAULT (STRFTIME('%Y-%m-%d', 'now', 'localtime')), channel TEXT, campaign TEXT, customer_name TEXT, customer_phone TEXT, customer_email TEXT, shipping_address TEXT, shipping_date DATETIME, tracking_number TEXT, sub_total REAL DEFAULT 0, discount REAL DEFAULT 0, tax REAL DEFAULT 0, total_amount REAL DEFAULT 0, total_cogs REAL DEFAULT 0, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime')), created_by_user_id INTEGER, FOREIGN KEY (created_by_user_id) REFERENCES users (id))`);
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, discount_per_item REAL DEFAULT 0, line_total REAL NOT NULL, cost_price_at_sale REAL DEFAULT 0, FOREIGN KEY (sale_id) REFERENCES sales (id), FOREIGN KEY (product_id) REFERENCES products (id))`);
});

// --- 2. API "สาธารณะ" (Login/Register) ---
// (สำคัญ: API ทั้งหมดต้องอยู่ "ก่อน" ตัวจับ React)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ message: "กรุณากรอก Username และ Password" }); }
    try {
        const { count } = await new Promise((resolve, reject) => { db.get("SELECT COUNT(*) as count FROM users", (err, row) => { if (err) reject(err); resolve(row); }); });
        const role = (count === 0) ? 'admin' : 'user';
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", [username, password_hash, role], function(err) {
            if (err) { return res.status(400).json({ message: "Username นี้ถูกใช้แล้ว" }); }
            res.status(201).json({ message: "สร้างบัญชีสำเร็จ!", userId: this.lastID, role: role });
        });
    } catch (err) { res.status(500).json({ message: "Server Error", error: err.message }); }
});
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) { return res.status(401).json({ success: false, message: "Username หรือ Password ผิด!" }); }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
            const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ success: true, message: "ล็อกอินสำเร็จ!", token: token, username: user.username, role: user.role });
        } else { res.status(401).json({ success: false, message: "Username หรือ Password ผิด!" }); }
    });
});

// --- 3. "ยาม" (Middleware - checkToken, checkAdmin V6.3) ---
const checkToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization']; const token = authHeader && authHeader.split(' ')[1];
        if (!token) { return res.status(401).json({ message: "ไม่มีตั๋ว (Token)!" }); }
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) { return res.status(403).json({ message: "ตั๋วปลอม หรือ ตั๋วหมดอายุ!" }); }
            req.user = decoded; next();
        });
    } catch (err) { res.status(500).json({ message: "Server Error", error: err.message }); }
};
const checkAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') { next(); }
    else { res.status(403).json({ message: "สิทธิ์ไม่ถึง! (Admin Only)" }); }
};

// --- 4. API "ส่วนตัว" (User ธรรมดา) ---
app.get('/api/generate_order_number', checkToken, (req, res) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); const prefix = `SO-${today}-`;
    db.get("SELECT COUNT(*) as count FROM sales WHERE DATE(order_date, 'localtime') = DATE('now', 'localtime')", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const nextNumber = (row.count + 1).toString().padStart(4, '0');
        res.json({ orderNumber: prefix + nextNumber });
    });
});
app.post('/api/add_sale', checkToken, async (req, res) => {
    const { order_number, order_date, channel, campaign, customer_name, customer_phone, customer_email, shipping_address, shipping_date, tracking_number, items, discount, tax } = req.body;
    const userId = req.user.userId; let sub_total = 0; let total_cogs = 0; const processedItems = [];
    if (!items || !Array.isArray(items) || items.length === 0) { return res.status(400).json({ message: "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ" }); }
    try {
        for (const item of items) {
            if (!item.product_id || !item.quantity || item.unit_price === undefined) { throw new Error("ข้อมูลรายการสินค้าไม่ครบถ้วน"); }
            const product = await new Promise((resolve, reject) => { db.get("SELECT cost_price FROM products WHERE id = ?", [item.product_id], (err, row) => { if (err) reject(err); if (!row) reject(new Error(`ไม่พบสินค้า ID: ${item.product_id}`)); resolve(row); }); });
            const quantity = parseInt(item.quantity); const unit_price = parseFloat(item.unit_price); const discount_per_item = parseFloat(item.discount_per_item) || 0; const cost_price_at_sale = parseFloat(product.cost_price) || 0; const line_total = (unit_price - discount_per_item) * quantity; sub_total += line_total; total_cogs += cost_price_at_sale * quantity;
            processedItems.push({ product_id: item.product_id, quantity: quantity, unit_price: unit_price, discount_per_item: discount_per_item, line_total: line_total, cost_price_at_sale: cost_price_at_sale });
        }
        const finalDiscount = parseFloat(discount) || 0; const finalTax = parseFloat(tax) || 0; const total_amount = sub_total - finalDiscount;
        db.serialize(() => {
            db.run("BEGIN TRANSACTION"); const salesStmt = db.prepare(`INSERT INTO sales (order_number, order_date, channel, campaign, customer_name, customer_phone, customer_email, shipping_address, shipping_date, tracking_number, sub_total, discount, tax, total_amount, total_cogs, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            salesStmt.run( order_number, order_date || new Date().toISOString().slice(0,10), channel, campaign, customer_name, customer_phone, customer_email, shipping_address, shipping_date, tracking_number, sub_total, finalDiscount, finalTax, total_amount, total_cogs, userId , function(err) { if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: "Failed to insert sale", details: err.message }); } const sale_id = this.lastID; const itemsStmt = db.prepare(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_per_item, line_total, cost_price_at_sale) VALUES (?, ?, ?, ?, ?, ?, ?)`); let itemInsertError = null; for (const item of processedItems) { itemsStmt.run(sale_id, item.product_id, item.quantity, item.unit_price, item.discount_per_item, item.line_total, item.cost_price_at_sale, (err) => { if (err) itemInsertError = err; }); if (itemInsertError) break; } itemsStmt.finalize(); if (itemInsertError) { db.run("ROLLBACK"); return res.status(500).json({ error: "Failed to insert sale items", details: itemInsertError.message }); } db.run("COMMIT"); res.status(201).json({ message: "สร้างรายการขายสำเร็จ!", saleId: sale_id }); }); salesStmt.finalize();
        });
    } catch (err) { res.status(400).json({ message: err.message }); }
});
app.post('/api/add_spend', checkToken, (req, res) => {
    const { channel, amount } = req.body; const userId = req.user.userId;
    db.run("INSERT INTO ad_spend (channel, amount, created_by_user_id) VALUES (?, ?, ?)", [channel, parseFloat(amount), userId], function(err) { if (err) return res.status(500).json({ error: err.message }); res.json({ message: "บันทึกค่าแอดสำเร็จ!" }); });
});
app.get('/api/summary', checkToken, async (req, res) => {
    const range = req.query.range || 'today'; let dateFilter = ""; if (range === 'today') { dateFilter = "DATE(order_date, 'localtime') = DATE('now', 'localtime')"; } else if (range === 'yesterday') { dateFilter = "DATE(order_date, 'localtime') = DATE('now', 'localtime', '-1 day')"; } else if (range === 'last_7d') { dateFilter = "DATE(order_date, 'localtime') >= DATE('now', 'localtime', '-6 day')"; } else if (range === 'this_month') { dateFilter = "STRFTIME('%Y-%m', order_date, 'localtime') = STRFTIME('%Y-%m', 'now', 'localtime')"; } else if (range === 'this_year') { dateFilter = "STRFTIME('%Y', order_date, 'localtime') = STRFTIME('%Y', 'now', 'localtime')"; }
    let adSpendFilter = ""; if (range === 'today') { adSpendFilter = "DATE(created_at, 'localtime') = DATE('now', 'localtime')"; } else if (range === 'yesterday') { adSpendFilter = "DATE(created_at, 'localtime') = DATE('now', 'localtime', '-1 day')"; } else if (range === 'last_7d') { adSpendFilter = "DATE(created_at, 'localtime') >= DATE('now', 'localtime', '-6 day')"; } else if (range === 'this_month') { adSpendFilter = "STRFTIME('%Y-%m', created_at, 'localtime') = STRFTIME('%Y-%m', 'now', 'localtime')"; } else if (range === 'this_year') { adSpendFilter = "STRFTIME('%Y', created_at, 'localtime') = STRFTIME('%Y', 'now', 'localtime')"; }
    const runQuery = (query) => new Promise((resolve, reject) => { db.get(query, (err, row) => { if (err) reject(err); resolve(row); }); });
    try { const [salesData, spendData, fbSalesData, ttSalesData] = await Promise.all([ runQuery(`SELECT SUM(total_amount) as totalRevenue, SUM(total_cogs) as totalCOGS, COUNT(id) as totalOrders FROM sales WHERE ${dateFilter}`), runQuery(`SELECT SUM(amount) as totalAdSpend FROM ad_spend WHERE ${adSpendFilter}`), runQuery(`SELECT SUM(total_amount) as total FROM sales WHERE ${dateFilter} AND channel = 'Facebook'`), runQuery(`SELECT SUM(total_amount) as total FROM sales WHERE ${dateFilter} AND channel = 'TikTok'`) ]); const totalRevenue = salesData.totalRevenue || 0; const totalCOGS = salesData.totalCOGS || 0; const totalAdSpend = spendData.totalAdSpend || 0; const totalOrders = salesData.totalOrders || 0; const grossProfit = totalRevenue - totalCOGS; const netProfit = grossProfit - totalAdSpend; const totalFbSales = fbSalesData.total || 0; const totalTtSales = ttSalesData.total || 0; res.json({ range: range, totalRevenue, totalCOGS, totalAdSpend, totalOrders, grossProfit, netProfit, totalFbSales, totalTtSales }); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/campaign_summary', checkToken, async (req, res) => {
    const range = req.query.range || 'today'; let dateFilter = ""; if (range === 'today') { dateFilter = "DATE(order_date, 'localtime') = DATE('now', 'localtime')"; } else if (range === 'yesterday') { dateFilter = "DATE(order_date, 'localtime') = DATE('now', 'localtime', '-1 day')"; } else if (range === 'last_7d') { dateFilter = "DATE(order_date, 'localtime') >= DATE('now', 'localtime', '-6 day')"; } else if (range === 'this_month') { dateFilter = "STRFTIME('%Y-%m', order_date, 'localtime') = STRFTIME('%Y-%m', 'now', 'localtime')"; } else if (range === 'this_year') { dateFilter = "STRFTIME('%Y', order_date, 'localtime') = STRFTIME('%Y', 'now', 'localtime')"; }
    const query = ` SELECT campaign, SUM(total_amount) as totalSales FROM sales WHERE ${dateFilter} AND campaign != 'N/A' AND campaign IS NOT NULL GROUP BY campaign ORDER BY totalSales DESC `; db.all(query, (err, rows) => { if (err) return res.status(500).json({ error: err.message }); const chartData = { labels: rows.map(r => r.campaign), data: rows.map(r => r.totalSales) }; res.json(chartData); });
});

// ----- NEW API: /api/profit_chart?range=xxx (วางใต้ /api/campaign_summary) -----
app.get('/api/profit_chart', checkToken, (req, res) => {
    const range = req.query.range || 'today';
    let dateFilter = "";

    if (range === 'today') {
        dateFilter = "DATE(order_date, 'localtime') = DATE('now', 'localtime')";
    } 
    else if (range === 'yesterday') {
        dateFilter = "DATE(order_date, 'localtime') = DATE('now', 'localtime', '-1 day')";
    } 
    else if (range === 'last_7d') {
        dateFilter = "DATE(order_date, 'localtime') >= DATE('now', 'localtime', '-6 day')";
    } 
    else if (range === 'this_month') {
        dateFilter = "STRFTIME('%Y-%m', order_date, 'localtime') = STRFTIME('%Y-%m', 'now', 'localtime')";
    } 
    else if (range === 'this_year') {
        dateFilter = "STRFTIME('%Y', order_date, 'localtime') = STRFTIME('%Y', 'now', 'localtime')";
    }

    const sql = `
        SELECT 
            DATE(order_date, 'localtime') AS date,
            SUM(total_amount) AS revenue,
            SUM(total_cogs) AS cogs,
            SUM(total_amount - total_cogs) AS grossProfit
        FROM sales
        WHERE ${dateFilter}
        GROUP BY DATE(order_date, 'localtime')
        ORDER BY DATE(order_date, 'localtime')
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const labels = rows.map(r => r.date);
        const revenue = rows.map(r => r.revenue || 0);
        const cogs = rows.map(r => r.cogs || 0);
        const profit = rows.map(r => (r.revenue - r.cogs) || 0);

        res.json({
            labels,
            revenue,
            cogs,
            profit
        });
    });
});

app.get('/api/recent_sales', checkToken, (req, res) => {
    const { range, startDate, endDate, search } = req.query; let conditions = []; let params = [];
    if (range === 'today') { conditions.push("DATE(s.order_date, 'localtime') = DATE('now', 'localtime')"); } else if (range === 'yesterday') { conditions.push("DATE(s.order_date, 'localtime') = DATE('now', 'localtime', '-1 day')"); } else if (range === 'last_7d') { conditions.push("DATE(s.order_date, 'localtime') >= DATE('now', 'localtime', '-6 day')"); } else if (range === 'this_month') { conditions.push("STRFTIME('%Y-%m', s.order_date, 'localtime') = STRFTIME('%Y-%m', 'now', 'localtime')"); } else if (range === 'this_year') { conditions.push("STRFTIME('%Y', s.order_date, 'localtime') = STRFTIME('%Y', 'now', 'localtime')"); } else if (range === 'custom' && startDate && endDate) { conditions.push("DATE(s.order_date, 'localtime') BETWEEN ? AND ?"); params.push(startDate); params.push(endDate); }
    if (search) { conditions.push(`(s.order_number LIKE ? OR s.customer_name LIKE ? OR s.campaign LIKE ? OR s.channel LIKE ?)`); const searchTerm = `%${search}%`; params.push(searchTerm, searchTerm, searchTerm, searchTerm); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = ` SELECT s.id, s.order_number, s.channel, s.total_amount, s.campaign, s.customer_name, s.order_date, STRFTIME('%H:%M', s.created_at, 'localtime') as sale_time, u.username as created_by_username, s.status FROM sales s LEFT JOIN users u ON s.created_by_user_id = u.id ${whereClause} ORDER BY s.id DESC LIMIT 100 `;
    db.all(query, params, (err, rows) => { if (err) return res.status(500).json({ error: err.message }); res.json(rows); });
});
app.get('/api/products', checkToken, (req, res) => {
    db.all("SELECT * FROM products ORDER BY id DESC", (err, rows) => { if (err) return res.status(500).json({ error: err.message }); res.json(rows); });
});
app.post('/api/products', checkToken, (req, res) => {
    const { sku, name, cost_price, sale_price, stock_on_hand } = req.body; if (!sku || !name) { return res.status(400).json({ message: "กรุณากรอก SKU และ ชื่อสินค้า" }); }
    db.run("INSERT INTO products (sku, name, cost_price, sale_price, stock_on_hand) VALUES (?, ?, ?, ?, ?)", [sku, name, cost_price || 0, sale_price || 0, stock_on_hand || 0], function(err) { if (err) { return res.status(400).json({ message: "SKU นี้อาจจะถูกใช้แล้ว" }); } res.status(201).json({ message: "เพิ่มสินค้าสำเร็จ!", productId: this.lastID }); });
});
app.get('/api/test_facebook', checkToken, async (req, res) => {
    const YOUR_ACCESS_TOKEN = "EAA...Token เก่า..."; const YOUR_AD_ACCOUNT_ID = "act_110529525763425"; const apiEndpoint = `https.graph.facebook.com/v20.0/${YOUR_AD_ACCOUNT_ID}/insights?date_preset=last_7d&fields=spend&access_token=${YOUR_ACCESS_TOKEN}`;
    try { console.log("กำลังยิง API (ทดสอบ) ไปที่ Facebook..."); const response = await fetch(apiEndpoint); const data = await response.json(); if (data.error) { throw new Error(data.error.message); } res.json(data); } catch (err) { console.error("API test_facebook เกิดข้อผิดพลาด:", err.message); res.status(500).json({ error: err.message }); }
});

// --- 5. API "Admin" (Users V6.3) ---
app.get('/api/users', checkToken, checkAdmin, (req, res) => {
    db.all("SELECT id, username, role FROM users", (err, rows) => { if (err) return res.status(500).json({ error: err.message }); res.json(rows); });
});
app.delete('/api/users/:id', checkToken, checkAdmin, (req, res) => {
    const userIdToDelete = req.params.id; if (userIdToDelete == req.user.userId) { return res.status(400).json({ message: "Admin ไม่สามารถลบตัวเองได้" }); }
    db.run("DELETE FROM users WHERE id = ?", [userIdToDelete], function(err) { if (err) return res.status(500).json({ error: err.message }); if (this.changes === 0) return res.status(404).json({ message: "ไม่พบ User นี้" }); res.json({ message: "ลบ User สำเร็จ" }); });
});

// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// [V7.1 เพิ่ม] 3. "ตัวจับ" React Router (Catch-all)
// (ต้องอยู่ "หลัง" API ทั้งหมด)
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// --- 6. เปิด Server (Port 3001) ---
app.listen(3001, () => {
  console.log('Sakuraone API V7.1 (Combined Server) is running on http://localhost:3001');
});
