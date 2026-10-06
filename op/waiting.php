<?php
// GET waiting.php — the screen's waiting list as <li> items for jQuery .load(); the page hides the ones it has called.
// ponytail: every queue in patients.php counts as waiting; swap for a real queue status (q_db / HIS) so a reloaded
// screen or another screen's calls stay correct.

header('Content-Type: text/html; charset=utf-8');
foreach (require __DIR__ . '/patients.php' as $p) {
    echo '<li>' . htmlspecialchars($p['q']) . "</li>\n";
}
