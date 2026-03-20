const API_URL = window.location.origin;
const KEYS = { collections: 'cl_collections', deposits: 'cl_deposits', locations: 'cl_locations', banks: 'cl_banks', settings: 'cl_settings' };

// Global state cache to minimize redundant API calls
let _state = {
  collections: [],
  deposits: [],
  locations: [],
  banks: [],
  settings: {},
  todayPlan: []
};

// Map variables
let map;
let markers = [];
let todayPlanMap;
let todayPlanMarkers = [];
let todayPlanPolyline;
let todayPlanTrafficLayer; // Traffic layer instance
let settingsMap; // Settings map instance
let settingsMarker; // Settings map marker
let inlineMaps = {}; // Track inline leaflet instances
const BASE_LAT = 13.708966321126086;
const BASE_LNG = 100.58747679097112;
const BASE_NAME = 'โรงงานเภสัชกรรมทหาร';

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
// Final coordinates for ZONE_MAP
const ZONE_MAP = {
  'โรงพยาบาลพระมงกุฎเกล้า': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1, lat: 13.767815469271792, lng: 100.53436960291768, address: '315 ถ. ราชวิถี แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400', contact_name: 'กองการเงิน' },
  'สถาบันพยาธิวิทยา ศูนย์อำนวยการแพทย์พระมงกุฎเกล้า': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1, lat: 13.767815469271792, lng: 100.53436960291768, address: '315 ถ. ราชวิถี แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400' },
  'บริษัท พีเอ็มเควิทยาเวช จำกัด (ร้านยาสิรินธรโอสถ รพ.พระมงกุฎ)': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1, lat: 13.767815469271792, lng: 100.53436960291768, address: 'อาคารเฉลิมพระเกียรติสมเด็จพระนางเจ้าสิริกิติ์ ชั้น G เลขที่ 315 ถนนราชวิถี แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400' },
  'สถาบันวิจัยวิทยาศาสตร์การแพทย์ทหาร': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1, lat: 13.765, lng: 100.532, address: '315/6 ถ.ราชวิถี แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400' },
  'กองคลังแพทย์ กรมแพทย์ทหารบก': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1, lat: 13.760700100413066, lng: 100.53548694859163, address: 'เลขที่ 8 ถนนพญาไท แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400' },
  'องค์การเภสัชกรรม สำนักงานใหญ่': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1, lat: 13.759, lng: 100.528, address: '75/1 ถ.พระรามที่ 6 แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400', contact_name: 'ฝ่ายบัญชี' },
  'โรงพยาบาลทหารผ่านศึก': { zone: 'Zone 1: พญาไท / พระราม 6', order: 1, lat: 13.7721515, lng: 100.5518272, address: '123 ถ.วิภาวดีรังสิต แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร 10400' },

  'มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)': { zone: 'Zone 5: ปทุมวัน / สีลม / ดินแดง', order: 2, lat: 13.742650459886534, lng: 100.53857170712914, address: '492/1 โรงพยาบาลตำรวจ อาคารมหาภูมิพลราชานุสรณ์ 88 พรรษา ชั้น 2 ถ.พระรามที่ 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330', billing_schedule: 'กำหนดการวางบิล ทุกวันพฤหัส' },
  'บริษัท โรงพยาบาล ไอเอ็มเอช สีลม': { zone: 'Zone 5: ปทุมวัน / สีลม / ดินแดง', order: 2, lat: 13.725312330892336, lng: 100.51932468221379, address: '46/7-9 ถ.มเหสักข์ แขวงสุริยวงศ์ เขตบางรัก กรุงเทพมหานคร 10500', billing_schedule: 'กำหนดการวางบิล 25 มี.ค.69' },
  'กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย': { 
    zone: 'Zone 5: ปทุมวัน / สีลม / ดินแดง', 
    order: 2, 
    lat: 13.770748345194393, 
    lng: 100.5539554452382, 
    address: 'ศาลาว่าการกทม.2 ถ.มิตรไมตรี เขตดินแดง กรุงเทพมหานคร 10400',
    contact_name: 'ป้อม',
    contact_phone: '02-245-3088'
  },

  'โรงพยาบาลกลาง': { zone: 'Zone 4: พระนคร / ดุสิต', order: 3, lat: 13.746389, lng: 100.509444, address: '514 ถ.หลวง แขวงป้อมปราบ เขตป้อมปราบศัตรูพ่าย กรุงเทพมหานคร 10100' },
  'กรมแผนที่ทหาร': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7, lat: 13.792762681928684, lng: 100.59635918952853, address: '1770 ถนนลาดพร้าว เขตวังทองหลาง แขวงวังทองหลาง กรุงเทพฯ 10310' },
  'มูลนิธิราชประชานุเคราะห์ ในพระบรมราชูปถัมภ์': { zone: 'Zone 4: พระนคร / ดุสิต', order: 3, lat: 13.7550, lng: 100.5000, address: '1034 ถ.กรุงเกษม แขวงคลองมหานาค เขตป้อมปราบศัตรูพ่าย กรุงเทพมหานคร 10100' },
  'กองงานในพระองค์สมเด็จพระกนิษฐาธิราชเจ้ากรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี': { zone: 'Zone 4: พระนคร / ดุสิต', order: 3, lat: 13.762, lng: 100.512, address: 'พระตำหนักจิตรลดารโหฐาน ถ.ราชวิถี แขวงสวนจิตรลดา เขตดุสิต กรุงเทพมหานคร 10303' },

  'ธนาคารทีทีบี สำนักงานใหญ่พหลโยธิน': { zone: 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', order: 4, lat: 13.804, lng: 100.560, address: '3000 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพมหาคร 10900' },
  'โรงพยาบาลวิภาวดี (กรุงเทพฯ)': { zone: 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', order: 4, lat: 13.846431, lng: 100.56252, address: '51/3 ถ.งามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900' },
  'โรงเรียนช่างฝีมือทหาร สถาบันวิชาการป้องกันประเทศ': { zone: 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', order: 4, lat: 13.825, lng: 100.565, address: '3/1 ซอยพหลโยธิน 30 แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900' },
  'ทัณฑสถานโรงพยาบาลราชทัณฑ์': { zone: 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', order: 4, lat: 13.845, lng: 100.548, address: '33 ถ.งามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900' },
  'แผนกแพทย์ กองบริหาร กรมช่างอากาศ': { zone: 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', order: 4, lat: 13.805, lng: 100.525, address: '171 ถ.พหลโยธิน แขวงจันทรเกษม เขตจตุจักร กรุงเทพมหานคร 10900' },
  'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย': { zone: 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', order: 4, lat: 13.808, lng: 100.505, address: '53 ถ.จรัญสนิทวงศ์ ต.บางกรวย อ.บางกรวย จ.นนทบุรี 11130' },
  'กรมการแพทย์ กระทรวงสาธารณสุข': { zone: 'Zone 3: จตุจักร / บางซื่อ / พหลโยธิน / งามวงศ์วาน / นนทบุรี', order: 4, lat: 13.848212224077287, lng: 100.52818072831043, address: '88/23 ถ.ติวานนท์ ต.ตลาดขวัญ อ.เมือง จ.นนทบุรี 11000' },

  'โรงพยาบาลภูมิพลอดุลยเดช': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5, lat: 13.908889, lng: 100.618056, address: '171 ถ.พหลโยธิน แขวงคลองถนน เขตสายไหม กรุงเทพมหานคร 10220' },
  'กรมแพทย์ทหารอากาศ': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5, lat: 13.910432554429995, lng: 100.61869492061746, address: '171 ถ.พหลโยธิน แขวงคลองถนน เขตสายไหม กรุงเทพมหานคร 10220' },
  'สถาบันเวชศาสตร์การบิน กองทัพอากาศ': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5, lat: 13.912, lng: 100.622, address: '171 ถ.พหลโยธิน แขวงคลองถนน เขตสายไหม กรุงเทพมหานคร 10220' },
  'โรงพยาบาลทหารอากาศ (สีกัน)': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5, lat: 13.925, lng: 100.595, address: '238 ถ.พหลโยธิน แขวงสีกัน เขตดอนเมือง กรุงเทพมหานคร 10210' },
  'ศูนย์รักษาความปลอดภัย กองบัญชาการกองทัพไทย': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5, lat: 13.875, lng: 100.585, address: 'ถ.แจ้งวัฒนะ แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพมหานคร 10220' },
  'สสน.นทพ.': { zone: 'Zone 2: ดอนเมือง / สายไหม', order: 5, lat: 13.880, lng: 100.590, address: 'ถ.แจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210' },

  'โรงพยาบาลสมเด็จพระปิ่นเกล้า': { zone: 'Zone 6: ฝั่งธนบุรี', order: 6, lat: 13.709451334752874, lng: 100.48589855522276, address: '504 ถนน สมเด็จพระเจ้าตากสิน แขวงบุคคโล เขตธนบุรี กรุงเทพมหานคร 10600' },
  'กรมแพทย์ทหารเรือ': { zone: 'Zone 6: ฝั่งธนบุรี', order: 6, lat: 13.709451334752874, lng: 100.48589855522276, address: '504 ถนน สมเด็จพระเจ้าตากสิน แขวงบุคคโล เขตธนบุรี กรุงเทพมหานคร 10600' },

  'การกีฬาแห่งประเทศไทย': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7, lat: 13.755, lng: 100.622, address: '286 ถ.รามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพมหานคร 10240' },
  'บริษัท กรุงเทพดรักสโตร์ จำกัด': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7, lat: 13.7812722378695, lng: 100.61883196681411, address: '2585 2 ซอย ลาดพร้าว 87/1 แขวงคลองเจ้าคุณสิงห์ เขตวังทองหลาง กรุงเทพมหานคร 10310' },
  'โรงพยาบาลทหารเรือกรุงเทพ': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7, lat: 13.675, lng: 100.600, address: '880 ถ.สรรพาวุธ แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260' },
  'บริษัท สินแพทย์ เทพารักษ์ จำกัด': { zone: 'Zone 7: รามคำแหง / สมุทรปราการ', order: 7, lat: 13.620, lng: 100.635, address: '9/99 หมู่ 6 ถ.เทพารักษ์ ต.เทพารักษ์ อ.เมืองสมุทรปราการ จ.สมุทรปราการ 10270' }
};

