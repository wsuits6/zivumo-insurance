<?php
class AccountController
{
    public function showSettings(int $userId): array
    {
        try {
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
        } catch (Throwable $e) {
            $accounts = DataStore::read('accounts');
            foreach ($accounts as $account) {
                if ((int)($account['id'] ?? 0) === $userId) {
                    return ['ok' => true, 'data' => $account, 'status' => 200];
                }
            }

            return ['ok' => false, 'message' => 'User not found', 'status' => 404];
        }
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

        try {
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
        } catch (Throwable $e) {
            $accounts = DataStore::read('accounts');
            $updated = false;

            foreach ($accounts as &$account) {
                if ((int)($account['id'] ?? 0) === $userId) {
                    $account['name'] = $name;
                    $account['email'] = $email;
                    $account['phone'] = $phone;
                    $account['address'] = $address;
                    $updated = true;
                }
            }

            if (!$updated) {
                $accounts[] = [
                    'id' => $userId,
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'address' => $address,
                    'preferences' => null
                ];
            }

            DataStore::write('accounts', $accounts);
            return ['ok' => true, 'message' => 'Account settings updated', 'status' => 200];
        }
    }
}
