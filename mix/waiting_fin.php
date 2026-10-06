<?php
// GET waiting_fin.php — แผนกการเงิน (fin): queues waiting, as <li> items for jQuery .load(); the page hides the ones
// it has called.
// ponytail: fixed sample queues; swap for a real queue status (q_db / HIS) so a reloaded screen stays correct.

// ===== คิวที่รอเรียก แผนกการเงิน =====
$waiting = ['A001', 'A003', 'A005', 'A007', 'A009', 'A011'];

header('Content-Type: text/html; charset=utf-8');
foreach ($waiting as $q) {
    echo '<li>' . htmlspecialchars($q) . "</li>\n";
}
