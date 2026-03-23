import pandas as pd
import json
import math

BASE_LAT = 13.708966321126086
BASE_LNG = 100.58747679097112

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi, delta_lambda = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

target_hospitals = [
    "รพ.ทหารเรือกรุงเทพ",
    "มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)",
    "บริษัท โรงพยาบาล ไอเอ็มเอช สีลม",
    "กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย",
    "รพ.ทหารผ่านศึก",
    "กรมแพทย์ทหารบก",
    "รพ.พระมงกุฎเกล้า",
    "บริษัท กรุงเทพดรักสโตร์ จำกัด",
    "รพ.รามาธิบดี",
    "กรมแผนที่ทหาร",
    "กรมแพทย์ทหารเรือ",
    "ทัณฑสถานโรงพยาบาลราชทัณฑ์",
    "กรมแพทย์ทหารอากาศ",
    "รพ.ภูมิพลอดุลยเดช",
    "โรงพยาบาลทศมินทราธิราช กรมแพทย์ทหารอากาศ"
]

coords = {
    "รพ.ทหารเรือกรุงเทพ": {"lat": 13.6738, "lng": 100.5966},
    "มูลนิธิโรงพยาบาลตำรวจในพระบรมราชินูปถัมภ์ (โครงการร้านยา)": {"lat": 13.742650, "lng": 100.538571},
    "บริษัท โรงพยาบาล ไอเอ็มเอช สีลม": {"lat": 13.725312, "lng": 100.519324},
    "กลุ่มงานเวชภัณฑ์ กองเภสัชกรรม สำนักอนามัย": {"lat": 13.7275, "lng": 100.5186},
    "รพ.ทหารผ่านศึก": {"lat": 13.772151, "lng": 100.551827},
    "กรมแพทย์ทหารบก": {"lat": 13.760700, "lng": 100.535486},
    "รพ.พระมงกุฎเกล้า": {"lat": 13.767815, "lng": 100.534369},
    "บริษัท กรุงเทพดรักสโตร์ จำกัด": {"lat": 13.781272, "lng": 100.618831},
    "รพ.รามาธิบดี": {"lat": 13.7667, "lng": 100.5273},
    "กรมแผนที่ทหาร": {"lat": 13.792762, "lng": 100.596359},
    "กรมแพทย์ทหารเรือ": {"lat": 13.709451, "lng": 100.485898},
    "ทัณฑสถานโรงพยาบาลราชทัณฑ์": {"lat": 13.8450, "lng": 100.5480},
    "กรมแพทย์ทหารอากาศ": {"lat": 13.910432, "lng": 100.618694},
    "รพ.ภูมิพลอดุลยเดช": {"lat": 13.9105, "lng": 100.6185},
    "โรงพยาบาลทศมินทราธิราช กรมแพทย์ทหารอากาศ": {"lat": 13.9110, "lng": 100.6200}
}

paid_invoices = [
    "IV69/00264", "IV69/00265", "IV69/00266", "IV69/00321", "IV69/00322",
    "IV69/00580", "IV69/00581", "IV69/00767", "IV69/01064", "IV69/00353",
    "IV69/00901"
] 

