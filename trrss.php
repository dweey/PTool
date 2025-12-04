<?php

/**
 * Transmission simple RPC/0.1
 *
 * @author  fengqi <lyf362345@gmail.com>
 * @link    https://github.com/fengqi/transmission-rss
 */
class Transmission
{
    private $server;
    private $user;
    private $password;
    private $session_id;
    private $timeout;

    /**
     * 构造函数, 初始化配置
     *
     * @param $server
     * @param string $port
     * @param string $rpcPath
     * @param string $user
     * @param string $password
     * @param int $timeout
     *
     * @return \Transmission
     */
    public function __construct($server, $port = '9091', $rpcPath = '/transmission/rpc', $user = '', $password = '', $timeout = 10)
    {
        $this->server = $server . ':' . $port . $rpcPath;
        $this->user = $user;
        $this->password = $password;
        $this->timeout = $timeout;
        $this->session_id = $this->getSessionId();
    }

    /**
     * 添加种子, 如果是种子的原始二进制, 需要先进行 base64 编码
     *
     * @param $url
     * @param bool $isEncode
     * @param array $options
     * @return mixed
     */
    public function add($url, $options = array(), $isEncode = false)
    {
        return $this->request('torrent-add', array_merge($options, array(
            $isEncode ? 'metainfo' : 'filename' => $url,
        )));
    }

    /**
     * 获取 Transmission 服务器状态
     *
     * @return mixed
     */
    public function status()
    {
        return $this->request("session-stats");
    }

    /**
     * 获取 Transmission session-id, 每次 rpc 请求都需要带上 session-id
     *
     * @return string
     */
    public function getSessionId()
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->server);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_setopt($ch, CURLOPT_USERPWD, $this->user . ':' . $this->password);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        $content = curl_exec($ch);
        curl_close($ch);
        preg_match("/<code>(X-Transmission-Session-Id: .*)<\/code>/", $content, $content);
        $this->session_id = isset($content[1]) ? $content[1] : null;

        return $this->session_id;
    }

    /**
     * 执行 rpc 请求
     *
     * @param $method 请求类型/方法, 详见 $this->allowMethods
     * @param array $arguments 附加参数, 可选
     * @return mixed
     */
    private function request($method, $arguments = array())
    {
        $data = array(
            'method' => $method,
            'arguments' => $arguments
        );

        $header = array(
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode(sprintf("%s:%s", $this->user, $this->password)),
            $this->session_id
        );

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->server);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_setopt($ch, CURLOPT_USERPWD, $this->user . ':' . $this->password);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        $content = curl_exec($ch);
        curl_close($ch);

        if (!$content)  $content = json_encode(array('result' => 'failed'));
        return $content;
    }

    /**
     * 获取 rss 的种子列表
     *
     * @param $rss
     * @param int $timeout
     * @return array
     */
    function getRssItems($rss, $timeout = 20)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $items = array();
        foreach ($rss as $link) {
            curl_setopt($ch, CURLOPT_URL, $link);
            $content = curl_exec($ch);
            if (!$content) continue;

            $xml = new DOMDocument();
            $xml->loadXML($content);
            $elements = $xml->getElementsByTagName('item');

            foreach ($elements as $item) {
                $link = $item->getElementsByTagName('enclosure')->item(0) != null ?
                    $item->getElementsByTagName('enclosure')->item(0)->getAttribute('url') :
                    $item->getElementsByTagName('link')->item(0)->nodeValue;

                $guid = $item->getElementsByTagName('guid')->item(0) != null ?
                    $item->getElementsByTagName('guid')->item(0)->nodeValue :
                    md5($link);

                $items[] = array(
                    'title' => $item->getElementsByTagName('title')->item(0)->nodeValue,
                    'link' => $link,
                    'guid' => $guid
                );
            }
        }
        curl_close($ch);

        return $items;
    }
}

// 加载配置文件
$config_file = __DIR__ . '/config.json';
if (!file_exists($config_file)) {
    die("配置文件不存在: $config_file\n");
}

$config = json_decode(file_get_contents($config_file), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("配置文件格式错误: " . json_last_error_msg() . "\n");
}

// 验证必要的配置项
$required_keys = ['rss', 'transmission', 'download', 'cache'];
foreach ($required_keys as $key) {
    if (!isset($config[$key])) {
        die("配置文件中缺少必要的配置项: $key\n");
    }
}

// 提取配置
$rss = $config['rss']['urls'] ?? [];
$server = $config['transmission']['server'] ?? 'http://127.0.0.1';
$port = $config['transmission']['port'] ?? 9091;
$rpcPath = $config['transmission']['rpc_path'] ?? '/transmission/rpc';
$user = $config['transmission']['username'] ?? '';
$password = $config['transmission']['password'] ?? '';
$download_dir = $config['download']['directory'] ?? '/data2/complete';
$stash = $config['cache']['directory'] ?? '/tmp/fengqi-transmission-rss';
$sleep_interval = $config['options']['sleep_interval'] ?? 2;

// 创建缓存目录
!file_exists($stash) && mkdir($stash, 0777, true);

$transmission_timeout = $config['options']['timeout']['transmission'] ?? 10;
$rss_timeout = $config['options']['timeout']['rss'] ?? 20;

$trans = new Transmission($server, $port, $rpcPath, $user, $password, $transmission_timeout);
$torrents = $trans->getRssItems($rss, $rss_timeout);
$total = count($torrents);
$options = [
    "download-dir" => $download_dir
];
printf("%s: success fetch ,count:%s\n", date('Y-m-d H:i:s'), $total);
foreach ($torrents as $idx => $torrent) {
    $lock_file = $stash . '/' . base64_encode($torrent['guid']);
    if (file_exists($lock_file)) {
        printf("%s: skip add: %s\n", date('Y-m-d H:i:s'), $torrent['title']);
        continue;
    }

    $response = json_decode($trans->add($torrent['link'], $options));
    if ($response->result == 'success') {
        file_put_contents($lock_file, '1');
        printf("%s: success add %s : %s \n", date('Y-m-d H:i:s'), $idx + 1, $torrent['title']);
        sleep($sleep_interval);
    } else {
        printf("%s: failed add %s : %s ,reason: %s\n", date('Y-m-d H:i:s'), $idx + 1, $torrent['title'], $response->result);
    }
}
