<?php
class Env
{
    private static array $values = [];

    public static function load(string $path): void
    {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = array_map('trim', explode('=', $line, 2));
            self::$values[$key] = $value;
            $_ENV[$key] = $value;
        }
    }

    public static function get(string $key, $default = null)
    {
        return $_ENV[$key] ?? self::$values[$key] ?? $default;
    }
}
