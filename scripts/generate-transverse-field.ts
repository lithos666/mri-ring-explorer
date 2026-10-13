// Precompute the immutable initial XY field once. Browser startup only decodes
// this Float64 map; modified designs use exact per-cuboid differences in a worker.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {Worker,isMainThread,parentPort,workerData} from "node:worker_threads";
import {models} from "../lib/mri.ts";
import {fieldAt,sourcesFor,FIELD_KERNEL_VERSION,type Source} from "../lib/field.ts";
import {sourceSignature} from "../lib/live-field.ts";
import {devicePointToWorld,worldFieldToDevice,resultFromValues,encodeTransverseField,decodeTransverseField,sameTransverseGrid,roiMetrics,type TransverseFieldRequest,type TransverseFieldResult} from "../lib/transverse-field.ts";
import {TRANSVERSE_RANGES,type TransverseRangeId} from "../lib/transverse-ranges.ts";

if (!isMainThread) {
 const {start,end,n,radiusMM,stepMM,slicesMM,sources,unitMM,remanenceT}=workerData as {start:number;end:number;n:number;radiusMM:number;stepMM:number;slicesMM:number[];sources:Source[];unitMM:number;remanenceT:number};
 const pixels=n*n,values=new Float64Array((end-start)*3);
 for(let index=start;index<end;index++){
  const pixel=index%pixels,x=-radiusMM+pixel%n*stepMM,y=-radiusMM+Math.floor(pixel/n)*stepMM;
  if(x*x+y*y<=radiusMM**2+1e-9){const z=slicesMM[Math.floor(index/pixels)];values.set(worldFieldToDevice(fieldAt(devicePointToWorld(x,y,z,unitMM),sources),remanenceT),(index-start)*3);}
  if((index-start)%4000===0)parentPort?.postMessage({type:"progress",done:index-start});
 }
 parentPort?.postMessage({type:"result",start,values},[values.buffer]);
} else {
 const model=models.latest,sources=sourcesFor(model),signature=await sourceSignature(sources);
 const verifiedCaches=new Map<TransverseRangeId,TransverseFieldResult>();
 for(const rangeId of ["matlab","explore"] as const){
  const {grid:spec,assetURL,generationSignature}=TRANSVERSE_RANGES[rangeId],destination=path.resolve("public"+assetURL);
  let old:TransverseFieldResult|undefined;
  try{
   const file=fs.readFileSync(destination),candidate=decodeTransverseField(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
   if(candidate.sourceSignature===signature&&candidate.sourceCount===sources.length&&candidate.fieldKernelVersion===FIELD_KERNEL_VERSION&&candidate.generationSignature===generationSignature&&candidate.schemeId===model.id&&candidate.unitMM===model.unitMM&&candidate.remanenceT===model.remanenceT&&sameTransverseGrid(candidate.grid,spec))old=candidate;
  }catch{}
  if(old){verifiedCaches.set(rangeId,old);console.log(`Transverse initial ${rangeId} cache verified: 14 rings, 1 mm XY grid, ${spec.slicesMM.length} Z planes.`);continue;}
  if(!model.unitMM||spec.radiusMM>=model.dimensions!.magnetInnerMM-model.blockSizeMM!/2)throw new Error("Offline disk must be wholly inside the bore air domain.");
  const n=2*spec.radiusMM/spec.stepMM+1,pixels=n*n,values=new Float64Array(pixels*spec.slicesMM.length*3),began=performance.now();
  // Copy only an exactly matching physical plane from a fully verified cache.
  // Other planes are evaluated independently with the complete cuboid sum.
  const missingPlanes:number[]=[];
  for(let z=0;z<spec.slicesMM.length;z++){
   const match=[...verifiedCaches.values()].find(cache=>cache.grid.radiusMM===spec.radiusMM&&cache.grid.stepMM===spec.stepMM&&cache.grid.n===n&&cache.grid.slicesMM.includes(spec.slicesMM[z]));
   if(match){const index=match.grid.slicesMM.indexOf(spec.slicesMM[z]);values.set(match.values.subarray(index*pixels*3,(index+1)*pixels*3),z*pixels*3);}
   else missingPlanes.push(z);
  }
  const missingSlices=missingPlanes.map(index=>spec.slicesMM[index]),total=pixels*missingSlices.length,threads=Math.min(4,os.availableParallelism()),computed=new Float64Array(total*3);
  const done=new Array(threads).fill(0),workers:Worker[]=[];let lastPercent=-1;
  try{
   if(total)await Promise.all(Array.from({length:threads},(_,part)=>new Promise<void>((resolve,reject)=>{
    const start=Math.floor(part*total/threads),end=Math.floor((part+1)*total/threads);
    const worker=new Worker(new URL(import.meta.url),{workerData:{start,end,n,...spec,slicesMM:missingSlices,sources,unitMM:model.unitMM,remanenceT:model.remanenceT},resourceLimits:{maxOldGenerationSizeMb:96,maxYoungGenerationSizeMb:8}});workers.push(worker);
    worker.on("message",message=>{
     if(message.type==="result"){computed.set(message.values,start*3);done[part]=end-start;resolve();}
     else done[part]=message.done;
     const percent=Math.floor(done.reduce((a,b)=>a+b,0)/total*10)*10;if(percent!==lastPercent){lastPercent=percent;console.log(`Transverse ${rangeId} baseline`,percent+"%");}
    });worker.on("error",reject);worker.on("exit",code=>{if(code)reject(new Error("Transverse generation worker failed: "+code));});
   })));
  }finally{await Promise.all(workers.map(worker=>worker.terminate()));}
  for(let index=0;index<missingPlanes.length;index++)values.set(computed.subarray(index*pixels*3,(index+1)*pixels*3),missingPlanes[index]*pixels*3);
  const request:TransverseFieldRequest={type:"solve",revision:0,schemeId:model.id,current:sources,unitMM:model.unitMM,remanenceT:model.remanenceT,spec,generationSignature};
  const result=await resultFromValues(request,values),bytes=encodeTransverseField(result),roundTrip=decodeTransverseField(bytes.buffer as ArrayBuffer);
  fs.writeFileSync(destination,bytes);
  verifiedCaches.set(rangeId,roundTrip);
  console.log(JSON.stringify({transverseInitial:model.id,rangeId,bytes:bytes.length,seconds:(performance.now()-began)/1000,sourceSignature:signature,grid:result.grid,diameter150:roiMetrics(roundTrip,150)}));
 }
}
