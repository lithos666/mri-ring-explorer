# 横向磁场与 FOV / Transverse field and FOV

横向实验现有“场图与FOV／三维评估／公式推导”三个内容页；场图右侧的区域结果、轴向截面和FOV筛选通过点击切换。常用读数和操作保持一屏可见。当前区域的实际最大最小值及场差单独列出，固定色标只表示颜色映射范围。初始Z=0的D150 Bz场差为0.013886403692 mT（371.777 ppm），D200为4.070096431688 mT（110,128.242 ppm）；扩大FOV后，色标外的蓝色不能被理解为相同场强。[完整数学推导](field-derivation.md)。

The transverse workspace uses click-switched Map & FOV, 3D assessment and Derivation pages. Actual extrema and variation are shown separately from locked color limits. In the initial Z=0 Bz map, D150 varies by 0.013886403692 mT while D200 varies by 4.070096431688 mT. Saturated blue is not a claim of identical field strength.

教学版提供设备 XY 横向场图。使用已核对的有限磁块解析场，对完整 14 层、1,736 块磁铁求三维矢量和；不从原纵向截面插值，也不修改 MATLAB、磁铁位置或 Br = 1.43 T。设备坐标与既有网页一致：`(X,Y,Z)=(world.x,-world.z,world.y)`，是一组正交旋转。网页与 MATLAB 的整个阵列观察坐标相差 90°，圆形区域及正方形网格的统计不受该转动影响。

## 轴向探索与近中心核对

现在提供两个独立采样范围，切换范围不会修改磁铁排布：

- **宽范围 ±100 mm**：Z = −100、−75、−50、−25、0、25、50、75、100 mm，共九个 XY 截面，每隔 25 mm；默认逐层查看 Z=0，不提供跨这九层的平均图。默认色标锁定为初始Z=0、直径150 mm的范围；跨截面场强模式则锁定初始九截面、完整直径200 mm的范围，两者均不随FOV变化。
- **MATLAB ±2 mm**：保留原始五个截面 −2、−1、0、1、2 mm、逐点平均及单层查看，保持原脚本的核对语义和数据不变。

原五层只覆盖 4 mm。初始排布的中心场从 Z=0 的 37.3435689364 mT 到 Z=±2 的 37.3434462426 mT，仅相差约 3.286 ppm；这是真实的小变化。更宽范围能显示轴向变化：

| \|Z\| / mm | 中心 \|B\| / mT | 相对 Z=0 |
|---:|---:|---:|
| 0 | 37.3435689364 | 0% |
| 25 | 37.3139860421 | −0.079218% |
| 50 | 37.0532687834 | −0.777377% |
| 75 | 35.8183354208 | −4.084327% |
| 100 | 32.2594489247 | −13.614446% |

初始 IO 排布具有轴向镜像对称性：相同 (X,Y) 下，+Z 与 −Z 的 Bz、\|B\| 相同，横向分量反向；图像相同符合物理规律。修改磁铁方向后，设计可能不再对称。离轴场的变化并不单调，不能把中心曲线当作整个圆内的场差。

宽范围的 FOV 筛选对**全部九个截面的原始 \|B\|**求极值；MATLAB 范围仍对全部五个截面求极值。两种结果的轴向采样范围不同，不能互相替代。九个离散截面不是对整个 200 mm 轴向长度的连续均匀性证明；真正的三维成像 FOV 还需指定半径和轴向长度、加密采样并结合实测及 RF/梯度覆盖。

## 采样与 MATLAB 对照

两种范围的 XY 网格均为 1 mm，X/Y 各 −100…100 mm（201 × 201）；只使用半径 100 mm 内的空气节点。各实际 Z 平面均求完整 Bx、By、Bz。记录 Float64 的 mT 值，避免 Float32 舍入影响较小的 ppm 差异。图形可选择轴向分量 Bz 或场强 |B|。下面的五平面平均与核对数值专指 MATLAB ±2 mm 范围。

默认 FOV 直径 150 mm，对应 MATLAB 的 `Fov_half = 75`。MATLAB 对照图先对五个平面的 Bz 逐点平均，再在所选圆内取闭区间节点统计；它不是对整个三维区域先统计再平均。平均 |B| 模式取各平面的场强均值，不等于先平均矢量再取模。

显示图的统计采用：

- 平均值：`mean = sum(B)/N`。
- 峰峰值：`(max(B)-min(B))/abs(mean) × 10^6 ppm`。
- 标准差：`sqrt(sum((B-mean)^2)/(N-1))/abs(mean) × 10^6 ppm`，与 MATLAB 默认 `std(B)` 一致。

