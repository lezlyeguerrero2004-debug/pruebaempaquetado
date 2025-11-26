<?php
$conn = new mysqli('localhost', 'root', '', 'pwa_db');
if ($conn->connect_error) {
  die("Conexión fallida: " . $conn->connect_error);
}
?>