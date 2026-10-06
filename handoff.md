# q_html — Handoff

จอเรียกคิวสำหรับทีวี/กล่อง Android ในโรงพยาบาล เป็น HTML + PHP ล้วน ไม่มี build ไม่มี npm
สถานะ: POC ใช้งานได้ ทดสอบแล้วใน browser และใน LDPlayer (Android emulator) ที่ลง q_speaker ไว้ — ข้อมูลชื่อ/คิวยังเป็นข้อมูลทดสอบ (ดู "สิ่งที่ยังไม่ได้ทำ")

## ภาพรวม

```
q_caller (เจ้าหน้าที่)  ─┐
ยิง URL GET /fin3/A001 ─┴─▶  q_signal :19009  ──Socket.IO──▶  q_html (หน้าเว็บในกล่อง)  ──TTS.postMessage──▶  q_speaker (แอป Android) ──▶ ลำโพง
                              (relay อย่างเดียว)                  แสดงจอ + ถาม PHP                  ◀──window.ttsDone──  พูดจบ
```

- **q_signal** (`../q_signal`) — Node + Socket.IO relay ไม่มี DB ไม่เก็บสถานะ
- **q_html** (repo นี้) — หน้าจอ ทำงานใน WebView ของ q_speaker หรือ browser ธรรมดา (ใน browser จะไม่มีเสียง)
- **q_speaker** (`../q_speaker`, Flutter) — เปิด URL จอใน WebView และพูดด้วย TTS ของ Android ตัวแอปไม่ต่อ q_signal เอง

## โครงสร้างไฟล์

```
q_html/
  js/                     ใช้ร่วมกันทุกจอ — ห้ามแก้เพื่อจอใดจอหนึ่ง
    jquery.min.js         jQuery 3.7.1 (สำเนาในเครื่อง กล่องอาจไม่มีอินเทอร์เน็ต)
    socket.io.min.js      Socket.IO client v4.8.4 (ต้อง major เดียวกับ q_signal)
    speaker.js            เสียง: ต่อประโยคจาก template + ส่งให้ q_speaker พูด  → announce(call)
    signal_client.js      รับคิวจาก q_signal                              → listen(dep, onCall, onOnline)
  mix/                    จอ 2 แผนก: ซ้าย การเงิน (fin) / ขวา ห้องจ่ายยา (rx)
    index.html            layout + <section class="dep" data-dep="…">
    display.js            ทุกอย่างของ "จอ": รับคิว → ถาม PHP → แสดง → announce()
    get_name.php          ประโยคที่ขาน ($call_texts ต่อแผนก) + ชื่อผู้ป่วย (ตอนนี้ชื่อทดสอบตายตัว)
    waiting_fin.php       คิวที่รอ แผนกการเงิน (ข้อมูลตัวอย่าง)
    waiting_rx.php        คิวที่รอ ห้องจ่ายยา (ข้อมูลตัวอย่าง)
  rx/                     จอแผนกรังสีแผนกเดียว (รหัสบน q_signal = xray)
    index.html  display.js  get_name.php  waiting.php
```

หลักการแบ่ง (ตามที่เจ้าของงานกำหนด):
- **เสียง** อยู่ที่ `js/speaker.js` ที่เดียว **จอ** อยู่ที่ `<จอ>/display.js`
- แต่ละจอปรับเองได้ที่ `index.html`, `display.js`, PHP ในโฟลเดอร์ตัวเอง — ไม่ต้องแตะ `js/`
- ลำดับ `<script>` ในทุกหน้าต้องเป็น: `jquery` → `socket.io` → `speaker.js` → `signal_client.js` → `display.js`
  (เป็น global ธรรมดา ไม่ใช้ module — WebView ของกล่องรุ่นเก่า; ห้ามประกาศชื่อซ้ำกับที่ speaker.js มี)

## การทำงานของการเรียกคิว 1 ครั้ง

1. q_signal ส่ง event `<dep><n>` (จากการยิง `GET /<dep><n>/<q>`) หรือ `called {q, counter}` (จาก q_caller)
2. `signal_client.js` กรองเฉพาะ dep ของ section นั้น แล้วเรียก `onCall(q, n)`
3. `display.js` เข้าคิว `chain` (ทั้งจอมีเสียงเดียว — คิวถัดไปรอจนคิวก่อนพูดจบ)
4. ถาม `get_name.php?dep=&q=` → ได้ `call_text` + ชื่อ (ถ้าถามไม่ได้ ใช้ `{}`)
5. แสดงเลขคิว/ชื่อ (ชื่อต้นอย่างเดียว)/ช่อง, ย้ายคิวเก่าไป "เรียกแล้ว", กระพริบกล่อง
6. `announce()` ต่อประโยคแล้ว `TTS.postMessage(text)` → รอ `window.ttsDone(text)` (สูงสุด 30 วิ; ใน browser รอ 3 วิ)

## รันในเครื่อง dev

```bash
node E:/q_stack/q_signal/server.js                  # q_signal :19009
php -S 0.0.0.0:80 -t E:/q_stack/q_html              # q_html :80 (PHP 8.2)
```

เปิด `http://127.0.0.1/mix/` หรือ `/rx/` แล้วยิงคิวทดสอบ:

```bash
curl http://127.0.0.1:19009/fin3/A001     # การเงิน ช่อง 3
curl http://127.0.0.1:19009/rx1/A002      # ห้องจ่ายยา ช่อง 1
curl http://127.0.0.1:19009/xray2/A003    # รังสี ห้อง 2
curl http://127.0.0.1:19009/rx/A004       # ไม่ระบุช่องก็ได้
```

