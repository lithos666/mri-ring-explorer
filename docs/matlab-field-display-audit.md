# MATLAB 运行与显示核对 / Actual MATLAB and display comparison

2026-10-13 使用本机 MATLAB R2022a（9.12.0.1884302）直接运行 `matlab/GenerateIORingHackathonBig_37mT.m`。原脚本及七份 MATLAB 文件均未修改；G 盘项目和网站源码的七份文件逐字节相同。本次使用实际 MATLAB 输出，包含完整五平面的三维矢量数组，而不只是另一套解析公式的探针核对。

## 相同数据与实际结果

输入：14 层、28 列、1,736 个 12 mm 方块；Br=1.43 T；XY 步长 1 mm；圆形 FOV 半径 75 mm；Z=−2、−1、0、1、2 mm。源脚本先按对应 XY 节点平均五个 Bz 平面，再计算圆内统计；其默认绘图不是单独的 Z=0 平面。

| 直径 150 mm、五平面平均 Bz | 实际 MATLAB | 网页 |
|---|---:|---:|
| 均值 / mT | 37.35148119965353 | 37.35148119965367 |
| 最小 / mT | 37.34350761835427 | 37.34350761835506 |
| 最大 / mT | 37.35788418362716 | 37.35788418362598 |
| 峰峰 / 均值 / ppm | 384.8994688068938 | 384.8994687538178 |
| 样本标准差 / 均值 / ppm | 86.74380829626995 | 86.7438082958702 |

对全部 17,665 个圆内节点、五个实际平面逐点核对，在统一网页与 MATLAB 相差的 90° 观察坐标及矢量方向后：五平面平均矢量最大误差为 6.90×10⁻¹² mT；单平面矢量最大误差为 1.54×10⁻¹¹ mT。这些差异属于数值舍入，不能解释旧网页的近乎单色显示。

单独 Z=0 的 Bz 均值为 37.35138978736013 mT，范围 37.34356893643484–37.35745534013881 mT，峰峰均匀性 371.777430051 ppm。它与五平面平均定义不同，不能把两者的统计直接当作同一结果比较。

原文件头部的 `mean Bz = 37.357557 mT, peak-to-peak = 168.646099 ppm` 是注释；当前文件实际运行不输出这些值。注释没有被拿来代替求场结果，也没有在本次核对中改写。

## 为什么旧网页看起来更均匀

源脚本执行 `pcolor`、`shading flat`、`colormap jet`，未设置固定 `CLim`。实际图 2 的自动色标为 **37.34350761835427–37.35788418362716 mT**，对应当前平均图的完整约 0.01438 mT 场差。MATLAB 默认将当前数据范围映射到颜色范围：[MathWorks 色标说明](https://www.mathworks.com/help/matlab/creating_plots/change-mapping-of-data-values-into-the-colormap.html)。

旧网页为了比较九个远近截面，使用初始九截面的固定 Bz 范围 **32.25944892467525–43.8678567091 mT**，跨度约 11.6084 mT。Z=0 截面的场差只占它的约 **0.1196%**，平均图约 **0.1238%**，因此被压缩到极少几种颜色。场差数值本身没有消失，展示方式却不适合检查中心截面内的均匀性细节。

## 修正后的显示模式

- 默认 **局部细节（MATLAB）**：使用当前实际显示的 Bz 或 |B|、截面或近中心平均图、所选 FOV 的真实最大最小值，自动展开色标。低场差也可以清楚看到空间分布，但颜色不能直接跨截面或跨设计比较；必须看 mT、ppm 或切换固定色标。
- **跨截面场强**：保留初始模型在当前采样范围/FOV 的固定色标，适合比较不同 Z 或设计的绝对场强变化。
- 两种模式使用实际源图导出的 **256 项 jet RGB 数组**和 MATLAB 式离散颜色索引；窄范围色标至少显示六位小数。常量数据不引入虚构的百分比差异，只为避免除零保留浮点精度量级的渲染区间，原始极值和统计不变。
- 切换色标不修改磁铁方向、磁场数组、场强、均匀性、FOV 筛选、历史或计算状态，也不触发求场。

要对照脚本的默认图，请选择 **MATLAB ±2 mm → 5 个截面均值 → Bz → FOV 直径 150 mm → 局部细节（MATLAB）**。网页按格点中心绘制像素；MATLAB 的 `pcolor/shading flat` 按网格单元绘制，最后一行/列没有独立面，因此边界栅格可能略有不同，数值节点与圆内统计已经逐点核对：[pcolor 文档](https://www.mathworks.com/help/matlab/ref/pcolor.html)。

运行日志、MAT 数组、实际 jet 色表和比较报告保存在本地 `work/qa/matlab-display-audit/`。`same-data-color-scale-comparison.png` 使用实际 MATLAB Bz 数组重绘同数据在两种色标下的效果，是科学对照图而非原生窗口截图。

Actual MATLAB R2022a execution confirms the website's field values for every sampled disk point and all five vector planes. The apparent discrepancy came from a many-mT shared color range and from comparing a single Z=0 plane with a five-plane mean. The display now offers automatic current-map limits and a separate fixed reference scale, using the source figure's exact jet palette. The magnetic model and MATLAB files remain unchanged.
