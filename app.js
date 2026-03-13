const API_URL = window.location.origin;
const KEYS = { collections: 'cl_collections', deposits: 'cl_deposits', locations: 'cl_locations', banks: 'cl_banks', settings: 'cl_settings' };

// Global state cache to minimize redundant API calls
let _state = {
  collections: [],
  deposits: [],
  locations: [],
  banks: [],
  settings: {}
};

async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(`${API_URL}/api${endpoint}`, options);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  } catch (err) {
    console.error('API Request failed:', err);
    // Fallback to local cache if offline (optional: implement better offline support)
    return null;
  }
}

async function loadAllData() {
  const [cols, deps, locs, banks, settings] = await Promise.all([
    apiRequest('/collections'),
    apiRequest('/deposits'),
    apiRequest('/locations'),
    apiRequest('/banks'),
    apiRequest('/settings')
  ]);

  if (cols) _state.collections = cols.map(c => ({
    ...c,
    checkCount: c.check_count,
    totalAmount: parseFloat(c.total_amount || 0),
    contactName: c.contact_name,
    contactPhone: c.contact_phone,
    createdAt: c.created_at
  }));
  if (deps) _state.deposits = deps.map(d => ({
    ...d,
    checkCount: d.check_count,
    totalAmount: parseFloat(d.total_amount || 0),
    createdAt: d.created_at
  }));
  if (locs) _state.locations = locs;
  if (banks) _state.banks = banks.map(b => typeof b === 'string' ? b : b.name);
  if (settings) _state.settings = settings;

  return _state;
}

// Wrapper functions to maintain compatibility with existing code (but now async)
async function syncData() {
  await loadAllData();
  renderDashboard();
  renderCollections();
  renderDeposits();
  renderSettings();
}

function getData(key) {
  const map = { cl_collections: 'collections', cl_deposits: 'deposits', cl_locations: 'locations', cl_banks: 'banks' };
  return _state[map[key]] || [];
}

function getSettings() { return _state.settings || {}; }

async function saveItem(type, item) {
  const endpoint = type === 'collection' ? '/collections' : '/deposits';
  await apiRequest(endpoint, 'POST', item);
  await loadAllData();
}

async function deleteItemApi(id, type) {
  const endpoint = type === 'collection' ? `/collections/${id}` : `/deposits/${id}`;
  await apiRequest(endpoint, 'DELETE');
  await loadAllData();
}

async function saveSettingApi(settings) {
  await apiRequest('/settings', 'POST', settings);
  await loadAllData();
}

async function addLocationApi(loc) {
  await apiRequest('/locations', 'POST', loc);
  await loadAllData();
}

async function removeLocationApi(name) {
  await apiRequest(`/locations/${encodeURIComponent(name)}`, 'DELETE');
  await loadAllData();
}

async function addBankApi(name) {
  await apiRequest('/banks', 'POST', { name });
  await loadAllData();
}

async function removeBankApi(name) {
  await apiRequest(`/banks/${encodeURIComponent(name)}`, 'DELETE');
  await loadAllData();
}

