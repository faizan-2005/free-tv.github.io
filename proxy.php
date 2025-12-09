<?php
/**
 * CORS Proxy for IPTV Playlist
 * Handles cross-origin requests for M3U/M3U8 playlist files
 */

// Enable CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: public, max-age=3600');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the URL from query parameter
$url = isset($_GET['url']) ? $_GET['url'] : null;

if (!$url) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'URL parameter is required']);
    exit;
}

// Validate URL
$parsed_url = parse_url($url);
if (!$parsed_url || empty($parsed_url['host'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid URL provided']);
    exit;
}

// Whitelist of allowed domains (security)
$allowed_domains = [
    'iptv-org.github.io',
    'raw.githubusercontent.com',
    'github.com',
    'iptvcat.com',
    'm3u4u.com',
    'github.io'
];

$allowed = false;
foreach ($allowed_domains as $domain) {
    if (strpos($parsed_url['host'], $domain) !== false) {
        $allowed = true;
        break;
    }
}

if (!$allowed) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Domain not allowed']);
    exit;
}

// Fetch the content
try {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 30,
            'header' => "User-Agent: IPTV-Proxy/1.0\r\n",
            'follow_location' => true,
            'max_redirects' => 5
        ]
    ]);

    $content = @file_get_contents($url, false, $context);

    if ($content === false) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to fetch URL']);
        exit;
    }

    // Determine content type
    if (strpos($url, '.m3u8') !== false || strpos($url, '.m3u') !== false) {
        header('Content-Type: application/vnd.apple.mpegurl; charset=utf-8');
    } else {
        header('Content-Type: text/plain; charset=utf-8');
    }

    // Output the content
    echo $content;
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}
?>
