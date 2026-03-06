<?php
class DocumentsController
{
    public function index(int $userId): array
    {
        $documents = DataStore::read('documents');
        $filtered = array_values(array_filter($documents, fn($doc) => (int)($doc['user_id'] ?? 0) === $userId));

        return ['ok' => true, 'data' => $filtered, 'status' => 200];
    }
}