// Default data
const ZONE_MAP = {
  // ... (keeping ZONE_MAP as is for frontend sorting/zoning logic)
  // 📍 Zone 1: พญาไท / อนุสาวรีย์ชัยสมรภูมิ / พระราม 6 (ใกล้ต้นทางที่สุด)
  'โรงพยาบาลพระมงกุฎเกล้า': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1 },
  'สถาบันพยาธิวิทยา ศูนย์อำนวยการแพทย์พระมงกุฎเกล้า': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1 },
  'บริษัท พีเอ็มเควิทยาเวช จำกัด (ร้านยาสิรินธรโอสถ รพ.พระมงกุฎ)': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1 },
  'สถาบันวิจัยวิทยาศาสตร์การแพทย์ทหาร': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1 },
  'กองคลังแพทย์ กรมแพทย์ทหารบก': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1 },
  'องค์การเภสัชกรรม สำนักงานใหญ่': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1 },
  'โรงพยาบาลทหารผ่านศึก': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1 },

  // 📍 Zone 5: ปทุมวัน / สีลม / ดินแดง (เขต CBD ชั้นใน)
  'มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)': { zone: 'Zone 5: ปทุมวัน / สีลม / ดินแดง', order: 2 },
  'บริษัท โรงพยาบาล ไอเอ็มเอช สีลม': { zone: 'Zone 5: ปทุมวัน / สีลม / ดินแดง', order: 2 },
  'กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย': { zone: 'Zone 5: ปทุมวัน / สีลม / ดินแดง', order: 2 },

  // 📍 Zone 4: พระนคร / ดุสิต / ป้อมปราบศัตรูพ่าย
  'โรงพยาบาลกลาง': { zone: 'Zone 4: พระนคร / ดุสิต', order: 3 },
  'กรมแผนที่ทหาร': { zone: 'Zone 4: พระนคร / ดุสิต', order: 3 },
  'มูลนิธิราชประชานุเคราะห์ ในพระบรมราชูปถัมภ์': { zone: 'Zone 4: พระนคร / ดุสิต', order: 3 },
  'กองงานในพระองค์สมเด็จพระกนิษฐาธิราชเจ้ากรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี': { zone: 'Zone 4: พระนคร / ดุสิต', order: 3 },

  // 📍 Zone 3: จตุจักร / บางซื่อ / งามวงศ์วาน / นนทบุรี
  'โรงพยาบาลวิภาวดี (กรุงเทพฯ)': { zone: 'Zone 3: จตุจักร / นนทบุรี', order: 4 },
  'โรงเรียนช่างฝีมือทหาร สถาบันวิชาการป้องกันประเทศ': { zone: 'Zone 3: จตุจักร / นนทบุรี', order: 4 },
  'ทัณฑสถานโรงพยาบาลราชทัณฑ์': { zone: 'Zone 3: จตุจักร / นนทบุรี', order: 4 },
  'แผนกแพทย์ กองบริหาร กรมช่างอากาศ': { zone: 'Zone 3: จตุจักร / นนทบุรี', order: 4 },
  'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย': { zone: 'Zone 3: จตุจักร / นนทบุรี', order: 4 },
  'กรมการแพทย์ กระทรวงสาธารณสุข': { zone: 'Zone 3: จตุจักร / นนทบุรี', order: 4 },

  // 📍 Zone 2: ดอนเมือง / สายไหม / หลักสี่
  'โรงพยาบาลภูมิพลอดุลยเดช': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5 },
  'กรมแพทย์ทหารอากาศ': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5 },
  'สถาบันเวชศาสตร์การบิน กองทัพอากาศ': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5 },
  'โรงพยาบาลทหารอากาศ (สีกัน)': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5 },
  'ศูนย์รักษาความปลอดภัย กองบัญชาการกองทัพไทย': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5 },
  'สสน.นทพ.': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5 },

  // 📍 Zone 6: ฝั่งธนบุรี
  'โรงพยาบาลสมเด็จพระปิ่นเกล้า': { zone: 'Zone 6: ฝั่งธนบุรี', order: 6 },
  'กรมแพทย์ทหารเรือ': { zone: 'Zone 6: ฝั่งธนบุรี', order: 6 },

  // 📍 Zone 7: รามคำแหง / บางนา / สมุทรปราการ
  'การกีฬาแห่งประเทศไทย': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7 },
  'บริษัท กรุงเทพดรักสโตร์ จำกัด': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7 },
  'โรงพยาบาลทหารเรือกรุงเทพ': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7 },
  'บริษัท สินแพทย์ เทพารักษ์ จำกัด': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7 }
};

function getZoneData(locationName) {
  for (const [key, data] of Object.entries(ZONE_MAP)) {
    if (locationName.includes(key) || key.includes(locationName)) return data;
  }
  return { zone: 'อื่นๆ / ไม่ระบุโซน', order: 99 };
}

function getZone(locationName) {
  return getZoneData(locationName).zone;
}

async function initDefaults() {
  await loadAllData();
  const locs = getData('cl_locations');
  if (locs.length === 0) {
    const defaultLocs = Object.keys(ZONE_MAP).map(name => ({
      name, zone: getZone(name)
    }));
    for (const loc of defaultLocs) {
      await addLocationApi(loc);
    }
  }
  const bankList = getData('cl_banks');
  if (bankList.length === 0) {
    const defaultBanks = ['กรุงไทย', 'กรุงเทพ', 'ไทยพาณิชย์', 'กสิกรไทย', 'ออมสิน', 'ธ.ก.ส.'];
    for (const b of defaultBanks) {
      await addBankApi(b);
    }
  }
  await syncData();
}

// ==================== PAGE NAVIGATION ====================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).style.display = 'block';
  document.getElementById('nav-' + page).classList.add('active');
  if (page === 'dashboard') renderDashboard();
  else if (page === 'collection') renderCollections();
  else if (page === 'deposit') renderDeposits();
  else if (page === 'settings') renderSettings();
}