每项统计注明所显示的物理量和切片。分母接近零时不显示有意义的相对 ppm。标准差不称为某个厂家定义的 RMS 指标。

| 初始排布、直径 150 mm | 计算值 |
|---|---:|
| 圆内 XY 节点 | 17,665 |
| 五个平面未经平均的采样点 | 88,325 |
| 五平面平均 Bz 的圆内均值 | 37.35148119965367 mT |
| 同一图的峰峰 / 均值 | 384.8994687538178 ppm |
| 同一图的样本标准差 / 均值 | 86.7438082958702 ppm |
| 五平面所有场强的峰峰 / 均值 | 399.2615572546429 ppm |
| 五平面所有场强的峰峰 / 中心场强 | 399.3461519429985 ppm |
| 单独 Z=0、X=Y=0 的 Bz | 37.343568936442715 mT |

这些值与此前独立 Magpylib / MATLAB 八角点方法核算的区域统计一致。原脚本注释中的 168.646099 ppm 与当前数值声明的重算结果仍不同；网页采用重算值，不覆盖原注释。

## FOV 筛选

直径可调20–200 mm，5 mm一档。调直径只改变采样区域、图形遮罩和统计，不改磁铁或重新求场。默认“固定细节色标”来自**初始排布、Z=0、直径150 mm**的真实极值；Bz与 |B| 独立保存范围。改变FOV、切片或已计算设计时不自动重设色标。“重新适配色标”主动使用当前已完成图、切片和FOV的极值，然后继续锁定；“恢复初始色标”恢复对应物理量的初始值。“跨截面场强”固定使用**初始九截面、完整直径200 mm**的极值，即使在MATLAB模式也保持相同参考。两种模式均保留实际MATLAB的256色jet，不改变磁场数组、统计或求场状态。超范围颜色饱和，读数不截断。

探针仅保存真实XY网格坐标；FOV缩小后仍可读出圆外点并标注“当前区域外”。切换单截面时保持XY，Z跟随所选平面且明确显示；平均图标为平均值探针。读数从对应的已完成结果取得，不保存过期的value，更新期间明确是上一结果。显示设置由实验台持有，切换教学板块或3D/场图视图后仍保留。

The default detail scale is locked to the initial Z=0, D150 plane. Fit current scale explicitly relocks the current completed plot; Restore initial resets the selected quantity. Across slices always uses the initial nine planes over D200. FOV changes preserve both point values and locked colors. Probes retain XY outside a smaller ROI, read the current completed map, and label their Z or averaging definition.

另外提供独立的[三维圆柱评估](cylinder-field-fov.md)，默认D150×L200。体积平均采用等体积中点积分，与本页二维/FOV采样统计分别展示；二维直径滑块不改变固定三维报告区域。

当前脚本在实际 MATLAB 中的逐点核对、自动色标及注释差异见 [MATLAB 运行与显示核对](matlab-field-display-audit.md)。

FOV 曲线对各候选圆内、当前范围的全部平面 |B| 值求最大、最小值，以该已计算排布的固定 Z=0 中心场强为分母：`(max(|B|)-min(|B|))/|Bcenter| × 10^6`。这是嵌套区域可比较的采样峰峰值，区别于上方显示图使用其区域均值的指标。使用者输入自己的上限，再选取满足该上限的最大候选直径；不预设医用合格限值。宽范围通常有更大的场差，原近中心范围的筛选直径不能直接当作宽范围的结果。

