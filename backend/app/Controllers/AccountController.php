<?php
class AccountController
{
    public function showSettings(int $userId): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT name, email, phone, address, preferences FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['ok' => false, 'message' => 'User not found', 'status' => 404];
        }

        if (!empty($user['preferences'])) {
            $user['preferences'] = json_decode($user['preferences'], true);
        } else {
            $user['preferences'] = null;
        }

        return ['ok' => true, 'data' => $user, 'status' => 200];
    }

    public function updateSettings(int $userId, array $input): array
    {
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $address = trim($input['address'] ?? '');

        if ($name === '' || $email === '') {
            return ['ok' => false, 'message' => 'Name and email are required', 'status' => 422];
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare('UPDATE users SET name = :name, email = :email, phone = :phone, address = :address WHERE id = :id');
        $stmt->execute([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'address' => $address,
            'id' => $userId
        ]);

        return ['ok' => true, 'message' => 'Account settings updated', 'status' => 200];
    }
}
