<?php
// GET get_name.php?q=A001 — what this department's screen SAYS for that queue number, as JSON:
//   { "call_text": "[ขอเชิญ] [หมายเลข {q}] ...", "pname": "นาย", "fname": "ทดสอบ", "lname": "ระบบ", "name": "นายทดสอบ ระบบ" }
// An unknown queue gets call_text only (said without a name). Name rules as q_screen's app/api/get-name/route.ts.
// The sentence (call_text) is in call_text.php and the patients in patients.php, next to this file.
// Edit the arrays below; takes effect at once.

$call_text = require __DIR__ . '/call_text.php';
$patients = require __DIR__ . '/patients.php';

// ===== คำนำหน้าแบบย่อ → คำที่ให้อ่าน (จุดและช่องว่างไม่มีผลตอนเทียบ: "พ.ต.อ." = "พ.ต.อ" = "พตอ.") =====
$pname = [
    'นพ.' => 'นายแพทย์', 'พญ.' => 'แพทย์หญิง', 'ทพ.' => 'ทันตแพทย์', 'ทพญ.' => 'ทันตแพทย์หญิง',
    'ภก.' => 'เภสัชกร', 'ภกญ.' => 'เภสัชกรหญิง', 'ดร.' => 'ดอกเตอร์',
    'ศ.' => 'ศาสตราจารย์', 'รศ.' => 'รองศาสตราจารย์', 'ผศ.' => 'ผู้ช่วยศาสตราจารย์',

    'ด.ช.' => 'เด็กชาย', 'ด.ญ.' => 'เด็กหญิง', 'น.ส.' => 'นางสาว',

    'ร.ต.' => 'ร้อยตรี', 'ร.ท.' => 'ร้อยโท', 'ร.อ.' => 'ร้อยเอก',
    'พ.ต.' => 'พันตรี', 'พ.ท.' => 'พันโท', 'พ.อ.' => 'พันเอก',
    'พล.ต.' => 'พลตรี', 'พล.ท.' => 'พลโท', 'พล.อ.' => 'พลเอก',
    'จ.ส.อ.' => 'จ่าสิบเอก', 'จ.ส.ท.' => 'จ่าสิบโท',

    'ร.ต.ต.' => 'ร้อยตำรวจตรี', 'ร.ต.ท.' => 'ร้อยตำรวจโท', 'ร.ต.อ.' => 'ร้อยตำรวจเอก',
    'พ.ต.ต.' => 'พันตำรวจตรี', 'พ.ต.ท.' => 'พันตำรวจโท', 'พ.ต.อ.' => 'พันตำรวจเอก',
    'พล.ต.ต.' => 'พลตำรวจตรี', 'พล.ต.ท.' => 'พลตำรวจโท', 'พล.ต.อ.' => 'พลตำรวจเอก',
    'ด.ต.' => 'ดาบตำรวจ', 'ส.ต.ต.' => 'สิบตำรวจตรี', 'ส.ต.ท.' => 'สิบตำรวจโท', 'ส.ต.อ.' => 'สิบตำรวจเอก',
];

// ===== ชื่อที่เสียงอ่านผิด: จับคู่ด้วย hn, ใส่เฉพาะช่องที่ต้องการให้อ่านต่างจากที่เขียน (ชนะ $pname) =====
$correct_call = [
    ['hn' => '0000008', 'pname' => 'นาง', 'fname' => 'กะระนิกาน', 'lname' => 'สาระสิน'],
];

// ===========================================================================================

header('Content-Type: application/json; charset=utf-8');

$plain = fn(string $title) => preg_replace('/[.\s]/u', '', $title);

$text = ['call_text' => $call_text];

$q = strtoupper(trim($_GET['q'] ?? ''));
$p = null;
foreach ($patients as $row) {
    if (strtoupper($row['q']) === $q) { $p = $row; break; }
}
if (!$p) { echo json_encode($text, JSON_UNESCAPED_UNICODE); exit; }

$titles = [];
foreach ($pname as $short => $said) $titles[$plain($short)] = $said;
$say = $p;
$say['pname'] = $titles[$plain($p['pname'])] ?? $p['pname'];
foreach ($correct_call as $fix) {
    if ($fix['hn'] === $p['hn']) { $say = array_merge($say, $fix); break; }
}

// name = "นายทดสอบ ระบบ": title and first name together, then the surname
echo json_encode($text + [
    'pname' => $say['pname'],
    'fname' => $say['fname'],
    'lname' => $say['lname'],
    'name' => $say['pname'] . $say['fname'] . ' ' . $say['lname'],
], JSON_UNESCAPED_UNICODE);