ใน browser ไม่มีเสียง ประโยคที่จะขานจะออกใน console: `[q_html] (ไม่มี bridge) ขอเชิญ หมายเลข …`

### ทดสอบเสียงจริงด้วย LDPlayer / กล่อง Android

1. ติดตั้ง q_speaker (APK ล่าสุด: https://github.com/tehnplk/q_speaker/releases/latest)
2. ในแอป กดเฟือง → URL จอคิว = `http://<IP เครื่อง dev>/mix/` → บันทึก
3. หลังแก้ไฟล์ใน q_html ต้องปิด-เปิดแอปใหม่ให้โหลดหน้าใหม่:
   ```bash
   adb shell am force-stop th.smartq.qspeaker
   adb shell am start -n th.smartq.qspeaker/.MainActivity
   ```
4. ยิงคิวไปที่ IP เครื่อง dev (`http://<IP>:19009/fin3/A001`) — ยิงหลังจากหน้าโหลดเสร็จแล้ว ไม่งั้นคิวหาย
5. ยืนยันว่าพูดจริง: `adb logcat -d -e "TTS dispatch"`

## เพิ่มจอ / เพิ่มแผนก

- **จอใหม่ 1 แผนก**: copy `rx/` เป็นโฟลเดอร์ใหม่ใต้ `q_html/` (ชั้นเดียว เพราะ path เป็น `../js/`), เปลี่ยน `data-dep`, `<h1>`, `$call_texts` ใน get_name.php, รายการใน waiting.php
- **เพิ่มแผนกในจอ mix**: เพิ่ม `<section class="dep" data-dep="…">` ใน index.html + key ใน `$call_texts` + ไฟล์ `waiting_<dep>.php` + ปรับ grid
- **รหัสแผนก (`data-dep`) ต้องไม่ซ้ำทั้งระบบ** เพราะ channel ของ q_signal เป็น global — ตัวอย่าง: โฟลเดอร์ `rx/` (รังสี) จึงใช้รหัส `xray` เพราะ `rx` เป็นห้องจ่ายยาในจอ mix อยู่แล้ว
- ประโยคที่ขาน: แก้ใน `$call_texts` ของ get_name.php — `{q} {n} {name} {pname} {fname} {lname}`, ส่วนใน `[ ]` จะหายไปถ้าค่าข้างในว่าง, `,` = เว้นจังหวะ (คำอธิบายภาษาไทยสำหรับเจ้าหน้าที่อยู่ในไฟล์)

## ข้อควรรู้ / กับดักที่เจอมาแล้ว

- **ขนาดตัวอักษรใช้หน่วย `vh`** ไม่ใช่ px: ฟอนต์ไทยบน Android สูงกว่าบน PC และ q_speaker ซูม WebView (80–110%) ทำให้พื้นที่จริงเล็กกว่าที่คิด px ทำให้ล้น/ทับกัน และ `.big` ต้องมี `line-height` ตายตัว + `.mask { flex-shrink: 0 }`
- **PHP built-in server ไม่เติม `/` ท้าย URL** → `/mix` จะโหลด `../js/` ผิดที่ ทุก index.html จึงมีสคริปต์บรรทัดแรกที่ redirect `/mix` → `/mix/` ห้ามลบ
- **q_signal ให้ socket อยู่ได้ทีละห้อง** (`join` จะออกจากห้องเดิม) → `signal_client.js` เปิด socket แยกต่อแผนก (`forceNew: true`)
- **จอเว็บต้องไม่มีปุ่ม/input** เป็นจอทีวีที่คุมด้วยรีโมต การ debug ดูจาก console เท่านั้น (ไม่แสดงบนจอ)
- **"เรียกแล้ว" หายเมื่อ reload** เก็บในหน่วยความจำของหน้าเท่านั้น
- หน้า `waiting` ซ่อนคิวที่จอนี้เรียกไปแล้ว แต่ไม่รู้ว่าจออื่น/เจ้าหน้าที่เรียกอะไรไป

## สิ่งที่ยังไม่ได้ทำ

- [ ] ชื่อผู้ป่วยจริง: `get_name.php` ทั้งสองจอคืนชื่อทดสอบ "นายสมชาย มีมาก" ทุกคิว (มี TODO ในไฟล์) — ต้องค้นจาก q_db / HIS ด้วย `$_GET['q']` และสะกดตามที่ให้ TTS อ่าน
- [ ] คิวที่รอจริง: `waiting*.php` เป็นรายการตายตัว — ต้องดึงสถานะคิวจริง
- [ ] หน้าเลือกจอ (`q_html/index.html`) และจอ `op/` ถูกลบไปแล้วโดยเจ้าของงาน ยังไม่มีหน้ารวมลิงก์

## q_speaker ที่ใช้คู่กัน

ต้องใช้ q_speaker **v1.0.6 ขึ้นไป** (https://github.com/tehnplk/q_speaker/releases/latest) — เวอร์ชันก่อนหน้านั้นบนกล่อง TV
จอจะว่าง (ขาว/น้ำเงิน) จนกว่าจะมีอนิเมชันหรือกดรีโมต เพราะ WebView แบบ texture ไม่อัปเดตภาพเมื่อหน้าเว็บนิ่ง
1.0.6 เปลี่ยนเป็น hybrid composition แล้ว และมีหน้าแจ้งเตือน "เชื่อมต่อจอคิวไม่ได้ — กำลังลองใหม่" เมื่อเปิด URL ไม่ได้
