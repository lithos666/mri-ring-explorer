"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {Circle,Info} from "lucide-react";
import {useLanguage} from "@/lib/language-context";
import type {MRIModel} from "@/lib/mri";
import {roiMetrics,fovCurve,recommendFOV,summarizeField,type TransverseFieldResult} from "@/lib/transverse-field";
import {TRANSVERSE_RANGES,type TransverseRangeId} from "@/lib/transverse-ranges";
import "./transverse-field-panel.css";

type Quantity="bz"|"magnitude";
type PlotSelection="average"|number;
export type TransversePanelState="empty"|"loading"|"updating"|"previous"|"current"|"error";
export interface TransverseFieldPanelProps {
 result:TransverseFieldResult|null;
 baseline:TransverseFieldResult|null;
 displayModel:MRIModel|null;
 state:TransversePanelState;
 progress?:{done:number;total:number}|null;
 rangeId:TransverseRangeId;
 onRangeChange:(id:TransverseRangeId)=>void;
}
const colors=[[48,18,59],[70,103,221],[36,188,232],[39,215,132],[182,228,71],[251,185,56],[239,91,17],[122,4,3]];
function colorAt(value:number,min:number,max:number){
 const scaled=Math.max(0,Math.min(1,(value-min)/(max-min||1)))*(colors.length-1),i=Math.min(colors.length-2,Math.floor(scaled)),mix=scaled-i;
 return colors[i].map((v,j)=>Math.round(v+(colors[i+1][j]-v)*mix));
}
function mapValues(result:TransverseFieldResult,selection:PlotSelection,quantity:Quantity){
 if(selection==="average")return quantity==="bz"?result.averageBz:result.averageMagnitude;
 const count=result.grid.n**2,offset=selection*count*3,values=new Float64Array(count);
 for(let i=0;i<count;i++)values[i]=quantity==="bz"?result.values[offset+i*3+2]:Math.hypot(result.values[offset+i*3],result.values[offset+i*3+1],result.values[offset+i*3+2]);
 return values;
}
function displayRange(result:TransverseFieldResult,quantity:Quantity,diameter:number){
 let min=Infinity,max=-Infinity;
 const {n,radiusMM,stepMM}=result.grid,radius2=(diameter/2)**2;
 for(let s=0;s<result.grid.slicesMM.length;s++)for(let i=0;i<result.mask.length;i++)if(!result.mask[i]){
  const x=-radiusMM+i%n*stepMM,y=-radiusMM+Math.floor(i/n)*stepMM;if(x*x+y*y>radius2+1e-9)continue;
  const offset=(s*result.mask.length+i)*3,value=quantity==="bz"?result.values[offset+2]:Math.hypot(result.values[offset],result.values[offset+1],result.values[offset+2]);
  min=Math.min(min,value);max=Math.max(max,value);
 }
 if(max-min<1e-9){const span=Math.max(Math.abs(max)*.001,.001);min-=span;max+=span;}
 return {min,max};
}
function plottedMetrics(result:TransverseFieldResult,values:Float64Array,diameter:number){
 const {n,radiusMM,stepMM}=result.grid,radius2=(diameter/2)**2;
 function* samples(){for(let i=0;i<values.length;i++){
   const x=-radiusMM+i%n*stepMM,y=-radiusMM+Math.floor(i/n)*stepMM;
   if(!result.mask[i]&&x*x+y*y<=radius2+1e-9)yield values[i];
  }}
 const summary=summarizeField(samples());
 return {count:summary.count,mean:summary.meanMT,min:summary.minMT,max:summary.maxMT,std:summary.stdMT,peakToPeakPPM:summary.peakToPeakPPM,stdPPM:summary.stdPPM};
}
const number=(value:number|null,digits=0)=>value===null||!Number.isFinite(value)?"—":value.toLocaleString("en-US",{minimumFractionDigits:digits,maximumFractionDigits:digits});
const axisNumber=(value:number)=>Math.abs(value)>=1e6?number(value/1e6,1)+"M":Math.abs(value)>=1e4?number(value/1e3)+"k":number(value);
const initialSelection=(rangeId:TransverseRangeId):PlotSelection=>rangeId==="matlab"?"average":TRANSVERSE_RANGES[rangeId].grid.slicesMM.indexOf(0);

