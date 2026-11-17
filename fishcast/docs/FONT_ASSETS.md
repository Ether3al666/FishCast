# FishCast 本地网页字体

全站采用用户选定的 04 号方案：英文展示字 Allura、中文展示字霞鹜文楷、正文思源黑体。这里记录字体素材；具体页面字号与用途由样式文件控制。

## 字体与来源

| CSS family        | 字重 | 原字体与固定版本                                                                                                  | 资源                             |
| ----------------- | ---- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `FishCast Allura` | 400  | [Allura / Google Fonts](https://github.com/google/fonts/tree/df7361c02f95af215f3ffc4b51bd441c147a6fca/ofl/allura) | 1 个 WOFF2，81,452 字节          |
| `FishCast WenKai` | 400  | [LXGW WenKai v1.530](https://github.com/lxgw/LxgwWenKai/releases/tag/v1.530)                                      | 183 个 WOFF2，共 10,820,716 字节 |
| `FishCast Sans`   | 400  | [Source Han Sans SC 2.005R](https://github.com/adobe-fonts/source-han-sans/tree/2.005R)                           | 176 个 WOFF2，共 13,482,976 字节 |
| `FishCast Sans`   | 500  | 同上                                                                                                              | 176 个 WOFF2，共 13,619,808 字节 |

所有字体使用 SIL Open Font License 1.1。`public/fonts/` 同时保存原始许可文本 `Allura-OFL.txt`、`LXGWWenKai-OFL.txt`、`SourceHanSans-LICENSE.txt`。字形来自上述真实字体；未安装系统字体，也未引入运行时字体 CDN。

WOFF2 分片属于字体衍生文件，内部 family/PostScript 名改为 `FishCast ...`，保留原作者版权、许可和其它来源记录。`scripts/font-sources.json` 固定原文件下载地址及 SHA-256；公开副本位于 `public/fonts/sources.json`。上游字体发生变化时，哈希不符会中止生成，不能静默替换。

## 加载方式与字符覆盖

`src/styles-font-faces.css` 由脚本生成，每条声明使用 `font-display: swap`、本地 `/fonts/*.woff2` URL 和精确 `unicode-range`。Vite 按项目 `base: './'` 处理 CSS 资源 URL，使构建产物能随站点子目录部署。

Allura 作为一份小文件保留完整字库及连字/排版特性。中文字体先分出拉丁字符，再按固定的高频中文字符快照分片，其余 Unicode 字符按顺序分片，通常每片 256 字。高频快照是从当前项目源码和真实地点目录提取并固定的 1,536 个字符，存放在 `scripts/font-priority-characters.txt`。

分片覆盖整个原字体的普通 Unicode cmap，不只保留当前页面文案：

| 字体                       | 原字体映射字符数 | 生成后缺失 | 片间重复映射 |
| -------------------------- | ---------------: | ---------: | -----------: |
| Allura                     |              587 |          0 |            0 |
| LXGW WenKai                |           46,926 |          0 |            0 |
| Source Han Sans SC Regular |           44,853 |          0 |            0 |
| Source Han Sans SC Medium  |           44,853 |          0 |            0 |

用户输入和新增地点中的汉字，只要原字体支持，就能触发对应分片加载。原字体没有的字符仍由页面字体栈回退处理。

536 份 WOFF2 合计 **38,004,952 字节**，这是完整静态资源的部署体积。浏览器根据实际使用的 family、字重和文字下载相应分片，不会因加载 CSS 就下载全部字体。拉丁分片分别为 WenKai 39,888 字节、Sans 400 为 45,168 字节、Sans 500 为 45,476 字节；中文下载量随页面实际文字变化，应在浏览器 Network 面板按 `woff2` 过滤确认。所有 WOFF2 文件名包含内容哈希，方便静态服务器缓存与版本更新。

本次浏览器验收在新会话的首页观测到 **25 个字体资源**，均能在 manifest 中对应，总 WOFF2 文件内容为 **1,617,996 字节（约 1.62 MB）**：

| 字体     | 首页观测资源数 | WOFF2 文件内容字节 |
| -------- | -------------: | -----------------: |
| Allura   |              1 |             81,452 |
| WenKai   |              6 |            330,260 |
| Sans 400 |              9 |            602,528 |
| Sans 500 |              9 |            603,756 |

这个总量由浏览器观测的文件名与 manifest 的实际文件字节相加得出，**不是 HTTP transferSize 或解码后的字体内存占用**；缓存、页面动态天气文案、用户操作会影响实际网络流量。本次生产构建已验证相对部署路径可加载，并已在浏览器中确认 Allura 和 WenKai 的实际显示。

## 可重现生成

普通 `npm run build` 使用随项目保存的 WOFF2，不需要 Python、字体服务或重新下载原字库。仅更新字体素材时运行下列开发命令。

开发环境需要 Python 3、`scripts/font-requirements.txt` 中固定的 fontTools 4.60.1 与 Brotli 1.2.1。建议使用项目内虚拟环境，不修改系统 Python：

```powershell
python -m venv node_modules/.cache/font-tools
$fontPython = 'node_modules/.cache/font-tools/Scripts/python.exe'
& $fontPython -m pip install -r scripts/font-requirements.txt
& $fontPython scripts/build-fonts.py
```

脚本会从固定官方地址下载原字体到忽略目录 `node_modules/.cache/fishcast-font-sources`，逐个核对 SHA-256，然后并行生成分片。已有原字体时也可指定目录，避免重复下载：

```powershell
& $fontPython scripts/build-fonts.py --source-dir '本地原始字体目录' --jobs 4
```

默认复用固定高频快照；只有主动重排分片时才传入 `--refresh-priority`，这会根据当前源码重新生成快照并改变一部分资源文件名。生成结束前自动校验所有分片内容哈希、内部 family、声明范围、片间重叠和完整字符覆盖，然后写入 CSS 与 `public/fonts/manifest.json`。清理仅针对 `public/fonts/` 直属、属于本脚本 family 前缀的旧 WOFF2 文件。

单独复核现有资源：

```powershell
& $fontPython scripts/build-fonts.py --verify-only
```

`manifest.json` 包含每片 Unicode 范围、字节数、内容 SHA-256 与原字体版本，便于排查缺字、错误缓存或加载问题。此次生成的四个字体/字重均通过完整覆盖校验。
