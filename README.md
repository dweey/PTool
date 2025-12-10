# PTool
PT站点自动批量收藏种子，


### 用途
[MT保种指北](https://tieba.baidu.com/p/9503932548?pid=151755105794&cid=151834167921#151755105794)
用于批量收藏下载小种进行保种，提高时魔

## 对比原始方案的改动
用馒头的收藏rss功能+ qb，transmission 的rss下载功能,配合下种保种
trrss.php transmission本身不支持下载订阅，这个脚本可以单独运行,直接下载订阅到transmission，需要有一定php基础，参考原大佬的代码，进行了配置文件 config.json 的剥离, 相比qb订阅，查重使用了guid，避免了qb因为同文件名跳过下载的bug

### 特性
* 馒头收藏多页种子 仅适配老版ui ob.m-team
* 设置延时，防止触发馒头限制
* 排除正在做种
* 排除零做种
* 补种模式。用于种子丢失，但文件还在，重新下载种子进行做种

<img width="1440" alt="Image" src="https://raw.githubusercontent.com/AboutCXJ/PTool/refs/heads/main/img/Screen1.png" />

### 使用
* 安装[tampermonkey](https://www.tampermonkey.net/)
* 打开[该链接](https://github.com/dweey/PTool/blob/main/PTool2.js),复制所有内容
* 在tampermonkey扩展中点击添加新脚本，粘贴内容，保存
* 打开要下载的种子列表，设置参数点击开始
* 馒头rss页选择仅收藏，用qb进行订阅，自动下载
* 如有需要 可以用iyuu转种到transmission 上 ，比qb节省系统资源


### 根据以下规则，配置好单种休息时间和多种休息时间，可以实现无人值守自动下满每天上限，
* 馒头限制每小时150种子，每天1500种，主要就是控制每小时下载数量，如果单种延时够大，【 每下载145种，等待:(分) 】 就可以很小
* 馒头订阅更新后，如果3-4分钟内不把更新内容下完，rss返回的种子链接会失效
* chrome切后台运行，或者windows锁屏，浏览器定时器不准，需要[设置](https://blog.csdn.net/qq_41883423/article/details/135813542)




