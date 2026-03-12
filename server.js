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
        zone TEXT
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
    
    // Seed default locations if empty
    const locCheck = await client.query('SELECT COUNT(*) FROM locations');
    if (parseInt(locCheck.rows[0].count) === 0) {
      console.log('Seeding default locations...');
      const defaultLocs = [
        ['โรงพยาบาลพระมงกุฎเกล้า', '1: พญาไท / พระราม 6'],
        ['สถาบันพยาธิวิทยา ศูนย์อำนวยการแพทย์พระมงกุฎเกล้า', '1: พญาไท / พระราม 6'],
        ['บริษัท พีเอ็มเควิทยาเวช จำกัด (ร้านยาสิรินธรโอสถ รพ.พระมงกุฎ)', '1: พญาไท / พระราม 6'],
        ['สถาบันวิจัยวิทยาศาสตร์การแพทย์ทหาร', '1: พญาไท / พระราม 6'],
        ['กองคลังแพทย์ กรมแพทย์ทหารบก', '1: พญาไท / พระราม 6'],
        ['องค์การเภสัชกรรม สำนักงานใหญ่', '1: พญาไท / พระราม 6'],
        ['โรงพยาบาลทหารผ่านศึก', '1: พญาไท / พระราม 6'],
        
        ['โรงพยาบาลภูมิพลอดุลยเดช', '2: ดอนเมือง / สายไหม'],
        ['กรมแพทย์ทหารอากาศ', '2: ดอนเมือง / สายไหม'],
        ['สถาบันเวชศาสตร์การบิน กองทัพอากาศ', '2: ดอนเมือง / สายไหม'],
        ['โรงพยาบาลทหารอากาศ (สีกัน)', '2: ดอนเมือง / สายไหม'],
        ['ศูนย์รักษาความปลอดภัย กองบัญชาการกองทัพไทย', '2: ดอนเมือง / สายไหม'],
        ['สสน.นทพ.', '2: ดอนเมือง / สายไหม'],
        
        ['โรงพยาบาลวิภาวดี (กรุงเทพฯ)', '3: จตุจักร / นนทบุรี'],
        ['โรงเรียนช่างฝีมือทหาร สถาบันวิชาการป้องกันประเทศ', '3: จตุจักร / นนทบุรี'],
        ['ทัณฑสถานโรงพยาบาลราชทัณฑ์', '3: จตุจักร / นนทบุรี'],
        ['แผนกแพทย์ กองบริหาร กรมช่างอากาศ', '3: จตุจักร / นนทบุรี'],
        ['การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย', '3: จตุจักร / นนทบุรี'],
        ['กรมการแพทย์ กระทรวงสาธารณสุข', '3: จตุจักร / นนทบุรี'],
        
        ['โรงพยาบาลกลาง', '4: พระนคร / ดุสิต'],
        ['กรมแผนที่ทหาร', '4: พระนคร / ดุสิต'],
        ['มูลนิธิราชประชานุเคราะห์ ในพระบรมราชูปถัมภ์', '4: พระนคร / ดุสิต'],
        ['กองงานในพระองค์สมเด็จพระกนิษฐาราชเจ้ากรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี', '4: พระนคร / ดุสิต'],
        
        ['มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)', '5: ปทุมวัน / ดินแดง'],
        ['กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย', '5: ปทุมวัน / ดินแดง'],
        
        ['โรงพยาบาลสมเด็จพระปิ่นเกล้า', '6: ฝั่งธนบุรี'],
        ['กรมแพทย์ทหารเรือ', '6: ฝั่งธนบุรี'],
        
        ['การกีฬาแห่งประเทศไทย', '7: รามคำแหง / สมุทรปราการ'],
        ['บริษัท กรุงเทพดรักสโตร์ จำกัด', '7: รามคำแหง / สมุทรปราการ'],
        ['โรงพยาบาลทหารเรือกรุงเทพ', '7: รามคำแหง / สมุทรปราการ'],
        ['บริษัท สินแพทย์ เทพารักษ์ จำกัด', '7: รามคำแหง / สมุทรปราการ']
      ];
      
      for (const [name, zone] of defaultLocs) {
        await client.query('INSERT INTO locations (name, zone) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, zone]);
      }
    }

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
    const { name, zone } = req.body;
    try {
        await pool.query('INSERT INTO locations (name, zone) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET zone=$2', [name, zone]);
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
        await client.query('INSERT INTO locations (name, zone) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [l.name, l.zone || l.type]);
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
