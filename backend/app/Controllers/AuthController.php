<?php
class AuthController
{
    public function signup(array $input): array
    {
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if ($name === '' || $email === '' || $password === '') {
            return ['ok' => false, 'message' => 'Name, email, and password are required', 'status' => 422];
        }

        $pdo = Database::connection();
        $check = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $check->execute(['email' => $email]);
        if ($check->fetch()) {
            return ['ok' => false, 'message' => 'Email already exists', 'status' => 409];
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :password_hash)');
        $stmt->execute([
            'name' => $name,
            'email' => $email,
            'password_hash' => $hash
        ]);

        return ['ok' => true, 'message' => 'Account created', 'status' => 201];
    }

    public function login(array $input): array
    {
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $demoEmail = 'demo@zivumo.com';
        $demoPassword = 'Zivumo123!';

        if ($email === '' || $password === '') {
            return ['ok' => false, 'message' => 'Email and password are required', 'status' => 422];
        }

        if ($email === $demoEmail && $password === $demoPassword) {
            return [
                'ok' => true,
                'data' => ['id' => 1, 'name' => 'Demo User', 'email' => $email],
                'status' => 200
            ];
        }

        try {
            $pdo = Database::connection();
            $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = :email LIMIT 1');
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password_hash'])) {
                return ['ok' => false, 'message' => 'Invalid credentials', 'status' => 401];
            }
        } catch (Throwable $e) {
            return ['ok' => false, 'message' => 'Database unavailable. Use demo login.', 'status' => 503];
        }

        return [
            'ok' => true,
            'data' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']],
            'status' => 200
        ];
    }
}
