<?php
class PreferencesController
{
    public function update(int $userId, array $input): array
    {
        $preferences = json_encode($input);
        $pdo = Database::connection();
        $stmt = $pdo->prepare('UPDATE users SET preferences = :preferences WHERE id = :id');
        $stmt->execute(['preferences' => $preferences, 'id' => $userId]);

        return ['ok' => true, 'message' => 'Preferences updated', 'status' => 200];
    }
}
