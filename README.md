# MRI Hackathon · MRI 黑客松教学版

教学版将网站分为整体总览、材料清单、分步装配、原理与实验、文件资料五个板块。装配主体为新版 14 层、28 列、1,736 颗 12 mm 方块磁铁。CAD 网格来自提供的 STEP，磁铁位置与方向来自 MATLAB 数据。

This teaching edition has five sections: Overview, BOM, Assembly, Principles & Lab, and Resources. Its baseline is the new 14-ring, 28-column assembly with 1,736 separate 12 mm cubes. Mechanical meshes come from supplied STEP files; magnet positions and directions come from the MATLAB data.

当前装配路线最后三步为：放入框架 → 安装全部十四层 → 最后插入贯穿螺杆。M3 螺丝用于壳体盖板、透明盖板与磁铁壳体，M6 用于层间连接。材料清单包含 14 类物料（含可复用临时卡扣工装），每项列出材料及配图，包括 N52 钕铁硼磁铁、L 型角码、铝型材连接螺栓和 T 型槽螺母。模型下载只提供最终的 Final_1.3mf–Final_4.3mf；旧 STEP 和打印文件的网页发布副本已撤下，现有装配场景保留原 CAD 来源记录与 GLB。七份 MATLAB 程序原样保留，教学下载入口标为待更新。

The final three stages are: mount in the frame → mount all fourteen layers → insert through-rods last. M3 screws secure the housing cap, clear cover and magnet housing; M6 is used between layers. The 14-category BOM, including the reusable temporary clip, includes material descriptions and images, N52 grade NdFeB magnets, L-brackets, extrusion mounting bolts and T-slot nuts. Model downloads contain only Final_1.3mf–Final_4.3mf. Old STEP and print download copies have been withdrawn; the existing lesson retains its CAD provenance and GLB geometry. All seven MATLAB programs remain unchanged; their teaching download entry is pending update.

| 最终文件 / Final file | 预计打印时间 / Estimated print time |
| --- | --- |
| Final_1.3mf | 5天19小时18分钟 / 5d 19h 18min |
| Final_2.3mf | 3天17小时39分钟 / 3d 17h 39min |
| Final_3.3mf | 1天13小时49分钟 / 1d 13h 49min |
| Final_4.3mf | 已更新，待重新估时 / Updated; re-estimate pending |
| **整套总计 / Complete total** | **待确认 / Pending** |
| 前三份已知估时 / Known subtotal for files 1–3 | 266小时46分钟 / 266h 46min |

预计时间由用户提供；四份文件构成完整打印包，未推断单份文件与 BOM 零件的对应关系。原始工程目录不受下载清理影响。

Estimates were supplied by the user. The four files form the complete print package; no per-file BOM allocation has been inferred. Download cleanup does not alter the original engineering directory.

每台最新确认的物料数量：分段磁铁壳体、壳体盖板、透明盖板各 56 件（4 × 14）；框架安装支撑 42 件（左右 28 件，底部 14 件）；圆柱层间隔块 32 件（4 × 8）；贯穿螺杆 8 根；M3 短螺丝 448 个（32 × 14）；M6 螺母 8 个。L 型角码、铝型材框架、T 型槽螺母和型材连接螺栓由官方提供。新隔块 STEP 的名义尺寸为长 18 mm、外径 14 mm、通孔 6.2 mm，实际配合公差与安装位置仍需核对。

Confirmed quantities per unit: 56 segmented magnet housings, 56 housing caps and 56 clear covers (4 × 14 each); 42 frame supports (28 side, 14 bottom); 32 cylindrical inter-layer spacers (4 × 8); 8 through-rods; 448 M3 short screws (32 × 14); and 8 M6 nuts. L-brackets, the aluminium frame, T-slot nuts and extrusion mounting bolts are supplied by the organizers. The new spacer STEP defines an 18 mm length, 14 mm outer diameter and 6.2 mm through-hole; verify actual tolerances and installed locations separately.

BOM 的左右支撑、底部支撑和圆柱隔块采用新提供的独立 STEP 示意图与可旋转模型。其余零件统一为白色背景立体示意；壳体与盖板保留真实 CAD 几何，欧式 T 型槽螺母外形按用户参考图绘制。页首 logo 使用透明背景；首页大标题上方提供活动官网入口。新增亚克力临时固定卡扣：完整圆环的四块亚克力各用三个卡扣，共十二个，先盖亚克力并卡紧，安装上盖时保持约束并取下卡扣，最后锁紧 M3。详见 [临时卡扣装配说明](docs/temporary-acrylic-retainer.md)。十个装配阶段在 1× 下均为 8 秒，主要动作约从 0.44 秒开始，使用参考 Apple Core Animation 的加减速曲线；机械路径保持原样，动作无回弹越位。

