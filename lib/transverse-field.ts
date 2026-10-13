// Device XY sections are solved from the complete three-dimensional cuboid field.
// World -> device is the proper rotation (X,Y,Z)=(world.x,-world.z,world.y).
import {cuboidField,fieldAt,FIELD_KERNEL_VERSION,type Source,type Vec3} from "./field.ts";
import {Cancelled,changedSources,sourceSignature,SourceIndex} from "./live-field.ts";

export const TRANSVERSE_FIELD_VERSION=1 as const;
export const TRANSVERSE_DATA_VERSION="device-xy-full-cuboids-five-planes-mt-v1";
export interface TransverseGridSpec {radiusMM:number;stepMM:number;slicesMM:number[]}
export const DEFAULT_TRANSVERSE_GRID:TransverseGridSpec={radiusMM:100,stepMM:1,slicesMM:[-2,-1,0,1,2]};
export interface TransverseFieldRequest {
 type:"solve";revision:number;schemeId:string;current:Source[];unitMM:number;remanenceT:number;
 spec?:TransverseGridSpec;baselineAssetURL?:string;baseline?:Source[];generationSignature?:string;
}
export interface TransverseFieldProgress {type:"progress";revision:number;schemeId:string;stage:"load"|"compute";done:number;total:number}
export interface TransverseScheduler {cancelled:()=>boolean;progress?:(p:{stage:"load"|"compute";done:number;total:number})=>void}
export interface TransverseFieldResult {
 type:"result";version:typeof TRANSVERSE_FIELD_VERSION;revision:number;schemeId:string;sourceSignature:string;sourceCount:number;generationSignature:string;
 fieldKernelVersion:string;unitMM:number;remanenceT:number;grid:TransverseGridSpec&{n:number};
 /** Slice-major, then row-major, then physical device Bx/By/Bz in mT. Masked values are zero placeholders. */
 values:Float64Array;
 /** One mask per XY pixel: 0=valid, 1=outside circular sampling disk, 2=intersects a magnet in at least one plane. */
 mask:Uint8Array;averageBz:Float64Array;averageMagnitude:Float64Array;centerMT:Vec3;
}
export interface FieldSummary {
 count:number;meanMT:number;minMT:number;maxMT:number;stdMT:number;
 /** Peak-to-peak and MATLAB's sample standard deviation, normalized by abs(mean); null at zero reference. */
 peakToPeakPPM:number|null;stdPPM:number|null;
}
export interface TransverseROIMetrics {
 diameterMM:number;pixelCount:number;volumeSampleCount:number;coverageComplete:boolean;sourceSignature:string;
 averageBz:FieldSummary;volumeMagnitude:FieldSummary;
 /** Same extrema across all planes, normalized by fixed centre |B|. Nested disks produce a monotonic bound. */
 peakToPeakCenterReferencePPM:number|null;centerReferenceMT:number;
}
export interface FOVRecommendation {diameterMM:number|null;metrics:TransverseROIMetrics|null;thresholdPPM:number;referenceMT:number;curve:TransverseROIMetrics[]}

