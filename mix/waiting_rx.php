<?php
// GET waiting_rx.php — ห้องจ่ายยา (rx): queues waiting, as <li> items for jQuery .load(); the page hides the ones it
// has called.
// ponytail: fixed sample queues; swap for a real queue status (q_db / HIS) so a reloaded screen stays correct.

// ===== คิวที่รอเรียก ห้องจ่ายยา =====
$waiting = ['A002', 'A004', 'A006', 'A008', 'A010', 'A012'];

header('Content-Type: text/html; charset=utf-8');
foreach ($waiting as $q) {
    echo '<li>' . htmlspecialchars($q) . "</li>\n";
}
