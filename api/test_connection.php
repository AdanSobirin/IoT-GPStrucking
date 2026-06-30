<?php

$hash = '$2y$10$kaCrOqkldTyFRz63fC6g4ObJsI/oqd2ntyB6Xg26NUK6qRQBXj0hW';

$password = 'admin';

var_dump(password_verify($password, $hash));