const norm=(b:Vec3)=>Math.hypot(...b);
export function devicePointToWorld(xMM:number,yMM:number,zMM:number,unitMM:number):Vec3 {
 if(!Number.isFinite(unitMM)||unitMM<=0)throw new Error("A positive millimetre-to-model scale is required.");
 return [xMM/unitMM,zMM/unitMM,-yMM/unitMM];
}
export function worldFieldToDevice(b:Vec3,remanenceT:number):Vec3 {
 const scale=remanenceT*1000;return [b[0]*scale,-b[2]*scale,b[1]*scale];
}
export function transverseGridPoint(pixel:number,grid:TransverseGridSpec&{n:number}):[number,number] {
 return [-grid.radiusMM+pixel%grid.n*grid.stepMM,-grid.radiusMM+Math.floor(pixel/grid.n)*grid.stepMM];
}
function validatedGrid(spec:TransverseGridSpec=DEFAULT_TRANSVERSE_GRID):TransverseGridSpec&{n:number} {
 const {radiusMM,stepMM}=spec,n=2*radiusMM/stepMM+1;
 if(!Number.isFinite(radiusMM)||radiusMM<1||radiusMM>105||!Number.isFinite(stepMM)||stepMM<.5||!Number.isInteger(n)||n>421||!spec.slicesMM.length||spec.slicesMM.length>21||spec.slicesMM.some(z=>!Number.isFinite(z)||Math.abs(z)>100))throw new Error("Invalid transverse-grid specification.");
 return {radiusMM,stepMM,slicesMM:[...spec.slicesMM],n};
}
export function sameTransverseGrid(a:TransverseGridSpec,b:TransverseGridSpec) {
 return a.radiusMM===b.radiusMM&&a.stepMM===b.stepMM&&a.slicesMM.length===b.slicesMM.length&&a.slicesMM.every((z,i)=>z===b.slicesMM[i]);
}
function cloneSources(items:Source[]):Source[] {return items.map(s=>({...s,center:[...s.center] as Vec3,u:[...s.u] as Vec3,v:[...s.v] as Vec3,n:[...s.n] as Vec3}));}
function sameOccupiedCube(a:Source,b:Source) {
 return a.half===b.half&&a.center.every((v,i)=>v===b.center[i])&&[a.u,a.v,a.n].every(axis=>[b.u,b.v,b.n].some(other=>Math.abs(axis.reduce((sum,v,i)=>sum+v*other[i],0))>1-1e-12));
}
function checkpoint(s:TransverseScheduler) {if(s.cancelled())throw new Cancelled();}
async function yieldWork(s:TransverseScheduler,clock:{at:number}) {
 checkpoint(s);if(performance.now()-clock.at>=10){await new Promise<void>(r=>setTimeout(r,0));checkpoint(s);clock.at=performance.now();}
}
function averagePlanes(result:Pick<TransverseFieldResult,"grid"|"values"|"mask">) {
 const pixels=result.grid.n**2,slices=result.grid.slicesMM.length,averageBz=new Float64Array(pixels),averageMagnitude=new Float64Array(pixels);
 for(let p=0;p<pixels;p++)if(!result.mask[p])for(let z=0;z<slices;z++){
  const offset=(z*pixels+p)*3,bx=result.values[offset],by=result.values[offset+1],bz=result.values[offset+2];
  averageBz[p]+=bz/slices;averageMagnitude[p]+=Math.hypot(bx,by,bz)/slices;
 }
 return {averageBz,averageMagnitude};
}
export async function resultFromValues(request:TransverseFieldRequest,values:Float64Array):Promise<TransverseFieldResult> {
 const grid=validatedGrid(request.spec),pixels=grid.n**2,sources=request.current,mask=new Uint8Array(pixels);
 if(values.length!==pixels*grid.slicesMM.length*3||!values.every(Number.isFinite)||request.unitMM<=0||request.remanenceT<=0)throw new Error("Invalid transverse field values or physical units.");
 const material=new SourceIndex(sources,0);
 for(let p=0;p<pixels;p++){
  const [x,y]=transverseGridPoint(p,grid);if(x*x+y*y>grid.radiusMM**2+1e-9){mask[p]=1;continue;}
  if(grid.slicesMM.some(z=>material.near(devicePointToWorld(x,y,z,request.unitMM),0)))mask[p]=2;
 }
 const base={type:"result" as const,version:TRANSVERSE_FIELD_VERSION,revision:request.revision,schemeId:request.schemeId,sourceSignature:await sourceSignature(sources),sourceCount:sources.length,generationSignature:request.generationSignature??TRANSVERSE_DATA_VERSION,fieldKernelVersion:FIELD_KERNEL_VERSION,unitMM:request.unitMM,remanenceT:request.remanenceT,grid,values,mask,centerMT:worldFieldToDevice(fieldAt([0,0,0],sources),request.remanenceT)};
 return {...base,...averagePlanes(base)};
}
export interface TransversePrevious {result:TransverseFieldResult;sources:Source[]}
/** Solve an immutable completed design. An optional previous map uses exact source differences, never longitudinal interpolation. */
export async function generateTransverseField(request:TransverseFieldRequest,scheduler:TransverseScheduler,previous?:TransversePrevious):Promise<TransverseFieldResult> {
 const grid=validatedGrid(request.spec),sources=cloneSources(request.current);
 if(!sources.length||!Number.isFinite(request.unitMM)||request.unitMM<=0||!Number.isFinite(request.remanenceT)||request.remanenceT<=0)throw new Error("Invalid physical field inputs.");
 const signature=await sourceSignature(sources);checkpoint(scheduler);
 const pixels=grid.n**2,sliceCount=grid.slicesMM.length,total=pixels*sliceCount;
 const usePrevious=previous&&previous.result.fieldKernelVersion===FIELD_KERNEL_VERSION&&previous.result.unitMM===request.unitMM&&previous.result.remanenceT===request.remanenceT&&sameTransverseGrid(previous.result.grid,grid)&&previous.sources.length===sources.length&&sources.every((s,i)=>sameOccupiedCube(s,previous.sources[i]));
 const delta=usePrevious?changedSources(previous.sources,sources):null;
 const values=usePrevious?new Float64Array(previous.result.values):new Float64Array(total*3),mask=usePrevious?new Uint8Array(previous.result.mask):new Uint8Array(pixels);
 const material=usePrevious?null:new SourceIndex(sources,0);
 const clock={at:performance.now()};let done=0;
 for(let p=0;p<pixels;p++){
  const [x,y]=transverseGridPoint(p,grid);
  if(x*x+y*y>grid.radiusMM**2+1e-9){mask[p]=1;done+=sliceCount;continue;}
  if(material&&grid.slicesMM.some(z=>material.near(devicePointToWorld(x,y,z,request.unitMM),0)))mask[p]=2;
  if(mask[p]){done+=sliceCount;continue;}
  for(let z=0;z<sliceCount;z++){
   const point=devicePointToWorld(x,y,grid.slicesMM[z],request.unitMM),offset=(z*pixels+p)*3;
   if(delta){
    const difference:Vec3=[0,0,0];for(const pair of delta){const before=cuboidField(point,pair.previous),after=cuboidField(point,pair.next);for(let k=0;k<3;k++)difference[k]+=after[k]-before[k];}
    const b=worldFieldToDevice(difference,request.remanenceT);for(let k=0;k<3;k++)values[offset+k]+=b[k];
   }else values.set(worldFieldToDevice(fieldAt(point,sources),request.remanenceT),offset);
   if(!values.subarray(offset,offset+3).every(Number.isFinite))throw new Error("Non-finite analytical field inside the sampled air region.");
   done++;
  }
  if(p%8===0){scheduler.progress?.({stage:"compute",done,total});await yieldWork(scheduler,clock);}
 }
 checkpoint(scheduler);scheduler.progress?.({stage:"compute",done:total,total});
 const base={type:"result" as const,version:TRANSVERSE_FIELD_VERSION,revision:request.revision,schemeId:request.schemeId,sourceSignature:signature,sourceCount:sources.length,generationSignature:request.generationSignature??TRANSVERSE_DATA_VERSION,fieldKernelVersion:FIELD_KERNEL_VERSION,unitMM:request.unitMM,remanenceT:request.remanenceT,grid,values,mask,centerMT:worldFieldToDevice(fieldAt([0,0,0],sources),request.remanenceT)};
 return {...base,...averagePlanes(base)};
}
/** MATLAB std(B) uses N-1. A zero mean gives no meaningful relative ppm value. */
interface Accumulator {count:number;mean:number;m2:number;min:number;max:number}
const accumulator=():Accumulator=>({count:0,mean:0,m2:0,min:Infinity,max:-Infinity});
function addSample(a:Accumulator,v:number) {
 if(!Number.isFinite(v))throw new Error("Non-finite field statistic.");a.count++;const d=v-a.mean;a.mean+=d/a.count;a.m2+=d*(v-a.mean);a.min=Math.min(a.min,v);a.max=Math.max(a.max,v);
}
function mergeSamples(a:Accumulator,b:Accumulator) {
 if(!b.count)return;if(!a.count){Object.assign(a,b);return;}
 const count=a.count+b.count,delta=b.mean-a.mean;a.m2+=b.m2+delta*delta*a.count*b.count/count;a.mean+=delta*b.count/count;a.count=count;a.min=Math.min(a.min,b.min);a.max=Math.max(a.max,b.max);
}
function finishSamples(a:Accumulator):FieldSummary {
 if(!a.count)throw new Error("The selected ROI contains no valid field samples.");
 const std=a.count>1?Math.sqrt(Math.max(0,a.m2/(a.count-1))):0,reference=Math.abs(a.mean);
 return {count:a.count,meanMT:a.mean,minMT:a.min,maxMT:a.max,stdMT:std,peakToPeakPPM:reference>1e-12?(a.max-a.min)/reference*1e6:null,stdPPM:reference>1e-12?std/reference*1e6:null};
}
export function summarizeField(values:Iterable<number>):FieldSummary {
 const a=accumulator();for(const value of values)addSample(a,value);return finishSamples(a);
}
export function roiMetrics(result:TransverseFieldResult,diameterMM:number):TransverseROIMetrics {
 if(!Number.isFinite(diameterMM)||diameterMM<=0||diameterMM>2*result.grid.radiusMM)throw new Error("FOV must remain inside the solved transverse disk.");
 const pixels=result.grid.n**2,radius=diameterMM/2,averages:number[]=[],magnitudes:number[]=[];let coverageComplete=true;
 for(let p=0;p<pixels;p++){
  const [x,y]=transverseGridPoint(p,result.grid);if(x*x+y*y>radius*radius+1e-9)continue;
  if(result.mask[p]){coverageComplete=false;continue;}
  averages.push(result.averageBz[p]);
  for(let z=0;z<result.grid.slicesMM.length;z++){const o=(z*pixels+p)*3;magnitudes.push(Math.hypot(result.values[o],result.values[o+1],result.values[o+2]));}
 }
 const averageBz=summarizeField(averages),volumeMagnitude=summarizeField(magnitudes),reference=norm(result.centerMT);
 return {diameterMM,pixelCount:averages.length,volumeSampleCount:magnitudes.length,coverageComplete,sourceSignature:result.sourceSignature,averageBz,volumeMagnitude,centerReferenceMT:reference,peakToPeakCenterReferencePPM:reference>1e-12?(volumeMagnitude.maxMT-volumeMagnitude.minMT)/reference*1e6:null};
}
export function fovCurve(result:TransverseFieldResult,minMM=20,maxMM=Math.min(200,2*result.grid.radiusMM),incrementMM=5):TransverseROIMetrics[] {
 if(minMM<=0||maxMM<minMM||maxMM>2*result.grid.radiusMM||!Number.isFinite(incrementMM)||incrementMM<=0)throw new Error("Invalid FOV sweep.");
 const buckets:{diameterMM:number;averages:Accumulator;magnitudes:Accumulator;incomplete:boolean}[]=[];
 for(let d=minMM;d<=maxMM+1e-9;d+=incrementMM)buckets.push({diameterMM:d,averages:accumulator(),magnitudes:accumulator(),incomplete:false});
 const pixels=result.grid.n**2;
 // Each solved sample enters exactly one radial bucket; a prefix merge obtains all nested ROIs.
 for(let p=0;p<pixels;p++){
  const [x,y]=transverseGridPoint(p,result.grid),d=2*Math.hypot(x,y),index=Math.max(0,Math.ceil((d-minMM-1e-9)/incrementMM));
  if(index>=buckets.length)continue;const bucket=buckets[index];
  if(result.mask[p]){bucket.incomplete=true;continue;}
  addSample(bucket.averages,result.averageBz[p]);
  for(let z=0;z<result.grid.slicesMM.length;z++){const o=(z*pixels+p)*3;addSample(bucket.magnitudes,Math.hypot(result.values[o],result.values[o+1],result.values[o+2]));}
 }
 const averages=accumulator(),magnitudes=accumulator(),reference=norm(result.centerMT),curve:TransverseROIMetrics[]=[];let complete=true;
 for(const bucket of buckets){
  mergeSamples(averages,bucket.averages);mergeSamples(magnitudes,bucket.magnitudes);complete=complete&&!bucket.incomplete;
  const averageBz=finishSamples(averages),volumeMagnitude=finishSamples(magnitudes);
  curve.push({diameterMM:bucket.diameterMM,pixelCount:averages.count,volumeSampleCount:magnitudes.count,coverageComplete:complete,sourceSignature:result.sourceSignature,averageBz,volumeMagnitude,centerReferenceMT:reference,peakToPeakCenterReferencePPM:reference>1e-12?(volumeMagnitude.maxMT-volumeMagnitude.minMT)/reference*1e6:null});
 }
 return curve;
}
/** A sampled thin-volume bound, not a clinical FOV recommendation or a continuous-volume proof. */
export function recommendFOV(result:TransverseFieldResult,thresholdPPM:number,precomputedCurve?:TransverseROIMetrics[]):FOVRecommendation {
 if(!Number.isFinite(thresholdPPM)||thresholdPPM<0)throw new Error("A non-negative user-defined ppm bound is required.");
 const curve=precomputedCurve??fovCurve(result);let metrics:TransverseROIMetrics|null=null;
 if(curve.some((item,i)=>item.sourceSignature!==result.sourceSignature||item.centerReferenceMT!==norm(result.centerMT)||item.diameterMM>2*result.grid.radiusMM||(i>0&&item.diameterMM<=curve[i-1].diameterMM)))throw new Error("The cached FOV curve does not match this completed field.");
 for(const item of curve){if(!item.coverageComplete||item.peakToPeakCenterReferencePPM===null||item.peakToPeakCenterReferencePPM>thresholdPPM)break;metrics=item;}
 return {diameterMM:metrics?.diameterMM??null,metrics,thresholdPPM,referenceMT:norm(result.centerMT),curve};
}
type TransverseHeader=Omit<TransverseFieldResult,"values"|"mask"|"averageBz"|"averageMagnitude">;
export function encodeTransverseField(result:TransverseFieldResult):Uint8Array {
 const {values,mask,averageBz:_bz,averageMagnitude:_mag,...header}=result;
 const json=new TextEncoder().encode(JSON.stringify(header)),headerBytes=Math.ceil(json.length/8)*8,maskBytes=Math.ceil(mask.length/8)*8;
 const bytes=new Uint8Array(8+headerBytes+maskBytes+values.byteLength);new DataView(bytes.buffer).setUint32(0,headerBytes,true);new DataView(bytes.buffer).setUint32(4,maskBytes,true);bytes.set(json,8);bytes.set(mask,8+headerBytes);new Float64Array(bytes.buffer,8+headerBytes+maskBytes).set(values);return bytes;
}
export function decodeTransverseField(buffer:ArrayBuffer):TransverseFieldResult {
 if(buffer.byteLength<24)throw new Error("Invalid transverse field asset.");
 const view=new DataView(buffer),headerBytes=view.getUint32(0,true),maskBytes=view.getUint32(4,true);
 if(headerBytes%8||maskBytes%8||headerBytes<8||headerBytes>65536||8+headerBytes+maskBytes>buffer.byteLength)throw new Error("Invalid transverse field header.");
 const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,headerBytes)).replace(/\u0000+$/,"")) as TransverseHeader,grid=validatedGrid(header.grid),pixels=grid.n**2;
 if(header.version!==TRANSVERSE_FIELD_VERSION||header.fieldKernelVersion!==FIELD_KERNEL_VERSION||header.grid.n!==grid.n||maskBytes!==Math.ceil(pixels/8)*8||!Number.isFinite(header.unitMM)||header.unitMM<=0||!Number.isFinite(header.remanenceT)||header.remanenceT<=0||!header.centerMT.every(Number.isFinite)||header.sourceCount<1||!/^\w{64}$/.test(header.sourceSignature)||typeof header.generationSignature!=="string")throw new Error("Unsupported transverse field asset.");
 const expected=pixels*grid.slicesMM.length*3;
 if(buffer.byteLength!==8+headerBytes+maskBytes+expected*8)throw new Error("Transverse field payload length mismatch.");
 const mask=new Uint8Array(buffer,8+headerBytes,pixels),values=new Float64Array(buffer,8+headerBytes+maskBytes,expected);
 if(mask.some(v=>v>2)||!values.every(Number.isFinite))throw new Error("Non-finite or malformed transverse field payload.");
 const result={...header,grid,values,mask};return {...result,...averagePlanes(result)};
}
