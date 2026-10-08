# 主磁场公式核查 / Main-field validation

核查日期：2026-10-08。结论：在**固定、均匀磁化立方体，回线磁导率近似 1**的模型假设下，修复后的空气区域解析磁场通过独立对照。这里验证的是给定几何和磁化强度的数学模型，尚未验证实物场强或临床成像性能。

## 采用的物理模型

对每块磁铁使用等效表面磁荷 `sigma_m = M · n_surface`。在空气区域：

```text
H(r) = (1 / 4π) ∫surface sigma_m(r′) (r − r′) / |r − r′|³ dS′
B(r) = μ0 H(r)
Btotal(r) = Σ Bmagnet(r)
```

磁体内部则为 `B = μ0(H + M)`。代码解析积分两张磁极面，使用矩形面固体角与 asinh/log 表达式，并把局部矢量变换回世界坐标。磁块箭头是 S → N 的磁化方向，空气中的合场 B 并不必须与该箭头同向。所有源当前采用相同给定极化强度 `J = μ0 M`；解析结果单位是 **B/J**，界面读数又除以当前方案的初始中心场 `|Bref|`。

设备坐标为 `(X,Y,Z) = (world.x, −world.z, world.y)`。每块磁铁按自己的圆周角生成径向和切向方向；对置磁铁保持径向“内/外”的定义。场的求和不要求修改后的排布保持对称。

该模型依据与独立对照库：[Magpylib cuboid 核心接口](https://magpylib.readthedocs.io/en/stable/_autogen/magpylib.core.html#magpylib.core.magnet_cuboid_Bfield)、[固定版本 5.2.3 的独立解析实现](https://github.com/magpylib/magpylib/blob/5.2.3/src/magpylib/_src/fields/field_BH_cuboid.py)、[模型假设与材料响应限制](https://magpylib.readthedocs.io/en/latest/_pages/user_guide/guide_resources_01_physics.html)。本项目内核是独立表面积分实现，没有把 Magpylib 或 MagTetris 当作实际运行时依赖。

## 发现并修复的问题

1. **磁极面上的取值。**原来仅在严格内部增加 M 项，恰好处于磁极面时遗漏半个 M 项。以半边长 0.4、沿 +Z 磁化的方块为例，`Bz/J` 在 `(0,0,0.4)` 应为 `0.435905783151025`，旧值为 `−0.064094216848975`。现在采用极面连续 B 的极限值；很小但非零的面距不再被任意阈值压成零。共面延长线使用有限 log 极限，避免不必要的非有限值。
2. **缓存有效区域。**尖锐磁极边缘在理想均匀模型中可能奇异。v2 网格只存有效空气区域；磁体内部及表面节点为占位零值，必须配合掩码使用，不能理解为材料场。三维插值拒绝包含被掩码角点的单元；增量更新保持相同占据几何，否则拒绝使用旧缓存。
3. **绘图表达。**热图和色标统一透明度；近零截面外分量显示 `≈0`，不再任意给出 ⊙/⊗。虚线明确标注为三维轨迹的投影，不能把投影视作二维磁感线。

所有初始网格与初始场结果均升级版本并记录 `uniform-cube-poles-v2`；旧内核资产被拒绝。两套初始场已经重新生成。

## 独立对照与数值检查

独立审计使用官方 Magpylib 5.2.3 的 cuboid 算法，其文件 SHA-256 为 `6f336c2a943281341d14fb843d54cb532ec4e275d44b9598c89454f61cfa5b07`。包括六种磁化方向、多种圆周角、内部和外部非边界点、近极面点，以及两套完整阵列的基准和非对称编辑排布。

| 检查 | 结果 |
|---|---|
| 单磁块非界面点对照 | 最大矢量绝对差 `1.81×10⁻¹⁴ B/J` |
| 四个完整阵列，每个 271 个三维点 | 最大矢量绝对差 `1.67×10⁻¹⁴ B/J` |
| 9 点独立 64×64 Gauss 表面积分 | 最大矢量绝对差 `5.78×10⁻¹⁶ B/J` |
| 磁极面连续值对照 | 最大矢量绝对差 `1.67×10⁻¹⁶ B/J` |
| 原方案新缓存：3,702 个空气节点 | 最大相对差 `5.75×10⁻⁸` |
| 新方案新缓存：4,020 个空气节点 | 最大相对差 `5.73×10⁻⁸` |

缓存节点误差符合 Float32 保存精度。可见截面的全部有效节点均参与了独立缓存检查，另加随机三维空气节点。上述误差是**算法之间的数值差异**，不是实物装置精度。

还检查了单块内部中心 `B/J = 2/3`、远场偶极极限、空气区 `∇·B ≈ 0` 和 `∇×B ≈ 0`、圆周旋转协变、极性反转、批量差场与完整求和一致、六方向的几何保持、撤销与重置、旧缓存拒绝。

未带表面电流的极面法向 B 连续；其他材料界面的切向 B 可以跳变。对于未磁化的侧面，本内核采用外侧取值；不同库的边界取值约定可能不同。不能把这些界面约定差异视为空气求场错误。实际绘图和探针屏蔽磁体表面及邻近区域。

## 解释范围与待提供参数

- 首次显示 `1.0000×` 是参考定义，不能证明磁场均匀，也不是 1 T。
- 中心数值和探针由所有磁铁的完整解析求和得到。热图是 61² 网格采样；轨迹采用 31³ 网格插值和 RK4，并以解析 B 检查段方向。方向夹角余弦阈值 0.98 是绘图筛选标准，并不是位置误差或临床精度保证。网格与轨迹尚未完成空间收敛研究。
- Weak / Normal / Strong 当前只是类别，没有经过确认的幅值。主场结果不含梯度线圈通电场和 RF 时变场；这两个图层目前用于结构和原理解释。
- 原方案尺寸是示意比例，新方案的磁块尺寸、中心半径和环间距仍含读图估计。需要真实磁块形状、尺寸、位置、环间距和各类别的 Br 或 M 后，才能给出相应几何下的 T/mT 预测。Br 作为 J 的近似还需要材料回线特性依据。
- 当前未模拟退磁、磁化相互反馈、铁磁外壳、温度与制造公差。绝对预测还需与实测场图校核。

This audit verifies the corrected **ideal uniform-cube magnetic field in air**, using an independent analytical implementation and numerical surface integration. Results are normalized by the prescribed polarization and the initial center field. Material properties, exact geometry and measured field maps are still needed to calibrate absolute values and assess a physical scanner.

## 项目内回归检查

```text
node --experimental-strip-types tests/field.test.ts
node --experimental-strip-types tests/live-field.test.ts
node --experimental-strip-types tests/initial-field.test.ts
```
