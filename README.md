# ระบบจัดการเงินกู้ (Loan Management System)

เว็บแอปพลิเคชันสำหรับจัดการลูกค้าและสัญญาเงินกู้ พัฒนาโดยใช้ React + Tailwind CSS + Vite

## วิธีติดตั้งและใช้งาน

1. **ติดตั้ง dependencies**

```bash
npm install
```

2. **เริ่มเซิร์ฟเวอร์สำหรับพัฒนา**

```bash
npm run dev
```

3. **Build สำหรับ production**

```bash
npm run build
```

4. **Deploy**
- สามารถนำไฟล์ในโฟลเดอร์ `dist` ไปวางบนโฮสติ้ง static เช่น Vercel, Netlify, Firebase Hosting หรือ Github Pages ได้ทันที

## ฟีเจอร์หลัก
- เพิ่ม/ลบลูกค้า
- เพิ่ม/ลบสัญญาเงินกู้
- คำนวณดอกเบี้ยและยอดคงเหลืออัตโนมัติ
- บันทึกการชำระเงิน
- ค้นหาสัญญาและลูกค้า

## เทคโนโลยี
- React 18
- Tailwind CSS 3
- Vite
- lucide-react (icon)

---

> **หมายเหตุ:** ระบบนี้เก็บข้อมูลไว้ในหน่วยความจำ (state) เท่านั้น หาก refresh ข้อมูลจะหายหมด 