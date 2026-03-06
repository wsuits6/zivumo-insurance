<?php
class DashboardController
{
    public function overview(int $userId): array
    {
        $policies = DataStore::read('policies');
        $notifications = DataStore::read('notifications');

        $userPolicies = array_values(array_filter($policies, fn($policy) => (int)($policy['user_id'] ?? 0) === $userId));
        $userNotifications = array_values(array_filter($notifications, fn($note) => (int)($note['user_id'] ?? 0) === $userId));

        $totalPolicies = count($userPolicies);
        $activePolicies = count(array_filter($userPolicies, fn($policy) => ($policy['status'] ?? '') === 'Active'));
        $pendingRenewals = count(array_filter($userPolicies, fn($policy) => ($policy['status'] ?? '') !== 'Active'));
        $pendingNotifications = count(array_filter($userNotifications, fn($note) => empty($note['read'])));

        return [
            'ok' => true,
            'data' => [
                'totalPolicies' => $totalPolicies,
                'activePolicies' => $activePolicies,
                'pendingRenewals' => $pendingRenewals,
                'notifications' => $pendingNotifications
            ],
            'status' => 200
        ];
    }
}
