# 本地教学版 CAD 核对记录 / Local teaching CAD audit

适用版本：新版 14 层、28 列、1,736 颗 12 mm 磁铁。核对输入为 `new_generation_prototype/模型`、同目录打印与放置说明，以及项目 MATLAB 文件；原始参考下载按字节保留，新增紧固件示意独立标注。每个文件的 SHA-256、大小和对应步骤列于 `lib/cad-manifest.json`。

## 真实零件实例及单位

- 每层 STEP 包含完整圆环的 **4 个底座实例和 4 个盖板实例**。十四层合计为 **56 个底座实例、56 个盖板实例**；用户现已独立确认 BOM 数量为各 56 件（4 × 14）。
- R01/R14 各有 16 个短螺丝实例，R03/R12 没有短螺丝几何，其余十个层文件各有 15 个短螺丝实例，源 CAD 合计 **182 个短螺丝实例**。不能从这个数推定采购数量，也不能自动补齐缺失的螺丝。
- `surport.step` 包含 **2 个侧支撑和 1 个底部支撑**；用户独立确认整台数量为 28 件侧支撑与 14 件底部支撑。`support_layer.step` 包含 **4 个 14 × 14 × 18 mm 方块实例**，属于历史参考；当前已确认为 32 件（4 × 8）、长 18 mm、中心通 M6 的圆柱打印件。旧方块 CAD 不代表新圆柱外形或全部安装位置。
- `new_genneration.step` 包含 2 个扇形底座和 1 个盖板变体，**不是完整十四层磁体**。
- 导入 OCCT 使用 `linearUnit: millimeter`，三角化公差 0.15 mm、角度公差 0.35 rad。底座厚 15 mm，盖板轴向范围为底座背面起 13–20 mm，盖板厚 7 mm。磁铁槽底位于背面起 3 mm，因此 12 mm 方块的中心为局部 Z=9 mm。

## 坐标与几何注册

R01、R14 是独立 XY 平面模型；R02–R13 位于源 CAD 的 YZ 平面，带有装配世界坐标和平移。生成的 GLB **保留源 STEP 世界坐标、毫米单位和每个零件身份**。场景使用清单中的 `sourceToCanonical` 正交刚体矩阵一次性注册，不按包围盒缩放，不重复阵列已经存在的四个实例。

典型源平面槽列相位为：R01/R14 6.20689655°，其余层 −0.22167488°。现有 MATLAB 显示坐标中的 A01 物理角度为 −6.42857143°。按 12.85714286° 周期选择最小刚体相位校正：R01/R14 +0.22167488°，其余层 −6.20689655°。注册后所有槽列匹配同一 28 列晶格；每块磁铁仍按 MATLAB 实际半径和初始方向放置。

源 `surport.step` 与定位块保留原始 YZ 平面的配合关系。其共同注册背面参考为源 X=455.9540838347 mm，即 R02 底座背面 +38 mm 的 R01 理论背面位置。支撑轴向范围注册后 −9–29 mm；定位块为 −18–0 mm，对应相邻层完整组件之间的空隙。R01/R14 的独立 XY 文件没有编码与支撑共同的装配世界坐标；槽列相位只能限定旋转到一列周期内，不能证明这两层外缘支撑缺口已配合。因此其支撑配合关系仍标记待确认。

## 尚不能作为制作图的事项

1. **R05/R10 最外侧槽名义干涉 0.2 mm。** CAD 槽底径向区间约 169.2–181.4 mm，而 MATLAB R=175 mm 的 12 mm 方块径向面为 169–181 mm。内侧槽壁存在约 0.2 mm 名义干涉。网页不挪动磁铁、不缩小磁铁来隐藏该差异；加工或打印前需修订槽位、公差或确认数据版本。
2. 其余层名义槽底包含对应磁铁径向面，但这是名义几何检查，不代替打印公差、曲面/完整碰撞、装载夹具和实物配合检查。
3. 未在提供的 STEP 中独立确认亚克力实体。页面的透明亚克力滑入演示是关系示意；厚度、分段、路径与最终加工文件仍需确认。
4. 用户已确认壳体盖板、透明盖板与壳体之间使用 **M3 螺丝，不使用 M3 螺母**；每层 32 个，整台 **448 个**。CAD 螺丝名称仍为 `2.9×16 BF`，共 182 个几何实例，仅是历史展示；参考图 `M3×18` 不确立安装长度。长度、材料和扭矩仍待确认。
5. 用户已确认整台 **8 根 M6 贯穿螺杆、8 个 M6 螺母**，装配不使用 M10。原 M10 图片已退出网站目录与发布副本。旧定位块只给出四条候选孔轴，未确立全部八根的位置；M6 螺纹不等于实际孔径。杆长、孔隙配合、材料、垫片配置和扭矩仍待确认，数量不再待确认。贯穿杆在十四层全部就位后最后插入。
6. 当前圆柱隔块数量 **32（4 × 8）**；新提供的 `层间隔块.step` 确认名义长度 **18 mm**、外径 **14 mm**、通孔直径 **6.2 mm**。实际制造公差、M6 配合和安装分布仍需实物核对。26 mm 是磁铁端面净距，不能当作隔块厚度。旧方块 CAD 与 3MF 保留并明确标为历史参考。
7. 用户指定 **`prototypev4.3mf` 为当前教学打印版本**；`prototypev0`–`prototypev3` 已退出网站目录与发布副本，用户本地原件保留。其他侧支撑、层间支撑、holder v1 和 layer1 打印参考继续保留。`layer1.3mf` 不代表已经取得全部十四层的打印发行包。
8. 用户确认铝型材 **框架、L 型角码、连接螺栓及 T 型槽螺母均由官方提供**。BOM 用供应状态代替待确认数量，不推定数量；具体外形、槽系列、螺纹与材料按提供物料核对，不直接套用层间 M6。用途示意图不是加工图，现有模型不提供切割清单或紧固扭矩。

