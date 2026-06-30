# SQL Deploy Checklist

เอกสารนี้ใช้สำหรับ deploy การเปลี่ยนแปลงใน [supabase/schema.sql](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/supabase/schema.sql) ขึ้นฐานข้อมูลจริงอย่างปลอดภัย

## ใช้เมื่อไร

ใช้เมื่อมีการแก้สิ่งต่อไปนี้ใน schema

- table / constraint
- function / RPC
- trigger
- policy

## สิ่งที่เพิ่มในรอบนี้

รอบนี้ schema มีของสำคัญเพิ่มดังนี้

- RPC `replace_installment_with_transactions`
- RPC `delete_installment_with_transactions`
- RPC `commit_flowpay_history`
- trigger ตรวจ `transactions` ให้ตรง business rules
- trigger ตรวจ `installment_transactions` ให้ลิงก์ข้อมูลถูกต้อง

## ก่อน deploy

1. สำรองข้อมูลก่อนเสมอ
2. เช็กว่าฐานข้อมูลไม่มีข้อมูลผิดกติกาที่จะทำให้ trigger ใหม่รันไม่ผ่าน
3. ถ้าเป็น production ให้รันช่วงที่คนใช้น้อย

## Data audit ที่ควรเช็กก่อน

### 1. Food transaction ที่ไม่ตรงกติกา

```sql
select t.id, t.title, t.transaction_type, t.split_type, c.name as category_name
from public.transactions t
join public.categories c on c.id = t.category_id
where t.transaction_type = 'food'
  and (t.split_type <> 'no_split' or lower(c.name) <> 'food');
```

ผลที่ควรได้

- ไม่มีแถว

### 2. Transaction date ที่อยู่นอก billing cycle

```sql
select t.id, t.title, t.date, bc.start_date, bc.end_date
from public.transactions t
join public.billing_cycles bc on bc.id = t.billing_cycle_id
where t.date < bc.start_date or t.date > bc.end_date;
```

ผลที่ควรได้

- ไม่มีแถว

### 3. Installment link ที่เลขงวดเกินจริง

```sql
select it.id, it.installment_id, it.installment_number, i.total_installments
from public.installment_transactions it
join public.installments i on i.id = it.installment_id
where it.installment_number > i.total_installments;
```

ผลที่ควรได้

- ไม่มีแถว

### 4. Installment link ที่ชี้ transaction คนละ installment

```sql
select it.id, it.installment_id, t.installment_id as transaction_installment_id, t.transaction_type
from public.installment_transactions it
join public.transactions t on t.id = it.transaction_id
where t.installment_id is distinct from it.installment_id
   or t.transaction_type <> 'installment';
```

ผลที่ควรได้

- ไม่มีแถว

## ขั้นตอน deploy

1. เปิด Supabase SQL Editor
2. ถ้าจะรันเฉพาะ diff รอบนี้ ให้ใช้ [supabase/manual_migration_2026_06_30.sql](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/supabase/manual_migration_2026_06_30.sql)
3. ถ้าจะตั้ง environment ใหม่ทั้งก้อน ให้รัน [supabase/schema.sql](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/supabase/schema.sql)
4. รัน [supabase/storage.sql](/Users/lilymootoo/Documents/Codex project/Flowpay/flowpay/supabase/storage.sql) ถ้ายังไม่ได้รันใน environment นั้น
5. ถ้ามี error ให้หยุดและแก้ data audit ก่อน

## ตรวจหลัง deploy

### 1. ตรวจว่า RPC มีอยู่จริง

```sql
select proname
from pg_proc
where proname in (
  'replace_installment_with_transactions',
  'delete_installment_with_transactions',
  'commit_flowpay_history'
)
order by proname;
```

ผลที่ควรได้

- เจอครบ 3 ชื่อ

### 2. ตรวจว่า trigger มีอยู่จริง

```sql
select tgname
from pg_trigger
where not tgisinternal
  and tgname in (
    'transactions_validate_business_rules',
    'installment_transactions_validate_business_rules',
    'transaction_notification_after_insert',
    'translation_pairs_touch_updated_at'
  )
order by tgname;
```

ผลที่ควรได้

- เจอชื่อ trigger ครบ

### 3. ทดสอบ flow จริงหลัง deploy

- สร้าง food transaction ที่ category ถูกต้องและ `no_split`
- ลองสร้าง food transaction ที่ผิดกติกาเพื่อเช็กว่า DB กันไว้
- สร้าง installment ใหม่
- แก้ installment เดิม
- ลบ installment
- ลอง import history แบบ preview แล้ว commit

## สิ่งที่คาดหวังหลัง deploy

- แอปยังทำงานเหมือนเดิม
- ถ้ามีข้อมูลผิดกติกาหลุดเข้ามา DB จะ reject ตั้งแต่ชั้นฐานข้อมูล
- RPC path ของ installment/import จะใช้งานได้จริง แทน fallback มากขึ้น

## หมายเหตุ

- การมี trigger/constraint เพิ่ม ไม่ได้แทน validation ฝั่งแอป
- แนวคิดคือให้ฝั่งแอปกันก่อน และ DB กันซ้ำอีกชั้น
