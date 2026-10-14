# 三维圆柱磁场评估 / 3D cylinder magnetic-field assessment

圆柱 / Cylinder: D = 150 mm, L = 200 mm; Z = -100…100 mm; centre / 中心 = (0, 0, 0).
中心场强 / Centre field: 37.3435689364 mT. 体积平均场强 / Volume mean: 37.7860037554 mT.

这是采样与积分估计；不代表连续空间极值已被证明，也不设定临床合格阈值。
These are sampling and integration estimates, not proven continuous extrema or a clinical acceptance criterion.

体积指标使用各点原始 |B|。u = r²/R²、角度与轴向等分的中点网格具有相同体积权重；表面与轴线仅用于极值搜索，不参与体积平均。
Volume metrics use raw |B| and equal-volume midpoint integration in u = r²/R², angle and Z. Sidewall, endcaps and axis contribute only to sampled extrema.

| 网格 / Grid | 体积点 / Volume points | 平均 / Mean (mT) | 体积标准差 / Population std (mT) | 峰峰差 / P–P (mT) | P–P / mean (ppm) |
|---|---:|---:|---:|---:|---:|
| 16 × 64 × 40 | 40960 | 37.7871855842 | 1.47555842054 | 12.1024709941 | 320279.766991 |
| 32 × 128 × 80 | 327680 | 37.7860037554 | 1.47866268808 | 12.1464726132 | 321454.279523 |

最低采样点 / Sampled minimum: 32.2594489247 mT at (0.00000000000, 0.00000000000, 100.000000000) mm [axis].
最高采样点 / Sampled maximum: 44.4059215379 mT at (-53.0330085890, -53.0330085890, 97.5000000000) mm [sidewall].

峰峰 ppm = (max |B| − min |B|) / volume mean |B| × 10⁶。体积标准差使用总体定义，与 MATLAB 截面 N−1 样本标准差不同。
Peak-to-peak ppm = (max |B| − min |B|) / volume mean |B| × 10⁶. Volume standard deviation uses population weights, distinct from MATLAB section N−1 sample standard deviation.

加密变化 / Refinement change (32 × 128 × 80): mean -0.00118182879407 mT; P–P 0.0440016191045 mT; P–P 1174.51253228 ppm.

Br = 1.43 T; 1736 magnets; units = mm / mT / ppm.
Kernel: uniform-cube-poles-v2; algorithm: equal-volume-midpoint-cylinder-v1.
Geometry: mri-geometry-v1-0c45374f91179365.
Source signature: 3386f4865cefb1d12b5de9eb98861dc7014ed446c84fa1907c1961862c3c3a40.
Analysis signature: 48a5f764c0d5aa008f9fb9a7951d19032d629aa17382e2629d9bec28e91afd97.
Generated: 2026-10-13T16:18:09.132Z.