function getZoneData(locationName) {
  const name = (locationName || '').trim().toLowerCase();
  for (const [key, data] of Object.entries(ZONE_MAP)) {
    const keyLower = key.toLowerCase();
    if (name.includes(keyLower) || keyLower.includes(name)) {
      return {
        ...data,
        billing_schedule: data.billing_schedule || '',
        address: data.address || '',
        contact_name: data.contact_name || '',
        contact_phone: data.contact_phone || ''
      };
    }
  }
  return { 
    zone: 'อื่นๆ / ไม่ระบุโซน', 
    order: 99, 
    billing_schedule: '', 
    address: '', 
    contact_name: '', 
    contact_phone: '',
    lat: '',
    lng: ''
  };
}

function getZone(locationName) {
  return getZoneData(locationName).zone;
}

async function initDefaults() {
  await syncData();
  initMap(); 
  const locs = getData('cl_locations');
}

function initMap() {
  if (map) return;
  const container = document.getElementById('map');
  if (!container) return;

  map = L.map('map').setView([BASE_LAT, BASE_LNG], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Add Base Marker
  L.marker([BASE_LAT, BASE_LNG], {
    icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }).addTo(map).bindPopup(`<b>${BASE_NAME} (ต้นทาง)</b>`);
  
  // Plot existing markers
  updateMapMarkers();
}

function updateMapMarkers() {
  if (!map) return;
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const cols = getData(KEYS.collections).filter(c => c.status === 'pending' || c.status === 'traveling');
  const deps = getData(KEYS.deposits).filter(d => d.status === 'pending');

  const all = [
    ...cols.map(c => ({ name: c.location, type: '📍 รับเช็ค', lat: c.lat, lng: c.lng })),
    ...deps.map(d => {
      const locInfo = getData(KEYS.locations).find(l => l.name === d.bank);
      return { 
        name: d.bank, 
        type: '🏦 ฝากเช็ค', 
        lat: d.lat || locInfo?.lat, 
        lng: d.lng || locInfo?.lng 
      };
    })
  ];

  all.forEach(item => {
    const zData = getZoneData(item.name);
    const lat = item.lat || zData.lat;
    const lng = item.lng || zData.lng;
    
    if (lat && lng) {
      const m = L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${item.type}</b><br>${item.name}`);
      markers.push(m);
    }
  });

  if (markers.length > 0) {
    const group = new L.featureGroup([...markers, L.marker([BASE_LAT, BASE_LNG])]);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// ==================== PAGE NAVIGATION ====================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-link, .bottom-nav-link').forEach(n => n.classList.remove('active'));
  
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.style.display = 'block';
  
  const navLink = document.getElementById('nav-' + page);
  if (navLink) navLink.classList.add('active');
  
  const mobileNavLink = document.getElementById('m-nav-' + page);
  if (mobileNavLink) mobileNavLink.classList.add('active');
  if (page === 'dashboard') renderDashboard();
  else if (page === 'collection') renderCollections();
  else if (page === 'deposit') renderDeposits();
  else if (page === 'settings') {
    renderSettings();
    setTimeout(initSettingsMap, 300);
  }
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

function showCopyModal(text, lat = null, lng = null) {
  document.getElementById('copy-text').value = text;
  
  const mapContainer = document.getElementById('map-preview-container');
  const mapIframe = document.getElementById('map-iframe');
  
  if (lat && lng && mapContainer && mapIframe) {
    const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&t=m&z=15&output=embed&layer=t`;
    mapIframe.src = embedUrl;
    mapContainer.style.display = 'block';
  } else if (mapContainer) {
    mapContainer.style.display = 'none';
    mapIframe.src = '';
  }
  
  document.getElementById('modal-copy').classList.add('active');
}

function toggleInlineMap(rowId, name, lat, lng) {
  const row = document.getElementById(rowId);
  if (!row) return;

  const nextRow = row.nextElementSibling;
  const isMapOpen = nextRow && nextRow.classList.contains('inline-map-row');

  // Close and clean up any existing inline maps
  Object.keys(inlineMaps).forEach(id => {
    if (inlineMaps[id]) {
      inlineMaps[id].remove();
      delete inlineMaps[id];
    }
  });
  document.querySelectorAll('.inline-map-row').forEach(r => r.remove());

  if (!isMapOpen) {
    const mapRow = document.createElement('tr');
    mapRow.className = 'inline-map-row';
    const cellCount = row.cells.length;
    const mapDivId = `map-container-${rowId}`;
    
    mapRow.innerHTML = `
      <td colspan="${cellCount}" style="padding: 0;">
        <div id="${mapDivId}" style="height: 300px; border-bottom: 2px solid var(--accent-primary); animation: slideDown 0.3s ease-out;"></div>
      </td>
    `;
    row.parentNode.insertBefore(mapRow, nextRow);

    // Initialize Leaflet for this specific row
    const iMap = L.map(mapDivId).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(iMap);

    // Destination Marker
    L.marker([lat, lng]).addTo(iMap).bindPopup(`<b>${name}</b>`).openPopup();

    // Base Marker (Small/Different color for reference)
    L.marker([BASE_LAT, BASE_LNG], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [20, 32],
        iconAnchor: [10, 32]
      })
    }).addTo(iMap).bindPopup(`<b>${BASE_NAME} (ต้นทาง)</b>`);

    inlineMaps[rowId] = iMap;
    
    // Safety for mobile/animation: recalculate size after animation ends
    setTimeout(() => { 
      if (iMap) iMap.invalidateSize(); 
    }, 400);
  }
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
  const latValue = document.getElementById('col-lat').value;
  const lngValue = document.getElementById('col-lng').value;

  const item = {
    id: editId || 'col_' + Date.now(),
    date: today(),
    location: locationName,
    lat: latValue ? parseFloat(latValue) : null,
    lng: lngValue ? parseFloat(lngValue) : null,
    checkCount: 0,
    totalAmount: 0,
    contactName: '',
    contactPhone: '',
    notes: '',
    status: 'pending'
  };

  if (editId) {
    const existing = getData('cl_collections').find(c => c.id === editId);
    if (existing) Object.assign(item, existing, { 
      location: locationName, 
      lat: item.lat, 
      lng: item.lng,
      date: today() // Bump to today on every save/edit
    });
  }

  await saveItem('collection', item);
  
  // Also save to locations database for future use
  const zoneData = getZoneData(item.location);
  await addLocationApi({ 
    name: item.location, 
    zone: zoneData.zone, 
    lat: item.lat || zoneData.lat, 
    lng: item.lng || zoneData.lng 
  });

  closeModal('collection');
  e.target.reset();
  toast(editId ? 'แก้ไขสถานที่รับเช็คสำเร็จ' : 'เพิ่มสถานที่รับเช็คสำเร็จ');
  await syncData();
}

