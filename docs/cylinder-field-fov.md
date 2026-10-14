# 三维圆柱评估 / 3D cylinder assessment

本地更新日期 / Local update: 2026-10-14。目标为以设备原点为中心、Z轴方向的直径150 mm × 长200 mm圆柱（Z=−100…+100 mm）。默认使用当前新版14层、28列、1,736颗12 mm磁铁及Br=1.43 T。分析复用已核对的有限磁块解析叠加，完整计算每个采样点的Bx、By、Bz，再取原始 |B|；不使用五截面平均或沿Z插值。

This local update evaluates a cylinder centered at the device origin, aligned with Z: diameter 150 mm, length 200 mm. It reuses the validated finite-cuboid full-vector superposition and the existing physical parameters. It uses raw magnitudes, not a mean of five slices or axial interpolation.

## 体积积分与边界 / Volume and boundary

令R为半径，L为长度，体积单元使用以下中点：

```text
u = (i + 0.5) / Nr
r = R × sqrt(u)
θ = 2π × (j + 0.5) / Nθ
z = L × ((k + 0.5) / Nz − 0.5)
```

因为u=r²/R²等分，每个点代表相同体积πR²L/(NrNθNz)。体积均值为这些中点的 |B| 均值；体积标准差使用总体定义（除N），不是MATLAB截面统计的N−1样本标准差。

Equal spacing in u=r²/R² gives equal-volume cells. The volume mean and population standard deviation use only their midpoint magnitudes. Sidewall, endcaps, axis and origin probes additionally search sampled extrema; they have no weight in the volume mean.

极值使用体积中点与额外的侧壁、两个端面、轴线、中心点。边界点不参加体积均值。报告中的峰峰指标为：

```text
peak-to-peak ppm = (sampled max |B| − sampled min |B|) / volume mean |B| × 10⁶
```

默认两级为16×64×40和32×128×80（径向面积×圆周×轴向），可再计算64×256×160。报告列出均值、总体标准差、极值位置、峰峰指标、点数及相邻等级差异。结果统一为“采样与积分估计”，没有预设临床合格阈值；加密差异不是连续空间误差的严格界限。

Default resolutions are 16×64×40 and 32×128×80, with optional 64×256×160. Reports show refinement changes without assigning a clinical pass threshold or claiming proven continuous-domain extrema.

## 初始圆柱结果 / Initial cylinder results

| 分辨率 / Resolution | 体积点 / Volume points | 边界点 / Boundary points | 平均场强 / mT | 峰峰 / 均值 / ppm |
|---|---:|---:|---:|---:|
| 16×64×40 | 40,960 | 4,714 | 37.787185584174 | 320,279.766991 |
| 32×128×80 | 327,680 | 18,642 | 37.786003755380 | 321,454.279523 |

中心场强为37.343568936443 mT，与体积平均场强不同。加密后均值变化−0.001181828794 mT，峰峰指标变化+1,174.512532 ppm。此圆柱轴向跨度远大于原MATLAB的±2 mm；其采样峰峰差约32.145%，不能从中心薄层的约数百ppm推定整个200 mm长区域均匀。

The center field is 37.343568936443 mT, distinct from the volume mean. Refinement changes the mean by −0.001181828794 mT and the peak-to-peak metric by +1,174.512532 ppm. The much longer axial range has approximately 32.145% sampled peak-to-peak variation; the central thin region cannot establish uniformity over this cylinder.

## 离线使用 / Offline use

在项目目录的PowerShell中执行；需要Node.js 22.13或更高版本。初始报告已包含在项目中，通常不需要重新生成。

```powershell
npm.cmd run analyze:cylinder
```

支持原有schemaVersion=1设计文件。对修改后的设计指定输出位置：

```powershell
npm.cmd run analyze:cylinder -- --design "我的设计.json" --diameter-mm 150 --length-mm 200 --output "outputs/cylinder-edited"
```

进一步加密：

```powershell
npm.cmd run analyze:cylinder -- --fine --output "outputs/cylinder-fine"
```

工具生成JSON、CSV和中英双语Markdown。自定义设计、区域或进一步加密默认写入outputs，不覆盖随网页发布的初始报告。D和L支持(0,200] mm，中心与轴向固定；评估区域必须完整位于空气中。无效设计、非有限值、部分区域覆盖或不一致报告会被拒绝。

The offline tool creates JSON, CSV and bilingual Markdown. Custom inputs default to the ignored outputs directory; the shipped initial report is preserved. Computation uses at most four local workers, streams partial statistics and is excluded from normal builds and browser startup.

## 网页与溯源 / Web and provenance

“横向剖面·FOV”下点击“三维评估”，可查看与当前已完成排布一致的报告；“区域结果／加密与方法”通过点击切换，每页完整显示，并支持下载JSON、CSV或当前语言说明。修改尚未计算时，报告明确属于上一结果；新计算排布没有匹配报告时显示“尚未生成对应三维报告”。离线处理后用“载入离线报告”读取JSON；这不会改变磁铁，也不会触发求场。

每份报告记录模型/几何/磁源签名、磁铁数、Br、单位、内核、区域、方法和分辨率。分析签名包含全部物理输入与采样参数；浏览器核对身份和报告内部统计一致性。报告是用户提供的计算记录，不是经过第三方认证的实测证书。

The 3D assessment page matches source identity, geometry, source count, physical units and Br to the completed layout. Region result and Refinement & method switch by click without inner scrolling. Imported JSON also validates its analysis identity and internal metric consistency. Draft changes retain an explicitly previous report; a newly computed unmatched design shows no corresponding report. These reports are simulated records, not measured certification.

二维FOV遮罩与三维圆柱报告是独立的区域定义。调二维直径不会改三维报告的直径、长度或磁场；报告标题始终写出它自己的固定尺寸。

The transverse display mask and the cylinder report are separate region definitions. Moving the 2D FOV slider cannot change the 3D cylinder or its field; the report always displays its own dimensions.
