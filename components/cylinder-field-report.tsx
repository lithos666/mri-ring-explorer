"use client";
import {useEffect,useRef,useState} from "react";
import {Download,Upload} from "lucide-react";
import type {MRIModel} from "@/lib/mri";
import {geometrySignature} from "@/lib/design";
import {sourcesFor} from "@/lib/field";
import {sourceSignature} from "@/lib/live-field";
import {cylinderAnalysisSignature,validateCylinderReport,type CylinderFieldReport} from "@/lib/cylinder-field";
import {useLanguage} from "@/lib/language-context";
import "./cylinder-field-report.css";

interface Props {model:MRIModel|null;baseline:MRIModel|null;state:"empty"|"updating"|"previous"|"current";standalone?:boolean}
const numeric=(value:number|null,digits=3)=>value===null?"—":value.toLocaleString("en-US",{minimumFractionDigits:digits,maximumFractionDigits:digits});
const coordinates=(point:readonly number[])=>point.map(v=>numeric(v,2)).join(" / ");

/** Reports describe a completed model, never the draft or the visible FOV mask. */
export default function CylinderFieldReportCard({model,baseline,state,standalone=false}:Props){
 const {t,language}=useLanguage(),fileInput=useRef<HTMLInputElement>(null);
 const [reports,setReports]=useState<CylinderFieldReport[]>([]),[error,setError]=useState("");
 const [load,setLoad]=useState<"loading"|"loaded"|"error">("loading");
 const [identity,setIdentity]=useState<{model:MRIModel;signature:string}|null>(null);
 const [reportPage,setReportPage]=useState<"summary"|"refinement">("summary");
 const scheme=model?.id;
 useEffect(()=>{
  if(!scheme)return;
  const controller=new AbortController();setLoad("loading");
  void(async()=>{try{
   const response=await fetch("/cylinder-field-initial-"+scheme+".json",{signal:controller.signal,cache:"default"});
   if(!response.ok)throw new Error("Report unavailable");
   const report=validateCylinderReport(await response.json());
   if(await cylinderAnalysisSignature(report)!==report.analysisSignature)throw new Error("Report identity differs from its physical inputs");
   if(!controller.signal.aborted){setReports(previous=>[report,...previous.filter(item=>item.analysisSignature!==report.analysisSignature)]);setLoad("loaded");}
  }catch{if(!controller.signal.aborted)setLoad("error");}})();
  return()=>controller.abort();
 },[scheme]);
 useEffect(()=>{
  if(!model)return;let cancelled=false;
  void sourceSignature(sourcesFor(model)).then(signature=>{if(!cancelled)setIdentity({model,signature});}).catch(()=>{if(!cancelled)setIdentity(null);});
  return()=>{cancelled=true;};
 },[model]);
 const expected=model&&baseline&&identity?.model===model?{sourceSignature:identity.signature,schemeId:model.id,sourceCount:model.magnets.length,unitMM:model.unitMM!,remanenceT:model.remanenceT,geometrySignature:geometrySignature(baseline)}:null;
 const report=expected?reports.find(candidate=>{try{validateCylinderReport(candidate,expected);return true;}catch{return false;}})??null:null;
 const reportState=report?"ready":!expected||load==="loading"?"loading":"missing";
 const latest=report?.levels.at(-1);
 const previous=state==="updating"||state==="previous";

 async function importReport(file:File){
  setError("");
  try{
   if(file.size>512*1024)throw new Error("size");
   const next=validateCylinderReport(JSON.parse(await file.text()));
   if(await cylinderAnalysisSignature(next)!==next.analysisSignature)throw new Error("signature");
   setReports(items=>[next,...items.filter(item=>item.analysisSignature!==next.analysisSignature)].slice(0,12));
   setLoad("loaded");
  }catch{setError(t("报告格式、物理参数或文件大小不符合要求。请使用离线分析工具导出的 JSON（最大512 KB）。","Invalid report format, physical parameters or file size. Use a JSON exported by the offline analyzer (maximum 512 KB)."));}
 }
 function download(format:"json"|"csv"|"md"){
  if(!report)return;
  let body=JSON.stringify(report,null,2),mime="application/json";
  if(format==="csv"){
   const rows=[["scheme","diameter_mm","length_mm","Br_T","source_signature","analysis_signature","level","radial","angular","axial","volume_samples","boundary_samples","mean_mT","population_std_mT","std_ppm","min_mT","min_x_mm","min_y_mm","min_z_mm","max_mT","max_x_mm","max_y_mm","max_z_mm","peak_to_peak_mT","peak_to_peak_ppm"]];
   for(const [i,level] of report.levels.entries())rows.push([report.schemeId,report.region.diameterMM,report.region.lengthMM,report.remanenceT,report.sourceSignature,report.analysisSignature,i+1,level.resolution.radial,level.resolution.angular,level.resolution.axial,level.volumeSampleCount,level.boundarySampleCount,level.meanMT,level.stdMT,level.stdPPM,level.min.magnitudeMT,...level.min.pointMM,level.max.magnitudeMT,...level.max.pointMM,level.peakToPeakMT,level.peakToPeakPPM].map(v=>v===null?"":String(v)));
   body="\ufeff"+rows.map(row=>row.join(",")).join("\r\n");mime="text/csv;charset=utf-8";
  }else if(format==="md"){
   body="# "+t("三维圆柱区域磁场评估","3D cylindrical field assessment")+"\n\n"+t("采样与积分估计；不是连续空间极值证明。","Sampling and integration estimate; not a proof of continuous-domain extrema.")+"\n\n"+
    "Ø "+report.region.diameterMM+" × "+report.region.lengthMM+" mm · Z = ±"+report.region.lengthMM/2+" mm\n\n"+
    "| "+t("等级","Level")+" | "+t("体积平均场强 / mT","Volume mean field / mT")+" | "+t("体积标准差 / mT","Volume std. dev. / mT")+" | "+t("采样峰峰差 / ppm","Sampled peak-to-peak / ppm")+" |\n|---|---:|---:|---:|\n"+
    report.levels.map((level,i)=>"| "+(i+1)+" | "+level.meanMT+" | "+level.stdMT+" | "+level.peakToPeakPPM+" |").join("\n")+"\n\n"+
    t("中心场 |B|：","Center field |B|: ")+report.center.magnitudeMT+" mT\n\n"+
    t("边界采样仅用于极值，不参与体积平均。标准差使用体积／总体定义。","Boundary samples contribute only to extrema, not the volume mean. Standard deviation uses the volume/population definition.")+"\n\n"+
    "Br = "+report.remanenceT+" T\n\nSource: `"+report.sourceSignature+"`\n\nAnalysis: `"+report.analysisSignature+"`\n";
   mime="text/markdown;charset=utf-8";
  }
  const url=URL.createObjectURL(new Blob([body],{type:mime})),link=document.createElement("a");link.href=url;link.download="cylinder-D"+report.region.diameterMM+"-L"+report.region.lengthMM+"-"+language+"."+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const Card=standalone?"section":"details";
 const title=<><span>{t("三维区域评估","3D region assessment")}</span><small>{report?"Ø "+report.region.diameterMM+" × "+report.region.lengthMM+" mm":t("离线报告","Offline report")}</small></>;
 return <Card className={"cylinder-report-card"+(standalone?" cylinder-report-card--standalone":"")} data-cylinder-report-page={reportPage} data-cylinder-report-state={reportState} data-cylinder-report-source-signature={report?.sourceSignature??""} data-cylinder-report-design-state={state}>
  {standalone?<header className="cylinder-report-heading">{title}</header>:<summary>{title}</summary>}
  <div className="cylinder-report-content">
   {report&&latest?<>
    <p className={"cylinder-report-status"+(previous?" cylinder-report-status--previous":"")} role="status">{previous?t("上一结果的三维报告 · 新修改需计算并重新生成对应报告。","3D report for the previous result · Compute changes and generate a matching report."):t("与已计算排布一致 · 采样与积分估计","Matches the computed layout · Sampling and integration estimate")}</p>
    <p>{t("以设备原点为中心的圆柱；轴向 Z = ","Cylinder centered at the device origin; Z = ")}−{report.region.lengthMM/2}…+{report.region.lengthMM/2} mm</p>
    {standalone&&<nav className="cylinder-report-pages" aria-label={t("三维报告内容","3D report content")}><button type="button" aria-pressed={reportPage==="summary"} onClick={()=>setReportPage("summary")}>{t("区域结果","Region result")}</button><button type="button" aria-pressed={reportPage==="refinement"} onClick={()=>setReportPage("refinement")}>{t("加密与方法","Refinement & method")}</button></nav>}
    {(!standalone||reportPage==="summary")&&<>
    <div className="cylinder-report-metrics">
     <div><span>{t("体积平均场强 |B|","Volume mean |B|")}</span><strong data-cylinder-mean-mt={latest.meanMT}>{numeric(latest.meanMT,6)}<small> mT</small></strong></div>
     <div><span>{t("采样峰峰差 / 体积均值","Sampled peak-to-peak / volume mean")}</span><strong data-cylinder-pp-ppm={latest.peakToPeakPPM}>{numeric(latest.peakToPeakPPM,1)}<small> ppm</small></strong></div>
     <div><span>{t("中心场强 |B|","Center field |B|")}</span><strong>{numeric(report.center.magnitudeMT,6)}<small> mT</small></strong></div>
     <div><span>{t("体积标准差 / 均值","Volume std. dev. / mean")}</span><strong>{numeric(latest.stdPPM,1)}<small> ppm</small></strong></div>
    </div>
    <div className="cylinder-report-extrema"><p><b>{t("最小场强","Minimum field")}</b> {numeric(latest.min.magnitudeMT,6)} mT · X / Y / Z = {coordinates(latest.min.pointMM)} mm</p><p><b>{t("最大场强","Maximum field")}</b> {numeric(latest.max.magnitudeMT,6)} mT · X / Y / Z = {coordinates(latest.max.pointMM)} mm</p></div>
    </>}
    {(!standalone||reportPage==="refinement")&&<>
    <div className="cylinder-report-table"><table><caption>{t("加密采样对照","Sampling refinement")}</caption><thead><tr><th>{t("分辨率（径向／圆周／轴向）","Resolution (radial / angular / axial)")}</th><th>{t("均值 / mT","Mean / mT")}</th><th>{t("峰峰差 / ppm","Peak-to-peak / ppm")}</th><th>{t("均值变化 / mT","Mean change / mT")}</th><th>{t("峰峰指标变化 / ppm","PP metric change / ppm")}</th></tr></thead><tbody>{report.levels.map((level,i)=><tr key={i}><td>{level.resolution.radial} / {level.resolution.angular} / {level.resolution.axial}</td><td>{numeric(level.meanMT,6)}</td><td>{numeric(level.peakToPeakPPM,1)}</td><td>{level.deltaFromPrevious?numeric(level.deltaFromPrevious.meanMT,6):"—"}</td><td>{level.deltaFromPrevious?numeric(level.deltaFromPrevious.peakToPeakPPM,2):"—"}</td></tr>)}</tbody></table></div>
    <p className="cylinder-report-method">{t("等体积单元中点积分；端面、侧壁和轴线额外检查极值，不参与体积均值。标准差使用体积／总体定义。结果未设医用合格阈值，也不能直接作为整手／整脚成像范围。","Equal-volume midpoint integration; extra end-face, sidewall and axis samples check extrema without entering the volume mean. Standard deviation uses the volume/population definition. No clinical acceptance threshold is assigned, and this is not established whole-hand/foot imaging coverage.")}</p>
    </>}
    <div className="cylinder-report-downloads">{(["json","csv","md"] as const).map(format=><button type="button" key={format} onClick={()=>download(format)}><Download size={14}/>{format==="md"?t("报告说明","Report notes"):format.toUpperCase()}</button>)}</div>
   </>:<p role="status">{reportState==="loading"?t("正在核对三维报告与已计算设计…","Matching the 3D report to the computed design…"):t("尚未生成对应三维报告。可用离线分析工具处理保存的设计，再载入报告。","No 3D report has been generated for this computed design. Analyze a saved design offline, then load its report.")}</p>}
   <div className="cylinder-report-import"><button type="button" onClick={()=>fileInput.current?.click()}><Upload size={14}/>{t("载入离线报告","Load offline report")}</button><input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void importReport(file);}}/><small>{t("不会修改磁铁或启动求场。","Does not edit magnets or start a solve.")}</small></div>
   {error&&<p className="cylinder-report-error" role="alert">{error}</p>}
  </div>
 </Card>;
}
