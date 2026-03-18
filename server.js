const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('./')); // Serve frontend files

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Initialize Database Tables
const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        date TEXT,
        location TEXT,
        check_count INTEGER,
        total_amount NUMERIC,
        contact_name TEXT,
        contact_phone TEXT,
        notes TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS deposits (
        id TEXT PRIMARY KEY,
        date TEXT,
        bank TEXT,
        branch TEXT,
        check_count INTEGER,
        total_amount NUMERIC,
        notes TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        zone TEXT,
        billing_schedule TEXT,
        address TEXT,
        contact_name TEXT,
        contact_phone TEXT,
        lat NUMERIC,
        lng NUMERIC
      );
      CREATE TABLE IF NOT EXISTS banks (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    // Migrations: Add created_at if not exists
    await client.query('ALTER TABLE collections ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await client.query('ALTER TABLE deposits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    
    // Migrations: Add new location fields if not exists
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS billing_schedule TEXT');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_name TEXT');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_phone TEXT');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS lat NUMERIC');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS lng NUMERIC');

    // Migration: Add "Zone " prefix to existing zones if missing
    await client.query("UPDATE locations SET zone = 'Zone ' || zone WHERE zone ~ '^[0-9]:' AND zone NOT LIKE 'Zone %'");
    
    // Seed default locations if empty
    const locCheck = await client.query('SELECT COUNT(*) FROM locations');
    if (parseInt(locCheck.rows[0].count) === 0) {
      console.log('Seeding default locations...');
      const defaultLocs = [
        ['โรงพยาบาลพระมงกุฎเกล้า', 'Zone 1: พญาไท / พระราม 6'],
        ['สถาบันพยาธิวิทยา ศูนย์อำนวยการแพทย์พระมงกุฎเกล้า', 'Zone 1: พญาไท / พระราม 6'],
        ['บริษัท พีเอ็มเควิทยาเวช จำกัด (ร้านยาสิรินธรโอสถ รพ.พระมงกุฎ)', 'Zone 1: พญาไท / พระราม 6'],
        ['สถาบันวิจัยวิทยาศาสตร์การแพทย์ทหาร', 'Zone 1: พญาไท / พระราม 6'],
        ['กองคลังแพทย์ กรมแพทย์ทหารบก', 'Zone 1: พญาไท / พระราม 6'],
        ['องค์การเภสัชกรรม สำนักงานใหญ่', 'Zone 1: พญาไท / พระราม 6'],
        ['โรงพยาบาลทหารผ่านศึก', 'Zone 1: พญาไท / พระราม 6'],
        
        ['โรงพยาบาลภูมิพลอดุลยเดช', 'Zone 2: ดอนเมือง / สายไหม'],
        ['กรมแพทย์ทหารอากาศ', 'Zone 2: ดอนเมือง / สายไหม'],
        ['สถาบันเวชศาสตร์การบิน กองทัพอากาศ', 'Zone 2: ดอนเมือง / สายไหม'],
        ['โรงพยาบาลทหารอากาศ (สีกัน)', 'Zone 2: ดอนเมือง / สายไหม'],
        ['ศูนย์รักษาความปลอดภัย กองบัญชาการกองทัพไทย', 'Zone 2: ดอนเมือง / สายไหม'],
        ['สสน.นทพ.', 'Zone 2: ดอนเมือง / สายไหม'],
        
        ['ธนาคารทีทีบี สำนักงานใหญ่พหลโยธิน', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี'],
        ['โรงพยาบาลวิภาวดี (กรุงเทพฯ)', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี'],
        ['โรงเรียนช่างฝีมือทหาร สถาบันวิชาการป้องกันประเทศ', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี'],
        ['ทัณฑสถานโรงพยาบาลราชทัณฑ์', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี'],
        ['แผนกแพทย์ กองบริหาร กรมช่างอากาศ', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี'],
        ['การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี'],
        ['กรมการแพทย์ กระทรวงสาธารณสุข', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี'],
        
        ['โรงพยาบาลกลาง', 'Zone 4: พระนคร / ดุสิต'],
        ['กรมแผนที่ทหาร', 'Zone 4: พระนคร / ดุสิต'],
        ['มูลนิธิราชประชานุเคราะห์ ในพระบรมราชูปถัมภ์', 'Zone 4: พระนคร / ดุสิต'],
        ['กองงานในพระองค์สมเด็จพระกนิษฐาราชเจ้ากรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี', 'Zone 4: พระนคร / ดุสิต'],
        
        ['บริษัท โรงพยาบาล ไอเอ็มเอช สีลม', 'Zone 5: ปทุมวัน / สีลม / ดินแดง'],
        ['มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)', 'Zone 5: ปทุมวัน / ดินแดง'],
        ['กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย', 'Zone 5: ปทุมวัน / ดินแดง'],
        
        ['โรงพยาบาลสมเด็จพระปิ่นเกล้า', 'Zone 6: ฝั่งธนบุรี'],
        ['กรมแพทย์ทหารเรือ', 'Zone 6: ฝั่งธนบุรี'],
        
        ['การกีฬาแห่งประเทศไทย', 'Zone 7: รามคำแหง / สมุทรปราการ'],
        ['บริษัท กรุงเทพดรักสโตร์ จำกัด', 'Zone 7: รามคำแหง / สมุทรปราการ'],
        ['โรงพยาบาลทหารเรือกรุงเทพ', 'Zone 7: รามคำแหง / สมุทรปราการ'],
        ['บริษัท สินแพทย์ เทพารักษ์ จำกัด', 'Zone 7: รามคำแหง / สมุทรปราการ']
      ];
      
      for (const [name, zone] of defaultLocs) {
        await client.query('INSERT INTO locations (name, zone) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, zone]);
      }

    }

    // Update specific details requested by user (Moved outside if to ensure it runs even if table not empty)
    await client.query(`
      UPDATE locations 
      SET billing_schedule = 'กำหนดการวางบิล 25 มี.ค.69' 
      WHERE name = 'บริษัท โรงพยาบาล ไอเอ็มเอช สีลม'
    `);
    await client.query(`
      UPDATE locations 
      SET billing_schedule = 'กำหนดการวางบิล ทุกวันพฤหัส' 
      WHERE name = 'มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)'
    `);
    await client.query(`
      UPDATE locations 
      SET address = 'กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย - สถานที่ : ศาลาว่าการกรุงเทพมหานคร 2 189 ชั้น 4 อาคารธานีนพรัตน์ กองการคลัง ถ.มิตรไมตรี เขตดินแดง กทม.10400',
          contact_name = 'ป้อม',
          contact_phone = '02-245-3088',
          lat = 13.7703,
          lng = 100.5537
      WHERE name = 'กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย'
    `);

    // Migration: Update existing Zone 3 names to the new full name
    await client.query(`
      UPDATE locations 
      SET zone = 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี' 
      WHERE zone = 'Zone 3: จตุจักร / นนทบุรี'
    `);

    // Explicitly add TTB if it doesn't exist (since defaultLocs only runs if table is empty)
    await client.query(`
      INSERT INTO locations (name, zone, address, lat, lng)
      VALUES ('ธนาคารทีทีบี สำนักงานใหญ่พหลโยธิน', 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', '3000 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพมหาคร 10900', 13.804, 100.560)
      ON CONFLICT (name) DO UPDATE SET 
      zone = EXCLUDED.zone,
      address = EXCLUDED.address,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng
    `);


  console.log('Database initialized successfully');
} catch (err) {
        console.error('Database initialization error:', err);
    } finally {
        client.release();
    }
};

initDb();

// --- API ENDPOINTS ---

// COLLECTIONS
app.get('/api/collections', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM collections ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/collections', async (req, res) => {
    const { id, date, location, checkCount, totalAmount, contactName, contactPhone, notes, status } = req.body;
    try {
        await pool.query(
            `INSERT INTO collections (id, date, location, check_count, total_amount, contact_name, contact_phone, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
       date=$2, location=$3, check_count=$4, total_amount=$5, contact_name=$6, contact_phone=$7, notes=$8, status=$9`,
            [id, date, location, checkCount || 0, totalAmount || 0, contactName || '', contactPhone || '', notes || '', status || 'pending']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/collections/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM collections WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DEPOSITS
app.get('/api/deposits', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM deposits ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/deposits', async (req, res) => {
    const { id, date, bank, branch, checkCount, totalAmount, notes, status } = req.body;
    try {
        await pool.query(
            `INSERT INTO deposits (id, date, bank, branch, check_count, total_amount, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
       date=$2, bank=$3, branch=$4, check_count=$5, total_amount=$6, notes=$7, status=$8`,
            [id, date, bank, branch || '', checkCount || 0, totalAmount || 0, notes || '', status || 'pending']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/deposits/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM deposits WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOCATIONS
app.get('/api/locations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM locations ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/locations', async (req, res) => {
    const { name, zone, billing_schedule, address, contact_name, contact_phone, lat, lng } = req.body;
    try {
        await pool.query(
            `INSERT INTO locations (name, zone, billing_schedule, address, contact_name, contact_phone, lat, lng) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             ON CONFLICT (name) DO UPDATE SET 
             zone=$2, billing_schedule=$3, address=$4, contact_name=$5, contact_phone=$6, lat=$7, lng=$8`, 
            [name, zone, billing_schedule || '', address || '', contact_name || '', contact_phone || '', lat || null, lng || null]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/locations/:name', async (req, res) => {
    try {
        await pool.query('DELETE FROM locations WHERE name = $1', [req.params.name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BANKS
app.get('/api/banks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM banks ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/banks', async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('INSERT INTO banks (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/banks/:name', async (req, res) => {
    try {
        await pool.query('DELETE FROM banks WHERE name = $1', [req.params.name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SETTINGS
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  try {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, value]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BULK IMPORT
app.post('/api/import', async (req, res) => {
  const { collections, deposits, locations, banks, settings } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM collections');
    await client.query('DELETE FROM deposits');
    await client.query('DELETE FROM locations');
    await client.query('DELETE FROM banks');
    await client.query('DELETE FROM settings');

    if (collections) {
      for (const c of collections) {
        await client.query(
          `INSERT INTO collections (id, date, location, check_count, total_amount, contact_name, contact_phone, notes, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [c.id, c.date, c.location, c.checkCount || 0, c.totalAmount || 0, c.contactName || '', c.contactPhone || '', c.notes || '', c.status || 'pending', c.createdAt || new Date().toISOString()]
        );
      }
    }
    if (deposits) {
      for (const d of deposits) {
        await client.query(
          `INSERT INTO deposits (id, date, bank, branch, check_count, total_amount, notes, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [d.id, d.date, d.bank, d.branch || '', d.checkCount || 0, d.totalAmount || 0, d.notes || '', d.status || 'pending', d.createdAt || new Date().toISOString()]
        );
      }
    }
    if (locations) {
      for (const l of locations) {
        await client.query(
          `INSERT INTO locations (name, zone, billing_schedule, address, contact_name, contact_phone, lat, lng) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (name) DO UPDATE SET 
           zone=$2, billing_schedule=$3, address=$4, contact_name=$5, contact_phone=$6, lat=$7, lng=$8`, 
          [l.name, l.zone || l.type, l.billing_schedule || '', l.address || '', l.contact_name || '', l.contact_phone || '', l.lat || null, l.lng || null]
        );
      }
    }
    if (banks) {
      for (const b of banks) {
        const name = typeof b === 'string' ? b : b.name;
        await client.query('INSERT INTO banks (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
      }
    }
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await client.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, value]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE ALL DATA
app.delete('/api/all', async (req, res) => {
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM collections');
    await pool.query('DELETE FROM deposits');
    await pool.query('DELETE FROM locations');
    await pool.query('DELETE FROM banks');
    await pool.query('DELETE FROM settings');
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