// ==================== FORMATTING ====================
function fmt(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function fmtDate(d) { if (!d) return '-'; const dt = new Date(d); return dt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function today() { return new Date().toISOString().split('T')[0]; }

const STATUS_MAP = {
  pending: { label: '⏳ รอดำเนินการ', cls: 'badge-pending' },
  traveling: { label: '🚗 กำลังเดินทาง', cls: 'badge-traveling' },
  completed: { label: '✅ เสร็จสิ้น', cls: 'badge-completed' },
  cancelled: { label: '❌ ยกเลิก', cls: 'badge-cancelled' }
};
const LOC_TYPE_MAP = { hospital: '🏥 โรงพยาบาล', government: '🏛️ สถานที่ราชการ', private: '🏢 บริษัทเอกชน', other: '📌 อื่นๆ' };

function statusBadge(s) { const m = STATUS_MAP[s] || STATUS_MAP.pending; return `<span class="badge ${m.cls}">${m.label}</span>`; }

// ==================== TOAST ====================
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ==================== MODAL ====================
function openModal(type) {
  const m = document.getElementById('modal-' + type);
  m.classList.add('active');
  if (type === 'collection') { updateLocationDatalist(); document.getElementById('col-edit-id').value = ''; document.getElementById('col-location').value = ''; document.getElementById('modal-col-title').textContent = '📍 เพิ่มงานรับเช็ค'; }
  if (type === 'deposit') { updateBankDatalist(); document.getElementById('dep-edit-id').value = ''; document.getElementById('dep-bank').value = ''; document.getElementById('modal-dep-title').textContent = '🏦 เพิ่มงานนำฝากเช็คเข้าธนาคาร'; }
}
function closeModal(type) { document.getElementById('modal-' + type).classList.remove('active'); }

function showCopyModal(text) {
  document.getElementById('copy-text').value = text;
  document.getElementById('modal-copy').classList.add('active');
}

async function copyToClipboard() {
  const text = document.getElementById('copy-text').value;
  try {
    await navigator.clipboard.writeText(text);
    toast('📋 คัดลอกข้อความแล้ว!');
  } catch (err) {
    const el = document.getElementById('copy-text');
    el.select();
    document.execCommand('copy');
    toast('📋 คัดลอกข้อความแล้ว!');
  }
  closeModal('copy');
}

// ==================== DATALISTS ====================
function updateLocationDatalist() {
  const dl = document.getElementById('location-list');
  dl.innerHTML = getData(KEYS.locations).map(l => `<option value="${l.name}">`).join('');
}
function updateBankDatalist() {
  const dl = document.getElementById('bank-list');
  dl.innerHTML = getData(KEYS.banks).map(b => `<option value="${b}">`).join('');
}

// ==================== COLLECTION CRUD ====================
async function saveCollection(e) {
  e.preventDefault();
  const editId = document.getElementById('col-edit-id').value;
  const locationName = document.getElementById('col-location').value;

  const item = {
    id: editId || 'col_' + Date.now(),
    date: today(),
    location: locationName,
    checkCount: 0,
    totalAmount: 0,
    contactName: '',
    contactPhone: '',
    notes: '',
    status: 'pending'
  };

  if (editId) {
    const existing = getData('cl_collections').find(c => c.id === editId);
    if (existing) Object.assign(item, existing, { location: locationName });
  }

  await saveItem('collection', item);
  await addLocationApi({ name: item.location, zone: getZone(item.location) });

  closeModal('collection');
  e.target.reset();
  toast(editId ? 'แก้ไขสถานที่รับเช็คสำเร็จ' : 'เพิ่มสถานที่รับเช็คสำเร็จ');
  await syncData();
}

function renderCollections() {
  let cols = getData(KEYS.collections);
  const dateF = document.getElementById('filter-col-date').value;
  const statusF = document.getElementById('filter-col-status').value;
  const searchF = document.getElementById('filter-col-search').value.toLowerCase();
  if (dateF) cols = cols.filter(c => c.date === dateF);
  if (statusF) cols = cols.filter(c => c.status === statusF);
  if (searchF) cols = cols.filter(c => (c.location + c.contactName + c.notes).toLowerCase().includes(searchF));

  const tbody = document.getElementById('collection-table');
  const empty = document.getElementById('collection-empty');
  if (!cols.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = cols.map(c => `<tr>
    <td>${fmtDate(c.date)}</td><td><strong>${c.location}</strong></td>
    <td>${statusBadge(c.status)}</td>
    <td><div class="action-btns">
      <button class="btn btn-ghost btn-sm" onclick="editCollection('${c.id}')">✏️</button>
      <button class="btn btn-ghost btn-sm" onclick="cycleStatus('${c.id}','collection')">🔄</button>
      <button class="btn btn-ghost btn-sm" onclick="deleteItem('${c.id}','collection')">🗑️</button>
    </div></td></tr>`).join('');
}

function editCollection(id) {
  const c = getData(KEYS.collections).find(x => x.id === id);
  if (!c) return;
  document.getElementById('col-edit-id').value = c.id;
  document.getElementById('col-location').value = c.location;
  document.getElementById('modal-col-title').textContent = '✏️ แก้ไขสถานที่รับเช็ค';
  updateLocationDatalist();
  document.getElementById('modal-collection').classList.add('active');
}

// ==================== DEPOSIT CRUD ====================
async function saveDeposit(e) {
  e.preventDefault();
  const editId = document.getElementById('dep-edit-id').value;
  const item = {
    id: editId || 'dep_' + Date.now(),
    date: today(),
    bank: document.getElementById('dep-bank').value,
    branch: '',
    checkCount: 0,
    totalAmount: 0,
    notes: '',
    status: 'pending'
  };

  if (editId) {
    const existing = getData('cl_deposits').find(d => d.id === editId);
    if (existing) Object.assign(item, existing, { bank: item.bank });
  }

  await saveItem('deposit', item);
  await addBankApi(item.bank);

  closeModal('deposit');
  e.target.reset();
  toast(editId ? 'แก้ไขงานนำฝากเช็คสำเร็จ' : 'เพิ่มงานนำฝากเช็คสำเร็จ');
  await syncData();
}

function renderDeposits() {
  let deps = getData(KEYS.deposits);
  const dateF = document.getElementById('filter-dep-date').value;
  const statusF = document.getElementById('filter-dep-status').value;
  const searchF = document.getElementById('filter-dep-search').value.toLowerCase();
  if (dateF) deps = deps.filter(d => d.date === dateF);
  if (statusF) deps = deps.filter(d => d.status === statusF);
  if (searchF) deps = deps.filter(d => (d.bank + d.branch + d.notes).toLowerCase().includes(searchF));

  const tbody = document.getElementById('deposit-table');
  const empty = document.getElementById('deposit-empty');
  if (!deps.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = deps.map(d => `<tr>
    <td>${fmtDate(d.date)}</td><td><strong>${d.bank}</strong></td><td>${d.branch || '-'}</td>
    <td>${statusBadge(d.status)}</td>
    <td><div class="action-btns">
      <button class="btn btn-ghost btn-sm" onclick="editDeposit('${d.id}')">✏️</button>
      <button class="btn btn-ghost btn-sm" onclick="cycleStatus('${d.id}','deposit')">🔄</button>
      <button class="btn btn-ghost btn-sm" onclick="deleteItem('${d.id}','deposit')">🗑️</button>
    </div></td></tr>`).join('');
}

function editDeposit(id) {
  const d = getData(KEYS.deposits).find(x => x.id === id);
  if (!d) return;
  document.getElementById('dep-edit-id').value = d.id;
  document.getElementById('dep-bank').value = d.bank;
  document.getElementById('modal-dep-title').textContent = '✏️ แก้ไขงานนำฝากเช็คเข้าธนาคาร';
  updateBankDatalist();
  document.getElementById('modal-deposit').classList.add('active');
}

// ==================== SHARED ACTIONS ====================
async function cycleStatus(id, type) {
  const items = getData(type === 'collection' ? 'cl_collections' : 'cl_deposits');
  const item = items.find(i => i.id === id);
  if (!item) return;
  const states = type === 'collection' ? ['pending', 'traveling', 'completed', 'cancelled'] : ['pending', 'completed', 'cancelled'];
  const idx = states.indexOf(item.status);
  item.status = states[(idx + 1) % states.length];

  await saveItem(type, item);
  toast(`สถานะเปลี่ยนเป็น: ${STATUS_MAP[item.status].label}`);
  await syncData();

  if (item.status === 'completed' || item.status === 'traveling') {
    if (type === 'collection') sendCollectionNotify(item, true);
    else sendDepositNotify(item, true);
  }
}

async function deleteItem(id, type) {
  if (!confirm('ต้องการลบรายการนี้?')) return;
  await deleteItemApi(id, type);
  toast('ลบรายการสำเร็จ');
  await syncData();
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const cols = getData(KEYS.collections);
  const deps = getData(KEYS.deposits);
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);

  document.getElementById('stat-pending-col').textContent = cols.filter(c => c.status === 'pending' || c.status === 'traveling').length;
  document.getElementById('stat-pending-dep').textContent = deps.filter(d => d.status === 'pending').length;

  const completedThisMonth = [...cols, ...deps].filter(i => i.status === 'completed' && i.date && i.date.startsWith(thisMonth));
  document.getElementById('stat-completed').textContent = completedThisMonth.length;

  const totalThisMonth = [...cols, ...deps].filter(i => i.date && i.date.startsWith(thisMonth)).reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalEl = document.getElementById('stat-total-amount');
  if (totalEl) totalEl.textContent = fmt(totalThisMonth);

  // Recent items
  const all = [...cols.map(c => ({ ...c, _type: '📍 รับเช็ค', _name: c.location })), ...deps.map(d => ({ ...d, _type: '🏦 นำฝากเช็ค', _name: d.bank }))];
  all.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  const recent = all.slice(0, 8);

  const tbody = document.getElementById('recent-table');
  const empty = document.getElementById('recent-empty');
  if (!tbody) return;
  if (!recent.length) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = recent.map(r => `<tr>
    <td>${fmtDate(r.date)}</td><td><strong>${r._name}</strong></td>
    <td>${statusBadge(r.status)}</td></tr>`).join('');
}

// ==================== SETTINGS ====================
function renderSettings() {
  const settings = getSettings();
  if (settings.gasUrl) document.getElementById('setting-gas-url').value = settings.gasUrl;
  renderLocationTags();
  renderBankTags();
}

// Auto-save settings on change
document.addEventListener('change', async (e) => {
  if (e.target.id === 'setting-gas-url') {
    const settings = getSettings();
    settings.gasUrl = e.target.value.trim();
    await saveSettingApi(settings);
    toast('บันทึกลิงก์สำรองข้อมูลแล้ว');
  }
});

async function addLocation() {
  const name = document.getElementById('new-location').value.trim();
  if (!name) return;
  const locs = getData('cl_locations');
  if (locs.find(l => l.name === name)) { toast('สถานที่นี้มีอยู่แล้ว', 'error'); return; }

  await addLocationApi({ name, zone: getZone(name) });
  document.getElementById('new-location').value = '';
  await syncData();
  toast('เพิ่มสถานที่สำเร็จ');
}

async function removeLocation(name) {
  if (!confirm(`ต้องการลบสถานที่ "${name}"?`)) return;
  await removeLocationApi(name);
  await syncData();
}

function renderLocationTags() {
  const c = document.getElementById('locations-tags');
  const locs = getData('cl_locations');
  c.innerHTML = locs.map(l => `<span class="tag">📌 ${l.name} <span class="tag-remove" onclick="removeLocation('${l.name}')">✕</span></span>`).join('');
}

async function addBank() {
  const name = document.getElementById('new-bank').value.trim();
  if (!name) return;
  const banks = getData('cl_banks');
  if (banks.includes(name)) { toast('ธนาคารนี้มีอยู่แล้ว', 'error'); return; }

  await addBankApi(name);
  document.getElementById('new-bank').value = '';
  await syncData();
  toast('เพิ่มธนาคารสำเร็จ');
}

async function removeBank(name) {
  if (!confirm(`ต้องการลบธนาคาร "${name}"?`)) return;
  await removeBankApi(name);
  await syncData();
}

function renderBankTags() {
  const c = document.getElementById('banks-tags');
  const banks = getData('cl_banks');
  c.innerHTML = banks.map(b => `<span class="tag">🏦 ${b} <span class="tag-remove" onclick="removeBank('${b}')">✕</span></span>`).join('');
}

// ==================== EXPORT / IMPORT ====================
function exportData() {
  const data = { 
    collections: _state.collections, 
    deposits: _state.deposits, 
    locations: _state.locations, 
    banks: _state.banks, 
    settings: _state.settings, 
    exportDate: new Date().toISOString() 
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CheckLine_backup_${today()}.json`;
  a.click();
  toast('Export ข้อมูลสำเร็จ');
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!confirm('⚠️ การนำเข้าข้อมูลจะเขียนทับฐานข้อมูลกลาง (PostgreSQL) ทั้งหมด ต้องการดำเนินการต่อหรือไม่?')) {
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.collections && !data.deposits && !data.locations && !data.banks && !data.settings) {
        throw new Error('Invalid format');
      }

      toast('⌛ กำลังนำเข้าข้อมูลไปยังฐานข้อมูลกลาง...', 'info');
      const result = await apiRequest('/import', 'POST', data);
      
      if (result && result.success) {
        toast('✅ นำเข้าข้อมูลสำเร็จแล้ว ระบบกำลังรีเฟรช...');
        setTimeout(() => {
          location.reload();
        }, 1500);
      } else {
        throw new Error('Server import failed');
      }

    } catch (err) {
      console.error('Import error:', err);
      toast('❌ ไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

async function backupToDrive() {
  const settings = getSettings();
  if (!settings.gasUrl) {
    toast('กรุณากรอก Google Apps Script URL ในหน้าตั้งค่าก่อนครับ', 'error');
    showPage('settings');
    return;
  }

  const data = {
    collections: _state.collections,
    deposits: _state.deposits,
    locations: _state.locations,
    banks: _state.banks,
    settings: settings,
    exportDate: new Date().toISOString(),
    filename: `CheckLine_backup_${today()}.json`
  };

  toast('กำลังส่งข้อมูลไปยัง Google Drive...', 'info');

  try {
    // We use no-cors if the GAS isn't set up for CORS, but better to use a regular request
    // Since GAS web apps handle redirects, we often need to handle that or use a simple POST
    const response = await fetch(settings.gasUrl, {
      method: 'POST',
      mode: 'no-cors', // Basic GAS web apps often require no-cors for simple implementation
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // With no-cors, we can't see the response body, but we can assume success if no error thrown
    toast('✅ ส่งข้อมูลไปยัง Google Drive สำเร็จ! (โปรดตรวจสอบใน Drive ของคุณ)');
  } catch (error) {
    console.error('Backup Error:', error);
    toast('❌ เกิดข้อผิดพลาดในการสำรองข้อมูล', 'error');
  }
}

async function clearAllData() {
  if (!confirm('⚠️ ต้องการลบข้อมูลทั้งหมดจากฐานข้อมูลกลาง? การกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
  await apiRequest('/all', 'DELETE');
  await initDefaults();
  toast('ลบข้อมูลทั้งหมดสำเร็จ');
}

// ==================== COPY REPORT & ITINERARY ====================

function sendCollectionNotify(item, isUpdate = false) {
  const statusText = STATUS_MAP[item.status]?.label || item.status;
  const zone = getZone(item.location);
  const msg = `📍 ${isUpdate ? 'อัปเดต' : 'แจ้ง'}งานรับเช็ค\n━━━━━━━━━━━━━━━\n📅 วันที่: ${fmtDate(item.date)}\n🗺️ โซน: ${zone}\n🏥 สถานที่: ${item.location}\n📋 จำนวน: ${item.checkCount} ฉบับ\n💰 ยอดรวม: ${fmt(item.totalAmount)} บาท${item.contactName ? '\n👤 ผู้ติดต่อ: ' + item.contactName : ''}${item.contactPhone ? '\n📞 โทร: ' + item.contactPhone : ''}${item.notes ? '\n📝 หมายเหตุ: ' + item.notes : ''}\n━━━━━━━━━━━━━━━\nสถานะ: ${statusText}`;
  showCopyModal(msg);
}

function sendDepositNotify(item, isUpdate = false) {
  const statusText = STATUS_MAP[item.status]?.label || item.status;
  const msg = `🏦 ${isUpdate ? 'อัปเดต' : 'แจ้ง'}งานนำเช็คฝากธนาคาร\n━━━━━━━━━━━━━━━\n📅 วันที่: ${fmtDate(item.date)}\n🏦 ธนาคาร: ${item.bank}${item.branch ? ' สาขา ' + item.branch : ''}\n📋 จำนวน: ${item.checkCount} ฉบับ\n💰 ยอดรวม: ${fmt(item.totalAmount)} บาท${item.notes ? '\n📝 หมายเหตุ: ' + item.notes : ''}\n━━━━━━━━━━━━━━━\nสถานะ: ${statusText}`;
  showCopyModal(msg);
}


function generateItinerary() {
  const tasks = getData(KEYS.collections).filter(t => t.status === 'pending');
  if (tasks.length === 0) {
    toast('ไม่มีงานรับเช็คที่ค้างอยู่', 'info');
    return;
  }

  // Sort by Zone order
  tasks.sort((a, b) => {
    const za = getZoneData(a.location);
    const zb = getZoneData(b.location);
    return za.order - zb.order;
  });

  let msg = `🗺️ แผนกำหนดการที่จะไป มีดังนี้\n📍 ต้นทาง: โรงงานเภสัชกรรมทหาร\n━━━━━━━━━━━━━━━`;

  const groups = {};
  tasks.forEach(t => {
    const z = getZone(t.location);
    if (!groups[z]) groups[z] = [];
    groups[z].push(t);
  });

  const sortedZones = Object.keys(groups).sort((a, b) => {
    return getZoneOrderByTitle(a) - getZoneOrderByTitle(b);
  });

  sortedZones.forEach(z => {
    msg += `\n\n📍 ${z}`;
    groups[z].forEach((t, idx) => {
      msg += `\n${idx + 1}. ${t.location}`;
    });
  });

  msg += `\n━━━━━━━━━━━━━━━\nจำนวนสถานที่รวม: ${tasks.length} แห่ง`;
  showCopyModal(msg);
}

function getZoneOrderByTitle(title) {
  for (const loc in ZONE_MAP) {
    if (ZONE_MAP[loc].zone === title) return ZONE_MAP[loc].order;
  }
  return 99;
}

function openItinerarySelector() {
  const colTasks = getData(KEYS.collections).filter(t => t.status === 'pending');
  const depTasks = getData(KEYS.deposits).filter(t => t.status === 'pending');
  
  const allTasks = [
    ...colTasks.map(t => ({ ...t, _type: 'collection', _label: t.location })),
    ...depTasks.map(t => ({ ...t, _type: 'deposit', _label: `🏦 ${t.bank}` }))
  ];

  if (allTasks.length === 0) {
    toast('ไม่มีงานรับเช็คหรือฝากธนาคารที่ค้างอยู่', 'info');
    return;
  }

  // Sort tasks by zone before showing
  allTasks.sort((a, b) => {
    const za = a._type === 'collection' ? getZoneData(a.location) : { order: 90 }; // Banks usually after collections
    const zb = b._type === 'collection' ? getZoneData(b.location) : { order: 90 };
    return za.order - zb.order;
  });

  const container = document.getElementById('selector-list');
  container.innerHTML = '';

  allTasks.forEach(t => {
    const div = document.createElement('div');
    div.style.marginBottom = '12px';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '10px';
    
    const zoneName = t._type === 'collection' ? getZone(t.location) : '🏦 งานนำฝากเช็คเข้าธนาคาร';
    
    div.innerHTML = `
      <input type="checkbox" id="sel-${t.id}" value="${t.id}" data-type="${t._type}" style="width:20px; height:20px; cursor:pointer">
      <label for="sel-${t.id}" style="cursor:pointer; flex:1">
        <div style="font-weight:500">${t._label}</div>
        <div style="font-size:0.75rem; color:var(--text-dim)">${zoneName}</div>
      </label>
    `;
    container.appendChild(div);
  });

  openModal('itinerary-selector');
}

function generateSelectedItinerary() {
  const container = document.getElementById('selector-list');
  const checkedNodes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
  
  if (checkedNodes.length === 0) {
    toast('กรุณาเลือกรายการอย่างน้อย 1 แห่ง', 'warning');
    return;
  }

  const selectedTasks = [];
  checkedNodes.forEach(node => {
    const id = node.value;
    const type = node.getAttribute('data-type');
    const task = getData(type === 'collection' ? 'cl_collections' : 'cl_deposits').find(t => t.id.toString() === id.toString());
    if (task) {
      selectedTasks.push({ 
        ...task, 
        _type: type, 
        _label: type === 'collection' ? task.location : `🏦 ${task.bank}`,
        _zone: type === 'collection' ? getZone(task.location) : '🏦 งานนำฝากเช็คเข้าธนาคาร'
      });
    }
  });

  // Sort selected tasks by zone
  selectedTasks.sort((a, b) => {
    const za = a._type === 'collection' ? getZoneData(a.location) : { order: 90 };
    const zb = b._type === 'collection' ? getZoneData(b.location) : { order: 90 };
    return za.order - zb.order;
  });

  let msg = `📅 วันที่: ${fmtDate(today())}\n🗺️ แผนกำหนดการที่มีในมือ มีดังนี้\n📍 ต้นทาง: โรงงานเภสัชกรรมทหาร\n━━━━━━━━━━━━━━━`;

  const groups = {};
  selectedTasks.forEach(t => {
    const z = t._zone;
    if (!groups[z]) groups[z] = [];
    groups[z].push(t);
  });

  const sortedZones = Object.keys(groups).sort((a, b) => {
    if (a.includes('ธนาคาร')) return 1;
    if (b.includes('ธนาคาร')) return -1;
    return getZoneOrderByTitle(a) - getZoneOrderByTitle(b);
  });

  sortedZones.forEach(z => {
    msg += `\n\n📍 ${z}`;
    groups[z].forEach((t, idx) => {
      msg += `\n${idx + 1}. ${t._label}`;
    });
  });

  msg += `\n━━━━━━━━━━━━━━━\nจำนวนสถานที่รวม: ${selectedTasks.length} แห่ง`;

  closeModal('itinerary-selector');
  showCopyModal(msg);
}

function getTrafficEstimation(lat, lng, address = '') {
  const hour = new Date().getHours();
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = (day === 0 || day === 6);
  const isCbd = address.includes('สีลม') || address.includes('ปทุมวัน') || address.includes('สุขุมวิท') || address.includes('อโศก') || address.includes('ดินแดง') || address.includes('พญาไท');
  const isMainRoad = address.includes('ถนน') || address.includes('ซอย');

  let status = '';
  let detail = '';

  if (isWeekend) {
    if (hour >= 11 && hour <= 20) {
      status = '🔴 คึกคัก/หนาแน่น';
      detail = 'ปริมาณรถมากบริเวณห้างสรรพสินค้าและแหล่งท่องเที่ยว';
    } else {
      status = '🟢 คล่องตัว';
      detail = 'การจราจรโดยรวมเบาบาง เดินทางได้สะดวก';
    }
  } else {
    // Weekdays
    if (hour >= 7 && hour <= 9) {
      status = '🔴 หนาแน่นมาก (ชั่วโมงเร่งด่วนเช้า)';
      detail = isCbd ? 'พื้นที่ใจกลางเมืองมีการจราจรติดขัดสะสมสลับหยุดนิ่ง' : 'มีปริมาณรถมากตามแนวถนนสายหลักและเขตโรงเรียน';
    } else if (hour >= 16 && hour <= 19) {
      status = '🔴 หนาแน่นมาก (ชั่วโมงเร่งด่วนเย็น)';
      detail = 'ปริมาณรถสะสมหนาแน่นทุกเส้นทางมุ่งหน้าออกนอกเมือง';
    } else if (hour >= 11 && hour <= 14) {
      status = '🟡 ปานกลาง/หนาแน่นบางจุด';
      detail = 'เคลื่อนตัวได้เรื่อยๆ มีชะลอตัวบ้างตามทางร่วมทางแยก';
    } else {
      status = '🟢 คล่องตัว';
      detail = 'ปริมาณรถน้อย เดินทางได้ราบรื่น';
    }
  }

  const zoneInference = isCbd ? ' (เขตธุรกิจ/ใจกลางเมือง)' : (address.includes('เขต') ? ` (${address.split('เขต')[1].split(',')[0].trim()})` : '');
  return `${status}\n📝 ${detail}${zoneInference}`;
}

function checkIn() {
  if (!navigator.geolocation) {
    toast('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง', 'error');
    return;
  }

  toast('กำลังระบุตำแหน่ง...', 'info');

  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

  const success = async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const time = new Date().toLocaleTimeString('th-TH');
    const date = fmtDate(today());
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    let address = 'กำลังค้นหาชื่อสถานที่...';
    toast('🌏 กำลังค้นหาชื่อถนน/สถานที่ใกล้เคียง...', 'info');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`);
      const data = await res.json();
      address = data.display_name || 'ไม่พบชื่อสถานที่ใกล้เคียง';
    } catch (e) {
      console.error('Reverse Geocode Error:', e);
      address = 'ไม่สามารถดึงข้อมูลชื่อสถานที่ได้';
    }

    const trafficStatus = getTrafficEstimation(lat, lng, address);
    const msg = `📍 รายงานตำแหน่งปัจจุบัน (Check-in)\n━━━━━━━━━━━━━━━\n📅 วันที่: ${date}\n⏰ เวลา: ${time}\n🌎 พิกัด: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n🏛️ สถานที่ใกล้เคียง:\n${address}\n\n🚦 สภาพการจราจร:\n${trafficStatus}\n\n🗺️ ลิงก์แผนที่:\n${mapUrl}\n━━━━━━━━━━━━━━━`;

    showCopyModal(msg);
    toast('ระบุตำแหน่งและสถานที่สำเร็จ');
  };

  const error = (err) => {
    console.error('Geolocation Error:', err);
    let errMsg = 'ไม่สามารถระบุตำแหน่งได้';

    if (err.code === 1) {
      errMsg = 'กรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้ง (Permission Denied)';
    } else if (err.code === 2) {
      errMsg = 'ไม่พบข้อมูลตำแหน่ง (Position Unavailable)';
    } else if (err.code === 3) {
      errMsg = 'ระบุตำแหน่งใช้เวลานานเกินไป (Timeout)';
    }

    // Try fallback to low accuracy if high accuracy failed
    if (options.enableHighAccuracy && (err.code === 2 || err.code === 3)) {
      toast('กำลังลองใหม่อีกครั้งแบบความแม่นยำต่ำ...', 'info');
      options.enableHighAccuracy = false;
      navigator.geolocation.getCurrentPosition(success, (e2) => {
        toast(errMsg, 'error');
        if (location.protocol === 'file:') {
          toast('คำแนะนำ: Geolocation อาจไม่ทำงานบน file:// กรุณาเปิดผ่าน Local Server หรือใช้ HTTPS', 'warning');
        }
      }, options);
    } else {
      toast(errMsg, 'error');
      if (location.protocol === 'file:') {
        toast('คำแนะนำ: Geolocation อาจไม่ทำงานบน file:// กรุณาใช้ Local Server', 'warning');
      }
    }
  };

  navigator.geolocation.getCurrentPosition(success, error, options);
}

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', () => {
  initDefaults();
});