try:
    df = pd.read_excel(r'c:\Users\FINANCE-DPF-NEW-1\CheckLine\5.ลูกหนี้การค้า เดือน ก.พ.69.xls', header=3)
    df.columns = df.columns.astype(str).str.strip()
    
    รายการ_col = df.columns[2]
    date_col = df.columns[5]
    iv_col = df.columns[6]
    amount_col = df.columns[12]
    aging_col = df.columns[14]

    df = df.dropna(subset=[รายการ_col])
    df = df[df[รายการ_col].str.strip().isin(target_hospitals)]
    
    df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
    
    target_buckets = ['ไม่เกิน90วัน', 'ไม่เกิน180วัน', 'เกิน180วัน']
    df = df[df[aging_col].isin(target_buckets)]
    df = df[df[amount_col] > 0]
    
    results = {}
    for idx, row in df.iterrows():
        iv_raw = str(row[iv_col])
        iv = iv_raw.strip() # Strip whitespaces
        
        if iv in paid_invoices:
            continue
            
        hosp = str(row[รายการ_col]).strip()
        
        if iv == 'nan' or not iv:
            iv = "ไม่ระบุเลขที่"
            
        date_val = row[date_col]
        if pd.notna(date_val):
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%d/%m/%Y')
            else:
                date_str = str(date_val).split(' ')[0]
        else:
            date_str = "-"
            
        amt = row[amount_col]
        bucket = str(row[aging_col])
        if bucket == 'เกิน180วัน':
            bucket = '181-270วัน'
            
        if hosp not in results:
            coord = coords.get(hosp)
            dist = haversine(BASE_LAT, BASE_LNG, coord['lat'], coord['lng']) if coord else 0
            results[hosp] = {'dist': dist, 'total': 0, 'invoices': [], 'b90':0, 'b180':0, 'b270':0}
            
        results[hosp]['invoices'].append({
            'iv': iv_raw, # preserve original but print stripped? No let's print stripped
            'iv_clean': iv,
            'date': date_str,
            'amount': amt,
            'bucket': bucket
        })
        results[hosp]['total'] += amt
        if bucket == 'ไม่เกิน90วัน': results[hosp]['b90']+=amt
        elif bucket == 'ไม่เกิน180วัน': results[hosp]['b180']+=amt
        elif bucket == '181-270วัน': results[hosp]['b270']+=amt
        
    sorted_hosps = sorted(results.items(), key=lambda x: x[1]['dist'])
    
    with open(r'C:\Users\FINANCE-DPF-NEW-1\.gemini\antigravity\brain\b2e93a41-4e2f-4f9b-940d-f23f14f05b9d\bkk_invoices.md', 'w', encoding='utf-8') as f:
        f.write("# รายละเอียดลูกหนี้การค้าแยกตามใบส่งของ (IV)\n\n")
        f.write(f"จำนวนทั้งหมด: {len(sorted_hosps)} สถานพยาบาล (จำกัดเฉพาะใน กทม. และหนี้ค้างไม่เกิน 270 วัน)\n")
        f.write(f"*อัปเดตล่าสุด: หักรายการรับเช็คแล้ว*\n")
        f.write(f"สถานที่อ้างอิงเริ่มต้น: โรงงานเภสัชกรรมทหาร\n\n")
        
        for hosp, data in sorted_hosps:
            if data['total'] == 0: continue
            f.write(f"### 🏥 {hosp} (ระยะทาง {data['dist']:.1f} กม.)\n")
            f.write(f"**ยอดหนี้คงค้างรวม:** {data['total']:,.2f} บาท\n\n")
            f.write("| เลขที่ใบส่งของ (IV) | วันที่ | ยอดค้าง (บาท) | ช่วงอายุหนี้ |\n")
            f.write("|---|---|---|---|\n")
            
            data['invoices'].sort(key=lambda x: x['date'])
            for iv in data['invoices']:
                f.write(f"| {iv['iv_clean']} | {iv['date']} | {iv['amount']:,.2f} | {iv['bucket']} |\n")
            f.write("\n")

    with open(r'C:\Users\FINANCE-DPF-NEW-1\.gemini\antigravity\brain\b2e93a41-4e2f-4f9b-940d-f23f14f05b9d\bkk_debtors.md', 'w', encoding='utf-8') as f:
        f.write("# รายชื่อลูกหนี้การค้า แสดงระยะทางและหนี้คงค้าง\n\n")
        f.write(f"จำนวนทั้งหมด: {len(sorted_hosps)} รายการ (เฉพาะ กทม.)\n")
        f.write(f"สถานที่อ้างอิงเริ่มต้น: โรงงานเภสัชกรรมทหาร\n\n")
        f.write(f"## 📍 เขต กรุงเทพมหานคร\n\n")
        f.write("| ชื่อลูกหนี้ | ระยะทาง (กม.) | ไม่เกิน 90 วัน | 91-180 วัน | 181-270 วัน | ยอดค้าง (รวม) |\n")
        f.write("|---|---|---|---|---|---|\n")
        for hosp, data in sorted_hosps:
            f.write(f"| {hosp} | {data['dist']:.1f} กม. | {data['b90']:,.2f} | {data['b180']:,.2f} | {data['b270']:,.2f} | {data['total']:,.2f} |\n")
            
    with open(r'c:\Users\FINANCE-DPF-NEW-1\CheckLine\bkk_invoices.json', 'w', encoding='utf-8') as f:
        json.dump([{'hosp': h, 'data': d} for h, d in sorted_hosps], f, ensure_ascii=False, indent=2)

    print("Success. Mapped exactly", len(sorted_hosps), "hospitals.")
except Exception as e:
    import traceback
    traceback.print_exc()
