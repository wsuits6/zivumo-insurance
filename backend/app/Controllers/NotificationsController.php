<?php
class NotificationsController
{
    public function index(int $userId): array
    {
        $notifications = DataStore::read('notifications');
        $filtered = array_values(array_filter($notifications, fn($note) => (int)($note['user_id'] ?? 0) === $userId));

        return ['ok' => true, 'data' => $filtered, 'status' => 200];
    }

    public function markRead(int $userId, string $notificationId): array
    {
        $notifications = DataStore::read('notifications');
        foreach ($notifications as &$note) {
            if ((string)($note['id'] ?? '') === $notificationId && (int)($note['user_id'] ?? 0) === $userId) {
                $note['read'] = true;
                DataStore::write('notifications', $notifications);
                return ['ok' => true, 'message' => 'Notification updated', 'status' => 200];
            }
        }

        return ['ok' => false, 'message' => 'Notification not found', 'status' => 404];
    }
}
