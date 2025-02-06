# PTool
PT站点自动批量下载种子

### 特性
* 馒头下载多页种子（NexusPHP站点翻页会重新加载页面，无法多页下载）
* 设置延时，防止触发馒头限制
* 排除正在做种
* 排除零做种
<img width="1440" alt="Image" src="https://github.com/AboutCXJ/PTool/main/img/Screen1.png" />

### 使用
* 安装[tampermonkey](https://www.tampermonkey.net/)
* 打开[该链接](https://raw.githubusercontent.com/AboutCXJ/PTool/main/PTool.js),复制所有内容
* 在tampermonkey扩展中点击添加新脚本，粘贴内容，保存
* 打开要下载的种子列表，设置参数点击开始


### 参与开发

* 在 _nexusPHPSites_ 添加站点
* 在 _torrentsPagePaths_ 添加路径
* 根据实际情况 设置 _selector_

``` js
    const nexusPHPSites = [
        "hdfans.org",
        ...
    ];

    // M-Team站点
    const mteamSites = [
        "m-team"
        ...
    ];

...

    // 种子页面路径
    const torrentsPagePaths = ["browse", "torrents.php"];

    // 配置选择器
    function loadSelector(currentURL) {
        if (mteamSites.some((site) => currentURL.includes(site))) {
            multiplePage = true;
            selector = {
                list: "tbody tr",
                title: "td:nth-child(3)",
                downloader: "td button",
                progressBar: "div[aria-valuenow='100']",
                size: "td div[class='mx-[-5px]']",
                seeders: "td span[aria-label*='arrow-up'] + span",
                leechers: "td span[aria-label*='arrow-down'] + span",
                nextPage: "li[title='下一頁'] button",
            };
        } ....
    }
```