/** All displayed fields belong to the last completed design, never to a pending edit. */
export default function TransverseFieldPanel({result,baseline,displayModel,state,progress,rangeId,onRangeChange}:TransverseFieldPanelProps){
 const {t}=useLanguage(),canvas=useRef<HTMLCanvasElement>(null);
 const [diameter,setDiameter]=useState(150),[quantity,setQuantity]=useState<Quantity>("bz"),[plotState,setPlotState]=useState<{rangeId:TransverseRangeId;selection:PlotSelection}>(()=>({rangeId,selection:initialSelection(rangeId)})),[threshold,setThreshold]=useState("");
 const [axialDisclosure,setAxialDisclosure]=useState({rangeId,open:rangeId==="explore"});
 const selection=plotState.rangeId===rangeId?plotState.selection:initialSelection(rangeId),axialOpen=axialDisclosure.rangeId===rangeId?axialDisclosure.open:rangeId==="explore";
 const setSelection=(value:PlotSelection)=>setPlotState({rangeId,selection:value});
 const [probe,setProbe]=useState<{x:number;y:number;value:number}|null>(null);
 const values=useMemo(()=>result?mapValues(result,selection,quantity):null,[result,selection,quantity]);
 const range=useMemo(()=>baseline?displayRange(baseline,quantity,diameter):result?displayRange(result,quantity,diameter):null,[baseline,result,quantity,diameter]);
 const metrics=useMemo(()=>result&&values?plottedMetrics(result,values,diameter):null,[result,values,diameter]);
 const volume=useMemo(()=>result?roiMetrics(result,diameter):null,[result,diameter]);
 const curve=useMemo(()=>result?fovCurve(result):[],[result]);
 const axialProfile=useMemo(()=>result?result.grid.slicesMM.map((z,index)=>({z,index,...plottedMetrics(result,mapValues(result,index,quantity),diameter)})):[],[result,quantity,diameter]);
 const thresholdValue=threshold.trim()!==""?Number(threshold):NaN;
 const recommendation=useMemo(()=>result&&Number.isFinite(thresholdValue)&&thresholdValue>0?recommendFOV(result,thresholdValue,curve):null,[result,thresholdValue,curve]);
 useEffect(()=>setProbe(null),[result,selection,quantity,diameter,rangeId]);
 useEffect(()=>{
  if(!result||!values||!range||!canvas.current)return;
  const context=canvas.current.getContext("2d");if(!context)return;
  const n=result.grid.n,pixels=context.createImageData(n,n);
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){
   const source=(n-1-row)*n+col,destination=(row*n+col)*4,x=-result.grid.radiusMM+col*result.grid.stepMM,y=-result.grid.radiusMM+(n-1-row)*result.grid.stepMM;
   if(result.mask[source]||x*x+y*y>(diameter/2)**2+1e-9)continue;
   const rgb=colorAt(values[source],range.min,range.max);pixels.data.set([...rgb,255],destination);
  }
  context.putImageData(pixels,0,0);
 },[result,values,range,diameter]);
 const status=state==="loading"?t("正在载入初始横向场图…","Loading the initial transverse map…")
  :state==="updating"?t("上一结果 · 正在更新横向场图","Previous result · Updating the transverse map")+(progress?" · "+Math.round(progress.done/progress.total*100)+"%":"…")
  :state==="previous"?t("上一结果 · 修改后请计算磁场","Previous result · Compute after editing")
  :state==="error"?(result?t("计算失败 · 保留上一结果；可重试计算","Calculation failed · Previous result retained; retry Compute"):t("横向场计算失败；可重试计算","Transverse calculation failed; retry Compute"))
  :state==="empty"?t("等待初始磁场…","Waiting for the initial field…")
  :t("已计算排布 · 横向采样","Computed layout · Transverse samples");
 const rangeSelector=<div className="transverse-range-toolbar"><div className="transverse-range-buttons" role="group" aria-label={t("轴向采样范围","Axial sampling range")}><button type="button" aria-pressed={rangeId==="explore"} onClick={()=>onRangeChange("explore")}>{t("宽范围 ±100 mm","Wide range ±100 mm")}</button><button type="button" aria-pressed={rangeId==="matlab"} onClick={()=>onRangeChange("matlab")}>MATLAB ±2 mm</button></div><small>{t("轴向采样范围，不改变排布","Axial samples; layout stays unchanged")}</small></div>;
 if(!result||!values||!range||!metrics||!volume)return <section className="transverse-field-panel transverse-field-panel--empty" data-state={state} data-range-id={rangeId}>{rangeSelector}<div className="transverse-loading-content"><Circle size={34}/><p role="status">{status}</p><small>{t("初始场图自动载入。后续方向修改仍需点击「计算磁场」。","The initial map loads automatically. Direction edits still require Compute field.")}</small></div></section>;
 const quantityLabel=quantity==="bz"?"Bz":"|B|";
 const planeCount=result.grid.slicesMM.length,zMin=Math.min(...result.grid.slicesMM),zMax=Math.max(...result.grid.slicesMM),zExtent="Z = "+zMin+"…"+(zMax>0?"+":"")+zMax+" mm";
 const selectionLabel=selection==="average"?planeCount+t(" 个截面均值","-slice mean"):"Z = "+result.grid.slicesMM[selection]+" mm";
 const centerPlaneMean=axialProfile.find(point=>point.z===0)?.mean??0;
 const selectedAxial=typeof selection==="number"?axialProfile[selection]:null;
 const selectedAxialChange=selectedAxial&&Math.abs(centerPlaneMean)>1e-12?(selectedAxial.mean-centerPlaneMean)/Math.abs(centerPlaneMean)*100:null;
 const axialMin=Math.min(...axialProfile.map(point=>point.mean)),axialMax=Math.max(...axialProfile.map(point=>point.mean)),axialSpan=Math.max(axialMax-axialMin,.001),axialLow=axialMin-axialSpan*.1,axialHigh=axialMax+axialSpan*.1;
 const axialX=(z:number)=>38+(z-zMin)/(zMax-zMin||1)*292,axialY=(mean:number)=>86-(mean-axialLow)/(axialHigh-axialLow)*62;
 const outsideScale=metrics.min<range.min-1e-6||metrics.max>range.max+1e-6;
 const curveValues=curve.map(point=>point.peakToPeakCenterReferencePPM).filter((value):value is number=>value!==null&&Number.isFinite(value));
 const curveMax=Math.max(1,...curveValues,...(recommendation?[thresholdValue]:[]))*1.08;
 const curveY=(value:number)=>92-Math.max(0,value)/curveMax*70,curveX=(d:number)=>36+(d-20)/180*272;
 function locateProbe(e:React.MouseEvent<SVGSVGElement>){
  if(!result||!values)return;const point=e.currentTarget.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;
  const world=point.matrixTransform(matrix.inverse()),x=world.x,y=-world.y;if(Math.hypot(x,y)>diameter/2)return;
  const col=Math.max(0,Math.min(result.grid.n-1,Math.round((x+result.grid.radiusMM)/result.grid.stepMM))),row=Math.max(0,Math.min(result.grid.n-1,Math.round((y+result.grid.radiusMM)/result.grid.stepMM))),i=row*result.grid.n+col;
  const sampleX=-result.grid.radiusMM+col*result.grid.stepMM,sampleY=-result.grid.radiusMM+row*result.grid.stepMM;
  if(result.mask[i]||sampleX*sampleX+sampleY*sampleY>(diameter/2)**2+1e-9)return;setProbe({x:sampleX,y:sampleY,value:values[i]});
 }
 return <section className="transverse-field-panel" data-state={state} data-range-id={rangeId} data-plane-count={planeCount} data-revision={result.revision} data-source-signature={result.sourceSignature} data-fov-diameter-mm={diameter} data-quantity={quantity} data-slice={selection} data-display-model={displayModel?.id??""}>
  {rangeSelector}
  <div className="transverse-panel-toolbar">
   <div className="transverse-quantity" role="group" aria-label={t("场图物理量","Field quantity")}><button type="button" aria-pressed={quantity==="bz"} onClick={()=>setQuantity("bz")}>Bz <span>{t("轴向分量","Axial component")}</span></button><button type="button" aria-pressed={quantity==="magnitude"} onClick={()=>setQuantity("magnitude")}>|B| <span>{t("场强","Magnitude")}</span></button></div>
   <label className="transverse-slice-select"><span>{t("横向截面","Transverse slice")}</span><select value={selection} onChange={e=>setSelection(e.target.value==="average"?"average":Number(e.target.value))}>{rangeId==="matlab"&&<option value="average">{planeCount+t(" 个截面均值","-slice mean")}</option>}{result.grid.slicesMM.map((z,i)=><option key={z} value={i}>Z = {z>0?"+":""}{z} mm</option>)}</select></label>
  </div>
  <p className={"transverse-result-state"+(state==="updating"||state==="previous"?" transverse-result-state--previous":"")} role="status">{status}</p>
  <div className="transverse-panel-body">
   <div className="transverse-map-column">
    <div className="transverse-map-frame">
     <canvas ref={canvas} width={result.grid.n} height={result.grid.n} style={{width:(result.grid.n*result.grid.stepMM/256*100)+"%",height:(result.grid.n*result.grid.stepMM/256*100)+"%",left:((128-result.grid.radiusMM-result.grid.stepMM/2)/256*100)+"%",top:((128-result.grid.radiusMM-result.grid.stepMM/2)/256*100)+"%"}} aria-hidden="true"/>
     <svg viewBox="-128 -128 256 256" role="img" tabIndex={0} aria-label={t("XY 横向场图，单位 mT。虚线圆为所选 FOV。点击图中读取场强，按回车读取中心。","XY transverse field map in mT. The dashed circle is the selected FOV. Click to probe; press Enter to probe the center.")} onClick={locateProbe} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();const center=Math.floor(result.grid.n/2);setProbe({x:0,y:0,value:values[center*result.grid.n+center]});}}}>
      <circle cx="0" cy="0" r={diameter/2} fill="none" stroke="#fff" strokeWidth="2.6"/><circle cx="0" cy="0" r={diameter/2} fill="none" stroke="#1d1d1f" strokeWidth=".8" strokeDasharray="3 2"/>
      <path d="M-3 0H3M0-3V3" stroke="#fff" strokeWidth="1.8"/><path d="M-3 0H3M0-3V3" stroke="#1d1d1f" strokeWidth=".6"/>
      <line x1="-100" x2="100" y1="101" y2="101" stroke="#929ca6" strokeWidth=".5"/><line x1="-101" x2="-101" y1="-100" y2="100" stroke="#929ca6" strokeWidth=".5"/>
      {[-100,-50,0,50,100].map(v=><g key={v}><line x1={v} x2={v} y1="101" y2="103" stroke="#697480" strokeWidth=".5"/><text x={v} y="111" textAnchor="middle" fontSize="7" fill="#626973">{v}</text><line x1="-103" x2="-101" y1={-v} y2={-v} stroke="#697480" strokeWidth=".5"/><text x="-106" y={-v+2} textAnchor="end" fontSize="7" fill="#626973">{v}</text></g>)}
      <text x="0" y="123" textAnchor="middle" fontSize="8" fill="#626973">X / mm</text><text x="-121" y="0" textAnchor="middle" fontSize="8" fill="#626973" transform="rotate(-90 -121 0)">Y / mm</text><text x="0" y="-112" textAnchor="middle" fontSize="8" fill="#626973">{quantityLabel} / mT · {selectionLabel}</text>
      {probe&&<g pointerEvents="none"><circle cx={probe.x} cy={-probe.y} r="2" fill="#fff" stroke="#1d1d1f" strokeWidth=".6"/></g>}
     </svg>
    </div>
    <div className="transverse-colorbar" data-scale-min-mt={range.min} data-scale-max-mt={range.max} aria-label={t("当前采样范围和 FOV 内的初始排布参考色标","Initial-layout reference scale within the current sampling range and FOV")}><span>{number(range.min,3)}</span><i/><span>{number(range.max,3)} mT</span></div>
    <small className="transverse-scale-caption">{t("色标取初始排布、当前范围与 FOV；同范围同 FOV 设计比较固定","Scale: initial layout, current range & FOV; fixed for same-range/FOV design comparisons")}</small>
    <div className="transverse-probe" data-probe-x-mm={probe?.x??""} data-probe-y-mm={probe?.y??""} data-probe-value-mt={probe?.value??""}>{probe?<><span>X {probe.x} · Y {probe.y} mm</span><strong>{quantityLabel} {number(probe.value,4)} mT</strong></>:<span>{t("点击场图读取采样值 · 虚线圈为 FOV","Click to probe · Dashed circle is the FOV")}</span>}</div>
    {outsideScale&&<small className="transverse-scale-note">{t("部分数值超出初始色标；数值读数仍为实际计算值。","Some values exceed the initial color scale; readouts retain computed values.")}</small>}
   </div>
   <div className="transverse-fov-column">
    <details className="transverse-axial-comparison" open={axialOpen} onToggle={e=>setAxialDisclosure({rangeId,open:e.currentTarget.open})}>
     <summary>{t("轴向各截面对比","Compare axial slices")}<span>{quantityLabel} · {t("当前 FOV 均值","Current FOV means")}</span></summary>
     <svg viewBox="0 0 350 116" role="img" aria-label={t("各 Z 截面中所选圆形区域的平均磁场，点击点切换截面。","Mean field inside the selected circular ROI at each Z. Click a point to select its slice.")}>
      <line x1="38" x2="330" y1="86" y2="86" stroke="#b5bdc6"/><line x1="38" x2="38" y1="24" y2="86" stroke="#b5bdc6"/>
      {[axialLow,(axialLow+axialHigh)/2,axialHigh].map(v=><g key={v}><line x1="38" x2="330" y1={axialY(v)} y2={axialY(v)} stroke="#e7e9ed"/><text x="32" y={axialY(v)+3} textAnchor="end" fontSize="9" fill="#626973">{number(v,2)}</text></g>)}
      <path d={axialProfile.map((point,i)=>(i?"L":"M")+axialX(point.z).toFixed(2)+","+axialY(point.mean).toFixed(2)).join(" ")} fill="none" stroke="#0071e3" strokeWidth="1.6"/>
      {axialProfile.map(point=><g key={point.z} role="button" tabIndex={0} aria-label={"Z = "+point.z+" mm"} onClick={()=>setSelection(point.index)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelection(point.index);}}}><circle cx={axialX(point.z)} cy={axialY(point.mean)} r="7" fill="transparent"/><circle cx={axialX(point.z)} cy={axialY(point.mean)} r={selection===point.index?3.5:2.3} fill={selection===point.index?"#0071e3":"#fff"} stroke="#0071e3" strokeWidth="1.5"/></g>)}
      {[zMin,0,zMax].map(z=><text key={z} x={axialX(z)} y="100" textAnchor="middle" fontSize="9" fill="#626973">{z}</text>)}<text x="38" y="13" fontSize="9" fill="#626973">{quantityLabel} · {t("均值 / mT","Mean / mT")}</text><text x="38" y="113" fontSize="8" fill="#86868b">{t("连线仅便于比较","Lines guide comparison")}</text><text x="330" y="113" textAnchor="end" fontSize="9" fill="#626973">Z / mm</text>
     </svg>
     <details className="transverse-slice-table"><summary>{t("查看逐截面数值","Show values for each slice")}</summary><table><thead><tr><th>Z / mm</th><th>{t("均值 / mT","Mean / mT")}</th><th>{t("峰峰差 / ppm","P–P / ppm")}</th><th>{t("较 Z0 均值","vs. Z0 mean")}</th></tr></thead><tbody>{axialProfile.map(point=><tr key={point.z} data-axial-z-mm={point.z} data-axial-mean-mt={point.mean} data-axial-pp-ppm={point.peakToPeakPPM??""} aria-current={selection===point.index?"true":undefined}><td><button type="button" onClick={()=>setSelection(point.index)}>{point.z>0?"+":""}{point.z}</button></td><td>{number(point.mean,3)}</td><td>{number(point.peakToPeakPPM)}</td><td>{number(Math.abs(centerPlaneMean)>1e-12?(point.mean-centerPlaneMean)/Math.abs(centerPlaneMean)*100:null,2)}%</td></tr>)}</tbody></table><small>{t("峰峰差按各截面 |均值| 归一化；末列按 Z=0 截面 |均值| 归一化。","Peak-to-peak uses each slice's |mean|; the final column uses the Z=0 slice's |mean|.")}</small></details>
     {rangeId==="explore"&&<small className="transverse-axial-symmetry-note">{t("初始 IO 模型的 Bz 与 |B| 关于 Z=0 对称，±Z 结果相同；方向修改可破坏这种对称。","In the initial IO model, Bz and |B| are symmetric about Z=0, so ±Z results match. Orientation edits can break this symmetry.")}</small>}
    </details>
    <div className="transverse-fov-heading"><h3>{t("选择横向 FOV","Choose a transverse FOV")}</h3><span>{t("圆形区域","Circular region")}</span></div>
    <label className="transverse-diameter"><span>{t("直径","Diameter")}</span><strong>{diameter} <small>mm</small></strong><input aria-label={t("FOV 直径（mm）","FOV diameter (mm)")} type="range" min="20" max="200" step="5" value={diameter} onChange={e=>setDiameter(Number(e.target.value))}/><span className="transverse-range-ends">20 mm <span>200 mm</span></span></label>
    <div className="transverse-roi-label">{quantityLabel} · {selectionLabel} · {t("圆内统计","Inside-circle statistics")}</div>
    <div className="transverse-metrics" data-roi-mean-mt={metrics.mean} data-roi-pp-ppm={metrics.peakToPeakPPM??""} data-roi-std-ppm={metrics.stdPPM??""} data-roi-samples={metrics.count}>
     <div><span>{t("平均场","Mean field")}</span><strong>{number(metrics.mean,3)}<small> mT</small></strong></div><div><span>{t("峰峰差 / |均值|","Peak-to-peak / |mean|")}</span><strong>{number(metrics.peakToPeakPPM)}<small> ppm</small></strong></div><div><span>{t("标准差 / |均值|","Std. dev. / |mean|")}</span><strong>{number(metrics.stdPPM)}<small> ppm</small></strong></div>
    </div>
    {selectedAxial&&<div className="transverse-plane-change" data-plane-mean-change-percent={selectedAxialChange??""}><span>{t("截面均值相对 Z=0","Slice mean versus Z=0")}</span><strong>{selectedAxialChange!==null&&selectedAxialChange>0?"+":""}{number(selectedAxialChange,2)}%</strong></div>}
    <details className="transverse-metric-formulas"><summary>{t("统计定义","Metric definitions")}</summary><p>ppm = 10⁶ × {t("差异 / |区域均值|；标准差使用 MATLAB 的 N−1 样本定义。","variation / |ROI mean|; standard deviation uses MATLAB's N−1 sample definition.")}</p>{rangeId==="matlab"&&<p>{t("五层均值会平滑层间差异。选择单层可检查局部变化。","Averaging five slices smooths differences between them. Select a single slice to inspect local changes.")}</p>}<p>{t("下方使用所选范围内全部 "+planeCount+" 个采样截面的 |B| 极值，不会先平均。","The check below uses |B| extrema from all "+planeCount+" sampled slices in the selected range, without averaging.")}</p>{metrics.peakToPeakPPM===null&&<p>{t("区域均值接近零，归一化 ppm 无定义。","The ROI mean is near zero; normalized ppm is undefined.")}</p>}</details>
    <div className="transverse-volume-check" data-volume-pp-center-ppm={volume.peakToPeakCenterReferencePPM??""} data-volume-samples={volume.volumeSampleCount}><span>{t("全部 "+planeCount+" 截面 · |B| 峰峰差","All "+planeCount+" slices · |B| peak-to-peak")}</span><strong>{number(volume.peakToPeakCenterReferencePPM)} <small>ppm</small></strong><small>Δ|B|pp / |Bcentre| · {zExtent}</small></div>
    <div className="transverse-fov-curve">
     <svg viewBox="0 0 330 123" role="img" aria-label={t("横向直径与全部 "+planeCount+" 个采样截面场差的关系","Transverse diameter versus field variation over all "+planeCount+" sampled slices")}>
      <line x1="36" x2="308" y1="92" y2="92" stroke="#b5bdc6"/><line x1="36" x2="36" y1="22" y2="92" stroke="#b5bdc6"/>
      {[0,.5,1].map(f=><g key={f}><line x1="36" x2="308" y1={92-f*70} y2={92-f*70} stroke="#e7e9ed"/><text x="31" y={95-f*70} textAnchor="end" fill="#626973" fontSize="9">{axisNumber(curveMax*f)}</text></g>)}
      <path d={curve.filter(p=>p.peakToPeakCenterReferencePPM!==null).map((p,i)=>(i?"L":"M")+curveX(p.diameterMM).toFixed(2)+","+curveY(p.peakToPeakCenterReferencePPM??0).toFixed(2)).join(" ")} fill="none" stroke="#0071e3" strokeWidth="2"/>
      {recommendation&&<line x1="36" x2="308" y1={curveY(thresholdValue)} y2={curveY(thresholdValue)} stroke="#b46f00" strokeDasharray="4 3"/>}
      {volume.peakToPeakCenterReferencePPM!==null&&<circle cx={curveX(diameter)} cy={curveY(volume.peakToPeakCenterReferencePPM)} r="3.5" fill="#fff" stroke="#0071e3" strokeWidth="2"/>}
      {[20,100,200].map(d=><text key={d} x={curveX(d)} y="107" textAnchor="middle" fill="#626973" fontSize="9">{d}</text>)}<text x="39" y="13" fill="#626973" fontSize="9">Δ|B|pp / |Bcentre| · ppm</text><text x="307" y="120" textAnchor="end" fill="#626973" fontSize="9">{t("直径 / mm","Diameter / mm")}</text>
     </svg>
    </div>
    <div className="transverse-threshold"><label>{t("你设定的场差上限","Your field-variation limit")}<span><input type="number" min="1" step="100" placeholder={t("输入要求","Enter a requirement")} value={threshold} onChange={e=>setThreshold(e.target.value)} aria-label={t(planeCount+" 截面峰峰场差上限（ppm）",planeCount+"-slice peak-to-peak variation limit (ppm)")}/>ppm</span></label><button type="button" disabled={!recommendation||recommendation.diameterMM===null} onClick={()=>{if(recommendation?.diameterMM!==null&&recommendation?.diameterMM!==undefined)setDiameter(recommendation.diameterMM);}}>{t("采用满足上限的最大直径","Use the largest diameter within the limit")}</button><small data-recommended-diameter-mm={recommendation?.diameterMM??""}>{recommendation?(recommendation.diameterMM===null?t("20–200 mm 范围内，没有采样直径满足此上限。","No sampled diameter between 20 and 200 mm meets this limit."):t("最大采样横向直径：","Largest sampled transverse diameter: ")+recommendation.diameterMM+" mm"):t("请先输入实验要求；这里不预设医用合格标准。","Enter an experimental requirement; no medical acceptance limit is preset.")}</small></div>
   </div>
  </div>
  <p className="transverse-domain-note"><Info size={14}/><span>{t("模型估计：当前仅计算 "+planeCount+" 个离散截面（"+zExtent+"），不能证明层间连续区域满足要求，也不代表已验证的整手或整脚成像 FOV。通孔直径 220 mm，场图采样直径 200 mm；实际 FOV 还取决于 RF、梯度、序列和实测磁场。","Model estimate: only "+planeCount+" discrete slices are sampled ("+zExtent+"); this does not prove that the continuous region between slices meets your requirement or establish a validated whole-hand or whole-foot imaging FOV. The bore diameter is 220 mm; the map is sampled over 200 mm. Actual FOV also depends on RF, gradients, sequences and measured fields.")}</span></p>
 </section>;
}