BOM side supports, bottom supports and cylindrical spacers use the supplied standalone STEP previews and interactive models. Other parts share white-studio product illustrations; housing/cap images retain actual CAD geometry, and the European-style T-slot nut follows the supplied picture. The header logo has a transparent background, with a prominent event-website link above the overview headline. The full-ring temporary acrylic-retainer lesson uses four acrylic quarters and three clips per quarter (twelve reusable clips), maintaining restraint while fitting the cap and removing the clip, then securing M3 screws. See [the retainer assembly notes](docs/temporary-acrylic-retainer.md). All ten assembly stages run for 8 seconds at 1×, with primary motion starting around 0.44 seconds. Apple Core Animation-inspired easing changes speed along the existing mechanical paths without spring overshoot.

公开网页沿用下方链接。运行本地版请使用 `npm.cmd run dev`（Windows PowerShell），打开终端显示的本地地址。详细说明见 [教学版本地预览说明.txt](教学版本地预览说明.txt)、[CAD 核对记录](docs/cad-audit.md) 和 [教学版性能检查](docs/teaching-performance.md)。

The public teaching website uses the link below. On Windows PowerShell, run `npm.cmd run dev` and open the local address shown in the terminal.

“原理与实验”先展示交互实验台，原理讲解位于下方。CAD 采用无损压缩及内容版本缓存；求场仍在参赛者自己的浏览器中进行，公式与模型参数不因性能优化改变。

Principles & Lab opens with the interactive workbench, followed by the explanations. CAD assets use lossless compression and content-versioned caching. Field computation remains in each participant's browser; performance changes do not alter the formulas or model parameters.

装配完成项由参赛者人工确认。BOM 用于查阅零件和材料；装配学习进度与磁铁设计独立。基础实验展示新版模型的 3D、纵向磁场和横向剖面／FOV 三个视图，按整层修改 28 颗磁铁；初始场自动载入，修改后手动计算。保存与文件操作位于折叠入口，切换教学板块会保留设计、撤销历史和已计算结果。

Completion checks are manual. The BOM is a parts and materials reference; assembly progress remains separate from magnet designs. The basic Lab offers the latest model with 3D, longitudinal Field and Transverse/FOV views, editing all 28 magnets at a selected radial position. Initial fields load automatically; edits require Compute. Save and file operations are folded, and changing teaching sections preserves edits, undo history and completed results.

横向视图采用 1 mm XY 网格，默认探索 Z = −100…+100 mm 的九个截面（25 mm 间隔），逐层比较 Bz／|B|。原 MATLAB 的 −2…+2 mm 五切片及逐点平均保留为独立核对模式。FOV 直径为 20–200 mm，显示所选截面的平均场强、峰峰值和标准差；输入自己的 ppm 上限，可筛选满足当前范围全部截面场差上限的最大采样直径。九个离散截面并不证明完整 200 mm 轴向区域均匀，也不代替手／脚范围的实测或临床验证。[方法与核对数据](docs/transverse-field-fov.md)。

The transverse view uses a 1 mm XY grid and defaults to nine Z planes spanning −100…+100 mm at 25 mm intervals, viewed individually as Bz/|B|. The original MATLAB five-slice ±2 mm average remains a separate check mode. FOV diameters span 20–200 mm, with per-slice mean, peak-to-peak and standard-deviation statistics. A user-defined ppm limit selects the largest diameter within the variation limit across every sampled plane in the current range. Nine discrete planes do not prove homogeneity throughout the continuous 200 mm axial region or clinical hand/foot coverage. See [methods and numerical checks](docs/transverse-field-fov.md).

本地更新的场图默认使用“固定细节色标”，来自初始 Z=0、直径150 mm区域；改变FOV、切片或已计算设计不会自动改变色标。可主动重新适配当前图并继续锁定，或恢复初始值。“跨截面场强”固定使用初始九截面、直径200 mm范围。两种物理量分别保存色标，探针保留XY坐标，缩小FOV后仍可读取圆外位置。两者继续使用实际MATLAB导出的256色jet，原核对结果保持一致。[实际运行与显示对照](docs/matlab-field-display-audit.md)。