function autoFillCoordinates() {
  const name = document.getElementById('col-location').value;
  const zData = getZoneData(name);
  if (zData.lat && zData.lng) {
    document.getElementById('col-lat').value = zData.lat;
    document.getElementById('col-lng').value = zData.lng;
  }
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
  
  if (!cols.length) { 
    tbody.innerHTML = ''; 
    empty.style.display = 'block'; 
    return; 
  }
  
  empty.style.display = 'none';

  // Group by Zone
  const groups = {};
  cols.forEach(c => {
    const zData = getZoneData(c.location);
    const zName = zData.zone;
    if (!groups[zName]) groups[zName] = { items: [], order: zData.order };
    groups[zName].items.push(c);
  });

  // Sort zones by order
  const sortedZones = Object.keys(groups).sort((a, b) => groups[a].order - groups[b].order);

  let html = '';
  sortedZones.forEach(zName => {
    // Zone Header Row
    html += `<tr class="zone-header-row"><td colspan="5" style="background: rgba(99, 102, 241, 0.1); font-weight: bold; color: var(--accent-primary); padding: 12px 15px;">📍 ${zName}</td></tr>`;
    
    // Zone Items
    groups[zName].items.forEach(c => {
      const zData = getZoneData(c.location);
      const lat = c.lat || zData.lat;
      const lng = c.lng || zData.lng;
      
      const rowId = `row-col-${c.id}`;
      html += `<tr id="${rowId}">
        <td data-label="วันที่">${fmtDate(c.date)}</td>
        <td data-label="สถานที่">
          <strong>${c.location}</strong>
          ${lat ? `<br><small style="color:var(--accent-primary)">📏 ${calculateDistance(BASE_LAT, BASE_LNG, lat, lng).toFixed(2)} กม. จากโรงงาน</small>` : ''}
        </td>
        <td data-label="โซน"><small style="color: var(--text-dim)">${zName.split(':')[0]}</small></td>
        <td data-label="สถานะ">${statusBadge(c.status)}</td>
        <td data-label="จัดการ"><div class="action-btns">
          <button class="btn btn-ghost btn-sm" onclick="editCollection('${c.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="cycleStatus('${c.id}','collection')">🔄</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteItem('${c.id}','collection')">🗑️</button>
          ${lat ? `<button class="btn btn-ghost btn-sm" onclick="toggleInlineMap('${rowId}', '${c.location.replace(/'/g, "\\'")}', ${lat}, ${lng})">🗺️</button>` : ''}
        </div></td></tr>`;
    });
  });

  tbody.innerHTML = html;
}

function editCollection(id) {
  const c = getData(KEYS.collections).find(x => x.id === id);
  if (!c) return;
  document.getElementById('col-edit-id').value = c.id;
  document.getElementById('col-location').value = c.location;
  document.getElementById('col-lat').value = c.lat || '';
  document.getElementById('col-lng').value = c.lng || '';
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
    if (existing) Object.assign(item, existing, { 
      bank: item.bank,
      date: today() // Bump to today on every save/edit
    });
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
    <td data-label="วันที่">${fmtDate(d.date)}</td>
    <td data-label="ธนาคาร"><strong>${d.bank}</strong></td>
    <td data-label="สาขา">${d.branch || '-'}</td>
    <td data-label="สถานะ">${statusBadge(d.status)}</td>
    <td data-label="จัดการ"><div class="action-btns">
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
  
  // Set date to today when traveling or completed
  if (item.status === 'completed' || item.status === 'traveling') {
    item.date = today();
  }

  await saveItem(type, item);
  toast(`สถานะเปลี่ยนเป็น: ${STATUS_MAP[item.status].label}`);
  await syncData();

  if (item.status === 'completed' || item.status === 'traveling') {
    if (type === 'collection') sendCollectionNotify(item, true);
    else sendDepositNotify(item, true);
  }
}

async function movePendingToToday() {
  if (!confirm('ต้องการเปลี่ยนวันที่ของงานที่ค้างอยู่ทั้งหมดให้เป็นวันนี้?')) return;
  const t = today();
  const cols = getData(KEYS.collections).filter(c => (c.status === 'pending' || c.status === 'traveling') && c.date !== t);
  const deps = getData(KEYS.deposits).filter(d => d.status === 'pending' && d.date !== t);
  
  if (cols.length === 0 && deps.length === 0) return;

  toast('กำลังย้ายงานค้าง...', 'info');
  
  for (const c of cols) {
    c.date = t;
    await saveItem('collection', c);
  }
  for (const d of deps) {
    d.date = t;
    await saveItem('deposit', d);
  }
  
  toast('ย้ายงานค้างมาเป็นวันนี้แล้ว');
  await syncData();
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

  const todayVal = today();
  const pendingOld = [
    ...cols.filter(c => (c.status === 'pending' || c.status === 'traveling') && c.date !== todayVal),
    ...deps.filter(d => d.status === 'pending' && d.date !== todayVal)
  ];
  const moveBtn = document.getElementById('move-pending-btn');
  if (moveBtn) moveBtn.style.display = pendingOld.length > 0 ? 'block' : 'none';

  renderTodayPlan(true);

  document.getElementById('stat-pending-col').textContent = cols.filter(c => c.status === 'pending' || c.status === 'traveling').length;
  document.getElementById('stat-pending-dep').textContent = deps.filter(d => d.status === 'pending').length;

  const completedThisMonth = [...cols, ...deps].filter(i => i.status === 'completed' && i.date && i.date.startsWith(thisMonth));
  document.getElementById('stat-completed').textContent = completedThisMonth.length;

  const totalThisMonth = [...cols, ...deps].filter(i => i.date && i.date.startsWith(thisMonth)).reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalEl = document.getElementById('stat-total-amount');
  if (totalEl) totalEl.textContent = fmt(totalThisMonth);

  // Show all tasks for today (or all items if preferred)
  const all = [...cols.map(c => ({ ...c, _type: '📍 รับเช็ค', _name: c.location })), ...deps.map(d => ({ ...d, _type: '🏦 นำฝากเช็ค', _name: d.bank }))];
  all.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  const recent = all; // Show everything instead of slice(0, 8)

  const tbody = document.getElementById('recent-table');
  const empty = document.getElementById('recent-empty');
  if (!tbody) return;
  if (!recent.length) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = recent.map((r, index) => {
    const zData = getZoneData(r._name);
    const lat = r.lat || zData.lat;
    const lng = r.lng || zData.lng;
    const distanceHtml = lat ? `<br><small style="color:var(--accent-primary)">📏 ${calculateDistance(BASE_LAT, BASE_LNG, lat, lng).toFixed(2)} กม.</small>` : '';
    const rowId = `row-dash-${r.id || 'idx'+index}`;
    const mapBtn = lat ? `<button class="btn btn-ghost btn-sm" onclick="toggleInlineMap('${rowId}', '${r._name.replace(/'/g, "\\'")}', ${lat}, ${lng})" style="padding:2px 5px; margin-left:5px">🗺️</button>` : '';

    return `<tr id="${rowId}">
      <td data-label="วันที่">${fmtDate(r.date)}</td>
      <td data-label="งาน">
        <strong>${r._name}</strong>${distanceHtml}
      </td>
      <td data-label="สถานะ">
        <div style="display:flex; align-items:center; justify-content:space-between">
          ${statusBadge(r.status)}
          ${mapBtn}
        </div>
      </td></tr>`;
  }).join('');

  // Smart Planning on Dashboard
  const allPending = [
    ...cols.filter(c => c.status === 'pending').map(c => ({ ...c, name: c.location, type: 'collection', order: getZoneData(c.location).order })),
    ...deps.filter(d => d.status === 'pending').map(d => ({ ...d, name: d.bank, type: 'deposit', order: 90 }))
  ];

  const proximityContainer = document.getElementById('dashboard-proximity-container');
  const proximityContent = document.getElementById('dashboard-proximity-content');

  if (proximityContainer && proximityContent) {
    if (allPending.length > 0) {
      proximityContent.innerHTML = generateProximityHtml(allPending, true);
      proximityContainer.style.display = 'block';
    } else {
      proximityContainer.style.display = 'none';
    }
  }
  updateMapMarkers(); // Update map markers after rendering dashboard
}

