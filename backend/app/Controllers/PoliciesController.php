<?php
class PoliciesController
{
    public function index(int $userId): array
    {
        $policies = DataStore::read('policies');
        $filtered = array_values(array_filter($policies, fn($policy) => (int)($policy['user_id'] ?? 0) === $userId));

        return ['ok' => true, 'data' => $filtered, 'status' => 200];
    }

    public function show(int $userId, string $policyId): array
    {
        $policies = DataStore::read('policies');
        foreach ($policies as $policy) {
            if ((string)($policy['id'] ?? '') === $policyId && (int)($policy['user_id'] ?? 0) === $userId) {
                return ['ok' => true, 'data' => $policy, 'status' => 200];
            }
        }

        return ['ok' => false, 'message' => 'Policy not found', 'status' => 404];
    }

    public function create(int $userId, array $input): array
    {
        $name = trim($input['name'] ?? '');
        $coverage = trim($input['coverage'] ?? '');

        if ($name === '' || $coverage === '') {
            return ['ok' => false, 'message' => 'Name and coverage are required', 'status' => 422];
        }

        $policies = DataStore::read('policies');
        $nextId = $this->nextId($policies);
        $policy = [
            'id' => $nextId,
            'user_id' => $userId,
            'name' => $name,
            'number' => $input['number'] ?? sprintf('POL-%s', $nextId),
            'status' => 'Active',
            'coverage' => $coverage,
            'start_date' => $input['start_date'] ?? date('M d, Y'),
            'end_date' => $input['end_date'] ?? date('M d, Y', strtotime('+1 year')),
            'progress' => 100,
            'remaining' => 365
        ];

        $policies[] = $policy;
        DataStore::write('policies', $policies);

        return ['ok' => true, 'message' => 'Policy added', 'data' => $policy, 'status' => 201];
    }

    public function renew(int $userId, string $policyId): array
    {
        $policies = DataStore::read('policies');
        foreach ($policies as &$policy) {
            if ((string)($policy['id'] ?? '') === $policyId && (int)($policy['user_id'] ?? 0) === $userId) {
                $policy['status'] = 'Active';
                $policy['start_date'] = date('M d, Y');
                $policy['end_date'] = date('M d, Y', strtotime('+1 year'));
                $policy['progress'] = 100;
                $policy['remaining'] = 365;

                DataStore::write('policies', $policies);
                return ['ok' => true, 'message' => 'Policy renewed', 'data' => $policy, 'status' => 200];
            }
        }

        return ['ok' => false, 'message' => 'Policy not found', 'status' => 404];
    }

    private function nextId(array $items): int
    {
        $ids = array_map(fn($item) => (int)($item['id'] ?? 0), $items);
        return $ids ? max($ids) + 1 : 1;
    }
}
