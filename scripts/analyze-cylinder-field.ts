// Explicit offline analysis only. Neither the build nor browser startup runs this script.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {Worker,isMainThread,parentPort,workerData} from "node:worker_threads";
import {models,type SchemeId} from "../lib/mri.ts";
import {applyOverrides,geometrySignature,validateDesign,MAX_IMPORT_BYTES} from "../lib/design.ts";
import {fieldAt,sourcesFor,type Source,type Vec3} from "../lib/field.ts";
import {SourceIndex} from "../lib/live-field.ts";
import {devicePointToWorld,worldFieldToDevice} from "../lib/transverse-field.ts";
import {CYLINDER_REPORT_VERSION,CYLINDER_LEVELS,DEFAULT_CYLINDER_REGION,cylinderIdentity,cylinderAnalysisSignature,cylinderSampleAt,cylinderSampleCounts,emptyCylinderPartial,addCylinderSample,mergeCylinderPartials,finishCylinderLevel,validateCylinderReport,validateCylinderRegion,type CylinderRegion,type CylinderResolution,type CylinderPartial,type CylinderLevel,type CylinderFieldReport} from "../lib/cylinder-field.ts";

interface Work {start:number;end:number;region:CylinderRegion;resolution:CylinderResolution;sources:Source[];unitMM:number;remanenceT:number}
if(!isMainThread){
 const {start,end,region,resolution,sources,unitMM,remanenceT}=workerData as Work,partial=emptyCylinderPartial(),material=new SourceIndex(sources,0);
 for(let i=start;i<end;i++){
  const sample=cylinderSampleAt(i,region,resolution),world=devicePointToWorld(...sample.pointMM,unitMM);
  if(material.near(world,0))throw new Error("Cylinder analysis intersects magnet material. Full air-domain coverage is required.");
  addCylinderSample(partial,sample,worldFieldToDevice(fieldAt(world,sources),remanenceT));
  if((i-start)%2048===0)parentPort?.postMessage({type:"progress",done:i-start});
 }
 parentPort?.postMessage({type:"result",partial});
}else{
 const args=process.argv.slice(2),options=new Map<string,string>();let fine=false;
 for(let i=0;i<args.length;i++){
  if(args[i]==="--fine"){fine=true;continue;}
  if(args[i]==="--help"){console.log("Offline cylinder |B| analysis / 离线圆柱磁场分析\nnode --experimental-strip-types scripts/analyze-cylinder-field.ts [--diameter-mm 150] [--length-mm 200] [--design exported-design.json] [--output public/cylinder-field-initial-latest] [--fine]\nDefault: two refinement levels; --fine adds 64 × 256 × 160. Output: JSON, CSV, bilingual Markdown. No clinical threshold is assumed.");process.exit(0);}
  if(!["--diameter-mm","--length-mm","--design","--output"].includes(args[i])||i+1>=args.length||args[i+1].startsWith("--")||options.has(args[i]))throw new Error("Invalid or duplicate cylinder analysis argument: "+args[i]);
  options.set(args[i],args[++i]);
 }
 const region=validateCylinderRegion({...DEFAULT_CYLINDER_REGION,diameterMM:Number(options.get("--diameter-mm")??150),lengthMM:Number(options.get("--length-mm")??200)});
 let model=models.latest;
 if(options.has("--design")){
  const file=path.resolve(options.get("--design")!);if(fs.statSync(file).size>MAX_IMPORT_BYTES)throw new Error("Design input exceeds 512 KB.");
  const text=fs.readFileSync(file,"utf8"),parsed=JSON.parse(text),scheme=parsed?.schemeId as SchemeId;
  if(scheme!=="latest"&&scheme!=="original")throw new Error("Unsupported design scheme.");
  const base=models[scheme],validated=validateDesign(text,base);model=applyOverrides(base,validated.overrides);
 }
 if(!model.unitMM)throw new Error("The model requires confirmed millimetre units.");
 const unitMM=model.unitMM,sources=sourcesFor(model),resolutions=CYLINDER_LEVELS.slice(0,fine?3:2),identity=await cylinderIdentity({schemeId:model.id,geometrySignature:geometrySignature(models[model.id]),sources,unitMM,remanenceT:model.remanenceT,region,resolutions}),signature=await cylinderAnalysisSignature(identity);
 // Modified designs and custom regions must never silently replace the shipped baseline.
 const defaultOutput=!options.has("--design")&&region.diameterMM===150&&region.lengthMM===200&&!fine?"public/cylinder-field-initial-latest":"outputs/cylinder-"+signature.slice(0,16);
 const requested=path.resolve(options.get("--output")??defaultOutput),prefix=requested.replace(/\.(json|csv|md)$/i,""),destination=prefix+".json";
 let cached:CylinderFieldReport|null=null;
 try{const candidate=validateCylinderReport(JSON.parse(fs.readFileSync(destination,"utf8")),identity);if(candidate.analysisSignature===signature&&await cylinderAnalysisSignature(candidate)===signature)cached=candidate;}catch{}
 const began=performance.now(),levels:CylinderLevel[]=[];
 if(cached){levels.push(...cached.levels);console.log("Cylinder report cache verified: "+signature);}
 else{
  for(const resolution of resolutions){
   const counts=cylinderSampleCounts(resolution),threads=Math.min(4,os.availableParallelism()),done=Array.from({length:threads},()=>0),workers:Worker[]=[],partials:Array<CylinderPartial>=[];let lastPercent=-1;
   try{
    await Promise.all(Array.from({length:threads},(_,part)=>new Promise<void>((resolve,reject)=>{
     const start=Math.floor(part*counts.total/threads),end=Math.floor((part+1)*counts.total/threads),worker=new Worker(new URL(import.meta.url),{workerData:{start,end,region,resolution,sources,unitMM,remanenceT:model.remanenceT} satisfies Work,resourceLimits:{maxOldGenerationSizeMb:96,maxYoungGenerationSizeMb:8}});workers.push(worker);
     worker.on("message",message=>{
      if(message.type==="result"){partials[part]=message.partial;done[part]=end-start;resolve();}else done[part]=message.done;
      const percent=Math.floor(done.reduce((a,b)=>a+b,0)/counts.total*10)*10;if(percent!==lastPercent){lastPercent=percent;console.log(`Cylinder ${resolution.radial} × ${resolution.angular} × ${resolution.axial}: ${percent}%`);}
     });worker.on("error",reject);worker.on("exit",code=>{if(code)reject(new Error("Cylinder analysis worker failed: "+code));});
    })));
   }finally{await Promise.all(workers.map(worker=>worker.terminate()));}
   const partial=partials.reduce(mergeCylinderPartials,emptyCylinderPartial());levels.push(finishCylinderLevel(partial,resolution,levels.at(-1)));
   console.log(JSON.stringify({resolution,volumeSamples:counts.volume,boundarySamples:counts.boundary,meanMT:levels.at(-1)!.meanMT,peakToPeakPPM:levels.at(-1)!.peakToPeakPPM}));
  }
 }
 const centerVector=worldFieldToDevice(fieldAt([0,0,0],sources),model.remanenceT);
 const report:CylinderFieldReport=cached??{...identity,version:CYLINDER_REPORT_VERSION,createdAt:new Date().toISOString(),quantity:"magnitude",units:{length:"mm",field:"mT",homogeneity:"ppm"},analysisSignature:signature,center:{pointMM:[0,0,0],vectorMT:centerVector,magnitudeMT:Math.hypot(...centerVector)},levels,classification:"sampling-and-integration-estimate"};
 validateCylinderReport(report,identity);
 fs.mkdirSync(path.dirname(prefix),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+"\n");
 const columns=["analysis_signature","source_signature","scheme_id","geometry_signature","diameter_mm","length_mm","remanence_T","kernel_version","algorithm","classification","radial","angular","axial","volume_samples","boundary_samples","mean_mT","population_std_mT","population_std_ppm","sampled_min_mT","min_X_mm","min_Y_mm","min_Z_mm","min_domain","sampled_max_mT","max_X_mm","max_Y_mm","max_Z_mm","max_domain","sampled_peak_to_peak_mT","sampled_peak_to_peak_ppm","delta_mean_mT","delta_peak_to_peak_mT","delta_peak_to_peak_ppm"];
 const rows=report.levels.map(l=>[report.analysisSignature,report.sourceSignature,report.schemeId,report.geometrySignature,region.diameterMM,region.lengthMM,report.remanenceT,report.fieldKernelVersion,report.algorithm,report.classification,l.resolution.radial,l.resolution.angular,l.resolution.axial,l.volumeSampleCount,l.boundarySampleCount,l.meanMT,l.stdMT,l.stdPPM,l.min.magnitudeMT,...l.min.pointMM,l.min.domain,l.max.magnitudeMT,...l.max.pointMM,l.max.domain,l.peakToPeakMT,l.peakToPeakPPM,l.deltaFromPrevious?.meanMT??"",l.deltaFromPrevious?.peakToPeakMT??"",l.deltaFromPrevious?.peakToPeakPPM??""].join(","));
 fs.writeFileSync(prefix+".csv",columns.join(",")+"\n"+rows.join("\n")+"\n");
 const f=(n:number|null)=>n===null?"Undefined / 未定义":n.toPrecision(12),latest=report.levels.at(-1)!;
 const md=["# 三维圆柱磁场评估 / 3D cylinder magnetic-field assessment","",`圆柱 / Cylinder: D = ${region.diameterMM} mm, L = ${region.lengthMM} mm; Z = ${-region.lengthMM/2}…${region.lengthMM/2} mm; centre / 中心 = (0, 0, 0).`,`中心场强 / Centre field: ${f(report.center.magnitudeMT)} mT. 体积平均场强 / Volume mean: ${f(latest.meanMT)} mT.`,"","这是采样与积分估计；不代表连续空间极值已被证明，也不设定临床合格阈值。","These are sampling and integration estimates, not proven continuous extrema or a clinical acceptance criterion.","","体积指标使用各点原始 |B|。u = r²/R²、角度与轴向等分的中点网格具有相同体积权重；表面与轴线仅用于极值搜索，不参与体积平均。","Volume metrics use raw |B| and equal-volume midpoint integration in u = r²/R², angle and Z. Sidewall, endcaps and axis contribute only to sampled extrema.","","| 网格 / Grid | 体积点 / Volume points | 平均 / Mean (mT) | 体积标准差 / Population std (mT) | 峰峰差 / P–P (mT) | P–P / mean (ppm) |","|---|---:|---:|---:|---:|---:|",...report.levels.map(l=>`| ${l.resolution.radial} × ${l.resolution.angular} × ${l.resolution.axial} | ${l.volumeSampleCount} | ${f(l.meanMT)} | ${f(l.stdMT)} | ${f(l.peakToPeakMT)} | ${f(l.peakToPeakPPM)} |`),"",`最低采样点 / Sampled minimum: ${f(latest.min.magnitudeMT)} mT at (${latest.min.pointMM.map(f).join(", ")}) mm [${latest.min.domain}].`,`最高采样点 / Sampled maximum: ${f(latest.max.magnitudeMT)} mT at (${latest.max.pointMM.map(f).join(", ")}) mm [${latest.max.domain}].`,"","峰峰 ppm = (max |B| − min |B|) / volume mean |B| × 10⁶。体积标准差使用总体定义，与 MATLAB 截面 N−1 样本标准差不同。","Peak-to-peak ppm = (max |B| − min |B|) / volume mean |B| × 10⁶. Volume standard deviation uses population weights, distinct from MATLAB section N−1 sample standard deviation.","",...report.levels.slice(1).map(l=>`加密变化 / Refinement change (${l.resolution.radial} × ${l.resolution.angular} × ${l.resolution.axial}): mean ${f(l.deltaFromPrevious!.meanMT)} mT; P–P ${f(l.deltaFromPrevious!.peakToPeakMT)} mT; P–P ${f(l.deltaFromPrevious!.peakToPeakPPM)} ppm.`),"",`Br = ${report.remanenceT} T; ${report.sourceCount} magnets; units = mm / mT / ppm.`,`Kernel: ${report.fieldKernelVersion}; algorithm: ${report.algorithm}.`,`Geometry: ${report.geometrySignature}.`,`Source signature: ${report.sourceSignature}.`,`Analysis signature: ${report.analysisSignature}.`,`Generated: ${report.createdAt}.`,""];
 fs.writeFileSync(prefix+".md",md.join("\n"));
 console.log(JSON.stringify({report:destination,seconds:(performance.now()-began)/1000,sourceSignature:report.sourceSignature,analysisSignature:signature,centerMT:report.center.magnitudeMT,meanMT:latest.meanMT,peakToPeakPPM:latest.peakToPeakPPM}));
}
