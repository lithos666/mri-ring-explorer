# 半圆装配流程更新 / Semicircle assembly update

2026-10-23，依据用户提供的修改文档及同日补充确认。新版教学对象仍为一套完整的 14 层、28 列、1,736 颗 12 mm 磁铁阵列。文中“拧紧”指固定现有盖板或支撑，不表示新增钻孔工序。

This revision follows the supplied change document and the user's subsequent clarification. Quantities refer to one complete fourteen-layer array. “Fasten” means securing the existing caps or supports; it does not introduce a new drilling operation.

| Stage | Operation |
| --- | --- |
| 1 | 两块分段壳体拼成半圆 / Join two housing quarters into a semicircle |
| 2 | 逐列装磁铁，随装随推进透明盖板，并临时卡紧 / Load columns while advancing the clear cover and retaining it with clips |
| 3 | 固定半圆中部盖板，外侧卡扣继续约束 / Fasten the central cap while outer clips remain in place |
| 4 | 为另一半圆重复上述过程 / Repeat for the other semicircle |
| 5 | 合并两组已约束的半圆 / Join both retained semicircles |
| 6 | 固定剩余盖板并逐步回收临时卡扣 / Fasten remaining caps and recover temporary clips under continued restraint |
| 7 | 安装并紧固左右支撑 / Attach and fasten side supports |
| 8 | 安装到框架 / Mount in the frame |
| 9 | 安装全部十四层 / Mount all fourteen layers |
| 10 | 安装两组贯穿螺杆与圆柱隔块 / Insert both rod banks and cylindrical spacers |
| 11 | 梳状定位器预留步骤，等待设计文件 / Reserved comb-alignment stage awaiting its design |

第 11 步暂不开放完成勾选；不生成猜测外形的定位器。其余阶段保持八秒时长、平滑运动曲线、暂停、进度拖动和自由观察。旧教程的完成标记不会自动沿用到新顺序，所选层号与磁铁设计分别保留。

Stage 11 does not permit a completion check while the design is unfinished. No guessed comb geometry is shown. Animated stages retain eight-second smooth motion, pause, scrubbing and free orbit. The new process has new stage identities: old completion flags do not establish completion of the changed procedure. Selected layer and independent magnet designs are retained.

## 螺杆与隔块 / Rod and spacer groups

用户确认：R01–R05 用四根 M6 黄铜螺杆，R10–R14 另用四根；中间 R06–R09 不被这两组杆穿过。螺杆共八根，M6 黄铜螺母共八个。每组五层内部有四个层间隙，每个间隙四个圆柱隔块，两组合计 32 个。隔块名义尺寸来自提供的 STEP：长 18 mm、外径 14 mm、通孔 6.2 mm。杆的实际裁切长度与端部余量仍以制造文件为准。

Four M6 brass rods span R01–R05; another four span R10–R14. Neither bank crosses R06–R09. Eight nuts are specified. Each five-layer bank has four internal gaps with four spacers per gap, totaling 32. The supplied spacer STEP defines 18 mm length, 14 mm OD and 6.2 mm bore. Displayed rod end allowances do not establish a cutting length.

The registered CAD assets contain four matching Ø6.2 mm hole axes. R01/R14 registration was ambiguous by an integer multiple of the 28-column pitch. Applying an additional rigid rotation of three pitches, 3 × 360° / 28 = 38.5714285714°, aligns those bores while preserving the complete magnet-slot lattice. Base, cap, fasteners and guide directions must receive the same correction. Magnet positions, magnetization and field calculations are unchanged. The original source meshes remain archived without scaling or modification.

## BOM 与文件 / BOM and files

- L 型角码 20 个、铝型材框架 1 套、型材连接螺栓 112 个、T 型槽螺母 112 个，来源仍为官方提供。
- 贯穿螺杆、M3 短螺丝和 M6 螺母材质均为用户确认的黄铜。
- 透明盖板为 2 mm PMMA；用户尚未完成匹配 DXF，因此示意图不猜造孔位。
- 梳状定位器模型尚未完成，未据此虚构物料数量或制造下载。
- 网站继续只提供 Final_1–Final_4 四份模型下载，四份文件的字节和已确认打印时间不变。MATLAB 新版本仍待提供。

The supplied support and spacer previews remain unchanged. Magnet images and product 3D use red/blue teaching polarity; brass hardware previews use brass materials. The calculation explanation distinguishes browser computation, precomputed baselines, vector changes, regional homogeneity and retained MATLAB verification.
