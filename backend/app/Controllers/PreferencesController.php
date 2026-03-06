<?php
class PreferencesController
{
    public function update(int $userId, array $input): array
    {
        try {
            $preferences = json_encode($input);
            $pdo = Database::connection();
            $stmt = $pdo->prepare('UPDATE users SET preferences = :preferences WHERE id = :id');
            $stmt->execute(['preferences' => $preferences, 'id' => $userId]);

            return ['ok' => true, 'message' => 'Preferences updated', 'status' => 200];
        } catch (Throwable $e) {
            $accounts = DataStore::read('accounts');
            $updated = false;

            foreach ($accounts as &$account) {
                if ((int)($account['id'] ?? 0) === $userId) {
                    $account['preferences'] = $input;
                    $updated = true;
                }
            }

            if (!$updated) {
                $accounts[] = [
                    'id' => $userId,
                    'name' => 'User ' . $userId,
                    'email' => '',
                    'phone' => '',
                    'address' => '',
                    'preferences' => $input
                ];
            }

            DataStore::write('accounts', $accounts);
            return ['ok' => true, 'message' => 'Preferences updated', 'status' => 200];
        }
    }
}
