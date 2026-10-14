"use client";
import {useEffect,useMemo,useRef,useState,type Dispatch,type SetStateAction} from "react";
import {Circle,Info,RotateCcw,ScanLine} from "lucide-react";
import {useLanguage} from "@/lib/language-context";
import type {MRIModel} from "@/lib/mri";
import {roiMetrics,fovCurve,recommendFOV,summarizeField,type TransverseFieldResult} from "@/lib/transverse-field";
import type {TransverseRangeId} from "@/lib/transverse-ranges";
import {displayColorScale,colorLegendDecimals,scaledColormapColor,colormapGradient,MATLAB_JET} from "@/lib/transverse-display";
import {transverseMapValues,transverseLimits,initialTransverseDetailLimits,transverseProbeSample,type TransversePlotSelection,type TransverseDisplayState} from "@/lib/transverse-display-state";
import "./transverse-field-panel.css";

export type TransversePanelState="empty"|"loading"|"updating"|"previous"|"current"|"error";
export interface TransverseFieldPanelProps {
 result:TransverseFieldResult|null;
 baseline:TransverseFieldResult|null;
 baselineWide:TransverseFieldResult|null;
 displayState:TransverseDisplayState;
 onDisplayStateChange:Dispatch<SetStateAction<TransverseDisplayState>>;
 displayModel:MRIModel|null;
 state:TransversePanelState;
 progress?:{done:number;total:number}|null;
 rangeId:TransverseRangeId;
 onRangeChange:(id:TransverseRangeId)=>void;
}
const matlabGradient=colormapGradient(MATLAB_JET);
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

