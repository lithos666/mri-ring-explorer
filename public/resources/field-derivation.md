# MRI 磁场公式推导 / MRI field derivation

本文件对应 `uniform-cube-poles-v2` 解析内核。以下推导保留实际有限磁铁尺寸；没有用点偶极近似替代方块。数值例子只描述当前初始排布，不代表任何已编辑设计。

This document describes the `uniform-cube-poles-v2` analytical kernel. It retains each magnet’s finite size rather than substituting a point dipole. Numerical examples refer to the current initial layout, not an edited design.

## 1. 方程与模型假设 / Equations and assumptions

在静磁场、无自由电流的区域，宏观方程为：

In magnetostatics without free currents:

\[
\nabla\cdot\mathbf B=0,\qquad
\nabla\times\mathbf H=0,\qquad
\mathbf B=\mu_0(\mathbf H+\mathbf M).
\]

取磁标势 \(\mathbf H=-\nabla\Phi_m\)。由无散条件：

With the scalar potential \(\mathbf H=-\nabla\Phi_m\), the divergence equation gives

\[
-\nabla^2\Phi_m+\nabla\cdot\mathbf M=0.
\]

定义等效体磁荷和面磁荷：

Define the equivalent volume and surface magnetic charges:

\[
\rho_m=-\nabla\cdot\mathbf M,\qquad
\sigma_m=\mathbf M\cdot\mathbf n_s.
\]

在磁体外势趋于零的边界条件下：

With the potential tending to zero at infinity:

\[
\Phi_m(\mathbf r)=\frac{1}{4\pi}
\left[\int_V\frac{\rho_m(\mathbf r')}{|\mathbf r-\mathbf r'|}\,dV'
+\int_S\frac{\sigma_m(\mathbf r')}{|\mathbf r-\mathbf r'|}\,dS'\right].
\]

因为 \(-\nabla(1/|\mathbf r-\mathbf r'|)=(\mathbf r-\mathbf r')/|\mathbf r-\mathbf r'|^3\)，磁体外部：

Since \(-\nabla(1/|\mathbf r-\mathbf r'|)=(\mathbf r-\mathbf r')/|\mathbf r-\mathbf r'|^3\), outside the magnet:

\[
\mathbf B(\mathbf r)=\frac{\mu_0}{4\pi}
\left[\int_V\rho_m\frac{\mathbf r-\mathbf r'}{|\mathbf r-\mathbf r'|^3}\,dV'
+\int_S\sigma_m\frac{\mathbf r-\mathbf r'}{|\mathbf r-\mathbf r'|^3}\,dS'\right].
\]

磁荷只是求解的数学等效表示，\(\mathbf B\) 仍满足 \(\nabla\cdot\mathbf B=0\)，没有引入真实磁单极。

These charges are a mathematical representation. The resulting \(\mathbf B\) remains divergence-free; physical magnetic monopoles are not introduced.

本模型给定各块磁铁的均匀磁化，令 \(J=\mu_0M\)，以 \(J\approx B_r\) 进行标定，当前 \(B_r=1.43\,\mathrm T\)。这等价于忽略回线磁导率相对1的偏离及自洽材料响应；钢件磁化、温漂、磁铁内部不均匀性和定位误差不包含在本模型中。N52 是材料等级，不是孔内场强。

The model prescribes homogeneous magnetization, defines \(J=\mu_0M\), and scales it with \(J\approx B_r\), currently \(B_r=1.43\,\mathrm T\). It neglects deviations of recoil permeability from one and self-consistent material response. Steel magnetization, temperature drift, inhomogeneous magnets and placement errors are excluded. N52 is a material grade, not the bore field strength.

## 2. 两个有限方形面的积分 / Two finite square faces

采用磁铁局部坐标 \((\xi,\eta,\zeta)\)，方块范围为 \([-a,a]^3\)，均匀磁化方向为 \(+\zeta\)。12 mm 方块的物理半边长为 \(a=6\,\mathrm{mm}\)。均匀磁化使内部 \(\rho_m=0\)；只有 \(\zeta'=+a\) 和 \(\zeta'=-a\) 两个面分别有 \(\sigma_m=+M\) 与 \(-M\)，其余面为零。

Use local coordinates \((\xi,\eta,\zeta)\), a cube \([-a,a]^3\), and magnetization along \(+\zeta\). A 12 mm cube has physical half-width \(a=6\,\mathrm{mm}\). Uniform magnetization makes \(\rho_m=0\) inside. Only the faces at \(\zeta'=+a\) and \(-a\) carry \(+M\) and \(-M\); the remaining faces carry zero.

把单位磁荷密度、中心位于原点的方形面核记为：

Define the unit-charge square-panel kernel:

\[
\mathbf P(x,y,z;a)=\int_{-a}^{a}\int_{-a}^{a}
\frac{(x-s,\ y-t,\ z)}{[(x-s)^2+(y-t)^2+z^2]^{3/2}}\,dt\,ds.
\]

对观察点不在磁体内的情形：

For an observation point outside the magnet:

\[
\boxed{\frac{\mathbf B_{\mathrm{local}}}{J}
=\frac{\mathbf P(\xi,\eta,\zeta-a;a)-\mathbf P(\xi,\eta,\zeta+a;a)}{4\pi}.}
\]

这里 \(\zeta-a\) 来自正面，\(\zeta+a\) 来自负面；两者相减，符号不能交换。

The positive face uses \(\zeta-a\); the negative face uses \(\zeta+a\). Their difference fixes the sign of the magnetic field.

### 2.1 切向分量 / Tangential components

先对 \(u=x-s\) 积分：

Integrating first in \(u=x-s\):

\[
\int\frac{u\,du}{(u^2+v^2+z^2)^{3/2}}
=-\frac{1}{\sqrt{u^2+v^2+z^2}},
\quad
\int\frac{dv}{\sqrt{v^2+h^2}}=\operatorname{asinh}(v/h),\ h>0.
\]

因此定义

Thus define

\[
A(b_+,b_-;h)=\operatorname{asinh}(b_+/h)-\operatorname{asinh}(b_-/h),\quad h>0,
\]

即可得到与内核一致的表达式：

and the expressions used by the kernel follow:

\[
P_x=A(y+a,y-a;\sqrt{(x-a)^2+z^2})
-A(y+a,y-a;\sqrt{(x+a)^2+z^2}),
\]

\[
P_y=A(x+a,x-a;\sqrt{(y-a)^2+z^2})
-A(x+a,x-a;\sqrt{(y+a)^2+z^2}).
\]

当 \(h=0\) 且上下限同号时，用精确对数极限：

For \(h=0\) with same-sign bounds, use the exact logarithmic limit:

\[
A(b_+,b_-;0)=
\begin{cases}
\ln(b_+/b_-), & b_+>0,\ b_->0,\\
\ln(b_-/b_+), & b_+<0,\ b_-<0.
\end{cases}
\]

如果积分跨过0且 \(h=0\)，理想尖锐带磁荷边缘出现奇异点；不能把这一点作为空气中的常规探针。当前 FOV 位于孔内，不接触这些边缘。

If the interval crosses zero while \(h=0\), the ideal charged sharp edge is singular. It is not a regular air-domain probe. The current bore ROI does not touch these edges.

### 2.2 法向分量与反三角分支 / Normal component and arctangent branch

令 \(u_i=x+s_i a\)、\(v_j=y+s_j a\)，其中 \(s_0=-1,s_1=+1\)，\(R_{ij}=\sqrt{u_i^2+v_j^2+z^2}\)。对于 \(z\ne0\)：

Let \(u_i=x+s_i a\), \(v_j=y+s_j a\), with \(s_0=-1,s_1=+1\), and \(R_{ij}=\sqrt{u_i^2+v_j^2+z^2}\). For \(z\ne0\):

\[
\boxed{P_z=\sum_{i,j\in\{0,1\}}s_i s_j\,
\arctan\left(\frac{u_i v_j}{zR_{ij}}\right).}
\]

四角的符号顺序为 \(+,-,-,+\)。这里使用主值 \(\arctan\in(-\pi/2,\pi/2)\)，与代码 `Math.atan` 对应；不能直接替换为未调整分支的 `atan2(uᵢvⱼ,zRᵢⱼ)`。后者在 \(z<0\) 时可能增加角度常数，改变场的符号或内部修正。

The four corner signs are \(+,-,-,+\). This is the principal arctangent in \((-\pi/2,\pi/2)\), matching `Math.atan`. An unadjusted `atan2(uᵢvⱼ,zRᵢⱼ)` is not interchangeable: for negative \(z\), it can introduce additional angle constants and alter the field or interior correction.

这一反导数的混合偏导等于 \(z/(u^2+v^2+z^2)^{3/2}\)，故四角求和是原二维积分的准确结果。

The mixed derivative of this antiderivative is \(z/(u^2+v^2+z^2)^{3/2}\), so the four-corner sum evaluates the original double integral exactly.

代码在 \(z=0\) 取面的对称平均值 \(P_z=0\)。在正面平滑内部，单面两侧极限分别为 \(\pm2\pi\)。求磁体内部场必须补上 \(\mathbf M\)：

At \(z=0\), the code uses the symmetric panel value \(P_z=0\). On the smooth interior of a face, the one-sided panel limits are \(\pm2\pi\). Inside the magnet, the magnetization term must be restored:

\[
\frac{\mathbf B_{\mathrm{local}}}{J}
=\frac{\mathbf P(\xi,\eta,\zeta-a;a)-\mathbf P(\xi,\eta,\zeta+a;a)}{4\pi}
+\chi\,\mathbf e_\zeta,
\]

其中方块严格内部 \(\chi=1\)，外部 \(\chi=0\)，位于 \(\zeta=\pm a\) 的平滑磁化面且 \(|\xi|,|\eta|<a\) 时 \(\chi=1/2\)。这正是代码内的 `+1` 和 `+.5`；它保持法向 \(B\) 在平滑面连续，不能省略。理想边／角不使用该平滑面约定。

Here \(\chi=1\) strictly inside the cube, \(0\) outside, and \(1/2\) on a smooth polarized face at \(\zeta=\pm a\), with \(|\xi|,|\eta|<a\). These are the code’s `+1` and `+.5` corrections and preserve continuous normal \(B\) across a smooth face. This convention does not apply at ideal edges or corners.

## 3. 坐标转换与阵列叠加 / Coordinate transform and array sum

第 \(i\) 颗磁铁中心为 \(\mathbf c_i\)，代码中的三个局部正交单位轴为 \(\mathbf u_i,\mathbf v_i,\mathbf n_i\)，其中 \(\mathbf n_i\) 为磁化方向，\(Q_i=[\mathbf u_i\ \mathbf v_i\ \mathbf n_i]\)。因此：

For magnet \(i\), let its center be \(\mathbf c_i\). Its orthogonal local axes in the code are \(\mathbf u_i,\mathbf v_i,\mathbf n_i\), with \(\mathbf n_i\) the magnetization direction, and \(Q_i=[\mathbf u_i\ \mathbf v_i\ \mathbf n_i]\). Then:

\[
\mathbf p_i=Q_i^T(\mathbf r-\mathbf c_i),\qquad
\mathbf B_i(\mathbf r)=J_i Q_i\,\mathbf b_{\mathrm{cube}}(\mathbf p_i),
\]

\[
\boxed{\mathbf B_{\mathrm{total}}(\mathbf r)=\sum_{i=1}^{N}\mathbf B_i(\mathbf r).}
\]

这里 \(\mathbf b_{\mathrm{cube}}=\mathbf B_{\mathrm{local}}/J\)，当前新版 \(N=1736\)。内核的输出无量纲，以当前共同 \(B_r\) 乘1000转换到 mT。观察点与磁铁全部长度采用相同单位时，面核的面积与距离平方相消；代码的模型单位和本文的毫米表述等价，不能只转换其中一部分坐标。

Here \(\mathbf b_{\mathrm{cube}}=\mathbf B_{\mathrm{local}}/J\), and the latest array has \(N=1736\). The kernel returns a dimensionless field; multiplying by the common \(B_r\) and by1000 gives mT. If all lengths use the same unit, the area and squared-distance scale cancel. The model coordinate units and physical millimeters therefore agree; a partial unit conversion would be incorrect.

代码定义 \(\mathbf v_i=\mathbf u_i\times\mathbf n_i\)，因此当前列顺序的 \(\det Q_i=-1\)。它是正交坐标变换，不能称为该列顺序下的右手旋转矩阵。这里局部积分核来自标量势，输入与输出都使用同一 \(Q_i\)，点差向量与距离保留其正交协变关系，所以表达式正确。也可同时把第二局部轴和该分量翻转，写成右手坐标而不改变最终物理场。

The code defines \(\mathbf v_i=\mathbf u_i\times\mathbf n_i\), so this column order gives \(\det Q_i=-1\). It is an orthogonal coordinate transformation rather than a right-handed rotation in that order. The scalar-potential panel kernel transforms covariantly when the same frame is used for input and output, so the physical field remains correct. Reversing both the second local axis and its field component would yield a right-handed frame with the same final field.

设备显示坐标与渲染世界坐标的转换为 \((X,Y,Z)=(x_{world},-z_{world},y_{world})\)。该转换本身是右手旋转。与 MATLAB 比较时另需应用已核对的90°横向坐标／矢量变换，不能只旋转图像而不旋转观察点或场分量。

The displayed device frame is \((X,Y,Z)=(x_{world},-z_{world},y_{world})\), which is a proper rotation. MATLAB comparisons additionally use the verified90° transverse coordinate and vector transform; rotating the image alone is insufficient.

## 4. 为什么截面差值小 / Why the central slice varies little

对称装置的中心附近，一阶空间梯度可因对称抵消。以连续轴对称、孔内无源的理想化情况说明，设轴上场 \(B_z(0,z)=b(z)\)。由无散与无旋条件的局部展开：

Near the center, first-order spatial gradients can cancel through symmetry. For an illustrative continuous axisymmetric source-free bore, let the on-axis field be \(B_z(0,z)=b(z)\). The local divergence-free and curl-free expansions give

\[
B_z(r,z)=b(z)-\frac{r^2}{4}b''(z)+\frac{r^4}{64}b^{(4)}(z)+\cdots,
\]

\[
B_r(r,z)=-\frac r2 b'(z)+\frac{r^3}{16}b^{(3)}(z)+\cdots.
\]

若装置关于 \(z=0\) 对称，则轴向场在此为偶函数，奇数阶轴向导数为零。若排布又使二阶项较小，中心附近的变化可显著减小。但当前28列是离散阵列，不是连续轴对称体；上述展开只解释对称与低阶项抵消的机制，网页数值依然由每颗有限方块完整求和得到。

For a layout symmetric about \(z=0\), the on-axis axial field is even and its odd derivatives vanish there. A small second-order term further reduces near-center variation. The actual28-column array is discrete, not continuously axisymmetric; these expansions explain the cancellation mechanism, while the webpage still sums every finite cube.

初始新版排布、\(Z=0\)、1 mm圆形网格的实际采样结果：

Actual sampled results for the latest initial layout, \(Z=0\), on the1 mm circular grid:

| 横向直径 / Diameter | Bz最小 / Minimum (mT) | Bz最大 / Maximum (mT) | Bz均值 / Mean (mT) | 峰峰差 / Peak-to-peak | 峰峰差 / 均值 / PP over mean |
|---|---:|---:|---:|---:|---:|
| 150 mm | 37.343568936443 | 37.357455340134 | 37.351389787360 | 0.013886403692 mT = 13.886403692 µT | 371.7774297 ppm = 0.037177743% |
| 200 mm | 33.287358908447 | 37.357455340134 | 36.957790057552 | 4.070096431688 mT | 110128.241579 ppm = 11.012824158% |

因此“差距小”适用于这个中心150 mm截面的 Bz；扩大到200 mm时变化明显增加。图中200 mm外环的深蓝可能代表低于固定色标下限的数值，不能从颜色条把它误读成37.343569 mT。中心值约37.343569 mT，不等于区域平均值。

The small variation describes Bz on the central150 mm disk. Variation grows substantially when the disk expands to200 mm. A dark-blue outer annulus can represent values below the locked color minimum; the color bar must not be read as its physical value. The center is approximately37.343569 mT and differs from the region mean.

实际 MATLAB 源码的五截面平均与单个 \(Z=0\) 截面不同。原脚本的五截面平均、150 mm区域采样峰峰差约384.899 ppm；网页单独 \(Z=0\) 的约371.777 ppm。不能混用这两项。

The MATLAB five-plane mean differs from the single \(Z=0\) slice. The current original MATLAB script gives approximately384.899 ppm on the150 mm averaged map, versus371.777 ppm on the single \(Z=0\) map.

## 5. FOV、平均与均匀性 / FOV, averages and homogeneity

FOV 是观察与统计区域 \(\Omega\)，不是场源：

The FOV is an observation/statistical region \(\Omega\), not a magnetic source:

\[
\mathbf B(\mathbf r;\text{same magnets})\quad\text{is independent of }\Omega.
\]

切片上实际离散数值 \(f_k\) 可为 Bz 或 \(|\mathbf B|\)，两者的含义不同：

The sampled scalar \(f_k\) may be Bz or \(|\mathbf B|\), which are different quantities:

\[
\bar f=\frac1N\sum_{k=1}^Nf_k,\qquad
\Delta f=f_{max}-f_{min},\qquad
PP_{ppm}=\frac{\Delta f}{|\bar f|}\,10^6.
\]

对切片，MATLAB 对照的样本标准差为

For the slice, the MATLAB-comparable sample standard deviation is

\[
s=\sqrt{\frac1{N-1}\sum_k(f_k-\bar f)^2}.
\]

五平面平均先逐像素求算术平均，再求这张二维图的统计。平均 \(|\mathbf B|\) 不等于平均矢量再取模。三维分析不采用这种平面平均。

The five-plane mean averages each pixel before calculating map statistics. The mean of vector magnitudes is not the magnitude of the mean vector. The3D analysis does not use the plane-averaged map.

固定色标仅把真实数值映射到颜色，设上下限 \(c_{min},c_{max}\)：

The locked color scale maps true values to color using limits \(c_{min},c_{max}\):

\[
t=\operatorname{clip}\!\left(\frac{f-c_{min}}{c_{max}-c_{min}},0,1\right).
\]

超出范围时发生颜色饱和；不会裁剪读数或更改 \(f\)。相同色标下，相同 XYZ 点在不同 FOV 内的颜色和数值都不变。

Values outside the range saturate in color, while numerical values remain unchanged. With the same locked scale, the color and value at a fixed XYZ point stay invariant across FOV changes.

## 6. 三维圆柱统计 /3D cylinder statistics

以半径 \(R\)、长度 \(L\)、中心原点的圆柱为例，使用

For a centered cylinder of radius \(R\) and length \(L\), use

\[
q=\frac{r^2}{R^2},\quad0\le q\le1;\qquad
dV=r\,dr\,d\theta\,dz=\frac{R^2}{2}\,dq\,d\theta\,dz.
\]

将 \(q,\theta,z\) 分别等分，取单元中点：

Partition \(q,\theta,z\) uniformly and use the cell midpoints:

\[
r_i=R\sqrt{\frac{i+1/2}{N_r}},\quad
\theta_j=\frac{2\pi(j+1/2)}{N_\theta},\quad
z_k=L\left(\frac{k+1/2}{N_z}-\frac12\right).
\]

各单元体积相同，\(w=\pi R^2L/(N_rN_\theta N_z)\)。用每个点完整未平均的 \(f=|\mathbf B|\) 求体积中点积分：

Each cell has the same volume \(w=\pi R^2L/(N_rN_\theta N_z)\). Evaluate the full, unaveraged \(f=|\mathbf B|\) at each point:

\[
\langle f\rangle_V\approx\frac1N\sum_kf_k,\qquad
\sigma_V\approx\sqrt{\frac1N\sum_k(f_k-\langle f\rangle_V)^2}.
\]

这是体积／总体标准差，分母为 \(N\)，不是切片抽样标准差的 \(N-1\)。另在侧壁、端面、轴线和中心采样寻找极值；这些边界样本不参与体积平均。报告的峰峰差使用全部检查点的 \(f_{max}-f_{min}\)，分母使用体积平均 \(\langle f\rangle_V\)。

This is a volume/population standard deviation with denominator \(N\), distinct from the slice sample statistic with \(N-1\). Separate sidewall, end-face, axis and center samples check extrema without entering the volume mean. The report uses extrema from all checked points and the volume mean as the peak-to-peak denominator.

16/64/40与32/128/80两级，以及可选64/256/160加密，给出积分与采样的变化量。有限采样不能证明连续域极值，也不能由这些指标直接宣称临床适用FOV。

The16/64/40 and32/128/80 levels, with optional64/256/160 refinement, report sampling and integration changes. Finite samples do not prove continuous-domain extrema or establish clinically usable FOV.

## 7. 检查依据 / Verification

- 面积分解析结果用独立 Gauss–Legendre 二维数值积分核对，包含正、负面、共面延长线及不同坐标轴。
- 检查方块中心 \(B_z/J=2/3\)、磁化反向、平滑磁化面的法向连续性，以及空气中的数值无散／无旋条件。
- 当前 MATLAB 与网页同一坐标、同一矢量定义逐点核对，数值误差达到浮点计算级；详见 `matlab-field-display-audit.md`。
- 这些验证针对指定的理想化物理模型，实物仍需标定、测场及制造偏差评估。

- Compare the closed-form panel result with an independent2D Gauss–Legendre surface quadrature, covering positive/negative faces, coplanar extensions and different coordinate axes.
- Check the cube-center result \(B_z/J=2/3\), reversed magnetization, continuous normal field at smooth polarized faces, and divergence/curl in air.
- The current MATLAB and webpage fields were compared pointwise in the same coordinate/vector frame, agreeing to floating-point precision; see `matlab-field-display-audit.md`.
- These checks validate the prescribed idealized model. Physical hardware still needs calibration, measurement and manufacturing-tolerance assessment.

基础参考 / Primary references:

- [Magpylib — homogeneous cuboid, polarization J=μ₀M and SI units](https://magpylib.readthedocs.io/en/latest/_autogen/magpylib.magnet.html)
- [Magpylib — analytical magnetostatics and material-response assumptions](https://magpylib.readthedocs.io/en/latest/_pages/user_guide/guide_resources_01_physics.html)
- [Magpylib paper — analytical permanent-magnet computation](https://doi.org/10.1016/j.softx.2020.100466)

本文的体磁荷符号由Maxwell方程独立推导为 \(-\nabla\cdot\mathbf M\)。当前均匀磁化内部该项为零；网站内核只积分正确符号的两个带磁荷面。

The volume-charge sign here is derived independently from Maxwell’s equations as \(-\nabla\cdot\mathbf M\). It is zero inside the uniformly magnetized body; the website kernel integrates the two charged faces with their proper signs.
