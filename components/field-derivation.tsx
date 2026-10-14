"use client";
import {useState} from "react";
import {Download,ChevronLeft,ChevronRight} from "lucide-react";
import type {Language} from "@/lib/language-context";
import "./field-derivation.css";

/** This explains the initial baseline; it never presents constants as edited-design results. */
export default function FieldDerivation({language}:{language:Language}){
 const [step,setStep]=useState(0),t=(zh:string,en:string)=>language==="zh"?zh:en;
 const labels=[t("单颗磁铁","One magnet"),t("全阵列叠加","Array superposition"),t("差值与 FOV","Variation & FOV")];
 return <section className="field-derivation" aria-label={t("磁场公式推导","Field derivation")} data-field-derivation-step={step}>
  <header className="field-derivation-heading"><div><p>{t("从物理到图像","FROM PHYSICS TO THE MAP")}</p><h3>{t("这个磁场如何计算？","How is this field computed?")}</h3></div><a href="/resources/field-derivation.md" download><Download size={15}/>{t("完整推导","Full derivation")}</a></header>
  <nav className="field-derivation-steps" aria-label={t("推导步骤","Derivation steps")}>{labels.map((label,index)=><button type="button" key={index} aria-current={step===index?"step":undefined} onClick={()=>setStep(index)}><span>{index+1}</span>{label}</button>)}</nav>
  <div className="field-derivation-body" aria-live="polite">
   {step===0?<>
    <h4>{t("把均匀磁化方块写成两张带磁荷的面","A uniformly magnetized cube becomes two charged faces")}</h4>
    <p>{t("静磁场、无自由电流：H 可以由标量势求出。磁荷是数学等效表示，磁感线仍满足无散条件。","In magnetostatics with no free current, H follows a scalar potential. Magnetic charge is a mathematical representation; B remains divergence-free.")}</p>
    <div className="field-derivation-equation" aria-label="Maxwell equations">∇ · <b>B</b> = 0　　∇ × <b>H</b> = 0　　<b>B</b> = μ₀(<b>H</b> + <b>M</b>)</div>
    <div className="field-derivation-equation"><b>H</b> = −∇Φ<sub>m</sub>　　σ<sub>m</sub> = <b>M</b> · <b>n</b><sub>surface</sub></div>
    <p>{t("沿局部 +ζ 均匀磁化时，ζ=+a 面为 +M，ζ=−a 面为 −M，其余四面为零。对两个有限方形面做精确积分：","For uniform magnetization along local +ζ, the ζ=+a face carries +M, the ζ=−a face carries −M, and the other four faces carry zero. Integrate both finite square faces exactly:")}</p>
    <div className="field-derivation-equation"><b>B</b><sub>local</sub> / J = [<b>P</b>(ξ, η, ζ−a) − <b>P</b>(ξ, η, ζ+a)] / (4π)</div>
    <p className="field-derivation-note">{t("这里是磁铁外部的公式；J = μ₀M，当前模型以 J≈Br=1.43 T。方块 a=6 mm；完整推导给出 asinh / atan 解析式及内部修正。","This equation is for points outside the magnet. J = μ₀M; the model uses J≈Br=1.43 T. The cube half-width a=6 mm. The download includes the asinh / atan expressions and the interior correction.")}</p>
   </>:step===1?<>
    <h4>{t("把每颗磁铁的矢量转回设备坐标，再求和","Transform every vector into device coordinates, then sum")}</h4>
    <p>{t("第 i 颗磁铁有自己的中心 cᵢ 和磁化方向。Qᵢ 的三列是其局部正交坐标轴；先把观察点转换到局部，再把磁场转回。","Magnet i has its own center cᵢ and magnetization direction. The columns of Qᵢ are its orthogonal local axes. Transform the observation point into that frame, then transform the field back.")}</p>
    <div className="field-derivation-equation"><b>p</b><sub>i</sub> = Q<sub>i</sub><sup>T</sup>(<b>r</b> − <b>c</b><sub>i</sub>)</div>
    <div className="field-derivation-equation"><b>B</b><sub>total</sub>(<b>r</b>) = Σ<sub>i=1…1736</sub> J<sub>i</sub> Q<sub>i</sub> <b>b</b><sub>cube</sub>(<b>p</b><sub>i</sub>)</div>
    <p>{t("方向相反的贡献会抵消，方向一致的贡献会增强。Br 是磁体材料参数；孔内磁场由距离、方向、尺寸和全阵列叠加决定。","Opposing vector contributions cancel; aligned contributions reinforce. Br is a material parameter. The bore field depends on distance, orientation, size and the full array sum.")}</p>
    <div className="field-derivation-metrics"><div><span>{t("初始排布 · 中心 |B|","Initial layout · center |B|")}</span><strong>37.343569 <small>mT</small></strong></div><div><span>{t("显示的两个不同量","Two different plotted quantities")}</span><strong>Bz <small>≠</small> |B|</strong></div></div>
    <p className="field-derivation-note">{t("模型假设磁化强度固定、空间为自由空间；未求解钢件响应、温漂或磁铁之间的自洽退磁。数学核对不等于实物测场。","The model prescribes magnetization in free space. It does not solve steel response, temperature drift or self-consistent demagnetization. Mathematical checks do not replace measurements.")}</p>
   </>:<>
    <h4>{t("中心截面的差异确实很小；扩大区域后不同","The central slice varies little; a larger region differs")}</h4>
    <p>{t("以下为初始排布、Z=0、Bz、1 mm 网格的采样值。颜色条是锁定的映射范围，不是当前区域的最小／最大读数。","These are sampled values for the initial layout, Z=0, Bz, on the 1 mm grid. The color bar is a locked mapping range, not the current region’s minimum and maximum.")}</p>
    <div className="field-derivation-values"><table><thead><tr><th>{t("直径","Diameter")}</th><th>{t("实际范围 / mT","Actual range / mT")}</th><th>{t("峰峰差","Peak-to-peak")}</th></tr></thead><tbody><tr><td>150 mm</td><td>37.343569–37.357455</td><td>13.8864 μT</td></tr><tr><td>200 mm</td><td>33.287359–37.357455</td><td>4.070096 mT</td></tr></tbody></table></div>
    <div className="field-derivation-equation">PP<sub>ppm</sub> = (B<sub>max</sub> − B<sub>min</sub>) / |B̄| × 10⁶</div>
    <p>{t("直径150 mm：371.777 ppm = 0.03718%；直径200 mm：110,128 ppm = 11.0128%。外侧深蓝可能是低于锁定色标的饱和颜色。","Diameter 150 mm: 371.777 ppm = 0.03718%; diameter 200 mm: 110,128 ppm = 11.0128%. The dark outer blue can be saturated below the locked color limits.")}</p>
    <p className="field-derivation-note">{t("FOV 只改变统计区域：同一 XYZ 点的场不变。三维报告使用未平均的 |B|、体积积分与独立边界采样；不能由 Z=0 的均匀性推断整个三维区域。","FOV changes the statistical region; B at the same XYZ point remains unchanged. The 3D report uses unaveraged |B|, volume integration and separate boundary sampling. Z=0 homogeneity does not determine the entire 3D region.")}</p>
   </>}
  </div>
  <footer className="field-derivation-footer"><span>{step+1} / 3</span><div><button type="button" disabled={step===0} onClick={()=>setStep(value=>value-1)}><ChevronLeft size={15}/>{t("上一步","Previous")}</button><button type="button" disabled={step===2} onClick={()=>setStep(value=>value+1)}>{t("下一步","Next")}<ChevronRight size={15}/></button></div></footer>
 </section>;
}
