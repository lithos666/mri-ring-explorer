"use client";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {Slider} from "@/components/ui/slider";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {coilColors,coilReferences,type SystemLayers,type GradientAxis} from "@/lib/coils";
import type {ViewMode} from "@/lib/mri";
import {useMRIModel} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
interface Props {layers:SystemLayers;axis:GradientAxis;phase:number;view:ViewMode;onLayer:(name:keyof SystemLayers,value:boolean)=>void;onAxis:(axis:GradientAxis)=>void;onPhase:(phase:number)=>void;onPreset:(preset:"all"|"coils"|"magnet")=>void;}
export function CoilControls(p:Props){
 const {t}=useLanguage();
 const model=useMRIModel(),magnets=model.magnets;
 const active=p.view==="assembly";
 return <section className="system-controls" aria-label={t("MRI系统图层","MRI system layers")}>
 <div className="system-heading"><div><span className="eyebrow">MRI SYSTEM</span><h2>{t("系统图层","System layers")}</h2></div><span>{t("线圈为独立参考示意","Coils are separate reference illustrations")}</span></div>
 <div className="system-layer-grid">{([
 ["magnet",t("主磁体 B₀","Main magnet B₀"),t("14 环 · "+magnets.length+" 块"+(model.repeatsConfirmed?"":"（推算）"),"14 rings · "+magnets.length+" magnets"+(model.repeatsConfirmed?"":" (estimated)")),"#8aaeb7"],
 ["gradient",t("梯度线圈","Gradient coils"),"Gx / Gy / Gz",coilColors.gx],
 ["rf",t("RF 线圈","RF coil"),t("鸟笼式 · 横向 B₁","Birdcage · Transverse B₁"),coilColors.rf]
 ] as const).map(([id,title,desc,color])=><div className={"layer-card "+(p.layers[id]?"layer-on":"")} key={id}><div><i style={{background:color}}/><label htmlFor={"layer-"+id}>{title}</label><Switch id={"layer-"+id} aria-label={t("显示"+title,"Show "+title)} checked={p.layers[id]} onCheckedChange={v=>p.onLayer(id,v)}/></div><p>{desc}</p></div>)}</div>
 <div className="system-presets"><span>{active?t("显示开关不代表通电","Visibility does not indicate power"):t("切换图层会返回整体装配","Changing layers returns to assembly view")}</span><div><Button variant="ghost" onClick={()=>p.onPreset("all")}>{t("完整装配","Full assembly")}</Button><Button variant="ghost" onClick={()=>p.onPreset("coils")}>{t("仅看线圈","Coils only")}</Button><Button variant="ghost" onClick={()=>p.onPreset("magnet")}>{t("仅主磁体","Magnet only")}</Button></div></div>
 {active&&(p.layers.gradient||p.layers.rf)&&<div className="coil-options">
 {p.layers.gradient&&<div className="gradient-select"><label htmlFor="gradient-axis">{t("梯度通道","Gradient channel")}</label><Select value={p.axis} onValueChange={v=>p.onAxis(v as GradientAxis)}><SelectTrigger id="gradient-axis" aria-label={t("显示的梯度通道","Visible gradient channel")}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{t("全部三轴","All three axes")}</SelectItem><SelectItem value="gx">{t("Gx · 横向 x","Gx · Transverse x")}</SelectItem><SelectItem value="gy">{t("Gy · 横向 y","Gy · Transverse y")}</SelectItem><SelectItem value="gz">{t("Gz · 通孔轴 z","Gz · Bore axis z")}</SelectItem></SelectContent></Select></div>}
 {p.layers.rf&&<div className="rf-phase"><div><label htmlFor="rf-phase-slider">{t("B₁ 示意相位","B₁ reference phase")}</label><span>{p.phase}°</span></div><Slider id="rf-phase-slider" aria-label={t("RF示意相位","RF reference phase")} value={[p.phase]} min={0} max={360} step={15} onValueChange={v=>p.onPhase(v[0])}/></div>}
 </div>}
 </section>;
}
export function CoilExplanation({layers}:{layers:SystemLayers}){
 const {t}=useLanguage();
 if(!layers.gradient&&!layers.rf)return null;
 return <section className="coil-explanation" aria-label={t("梯度和RF原理","Gradient and RF principles")}>
 <div className="coil-guide-heading"><h2>{t("三类磁场，各司其职","Three fields, three roles")}</h2><span>{t("z 沿 R14 → R01","z follows R14 → R01")}</span></div>
 <div className="coil-guide-grid">
 {layers.gradient&&<article><h3><i style={{background:coilColors.gx}}/>{t("梯度线圈 · 空间编码","Gradient coils · Spatial encoding")}</h3><p>{t("Gx、Gy、Gz 分别表示设备轴向分量 Bz 沿 x、y、z 的变化率。三轴名称指空间变化方向，不能理解为三组 B 分别朝向 x、y、z。","Gx, Gy, and Gz describe how the device-axis component Bz changes along x, y, and z. These axis names identify the direction of spatial variation; they do not mean that three magnetic fields point along x, y, and z.")}</p><div className="coil-formula">ΔBz ≈ Gx·x + Gy·y + Gz·z</div><ul><li><b>Gx / Gy: </b>{t("两组相差 90° 的四鞍形回路，展示横向梯度拓扑。","Two sets of four saddle loops, rotated 90° relative to each other, illustrate transverse-gradient topology.")}</li><li><b>Gz: </b>{t("反向电流的 Maxwell 对，展示轴向梯度拓扑。","A Maxwell pair with opposing currents illustrates axial-gradient topology.")}</li></ul><p className="coil-limit">{t("线圈上的小箭头表示参考正通道电流，不是 B 场方向。为便于理解只画参考回路，未展示引线与匝间连接。实际还存在伴随场分量；线性度、效率、电感和发热须由目标场设计与测量确定。","Small arrows on the coils indicate current for the reference positive channel, rather than B-field direction. Only reference loops are shown; leads and turn connections are omitted. Real coils also produce concomitant-field components. Linearity, efficiency, inductance, and heating require target-field design and measurement.")}</p></article>}
 {layers.rf&&<article><h3><i style={{background:coilColors.rf}}/>{t("RF 线圈 · 激发与接收","RF coil · Excitation and reception")}</h3><p>{t("采用同轴鸟笼式参考拓扑：两端环、16 条纵向导体及导体中的电容间隙。中心 B₁ 横向，相对于设备 Z 轴横向；初始排布下垂直于轴向 B₀。","A coaxial birdcage topology is used as a reference: two end layers, 16 longitudinal conductors, and capacitor gaps in the conductors. At the center, B₁ is transverse to device Z and perpendicular to axial B₀ in the initial configuration.")}</p><div className="coil-formula">{t("初始排布：中心 B₁ ⟂ B₀","Initial layout: center B₁ ⟂ B₀")} · f₀ = (γ / 2π) · B₀</div><p>{t("紫色箭头显示理想正交模式的一个相位。相位滑块用于理解方向，不表示实际 RF 频率，也不是电磁场仿真。","The purple arrow shows one phase of an ideal quadrature mode. The phase slider illustrates direction; it does not represent an actual RF frequency or an electromagnetic simulation.")}</p><p className="coil-limit">{t("RF 层可作为收发一体的概念示意；调谐 / 匹配、T/R 切换、退耦与屏蔽尚待设计。计算 B₀ 可用于估算拉莫尔频率；实际调谐还需实测主场与负载，因此这里不填写电容、B₁ 均匀性或 SAR 数值。","The RF layer is a conceptual illustration of a transmit/receive coil. Tuning, matching, T/R switching, decoupling, and shielding remain to be designed. Calculated B₀ can estimate the Larmor frequency. Actual tuning requires measured main field and loading, so capacitance, B₁ uniformity and SAR values are not assigned here.")}</p></article>}
 </div>
 <p className="coil-spacing">{t("线圈保持初始参考坐标。方向编辑可让局部 B₀ 偏转或变得不均匀；B₁ 应垂直于局部 B₀，有效编码梯度取决于主场方向。当前未重新优化线圈，也未把线圈的通电场叠加进永磁体结果。","Coils retain their initial reference coordinates. Orientation edits can tilt local B₀ or reduce uniformity. B₁ should be perpendicular to local B₀, and the effective encoding gradient depends on the main-field direction. Coils are not reoptimized, and their energized fields are not added to the permanent-magnet result.")}</p><div className="coil-spacing">{t("由外向内：主磁体 → 梯度层 → RF 层 → 待成像空间。线圈保留独立示意尺寸，未按主磁体的实际制造尺寸完成适配。绿色磁感线仍只表示永磁体 B₀ 的参考场，不包含梯度或 RF。","From outside inward: main magnet → gradient layer → RF layer → imaging space. The coils retain independent schematic dimensions and have not been fitted to the magnet's manufacturing dimensions. Green field lines still represent only the permanent-magnet B₀ reference field, excluding gradient and RF fields.")}</div>
 <details className="coil-reading"><summary>{t("近期文献与选型依据","Recent literature and design references")} <span>{t("2025—2026 / 开源方法","2025–2026 / Open-source methods")}</span></summary>{coilReferences.map(r=><a key={r.url} href={r.url} target="_blank" rel="noreferrer"><span>{t(r.date,r.dateEn)}</span><strong>{t(r.title,r.titleEn)} ↗</strong><p>{t(r.text,r.textEn)}</p></a>)}</details>
 </section>;
}
