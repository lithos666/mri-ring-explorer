# 固定色标与三维FOV验证 / Locked scale and 3D FOV validation

验证日期：2026-10-14。交付范围为本地预览、离线圆柱分析、初始报告与验证记录。当前14层、28列、1,736颗磁铁的几何、Br、有限磁块内核、MATLAB文件及既有横向二进制数据未修改。

## 完成检查 / Completed checks

| 检查 / Check | 结果 / Result |
|---|---|
| TypeScript | `tsc --noEmit --incremental false`通过 |
| 完整构建 / Production build | `npm.cmd run build`通过；既有磁场缓存全部校验后复用；不运行圆柱分析 |
| 横向解析与缓存 / Transverse regression | 两套模型、五/九截面、整层精确增量、掩码、取消和范围隔离测试通过 |
| 固定显示 / Locked display | 实际MATLAB jet颜色、初始Z0/D150范围、全九层D200参考、FOV同点数值与RGB不变、圆外探针、平均图探针及饱和测试通过 |
| 圆柱积分 / Cylinder integration | 常量场、r²+z²解析积分及加密、总体标准差、边界不参与均值、部分覆盖拒绝、设计兼容与物理签名测试通过 |
| 独立数值检查 / Independent numerical audit | 1,946项检查通过；14个离网格/体积中点/极值三维探针与Magpylib独立实现最大矢量差约6.736×10⁻¹² mT |
| 浏览器 / Browser | 324项检查通过；零应用错误；含六种桌面语言尺寸、手动计算、撤销/重做、旧结果和三维报告匹配 |
| 报告导入下载 / Report import and downloads | 21项检查通过；JSON身份、CSV列与溯源、Markdown列、无效身份拒绝、展开报告双语布局 |

桌面覆盖1440×900、1280×720、1024×768，各中英两种语言。测试独立读取二进制磁场和实际MATLAB色表，并核对画布像素及统计；改变显示参数没有发送求场请求。教学板块及实验视图切换保留锁定设置与探针。

Desktop verification covers the three established sizes in both languages. Independent browser tests decode actual binary fields and MATLAB colors, check pixels and statistics, and confirm that display operations do not launch solves. Report metrics disappear when the completed design has no matching report; draft changes label the old matching report as previous.

## 初始报告 / Initial report

区域为同轴D150×L200 mm圆柱。两级加密使用40,960和327,680个等体积中点；第二级另检查18,642个边界/轴线/中心点。完整离线分析约218.59秒，最多四个本地线程。

- 中心 |B|：37.343568936443 mT。
- 加密体积平均 |B|：37.786003755380 mT。
- 总体标准差：1.478662688083 mT。
- 采样最小/最大值：32.259448924675 / 44.405921537908 mT。
- 采样峰峰差/体积均值：321,454.279523 ppm。
- 均值加密变化：−0.001181828794 mT；峰峰差加密变化：+0.044001619105 mT。

报告没有医用合格阈值，也不声称连续空间极值已经证明。第三级64×256×160入口已经提供，本次初始交付按批准的两级执行。该长圆柱的均匀性与原±2 mm薄层不是同一评估区域。

These are sampling and integration estimates, with no clinical pass threshold or continuous-extrema guarantee. The optional third level is available but the delivered initial report follows the approved two levels. The long cylinder and the original ±2 mm thin region have different physical extents.

## 原始数据保持 / Preserved data

原五平面二进制SHA-256保持为`54e21b19e4833f9954a95af0060ac53def7a4f8244b57173cde2dbb675838701`。原MATLAB五平面平均Bz统计保持37.35148119965367 mT、384.8994687538 ppm；其中的N−1标准差仍与体积总体标准差分开。

本地独立报告及截图位于开发工作区的`work/qa/cylinder-lock/`，不作为网页运行资产发布。使用说明见[cylinder-field-fov.md](cylinder-field-fov.md)。