The local update defaults to **Locked detail scale**, taken from the initial Z=0 plane and 150 mm disk. FOV, slice and completed-design changes do not automatically rescale it. Fit current scale explicitly adapts and relocks it; Restore initial resets it. **Across slices** uses the initial nine planes over the full 200 mm disk. Quantities retain separate limits, and probes retain XY coordinates outside a smaller FOV. Both modes retain the actual MATLAB 256-color jet and the verified numerical results. See [actual runtime and display comparison](docs/matlab-field-display-audit.md).

本地版新增独立的三维圆柱评估：默认直径150 mm、长度200 mm，以等体积中点积分求体积平均 |B| 和总体标准差，侧壁、端面和轴线另外检查极值。“三维评估”页面仅展示与已计算设计一致的报告。`npm.cmd run analyze:cylinder` 按需离线生成两级加密报告，不加入构建或首次打开过程；`--fine` 可增加第三级。支持保存的设计JSON输入和离线报告载入。[三维评估与使用说明](docs/cylinder-field-fov.md)。

The local version adds an independent 150 mm diameter × 200 mm long cylinder assessment. Equal-volume midpoint integration estimates volume mean |B| and population standard deviation; separate sidewall, endcap and axis probes check extrema. The 3D assessment page only shows reports matching the completed design. `npm.cmd run analyze:cylinder` runs two offline refinement levels on demand; `--fine` adds a third. It is excluded from builds and browser startup, and accepts existing design JSON files. See [3D methods and usage](docs/cylinder-field-fov.md).

横向实验采用一屏内容页：场图与FOV、三维评估和公式推导通过点击切换。场图右侧有区域结果、轴向截面和FOV筛选；每页完整呈现，不靠区域内滚动。实际场强范围与固定色标范围分别显示，避免将颜色饱和理解为场差消失。公式推导从Maxwell方程、有限磁块两面解析积分和全阵列矢量叠加讲起，提供[完整双语推导](docs/field-derivation.md)。横向实验的保存与文件在独立窗口中操作。

The transverse experiment uses click-switched, single-screen pages: Map & FOV, 3D assessment and Derivation. Result/axial/FOV pages show complete active content without inner scrolling. Actual field extrema are distinct from locked color limits. The derivation covers Maxwell equations, finite charged-face integrals and full-array vector superposition, with a [complete bilingual document](docs/field-derivation.md). Save and file actions use a separate dialog in the transverse experiment.

工程参数待确认项集中记录在材料清单、对应步骤及 CAD 核对记录。章节封面为 Imagegen 示意图，操作场景使用 CAD 与磁铁数据；[视觉来源与生成提示](docs/teaching-visuals.md) 包含封面的完整提示。

Pending engineering parameters are recorded in the BOM, corresponding steps and CAD audit. The cover is an Imagegen illustration; operating scenes use CAD and magnet data.

---

以下保留 v16 实验台的原有说明 / Retained v16 laboratory documentation

# MRI Ring Explorer · 磁环实验台

**公开网页 / Public web app:** https://mri-nerdfeast.thosli611.chatgpt.site