// ==================== SETTINGS ====================
function renderSettings() {
  const settings = getSettings();
  if (settings.gasUrl) document.getElementById('setting-gas-url').value = settings.gasUrl;
  renderLocationTags();
  
  // Clear map marker
  if (settingsMarker) {
    settingsMap.removeLayer(settingsMarker);
    settingsMarker = null;
  }
}

function initSettingsMap() {
  if (settingsMap) return;
  
  settingsMap = L.map('settings-map').setView([BASE_LAT, BASE_LNG], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(settingsMap);

  settingsMap.on('click', (e) => {
    const { lat, lng } = e.latlng;
    document.getElementById('new-location-lat').value = lat.toFixed(7);
    document.getElementById('new-location-lng').value = lng.toFixed(7);
    updateSettingsMarker(lat, lng);
  });
  
  // Initial sync if fields have data
  updateSettingsMapFromInputs();
}

function updateSettingsMarker(lat, lng) {
  if (!settingsMap) return;
  if (settingsMarker) settingsMap.removeLayer(settingsMarker);
  
  settingsMarker = L.marker([lat, lng], { draggable: true }).addTo(settingsMap);
  settingsMap.panTo([lat, lng]);

  settingsMarker.on('dragend', function (event) {
      const position = settingsMarker.getLatLng();
      document.getElementById('new-location-lat').value = position.lat.toFixed(7);
      document.getElementById('new-location-lng').value = position.lng.toFixed(7);
  });
}

function updateSettingsMapFromInputs() {
  const lat = parseFloat(document.getElementById('new-location-lat').value);
  const lng = parseFloat(document.getElementById('new-location-lng').value);
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    updateSettingsMarker(lat, lng);
  }
  renderBankTags();
  updateLocationDatalistSettings();
}

