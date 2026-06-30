# QA Checklist

เอกสารนี้สรุปสถานะงาน QA ของโปรเจกต์ FlowPay ว่าอะไรทำแล้ว อะไรยังค้าง และอะไรควรทำต่อโดยไม่กระทบ flow เดิม

## สถานะปัจจุบัน

## 1. ทำแล้ว

### 1.1 ความปลอดภัยและความเสี่ยงต่ำ

- ป้องกัน redirect ปลายทางไม่ปลอดภัยใน flow login/callback
- เอา `NODE_TLS_REJECT_UNAUTHORIZED=0` ออก
- เพิ่ม validation ฝั่ง API หลายจุด
- เพิ่มการเช็กข้อมูล household/profile/cycle/category ให้เข้มขึ้น

### 1.2 ฟอนต์และการแสดงผล

- เปลี่ยนเป็น `IBM Plex Sans Thai` แบบ local
- ไม่ต้องพึ่ง Google Fonts หรืออินเทอร์เน็ตตอนโหลดฟอนต์

### 1.3 Import และ installment

- ทำให้ flow import มี preview ก่อน commit
- เพิ่มแนวทาง RPC สำหรับงานที่ควร atomic พร้อม fallback
- เพิ่ม SQL function ไว้ใน schema สำหรับ deploy รอบถัดไป
- เพิ่ม SQL guardrail สำหรับ transaction business rules ไว้ใน schema แล้ว
- เพิ่ม SQL guardrail สำหรับ installment link consistency ไว้ใน schema แล้ว

### 1.4 Settlement rules

- ตรวจทานกติกาธุรกิจกับตัวอย่างรอบ `2026-05-25`
- สรุปกติกาไว้ที่ [docs/SETTLEMENT_RULES.md](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/docs/SETTLEMENT_RULES.md)
- เพิ่มสคริปต์เช็กกติกา settlement แบบรันได้ด้วย `npm run qa:settlement`
- เพิ่ม test แบบใช้ `node:test` ได้ด้วย `npm run test:settlement`
- เพิ่ม rule checks สำหรับ transaction/import business rules ด้วย `npm run qa:business-rules`
- เพิ่ม test แบบใช้ `node:test` สำหรับ transaction/import business rules ด้วย `npm run test:business-rules`

## 2. ยังไม่ปิด 100%

### 2.1 Test framework จริงจัง

ตอนนี้โปรเจกต์ยังไม่มี test runner หลักแบบเต็มระบบ เช่น Vitest หรือ Jest

- ที่เพิ่มตอนนี้คือ rule check script สำหรับล็อกกติกาสำคัญ
- และมี `node:test` สำหรับเริ่มเก็บ regression ของ settlement
- แต่ยังไม่ใช่ชุด unit/integration test เต็มระบบ

### 2.2 Database deploy

SQL function และ trigger ที่เพิ่มใน [supabase/schema.sql](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/supabase/schema.sql) ยังต้อง deploy ขึ้นฐานข้อมูลจริง ถ้าต้องการใช้ RPC path และ DB guardrails เต็มรูปแบบ

### 2.3 ตรวจความต่างของข้อมูลหน้า settlement

ยังควรมีการไล่เพิ่มว่า

- ทำไมข้อมูลที่ดึงจาก API ก่อนหน้าไม่ตรงกับภาพที่ผู้ใช้แคป
- เป็นเรื่องชุดข้อมูล, cache, session, หรือแหล่งข้อมูลคนละตัว

## 3. คำแนะนำลำดับถัดไป

ถ้าจะปิดงาน QA ให้แน่นขึ้นโดยไม่กระทบการใช้งานเดิม แนะนำทำตามลำดับนี้

1. รัน `npm run qa:settlement` หรือ `npm run test:settlement` ทุกครั้งก่อน merge งานที่แตะ logic settlement
2. รัน `npm run qa:business-rules` หรือ `npm run test:business-rules` ทุกครั้งก่อน merge งานที่แตะ transaction/import rules
3. เพิ่ม test runner หลักของโปรเจกต์ เมื่อพร้อมขยาย test ให้มากกว่านี้
3. Deploy SQL function ขึ้น environment ที่ใช้งานจริง
4. รีเช็กหน้า settlement กับข้อมูลจริงอีกครั้งหลัง deploy

## 4. สิ่งที่ไม่ควรเปลี่ยนโดยไม่คุยกติกาก่อน

- วิธีคืนค่าอาหารที่คนไม่ได้ถือกระเป๋าจ่าย
- วิธี carry over ค่าอาหาร
- วิธีหารค่าอาหารเกินงบ
- วิธีคิดเงินเติมรอบถัดไป
- วิธีคิดผ่อนที่ตั้งเป็นหารร่วม