这个 GitHub 仓库公开提供项目源文件，任何人都可以查看、下载或克隆，无需登录。点击 [下载 ZIP](https://github.com/lithos666/mri-ring-explorer/archive/refs/heads/main.zip)，解压后按下方说明安装并运行。
This repository is public. Anyone can browse, download or clone the project without signing in. [Download ZIP](https://github.com/lithos666/mri-ring-explorer/archive/refs/heads/main.zip), extract it, then follow the installation and running instructions below.

## 本地运行 / Run locally

需要 Node.js 22.13 或更高版本。
Requires Node.js 22.13 or later.

    git clone https://github.com/lithos666/mri-ring-explorer.git
    cd mri-ring-explorer
    npm ci
    npm run dev

开发页默认使用 http://localhost:5173 。构建并预览：
The development app runs at http://localhost:5173 . To build and preview:

    npm run build
    npm start

本副本没有原 Sites 项目的发布绑定。.openai/hosting.json 仅保留本地构建需要的空数据库/存储配置。公开网页仍由 Sites 托管；此仓库不是 GitHub Pages 静态产物。以后修改 GitHub 源码不会自动更新公开网页，需要另行发布。
This copy has no binding or credentials for the original Sites project. The live app is hosted with Sites. Changes pushed to this repository do not automatically update the live app.

保存设计使用当前浏览器的本地存储，访问者之间不会同步。需要合作编辑时，请下载设计 JSON 并交给同事导入。
Saved designs remain in each browser. Use the JSON download/import controls to exchange designs with colleagues.

磁场采用 MATLAB 几何与 Br＝1.43 T 的理想有限磁块计算模型；并非实测场、工程验收或临床设备认证。完整数据、模型假设、验证及文献说明见下文与网页资料面板。
The field uses supplied MATLAB geometry and Br = 1.43 T in an ideal finite-cuboid model, not measured device performance or clinical certification. Model assumptions, verification and references are documented below and in the app.

---

# 磁环实验台 · 两套 14 环 IO MRI 方案

中文交互式 MRI 原理与结构查看器。React、TypeScript、Three.js；Sites Worker 部署。当前版本 v16，中英双语。

## 方案与数据

界面顶部可选择“原方案”或“新版方案”。两套数据使用稳定的 MRIModel 实例与 React Context；切换时重建三维实例化网格、点击索引、选择状态及场数据读取，禁止修改共享模块级模型。

- 原方案：最初用户提供的 14 环径向顺序，54 个径向位置，MATLAB 确认圆周 14 次重复，共 756 块；朝外266、朝内266、轴向224。Weak140、Normal336、Strong280。采用 Small 脚本的 10 mm 方块、26 mm 轴向间距与逐环中心半径。
- 新版方案：用户 R–Z 图的 14 环径向顺序，62 个径向位置；本次圆环图已确认每层28列，合计1736块；朝外700、朝内700、轴向336。强度未标注，不沿用原方案类别。
- 新版第2/4/11/13环各6层，R05–R10为轴/轴/内、轴/外/轴、轴/外/轴、轴/内/轴、轴/内/轴、轴/轴/外。
- 全部轴向 N 极沿 −Z（绘图 −Y）指向 R01→R14。上下镜像时径向方向相反，轴向箭头仍向下。
- 首列相位6.428571°，28列等角度排列，使四条支架轴线位于列间；网页相对 MATLAB 原始坐标整体绕 Z 轴旋转90°，保留既有编号。
- 中心轴剖面的两侧属于同一整环：原方案108个位置，新版124个位置，不额外翻倍。
- 新图明确孔半径110mm、亚克力径向115–200mm、磁铁占据半径120–192mm、Lego支撑110–205mm。
- 120–192mm是占据范围而非中心位置。12mm方块、38mm环距、Z±247mm和各径向中心采用 Big MATLAB 数值声明；此前估读坐标已替换。MODEL_UNIT_MM=25只作等比例渲染换算。
- 两套方案均显示毫米坐标；梯度/RF继续为独立示意，Small 示意绕组按0.65比例缩小以适配孔径。

## 交互与视觉

白色页面与绘图背景，黑灰文字、蓝色操作状态，参考苹果官网的留白与克制界面。
所有磁铁均用红色N极半面与蓝色S极半面显示方向；默认开启当前环M箭头。磁感线B与磁铁M分开说明。

保留整体/单环/中心轴剖面/R–Z/当前磁场、旋转缩放平移、环间展开复位、点击唯一编号、逐环与全装置统计、排布清单、文献说明、独立梯度/RF开关及方案与成像对比。手机与无WebGL降级仍可选择两套方案、查看互动剖面及清单。

主数据 lib/mri.ts；上下文 lib/mri-context.tsx；视觉 app/globals.css 与 app/white-theme.css。
原图保存在 public/new-mri-reference.png（14环R–Z）和 public/new-mri-columns.png（28列及尺寸）。

## 参考场与对照

有限均匀磁化方块的解析极面积分；所有磁块使用脚本的 Br=1.43T；强度类别不额外改变幅值。在固定均匀磁化、回线磁导率约1下采用J≈Br，中心和探针转换为mT。
sourcesFor(model)按不可变模型对象缓存独立源，修改后的源不会复用旧场；layoutSources(layout,model)从同一基准派生全径向、轴向反转和环距+15%对照。
每套模型生成 field-data-original/latest.json 和 comparison-data-original/latest.json，包含schemeId、块数和几何签名。
场截面穿过当前首列；新版相位6.43°对应的场矢量与取点坐标作一致旋转。v8 使用完整三维网格与 RK4 积分；独立方向修改不再施加阵列对称性。
构建缓存另核对生成脚本与物理源码签名；任何相关几何或计算修改都触发重算。默认兼容数据文件指向新版。
客户端仅接收当前schemeId/count匹配的数据，卸载后的异步响应被忽略。按方案重建视图可避免旧实例容量和旧场混用。
热图保留固定初始中心场的相对色标，中心与探针显示理想mT计算值；材料退磁、铁轭、装配公差、温漂及实测性能未建模，没有临床合格结论。

## 开发与校验

需要Node.js≥22.13.0。

    npm ci
    npm run dev
    npm run build
    npx tsc --noEmit
    node --experimental-strip-types tests/model.test.ts
    node --experimental-strip-types tests/field.test.ts
    node --experimental-strip-types tests/comparison.test.ts
    node --experimental-strip-types tests/coils.test.ts

领域检查覆盖756/1736计数、对置配对、镜像与轴向符号、圆周相位、单位隔离、独立数值积分、远场极限、Maxwell空气区域、离散旋转对称、两套数据签名及轨迹方向、控制变量与成像公式。
浏览器检查包括两套方案全部视图与快速切换、真实三维点击/旋转、独立线圈开关、白色表面、390/320触屏布局、无WebGL降级及生产Worker读取。

开发默认localhost:5173；生产输出dist/server和dist/client。此副本的.openai/hosting.json仅保留空数据库/存储配置，不包含原网站的发布身份或凭据；测试截图/工具与凭据不纳入源码。

## 依据

IO结构、有限磁块和MRI原理参考网页资料面板列出的原始文献、MagTetris、Magpylib与OSI² ONE。具体排布和本次28列以用户资料为准。
设计参考：https://www.apple.com.cn/

## 中英双语
页首语言按钮支持中文 / English，覆盖两套方案、模型标签、清单、磁铁详情、磁场、梯度/RF说明与成像对比。选择保存在浏览器，刷新后保留；切换语言不重置当前方案、选中磁铁或3D视角。

## v8：逐块方向设计与当前磁场

支持用唯一编号选择任何磁铁，切换径向内/外、轴向上/下、切向±六个立方体主轴方向。90°旋转不改变方块占据范围；当前并不提供任意连续旋转或尺寸修改。
模型 θ 随圆周列编号增加，物理坐标为 (X,Y,Z)=(world.x,-world.z,world.y)，从 R01 端看 θ 顺时针。切+沿 θ 增加，不宣称是绕物理 +Z 的右手正角。

两套方案具有独立修改与100步撤销/重做历史。重置、导入、加载都可撤销。保存按钮把当前方案存放在当前浏览器；刷新后可明确点击加载已保存。JSON下载/导入支持跨设备或同事协作，验证schema、几何指纹、方案、唯一磁铁编号、方向、文件大小后才原子更新。

方向修改重新生成源，按固定几何有限均匀磁化方块解析式叠加。假设回线磁导率近似1、给定磁化强度固定，不含材料退磁、磁化反馈、铁轭、线圈通电场或临床性能。数字读数由完整解析求和，固定以初始方案中心场作参考，中心偏转、矢量差和三分量不会因修改后重新归一化而隐藏变化。

31³全三维网格、61²截面网格保存在指纹匹配的二进制基准资产。指纹数值仅舍入至1e−12以消除不同JS引擎三角函数最后位差异；实际磁铁源和解析运算不舍入。Worker用上次完成状态的Float64网格加实际改动磁块的精确差场；取消结果不提交缓存。生成器仅在旧原始指纹及规格完全核对通过时升级旧资产头，数据载荷不改变。

B轨迹用完整三维矢量插值与RK4积分，并逐段按解析场检查，保留方向cos夹角≥0.98的段；精度不足处截断。此数值绘图不是严格无散度网格离散。截面热图与箭头是三维场的采样投影，展示截面外分量，灰色虚线明确为三维轨迹投影。Worker版本与模型身份防止快速编辑时旧结果覆盖新设计。
线圈保持初始参考坐标，编辑导致主场偏转后需重新评估局部B₁垂直性与有效编码梯度。预设方案/成像对比继续使用明确标识的初始排布，和独立编辑结果区分。

新增校验：
    node --experimental-strip-types tests/design.test.ts
    node --experimental-strip-types tests/live-field.test.ts

覆盖单块不联动、旧源缓存回归、反极线性、两套历史隔离、保存/导入校验、解析差场和全求和一致、非对称三维轨迹逐段检查、截面场向量、位元一致重置与取消。

## v9：同屏编辑工作台
桌面工作台左侧保持3D/剖面预览与当前磁场反馈，右侧放置独立磁铁的位置、六方向、撤销/重做/重置/保存。文件操作、线圈控制、磁铁详情和统计改为展开区。手机在正常页面滚动时保留有高度上限的固定预览；短横屏退回正常流以保证内容可达。点击模型更新旁边的编辑器，不自动弹出遮挡操作的详情窗。物理计算、基准场、设计文件格式、两套方案的历史与保存规则不变。

## v11 · 在图上快速编辑 / Graph editing

默认排布编辑页提供可点选的14环剖面及所选环的14/28列正面径向图。点选、缩放、平移、环切换仅改变视图。右侧默认修改所选环和半径的整层圆周磁铁，可切换单块；方向状态与混合统计均来自实际数据。六方向按每块自己的圆周角生成磁化矢量，位置、数量和方块体积保持不变。

setDirections 批量修改原子提交；一次修改形成一个历史步骤，无变化不新增历史。统一方向覆盖该层差异，一次撤销恢复，范围外修改保留。旧 schemaVersion=1 JSON 与现有保存方式继续兼容。原有3D、对比、线圈及下方资料仍保留。

编辑图和全14环中心轴场截面同时显示。中心解析读数立即更新；网格与三维轨迹由 Worker 重算。色标与初始场参考固定。重算期间保留上一份完整场结果及其模型，明确标为上一结果并禁用旧图取点；完成后整体替换。方案切换不显示上一方案结果，过期 Worker 回复被丢弃。手机固定场预览，编辑图与控制在下方操作。

Physics is unchanged: analytical finite-cuboid superposition, equal fixed magnetization, full 3D vectors and trajectory checks. These are ideal relative-field experiments, not measured or clinically validated scanner performance. In v15, both geometries and repeat counts use MATLAB declarations, and main-field readouts use Br=1.43T under J≈Br.

Verification includes atomic group counts 14/28, all six local directions and opposite signs, geometry preservation, mixed edits and one-step undo/redo, no-op history, invalid batches, exact full-sum versus batch deltas, rotational covariance, Worker group/single edits, unchanged baseline reset, stale results, keyboard/touch, four viewport sizes and legacy file compatibility.

    node --experimental-strip-types tests/design.test.ts
    node --experimental-strip-types tests/live-field.test.ts

## v12 · 3D 首屏与手动计算 / 3D first, explicit computation

首屏改为整体3D装配，排布编辑位于第二个标签。编辑器新增非尺寸比例的大格排布板：桌面提供14环的径向层格子；手机提供44px环选择按钮与72px磁铁格子。可选择真实圆周列，混合层按全部实际磁铁统计。原有剖面、径向几何图及其缩放/平移保留。

修改方向、选择、切换图形、撤销、重做、重置和导入均不启动求场。只有点击“计算磁场 / Compute field”提交排布快照。计算途中仍可编辑；完成结果属于点击时的排布，之后的修改保持待计算。重新点击才提交新快照。中心读数、截面、探针与三维轨迹均使用同一完成结果；没有计算时不显示伪读数。3D仅在结果匹配当前排布时叠加场线。

状态用方向覆盖内容比较；撤销回已计算方向会恢复一致标记。切换方案清空旧图并终止旧Worker，过期结果不会覆盖另一方案。精确有限磁块求场、固定初始参考及旧schemaVersion=1设计文件不变；保存仍只保存方向。界面缩短常用文字，详细说明收进文件说明展开区。

The assembly is the initial view. Large, explicitly non-scaled editing tiles retain real magnet identities and local magnetization directions. Only Compute field launches a solve. Each result stays paired with the captured layout; later draft changes require another click. Geometry, analytical field calculations, baseline scale and legacy design files are unchanged.

验证覆盖无自动求场、计算中继续编辑、结果与独立完整解析求和一致、撤销/重做返回计算状态、方案切换取消旧任务、14/28整层与单块、混合方向、旧文件与保存、3D默认标签，以及1280×720、1024×768、390和320触屏布局及双语。

## v12.1 · 初始场自动载入 / Initial field without Compute

首次进入或切换方案时，自动载入完整初始场结果；初始场不启动浏览器Worker求解。两套结果由同一有限磁块解析叠加与三维轨迹求解器在构建阶段生成，验证来源签名、方案、数量、网格、数值与生成器版本后使用。中心指标、剖面及场线属于同一初始排布。

在初始资源载入前编辑时，资源仍绑定初始模板，草稿保持待计算。手动点击计算会中止初始载入，避免迟到资源覆盖手动结果或计算状态。修改、撤销、重做、重置、导入仍不启动求解；只有明确点击计算才求修改后的场。

Both schemes load their precomputed full initial 3D field without a Compute click or an initial Worker solve. Editing remains manual. Delayed template loads cannot overwrite explicit calculations, and every result stays paired with its captured layout.

验证包括初始载入无Worker求解、切换两套方案、载入前编辑、载入与手动计算竞态、失败后按钮重试、结果来源核对、数组无损还原、完整解析中心场与网格一致，以及电脑端双语界面。

    node --experimental-strip-types tests/initial-field.test.ts

## 2026-10-08 · 主磁场公式核查

修复磁极面半个 M 项的边界取值、很小非零面距及共面延长线极限。初始场和基准网格升级为记录内核版本的 v2 空气域缓存：材料节点屏蔽，增量更新必须保持相同占据几何。热图和色标透明度一致，近零截面外分量不显示虚假方向，虚线投影说明保持可见。

两套完整阵列与独立 Magpylib 5.2.3 求和、单磁块表面积分、极面连续性和空气区 Maxwell 检查通过；缓存对照误差符合 Float32 存储精度。完整方法、数值证据及尚未验证的范围见 [physics-validation.md](docs/physics-validation.md)。v15 已采用 MATLAB 几何与 Br=1.43T 给出理想mT预测，仍需材料回线与实测场图验证。

## v15 · MATLAB 参数 / MATLAB calibration

网页源码在根目录；7个原MATLAB程序在 `matlab/`。用户的 `matlab/hackathon_big/` 优化数据仅保留本地，不与两套14层方案混用。Small与Big初始中心分别32.263526452mT、37.343568936mT，均沿设备+Z。原始注释中的均匀性数值与当前声明重算结果不一致，保留注释并记录差异。详见 [matlab-parameters.md](docs/matlab-parameters.md)。

Web source is at the root; MATLAB programs are in `matlab/`. Geometries and Br are taken from the supplied declarations. Center and probe readouts show ideal mT predictions. Old schema-v1 orientation files migrate by stable magnet ID with an explicit geometry notice; new exports use the current signature. Initial fields load automatically; editing still requires Compute.

    node --experimental-strip-types tests/calibration.test.ts

## v16 · 磁铁边缘尺寸图 / Magnet surface dimensions

新版方案的工作区下方增加双语尺寸图，随页首语言按钮切换。可打开大图，或下载当前语言的 PNG / SVG。图中标注磁铁径向面的半径、径向面间净距及轴向端面坐标，不标注中心距离。尺寸来自 `matlab/GenerateIORingHackathonBig_37mT.m` 的当前数值声明；源 SHA-256 为 `b9720c11f6b21a413fc11433f13e519d621103196caa48e38dcdad7b77c19b8c`。

14 个轴向层、每层 28 圆周列、62 个径向位置，共 1,736 块；磁块名义尺寸 12×12×12 mm。相邻层磁铁端面净距 26 mm，最外两端面距离 506 mm。径向面包络 120–192 mm；包含切向角点的实际最大圆柱半径约 192.094 mm。径向净距为 0 的位置表示磁铁贴面，不能解释为已留隔墙。

图上的磁化箭头显示 MATLAB 初始方向；方向编辑保持尺寸和位置不变。图片是名义磁铁几何，不含槽加工余量、公差、胶层和隔墙设计。旧方案有独立尺寸，因此不显示本新版尺寸图。资产在 `public/diagrams/mri-14-layer-edge-dimensions-{zh,en}.{svg,png}`。

The new configuration includes a bilingual surface-dimension diagram below the workbench. The language switch also changes the drawing and its full-size / PNG / SVG links. Labels show radial face positions, face-to-face gaps, and axial end-face coordinates. The 12 mm cubes repeat in 28 columns across 14 axial layers, totaling 1,736 magnets; adjacent axial faces are 26 mm apart and the overall axial extent is 506 mm. Zero radial gaps mean touching faces. Arrows show the initial MATLAB orientations; direction edits do not move or resize magnets. Slot clearance, tolerances and separating walls are not specified. This diagram is not shown for the original configuration.
