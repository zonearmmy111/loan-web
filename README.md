# ระบบจัดการเงินกู้ (Loan Management System)

ระบบจัดการเงินกู้ที่พัฒนาด้วย React และ Tailwind CSS สำหรับการติดตามการชำระเงินกู้รายสัปดาห์

## คุณสมบัติ

- ✅ เพิ่มรายการเงินกู้ใหม่
- ✅ ติดตามการชำระเงินรายสัปดาห์
- ✅ คำนวณดอกเบี้ยและค่าปรับอัตโนมัติ
- ✅ แสดงสถานะการชำระเงินแบบ Real-time
- ✅ ประวัติการชำระเงิน
- ✅ UI ที่สวยงามและใช้งานง่าย

## การติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install
```

2. รันโปรเจกต์ในโหมด development:
```bash
npm run dev
```

3. เปิดเบราว์เซอร์ไปที่ `http://localhost:5173`

## การใช้งาน

### เพิ่มรายการเงินกู้ใหม่
1. คลิกปุ่ม "เพิ่มรายการใหม่"
2. กรอกข้อมูล:
   - ชื่อผู้กู้
   - จำนวนเงินต้น
   - วันที่เริ่มต้น
   - เบอร์โทรศัพท์ (ไม่บังคับ)
3. คลิก "เพิ่มรายการ"

### บันทึกการชำระเงิน
1. คลิกที่รายการเงินกู้ที่ต้องการ
2. กรอกจำนวนเงินและวันที่ชำระ
3. คลิก "บันทึก"

### ระบบคำนวณ
- **ดอกเบี้ย:** 20% ต่อสัปดาห์
- **ค่าปรับ:** 5% ต่อวันเมื่อเกินกำหนด
- **การชำระ:** ดอกเบี้ยก่อน ต้นเงินหลัง

## เทคโนโลยีที่ใช้

- React 18
- Tailwind CSS
- Lucide React Icons
- Vite

## การพัฒนา

```bash
# รันในโหมด development
npm run dev

# Build สำหรับ production
npm run build

# Preview build
npm run preview
```

## การ Deploy บน Render

### วิธีที่ 1: ผ่าน Render Dashboard
1. ไปที่ [render.com](https://render.com) และล็อกอิน
2. คลิก **"New +"** แล้วเลือก **"Static Site"**
3. เชื่อมต่อกับ GitHub repository
4. ตั้งค่า:
   - **Name:** `loan-web`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
5. คลิก **"Create Static Site"**

### วิธีที่ 2: ผ่าน render.yaml
1. Push โค้ดขึ้น GitHub
2. ใน Render Dashboard เลือก **"New +"** → **"Blueprint"**
3. เลือก repository ที่มี `render.yaml`
4. Render จะ deploy อัตโนมัติตาม config

### Environment Variables (ถ้าจำเป็น)
- `NODE_VERSION`: `18.0.0`

## การ Deploy บน Platform อื่น

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
``` 