function updateLocationDatalistSettings() {
  const dl = document.getElementById('location-datalist');
  if (!dl) return;
  const knownLocations = Object.keys(ZONE_MAP);
  dl.innerHTML = knownLocations.map(name => `<option value="${name}">`).join('');
}

function autoFillLocationSettings() {
  const nameInput = document.getElementById('new-location');
  const name = nameInput.value.trim();
  const btn = document.getElementById('btn-save-location');
  
  if (!name) {
    clearLocationFields();
    return;
  }

  const locs = getData(KEYS.locations);
  const existing = locs.find(l => l.name.trim().toLowerCase() === name.toLowerCase());
  const zData = getZoneData(name);
  
  // Clear fields first (reset state)
  document.getElementById('new-location-billing').value = '';
  document.getElementById('new-location-address').value = '';
  document.getElementById('new-location-contact').value = '';
  document.getElementById('new-location-phone').value = '';
  document.getElementById('new-location-lat').value = '';
  document.getElementById('new-location-lng').value = '';
  btn.textContent = '+ เพิ่ม';

  if (existing) {
    btn.textContent = 'บันทึกการแก้ไข';
    // Prioritize existing but fallback to ZData defaults if existing has empty/null
    const getVal = (field) => existing[field] && existing[field].toString().trim() !== '' ? existing[field] : (zData[field] || '');
    
    document.getElementById('new-location-billing').value = getVal('billing_schedule');
    document.getElementById('new-location-address').value = getVal('address');
    document.getElementById('new-location-contact').value = getVal('contact_name');
    document.getElementById('new-location-phone').value = getVal('contact_phone');
    document.getElementById('new-location-lat').value = existing.lat || zData.lat || '';
    document.getElementById('new-location-lng').value = existing.lng || zData.lng || '';
  } else if (zData.lat && zData.lng) {
    // Recognize from Zone map defaults
    document.getElementById('new-location-lat').value = zData.lat || '';
    document.getElementById('new-location-lng').value = zData.lng || '';
    document.getElementById('new-location-address').value = zData.address || '';
    document.getElementById('new-location-billing').value = zData.billing_schedule || '';
    document.getElementById('new-location-contact').value = zData.contact_name || '';
    document.getElementById('new-location-phone').value = zData.contact_phone || '';
  }
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
  const type = document.getElementById('new-location-type').value;
  const billing = document.getElementById('new-location-billing').value.trim();
  const address = document.getElementById('new-location-address').value.trim();
  const contact = document.getElementById('new-location-contact').value.trim();
  const phone = document.getElementById('new-location-phone').value.trim();
  const latValue = document.getElementById('new-location-lat').value;
  const lngValue = document.getElementById('new-location-lng').value;
  
  if (!name) return;
  
  const zoneData = getZoneData(name);
  await addLocationApi({ 
    name, 
    zone: zoneData.zone,
    billing_schedule: billing,
    address: address,
    contact_name: contact,
    contact_phone: phone,
    lat: latValue ? parseFloat(latValue) : zoneData.lat,
    lng: lngValue ? parseFloat(lngValue) : zoneData.lng
  });
  
  clearLocationFields();
  await syncData();
  toast('บันทึกข้อมูลสถานที่สำเร็จ');
}

function clearLocationFields() {
  document.getElementById('new-location').value = '';
  document.getElementById('new-location-billing').value = '';
  document.getElementById('new-location-address').value = '';
  document.getElementById('new-location-contact').value = '';
  document.getElementById('new-location-phone').value = '';
  document.getElementById('new-location-lat').value = '';
  document.getElementById('new-location-lng').value = '';
  document.getElementById('btn-save-location').textContent = '+ เพิ่ม';
}

function editLocationSetting(name) {
  const loc = getData('cl_locations').find(l => l.name === name);
  if (!loc) return;

  document.getElementById('new-location').value = loc.name;
  document.getElementById('new-location-billing').value = loc.billing_schedule || '';
  document.getElementById('new-location-address').value = loc.address || '';
  document.getElementById('new-location-contact').value = loc.contact_name || '';
  document.getElementById('new-location-phone').value = loc.contact_phone || '';
  document.getElementById('new-location-lat').value = loc.lat || '';
  document.getElementById('new-location-lng').value = loc.lng || '';
  
  document.getElementById('btn-save-location').textContent = '💾 บันทึกการแก้ไข';
  document.getElementById('new-location').scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Update Settings Map
  updateSettingsMapFromInputs();
}

