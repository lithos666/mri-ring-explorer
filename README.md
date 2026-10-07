# MRI Ring Explorer · 磁环实验台

**公开网页 / Public web app:** https://mri-ring-explorer.thosli611.chatgpt.site

这个 GitHub 仓库保存私有源码，只有获授权的成员可以访问。使用网页不需要取得仓库权限。
This repository stores private source code. Anyone can use the public web app; repository access is limited to authorized collaborators.

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

磁场为归一化有限磁块的理想计算模型；并非实测场、工程验收或临床设备认证。完整数据、模型假设、验证及文献说明见下文与网页资料面板。
The field is an ideal normalized finite-cuboid model, not measured device performance or clinical certification. Model assumptions, verification and references are documented below and in the app.

---

# 磁环实验台 · 两套 14 环 IO MRI 方案

中文交互式 MRI 原理与结构查看器。React、TypeScript、Three.js；Sites Worker 部署。当前版本 v10。

## 方案与数据

界面顶部可选择“原方案”或“新版方案”。两套数据使用稳定的 MRIModel 实例与 React Context；切换时重建三维实例化网格、点击索引、选择状态及场数据读取，禁止修改共享模块级模型。

- 原方案：最初用户提供的 14 环径向顺序，54 个径向位置，圆周暂按 14 次重复，推算 756 块；朝外266、朝内266、轴向224。Weak140、Normal336、Strong280。边长0.8、间距1.2、径向4–8均为无单位示意。
- 新版方案：用户 R–Z 图的 14 环径向顺序，62 个径向位置；本次圆环图已确认每层28列，合计1736块；朝外700、朝内700、轴向336。强度未标注，不沿用原方案类别。
- 新版第2/4/11/13环各6层，R05–R10为轴/轴/内、轴/外/轴、轴/外/轴、轴/内/轴、轴/内/轴、轴/轴/外。
- 全部轴向 N 极沿 −Z（绘图 −Y）指向 R01→R14。上下镜像时径向方向相反，轴向箭头仍向下。
- 首列按图相位约6.43°，28列等角度排列，使四条支架轴线位于列间；精确角度尚待工程图确认。
- 中心轴剖面的两侧属于同一整环：原方案108个位置，新版124个位置，不额外翻倍。
- 新图明确孔半径110mm、亚克力径向115–200mm、磁铁占据半径120–192mm、Lego支撑110–205mm。
- 120–192mm是占据范围而非中心位置。约12mm方块、38mm环距、Z±247mm和各径向中心仍为读图估计；边缘中心约126–186mm。MODEL_UNIT_MM=25仅作等比例渲染换算。
- 原方案不显示毫米坐标；梯度/RF继续为独立示意，不从图片猜测绕组工程参数。

## 交互与视觉

白色页面与绘图背景，黑灰文字、蓝色操作状态，参考苹果官网的留白与克制界面。
所有磁铁均用红色N极半面与蓝色S极半面显示方向；默认开启当前环M箭头。磁感线B与磁铁M分开说明。

保留整体/单环/中心轴剖面/R–Z/当前磁场、旋转缩放平移、环间展开复位、点击唯一编号、逐环与全装置统计、排布清单、文献说明、独立梯度/RF开关及方案与成像对比。手机与无WebGL降级仍可选择两套方案、查看互动剖面及清单。

主数据 lib/mri.ts；上下文 lib/mri-context.tsx；视觉 app/globals.css 与 app/white-theme.css。
原图保存在 public/new-mri-reference.png（14环R–Z）和 public/new-mri-columns.png（28列及尺寸）。

## 参考场与对照

有限均匀磁化方块的解析极面积分；所有磁块使用相同归一化磁化幅值，强度类别没有转换为虚构剩磁数值。
sourcesFor(model)按不可变模型对象缓存独立源，修改后的源不会复用旧场；layoutSources(layout,model)从同一基准派生全径向、轴向反转和环距+15%对照。
每套模型生成 field-data-original/latest.json 和 comparison-data-original/latest.json，包含schemeId、块数和几何签名。
场截面穿过当前首列；新版相位6.43°对应的场矢量与取点坐标作一致旋转。v8 使用完整三维网格与 RK4 积分；独立方向修改不再施加阵列对称性。
构建缓存另核对生成脚本与物理源码签名；任何相关几何或计算修改都触发重算。默认兼容数据文件指向新版。
客户端仅接收当前schemeId/count匹配的数据，卸载后的异步响应被忽略。按方案重建视图可避免旧实例容量和旧场混用。
仅显示相对场与理想控制变量结果；材料退磁、铁轭、装配公差、温漂及实测性能未建模，没有临床合格结论。

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

开发默认localhost:5173；生产输出dist/server和dist/client。GitHub 副本的 .openai/hosting.json 不含项目 ID；测试截图、工具状态与凭据不纳入源码。

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

## v10：编辑与辅助信息分区
右侧只保留磁铁方向修改和文件与设计说明。显示与线圈、当前磁铁与磁环、14 环排布位于工作区下方，可按需展开；桌面编辑与实时预览仍在同一屏幕。