/** All displayed fields belong to the last completed design, never to a pending edit. */
export default function TransverseFieldPanel({result,baseline,baselineWide,displayState,onDisplayStateChange,displayModel,state,progress,rangeId,onRangeChange}:TransverseFieldPanelProps){
 const {t}=useLanguage(),canvas=useRef<HTMLCanvasElement>(null);
 const [page,setPage]=useState<"overview"|"axial"|"fov">("overview");
 const {diameter,quantity,threshold,colorMode,probe}=displayState;
 const selection=displayState.selections[rangeId];
 const patch=(changes:Partial<TransverseDisplayState>)=>onDisplayStateChange(previous=>({...previous,...changes}));
 const setDiameter=(value:number)=>patch({diameter:value}),setQuantity=(value:TransverseDisplayState["quantity"])=>patch({quantity:value}),setThreshold=(value:string)=>patch({threshold:value}),setColorMode=(value:TransverseDisplayState["colorMode"])=>patch({colorMode:value});
 const setSelection=(value:TransversePlotSelection)=>onDisplayStateChange(previous=>({...previous,selections:{...previous.selections,[rangeId]:value}}));
 const setProbe=(value:TransverseDisplayState["probe"])=>patch({probe:value});
 const values=useMemo(()=>result?transverseMapValues(result,selection,quantity):null,[result,selection,quantity]);
 const wideInitial=baselineWide??(rangeId==="explore"?baseline:null),detailInitial=wideInitial??baseline;
 const initialDetailRange=useMemo(()=>detailInitial?initialTransverseDetailLimits(detailInitial,quantity):null,[detailInitial,quantity]);
 const referenceRange=useMemo(()=>wideInitial?transverseLimits(wideInitial,quantity,200,"all"):null,[wideInitial,quantity]);
 const lockedDetailRange=displayState.lockedLimits[quantity]??initialDetailRange;
 const metrics=useMemo(()=>result&&values?plottedMetrics(result,values,diameter):null,[result,values,diameter]);
 const range=useMemo(()=>lockedDetailRange&&(colorMode==="local"||referenceRange)?displayColorScale(lockedDetailRange,referenceRange??lockedDetailRange,colorMode):null,[lockedDetailRange,referenceRange,colorMode]);
 const probeSample=useMemo(()=>result&&values&&probe?transverseProbeSample(result,values,probe,diameter):null,[result,values,probe,diameter]);
 const volume=useMemo(()=>result?roiMetrics(result,diameter):null,[result,diameter]);
 const curve=useMemo(()=>result?fovCurve(result):[],[result]);
 const axialProfile=useMemo(()=>result?result.grid.slicesMM.map((z,index)=>({z,index,...plottedMetrics(result,transverseMapValues(result,index,quantity),diameter)})):[],[result,quantity,diameter]);
 const thresholdValue=threshold.trim()!==""?Number(threshold):NaN;
 const recommendation=useMemo(()=>result&&Number.isFinite(thresholdValue)&&thresholdValue>0?recommendFOV(result,thresholdValue,curve):null,[result,thresholdValue,curve]);
 useEffect(()=>{
  if(!result||!values||!range||!canvas.current)return;
  const context=canvas.current.getContext("2d");if(!context)return;
  const n=result.grid.n,pixels=context.createImageData(n,n);
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){
   const source=(n-1-row)*n+col,destination=(row*n+col)*4,x=-result.grid.radiusMM+col*result.grid.stepMM,y=-result.grid.radiusMM+(n-1-row)*result.grid.stepMM;
   if(result.mask[source]||x*x+y*y>(diameter/2)**2+1e-9)continue;
   const rgb=scaledColormapColor(values[source],range,MATLAB_JET);pixels.data.set([...rgb,255],destination);
  }
  context.putImageData(pixels,0,0);
 },[result,values,range,diameter]);
 const status=state==="loading"?t("正在载入初始横向场图…","Loading the initial transverse map…")
  :state==="updating"?t("上一结果 · 正在更新横向场图","Previous result · Updating the transverse map")+(progress?" · "+Math.round(progress.done/progress.total*100)+"%":"…")
  :state==="previous"?t("上一结果 · 修改后请计算磁场","Previous result · Compute after editing")
  :state==="error"?(result?t("计算失败 · 保留上一结果；可重试计算","Calculation failed · Previous result retained; retry Compute"):t("横向场计算失败；可重试计算","Transverse calculation failed; retry Compute"))
  :state==="empty"?t("等待初始磁场…","Waiting for the initial field…")
  :t("已计算排布 · 横向采样","Computed layout · Transverse samples");
 const rangeSelector=<div className="transverse-range-toolbar"><div className="transverse-range-buttons" role="group" aria-label={t("轴向采样范围","Axial sampling range")}><button type="button" aria-pressed={rangeId==="explore"} onClick={()=>onRangeChange("explore")}>{t("宽范围 ±100 mm","Wide range ±100 mm")}</button><button type="button" aria-pressed={rangeId==="matlab"} onClick={()=>onRangeChange("matlab")}>MATLAB ±2 mm</button></div></div>;
 if(!result||!values||!range||!metrics||!volume)return <section className="transverse-field-panel transverse-field-panel--empty" data-state={state} data-range-id={rangeId}>{rangeSelector}<div className="transverse-loading-content"><Circle size={34}/><p role="status">{status}</p><small>{t("初始场图自动载入。后续方向修改仍需点击「计算磁场」。","The initial map loads automatically. Direction edits still require Compute field.")}</small></div></section>;
 const quantityLabel=quantity==="bz"?"Bz":"|B|";
 const planeCount=result.grid.slicesMM.length,zMin=Math.min(...result.grid.slicesMM),zMax=Math.max(...result.grid.slicesMM),zExtent="Z = "+zMin+"…"+(zMax>0?"+":"")+zMax+" mm";
 const selectionLabel=selection==="average"?planeCount+t(" 个截面均值","-slice mean"):"Z = "+result.grid.slicesMM[selection]+" mm";
 const centerPlaneMean=axialProfile.find(point=>point.z===0)?.mean??0;
 const axialMin=Math.min(...axialProfile.map(point=>point.mean)),axialMax=Math.max(...axialProfile.map(point=>point.mean)),axialSpan=Math.max(axialMax-axialMin,.001),axialLow=axialMin-axialSpan*.1,axialHigh=axialMax+axialSpan*.1;
 const axialX=(z:number)=>38+(z-zMin)/(zMax-zMin||1)*292,axialY=(mean:number)=>86-(mean-axialLow)/(axialHigh-axialLow)*62;
 const outsideScale=metrics.min<range.min||metrics.max>range.max;
 const legendDecimals=colorLegendDecimals(range,colorMode);
 const curveValues=curve.map(point=>point.peakToPeakCenterReferencePPM).filter((value):value is number=>value!==null&&Number.isFinite(value));
 const curveMax=Math.max(1,...curveValues,...(recommendation?[thresholdValue]:[]))*1.08;
 const curveY=(value:number)=>92-Math.max(0,value)/curveMax*70,curveX=(d:number)=>36+(d-20)/180*272;
 function locateProbe(e:React.MouseEvent<SVGSVGElement>){
  if(!result||!values)return;const point=e.currentTarget.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;
  const world=point.matrixTransform(matrix.inverse()),x=world.x,y=-world.y;if(Math.hypot(x,y)>diameter/2)return;
  const col=Math.max(0,Math.min(result.grid.n-1,Math.round((x+result.grid.radiusMM)/result.grid.stepMM))),row=Math.max(0,Math.min(result.grid.n-1,Math.round((y+result.grid.radiusMM)/result.grid.stepMM))),i=row*result.grid.n+col;
  const sampleX=-result.grid.radiusMM+col*result.grid.stepMM,sampleY=-result.grid.radiusMM+row*result.grid.stepMM;
  if(result.mask[i]||sampleX*sampleX+sampleY*sampleY>(diameter/2)**2+1e-9)return;setProbe({x:sampleX,y:sampleY});
 }
 function fitCurrentScale(){
  if(!metrics)return;
  const fitted={min:metrics.min,max:metrics.max};
  onDisplayStateChange(previous=>({...previous,colorMode:"local",lockedLimits:{...previous.lockedLimits,[quantity]:fitted}}));
 }
 function restoreInitialScale(){
  onDisplayStateChange(previous=>{const lockedLimits={...previous.lockedLimits};delete lockedLimits[quantity];return {...previous,colorMode:"local",lockedLimits};});
 }
 const axialChart=<svg viewBox="0 0 350 116" role="img" aria-label={t("各 Z 截面中所选圆形区域的平均磁场，点击点切换截面。","Mean field inside the selected circular ROI at each Z. Click a point to select its slice.")}>
      <line x1="38" x2="330" y1="86" y2="86" stroke="#b5bdc6"/><line x1="38" x2="38" y1="24" y2="86" stroke="#b5bdc6"/>
      {[axialLow,(axialLow+axialHigh)/2,axialHigh].map(v=><g key={v}><line x1="38" x2="330" y1={axialY(v)} y2={axialY(v)} stroke="#e7e9ed"/><text x="32" y={axialY(v)+3} textAnchor="end" fontSize="13" fill="#626973">{number(v,2)}</text></g>)}
      <path d={axialProfile.map((point,i)=>(i?"L":"M")+axialX(point.z).toFixed(2)+","+axialY(point.mean).toFixed(2)).join(" ")} fill="none" stroke="#0071e3" strokeWidth="1.6"/>
      {axialProfile.map(point=><g key={point.z} role="button" tabIndex={0} aria-label={"Z = "+point.z+" mm"} onClick={()=>setSelection(point.index)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelection(point.index);}}}><circle cx={axialX(point.z)} cy={axialY(point.mean)} r="7" fill="transparent"/><circle cx={axialX(point.z)} cy={axialY(point.mean)} r={selection===point.index?3.5:2.3} fill={selection===point.index?"#0071e3":"#fff"} stroke="#0071e3" strokeWidth="1.5"/></g>)}
      {[zMin,0,zMax].map(z=><text key={z} x={axialX(z)} y="100" textAnchor="middle" fontSize="13" fill="#626973">{z}</text>)}<text x="38" y="13" fontSize="13" fill="#626973">{quantityLabel} · {t("均值 / mT","Mean / mT")}</text><text x="38" y="113" fontSize="11" fill="#86868b">{t("连线仅便于比较","Lines guide comparison")}</text><text x="330" y="113" textAnchor="end" fontSize="13" fill="#626973">Z / mm</text>
     </svg>;
 return <section className="transverse-field-panel" data-state={state} data-range-id={rangeId} data-plane-count={planeCount} data-revision={result.revision} data-source-signature={result.sourceSignature} data-fov-diameter-mm={diameter} data-quantity={quantity} data-slice={selection} data-display-model={displayModel?.id??""} data-color-mode={colorMode} data-color-min-mt={range.min} data-color-max-mt={range.max} data-detail-page={page} data-actual-min-mt={metrics.min} data-actual-max-mt={metrics.max} data-actual-peak-to-peak-mt={metrics.max-metrics.min}>
  <div className="transverse-panel-toolbar">{rangeSelector}
   <div className="transverse-quantity" role="group" aria-label={t("场图物理量","Field quantity")}><button type="button" aria-pressed={quantity==="bz"} onClick={()=>setQuantity("bz")}>Bz <span>{t("轴向分量","Axial component")}</span></button><button type="button" aria-pressed={quantity==="magnitude"} onClick={()=>setQuantity("magnitude")}>|B| <span>{t("场强","Magnitude")}</span></button></div>
   <label className="transverse-slice-select"><select aria-label={t("横向截面","Transverse slice")} value={selection} onChange={e=>setSelection(e.target.value==="average"?"average":Number(e.target.value))}>{rangeId==="matlab"&&<option value="average">{planeCount+t(" 个截面均值","-slice mean")}</option>}{result.grid.slicesMM.map((z,i)=><option key={z} value={i}>Z = {z>0?"+":""}{z} mm</option>)}</select></label>
  </div>
  <p className={"transverse-result-state"+(state==="updating"||state==="previous"?" transverse-result-state--previous":"")} role="status">{status}</p>
  <div className="transverse-panel-body">
   <div className="transverse-map-column">
    <div className="transverse-map-frame">
     <canvas ref={canvas} width={result.grid.n} height={result.grid.n} style={{width:(result.grid.n*result.grid.stepMM/256*100)+"%",height:(result.grid.n*result.grid.stepMM/256*100)+"%",left:((128-result.grid.radiusMM-result.grid.stepMM/2)/256*100)+"%",top:((128-result.grid.radiusMM-result.grid.stepMM/2)/256*100)+"%"}} aria-hidden="true"/>
     <svg viewBox="-128 -128 256 256" role="img" tabIndex={0} aria-label={t("XY 横向场图，单位 mT。虚线圆为所选 FOV。点击图中读取场强，按回车读取中心。","XY transverse field map in mT. The dashed circle is the selected FOV. Click to probe; press Enter to probe the center.")} onClick={locateProbe} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();setProbe({x:0,y:0});}}}>
      <circle cx="0" cy="0" r={diameter/2} fill="none" stroke="#fff" strokeWidth="2.6"/><circle cx="0" cy="0" r={diameter/2} fill="none" stroke="#1d1d1f" strokeWidth=".8" strokeDasharray="3 2"/>
      <path d="M-3 0H3M0-3V3" stroke="#fff" strokeWidth="1.8"/><path d="M-3 0H3M0-3V3" stroke="#1d1d1f" strokeWidth=".6"/>
      <line x1="-100" x2="100" y1="101" y2="101" stroke="#929ca6" strokeWidth=".5"/><line x1="-101" x2="-101" y1="-100" y2="100" stroke="#929ca6" strokeWidth=".5"/>
      {[-100,-50,0,50,100].map(v=><g key={v}><line x1={v} x2={v} y1="101" y2="103" stroke="#697480" strokeWidth=".5"/><text x={v} y="111" textAnchor="middle" fontSize="10" fill="#626973">{v}</text><line x1="-103" x2="-101" y1={-v} y2={-v} stroke="#697480" strokeWidth=".5"/><text x="-106" y={-v+2} textAnchor="end" fontSize="10" fill="#626973">{v}</text></g>)}
      <text x="0" y="123" textAnchor="middle" fontSize="11" fill="#626973">X / mm</text><text x="-121" y="0" textAnchor="middle" fontSize="11" fill="#626973" transform="rotate(-90 -121 0)">Y / mm</text><text x="0" y="-112" textAnchor="middle" fontSize="11" fill="#626973">{quantityLabel} / mT · {selectionLabel}</text>
      {probe&&<g pointerEvents="none"><circle cx={probe.x} cy={-probe.y} r="2" fill="#fff" stroke={probeSample?.outsideROI?"#976313":"#1d1d1f"} strokeWidth=".7"/></g>}
     </svg>
    </div>
    <div className="transverse-colorbar" data-scale-min-mt={range.min} data-scale-max-mt={range.max} data-scale-constant={range.constant} data-palette="matlab-jet-256" aria-label={colorMode==="local"?t("固定细节色标，不随 FOV、截面或设计改变","Locked detail scale; independent of FOV, slice and design"):t("初始九截面、直径 200 mm 的固定参考色标","Fixed reference scale: initial nine slices, diameter 200 mm")}><span>{number(range.min,legendDecimals)}</span><i style={{background:matlabGradient}}/><span>{number(range.max,legendDecimals)} mT</span></div>
    <div className="transverse-scale-controls">
     <div className="transverse-color-modes" role="group" aria-label={t("场图色标模式","Field color scale")}><button type="button" aria-pressed={colorMode==="local"} onClick={()=>setColorMode("local")}>{t("固定细节色标","Locked detail")}</button><button type="button" aria-pressed={colorMode==="reference"} disabled={!referenceRange} onClick={()=>setColorMode("reference")}>{t("跨截面场强","Across slices")}</button></div>
     <div className="transverse-scale-actions"><button type="button" onClick={fitCurrentScale} title={t("以已完成结果的当前截面和 FOV 重新设置，并锁定细节色标","Fit to the completed map's current slice and FOV, then lock the detail scale")}><ScanLine size={12}/>{t("重新适配色标","Fit current scale")}</button><button type="button" onClick={restoreInitialScale} title={t("恢复当前物理量的初始 Z=0、直径150 mm 色标","Restore this quantity's initial Z=0, diameter 150 mm limits")}><RotateCcw size={12}/>{t("恢复初始色标","Restore initial")}</button></div>
    </div>
    <small className={"transverse-scale-caption"+(outsideScale?" transverse-scale-caption--saturated":"")} data-scale-saturated={outsideScale?"true":undefined}>{outsideScale?t("超出色标：颜色饱和 · 右侧为真实极值","Color clipping · Actual extrema at right"):colorMode==="local"?(displayState.lockedLimits[quantity]?t("当前色标已锁定 · FOV 与设计切换保持一致","Fitted limits locked · Stable across FOV and design changes"):t("初始 Z=0 · 直径150 mm · 色标已锁定","Initial Z=0 · Diameter 150 mm · Locked limits")):t("初始九截面 · 直径200 mm · 色标固定","Initial nine slices · Diameter 200 mm · Fixed limits")}</small>
    {range.nearConstant&&<small className="transverse-scale-note">{range.constant?t("所选色标区域峰峰差为 0 mT；没有可显示的场强差异。","The selected color-scale region has a 0 mT peak-to-peak difference; there is no field variation to display."):t("差异接近浮点精度；颜色仅反映极小的数值差异。","Variation is near floating-point precision; colors reflect only tiny numerical differences.")}</small>}
    <div className="transverse-probe" data-probe-x-mm={probe?.x??""} data-probe-y-mm={probe?.y??""} data-probe-z-mm={typeof selection==="number"?result.grid.slicesMM[selection]:""} data-probe-value-mt={probeSample?.value??""} data-probe-kind={selection==="average"?"average":"point"} data-probe-outside-roi={probeSample?.outsideROI??false} data-probe-result-state={state}>{probe?<><span>{selection==="average"?t("平均值探针","Mean probe"):t("坐标探针","Point probe")} · X {probe.x} · Y {probe.y} mm{typeof selection==="number"?" · Z "+result.grid.slicesMM[selection]+" mm":" · "+selectionLabel}</span><strong>{quantityLabel} {number(probeSample?.value??null,6)} mT</strong>{probeSample?.outsideROI&&<small className="transverse-probe-tag">{t("当前区域外","Outside current ROI")}</small>}{!probeSample&&<small className="transverse-probe-tag">{t("当前场图无此采样点","No sample in the current map")}</small>}{(state==="updating"||state==="previous"||state==="error")&&<small className="transverse-probe-tag">{t("上一结果","Previous result")}</small>}</>:<span>{t("点击场图读取采样值 · 虚线圈为 FOV","Click to probe · Dashed circle is the FOV")}</span>}</div>
   </div>
   <div className="transverse-fov-column">
    <div className="transverse-detail-tabs" role="tablist" aria-label={t("横向分析内容","Transverse analysis pages")}>
     {(["overview","axial","fov"] as const).map(id=><button key={id} type="button" role="tab" id={"transverse-tab-"+id} aria-selected={page===id} tabIndex={page===id?0:-1} aria-controls={"transverse-page-"+id} onClick={()=>setPage(id)} onKeyDown={event=>{const keys=["overview","axial","fov"] as const;const current=keys.indexOf(id);const next=event.key==="ArrowRight"?keys[(current+1)%keys.length]:event.key==="ArrowLeft"?keys[(current+keys.length-1)%keys.length]:event.key==="Home"?keys[0]:event.key==="End"?keys[2]:null;if(next){event.preventDefault();setPage(next);document.getElementById("transverse-tab-"+next)?.focus();}}}>{id==="overview"?t("区域结果","ROI result"):id==="axial"?t("轴向对比","Axial slices"):t("FOV 筛选","FOV filter")}</button>)}
    </div>
    {page==="overview"&&<div role="tabpanel" id="transverse-page-overview" aria-labelledby="transverse-tab-overview" className="transverse-detail-page transverse-overview-page">
     <label className="transverse-diameter"><span>{t("FOV 直径（20–200 mm）","FOV diameter (20–200 mm)")}</span><strong>{diameter} <small>mm</small></strong><input aria-label={t("FOV 直径（mm）","FOV diameter (mm)")} type="range" min="20" max="200" step="5" value={diameter} onChange={e=>setDiameter(Number(e.target.value))}/></label>
    <div className="transverse-roi-label">{quantityLabel} · {selectionLabel} · {t("圆内统计","Inside-circle statistics")}</div>
    <div className="transverse-metrics" data-roi-mean-mt={metrics.mean} data-roi-pp-ppm={metrics.peakToPeakPPM??""} data-roi-std-ppm={metrics.stdPPM??""} data-roi-samples={metrics.count}>
     <div><span>{t("平均场","Mean field")}</span><strong>{number(metrics.mean,3)}<small> mT</small></strong></div><div><span>{t("峰峰差 / |均值|","P–P / |mean|")}</span><strong>{number(metrics.peakToPeakPPM)}<small> ppm</small></strong></div><div><span>{t("标准差 / |均值|","Std / |mean|")}</span><strong>{number(metrics.stdPPM)}<small> ppm</small></strong></div>
    </div>
     <div className="transverse-actual-range" data-actual-min-mt={metrics.min} data-actual-max-mt={metrics.max} data-actual-peak-to-peak-mt={metrics.max-metrics.min}><span>{t("当前区域实际场强","Actual field in current ROI")}</span><strong>{number(metrics.min,6)}–{number(metrics.max,6)} <small>mT</small></strong><span>Δ = {number(metrics.max-metrics.min,6)} mT · {number(metrics.peakToPeakPPM===null?null:metrics.peakToPeakPPM/10000,4)}%</span></div>
     <div className="transverse-axial-comparison transverse-axial-mini"><div className="transverse-chart-heading">{t("截面均值随 Z 的变化","ROI mean versus Z")}</div>{axialChart}</div>
    </div>}
    {page==="axial"&&<div role="tabpanel" id="transverse-page-axial" aria-labelledby="transverse-tab-axial" className="transverse-detail-page transverse-axial-page">
     <div className="transverse-chart-heading">{quantityLabel} · {t("直径","Diameter")} {diameter} mm · {t("各截面圆内统计","ROI statistics by slice")}</div>
     <div className="transverse-slice-table"><table><thead><tr><th>Z / mm</th><th>{t("均值 / mT","Mean / mT")}</th><th>{t("峰峰差 / ppm","P–P / ppm")}</th><th>{t("较 Z0 均值","vs. Z0 mean")}</th></tr></thead><tbody>{axialProfile.map(point=><tr key={point.z} data-axial-z-mm={point.z} data-axial-mean-mt={point.mean} data-axial-pp-ppm={point.peakToPeakPPM??""} aria-current={selection===point.index?"true":undefined}><td><button type="button" onClick={()=>setSelection(point.index)}>{point.z>0?"+":""}{point.z}</button></td><td>{number(point.mean,3)}</td><td>{number(point.peakToPeakPPM)}</td><td>{number(Math.abs(centerPlaneMean)>1e-12?(point.mean-centerPlaneMean)/Math.abs(centerPlaneMean)*100:null,2)}%</td></tr>)}</tbody></table><small>{t("峰峰差按各截面 |均值| 归一化；末列按 Z=0 截面 |均值| 归一化。","Peak-to-peak uses each slice's |mean|; the final column uses the Z=0 slice's |mean|.")}</small></div>
     {rangeId==="explore"&&<small className="transverse-axial-symmetry-note">{t("初始排布的 Bz 与 |B| 关于 Z=0 对称；编辑后可能不再对称。","Initial Bz and |B| are symmetric about Z=0; edits may break this symmetry.")}</small>}
    </div>}
    {page==="fov"&&<div role="tabpanel" id="transverse-page-fov" aria-labelledby="transverse-tab-fov" className="transverse-detail-page transverse-filter-page">
     <div className="transverse-chart-heading">{t("全部采样截面的区域筛选","ROI check over all sampled slices")}</div>
     <div className="transverse-volume-check" data-volume-pp-center-ppm={volume.peakToPeakCenterReferencePPM??""} data-volume-samples={volume.volumeSampleCount}><span>{t("全部 "+planeCount+" 截面 · |B| 峰峰差","All "+planeCount+" slices · |B| peak-to-peak")}</span><strong>{number(volume.peakToPeakCenterReferencePPM)} <small>ppm</small></strong><small>Δ|B|pp / |Bcentre| · {zExtent}</small></div>
    <div className="transverse-fov-curve">
     <svg viewBox="0 0 330 123" role="img" aria-label={t("横向直径与全部 "+planeCount+" 个采样截面场差的关系","Transverse diameter versus field variation over all "+planeCount+" sampled slices")}>
      <line x1="36" x2="308" y1="92" y2="92" stroke="#b5bdc6"/><line x1="36" x2="36" y1="22" y2="92" stroke="#b5bdc6"/>
      {[0,.5,1].map(f=><g key={f}><line x1="36" x2="308" y1={92-f*70} y2={92-f*70} stroke="#e7e9ed"/><text x="31" y={95-f*70} textAnchor="end" fill="#626973" fontSize="13">{axisNumber(curveMax*f)}</text></g>)}
      <path d={curve.filter(p=>p.peakToPeakCenterReferencePPM!==null).map((p,i)=>(i?"L":"M")+curveX(p.diameterMM).toFixed(2)+","+curveY(p.peakToPeakCenterReferencePPM??0).toFixed(2)).join(" ")} fill="none" stroke="#0071e3" strokeWidth="2"/>
      {recommendation&&<line x1="36" x2="308" y1={curveY(thresholdValue)} y2={curveY(thresholdValue)} stroke="#b46f00" strokeDasharray="4 3"/>}
      {volume.peakToPeakCenterReferencePPM!==null&&<circle cx={curveX(diameter)} cy={curveY(volume.peakToPeakCenterReferencePPM)} r="3.5" fill="#fff" stroke="#0071e3" strokeWidth="2"/>}
      {[20,100,200].map(d=><text key={d} x={curveX(d)} y="107" textAnchor="middle" fill="#626973" fontSize="13">{d}</text>)}<text x="39" y="13" fill="#626973" fontSize="13">Δ|B|pp / |Bcentre| · ppm</text><text x="307" y="120" textAnchor="end" fill="#626973" fontSize="13">{t("直径 / mm","Diameter / mm")}</text>
     </svg>
    </div>
    <div className="transverse-threshold"><label>{t("你设定的场差上限","Your field-variation limit")}<span><input type="number" min="1" step="100" placeholder={t("输入要求","Enter a requirement")} value={threshold} onChange={e=>setThreshold(e.target.value)} aria-label={t(planeCount+" 截面峰峰场差上限（ppm）",planeCount+"-slice peak-to-peak variation limit (ppm)")}/>ppm</span></label><button type="button" disabled={!recommendation||recommendation.diameterMM===null} onClick={()=>{if(recommendation?.diameterMM!==null&&recommendation?.diameterMM!==undefined)setDiameter(recommendation.diameterMM);}}>{t("采用满足上限的最大直径","Use the largest diameter within the limit")}</button><small data-recommended-diameter-mm={recommendation?.diameterMM??""}>{recommendation?(recommendation.diameterMM===null?t("20–200 mm 范围内，没有采样直径满足此上限。","No sampled diameter between 20 and 200 mm meets this limit."):t("最大采样横向直径：","Largest sampled transverse diameter: ")+recommendation.diameterMM+" mm"):t("请先输入实验要求；这里不预设医用合格标准。","Enter an experimental requirement; no medical acceptance limit is preset.")}</small></div>
     <p className="transverse-filter-definition">{t("使用所有截面的原始 |B| 极值，除以固定的初始中心 |B|。结果是离散截面筛选。","Uses raw |B| extrema across every slice, divided by the fixed initial centre |B|. This checks discrete slices.")}</p>
    </div>}
   </div>
  </div>
  <p className="transverse-domain-note"><Info size={14}/><span title={t("目前仅采样离散横截面。实际成像 FOV 仍需结合 RF、梯度、序列与实测磁场。","Only discrete transverse planes are sampled. Imaging FOV also requires RF, gradients, sequences and measured-field validation.")}>{t("离散截面估计 · "+planeCount+" 个截面 · "+zExtent+" · 成像 FOV 需实测验证","Discrete-slice estimate · "+planeCount+" slices · "+zExtent+" · Imaging FOV needs measurement")}</span></p>
 </section>;
}