function autoFillLocationSettings() {
  const name = document.getElementById('new-location').value.trim();
  if (!name) return;

  // Check if it's in ZONE_MAP
  const zData = getZoneData(name);
  if (zData && zData.lat) {
    if (zData.lat) document.getElementById('new-location-lat').value = zData.lat;
    if (zData.lng) document.getElementById('new-location-lng').value = zData.lng;
    if (zData.billing_schedule) document.getElementById('new-location-billing').value = zData.billing_schedule;
    if (zData.address) document.getElementById('new-location-address').value = zData.address;
    if (zData.contact_name) document.getElementById('new-location-contact').value = zData.contact_name;
    if (zData.contact_phone) document.getElementById('new-location-phone').value = zData.contact_phone;
    
    // Update Settings Map
    updateSettingsMapFromInputs();
  }
}

async function removeLocation(name) {
  if (!confirm(`ต้องการลบสถานที่ "${name}"?`)) return;
  await removeLocationApi(name);
  await syncData();
}

function renderLocationTags() {
  const c = document.getElementById('locations-tags');
  const locs = getData('cl_locations');
  c.innerHTML = locs.map(l => `<span class="tag" style="cursor:pointer" onclick="editLocationSetting('${l.name}')">📌 ${l.name} <span class="tag-remove" onclick="event.stopPropagation(); removeLocation('${l.name}')">✕</span></span>`).join('');
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
      const locInfo = getData(KEYS.locations).find(l => l.name === t.location);
      const billing = locInfo && locInfo.billing_schedule ? ` - ${locInfo.billing_schedule}` : '';
      msg += `\n${idx + 1}. ${t.location}${billing}`;
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

  let msg = `📅 วันที่: ${fmtDate(today())}\n🗺️ แผนกำหนดการ มีดังนี้\n📍 ต้นทาง: โรงงานเภสัชกรรมทหาร\n━━━━━━━━━━━━━━━`;

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
      const locInfo = getData(KEYS.locations).find(l => l.name === (t.location || t._label));
      const billing = locInfo && locInfo.billing_schedule ? ` - ${locInfo.billing_schedule}` : '';
      msg += `\n${idx + 1}. ${t._label}${billing}`;
    });
  });

  msg += `\n━━━━━━━━━━━━━━━\nจำนวนสถานที่รวม: ${selectedTasks.length} แห่ง`;

  closeModal('itinerary-selector');
  showCopyModal(msg);
  
  // Render Map Path
  _state.todayPlan = selectedTasks;
  renderTodayPlan(true); 
  
  localStorage.setItem('cl_today_plan', JSON.stringify(selectedTasks));
}

