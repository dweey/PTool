# PTool
PT站点自动批量收藏种子，


### 用途
[MT保种指北](https://tieba.baidu.com/p/9503932548?pid=151755105794&cid=151834167921#151755105794)
用于批量收藏下载小种进行保种，提高时魔

## 对比原始方案的改动
试用了原作者的下载，发现经常下重复种子，改良一下，用馒头的收藏rss功能+qb的rss下载功能,配合下种保种

### 特性
* 馒头收藏多页种子
* 设置延时，防止触发馒头限制
* 排除正在做种
* 排除零做种
<img width="1440" alt="Image" src="https://raw.githubusercontent.com/AboutCXJ/PTool/refs/heads/main/img/Screen1.png" />

### 使用
* 安装[tampermonkey](https://www.tampermonkey.net/)
* 打开[该链接](https://github.com/dweey/PTool/blob/main/PTool.js),复制所有内容
* 在tampermonkey扩展中点击添加新脚本，粘贴内容，保存
* 打开要下载的种子列表，设置参数点击开始
* 馒头rss页选择仅收藏，用qb进行订阅，自动下载
* 如有需要 可以用iyuu转种到transmission 上 ，比qb节省系统资源

### 推荐配置
#### qb
* RSS 订阅源更新间隔：	7 分钟
* 相同的主机请求延迟：	19 秒

#### PTool
* 下载几页：10
* 下载种子数：999
* 单种延时:(秒) 59
* 多种延时:(分) 1
* 翻页延时:(秒) 10

##### 
这样每小时大概收藏下载60个种，跑满一天1440个，不会触发馒头的上限，如果一下子订阅太多种子，时间间隔过于小，qb很容易订阅不到种子文件
