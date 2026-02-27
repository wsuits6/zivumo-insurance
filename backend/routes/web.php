<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/backend/public/index.php', '', $path);
$path = $path === '' ? '/' : $path;
$method = $_SERVER['REQUEST_METHOD'];
header('Content-Type: application/json');

require_once __DIR__ . '/../app/Services/Database.php';
require_once __DIR__ . '/../app/Services/Response.php';
require_once __DIR__ . '/../app/Controllers/AuthController.php';
require_once __DIR__ . '/../app/Controllers/AccountController.php';
require_once __DIR__ . '/../app/Controllers/PreferencesController.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$userId = (int)($_GET['user_id'] ?? 1);

switch ($path) {
    case '/':
    case '/health':
        header('Content-Type: application/json');
        echo json_encode(['ok' => true, 'status' => 'ok']);
        break;
    case '/api/login':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new AuthController();
        $result = $controller->login($input);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
        break;
    case '/api/signup':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new AuthController();
        $result = $controller->signup($input);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null], $result['status']);
        break;
    case '/api/logout':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        Response::json(['ok' => true, 'message' => 'Logged out']);
        break;
    case '/api/account':
        $controller = new AccountController();
        if ($method === 'GET') {
            $result = $controller->showSettings($userId);
            Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
            break;
        }
        if ($method === 'POST') {
            $result = $controller->updateSettings($userId, $input);
            Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null], $result['status']);
            break;
        }
        Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
        break;
    case '/api/preferences':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new PreferencesController();
        $result = $controller->update($userId, $input);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null], $result['status']);
        break;
    default:
        Response::json(['ok' => false, 'message' => 'Not Found'], 404);
        break;
}
