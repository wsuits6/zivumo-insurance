<?php
class ClaimsController
{
    public function index(int $userId): array
    {
        $claims = DataStore::read('claims');
        $filtered = array_values(array_filter($claims, fn($claim) => (int)($claim['user_id'] ?? 0) === $userId));

        return ['ok' => true, 'data' => $filtered, 'status' => 200];
    }

    public function create(int $userId, array $input): array
    {
        $title = trim($input['title'] ?? '');
        if ($title === '') {
            return ['ok' => false, 'message' => 'Claim title is required', 'status' => 422];
        }

        $claims = DataStore::read('claims');
        $nextId = $this->nextId($claims);
        $claim = [
            'id' => $nextId,
            'user_id' => $userId,
            'title' => $title,
            'reference' => $input['reference'] ?? sprintf('CLM-%04d', $nextId),
            'status' => 'In Review',
            'filed_at' => date('M d, Y')
        ];

        $claims[] = $claim;
        DataStore::write('claims', $claims);

        return ['ok' => true, 'message' => 'Claim created', 'data' => $claim, 'status' => 201];
    }

    private function nextId(array $items): int
    {
        $ids = array_map(fn($item) => (int)($item['id'] ?? 0), $items);
        return $ids ? max($ids) + 1 : 1;
    }
}
