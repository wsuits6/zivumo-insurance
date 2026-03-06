<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/backend/public/index.php', '', $path);
$path = $path === '' ? '/' : $path;
$method = $_SERVER['REQUEST_METHOD'];
header('Content-Type: application/json');

require_once __DIR__ . '/../app/Services/Database.php';
require_once __DIR__ . '/../app/Services/Response.php';
require_once __DIR__ . '/../app/Services/DataStore.php';
require_once __DIR__ . '/../app/Controllers/AuthController.php';
require_once __DIR__ . '/../app/Controllers/AccountController.php';
require_once __DIR__ . '/../app/Controllers/PreferencesController.php';
require_once __DIR__ . '/../app/Controllers/DashboardController.php';
require_once __DIR__ . '/../app/Controllers/PoliciesController.php';
require_once __DIR__ . '/../app/Controllers/ClaimsController.php';
require_once __DIR__ . '/../app/Controllers/BillingController.php';
require_once __DIR__ . '/../app/Controllers/DocumentsController.php';
require_once __DIR__ . '/../app/Controllers/NotificationsController.php';
require_once __DIR__ . '/../app/Controllers/SupportController.php';
require_once __DIR__ . '/../app/Controllers/LandingController.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$userId = (int)($_GET['user_id'] ?? 1);

switch (true) {
    case $path === '/':
    case $path === '/health':
        Response::json(['ok' => true, 'status' => 'ok']);
        break;
    case $path === '/api/login':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new AuthController();
        $result = $controller->login($input);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/signup':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new AuthController();
        $result = $controller->signup($input);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null], $result['status']);
        break;
    case $path === '/api/logout':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        Response::json(['ok' => true, 'message' => 'Logged out']);
        break;
    case $path === '/api/account':
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
    case $path === '/api/preferences':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new PreferencesController();
        $result = $controller->update($userId, $input);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null], $result['status']);
        break;
    case $path === '/api/overview':
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new DashboardController();
        $result = $controller->overview($userId);
        Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/plans':
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new LandingController();
        $result = $controller->plans();
        Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/testimonials':
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new LandingController();
        $result = $controller->testimonials();
        Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/faqs':
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new LandingController();
        $result = $controller->faqs();
        Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/policies':
        $controller = new PoliciesController();
        if ($method === 'GET') {
            $result = $controller->index($userId);
            Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
            break;
        }
        if ($method === 'POST') {
            $result = $controller->create($userId, $input);
            Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
            break;
        }
        Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
        break;
    case preg_match('#^/api/policies/(\d+)$#', $path, $matches) === 1:
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new PoliciesController();
        $result = $controller->show($userId, $matches[1]);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
        break;
    case preg_match('#^/api/policies/(\d+)/renew$#', $path, $matches) === 1:
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new PoliciesController();
        $result = $controller->renew($userId, $matches[1]);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/claims':
        $controller = new ClaimsController();
        if ($method === 'GET') {
            $result = $controller->index($userId);
            Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
            break;
        }
        if ($method === 'POST') {
            $result = $controller->create($userId, $input);
            Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
            break;
        }
        Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
        break;
    case $path === '/api/payments':
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new BillingController();
        $result = $controller->payments($userId);
        Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/documents':
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new DocumentsController();
        $result = $controller->index($userId);
        Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
        break;
    case $path === '/api/notifications':
        if ($method !== 'GET') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new NotificationsController();
        $result = $controller->index($userId);
        Response::json(['ok' => $result['ok'], 'data' => $result['data'] ?? null], $result['status']);
        break;
    case preg_match('#^/api/notifications/(\d+)/read$#', $path, $matches) === 1:
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new NotificationsController();
        $result = $controller->markRead($userId, $matches[1]);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null], $result['status']);
        break;
    case $path === '/api/support':
        if ($method !== 'POST') {
            Response::json(['ok' => false, 'message' => 'Method Not Allowed'], 405);
            break;
        }
        $controller = new SupportController();
        $result = $controller->create($input);
        Response::json(['ok' => $result['ok'], 'message' => $result['message'] ?? null, 'data' => $result['data'] ?? null], $result['status']);
        break;
    default:
        Response::json(['ok' => false, 'message' => 'Not Found'], 404);
        break;
}
