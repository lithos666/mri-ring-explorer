# 场差、公式推导与一屏布局核对 / Field variation, derivation and one-screen layout

本地更新：2026-10-14。此次修改为横向磁场的解释与布局；原有限磁块解析内核、Br、磁铁位置/方向模板、MATLAB源程序及五/九截面二进制保持原样。

## 实际范围与色标 / Actual field and color limits

初始排布、Z=0、Bz、1 mm XY网格：

| 直径 / Diameter | 实际最小 / Min (mT) | 实际最大 / Max (mT) | 峰峰差 / P–P | 峰峰/均值 / ppm |
|---|---:|---:|---:|---:|
| 150 mm | 37.343568936443 | 37.357455340134 | 13.886403692 μT | 371.777430 |
| 200 mm | 33.287358908447 | 37.357455340134 | 4.070096432 mT | 110,128.241579 |

固定细节色标是初始D150区域的颜色映射，不是D200的实际极值。超出锁定范围的深蓝或红色为饱和颜色；数值未被截断。页面列出实际最小/最大、场差和百分比，与色标上下限分别展示。

The fixed detail scale maps the initial D150 field range into color. It is not the actual D200 extrema. Blue/red saturation clips color only, not numerical fields. The page explicitly separates actual extrema and variation from color limits.

## 推导核对 / Derivation checks

[完整双语推导](field-derivation.md)从静磁Maxwell方程推得磁标量势、等效面磁荷、两个有限方形面解析积分，再用每颗磁铁的正交坐标基和真实磁化方向求全阵列矢量和。使用独立48阶Gauss–Legendre双面积分核对28组案例，最大归一化分量误差为1.596×10⁻¹⁶。另检查磁化反向、方块中心、平滑磁化面连续性、空气无散/无旋和矢量叠加。

These checks validate the prescribed uniform-magnetization finite-cube model. They do not substitute for physical field measurements or material-response modeling.

## 布局与交互 / Layout and interaction

- “场图与FOV／三维评估／公式推导”点击切换，当前内容页不堆叠在下方。
- 场图右侧“区域结果／轴向截面／FOV筛选”完整显示当前页；轴向表保留全部九行。
- 三维评估通过“区域结果／加密与方法”切换；公式推导提供三个步骤与完整文件下载。
- 横向实验的设计保存、加载、导入导出在独立可键盘操作的窗口中访问。
- 固定色标、坐标探针、手动计算、撤销重做和计算快照行为保留。

独立浏览器检查共1,612项通过，无应用错误。覆盖1440×900、1280×720、1024×768及中英两种语言，检查实际内容边界、scrollHeight/clientHeight、工作区与窗口边界，而不是仅隐藏滚动条或裁切内容。六种场景的区域结果、轴向表、FOV筛选、三维报告两页、公式三步及文件窗口均可点击使用，无需工作区内滚轮。

Independent browser verification passed 1,612 assertions, with zero application errors. It checks content boundaries and scroll dimensions in all six desktop/language combinations; it does not hide overflow to disguise clipped content. Independent raw-binary statistics and exact MATLAB palette checks confirm fixed-point value/color invariance and no solver launches from display operations.

前一完整交互检查还覆盖手动计算、更新中的旧图、已编辑设计的报告身份及撤销/重做。实际被点击的网格坐标按SVG变换读取，不假定屏幕点击必然落在70 mm节点。

## 构建与数据 / Build and preserved data

完整构建、TypeScript检查、固定显示测试及公式面积分测试通过。原五平面二进制SHA-256仍为`54e21b19e4833f9954a95af0060ac53def7a4f8244b57173cde2dbb675838701`。三维初始报告未重算或改变。

浏览器报告及截图保存在开发工作区`work/qa/no-scroll/`。此记录属于本地交付，不表示已经发布到在线网站。