async function getRoadRoute(points) {
  if (points.length < 2) return null;
  const coordsStr = points.map(p => `${p[1]},${p[0]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return data.routes[0];
    }
  } catch (e) {
    // console.log('OSRM Route Error:', e);
  }
  return null;
}

async function renderTodayPlan(useRoad = false) {
  const container = document.getElementById('today-plan-container');
  const content = document.getElementById('today-plan-content');
  const totalDistEl = document.getElementById('today-total-distance');
  
  if (!container || !content) return;

  // Try to load from localStorage if state is empty (e.g. on refresh)
  if (_state.todayPlan.length === 0) {
    const saved = localStorage.getItem('cl_today_plan');
    if (saved) {
      try {
        _state.todayPlan = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved today plan');
      }
    }
  }

  if (_state.todayPlan.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  
  // 1. Prepare points
  const points = [[BASE_LAT, BASE_LNG]];
  _state.todayPlan.forEach(task => {
    if (!task) return;
    const name = task._label || task.name || task.location;
    const masterLoc = _state.locations.find(l => l.name === name);
    const fallbackData = getZoneData(name);
    
    // Resolution Priority: DB Master -> Hardcoded ZONE_MAP -> Task State
    const lat = (masterLoc && masterLoc.lat) || fallbackData.lat || task.lat;
    const lng = (masterLoc && masterLoc.lng) || fallbackData.lng || task.lng;
    
    if (lat && lng) {
      points.push([parseFloat(lat), parseFloat(lng)]);
    } else {
      console.warn(`No coordinates found for: ${name}`);
    }
  });
  points.push([BASE_LAT, BASE_LNG]); // Back to base

  // 2. Fetch Road Route if requested
  let roadDistances = [];
  let roadGeometry = null;
  let totalDist = 0;
  let usingRoad = false;

  if (useRoad) {
    const route = await getRoadRoute(points);
    if (route) {
      roadDistances = route.legs.map(leg => leg.distance / 1000); // meters to KM
      roadGeometry = route.geometry;
      totalDist = route.distance / 1000;
      usingRoad = true;
    }
  }

  // Fallback to Haversine if no road route
  if (!usingRoad) {
    for (let i = 0; i < points.length - 1; i++) {
      const d = calculateDistance(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
      roadDistances.push(d);
      totalDist += d;
    }
  }

  // 3. Render HTML
  let html = `<div style="display:flex; flex-direction:column; gap:5px">`;
  
  // Start
  html += `
    <div class="itinerary-stop">
      <div class="itinerary-dot itinerary-dot-start">S</div>
      <div style="flex:1; font-weight:600">${BASE_NAME} (เริ่มต้น)</div>
    </div>
    <div class="itinerary-step">
      🚗 ${roadDistances[0].toFixed(2)} กม. ${usingRoad ? '🛣️' : '📏'}
    </div>
  `;

  // Stops
  for (let i = 0; i < _state.todayPlan.length; i++) {
    const task = _state.todayPlan[i];
    if (!task) continue; // Safety check
    
    html += `
      <div class="itinerary-stop">
        <div class="itinerary-dot itinerary-dot-stop">${i+1}</div>
        <div style="flex:1">
          <div style="font-weight:600">${task._label || 'ไม่มีชื่อสถานที่'}</div>
          <div style="font-size:0.75rem; color:var(--text-dim)">${task._zone || ''}</div>
        </div>
        <div style="display:flex; gap:5px">
          <button class="btn btn-ghost btn-sm" onclick="openInGoogleMaps(${i})" title="นำทางด้วย Google Maps" style="padding:0; width:32px; height:32px; border-radius:8px; min-width:auto; border:1px solid var(--glass-border); color:var(--info)">📍</button>
          <button class="btn btn-ghost btn-sm" onclick="removeFromTodayPlan(${i})" title="ลบออกจากแผน" style="padding:0; width:32px; height:32px; border-radius:8px; min-width:auto; border:1px solid var(--glass-border); color:var(--danger)">✕</button>
        </div>
      </div>
    `;

    // Step to next OR to End
    const dist = roadDistances[i+1] || 0;
    html += `
      <div class="itinerary-step">
        🚗 ${dist.toFixed(2)} กม. ${usingRoad ? '🛣️' : '📏'}
      </div>
    `;
  }

  // End
  html += `
    <div class="itinerary-stop">
      <div class="itinerary-dot itinerary-dot-end">E</div>
      <div style="flex:1; font-weight:600">${BASE_NAME} (กลับโรงงาน)</div>
    </div>
  `;

  html += `</div>`;
  content.innerHTML = html;
  if (totalDistEl) totalDistEl.textContent = totalDist.toFixed(2) + ' กม.';
  
  // Render Map Path
  renderTodayPlanMap(roadGeometry, points);
}

function renderTodayPlanMap(roadGeometry = null, points = []) {
  const container = document.getElementById('today-plan-map');
  if (!container || _state.todayPlan.length === 0) {
    if (container) container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  if (!todayPlanMap) {
    todayPlanMap = L.map('today-plan-map').setView([BASE_LAT, BASE_LNG], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(todayPlanMap);
  }

  // Preserve traffic layer across renders if enabled
  if (document.getElementById('traffic-toggle').checked) {
    if (!todayPlanTrafficLayer) {
      todayPlanTrafficLayer = L.tileLayer('https://mt1.google.com/vt?lyrs=h@159000000,traffic|seconds_into_week:-1&style=15&x={x}&y={y}&z={z}', {
        maxZoom: 20, opacity: 0.7, attribution: '© Google Traffic'
      });
    }
    todayPlanTrafficLayer.addTo(todayPlanMap);
  }

  // Clear existing
  todayPlanMarkers.forEach(m => todayPlanMap.removeLayer(m));
  todayPlanMarkers = [];
  if (todayPlanPolyline) todayPlanMap.removeLayer(todayPlanPolyline);

  // Add markers
  points.forEach((p, idx) => {
    let title = '';
    let markerIcon = null;
    if (idx === 0) {
      title = `<b>${BASE_NAME} (เริ่มต้น)</b>`;
      markerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 41], iconAnchor: [12, 41]
      });
    } else if (idx === points.length - 1) {
      // Don't add a redundant marker at the end point if it's the same as the start
      return; 
    } else {
      const task = _state.todayPlan[idx-1];
      title = `<b>${idx}. ${task._label}</b>`;
    }

    if (p[0] && p[1]) {
      const m = L.marker([p[0], p[1]], markerIcon ? { icon: markerIcon } : {}).addTo(todayPlanMap).bindPopup(title);
      todayPlanMarkers.push(m);
    }
  });

  // Draw path
  if (roadGeometry) {
    const latLngs = roadGeometry.coordinates.map(c => [c[1], c[0]]);
    todayPlanPolyline = L.polyline(latLngs, {
      color: '#6366f1',
      weight: 4,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(todayPlanMap);
  } else {
    // Straight lines fallback
    todayPlanPolyline = L.polyline(points.filter(p => p[0] && p[1]), {
      color: '#6366f1',
      weight: 4,
      opacity: 0.6,
      dashArray: '10, 10',
      lineJoin: 'round'
    }).addTo(todayPlanMap);
  }

  const group = new L.featureGroup(todayPlanMarkers);
  if (todayPlanMarkers.length > 0) {
    try {
      todayPlanMap.fitBounds(group.getBounds().pad(0.2));
    } catch (e) { console.error('Map bounds error:', e); }
  }
  // Mobile safety: ensure size is recalculated after animation/rendering
  setTimeout(() => { 
    if (todayPlanMap) {
      todayPlanMap.invalidateSize(); 
      if (group.getLayers().length > 0) todayPlanMap.fitBounds(group.getBounds().pad(0.2));
    }
  }, 500);
}

function toggleTrafficLayer() {
  const isChecked = document.getElementById('traffic-toggle').checked;
  if (!todayPlanMap) return;

  if (isChecked) {
    if (!todayPlanTrafficLayer) {
      todayPlanTrafficLayer = L.tileLayer('https://mt1.google.com/vt?lyrs=h@159000000,traffic|seconds_into_week:-1&style=15&x={x}&y={y}&z={z}', {
        maxZoom: 20, opacity: 0.7, attribution: '© Google Traffic'
      });
    }
    todayPlanTrafficLayer.addTo(todayPlanMap);
  } else {
    if (todayPlanTrafficLayer) todayPlanMap.removeLayer(todayPlanTrafficLayer);
  }
}

// Remove the old/duplicate optimizeTodayPlan that was here (lines 1436-1475)


function removeFromTodayPlan(index) {
  if (index < 0 || index >= _state.todayPlan.length) return;
  
  const removedItem = _state.todayPlan[index];
  _state.todayPlan.splice(index, 1);
  localStorage.setItem('cl_today_plan', JSON.stringify(_state.todayPlan));
  
  toast(`นำ "${removedItem._label}" ออกจากแผนแล้ว`, 'info');
  renderTodayPlan(true);
}

// optimizeTodayPlan function removed as per user request to use stable fallback distances without intrusive alerts.


function openInGoogleMaps(index) {
  if (index < 0 || index >= _state.todayPlan.length) return;
  const task = _state.todayPlan[index];
  const masterLoc = _state.locations.find(l => l.name === (task._label || task.name));
  const locData = masterLoc || getZoneData(task.name || task.location || task._label);
  const lat = locData.lat || task.lat;
  const lng = locData.lng || task.lng;
  
  if (lat && lng) {
    // Open single destination from current location
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving&layer=t`;
    window.open(url, '_blank');
  } else {
    toast('ไม่พบพิกัดสำหรับสถานที่นี้', 'warning');
  }
}

function openEntireRouteInGoogleMaps() {
  if (_state.todayPlan.length === 0) return;
  
  // Construct URL: /Start/Stop1/Stop2/.../Start
  let path = `${BASE_LAT},${BASE_LNG}`;
  
  _state.todayPlan.forEach(task => {
    const masterLoc = _state.locations.find(l => l.name === (task._label || task.name));
    const locData = masterLoc || getZoneData(task.name || task.location || task._label);
    const lat = locData.lat || task.lat;
    const lng = locData.lng || task.lng;
    if (lat && lng) path += `/${lat},${lng}`;
  });
  
  path += `/${BASE_LAT},${BASE_LNG}`;
  
  const url = `https://www.google.com/maps/dir/${path}/data=!3m1!4b1!4m2!4m1!3e0&layer=t`;
  window.open(url, '_blank');
}