## 当前材料与资料展示状态

磁铁按用户确认的 **N52 牌号 NdFeB** 标识，尺寸为 12 × 12 × 12 mm，共 1,736 颗；此材料名称不改变 Br = 1.43 T 的求场输入。壳体、盖板和框架安装支撑的 PLA 来自当前打印文件设置，实际制造材料待确认。圆柱隔块未提供新打印文件，历史方块文件设置为 PETG，不等于新圆柱的确认材料。透明盖板为 PMMA，框架为铝且合金牌号待确认。紧固件与角码材料仍待确认。

框架安装支撑在 BOM 中分别使用新提供的 `左右.step` 与 `下面.step`，展示侧支撑 28 件和底部支撑 14 件；单件图片与交互 3D 均由同一 STEP 生成。新文件未提供完整装配注册关系，故不把旧 `surport.step` 的安装位置当作新零件的已验证位置。层间隔块使用 `层间隔块.step` 的圆柱几何，旧 `support_layer.step` 只作历史接口参考；圆柱安装位置尚未确认，因此不提供隔块安装位置按钮。稳定编号保留为 `ring-support` 与 `locator`。

## 2026-10-13 用户确认的整台 BOM

分段磁铁壳体 56（4 × 14）、壳体盖板 56（4 × 14）、透明盖板 56（4 × 14）、框架支撑 42（侧支撑 28 + 底部 14）、圆柱层间隔块 32（4 × 8）、贯穿螺杆 8、M3 短螺丝 448（32 × 14）、M6 螺母 8。L 型角码、铝型材框架、型材连接螺栓及 T 型槽螺母由官方提供。清单、详情及双语 CSV 共用这些数量、数量构成与供应状态；不从 CAD 实例数反推采购数量。

当前 BOM 为 13 类物料，删除收料记录界面和 M3 螺母条目。Resources 提供 31 项当前 CAD、打印与排布/尺寸下载；6 项紧固件参考和本次 3 项零件 STEP 从对应 BOM 详情下载。原 7 份 MATLAB 代码与发布副本逐字节保留，目录标记 `hidden` / `pending-update`，教学网页显示待更新状态且不再提供旧下载入口。收到新版文件后再另行核对；现有求场继续使用已核对模型。

## 卡扣与闭环演示路径

对 R01 底座接口逐面检查：左上扇形 `base-02` 的槽形母接口与右上扇形 `base-05` 的舌形公接口具有对应的倒扣截面。源坐标沿 Y=120–205 mm 径向延伸，截面大致位于 X=−3.5–0 mm、Z=1.3–11.7 mm；公接口外缘约 X=−3.4 mm。该关系支持 **沿径向轨道轴滑入**，不支持斜向横穿倒扣槽壁。第一阶段保持母接口不动，让公接口所在扇形先沿共享接缝径向移出，再沿同一轴滑入。

最后两处闭合接口分别沿 X=120–205 mm 和 X=−205–−120 mm 延伸。在正 X 接口，下半环是公接口、上半环是母接口；负 X 接口的公母关系相反。因此，保持上半环不动，将同一个下半环先沿正 X 轴移出、再沿负 X 轴滑回，可让两处接口分别从其开放端进入。沿 Y 轴对推半环则会横穿倒扣壁，网页不使用这种路径。

以上轴经过与零件相同的刚体注册，保存于每层 `jointGuide.direction` 与 `closureGuide.direction`。R01/R14 的拼接轴角为 90°+相位校正，闭环轴为相位校正；其余层源 CAD 在 YZ 平面旋转了 45°，拼接轴为 135°+相位校正，闭环轴为 45°+相位校正。

**100 mm 只是动画中的临时分离行程**，用于让长 85 mm 的径向接口起始时可见、脱离。它不是插入深度、采购规格、夹具行程要求或允许强行滑动的依据。这些路径只验证理想刚体的几何轴向关系，尚未验证打印公差、磁吸力、实际装载顺序、约束与夹具。完成实物装配仍需实际检查。