这里只评估所选范围的五个或九个离散平面，不能推定整只手或脚的轴向覆盖，也不能保证离散点之间没有更大的场差。通孔直径是 220 mm，当前横向分析上限是 200 mm。完整成像 FOV 还需结合 RF 覆盖与带宽、梯度、序列和实测磁场。AAPM TG 325 强调明确评估区域和统计定义，且性能要求与系统及应用有关：[AAPM Report 325](https://www.aapm.org/pubs/MPPG/detail.asp?docid=289)。IO 磁环研究同样分别评估横向和轴向平面：[IO-ring research](https://arxiv.org/html/2411.03249v1)。近中心模式沿用用户 MATLAB 的采样定义，宽范围用于探索；两者均未声明临床验证。

## 计算与结果归属

初始横向数据由 `scripts/generate-transverse-field.ts` 离线生成（4,888,992 字节），首次打开横向视图只载入并解码，不启动浏览器求场。构建校验模型签名、磁块数量、单位、Br、内核版本和采样网格后复用文件。生成过程用有内存上限的本地线程分段完整求和；转换不依赖外部计算服务。

宽范围使用独立文件 `public/transverse-field-initial-wide.bin` 与独立采样签名，按需载入。生成时仅可复制经完整签名核对、坐标完全一致的 Z=0 平面，其余八个平面逐点进行完整磁块解析求和；不沿 Z 插值，不借用近中心的掩膜。两套基线及完成的设计结果分别缓存，过期的范围任务不得覆盖当前范围。

新增九截面文件为 8,767,512 字节。原五截面文件 SHA256 不变；Z=0 的向量数据逐字节一致。初始九截面的 45 个探针位置、135 个向量分量与完整 1,736 块磁铁解析求和一致；37 个候选直径的全部九层极值指标保持嵌套单调性。直径 150 mm 的九层 \|B\| 峰峰差 / 中心场强约 324,083.54 ppm，显示扩大轴向范围后均匀性要求更难满足，而不是继续使用近中心的约 399 ppm 结果。

方向编辑本身不触发横向求场。只有主实验台完成手动计算后，该不可变设计快照才进入横向 Worker。更新使用上一份经验证的完整网格加每个实际变化磁块的精确场差；不使用偶极近似或纵向图插值。缓存、过期任务取消和模型快照一起管理，更新期间保留上一图并明确标记，失败时不把旧图称为新结果。切换教学板块保留设计与结果，隐藏时停止绘制和未完成的横向任务。

## 本地验证

`tests/transverse-field.test.ts` 核对设备坐标、两个方案的全三维解析求和、整层增量、五切片平均、MATLAB N−1 标准差、圆形节点选择、掩膜、二进制往返、取消以及 FOV 的固定参考指标。初始实际网格的离轴点另与完整求和和独立磁极面数值积分核对。装配播放仍是几何演示，与本求场过程分离。

## 发布前独立复核（2026-10-13）

当前初始排布以及包含三个非对称单块编辑的排布，各取 31 个中心、离轴和边界空气点，与固定版本 Magpylib 5.2.3 独立核对。另从实际 MATLAB 的 31 个种子声明生成完整 1,736 块几何，核对上下环径向反转、轴向保持，以及观察坐标的 90° 转动；同时采用原文件的八角点公式复算同一组点。

| 独立对照 | 最大矢量差异 |
|---|---:|
| 初始排布 / Magpylib | 9.41 × 10⁻¹² mT |
| 非对称编辑 / Magpylib | 9.33 × 10⁻¹² mT |
| 从实际 MATLAB 声明独立生成几何 / 网页 | 1.95 × 10⁻¹¹ mT |
| MATLAB 八角点公式 / 网页 | 8.33 × 10⁻¹² mT |

独立读取原始 Float64 文件，对全部 37 个候选直径重新计算逐点平均 Bz、未经平均的五平面 |B|、N−1 标准差和峰峰比值，并核对 9 个用户输入阈值的最大候选直径；归一化统计的最大数值差异为 1.59 × 10⁻⁹ ppm。这里的误差是算法之间的浮点差异，不能作为实物精度。

为检查网格离散影响，每个直径额外求 600 个包含半毫米半径和圆边界非网格点的空气场值，再与原 1 mm 节点合并取极值：

| 直径 | 原 1 mm 采样峰峰 / 中心场 | 加入额外探针后 |
|---|---:|---:|
| 150 mm | 399.346 ppm | 399.346 ppm |
| 155 mm | 564.410 ppm | 566.157 ppm |
| 160 mm | 1,331.669 ppm | 1,336.994 ppm |

这次稀疏检查没有改变以用户自行指定的 1,000 ppm 为例得到的最大候选直径 155 mm，但已经显示非网格位置可能产生更大的场差。它仍不是连续空间收敛证明，不把 1,000 ppm 设为默认要求，也不代表医用合格标准。五平面逐点平均图与五平面未经平均的场强筛选保持分开，±2 mm 轴向范围始终明确。

The transverse view solves full finite-cuboid vectors on two separately identified device-XY ranges: nine individual exploratory planes over ±100 mm, and the original five MATLAB planes over ±2 mm. The 150 mm disk in MATLAB mode reproduces the pixel-averaged Bz definition; all-plane |B| checks use the complete raw plane set of the selected range. The user-defined diameter filter is a sampled model estimate, not a clinical acceptance claim or a continuous-volume bound. Initial data are precomputed; edited data belong only to the explicitly computed design snapshot. Publishing the verified source and assets does not change these physical definitions or their limits.
