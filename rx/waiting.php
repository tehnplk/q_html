<?php
// GET waiting.php?dep=xray — that department's waiting list as <li> items for jQuery .load(); the page hides the
// ones it has called.
// ponytail: fixed sample queues; swap for a real queue status (q_db / HIS) so a reloaded screen or another screen's
// calls stay correct.

$waiting = ['A001', 'A002', 'A003', 'A004', 'A005', 'A006', 'A007', 'A008'];

header('Content-Type: text/html; charset=utf-8');
foreach ($waiting as $q) {
    echo '<li>' . htmlspecialchars($q) . "</li>\n";
}