## 复现与验证

预生成的 GLB 已包含在本地项目中，普通 `npm.cmd run dev`/构建不需要安装 CAD 转换器。若需转换更新后的 STEP，单独安装 `occt-import-js`，然后运行 `node scripts/generate-assembly-assets.mjs --source=<new_generation_prototype目录> --toolkit=<occt-import-js.js路径> --matlab=<项目matlab目录>`。转换器仅用于离线准备，不向浏览器发送 STEP/WASM。

仅更新下载清单时使用 `node scripts/refresh-teaching-resources.mjs --source=<new_generation_prototype目录>`；它重新核对资源大小和 SHA-256，默认保留现有发布 STEP 文件，避免源目录中的新草稿与当前已转换模型不一致。明确核对过新 CAD 后才可使用 `--update-cad-references` 更新参考文件；正式发布前还须同步转换和核对场景模型。完整 CAD 转换入口继续按新输入更新参考文件。两种入口共用资源展示规则，均只发布 prototype v4，并保留 MATLAB 待更新及紧固件仅在 BOM 展示的策略，不会重新加入旧版本或 M10 图片。本次核对的 7 个 MATLAB 程序与用户项目目录逐字节一致，保持原样。

2026-10-13 资料刷新发现源 `new_genneration.step` 已于 2026-10-12 17:09:53 重存为 166,823,709 字节，并增加 PROCESS_PLANNING_SCHEMA 与大量实体，不能视为时间戳变化。当前发布继续保留与已转换模型一致的 286,529 字节模板（SHA-256 `e7ddf592048db9ac1b64ceb88d0cc1dd50e3b486816f9faa0a6d0b1cb5be786d`）；用户新源文件未改动，留待后续设计更新核对。

`node --experimental-strip-types scripts/test-assembly-assets.mjs` 检查十四层身份、毫米单位、正交刚体矩阵、56/56/182 CAD 实例数、28 槽列对齐、实际 MATLAB 磁铁计数、下载完整性和 R05/R10 已知名义差异。零件运动演示不计算装配力、磁吸力或真实夹具限制；完成勾选需由参赛者实际检查。

## English handoff

The local teaching assets retain STEP world coordinates in millimetres and apply one proper rigid transform per layer. Each layer contains four actual base and four cover instances; never duplicate them as if the file were a single quadrant. The fourteen files contain 56 base, 56 cover and 182 short-screw instances. These are CAD observations, not released procurement quantities.

All 28 slot columns register to the same MATLAB physical azimuth lattice. Cube centers remain at the MATLAB radii and at local Z=9 mm. The R05/R10 outer pocket has a **0.2 mm nominal inner-wall interference**; the model preserves this discrepancy. Confirmed one-magnet BOM quantities are 56 housings, 56 caps, 56 clear covers, 42 mounting supports (28 side + 14 bottom), 32 cylindrical spacers (4 × 8), 8 M6 rods, 448 M3 screws and 8 M6 nuts. The organizers provide the extrusion frame, L-brackets, extrusion bolts and T-slot nuts. The supplied spacer STEP defines an 18 mm length, 14 mm OD and 6.2 mm through-hole; manufacturing fit and full mounting distribution remain unverified. Old block-shaped spacer CAD/3MF remain explicitly labeled historical references. Four old candidate rod axes do not establish all eight positions. Hardware lengths, materials and tightening specifications still require confirmation. Through-rods are inserted last. Only prototype v4 is published; original files and magnetic calculations are preserved.

## 本次独立 BOM CAD / Supplied BOM CAD

输入位于 `G:/OneDrive/桌面/MRI/new_generation_prototype/模型`，名称为 `层间隔块.step`、`左右.step` 和 `下面.step`。源文件保持原样。`lib/bom-cad-assets.json` 记录源文件与预览的 SHA-256、毫米包围盒和刚体变换；`public/bom/cad/` 保存三份独立 GLB 和四张白色背景渲染图。圆柱直径取 STEP 的解析圆柱面，避免用离散三角网格包围盒近似圆直径。

这三个零件仅更新 BOM 的单件展示与关联下载。整体装配场景、注册矩阵、磁铁位置和磁场求解器不变。示意材质用于辨认形状，不确立制造材料；完整装配坐标和实物配合仍需另行核对。

复现命令：`node scripts/generate-bom-cad-assets.mjs --source=<模型目录> --toolkit=<occt-import-js.js路径> --browser-toolkit=<playwright/index.mjs路径>`。普通启动与构建直接使用已生成资产。资源刷新会校验源文件与预览的来源哈希，不会将同名的新草稿静默替换为当前示意图的下载文件。

The three provided STEP parts drive both the BOM images and isolated interactive models. Their original geometry and millimetre dimensions are retained; only a rigid centring transform is applied. The complete assembly and magnetic calculations are unchanged. The previews use illustrative polymer materials and do not certify manufacturing fit or installed coordinates. This update is local only; no repository push or deployment was performed.
