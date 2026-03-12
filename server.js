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
        status TEXT
      );
      CREATE TABLE IF NOT EXISTS deposits (
        id TEXT PRIMARY KEY,
        date TEXT,
        bank TEXT,
        branch TEXT,
        check_count INTEGER,
        total_amount NUMERIC,
        notes TEXT,
        status TEXT
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
        const result = await pool.query('SELECT * FROM collections ORDER BY date DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/collections', async (req, res) => {
    const { id, date, location, checkCount, totalAmount, contactName, contactPhone, notes, status } = req.body;
    try {
        await pool.query(
            `INSERT INTO collections (id, date, location, check_count, total_amount, contact_name, contact_phone, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET 
       date=$2, location=$3, check_count=$4, total_amount=$5, contact_name=$6, contact_phone=$7, notes=$8, status=$9`,
            [id, date, location, checkCount, totalAmount, contactName, contactPhone, notes, status]
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
        const result = await pool.query('SELECT * FROM deposits ORDER BY date DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/deposits', async (req, res) => {
    const { id, date, bank, branch, checkCount, totalAmount, notes, status } = req.body;
    try {
        await pool.query(
            `INSERT INTO deposits (id, date, bank, branch, check_count, total_amount, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET 
       date=$2, bank=$3, branch=$4, check_count=$5, total_amount=$6, notes=$7, status=$8`,
            [id, date, bank, branch, checkCount, totalAmount, notes, status]
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
