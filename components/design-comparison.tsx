"use client";
import {useEffect,useState} from "react";
import dynamic from "next/dynamic";
import {Button} from "@/components/ui/button";
import {Slider} from "@/components/ui/slider";
import {Switch} from "@/components/ui/switch";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {layoutsFor,rfOptions,clinicalReferences,imagingMetrics,parallelSNR,type LayoutId,type CoilSize,type RFDesign,type ComparisonData} from "@/lib/comparison";
import type {CompareTopic} from "@/components/comparison-scene";
import {useBaselineMRIModel as useMRIModel} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
function SceneLoading(){const {t}=useLanguage();return <div className="compare-scene">{t("正在载入三维对照…","Loading the 3D comparison…")}</div>;}
const Scene=dynamic(()=>import("@/components/comparison-scene"),{ssr:false,loading:SceneLoading});
const rfEnglish:Record<RFDesign,{title:string;tag:string;benefit:string;cost:string;measure:string}>={
 "birdcage": {
  "title": "Birdcage · transmit/receive",
  "tag": "Current reference",
  "benefit": "Suitable for transverse volume excitation around an axial B₀, with a shared transmit/receive structure.",
  "cost": "Requires tuning, matching and T/R switching. Actual B₁ uniformity depends on loading and dimensions.",
  "measure": "B₁⁺ / flip-angle maps, loaded Q, S11 and receive SNR."
 },
 "saddle": {
  "title": "Saddle · transmit/receive",
  "tag": "Transverse B₁",
  "benefit": "Opposing saddle conductors provide transverse excitation and allow comparison of access directions and coil coverage.",
  "cost": "Conductor span and openings affect efficiency, coverage and uniformity. Shape alone does not determine which design performs better.",
  "measure": "Measure B₁⁺, SNR and matching at the same load, volume and frequency."
 },
 "array": {
  "title": "Volume transmit + local receive array",
  "tag": "Separate transmit/receive",
  "benefit": "A birdcage supplies excitation. Independent receive elements close to the target provide differing spatial sensitivities that can support parallel imaging.",
  "cost": "Requires transmit/receive decoupling, inter-element isolation, multiple preamplifiers and noise-covariance calibration. More channels do not guarantee higher SNR.",
  "measure": "The four receive loops are illustrative. Measure B₁⁺, sensitivity maps, noise correlations, g-factors and reconstruction artifacts."
 },
 "solenoid": {
  "title": "Coaxial solenoid · orientation control",
  "tag": "Incompatible with the current main field",
  "benefit": "Shows why RF selection starts with the B₀ direction. A solenoid may suit other systems with a transverse main field.",
  "cost": "With the current axial B₀, the central RF field of a coaxial solenoid is also axial and lacks an effective transverse excitation component.",
  "measure": "This is an orientation counterexample, not a recommended replacement. Reassess compatibility after changing coil orientation or main-field architecture."
 }
};
const referenceEnglish=[
 {
  "title": "ACR · MRI phantom testing (2026 revision)",
  "text": "Clinical images and phantom tests assess the system together. This page follows the evaluation approach without determining compliance."
 },
 {
  "title": "Siemens · Bandwidth in MRI?",
  "text": "Relationships among bandwidth, pixel size, displacement and noise inform the independent parameter demonstration."
 },
 {
  "title": "Pruessmann et al. · Original SENSE paper (1999)",
  "text": "Sensitivity encoding for parallel imaging. The SNR ratio uses given R and g values rather than inferring performance from channel count."
 },
 {
  "title": "Feinberg et al. · NexGen 7 T (Nature Methods, 2023)",
  "text": "Shows coordinated gradient, cooling, RF-array and imaging design. That research system's performance is not transferred to this device."
 },
 {
  "title": "Zhao et al. · 0.05 T whole-body MRI (Science, 2024)",
  "text": "A low-field prototype integrates hardware, interference handling, sequences and reconstruction. Low- and high-field tradeoffs require task-specific validation."
 },
 {
  "title": "Liang et al. · IO Ring (2024)",
  "text": "Supports interpretation of radial magnetization and an axial main field. The four comparisons here derive from the selected user design and are not the paper's optimized solution."
 }
];
const colors={base:"#858b93",test:"#0071e3"};
function Plot({a,b,bound,unit,title,signed=false,positionScale=1,positionUnit}:{a:number[];b:number[];bound:number;unit:string;title:string;signed?:boolean;positionScale?:number;positionUnit?:string}){
 const {t}=useLanguage();
 const hi=Math.max(...a,...b)*1.12||1,lo=signed?-hi:0,W=560,H=225;
 const x=(i:number,n:number)=>52+i/(n-1)*(W-72),y=(v:number)=>22+(hi-v)/(hi-lo)*(H-65);
 const path=(values:number[])=>values.map((v,i)=>(i?"L":"M")+x(i,values.length).toFixed(2)+","+y(v).toFixed(2)).join(" ");
 return <div className="compare-plot"><svg viewBox={"0 0 "+W+" "+H} role="img" aria-label={title}>
 {[0,.5,1].map(t=>{const v=lo+(hi-lo)*t;return <g key={t}><line x1="52" x2={W-20} y1={y(v)} y2={y(v)} stroke="#2d414e"/><text x="44" y={y(v)+5} textAnchor="end">{v.toFixed(2)}</text></g>;})}
 <path d={path(a)} fill="none" stroke={colors.base} strokeWidth="3" strokeDasharray="7 5"/><path d={path(b)} fill="none" stroke={colors.test} strokeWidth="3"/>
 {[-bound,0,bound].map((v,i)=><text key={v} x={x(i,3)} y={H-20} textAnchor="middle">{v*positionScale}</text>)}<text x="310" y={H-2} textAnchor="middle">{unit} · {positionUnit??t("示意单位","schematic units")}</text>
 </svg><div className="compare-legend"><span><i style={{background:colors.base}}/>{t("基准","Baseline")}</span><span><i style={{background:colors.test}}/>{t("当前方案","Current design")}</span></div></div>;
}
function Metric({title,value,note}:{title:string;value:string;note:string}){return <div className="design-metric"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>;}
function Setting({label,value,min,max,step=1,onChange,unit}:{label:string;value:number;min:number;max:number;step?:number;unit:string;onChange:(v:number)=>void}){return <div className="design-setting"><label>{label}<b>{value} <small>{unit}</small></b></label><Slider aria-label={label} value={[value]} min={min} max={max} step={step} onValueChange={v=>onChange(v[0])}/></div>;}
function Heatmap({values,max,title,n}:{values:number[];max:number;title:string;n:number}){
 const {t}=useLanguage();
 return <div className="field-map"><h4>{title}</h4><svg viewBox={"0 0 "+n+" "+n} role="img" aria-label={title+t("的主磁场强度截面"," — main-field magnitude cross-section")}>{values.map((v,i)=>{const t=Math.min(1,v/max);return <rect key={i} x={i%n} y={n-1-Math.floor(i/n)} width="1.03" height="1.03" fill={"hsl("+(225-t*175)+",65%,"+(19+t*54)+"%)"}/>;})}<line x1={n/2} x2={n/2} y1="0" y2={n} stroke="white" strokeOpacity=".25" strokeWidth=".12"/><line x1="0" x2={n} y1={n/2} y2={n/2} stroke="white" strokeOpacity=".25" strokeWidth=".12"/></svg></div>;
}
function ClinicalLab(){
 const {t}=useLanguage();
 const [b0,setB0]=useState(.05),[g,setG]=useState(10),[bw,setBW]=useState(200),[ppm,setPPM]=useState(10),[slew,setSlew]=useState(50);
 const m=imagingMetrics(b0,g,bw,ppm,slew),shift=Math.min(75,m.shiftPixels*10);
 return <section className="clinical-lab"><div className="design-section-heading"><div><span className="eyebrow">PARAMETER LAB</span><h2>{t("从参数到图像","From parameters to images")}</h2></div><span className="evidence-tag">{t("理想公式演示","Idealized formula demonstration")}</span></div>
 <p>{t("这里的 T、mT/m 和 Hz 是独立的假设输入，不随所选磁层自动变化。保持其他条件不变，观察单个参数的影响。","The values in T, mT/m and Hz are independent hypothetical inputs and do not automatically follow the selected magnet array. Hold the other inputs constant to explore each parameter.")}</p>
 <div className="clinical-lab-grid"><div className="lab-inputs"><label className="lab-label">{t("假设主场 B₀","Assumed main field B₀")}</label><div className="b0-buttons">{[.05,.55,1.5,3].map(v=><Button key={v} aria-pressed={v===b0} variant="outline" onClick={()=>setB0(v)}>{v} T</Button>)}</div>
 <Setting label={t("读出梯度 G","Readout gradient G")} value={g} min={5} max={50} step={5} unit="mT/m" onChange={setG}/>
 <Setting label={t("接收带宽 / 像素","Receiver bandwidth / pixel")} value={bw} min={100} max={1000} step={50} unit="Hz/px" onChange={setBW}/>
 <Setting label={t("局部 B₀ 偏差","Local B₀ offset")} value={ppm} min={0} max={50} step={1} unit="ppm" onChange={setPPM}/>
 <Setting label={t("梯度切换率 S","Gradient slew rate S")} value={slew} min={10} max={200} step={10} unit="T/m/s" onChange={setSlew}/>
 </div><div><div className="lab-metrics">
 <Metric title={t("¹H 拉莫尔频率","¹H Larmor frequency")} value={m.frequencyMHz.toFixed(3)+" MHz"} note="f₀ = (γ/2π) B₀"/>
 <Metric title={t("读出像素尺寸","Readout pixel size")} value={m.pixelMM.toFixed(3)+" mm"} note="Δx = BWpx / [(γ/2π) G]"/>
 <Metric title={t("频率偏移","Frequency offset")} value={m.offsetHz.toFixed(1)+" Hz"} note="Δf = (γ/2π) ΔB₀"/>
 <Metric title={t("读出方向位移","Readout displacement")} value={m.shiftPixels.toFixed(2)+" px"} note={t("Δ像素 = Δf / BWpx","Δpixels = Δf / BWpx")}/>
 <Metric title={t("达到该梯度的最短爬升","Minimum ramp time to this gradient")} value={m.rampMS.toFixed(2)+" ms"} note={t("理想线性爬升 G / S；非总扫描时间","Ideal linear ramp G / S; not total scan time")}/>
 <Metric title={t("带宽相关 SNR 因子","Bandwidth-only SNR factor")} value={m.relativeBandwidthSNR.toFixed(2)+"×"} note={t("仅噪声带宽项，相对 200 Hz/px","Noise-bandwidth term only, relative to 200 Hz/px")}/>
 </div><svg className="distortion-demo" viewBox="0 0 500 130" role="img" aria-label={t("均匀失谐引起的读出方向位移示意","Readout displacement caused by uniform off-resonance")}><defs><pattern id="encoding-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" stroke="#324653" fill="none" strokeWidth=".5"/></pattern></defs><rect x="10" y="15" width="480" height="100" fill="url(#encoding-grid)"/>{[0,1,2,3,4].map(i=><g key={i}><circle cx={90+i*65} cy="60" r="17" stroke="#839aa8" strokeDasharray="4 3" fill="none"/><circle cx={90+i*65+shift} cy="60" r="17" stroke="#0071e3" strokeWidth="2" fill="#80e6d51a"/></g>)}<text x="250" y="106" textAnchor="middle">{t("虚线：原位置　实线：读出位置","Dashed: original position · Solid: readout position")}</text></svg><p className="design-note">{t("每格代表 1 像素；图示位移最多画到 7.5 格，数值不截断。恒定失谐造成整体位移，空间变化的失谐才会造成形变。仅适用于线性频率编码，不代替 EPI 畸变计算。","Each grid cell represents one pixel. The drawing caps displacement at 7.5 cells; the numerical value remains uncapped. Uniform off-resonance shifts the whole image, while spatially varying off-resonance causes distortion. This applies to linear frequency encoding and does not replace an EPI distortion calculation.")}</p></div></div>
 <div className="clinical-insight"><strong>{t("怎样理解这些取舍？","How should these tradeoffs be interpreted?")}</strong><p>{t("固定像素尺寸时，提高读出带宽需要更强的梯度；带宽增大通常降低失谐位移，同时增加噪声带宽。上面的带宽 SNR 因子不包含像素体积变化，因此不能当作改变全部参数后的最终 SNR。更高切换率缩短爬升，但实际还受电压、电感、发热、声音和外周神经刺激约束。","At a fixed pixel size, higher readout bandwidth requires a stronger gradient. It usually reduces off-resonance displacement while increasing noise bandwidth. The SNR factor above excludes voxel-volume changes, so it is not the final SNR after changing all parameters. Higher slew rate shortens ramps; voltage, inductance, heat, acoustic noise and peripheral nerve stimulation also constrain real operation.")}</p></div>
 </section>;
}
export default function DesignComparison(){
 const {t,language}=useLanguage();
 const model=useMRIModel(),MODEL_UNIT_MM=model.unitMM??1;
 const modelTitle=t(model.title,model.id==="latest"?"New design":"Original design");
 const spacing=model.unitMM?(model.pitchMM+" mm"):model.pitch+" schematic units";
 const layoutEnglish:Record<LayoutId,{title:string;text:string}>={
  baseline:{title:modelTitle+" · 14-ring baseline",text:"Retain the selected design's magnetization sequence, radial positions and "+spacing+" between ring centers."},
  radial:{title:"All-radial control",text:"Change only the "+model.totals.axial+" axial magnets to radial magnetization: outward in the upper half and inward in the lower half. Keep all "+model.magnets.length+" magnets."},
  flip:{title:"Reverse axial magnets",text:"Reverse only the N-pole direction of the "+model.totals.axial+" axial magnets. Keep all other positions and directions."},
  spread:{title:"Increase ring spacing by 15%",text:"Increase the "+spacing+" ring spacing by 15%. Keep all other positions, directions and counts."}
 };
 const layouts=layoutsFor(model).map(x=>({...x,title:t(x.title,layoutEnglish[x.id].title),text:t(x.text,layoutEnglish[x.id].text)}));
 const dimensionNote=t(model.dimensionNote,model.dimensionNoteEn);
 const localizedRF=rfOptions.map(x=>({...x,title:t(x.title,rfEnglish[x.id].title),tag:t(x.tag,rfEnglish[x.id].tag),benefit:t(x.benefit,rfEnglish[x.id].benefit),cost:t(x.cost,rfEnglish[x.id].cost),measure:t(x.measure,rfEnglish[x.id].measure)}));
 const localizedReferences=clinicalReferences.map((x,i)=>({...x,title:t(x.title,referenceEnglish[i].title),text:t(x.text,referenceEnglish[i].text)}));
 const positionUnit=model.unitMM?"mm":t("示意单位","schematic units");
 const [topic,setTopic]=useState<CompareTopic>("magnet"),[layout,setLayout]=useState<LayoutId>("radial"),[size,setSize]=useState<CoilSize>("compact"),[axis,setAxis]=useState<"gx"|"gy"|"gz">("gx"),[rf,setRF]=useState<RFDesign>("array"),[roi,setROI]=useState(1.5),[show3d,setShow3D]=useState(true),[r,setR]=useState(2),[gf,setGF]=useState(1.2);
 const [data,setData]=useState<ComparisonData|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let live=true;fetch("/comparison-data-"+model.id+".json").then(r=>{if(!r.ok)throw new Error("data");return r.json();}).then(value=>{const d=value as ComparisonData;if(live&&d.schemeId===model.id&&d.count===model.magnets.length)setData(d as ComparisonData);else if(live)setFailed(true);}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;};},[model]);
 const current=data?.layouts[layout],base=data?.layouts.baseline,cm=current?.metrics.find(m=>m.radius===roi),bm=base?.metrics.find(m=>m.radius===roi),grad=data?.gradients[size][axis],baseGrad=data?.gradients.standard[axis];
 const rfInfo=localizedRF.find(x=>x.id===rf)!;
 const max=data?Math.ceil(Math.max(...Object.values(data.layouts).flatMap(x=>x.plane))*10)/10:1;
 return <section className="design-workbench" data-language={language} aria-label={t("MRI方案对比","MRI design comparison")}><div className="design-intro"><div><span className="eyebrow">DESIGN → FIELD → IMAGE</span><h2>{t("改变结构，会怎样影响成像？","How does changing the structure affect imaging?")}</h2></div><p>{t("以当前选择的","Using the selected ")}{modelTitle}{t("为基准，比较场均匀性、空间编码和信号接收。"," as the baseline, compare field uniformity, spatial encoding and signal reception.")}</p></div>
 <div className="design-topic-tabs" role="tablist" aria-label={t("对比板块","Comparison topics")}>{([["magnet","01",t("磁铁排布","Magnet arrangement"),t("B₀ 与均匀性","B₀ and uniformity")],["gradient","02",t("梯度线圈","Gradient coils"),t("编码与线性度","Encoding and linearity")],["rf","03",t("RF 方案","RF designs"),t("激发与接收","Excitation and reception")]] as const).map(([id,num,title,sub])=><button key={id} role="tab" aria-selected={topic===id} onClick={()=>setTopic(id)}><span>{num}</span><div><strong>{title}</strong><small>{sub}</small></div></button>)}</div>
 <div className="design-grid"><aside className="design-choices"><h3>{t("选择对照方案","Choose a comparison design")}</h3>
 {topic==="magnet"&&layouts.map(x=><button className="design-choice" aria-pressed={layout===x.id} key={x.id} onClick={()=>setLayout(x.id)}><strong>{x.title}</strong><span>{x.text}</span></button>)}
 {topic==="gradient"&&([["standard",t("参考尺寸","Reference dimensions"),t("原 Golay / Maxwell 参考回路。","Original Golay / Maxwell reference windings.")],["compact",t("全部尺寸缩至 80%","Scale all dimensions to 80%"),t("相同匝数和电流，按比例缩小所有导线路径。","Scale down every conductor path at the same turn count and current.")],["large",t("全部尺寸增至 120%","Scale all dimensions to 120%"),t("相同匝数和电流，按比例放大所有导线路径。","Scale up every conductor path at the same turn count and current.")]] as const).map(([id,title,text])=><button className="design-choice" aria-pressed={size===id} key={id} onClick={()=>setSize(id)}><strong>{title}</strong><span>{text}</span></button>)}
 {topic==="rf"&&localizedRF.map(x=><button className="design-choice" aria-pressed={rf===x.id} key={x.id} onClick={()=>setRF(x.id)}><strong>{x.title}</strong><span>{x.tag}</span></button>)}
 {topic==="magnet"&&<div className="design-select"><label>{t("共同球形比较区半径","Shared spherical ROI radius")}</label><Select value={String(roi)} onValueChange={v=>setROI(Number(v))}><SelectTrigger aria-label={t("比较区半径","Comparison ROI radius")}><SelectValue/></SelectTrigger><SelectContent>{[.75,1.5,2.25].map(v=><SelectItem key={v} value={String(v)}>{model.unitMM?"≈ ":""}{v*MODEL_UNIT_MM} {model.unitMM?"mm":t("示意单位","schematic units")}</SelectItem>)}</SelectContent></Select></div>}
 {topic==="gradient"&&<div className="design-select"><label>{t("梯度通道","Gradient channel")}</label><Select value={axis} onValueChange={v=>setAxis(v as typeof axis)}><SelectTrigger aria-label={t("比较梯度通道","Comparison gradient channel")}><SelectValue/></SelectTrigger><SelectContent>{(["gx","gy","gz"] as const).map(v=><SelectItem key={v} value={v}>{v==="gx"?"Gx":v==="gy"?"Gy":"Gz"}</SelectItem>)}</SelectContent></Select></div>}
 <div className="design-visibility"><label htmlFor="comparison-3d">{t("显示三维结构","Show 3D structure")}</label><Switch id="comparison-3d" checked={show3d} onCheckedChange={setShow3D}/></div><p className="design-note">{t("对照方案单独计算。清单、统计、场与对照使用同一","Comparison variants are calculated separately. The inventory, statistics, field and comparisons use the same ")}{modelTitle}{t("。",". ")}{dimensionNote} {model.repeats+t(" 列已确认。"," columns confirmed. ")}{t("梯度与 RF 沿用独立参考结构。","The gradient and RF coils retain separate reference structures.")}</p></aside>
 <div className="design-results" role="tabpanel">
 <div className="design-result-title"><h3>{topic==="magnet"?layouts.find(x=>x.id===layout)?.title:topic==="gradient"?t("同电流下的几何取舍","Geometry tradeoffs at equal current"):rfInfo.title}</h3><span className="evidence-tag">{topic==="rf"?t("拓扑 / 原理对照","Topology / principle comparison"):t("理想模型计算","Idealized model calculation")}</span></div>
 {show3d&&<><Scene key={model.id} topic={topic} layout={layout} size={size} axis={axis} rf={rf} roi={roi}/><p className="design-scene-caption">{topic==="magnet"?t("红 / 蓝为 N / S；绿色球体仅标记比较区，并非已验证的成像范围。","Red / blue indicate N / S. The green sphere marks only the comparison ROI, not a validated imaging volume."):topic==="gradient"?t("箭头沿参考电流；球体是半径 1.5 示意单位的共同评价区。尺寸变化只用于孤立绕组对照，需重新检查装配间隙。","Arrows follow the reference current. The sphere is a shared evaluation region of radius 1.5 schematic units. Scaling compares isolated windings; assembly clearance must be checked again."):t("灰色箭头为 B₀，紫色箭头为中心 RF 场方向。彩色内侧回路表示接收单元，未画完整调谐 / 退耦电路。","The gray arrow indicates B₀; the purple arrow indicates the central RF-field direction. Colored inner loops represent receive elements. Full tuning and decoupling circuits are not shown.")}</p></>}
 {topic!=="rf"&&!data&&<div className="design-loading" role="status">{failed?t("对比数据载入失败，请刷新重试。结构示意和原理说明仍可查看。","Comparison data could not be loaded. Refresh to retry. The structural view and explanations remain available."):t("正在载入同条件计算结果…","Loading results calculated under matching conditions…")}</div>}
 {topic==="magnet"&&current&&base&&cm&&bm&&<><div className="design-metrics">
 <Metric title={t("中心 |B| · mT","Central |B| · mT")} value={(current.center*model.remanenceT*1000).toFixed(3)} note={current.centerRatio.toFixed(3)+t("× 初始中心场","× initial center field")}/>
 <Metric title={t("球内峰峰变化 / 均值","Spherical ROI peak-to-peak / mean")} value={cm.spread.toFixed(2)+"%"} note={t("基准 ","Baseline ")+bm.spread.toFixed(2)+t("% · 越小越平坦","% · Lower means more uniform")}/>
 <Metric title={t("球内 RMS / 均值","Spherical ROI RMS / mean")} value={cm.rms.toFixed(2)+"%"} note={t("基准 ","Baseline ")+bm.rms.toFixed(2)+"% · "+cm.samples+t(" 个采样点"," sample points")}/>
 </div><div className="design-callout" aria-live="polite"><strong>{layout==="baseline"?t("基准用于比较，不代表已经优化","The baseline is a comparison reference, not an optimized design"):current.centerRatio>1&&cm.spread>bm.spread?t("中心场更强，但共同区域内更不均匀","Stronger central field, less uniform in the shared ROI"):cm.spread>bm.spread?t("这个改动没有改善当前比较区的均匀性","This change does not improve uniformity in the current ROI"):t("该区域的相对场变化减小","Relative field variation decreases in this ROI")}</strong><p>{t("中心场变化 ","Central-field change ")}{(current.centerRatio-1)>=0?"+":""}{((current.centerRatio-1)*100).toFixed(1)}{t("%；球内峰峰变化从 ","%; ROI peak-to-peak variation changes from ")}{bm.spread.toFixed(2)}{t("% 变为 ","% to ")}{cm.spread.toFixed(2)}{t("%。评价区半径为 ","%. The ROI radius is ")}{roi*MODEL_UNIT_MM} {positionUnit}{t("，磁块均采用相同磁化强度；结论仅适用于这些暂定条件。",". Every magnet uses the same magnetization magnitude; these conclusions apply only to the stated provisional conditions.")}</p></div>
 <div className="compare-chart-title"><h4>{t("轴线上 |B| 的变化","Axial |B| profile")}</h4><span>{t("相对基准中心场","Relative to the baseline central field")}</span></div><Plot a={base.profile} b={current.profile} bound={data!.profileBound} unit={t("通孔轴 z","Bore axis z")} positionScale={MODEL_UNIT_MM} positionUnit={positionUnit} title={t("基准与当前排布的轴向场曲线","Axial field profiles of the baseline and current arrangement")}/>
 <details className="design-detail"><summary>{t("查看同色标截面与计算定义","Cross-sections with a shared color scale and calculation definitions")}</summary><div className="field-map-pair"><Heatmap values={base.plane} max={max} title={t("基准","Baseline")} n={31}/><Heatmap values={current.plane} max={max} title={t("当前方案","Current design")} n={31}/></div><div className="field-colorbar"><span>0</span><i/><span>{max.toFixed(1)} {t(" × 基准中心"," × baseline center")}</span></div><p>{t("首列截面 x′ / z ∈ [−","First-column plane x′ / z ∈ [−")}{data!.planeBound*MODEL_UNIT_MM}, {data!.planeBound*MODEL_UNIT_MM}] {positionUnit}，{data!.planeSize} × {data!.planeSize} {t(" 点。峰峰变化 = (max|B| − min|B|) / mean|B|；RMS = 标准差 / mean|B|。球内使用共同 515 点网格，采样极值不能替代连续体积的最坏值搜索。"," points. Peak-to-peak variation = (max|B| − min|B|) / mean|B|; RMS = standard deviation / mean|B|. A shared 515-point grid samples the sphere. Sample extrema do not replace a worst-case search over the continuous volume.")}</p><p>{t("这不是临床影像均匀性指标，也不是完整匀场优化。Br 与几何来自 MATLAB 参数；制造公差、温漂与实测场图尚未纳入。","This is not a clinical image-uniformity metric or complete shimming optimization. Br and geometry come from MATLAB parameters. Manufacturing tolerances, thermal drift and measured field maps are not included. ")}{model.id==="latest"?t("新版图未给强度类别。","The new drawing does not specify strength categories. "):t("原方案保存Weak / Normal / Strong类别，但未给数值差异。","The original design retains Weak / Normal / Strong categories without numerical differences. ")}{t("所有磁块采用 Br = 1.43 T；中心 mT 值为 J ≈ Br 假设下的理想计算场。","All blocks use Br = 1.43 T. Center values in mT are ideal predictions under J ≈ Br.")}</p></details></>}
 {topic==="gradient"&&grad&&baseGrad&&<><div className="design-metrics"><Metric title={t("中心梯度 / 基准梯度","Central gradient / baseline gradient")} value={grad.relativeEfficiency.toFixed(3)+"×"} note={t("相同匝数、相同电流","Same turn count and current")}/><Metric title={t("球内最大线性偏差","Maximum linearity error in the sphere")} value={grad.error.toFixed(2)+"%"} note={t("基准 ","Baseline ")+baseGrad.error.toFixed(2)+t("% · 半径 1.5 示意单位","% · Radius 1.5 schematic units")}/><Metric title={t("同目标梯度所需电流","Current required for the same target gradient")} value={(1/grad.relativeEfficiency).toFixed(3)+"×"} note={t("忽略材料响应与驱动限制","Excludes material response and driver limits")}/></div>
 <div className="design-callout"><strong>{size==="compact"?t("缩小绕组可提高中心效率，但要同时看可用成像区","Smaller windings can improve central efficiency; the usable imaging region also matters"):size==="large"?t("更大的结构占用空间，也改变效率与线性区","Larger structures need more space and change efficiency and the linear region"):t("参考绕组只表达基本梯度拓扑","The reference windings illustrate basic gradient topology")}</strong><p>{t("这里按相同电流比较，均匀缩放后中心梯度近似按尺寸的平方反比变化。相同目标梯度下的电流变化，不等于功耗或温升变化；电阻、线径、冷却和占空比尚未建模。","This comparison holds current constant. Under uniform scaling, the central gradient varies approximately with the inverse square of size. The current change needed for a fixed target gradient is not a prediction of power or temperature rise. Resistance, wire gauge, cooling and duty cycle are not modeled.")}</p></div>
 <div className="compare-chart-title"><h4>{t("Bz 沿编码方向的变化","Bz along the encoding direction")}</h4><span>{t("除以基准中心梯度","Divided by the baseline central gradient")}</span></div><Plot a={baseGrad.profile} b={grad.profile} bound={1.5} unit={axis==="gx"?"x":axis==="gy"?"y":"z"} title={t("梯度几何改变后的 Bz 曲线","Bz profiles after changing gradient geometry")} signed/>
 <details className="design-detail"><summary>{t("线性偏差定义与临床梯度的区别","Linearity-error definition and comparison with clinical gradients")}</summary><p>{t("Biot–Savart 细导线模型。中心导数 G₀ 由对称小步长估计；球内误差 = max |Bz(r) − G₀·坐标| / (|G₀|·1.5)。共同球内 ","Biot–Savart thin-wire model. The central derivative G₀ is estimated using small symmetric steps. ROI error = max |Bz(r) − G₀·coordinate| / (|G₀|·1.5). The shared sphere contains ")}{grad.samples} {t(" 点；这不是实际厂商的线性度规格，也不只检查轴上一条线。"," points. This is not a manufacturer's linearity specification, and it evaluates more than a single axial line.")}</p><p>{t("临床梯度还需目标场绕组优化、主动屏蔽和涡流补偿、伴随场校正，以及效率 / 电感 / 电压 / 热设计。主动屏蔽绕组不是 RF 屏蔽层；它可能减小外部变化场与涡流，但需要联合设计，不能简单复制外层线圈。","Clinical gradients also require target-field winding optimization, active shielding, eddy-current compensation, concomitant-field correction, and efficiency, inductance, voltage and thermal design. Active gradient shielding is different from an RF shield. It can reduce external changing fields and eddy currents, but needs joint design rather than a copied outer winding.")}</p></details></>}
 {topic==="rf"&&<><div className={"rf-compatibility "+(rf==="solenoid"?"mismatch":"")}><strong>{rf==="solenoid"?t("当前朝向不适合中心激发","This orientation is unsuitable for central excitation"):t("中心 RF 方向与当前轴向 B₀ 匹配","The central RF-field direction matches the axial B₀")}</strong><span>{rf==="solenoid"?t("B₁ ∥ B₀ · 理想中心横向分量为零","B₁ ∥ B₀ · Zero ideal transverse component at the center"):t("B₁ ⟂ B₀ · 方向匹配不等于性能合格","B₁ ⟂ B₀ · Compatible orientation does not establish performance")}</span></div><div className="rf-tradeoffs"><article><h4>{t("可能带来的好处","Potential benefits")}</h4><p>{rfInfo.benefit}</p></article><article><h4>{t("同时付出的代价","Tradeoffs")}</h4><p>{rfInfo.cost}</p></article><article><h4>{t("要用什么证明","Evidence to collect")}</h4><p>{rfInfo.measure}</p></article></div>
 {rf==="array"&&<div className="parallel-lab"><h4>{t("并行加速：速度与噪声的取舍","Parallel acceleration: speed and noise")}</h4><p>{t("给定同一阵列的假设 g 因子，不根据 4 个示意回路推算真实性能。","This uses an assumed g-factor for the same array. The four illustrative loops do not predict actual performance.")}</p><Setting label={t("假设加速因子 R","Assumed acceleration factor R")} value={r} min={1} max={4} unit="×" onChange={setR}/><Setting label={t("假设 g 因子","Assumed g-factor")} value={gf} min={1} max={2} step={.1} unit="" onChange={setGF}/><div className="design-metrics"><Metric title={t("并行成像 SNR / 未加速 SNR","Parallel-imaging SNR / unaccelerated SNR")} value={(r===1?1:parallelSNR(r,gf)).toFixed(3)+"×"} note={r===1?t("未加速时按 g = 1","Use g = 1 without acceleration"):t("SNR 比 = 1 / (g √R)","SNR ratio = 1 / (g √R)")}/><Metric title={t("理想编码采样时间比例","Ideal encoding acquisition-time ratio")} value={(1/r).toFixed(2)+"×"} note={t("忽略校准、准备和固定时间","Excludes calibration, preparation and fixed overhead")}/></div><p className="design-note">{t("R = 1 不应用额外 g 惩罚。实际 g 是空间分布，并与加速方向、敏感度和噪声相关有关；增加通道数不能直接换算成 SNR 倍数。","No additional g-factor penalty is applied at R = 1. Real g-factors vary spatially with acceleration direction, sensitivity and noise correlations. Extra channels do not translate directly into an SNR multiplier.")}</p></div>}
 <p className="design-note">{t("B₁⁺ 影响激发与翻转角，接收敏感度 B₁⁻ 影响信号；两者不能混为同一个“亮度”。本页没有人体负载模型，不给出 SAR 或具体线圈的绝对 SNR 排名。","B₁⁺ determines excitation and flip angle; receive sensitivity B₁⁻ affects signal reception. They are distinct quantities, not a single brightness measure. This page has no human loading model and does not report SAR or rank coils by absolute SNR.")}</p></>}
 </div></div>
 <ClinicalLab/>
 <section className="clinical-benchmark"><div className="design-section-heading"><div><span className="eyebrow">CLINICAL PERSPECTIVE</span><h2>{t("向医用系统靠近，要补齐哪些证据？","What evidence is needed for a clinical system?")}</h2></div></div><p>{t("场强不是“医用级别”的判定线。借鉴 ACR 的临床图像与体模评价思路，按相同成像任务检查整套系统；这里不作认证或诊断性能判定。","Field strength alone does not establish clinical suitability. Following the ACR approach to clinical-image and phantom assessment, evaluate the complete system for the same imaging task. This page does not determine accreditation or diagnostic performance.")}</p><div className="clinical-table-wrap"><table><thead><tr><th>{t("系统环节","Subsystem")}</th><th>{t("改变结构会影响","Effects of structural changes")}</th><th>{t("接下来应验证","Next validation steps")}</th></tr></thead><tbody>
 <tr><th>{t("主磁体 / 匀场","Main magnet / shimming")}</th><td>{t("离共振、几何变形、信号去相位；较强中心场不保证较大均匀区。","Off-resonance, geometric distortion and signal dephasing. A stronger central field does not guarantee a larger uniform region.")}</td><td>{t("明确体积内的实测 B₀ 图、漂移、匀场残差与目标序列容忍度。","Measured B₀ maps within a defined volume, drift, shimming residuals and tolerance of the target sequences.")}</td></tr>
 <tr><th>{t("梯度 / 放大器","Gradients / amplifiers")}</th><td>{t("空间编码、分辨率、回波时间；电感、热与驱动限制共同决定可用波形。","Spatial encoding, resolution and echo time. Inductance, heat and driver limits jointly constrain usable waveforms.")}</td><td>{t("三轴标定、线性度、涡流 / 伴随场、占空比及相应运行限制。","Three-axis calibration, linearity, eddy and concomitant fields, duty cycle and operating limits.")}</td></tr>
 <tr><th>{t("RF / 接收链","RF / receive chain")}</th><td>{t("激发均匀性、覆盖、SNR 与可用加速；收发隔离和噪声相关会改变结果。","Excitation uniformity, coverage, SNR and feasible acceleration. Transmit/receive isolation and noise correlations affect the result.")}</td><td>{t("负载下调谐匹配、B₁ 图、敏感度 / 噪声图、退耦和功率管理。","Loaded tuning and matching, B₁ maps, sensitivity and noise maps, decoupling and power management.")}</td></tr>
 <tr><th>{t("整机成像","System-level imaging")}</th><td>{t("硬件、序列和重建共同决定可辨识的结构与伪影。","Hardware, sequences and reconstruction together determine visible structures and artifacts.")}</td><td>{t("体模的几何、分辨率、层厚、均匀性、鬼影与对比度，再评价目标临床任务。","Phantom geometry, resolution, slice thickness, uniformity, ghosting and contrast, followed by assessment of the target clinical task.")}</td></tr>
 </tbody></table></div></section>
 <details className="design-references"><summary>{t("文献、公式与验证范围 ","References, formulas and validation scope ")}<span>{t("原始研究 / 官方资料","Original research / official sources")}</span></summary><div>{localizedReferences.map(x=><a key={x.url} href={x.url} target="_blank" rel="noreferrer"><strong>{x.title} ↗</strong><p>{x.text}</p></a>)}</div><p>{t("当前实现包含四种有限磁块场对照、三种相似缩放绕组及理想成像公式。未计算实际序列的 Bloch 演化、人体 RF 场或诊断准确率；图示不是患者 MRI 图像。","This implementation compares four finite-block magnet fields, three uniformly scaled winding geometries and idealized imaging formulas. It does not calculate sequence-specific Bloch evolution, human RF fields or diagnostic accuracy. The illustrations are not patient MRI images.")}</p></details>
 </section>;
}
