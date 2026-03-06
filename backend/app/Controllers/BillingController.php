<?php
class BillingController
{
    public function payments(int $userId): array
    {
        $payments = DataStore::read('payments');
        $filtered = array_values(array_filter($payments, fn($payment) => (int)($payment['user_id'] ?? 0) === $userId));

        return ['ok' => true, 'data' => $filtered, 'status' => 200];
    }
}
