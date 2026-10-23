# 磁场计算与核对说明 / Field calculation and validation

Updated 2026-10-23. This explains the retained baseline and current website implementation, not the forthcoming revised MATLAB files.

## 计算在哪里执行 / Where computation runs

网站没有调用服务器上的 MATLAB。初始场由项目内的有限磁块解析内核离线生成并校验后提供；修改磁铁方向后，点击“计算磁场”，浏览器 Worker 用同一内核更新。装配动画只是几何演示，不参与求场。

The website does not call a server-side MATLAB runtime. Its baseline is precomputed and validated using the project's analytical finite-block kernel. After orientation edits, the Compute action updates the field in a browser worker using that kernel. Assembly animation is a separate geometric demonstration.

- Kernel: `uniform-cube-poles-v2`.
- Baseline geometry: 14 axial layers, 28 circumferential columns, 1,736 cubes, 12 × 12 × 12 mm each.
- Material input: Br = 1.43 T, represented by prescribed uniform magnetization J ≈ Br. The N52 label does not automatically change that input.
- Coordinate systems: a documented rigid 90° viewing rotation relates the website and MATLAB array frames; compare both the observation coordinates and vector components in the same frame.

## 场的计算与更新 / Field calculation and updates

每个有限方块的磁场由磁极面解析积分求得，转换回设备坐标后做矢量叠加：

`B(r) = Σ_i B_i(r)`

编辑时保持磁铁位置和形状，使用线性叠加的增量更新：

`B_new(r) = B_previous(r) + Σ_edited [B_after(r) − B_before(r)]`

The contribution at a sampling node is evaluated with the finite-cuboid expression, not a point-dipole approximation. The center field and named exact probes use the full analytical sum. The longitudinal display and 3D trajectories use sampled grids, interpolation and trajectory tracing; rendered lines are not independent field measurements. Transverse maps keep Float64 field values on a 1 mm grid.

## 三种差值不要混淆 / Distinguish the metrics

1. 顶部 `ΔB / ref`：`|B_center,new − B_center,initial| / |B_center,initial| × 100%`。这是中心矢量的变化，不是区域均匀性。
2. 所显示二维区域的峰峰均匀性：`(B_max − B_min) / |mean(B)| × 10^6 ppm`。B 指当前选中的 Bz 或 |B|；五平面平均图先对同一 XY 点平均，再统计圆内节点。
3. FOV 筛选曲线：在选定轴向采样范围内，对未平均的 |B| 取极值，以当前已计算设计的 Z=0 中心场为固定分母。曲线与二维图统计的分母不同，界面分别标明。

The 3D cylinder report uses unaveraged |B|, equal-volume integration for its mean, and separate boundary sampling for extrema. Its peak-to-peak ppm denominator is the volume mean. A single Z=0 slice is not a guarantee for an entire 3D FOV. Changing FOV changes the region and its statistics, not the field at a fixed XYZ coordinate.

## 实际 MATLAB 核对 / Comparison with an actual MATLAB run

The retained `GenerateIORingHackathonBig_37mT.m` was run in MATLAB R2022a on 2026-10-13. Its SHA-256 is `b9720c11f6b21a413fc11433f13e519d621103196caa48e38dcdad7b77c19b8c`. The source file was not edited for the comparison. The evidence is retained in the project's local MATLAB audit logs and arrays.

输入为直径 150 mm 圆形区域、1 mm XY 网格及 Z = −2、−1、0、1、2 mm 五个实际平面。下表统计五平面逐点平均后的 Bz，区域内包含 17,665 个 XY 节点。

| Quantity | MATLAB | Website |
| --- | ---: | ---: |
| Regional mean / mT | 37.35148119965353 | 37.35148119965349 |
| Minimum / mT | 37.34350761835427 | 37.34350761835506 |
| Maximum / mT | 37.35788418362716 | 37.35788418362598 |
| Peak-to-peak / mean / ppm | 384.8994688068938 | 384.8994687540098 |
| Sample standard deviation / mean / ppm | 86.74380829626995 | 86.74380829566881 |

The maximum vector discrepancy in the five-plane averaged data was 6.90 × 10^-12 mT after coordinate registration; the largest single-plane discrepancy was 1.54 × 10^-11 mT. These are numerical agreement results for the retained inputs, not a validation of forthcoming code or manufactured hardware.

### 在网页复现 / Reproduce in the website

Reset the design to its baseline. Open Principles & Lab → Transverse · FOV → MATLAB ±2 mm. Choose the five-plane average, Bz, and FOV diameter 150 mm. Use Fit current color scale if comparing the original MATLAB plot's automatic color range. Read the regional mean and ppm values separately from the locked color bar.

恢复初始排布，进入“原理与实验 → 横向剖面 · FOV → MATLAB ±2 mm”，选择五截面均值、Bz、直径 150 mm。原 MATLAB 图使用当前数据的自动色标；比较颜色前可点击“重新适配色标”。Z=0 单平面与五平面平均的统计不相同。

## 模型边界 / Model limits

Prescribed uniform magnetization in free space is assumed. Steel response, self-consistent demagnetization, temperature drift, manufacturing variation and mechanical force are not solved. Confirming brass hardware materials updates the BOM and visuals; it does not introduce an unmodeled material response into the field. New MATLAB files will be checked separately once supplied. Physical field mapping remains necessary.
