# 教学版性能检查 / Teaching edition performance checks

检查日期 / Checked: 2026-10-12.

## 页面与计算 / Layout and computation

原理与实验首先展示交互实验台，下方为原理讲解。三种桌面尺寸及中英双语已检查。材料清单数据保持原样。磁铁编辑、一次撤销整层修改、手动计算及跨板块保留设计和结果通过回归检查。

Principles & Lab places the interactive workbench above the explanations. Three desktop sizes and both languages were checked. BOM data is unchanged. Layer edits, undo/redo, manual computation and retained designs/results across sections passed regression checks.

磁场解析公式、Br、几何及坐标未修改。新版初始中心场仍为 37.343568936442715 mT。求场由每个浏览器的 Worker 执行，服务器提供网页与资产。隐藏标签页暂停 3D 绘制和装配播放，返回后继续。

Field formulas, Br, geometry and coordinates are unchanged. The new configuration's initial center field remains 37.343568936442715 mT. Each browser computes its field in a Worker; the server provides the website and assets. Hidden tabs pause 3D rendering and assembly playback and resume when visible.

## 资产优化 / Asset optimization

- 首页所需 CAD 原始字节为 19,309,000，gzip 版本为 5,961,754，减少约 69.1%。17 个压缩模型逐一解压比对，均与原始模型字节一致。
- 完整审计目录保留；浏览器用的精简目录从 604,331 字节降至 28,767 字节，减少约 95.2%。注册矩阵、角色、扇区、导向路径及螺杆轴线保持一致。
- 本地生产预览对带内容哈希的资源返回一年 immutable 缓存头。线上托管层实际返回 `public, max-age=0, must-revalidate`，因此 CAD 与运行目录另外使用浏览器 CacheStorage 按内容版本保存。仅缓存带哈希的模型资产；固定名称的工程资料继续重新校验。
- 支持服务器自动解压、浏览器手动解压、无解压支持时回退原始模型、压缩请求失败时回退四种路径。浏览器均显示 1,736 颗，R05 为 84 颗，无页面异常。

The initial CAD payload decreases from 19,309,000 to 5,961,754 bytes (about 69.1%). All 17 compressed models decode to the exact original bytes. The runtime manifest decreases from 604,331 to 28,767 bytes (about 95.2%) while retaining registration, roles, quarters, motion guides and rod axes. The local production preview returns immutable headers, but the public hosting layer returns `public, max-age=0, must-revalidate`. CAD and runtime manifests therefore also use content-versioned browser CacheStorage. Fixed-name engineering downloads continue to revalidate. Automatic HTTP decompression, browser decompression and both fallback paths were verified.

静态资源缓存依据：[Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[自定义响应头](https://developers.cloudflare.com/workers/static-assets/headers/)。浏览器保存依据：[Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)。CacheStorage 不依赖服务器的 HTTP 缓存头；存储不可用或配额不足时回到普通网络加载，不影响设计与学习进度。

The production asset bundle retains `_headers`, but actual hosting responses override them. The browser Cache API, described in the linked MDN documentation, operates independently of HTTP cache headers. If storage is unavailable or full, normal network loading remains available without changing designs or learning progress.

新增缓存的浏览器验收：在禁用 HTTP 缓存的条件下，首次请求运行目录和 16 个模型共 17 次，完整刷新后的 CAD 与目录网络请求为 0，模型仍完整显示 1,736 颗。存储被禁止、配额不足以及不支持 gzip 解压的三种回退均可正常加载；原始 GLB 回退的完整刷新同样为 0 次资产请求。缓存只保留当前目录版本及一个最近的其他版本，不删除其他缓存或磁铁设计、学习进度。

Browser cache acceptance checks disabled HTTP caching: the first visit requested the runtime catalog and 16 models (17 requests); a full refresh made zero catalog/CAD network requests and still displayed all 1,736 magnets. Denied storage, full quota and missing gzip support all loaded successfully. The raw GLB fallback also made zero asset requests after refresh. Only the current catalog and one recent other catalog are retained; unrelated caches, designs and learning progress are untouched.

## 50 人访问检查 / 50-visitor check

本地生产预览中启动 50 个同时访问的模拟访客，每位请求首页、运行目录、16 个压缩模型和初始场文件，共 950 次请求，全部成功。总传输约 318.19 MB，测试用时 7.124 秒。请求延迟 p50 约 1,141 ms，p95 约 1,508 ms。内容哈希、非空响应及缓存头同时验证。

The local production preview served 50 simultaneous simulated visitors. Each requested HTML, the runtime manifest, 16 compressed models and an initial field file: 950 successful requests, about 318.19 MB transferred, 7.124 seconds total. Request latency was approximately 1,141 ms at p50 and 1,508 ms at p95. Checks included content hashes, nonempty responses and cache headers.

该测试验证页面资产的同时访问，不模拟 50 个 GPU 渲染进程，也不构成公网延迟或可用率承诺。参与者设备分别承担渲染和求场，首次打开时的教室网络带宽仍会影响加载速度。

This tests concurrent asset delivery, not 50 GPU renderers or a public latency/uptime guarantee. Participants' devices handle rendering and computation independently; shared classroom bandwidth still affects the first load.
