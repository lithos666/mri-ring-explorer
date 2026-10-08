# MATLAB 参数与网页模型 / MATLAB parameters and web model

网页 v15 将两份 14 层脚本的数值声明作为几何与 Br 的来源。网页源文件在项目根目录，MATLAB 程序集中在 `matlab/`；用户原有的 `hackathon_big/` 数据也已移动到该目录下，120 个原文件逐个核对，内容未改变。私有源码仓库保留 7 个 MATLAB 程序；优化数据留在用户本地，不作为网页运行资产发布。

Web v15 uses the numeric declarations from the two 14-layer scripts. Web source is at the project root; MATLAB programs are in `matlab/`. The user's optimization data stays local and is not a public runtime asset.

## 采用参数 / Adopted parameters

| 参数 / Parameter | 原方案 / Small | 新版方案 / Big |
|---|---:|---:|
| Br / T | 1.43 | 1.43 |
| 方块尺寸 / Cube size, mm | 10 × 10 × 10 | 12 × 12 × 12 |
| 轴向层数 / Axial layers | 14 | 14 |
| 每层每个半径的圆周列数 / Columns per radius | 14 | 28 |
| 磁块数量 / Magnets | 756 | 1,736 |
| 轴向中心间距 / Axial pitch, mm | 26 | 38 |
| 正半轴中心 Z / Positive Z centers, mm | 13, 39, 65, 91, 117, 143, 169 | 19, 57, 95, 133, 171, 209, 247 |

来源分别是 `matlab/GenerateIORingHackathonSmall_32mT.m` 和 `matlab/GenerateIORingHackathonBig_37mT.m`。完整逐环半径、方向和原文件 SHA-256 见 [matlab-parameters.json](matlab-parameters.json)；前端常量在 `lib/matlab-geometry.ts`。10/12 mm 是磁块尺寸，半径是磁块中心坐标，不能将外壳占据范围用作中心坐标。

`GenerateIORingPairFromQuadrant.m` 的角度约定为：0°向内，180°向外，90°为 +Z，270°为 −Z。下半轴采用 `180° − 上半角度`，径向方向翻转，轴向方向保持。两套脚本的方向与网页模板一致；所有初始轴向块均沿 −Z。

网页设备坐标 `(X,Y,Z) = (world.x, −world.z, world.y)`。为保留已有编号，网页首列相位仍为 0° / 6.428571°；与 MATLAB 默认首列相比，整个阵列只绕 Z 轴旋转 90°。这是观察坐标变化，不是某一磁块的方向修改；圆形统计区域和中心场不受该整体转动影响。

The web retains column IDs and applies a global 90° viewing rotation relative to MATLAB. Position and magnetization rotate together. Downward axial magnetization means −Z in both axial halves.

所有类别均使用脚本的 Br = 1.43 T。Weak / Normal / Strong 仅保留为原方案的标签，不人为赋予不同幅值。内核计算 `B/J`，在固定均匀磁化、回线磁导率约 1 的假设下采用 `J = μ₀M ≈ Br`，读数转为 `B[mT] = (B/J) × 1.43 × 1000`。这不是磁铁材料实测曲线或装置实测场。

## 独立复核 / Independent checks

未执行 MATLAB 程序或优化器。本次直接读取数值声明，分别用网页的解析极面积分、独立 Magpylib 5.2.3 有限方块实现，以及从 MATLAB `MagTetris.m` 读取并独立转写的八角点公式核对中心场。网页内核不依赖这两个外部求场程序。

| 计算结果 / Calculated result | Small | Big |
|---|---:|---:|
| 中心 Bz / Center Bz, mT | 32.263526452 | 37.343568936 |
| 五切片平均后圆内 Bz 均值 / ROI mean, mT | 32.258021527 | 37.351481200 |
| 同一统计定义的峰峰差 / Peak-to-peak, ppm | 352.472694 | 384.899469 |
| 统计圆半径 / Circular ROI radius, mm | 25 | 75 |

中心场三种实现之间的绝对差小于 `2×10⁻¹⁴ T`。五切片统计采用 1 mm XY 网格，圆内闭区间取点，在每个 XY 点先平均 Z = −2、−1、0、1、2 mm 的 Bz，再计算 `(max − min) / abs(mean) × 10⁶`。Small 为 1,961 个 XY 点，Big 为 17,665 个。它是特定采样定义，不是整个球体的三维均匀性或临床成像指标。

**原脚本注释与当前声明重算结果不一致。** Small 注释记录 32.136821311 mT / 7.623891594 ppm；Big 注释记录 37.357557 mT / 168.646099 ppm。注释保留原样，网页采用当前参数的重算值，不能以注释替代验证。注释中的“中心值”和五切片均值也不应混为一谈。

The script comments differ from recomputation using the current declarations. Comments are preserved unchanged; the web displays recalculated center fields. ROI values above describe a five-slice sampled Bz statistic, not whole-volume homogeneity or measured performance.

`hackathon_big/` 的优化输出还包含 33 列、16 层、1,848 块等独立方案，不与本次 14 层输入混用。梯度与 RF 仍为结构和原理示意；主场的 Br 标定不用于给线圈示意求场赋予 mT/m 或 RF 功率。Small 的线圈示意按比例缩小，避免超出其较小孔径。

## 文件兼容性 / File compatibility

旧版 `schemaVersion: 1` 方向设计文件仍可导入。仅明确列入兼容清单的两套旧几何签名可迁移；方向按稳定磁块 ID 映射到 MATLAB 几何，界面提示几何已更新并需重新计算。新导出采用当前几何签名。未知签名、越界 ID 和非法方向仍拒绝；导入、批量编辑与重置均可撤销。

首次打开自动展示已生成的初始场；修改磁极方向不自动求场，点击“计算磁场”后更新。磁场图使用其对应的已完成设计快照，避免把旧场误认为新排布结果。

## 复核入口 / Validation commands

```text
node --experimental-strip-types tests/model.test.ts
node --experimental-strip-types tests/calibration.test.ts
node --experimental-strip-types tests/design.test.ts
node --experimental-strip-types tests/field.test.ts
node --experimental-strip-types tests/live-field.test.ts
node --experimental-strip-types tests/initial-field.test.ts
node --experimental-strip-types tests/coils.test.ts
node --experimental-strip-types tests/comparison.test.ts
```

进一步限制见 [physics-validation.md](physics-validation.md)。要评估实物装置，还需材料回线、装配公差、温度与实测场图。
