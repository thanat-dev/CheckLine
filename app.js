// ==================== DATA LAYER ====================
const KEYS = { collections: 'cl_collections', deposits: 'cl_deposits', locations: 'cl_locations', banks: 'cl_banks', settings: 'cl_settings' };

function getData(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
function setData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function getSettings() { try { return JSON.parse(localStorage.getItem(KEYS.settings)) || {}; } catch { return {}; } }
function saveSettings(s) { localStorage.setItem(KEYS.settings, JSON.stringify(s)); }

// Default data
const ZONE_MAP = {
  // 📍 Zone 1: พญาไท / อนุสาวรีย์ชัยสมรภูมิ / พระราม 6 (ใกล้ต้นทางที่สุด)
  'โรงพยาบาลพระมงกุฎเกล้า': { zone: '1: พญาไท / พระราม 6', order: 1 },
  'สถาบันพยาธิวิทยา ศูนย์อำนวยการแพทย์พระมงกุฎเกล้า': { zone: '1: พญาไท / พระราม 6', order: 1 },
  'บริษัท พีเอ็มเควิทยาเวช จำกัด (ร้านยาสิรินธรโอสถ รพ.พระมงกุฎ)': { zone: '1: พญาไท / พระราม 6', order: 1 },
  'สถาบันวิจัยวิทยาศาสตร์การแพทย์ทหาร': { zone: '1: พญาไท / พระราม 6', order: 1 },
  'กองคลังแพทย์ กรมแพทย์ทหารบก': { zone: '1: พญาไท / พระราม 6', order: 1 },
  'องค์การเภสัชกรรม สำนักงานใหญ่': { zone: '1: พญาไท / พระราม 6', order: 1 },
  'โรงพยาบาลทหารผ่านศึก': { zone: '1: พญาไท / พระราม 6', order: 1 },

  // 📍 Zone 5: ปทุมวัน / ดินแดง (เขต CBD)
  'มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)': { zone: '5: ปทุมวัน / ดินแดง', order: 2 },
  'กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย': { zone: '5: ปทุมวัน / ดินแดง', order: 2 },

  // 📍 Zone 4: พระนคร / ดุสิต / ป้อมปราบศัตรูพ่าย
  'โรงพยาบาลกลาง': { zone: '4: พระนคร / ดุสิต', order: 3 },
  'กรมแผนที่ทหาร': { zone: '4: พระนคร / ดุสิต', order: 3 },
  'มูลนิธิราชประชานุเคราะห์ ในพระบรมราชูปถัมภ์': { zone: '4: พระนคร / ดุสิต', order: 3 },
  'กองงานในพระองค์สมเด็จพระกนิษฐาธิราชเจ้ากรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี': { zone: '4: พระนคร / ดุสิต', order: 3 },

  // 📍 Zone 3: จตุจักร / บางซื่อ / งามวงศ์วาน / นนทบุรี
  'โรงพยาบาลวิภาวดี (กรุงเทพฯ)': { zone: '3: จตุจักร / นนทบุรี', order: 4 },
  'โรงเรียนช่างฝีมือทหาร สถาบันวิชาการป้องกันประเทศ': { zone: '3: จตุจักร / นนทบุรี', order: 4 },
  'ทัณฑสถานโรงพยาบาลราชทัณฑ์': { zone: '3: จตุจักร / นนทบุรี', order: 4 },
  'แผนกแพทย์ กองบริหาร กรมช่างอากาศ': { zone: '3: จตุจักร / นนทบุรี', order: 4 },
  'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย': { zone: '3: จตุจักร / นนทบุรี', order: 4 },
  'กรมการแพทย์ กระทรวงสาธารณสุข': { zone: '3: จตุจักร / นนทบุรี', order: 4 },

  // 📍 Zone 2: ดอนเมือง / สายไหม / หลักสี่
  'โรงพยาบาลภูมิพลอดุลยเดช': { zone: '2: ดอนเมือง / สายไหม', order: 5 },
  'กรมแพทย์ทหารอากาศ': { zone: '2: ดอนเมือง / สายไหม', order: 5 },
  'สถาบันเวชศาสตร์การบิน กองทัพอากาศ': { zone: '2: ดอนเมือง / สายไหม', order: 5 },
  'โรงพยาบาลทหารอากาศ (สีกัน)': { zone: '2: ดอนเมือง / สายไหม', order: 5 },
  'ศูนย์รักษาความปลอดภัย กองบัญชาการกองทัพไทย': { zone: '2: ดอนเมือง / สายไหม', order: 5 },
  'สสน.นทพ.': { zone: '2: ดอนเมือง / สายไหม', order: 5 },

  // 📍 Zone 6: ฝั่งธนบุรี
  'โรงพยาบาลสมเด็จพระปิ่นเกล้า': { zone: '6: ฝั่งธนบุรี', order: 6 },
  'กรมแพทย์ทหารเรือ': { zone: '6: ฝั่งธนบุรี', order: 6 },

  // 📍 Zone 7: รามคำแหง / บางนา / สมุทรปราการ
  'การกีฬาแห่งประเทศไทย': { zone: '7: รามคำแหง / สมุทรปราการ', order: 7 },
  'บริษัท กรุงเทพดรักสโตร์ จำกัด': { zone: '7: รามคำแหง / สมุทรปราการ', order: 7 },
  'โรงพยาบาลทหารเรือกรุงเทพ': { zone: '7: รามคำแหง / สมุทรปราการ', order: 7 },
  'บริษัท สินแพทย์ เทพารักษ์ จำกัด': { zone: '7: รามคำแหง / สมุทรปราการ', order: 7 }
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

function initDefaults() {
  if (!localStorage.getItem(KEYS.locations)) {
    const defaultLocs = Object.keys(ZONE_MAP).map(name => ({
      name, type: name.includes('บริษัท') ? 'private' : (name.includes('โรงพยาบาล') || name.includes('แพทย์') || name.includes('เภสัช')) ? 'hospital' : 'government'
    }));
    defaultLocs.push({ name: 'สนง.สรรพากร', type: 'government' }, { name: 'สนง.ประกันสังคม', type: 'government' });
    setData(KEYS.locations, defaultLocs);
  }
  if (!localStorage.getItem(KEYS.banks)) {
    setData(KEYS.banks, ['กรุงไทย', 'กรุงเทพ', 'ไทยพาณิชย์', 'กสิกรไทย', 'ออมสิน', 'ธ.ก.ส.']);
  }
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
  const c = document.getElementById('toastContainer');
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
  if (type === 'deposit') { updateBankDatalist(); document.getElementById('dep-edit-id').value = ''; document.getElementById('dep-bank').value = ''; document.getElementById('modal-dep-title').textContent = '🏦 เพิ่มงานฝากธนาคาร'; }
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
function saveCollection(e) {
  e.preventDefault();
  const cols = getData(KEYS.collections);
  const editId = document.getElementById('col-edit-id').value;

  const locationName = document.getElementById('col-location').value;
  let locType = 'other';
  if (locationName.includes('บริษัท')) locType = 'private';
  else if (locationName.includes('โรงพยาบาล') || locationName.includes('แพทย์') || locationName.includes('เภสัช')) locType = 'hospital';
  else locType = 'government';

  const item = {
    id: editId || 'col_' + Date.now(),
    type: 'collection',
    date: today(),
    location: locationName,
    locationType: locType,
    checkCount: 0,
    totalAmount: 0,
    contactName: '',
    contactPhone: '',
    notes: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    const idx = cols.findIndex(c => c.id === editId);
    if (idx >= 0) {
      item.status = cols[idx].status;
      item.createdAt = cols[idx].createdAt;
      item.date = cols[idx].date;
      item.checkCount = cols[idx].checkCount;
      item.totalAmount = cols[idx].totalAmount;
      item.contactName = cols[idx].contactName;
      item.contactPhone = cols[idx].contactPhone;
      item.notes = cols[idx].notes;
      cols[idx] = item;
    }
  } else { cols.unshift(item); }

  setData(KEYS.collections, cols);
  // Auto-save location
  const locs = getData(KEYS.locations);
  if (!locs.find(l => l.name === item.location)) { locs.push({ name: item.location, type: locType }); setData(KEYS.locations, locs); }

  closeModal('collection');
  e.target.reset();
  toast(editId ? 'แก้ไขสถานที่รับเช็คสำเร็จ' : 'เพิ่มสถานที่รับเช็คสำเร็จ');
  renderCollections(); renderDashboard();
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
    <td>${fmtDate(c.date)}</td><td><strong>${c.location}</strong></td><td>${LOC_TYPE_MAP[c.locationType] || ''}</td>
    <td>${c.checkCount} ฉบับ</td><td>${fmt(c.totalAmount)}</td><td>${c.contactName || '-'}</td>
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
function saveDeposit(e) {
  e.preventDefault();
  const deps = getData(KEYS.deposits);
  const editId = document.getElementById('dep-edit-id').value;
  const item = {
    id: editId || 'dep_' + Date.now(),
    type: 'deposit',
    date: today(),
    bank: document.getElementById('dep-bank').value,
    branch: '',
    checkCount: 0,
    totalAmount: 0,
    notes: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    const idx = deps.findIndex(d => d.id === editId);
    if (idx >= 0) {
      item.status = deps[idx].status;
      item.createdAt = deps[idx].createdAt;
      item.date = deps[idx].date;
      item.branch = deps[idx].branch;
      item.checkCount = deps[idx].checkCount;
      item.totalAmount = deps[idx].totalAmount;
      item.notes = deps[idx].notes;
      deps[idx] = item;
    }
  } else { deps.unshift(item); }

  setData(KEYS.deposits, deps);
  const banks = getData(KEYS.banks);
  if (!banks.includes(item.bank)) { banks.push(item.bank); setData(KEYS.banks, banks); }

  closeModal('deposit');
  e.target.reset();
  toast(editId ? 'แก้ไขงานฝากธนาคารสำเร็จ' : 'เพิ่มงานฝากธนาคารสำเร็จ');
  renderDeposits(); renderDashboard();
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
    <td>${d.checkCount} ฉบับ</td><td>${fmt(d.totalAmount)}</td>
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
  document.getElementById('modal-dep-title').textContent = '✏️ แก้ไขงานฝากธนาคาร';
  updateBankDatalist();
  document.getElementById('modal-deposit').classList.add('active');
}

// ==================== SHARED ACTIONS ====================
function cycleStatus(id, type) {
  const key = type === 'collection' ? KEYS.collections : KEYS.deposits;
  const items = getData(key);
  const item = items.find(i => i.id === id);
  if (!item) return;
  const states = type === 'collection' ? ['pending', 'traveling', 'completed', 'cancelled'] : ['pending', 'completed', 'cancelled'];
  const idx = states.indexOf(item.status);
  item.status = states[(idx + 1) % states.length];
  item.updatedAt = new Date().toISOString();
  setData(key, items);
  toast(`สถานะเปลี่ยนเป็น: ${STATUS_MAP[item.status].label}`);
  if (type === 'collection') renderCollections(); else renderDeposits();
  renderDashboard();

  // Send LINE notification on status change
  if (item.status === 'completed' || item.status === 'traveling') {
    if (type === 'collection') sendCollectionNotify(item, true);
    else sendDepositNotify(item, true);
  }
}

function deleteItem(id, type) {
  if (!confirm('ต้องการลบรายการนี้?')) return;
  const key = type === 'collection' ? KEYS.collections : KEYS.deposits;
  const items = getData(key).filter(i => i.id !== id);
  setData(key, items);
  toast('ลบรายการสำเร็จ');
  if (type === 'collection') renderCollections(); else renderDeposits();
  renderDashboard();
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
  document.getElementById('stat-total-amount').textContent = fmt(totalThisMonth);

  // Recent items
  const all = [...cols.map(c => ({ ...c, _type: '📍 รับเช็ค', _name: c.location })), ...deps.map(d => ({ ...d, _type: '🏦 ฝากธนาคาร', _name: d.bank }))];
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent = all.slice(0, 8);

  const tbody = document.getElementById('recent-table');
  const empty = document.getElementById('recent-empty');
  if (!recent.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = recent.map(r => `<tr>
    <td>${fmtDate(r.date)}</td><td>${r._type}</td><td><strong>${r._name}</strong></td>
    <td>${r.checkCount} ฉบับ</td><td>${fmt(r.totalAmount)}</td><td>${statusBadge(r.status)}</td></tr>`).join('');
}

// ==================== SETTINGS ====================
function renderSettings() {
  const settings = getSettings();
  if (settings.gasUrl) document.getElementById('setting-gas-url').value = settings.gasUrl;
  renderLocationTags();
  renderBankTags();
}

// Auto-save GAS URL on change
document.addEventListener('change', (e) => {
  if (e.target.id === 'setting-gas-url') {
    const settings = getSettings();
    settings.gasUrl = e.target.value.trim();
    saveSettings(settings);
    toast('บันทึกลิงก์สำรองข้อมูลแล้ว');
  }
});

function addLocation() {
  const name = document.getElementById('new-location').value.trim();
  const type = document.getElementById('new-location-type').value;
  if (!name) return;
  const locs = getData(KEYS.locations);
  if (locs.find(l => l.name === name)) { toast('สถานที่นี้มีอยู่แล้ว', 'error'); return; }
  locs.push({ name, type });
  setData(KEYS.locations, locs);
  document.getElementById('new-location').value = '';
  renderLocationTags();
  toast('เพิ่มสถานที่สำเร็จ');
}

function removeLocation(name) {
  const locs = getData(KEYS.locations).filter(l => l.name !== name);
  setData(KEYS.locations, locs);
  renderLocationTags();
}

function renderLocationTags() {
  const c = document.getElementById('locations-tags');
  const locs = getData(KEYS.locations);
  c.innerHTML = locs.map(l => `<span class="tag">${LOC_TYPE_MAP[l.type] ? LOC_TYPE_MAP[l.type].split(' ')[0] : '📌'} ${l.name} <span class="tag-remove" onclick="removeLocation('${l.name}')">✕</span></span>`).join('');
}

function addBank() {
  const name = document.getElementById('new-bank').value.trim();
  if (!name) return;
  const banks = getData(KEYS.banks);
  if (banks.includes(name)) { toast('ธนาคารนี้มีอยู่แล้ว', 'error'); return; }
  banks.push(name);
  setData(KEYS.banks, banks);
  document.getElementById('new-bank').value = '';
  renderBankTags();
  toast('เพิ่มธนาคารสำเร็จ');
}

function removeBank(name) {
  const banks = getData(KEYS.banks).filter(b => b !== name);
  setData(KEYS.banks, banks);
  renderBankTags();
}

function renderBankTags() {
  const c = document.getElementById('banks-tags');
  const banks = getData(KEYS.banks);
  c.innerHTML = banks.map(b => `<span class="tag">🏦 ${b} <span class="tag-remove" onclick="removeBank('${b}')">✕</span></span>`).join('');
}

// ==================== EXPORT / IMPORT ====================
function exportData() {
  const data = { collections: getData(KEYS.collections), deposits: getData(KEYS.deposits), locations: getData(KEYS.locations), banks: getData(KEYS.banks), settings: getSettings(), exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CheckLine_backup_${today()}.json`;
  a.click();
  toast('Export ข้อมูลสำเร็จ');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.collections) setData(KEYS.collections, data.collections);
      if (data.deposits) setData(KEYS.deposits, data.deposits);
      if (data.locations) setData(KEYS.locations, data.locations);
      if (data.banks) setData(KEYS.banks, data.banks);
      if (data.settings) saveSettings(data.settings);
      toast('Import ข้อมูลสำเร็จ');
      renderDashboard(); renderSettings();
    } catch { toast('ไฟล์ไม่ถูกต้อง', 'error'); }
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
    collections: getData(KEYS.collections),
    deposits: getData(KEYS.deposits),
    locations: getData(KEYS.locations),
    banks: getData(KEYS.banks),
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

function clearAllData() {
  if (!confirm('⚠️ ต้องการลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  initDefaults();
  toast('ลบข้อมูลทั้งหมดสำเร็จ');
  renderDashboard(); renderSettings();
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

function sendDailySummary() {
  const todayStr = document.getElementById('filter-col-date')?.value || today();
  const cols = getData(KEYS.collections).filter(c => c.date === todayStr);
  const deps = getData(KEYS.deposits).filter(d => d.date === todayStr);
  if (!cols.length && !deps.length) { toast('ไม่มีงานวันนี้', 'info'); return; }

  let msg = `📊 สรุปรายงานงานวันที่ ${fmtDate(todayStr)}\n━━━━━━━━━━━━━━━`;
  if (cols.length) {
    msg += `\n📍 งานรับเช็ค: ${cols.length} แห่ง`;
    cols.forEach((c, i) => { msg += `\n   ${i + 1}. ${c.location} - ${c.checkCount} ฉบับ (${fmt(c.totalAmount)} บาท)`; });
  }
  if (deps.length) {
    msg += `\n\n🏦 งานฝากธนาคาร: ${deps.length} รายการ`;
    deps.forEach((d, i) => { msg += `\n   ${i + 1}. ${d.bank}${d.branch ? ' ' + d.branch : ''} - ${d.checkCount} ฉบับ (${fmt(d.totalAmount)} บาท)`; });
  }
  const total = [...cols, ...deps].reduce((s, i) => s + (i.totalAmount || 0), 0);
  msg += `\n━━━━━━━━━━━━━━━\n💰 ยอดรวมทั้งหมด: ${fmt(total)} บาท`;
  showCopyModal(msg);
}

function generateItinerary() {
  const todayStr = today();
  const cols = getData(KEYS.collections).filter(c => c.status !== 'completed' && c.status !== 'cancelled' && c.date === todayStr);
  if (!cols.length) {
    toast('ไม่มีงานรับเช็คที่ต้องเดินทางในวันนี้ (หรืองานเสร็จหมดแล้ว)', 'info');
    return;
  }

  // 1. จัดกลุ่มและหาค่าการเรียงลำดับ (Order) ของแต่ละโซน
  const grouped = {};
  const zoneOrders = {};

  cols.forEach(c => {
    const data = getZoneData(c.location);
    if (!grouped[data.zone]) {
      grouped[data.zone] = [];
      zoneOrders[data.zone] = data.order;
    }
    grouped[data.zone].push(c);
  });

  // 2. เรียงลำดับรายชื่อโซนจากใกล้ไปไกล (อ้างอิง รง.ภท.)
  const sortedZones = Object.keys(grouped).sort((a, b) => zoneOrders[a] - zoneOrders[b]);

  let msg = `🗺️ แผนการเดินทางรับเช็ค\n📍 ต้นทาง: โรงงานเภสัชกรรมทหาร\n📅 วันที่: ${fmtDate(todayStr)}\n━━━━━━━━━━━━━━━\n`;

  sortedZones.forEach(zone => {
    msg += `\n📍 โซน: ${zone}\n`;
    grouped[zone].forEach((item, idx) => {
      msg += `   ${idx + 1}. ${item.location}\n`;
      if (item.contactName || item.contactPhone || item.notes) {
        let subMsg = '';
        if (item.contactName || item.contactPhone) {
          subMsg += `ติดต่อ: ${item.contactName || '-'}${item.contactPhone ? ' โทร: ' + item.contactPhone : ''}`;
        }
        if (item.notes) {
          subMsg += (subMsg ? ' | ' : '') + `📝 ${item.notes}`;
        }
        if (subMsg) msg += `      ${subMsg}\n`;
      }
    });
  });
  msg += `\n━━━━━━━━━━━━━━━\nจำนวนสถานที่รวม: ${cols.length} แห่ง`;
  showCopyModal(msg);
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

    const msg = `📍 รายงานตำแหน่งปัจจุบัน (Check-in)\n━━━━━━━━━━━━━━━\n📅 วันที่: ${date}\n⏰ เวลา: ${time}\n🌎 พิกัด: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n🏛️ สถานที่ใกล้เคียง:\n${address}\n\n🗺️ ลิงก์แผนที่:\n${mapUrl}\n━━━━━━━━━━━━━━━`;

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
initDefaults();
renderDashboard();