async function getBatteryStatus() {
  try {
    if (!navigator.getBattery) return null;
    const battery = await navigator.getBattery();
    const level = Math.round(battery.level * 100);
    const charging = battery.charging ? ' (กำลังชาร์จ ⚡)' : '';
    return `${level}%${charging}`;
  } catch (e) {
    return null;
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

function generateProximityHtml(tasks, forDashboard = false) {
  if (!tasks || tasks.length === 0) return '';

  // Sort by Zone Order (Zone 1 is closest to base)
  const sorted = [...tasks].sort((a, b) => {
    const za = a.type === 'collection' || a._type === 'collection' ? getZoneData(a.name || a.location) : { order: 90 };
    const zb = b.type === 'collection' || b._type === 'collection' ? getZoneData(b.name || b.location) : { order: 90 };
    return za.order - (zb.order || 99);
  });

  const top3 = sorted.slice(0, 3);

  const descText = forDashboard 
    ? "ระบบช่วยแนะนำงานที่อยู่ใกล้โรงงานที่สุด เพื่อให้ท่านตัดสินใจเริ่มงานได้รวดเร็ว:" 
    : "ระบบประมวลผลงานที่อยู่ใกล้โรงงานที่สุด 3 อันดับแรก เพื่อช่วยท่านวางแผนการเดินทาง:";

  let html = `
    <div style="margin-bottom: 24px; font-size: 1.2rem; color: var(--text-dim); font-weight: 500; line-height: 1.5;">
      ${descText}
    </div>
    <div style="display: flex; flex-direction: column; gap: 16px;">
  `;

  top3.forEach((t, idx) => {
    const locName = t.name || t.location;
    const isCol = t.type === 'collection' || t._type === 'collection';
    const zoneName = isCol ? getZone(locName) : '🏦 งานนำฝากเช็ค';
    html += `
      <div class="card" style="padding: 16px 12px; border-left: 6px solid var(--primary); background: linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); animation: none; transform: none; box-shadow: 0 8px 16px rgba(0,0,0,0.2); margin-bottom: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-direction: column;">
          <div style="font-weight: 700; color: var(--text-main); font-size: 1.4rem; line-height: 1.25;">${idx + 1}. ${locName}</div>
          <div style="font-size: 0.9rem; background: var(--primary-gradient); color: white; padding: 3px 12px; border-radius: 100px; font-weight: 700; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2); white-space: nowrap; align-self: flex-start;">แนะนำ</div>
        </div>
        <div style="font-size: 1.05rem; color: var(--text-muted); margin-top: 8px; font-weight: 500; display: flex; align-items: center; gap: 6px;">📍 <span>${zoneName}</span></div>
      </div>
    `;
  });

  html += `</div>`;

  if (tasks.length > 3) {
    const extraCount = tasks.length - 3;
    html += `<div style="margin-top: 15px; text-align: center; font-size: 0.8rem; color: var(--text-dim);">และยังมีงานอื่นๆ อีก ${extraCount} รายการในแผน</div>`;
  }

  return html;
}

function showClosestPlanning(tasks) {
  const container = document.getElementById('proximity-content');
  if (!container) return;
  container.innerHTML = generateProximityHtml(tasks, false);
  document.getElementById('modal-proximity').classList.add('active');
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

    const battery = await getBatteryStatus();
    const trafficStatus = getTrafficEstimation(lat, lng, address);
    const trafficUrl = `https://www.google.com/maps/@${lat},${lng},15z/data=!5m1!1e1`;

    // 🏆 Smart Destination Tracking
    const pendingCols = getData(KEYS.collections).filter(t => t.status === 'pending');
    const pendingDeps = getData(KEYS.deposits).filter(t => t.status === 'pending');
    
    const allPending = [
      ...pendingCols.map(t => ({ id: t.id, name: t.location, type: 'collection', order: getZoneData(t.location).order })),
      ...pendingDeps.map(t => ({ id: t.id, name: `🏦 ${t.bank}${t.branch ? ' ('+t.branch+')' : ''}`, type: 'deposit', order: 90 }))
    ];
    allPending.sort((a, b) => a.order - b.order);

    // 📐 Distance from Base (โรงงานเภสัชกรรมทหาร - Phra Khanong/Khlong Toei area based on check-in)
    const baseLat = 13.708991, baseLng = 100.587533;
    const distFromBase = calculateDistance(lat, lng, baseLat, baseLng);

    let atDestination = '';
    if (distFromBase < 0.05) {
      atDestination = 'โรงงานเภสัชกรรมทหาร (จุดเริ่มต้น)';
    } else {
      for (const task of allPending) {
        if (address.includes(task.name) || task.name.includes(address.split(',')[0].trim())) {
          atDestination = task.name;
          break;
        }
      }
    }

    // Identify next destination (excluding the one we are at) - USED FOR PLANNING POPUP
    const upcoming = allPending.filter(t => t.name !== atDestination);

    let msg = `📍 รายงานตำแหน่งปัจจุบัน (Check-in)\n━━━━━━━━━━━━━━━\n📅 วันที่: ${date}\n⏰ เวลา: ${time}\n`;
    
    if (atDestination) {
      msg += `🏢 สถานะ: **ถึงที่หมายแล้ว (${atDestination})**\n`;
    } else {
      msg += `🚗 สถานะ: **กำลังอยู่ระหว่างเดินทาง / ปฏิบัติงาน**\n`;
    }

    msg += `🌎 พิกัด: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
    msg += `🏛️ สถานที่ใกล้เคียง:\n${address}\n`;
    msg += `📏 ห่างจากจุดเริ่มต้น: ${distFromBase.toFixed(2)} กม.\n`;
    if (battery) msg += `🔋 แบตเตอรี่คงเหลือ: ${battery}\n`;
    
    msg += `\n🚦 สภาพการจราจร:\n${trafficStatus}\n`;
    msg += `\n🔗 ดูสภาพจราจรสด (Live):\n${trafficUrl}\n\n🗺️ ลิงก์แผนที่:\n${mapUrl}\n━━━━━━━━━━━━━━━`;

    showCopyModal(msg, lat, lng);
    toast('ระบุตำแหน่งและสถานที่สำเร็จ');

    // 🎯 If at Base, show the proximity planner automatically
    if (atDestination.includes('โรงงานเภสัชกรรมทหาร') && upcoming.length > 0) {
      setTimeout(() => {
        showClosestPlanning(upcoming);
      }, 1000);
    }
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
