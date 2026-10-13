// Precompute the immutable initial XY field once. Browser startup only decodes
// this Float64 map; modified designs use exact per-cuboid differences in a worker.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {Worker,isMainThread,parentPort,workerData} from "node:worker_threads";
import {models} from "../lib/mri.ts";
import {fieldAt,sourcesFor,FIELD_KERNEL_VERSION,type Source} from "../lib/field.ts";
import {sourceSignature} from "../lib/live-field.ts";
import {DEFAULT_TRANSVERSE_GRID,TRANSVERSE_DATA_VERSION,devicePointToWorld,worldFieldToDevice,resultFromValues,encodeTransverseField,decodeTransverseField,sameTransverseGrid,roiMetrics,type TransverseFieldRequest} from "../lib/transverse-field.ts";

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
 const model=models.latest,sources=sourcesFor(model),spec=DEFAULT_TRANSVERSE_GRID;
 const signature=await sourceSignature(sources),destination=path.resolve("public/transverse-field-initial-latest.bin");
 let reuse=false;
 try{
  const file=fs.readFileSync(destination),old=decodeTransverseField(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
  reuse=old.sourceSignature===signature&&old.sourceCount===sources.length&&old.fieldKernelVersion===FIELD_KERNEL_VERSION&&old.generationSignature===TRANSVERSE_DATA_VERSION&&old.schemeId===model.id&&old.unitMM===model.unitMM&&old.remanenceT===model.remanenceT&&sameTransverseGrid(old.grid,spec);
 }catch{}
 if(reuse)console.log("Transverse initial cache verified: 14 rings, 1 mm XY grid, five Z planes.");
 else{
  if(!model.unitMM||spec.radiusMM>=model.dimensions!.magnetInnerMM-model.blockSizeMM!/2)throw new Error("Offline disk must be wholly inside the bore air domain.");
  const n=2*spec.radiusMM/spec.stepMM+1,total=n*n*spec.slicesMM.length,values=new Float64Array(total*3),threads=Math.min(4,os.availableParallelism()),began=performance.now();
  const done=new Array(threads).fill(0),workers:Worker[]=[];let lastPercent=-1;
  try{
   await Promise.all(Array.from({length:threads},(_,part)=>new Promise<void>((resolve,reject)=>{
    const start=Math.floor(part*total/threads),end=Math.floor((part+1)*total/threads);
    const worker=new Worker(new URL(import.meta.url),{workerData:{start,end,n,...spec,sources,unitMM:model.unitMM,remanenceT:model.remanenceT},resourceLimits:{maxOldGenerationSizeMb:96,maxYoungGenerationSizeMb:8}});workers.push(worker);
    worker.on("message",message=>{
     if(message.type==="result"){values.set(message.values,start*3);done[part]=end-start;resolve();}
     else done[part]=message.done;
     const percent=Math.floor(done.reduce((a,b)=>a+b,0)/total*10)*10;if(percent!==lastPercent){lastPercent=percent;console.log("Transverse baseline",percent+"%");}
    });worker.on("error",reject);worker.on("exit",code=>{if(code)reject(new Error("Transverse generation worker failed: "+code));});
   })));
  }finally{await Promise.all(workers.map(worker=>worker.terminate()));}
  const request:TransverseFieldRequest={type:"solve",revision:0,schemeId:model.id,current:sources,unitMM:model.unitMM,remanenceT:model.remanenceT,spec};
  const result=await resultFromValues(request,values),bytes=encodeTransverseField(result),roundTrip=decodeTransverseField(bytes.buffer as ArrayBuffer);
  fs.writeFileSync(destination,bytes);
  console.log(JSON.stringify({transverseInitial:model.id,bytes:bytes.length,seconds:(performance.now()-began)/1000,sourceSignature:signature,grid:result.grid,diameter150:roiMetrics(roundTrip,150)}));
 }
}
