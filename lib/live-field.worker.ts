// DRAFT integration: place beside live-field.ts in lib/.
import {Cancelled,sourceSignature,decodeBaseline,generateBaseline,solveLiveField,type Baseline,type LiveFieldRequest,type Scheduler} from "./live-field.ts";
interface WorkerScope {onmessage:((event:MessageEvent)=>void)|null;postMessage:(message:unknown,transfer?:Transferable[])=>void}
const scope=globalThis as unknown as WorkerScope;
let epoch=0;
const cached=new Map<string,Baseline>();
scope.onmessage=(event:MessageEvent<LiveFieldRequest|{type:"cancel";revision:number}>)=>{
 const request=event.data;const token=++epoch;
 if(request.type==="cancel")return;
 void run(request,token);
};
async function run(request:LiveFieldRequest,token:number){
 const scheduler:Scheduler={
  cancelled:()=>token!==epoch,
  progress:p=>{if(token===epoch)scope.postMessage({type:"progress",revision:request.revision,schemeId:request.schemeId,...p});}
 };
 try{
  const signature=await sourceSignature(request.baseline);if(scheduler.cancelled())throw new Cancelled();
  const key=request.schemeId+":"+signature+":"+request.angle;
  let baseline=cached.get(key);
  if(!baseline&&request.baselineAssetURL){
   try{
    const response=await fetch(request.baselineAssetURL);if(!response.ok)throw new Error("No precomputed live field asset.");
    baseline=decodeBaseline(await response.arrayBuffer());
    if(baseline.header.signature!==signature||baseline.header.plane.angle!==request.angle||baseline.header.count!==request.baseline.length)throw new Error("Obsolete live field asset.");
   }catch(error){if(scheduler.cancelled())throw new Cancelled();baseline=undefined;}
  }
  if(!baseline)baseline=await generateBaseline(request.baseline,request.angle,scheduler);
  if(scheduler.cancelled())throw new Cancelled();
  cached.set(key,baseline);
  // Keep only the two fixed schemes; the editable field arrays are never cached as baseline.
  if(cached.size>2){const oldest=cached.keys().next().value;if(oldest)cached.delete(oldest);}
  const result=await solveLiveField(request,baseline,scheduler);
  if(scheduler.cancelled())throw new Cancelled();
  // Do not transfer the cached immutable baseline buffers.
  scope.postMessage(result,[result.plane.values.buffer as ArrayBuffer,result.plane.mask.buffer as ArrayBuffer]);
 }catch(error){
  if(error instanceof Cancelled||scheduler.cancelled())return;
  scope.postMessage({type:"error",revision:request.revision,schemeId:request.schemeId,message:error instanceof Error?error.message:String(error)});
 }
}
