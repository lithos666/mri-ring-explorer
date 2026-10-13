import {sourceSignature,Cancelled} from "./live-field.ts";
import {DEFAULT_TRANSVERSE_GRID,TRANSVERSE_DATA_VERSION,decodeTransverseField,generateTransverseField,sameTransverseGrid,type TransverseFieldRequest,type TransverseFieldResult,type TransverseScheduler,type TransversePrevious} from "./transverse-field.ts";
interface WorkerScope {onmessage:((event:MessageEvent)=>void)|null;postMessage:(message:unknown,transfer?:Transferable[])=>void}
const scope=globalThis as unknown as WorkerScope;
let epoch=0;
const baselines=new Map<string,TransversePrevious>(),completed=new Map<string,TransversePrevious>();
scope.onmessage=(event:MessageEvent<TransverseFieldRequest|{type:"cancel";revision:number}>)=>{
 const request=event.data,token=++epoch;if(request.type==="cancel")return;void run(request,token);
};
function matchesAsset(result:TransverseFieldResult,request:TransverseFieldRequest,signature:string,count:number) {
 return result.schemeId===request.schemeId&&result.sourceSignature===signature&&result.sourceCount===count&&result.unitMM===request.unitMM&&result.remanenceT===request.remanenceT&&result.generationSignature===(request.generationSignature??TRANSVERSE_DATA_VERSION)&&sameTransverseGrid(result.grid,request.spec??DEFAULT_TRANSVERSE_GRID);
}
async function run(request:TransverseFieldRequest,token:number) {
 const scheduler:TransverseScheduler={cancelled:()=>token!==epoch,progress:p=>{if(token===epoch)scope.postMessage({type:"progress",revision:request.revision,schemeId:request.schemeId,...p});}};
 try{
  const baselineSources=request.baseline??request.current,baselineSignature=await sourceSignature(baselineSources),currentSignature=await sourceSignature(request.current);
  if(scheduler.cancelled())throw new Cancelled();
  const key=JSON.stringify([request.schemeId,baselineSignature,request.unitMM,request.remanenceT,request.generationSignature??TRANSVERSE_DATA_VERSION,request.spec??DEFAULT_TRANSVERSE_GRID]);
  let initial=baselines.get(key),previous=completed.get(key);
  if(!initial&&request.baselineAssetURL){
   scheduler.progress?.({stage:"load",done:0,total:1});
   try{
    const url=request.baselineAssetURL+(request.baselineAssetURL.includes("?")?"&":"?")+"source="+encodeURIComponent(baselineSignature),response=await fetch(url,{cache:"default"});
    if(!response.ok)throw new Error("Precomputed transverse map is unavailable.");
    const result=decodeTransverseField(await response.arrayBuffer());
    if(!matchesAsset(result,request,baselineSignature,baselineSources.length))throw new Error("Precomputed transverse map does not match the physical model.");
    if(scheduler.cancelled())throw new Cancelled();initial={result,sources:baselineSources};baselines.set(key,initial);
   }catch(error){if(scheduler.cancelled()||error instanceof Cancelled)throw new Cancelled();initial=undefined;}
  }
  if(!previous)previous=initial;
  let result:TransverseFieldResult;
  if(initial&&currentSignature===baselineSignature)result={...initial.result,revision:request.revision};
  else result=await generateTransverseField(request,scheduler,previous);
  if(scheduler.cancelled())throw new Cancelled();
  // Commit only fully completed snapshots. A cancellation cannot poison the next delta.
  completed.set(key,{result,sources:request.current});
  for(const cache of [baselines,completed])while(cache.size>2){const oldest=cache.keys().next().value;if(oldest)cache.delete(oldest);}
  // Keep cached Float64 maps owned by the worker; transfer copies of the completed result.
  const reply={...result,values:new Float64Array(result.values),mask:new Uint8Array(result.mask),averageBz:new Float64Array(result.averageBz),averageMagnitude:new Float64Array(result.averageMagnitude)};
  scope.postMessage(reply,[reply.values.buffer,reply.mask.buffer,reply.averageBz.buffer,reply.averageMagnitude.buffer]);
 }catch(error){
  if(error instanceof Cancelled||scheduler.cancelled())return;
  scope.postMessage({type:"error",revision:request.revision,schemeId:request.schemeId,message:error instanceof Error?error.message:String(error)});
 }
}
