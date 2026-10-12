# 本地教学版 CAD 核对记录 / Local teaching CAD audit

适用版本：新版 14 层、28 列、1,736 颗 12 mm 磁铁。核对输入为 `new_generation_prototype/模型`、同目录打印与放置说明，以及项目 MATLAB 文件；原始参考下载按字节保留，新增紧固件示意独立标注。每个文件的 SHA-256、大小和对应步骤列于 `lib/cad-manifest.json`。

## 真实零件实例及单位

- 每层 STEP 包含完整圆环的 **4 个底座实例和 4 个盖板实例**。十四层合计为 **56 个底座实例、56 个盖板实例**。这是 CAD 中观察到的实例数量，采购与打印发行清单仍须确认。
- R01/R14 各有 16 个短螺丝实例，R03/R12 没有短螺丝几何，其余十个层文件各有 15 个短螺丝实例，源 CAD 合计 **182 个短螺丝实例**。不能从这个数推定采购数量，也不能自动补齐缺失的螺丝。
- `surport.step` 包含 **2 个侧支撑和 1 个底部支撑**；`support_layer.step` 包含 **4 个 14 × 14 × 18 mm 定位块实例**。这些独立参考文件不能直接推算一台磁体的支撑、定位件采购数量。
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
4. 用户已确认壳体盖板、透明盖板与壳体之间使用 **M3 螺丝，不使用 M3 螺母**。CAD 螺丝名称仍为 `2.9×16 BF`；已有参考图标记 `M3×18`，仅作为原始参考保留。M3 螺纹用途已确认，长度、数量和扭矩仍待确认；不能把参考图中的 18 mm 自动设为采购长度。
5. 用户已确认层间连接使用 **M6** 螺杆和螺母，装配不使用 M10。原 M10 图片已退出网站下载目录及发布文件，没有重新标成 M6。定位块给出的四条轴线仍是孔轴候选；M6 是确认的螺纹规格，不等于已测量的孔径。杆长、孔隙配合、材料、垫片配置和采购数量仍待确认。贯穿杆在十四层全部就位后最后插入。
6. 26 mm 是相邻层磁铁端面的净距；不能将其当作支撑件厚度。定位块 CAD 厚度是独立测得的 18 mm。
7. 用户指定 **`prototypev4.3mf` 为当前教学打印版本**；`prototypev0`–`prototypev3` 已退出网站目录与发布副本，用户本地原件保留。其他侧支撑、层间支撑、holder v1 和 layer1 打印参考继续保留。`layer1.3mf` 不代表已经取得全部十四层的打印发行包。
8. BOM 已补入铝型材 **L 型角码、连接螺栓及 T 型槽螺母**，并提供独立用途示意图。角码孔距、外形尺寸、数量以及铝型材切割清单仍未确认；型材连接螺栓与 T 型槽螺母的螺纹、槽系列和材质待确认，不直接套用层间 M6。示意图不能作为加工图。本次未取得框架 CAD、紧固扭矩或经验证的插入夹具。

## 当前材料与资料展示状态

磁铁按用户确认的 **N52 牌号 NdFeB** 标识，尺寸为 12 × 12 × 12 mm，共 1,736 颗；此材料名称不自动改变现有 Br = 1.43 T 的求场输入。分段磁铁壳体、壳体盖板和框架安装支撑的材料按当前打印文件设置显示为 PLA；层间隔块显示为 PETG，均明确标为打印配置依据、实际制造材料待确认。透明盖板为亚克力（PMMA），框架为铝且合金牌号待确认。紧固件与角码材料未确认，清单保留待确认状态。

框架安装支撑对应 `surport.step` 的左、右及底部支撑，连接磁环与铝导轨；层间隔块对应 `support_layer.step`，位于相邻层组件之间。两者在 BOM 提供零件模型及安装位置视图，稳定内部编号继续保留为 `ring-support` 与 `locator`。

当前 BOM 为 13 类物料，删除收料记录界面和 M3 螺母条目。Resources 提供 31 项当前 CAD、打印与排布/尺寸下载；6 项紧固件参考从对应 BOM 详情下载。原 7 份 MATLAB 代码与发布副本逐字节保留，目录标记 `hidden` / `pending-update`，教学网页显示待更新状态且不再提供旧下载入口。收到新版文件后再另行核对；现有求场继续使用已核对模型。

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

All 28 slot columns register to the same MATLAB physical azimuth lattice. Cube centers remain at the MATLAB radii and at local Z=9 mm. The R05/R10 outer pocket has a **0.2 mm nominal inner-wall interference**; the model deliberately preserves and reports this discrepancy. M3 hardware joins the cover, acrylic and base; M6 hardware connects the layers. Through-rods are inserted after all fourteen layers have been positioned. Thread usage is confirmed, but lengths, clearances, quantities and tightening specifications remain pending. Only prototype v4 is published; earlier prototype copies and the obsolete M10 illustration are withdrawn without deleting the user's original files. Independently identified acrylic geometry, frame fabrication data, fixtures and fastening parameters remain pending. Animated motion is instructional, and does not validate mechanical forces or a physical assembly procedure.
