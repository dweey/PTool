// ==UserScript==
// @name         PTool
// @namespace    https://github.com/dweey/PTool
// @version      2026-12-05
// @description  PT站点自动批量下载种子
// @author       dweey
// @updateURL    https://raw.githubusercontent.com/dweey/PTool/main/PTool2.js
// @downloadURL  https://raw.githubusercontent.com/dweey/PTool/main/PTool2.js
// @include      http://*
// @include      https://*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_notification
// ==/UserScript==

(function () {
    "use strict";

    let DEBUG_MODE = false;

    let totalPages = 100; //要下载的种子页数(1000个/每天,不要大于10页)
    let totalSeedCount = 80; //要下载的种子数
    let singleSeedDelay = DEBUG_MODE ? 100 : 3000; //两种之间延时(ms)
    let multipleSeedDelay = DEBUG_MODE ? 5 : 55 * 60 * 1000; //每下载100种延时

    let pageDelay = 10000; //翻页延时
    let excludeSeeding = true; //排除正在做种的种子
    let excludeZeroSeeding = true; //排除0做种的种子
    let reSeedMode = false; //补种模式
    let cancelCompleted = false; //取消已完成

    let multiplePage = false; //是否多页下载

    let seedGap = 145; //间隔多少个种子触发一次大延时

    let currentPage = 1;
    let downloadCount = 0;

    let logPanel, beginPanel;

    let selector;

    // NexusPHP站点
    const nexusPHPSites = [
        "hdfans.org",
        "hdvideo.one",
        "ubits.club",
        "pt.btschool.club",
    ];

    // M-Team站点
    const mteamSites = ["m-team"];

    // 所有站点
    const allSites = [...nexusPHPSites, ...mteamSites];

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
                liker: "td button:nth-child(2)",
                finshNoSeeding: "div[style*='background: rgb(158, 158, 158)']",
                progressBar: "div.ant-progress-bg.ant-progress-bg-outer[style*='--progress-percent: 1']:not([style*='background: rgb(158, 158, 158)'])",
                size: "td div[class='mx-[-5px]']",
                seeders: "td span[aria-label*='arrow-up'] + span",
                leechers: "td span[aria-label*='arrow-down'] + span",
                nextPage: "li[title='下一頁'] button",
            };
        } else if (nexusPHPSites.some((site) => currentURL.includes(site))) {
            selector = {
                list: "table[class='torrents'] > tbody > tr",
                title: "table[class='torrentname'] tr td",
                downloader: "table[class='torrentname'] tr td[width] a",
                finshNoSeeding: "div[style*='background: rgb(158, 158, 158)']",
                progressBar: "div[title*=seeding]",
                size: "td:nth-child(5)",
                seeders: "td:nth-child(6)",
                leechers: "td:nth-child(7)",
                nextPage: "p[class='nexus-pagination'] a",
            };
        }
    }

    // 监听URL变化
    function observeURLChange() {
        let previousURL = location.href;

        // 创建监视器
        const observer = new MutationObserver(() => {
            const currentURL = location.href;
            if (currentURL !== previousURL) {
                previousURL = currentURL;
                handleURLChange(currentURL);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 处理URL变化
    function handleURLChange(currentURL) {
        if (!allSites.some((site) => currentURL.includes(site))) {
            return;
        }

        if (torrentsPagePaths.some((path) => currentURL.includes(path))) {
            loadSelector(currentURL);
            loadBeginPanel();
        } else {
            removeBeginPanel();
            removeLogPanel();
        }
    }

    //加载开始面板
    function loadBeginPanel() {
        if (beginPanel) return;

        beginPanel = document.createElement("div");
        beginPanel.style.position = "fixed";
        beginPanel.style.bottom = "10px";
        beginPanel.style.left = "10px";
        beginPanel.style.zIndex = "10000";
        beginPanel.style.padding = "10px";
        beginPanel.style.backgroundColor = "#BDCAD6";

        beginPanel.style.borderRadius = "5px";
        beginPanel.style.fontSize = "12px";
        document.body.appendChild(beginPanel);

        //页数输入框
        // const pageInput = document.createElement("input");
        // pageInput.type = "number";
        // pageInput.max = 10;
        // pageInput.value = totalPages;
        // if (multiplePage) {
        //     beginPanel.appendChild(createInputModule(pageInput, `下载几页：`));
        // }

        //下载种子数
        const seedInput = document.createElement("input");
        seedInput.type = "number";
        seedInput.max = 1500;
        seedInput.value = totalSeedCount;
        beginPanel.appendChild(createInputModule(seedInput, `下载种子数：`));

        //百种延时
        const multipleSeedDelayInput = document.createElement("input");
        multipleSeedDelayInput.type = "number";
        multipleSeedDelayInput.value = multipleSeedDelay / 1000 / 60;
        beginPanel.appendChild(
            createInputModule(multipleSeedDelayInput, `每下载` + seedGap + `种，等待:(分)`)
        );

        //种之间延时输入框
        const singleSeedDelayInput = document.createElement("input");
        singleSeedDelayInput.type = "number";
        singleSeedDelayInput.step = 0.1;
        singleSeedDelayInput.value = singleSeedDelay / 1000;
        beginPanel.appendChild(
            createInputModule(singleSeedDelayInput, `单种延时:(秒)`)
        );

        //翻页延时
        const pageDelayInput = document.createElement("input");
        pageDelayInput.placeholder = `翻页延时？${formatTime(pageDelay)}`;
        pageDelayInput.type = "number";
        pageDelayInput.value = pageDelay / 1000;
        beginPanel.appendChild(
            createInputModule(pageDelayInput, `翻页延时:(秒)`)
        );

        //排除做种中
        const excludeSeedingCheck = document.createElement("input");
        excludeSeedingCheck.type = "checkbox";
        excludeSeedingCheck.checked = excludeSeeding;
        beginPanel.appendChild(
            createInputModule(excludeSeedingCheck, `排除正在做种:`)
        );

        //排除0做种
        const excludeZeroSeedingCheck = document.createElement("input");
        excludeZeroSeedingCheck.type = "checkbox";
        excludeZeroSeedingCheck.checked = excludeSeeding;
        beginPanel.appendChild(
            createInputModule(excludeZeroSeedingCheck, `排除零做种:`)
        );

        //模拟运行
        const reSeedModeCheck = document.createElement("input");
        reSeedModeCheck.type = "checkbox";
        reSeedModeCheck.checked = reSeedMode;
        beginPanel.appendChild(createInputModule(reSeedModeCheck, `补种模式:`));

        //取消已完成
        const cancelCompletedCheck = document.createElement("input");
        cancelCompletedCheck.type = "checkbox";
        cancelCompletedCheck.checked = cancelCompleted;
        beginPanel.appendChild(createInputModule(cancelCompletedCheck, `<收藏页>做种中取消收藏:`));

        //开始按钮
        const beginButton = document.createElement("button");
        beginButton.innerText = "开始";
        beginButton.style.width = "100%";
        beginButton.style.padding = "5px";
        beginButton.style.backgroundColor = "white";
        beginButton.style.color = "black";
        beginButton.style.border = "none";
        beginButton.style.borderRadius = "5px";
        beginButton.style.cursor = "pointer";
        beginButton.style.margin = "5px 0";
        beginPanel.appendChild(beginButton);

        //开始按钮
        const stopButton = document.createElement("button");
        stopButton.innerText = "暂停";
        stopButton.style.width = "100%";
        stopButton.style.padding = "5px";
        stopButton.style.backgroundColor = "white";
        stopButton.style.color = "black";
        stopButton.style.border = "none";
        stopButton.style.borderRadius = "5px";
        stopButton.style.cursor = "pointer";
        stopButton.style.margin = "5px 0";
        stopButton.style.display = "none";
        beginPanel.appendChild(stopButton);

        // 按钮点击事件
        beginButton.addEventListener("click", () => {
            loadLogPanel();
            totalPages = totalPages;
            totalSeedCount = seedInput.value || totalSeedCount; //目标下载数
            singleSeedDelay = singleSeedDelayInput.value * 1000;
            multipleSeedDelay = multipleSeedDelayInput.value * 1000 * 60;
            pageDelay = pageDelayInput.value * 1000;
            excludeSeeding = excludeSeedingCheck.checked;
            excludeZeroSeeding = excludeZeroSeedingCheck.checked;
            reSeedMode = reSeedModeCheck.checked;
            cancelCompleted = cancelCompletedCheck.checked;

            // Make panel semi-transparent
            beginPanel.style.opacity = "0.5";

            // Disable all input fields and checkboxes in the panel
            const inputs = beginPanel.querySelectorAll("input, select, textarea");
            inputs.forEach(el => {
                if (el !== beginButton) {
                    el.disabled = true;
                }
            });

            beginButton.style.display = "none";
            stopButton.style.display = "block";

            clearLogPanel();
            begin();
        });

        stopButton.addEventListener("click", () => {
            beginPanel.style.opacity = "1";
            // Disable all input fields and checkboxes in the panel
            const inputs = beginPanel.querySelectorAll("input, select, textarea, button");
            inputs.forEach(el => {
                if (el !== beginButton) {
                    el.disabled = false;
                }
            });

            beginButton.style.display = "block";
            stopButton.style.display = "none";
            totalSeedCount = downloadCount
            panelMessage("已停止");
        });

        //
        function createInputModule(input, tip) {
            const div = document.createElement("div");
            div.style.display = "flex";

            input.style.borderRadius = "5px";
            input.style.padding = "5px";
            input.style.color = "black";
            input.style.margin = "5px 0";
            input.style.width = "60px";

            const label = document.createElement("label");
            label.innerText = tip;
            label.style.whiteSpace = "nowrap";
            label.style.borderRadius = "5px";
            label.style.width = "100%";
            label.style.padding = "5px";
            label.style.color = "black";
            label.style.margin = "5px 0";

            div.appendChild(label);
            div.appendChild(input);

            return div;
        }
    }

    // 移除开始面板
    function removeBeginPanel() {
        if (beginPanel) {
            beginPanel.remove();
            beginPanel = null;
        }
    }

    //加载日志面板
    function loadLogPanel() {
        if (logPanel) return;

        logPanel = document.createElement("div");
        logPanel.style.position = "fixed";
        logPanel.style.bottom = "200px";
        logPanel.style.right = "10px";
        logPanel.style.width = "500px";
        logPanel.style.height = "200px";
        logPanel.style.zIndex = "10000";
        logPanel.style.padding = "5px";
        logPanel.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        logPanel.style.borderRadius = "5px";
        logPanel.style.color = "white";
        logPanel.style.fontSize = "10px";
        logPanel.style.overflowY = "auto";
        document.body.appendChild(logPanel);
    }

    //清空日志面板
    function clearLogPanel() {
        logPanel.innerHTML = "";
    }

    //打印日志
    function panelMessage(message) {
        const timestamp = new Date().toLocaleString();
        logPanel.innerHTML += `<div>[${timestamp}]  ${message}</div>`;
        logPanel.scrollTop = logPanel.scrollHeight;
        console.log(`[${timestamp}]  ${message}`);
    }

    // 移除日志面板
    function removeLogPanel() {
        if (logPanel) {
            logPanel.remove();
            logPanel = null;
        }
    }

    //格式化时间
    function formatTime(milliseconds) {
        let totalSeconds = Math.fround(milliseconds / 1000).toFixed(2); // 转换为秒
        if (totalSeconds < 60) {
            return `${totalSeconds} 秒`;
        } else if (totalSeconds < 3600) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return seconds === 0
                ? `${minutes} 分钟`
                : `${minutes} 分钟 ${seconds} 秒`;
        } else {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours} 小时${minutes > 0 ? ` ${minutes} 分钟` : ""}${seconds > 0 ? ` ${seconds} 秒` : ""
                }`;
        }
    }

    //预处理数据
    function preprocessingDatas() {
        const list = document.querySelectorAll(selector.list);

        let datas = Array();
        for (let index = 0; index < list.length; index++) {
            const element = list[index];
            var data = new Object();

            let title = element.querySelector(selector.title);
            if (title) {
                data.title = title.innerText;
            } else {
                continue;
            }

            data.downloader = element.querySelector(selector.downloader);
            data.liker = element.querySelector(selector.liker);

            let progress = element.querySelector(selector.progressBar);
            if (progress) {
                data.seeding = true;
            } else {
                data.seeding = false;
            }
            let finshNoSeeding = element.querySelector(selector.finshNoSeeding);
            if (reSeedMode) {
                if (finshNoSeeding) {
                    data.seeding = false;
                }else {
                    data.seeding = true;
                }
            }

            let size = element.querySelector(selector.size);
            if (size) {
                data.size = size.innerText;
            }

            let seeders = element.querySelector(selector.seeders);
            if (seeders) {
                data.seeders = seeders.innerText;
            }

            let leechers = element.querySelector(selector.leechers);
            if (leechers) {
                data.leechers = leechers.innerText;
            }

            //   console.log(data);

            datas.push(data);
        }

        return datas;
    }

    //下载种子
    async function downloadTorrents() {
        const datas = preprocessingDatas();

        for (let i = 0; i < datas.length; i++) {
            const data = datas[i];

            let shoudleSkip = false;
            let skipReason = "";

            //排除正在做种的种子
            if (data.seeding && excludeSeeding) {
                shoudleSkip = true;
                skipReason += "正在做种，";
            }

            //排除0做种的种子
            if (data.seeders === "0" && excludeZeroSeeding) {
                shoudleSkip = true;
                skipReason += "0做种。";
            }

            //取消已完成
            if (cancelCompleted) {
                if (data.seeding) {
                    shoudleSkip = false;
                } else {
                    shoudleSkip = true;
                    skipReason += "未下载。";
                }
            }


            panelMessage(
                `页：${currentPage}  种：${i + 1} 做种数：${data.seeders
                } 已经下载 ${downloadCount} 个种子 <br />
                 下载数：${data.leechers} 大小：${data.size} 做种：${data.seeding
                }  跳过：${shoudleSkip} 原因：${skipReason} <br /> ${data.title.length > 80 ? data.title.substring(0, 80) + '...' : data.title
                } <hr />`
            );

            if (shoudleSkip) {
                continue;
            }

            if (1) {
                // data.downloader.click();
                data.liker.click();
            }

            downloadCount++;

            // If we've reached or exceeded the target count, break out of the loop
            if (downloadCount >= totalSeedCount) {
                break;
            }

            //每下载xxx个种子，暂停下载
            if (downloadCount % seedGap === 0) {
                panelMessage(
                    `已下载${downloadCount}个种子，等待${formatTime(
                        multipleSeedDelay
                    )}`
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, multipleSeedDelay)
                );
            }

            await new Promise((resolve) =>
                setTimeout(resolve, singleSeedDelay)
            );
        }
    }

    //翻页
    async function goToNextPage() {
        const nextPageButton = document.querySelector(selector.nextPage);

        if (nextPageButton && !nextPageButton.disabled && !nextPageButton.classList.contains('disabled')) {
            nextPageButton.click();
            panelMessage(
                `翻到第${currentPage + 1}页。等待${formatTime(pageDelay)}。`
            );
            await new Promise((resolve) => setTimeout(resolve, pageDelay));
            return true;
        } else {
            panelMessage("未找到翻页按钮或翻页按钮已禁用！");
            return false;
        }
    }

    //入口函数
    async function begin() {
        panelMessage(
            `<br />页数：${totalPages} <br /> 单种延时：${formatTime(
                singleSeedDelay
            )} <br /> 多种延时：${formatTime(
                multipleSeedDelay
            )} <br /> 翻页延时：${formatTime(
                pageDelay
            )} <br /> 排除做种：${excludeSeeding} <br /> 排除零做种：${excludeZeroSeeding} <br />`
        );

        while (downloadCount < totalSeedCount) {
            panelMessage(
                `开始下载第${currentPage}页，共${totalPages}页。目标下载数：${totalSeedCount}，已下载：${downloadCount}<hr />`
            );
            await downloadTorrents();

            // If we've reached or exceeded the target count, break out of the loop
            if (downloadCount >= totalSeedCount) {
                break;
            }

            if (currentPage < totalPages) {
                const hasNextPage = await goToNextPage();
                if (!hasNextPage) break;
            }

            currentPage++;
        }

        let finishTip = `全部任务已完成，共下载${downloadCount}个种子！`;
        panelMessage(finishTip);
        GM_notification(finishTip);

        //恢复初始状态
        currentPage = 1;
        // downloadCount = 0;
        beginPanel.style.display = "block";
    }

    // 初始化监听
    observeURLChange();

    // 初始检查
    handleURLChange(location.href);
})();
