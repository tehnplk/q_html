<?php
// GET get_name.php?dep=xray&q=A001 — what this screen SAYS for that department and queue number, as JSON:
//   { "call_text": "[ขอเชิญ] [หมายเลข {q}] ...", "pname": "นาย", "fname": "สมชาย", "lname": "มีมาก", "name": "นายสมชาย มีมาก" }
// Called by display.js on every call. All fields are optional: a missing call_text makes ../js/speaker.js say just
// "หมายเลข … ห้อง …", missing name fields drop the [ ] parts that use them. fname is also shown on the screen
// (first name only — public screen). The name fields must be spelled the way the TTS should SAY them.

// ===== ประโยคที่จอนี้ขานเมื่อเรียกคิว — แก้ข้อความในเครื่องหมาย " " ด้านล่างได้เลย มีผลกับการเรียกครั้งถัดไป =====
//   'xray'    รหัสแผนก ต้องตรงกับ data-dep ใน index.html
//   {q}       เลขคิว (อ่านเป็น "A, 0 0 1")
//   {n}       เลขห้อง เช่น 2
//   {name}    ชื่อผู้ป่วยทั้งหมด (คำนำหน้า+ชื่อ นามสกุล) — หรือแยกพูดทีละส่วน:
//   {pname}   คำนำหน้า (พูดคำเต็มแล้ว เช่น "พันตำรวจเอก")   {fname}  ชื่อ   {lname}  นามสกุล
//   [ ... ]   ส่วนที่ครอบด้วย [ ] จะถูกตัดทิ้งถ้าค่าข้างในไม่มี (เช่น ไม่มีชื่อ ไม่ระบุห้อง)
//   ,         จุลภาค = หยุดเว้นจังหวะเล็กน้อย
// อยากขานแค่เลขคิว (ไม่ขานชื่อ) ให้ลบส่วน [, {pname}] [{fname}] [, {lname}] ออก
$call_texts = [
    // แผนกรังสี ตัวอย่างที่ได้: "ขอเชิญ หมายเลข A, 0 0 1 , นาย สมชาย , มีมาก , ที่แผนกรังสี ห้อง 2"
    'xray' => "[ขอเชิญ] [หมายเลข {q}] [, {pname}] [{fname}] [, {lname}] , ที่แผนกรังสี [ห้อง {n}]",
];

// ===========================================================================================

header('Content-Type: application/json; charset=utf-8');

// An unknown department gets no call_text: the page falls back to number + room
$text = ['call_text' => $call_texts[$_GET['dep'] ?? ''] ?? ''];

// name = "นายสมชาย มีมาก": title and first name together, then the surname
// TODO: fixed test name for every queue — look the patient up by $_GET['q'] (q_db / HIS) when real names are needed
echo json_encode($text + [
    'pname' => 'นาย',
    'fname' => 'สมชาย',
    'lname' => 'มีมาก',
    'name' => 'นายสมชาย มีมาก',
], JSON_UNESCAPED_UNICODE);
