<?php
class SupportController
{
    public function create(array $input): array
    {
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $topic = trim($input['topic'] ?? '');
        $message = trim($input['message'] ?? '');

        if ($name === '' || $email === '' || $topic === '' || $message === '') {
            return ['ok' => false, 'message' => 'All fields are required', 'status' => 422];
        }

        $requests = DataStore::read('support_requests');
        $nextId = $this->nextId($requests);
        $ticket = [
            'id' => $nextId,
            'name' => $name,
            'email' => $email,
            'topic' => $topic,
            'message' => $message,
            'created_at' => date('M d, Y H:i')
        ];

        $requests[] = $ticket;
        DataStore::write('support_requests', $requests);

        return ['ok' => true, 'message' => 'Support request received', 'data' => $ticket, 'status' => 201];
    }

    private function nextId(array $items): int
    {
        $ids = array_map(fn($item) => (int)($item['id'] ?? 0), $items);
        return $ids ? max($ids) + 1 : 1;
    }
}
