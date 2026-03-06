<?php
class DataStore
{
    private static function basePath(): string
    {
        return __DIR__ . '/../../database/data';
    }

    public static function read(string $name, array $default = []): array
    {
        $path = self::pathFor($name);
        if (!file_exists($path)) {
            self::write($name, $default);
            return $default;
        }

        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            return $default;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : $default;
    }

    public static function write(string $name, array $data): void
    {
        $dir = self::basePath();
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $path = self::pathFor($name);
        file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
    }

    public static function seedIfMissing(string $name, array $data): void
    {
        $path = self::pathFor($name);
        if (!file_exists($path)) {
            self::write($name, $data);
        }
    }

    private static function pathFor(string $name): string
    {
        return self::basePath() . '/' . $name . '.json';
    }
}
