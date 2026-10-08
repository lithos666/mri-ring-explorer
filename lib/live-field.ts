// Analytical vector-grid updates and fully three-dimensional field tracing.
import {fieldAt,cuboidField,FIELD_KERNEL_VERSION,type Source,type Vec3,type FieldData} from "./field.ts";

export interface VolumeSpec {bound:number;n:number}
export interface PlaneSpec {bound:number;n:number;angle:number}
export const DEFAULT_VOLUME:VolumeSpec={bound:12,n:31}; // 0.8 model-unit spacing
export const DEFAULT_PLANE={bound:12,n:61}; // 0.4 model-unit spacing
export interface BaselineHeader {
 version:2;fieldKernelVersion:string;domain:"air";signature:string;count:number;volume:VolumeSpec;plane:PlaneSpec;center:Vec3;
}
export interface Baseline {header:BaselineHeader;volume:Float32Array;plane:Float32Array}
interface WorkingState {sources:Source[];volume:Float64Array;plane:Float64Array}
// Last completed designs only. Immutable assets and partially computed grids stay separate.
const workingCache=new WeakMap<Baseline,WorkingState>();
function snapshotSources(items:Source[]):Source[]{return items.map(s=>({...s,center:[...s.center] as Vec3,u:[...s.u] as Vec3,v:[...s.v] as Vec3,n:[...s.n] as Vec3}));}
export interface LiveFieldRequest {
 type:"solve";revision:number;schemeId:string;baseline:Source[];current:Source[];
 baselineAssetURL?:string;baselineData?:Pick<FieldData,"signature"|"center"|"schemeId"|"count">;
 angle:number;probes?:{id:string;p:Vec3}[];
}
export interface LiveFieldProgress {type:"progress";revision:number;stage:"baseline"|"delta"|"trace";done:number;total:number}
export interface LiveFieldResult {
 type:"result";fieldKernelVersion:string;revision:number;schemeId:string;changedCount:number;center:Vec3;baselineCenter:Vec3;
 referenceMagnitude:number;centerRatio:number;centerAngleDegrees:number|null;
 volume:{bound:number;n:number;step:number};
 plane:{bound:number;n:number;step:number;angle:number;values:Float32Array;mask:Uint8Array};
 lines3D:Vec3[][]; // World coordinates; these are never projected into a fake symmetry plane.
 profile:{p:Vec3;relative:number;b:Vec3}[];
 probes:{id:string;p:Vec3;b:Vec3;relative:number}[];
 quality:{method:string;traceStep:number;lineCount:number;nearMagnetMargin:number;interpolationResolution:number;exactCheckMinimumAlignment:number|null};
}
export interface Scheduler {cancelled:()=>boolean;progress?:(p:Omit<LiveFieldProgress,"revision"|"type">)=>void}
export class Cancelled extends Error {constructor(){super("Obsolete field revision");this.name="Cancelled"}}
const norm=(b:Vec3)=>Math.hypot(...b);
const clone3=(p:Vec3):Vec3=>[p[0],p[1],p[2]];
const dot3=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function checkpoint(s:Scheduler){if(s.cancelled())throw new Cancelled()}
const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function yieldIfNeeded(s:Scheduler,clock:{at:number},force=false){
 checkpoint(s);if(force||performance.now()-clock.at>12){await pause();checkpoint(s);clock.at=performance.now();}
}
export async function sourceSignature(items:Source[]):Promise<string>{
 const bytes=new TextEncoder().encode(JSON.stringify(items,(_key,value)=>typeof value==="number"?Math.round(value*1e12)/1e12:value));
 const hash=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,"0")).join("");
}
export const planePoint=(x:number,y:number,angle:number):Vec3=>[x*Math.cos(angle),y,x*Math.sin(angle)];
export function planeComponents(b:Vec3,angle:number):Vec3{
 return [b[0]*Math.cos(angle)+b[2]*Math.sin(angle),b[1],-b[0]*Math.sin(angle)+b[2]*Math.cos(angle)];
}
function sourceSame(a:Source,b:Source){
 return a.half===b.half&&(["center","u","v","n"] as const).every(key=>a[key].every((v,i)=>v===b[key][i]));
}
export function changedSources(base:Source[],current:Source[]){
 if(base.length!==current.length)throw new Error("Source identities/count must remain fixed while editing directions.");
 return current.flatMap((next,i)=>sourceSame(next,base[i])?[]:[{previous:base[i],next}]);
}
function gridPoint(i:number,spec:VolumeSpec):Vec3{
 const step=2*spec.bound/(spec.n-1),x=i%spec.n,y=Math.floor(i/spec.n)%spec.n,z=Math.floor(i/(spec.n*spec.n));
 return [-spec.bound+x*step,-spec.bound+y*step,-spec.bound+z*step];
}
function planeGridPoint(i:number,spec:PlaneSpec):Vec3{
 const step=2*spec.bound/(spec.n-1);return planePoint(-spec.bound+i%spec.n*step,-spec.bound+Math.floor(i/spec.n)*step,spec.angle);
}
export async function generateBaseline(
 sources:Source[],angle:number,scheduler:Scheduler,
 volume:VolumeSpec=DEFAULT_VOLUME,plane:PlaneSpec={...DEFAULT_PLANE,angle}
):Promise<Baseline>{
 const signature=await sourceSignature(sources),vol=new Float32Array(volume.n**3*3),map=new Float32Array(plane.n**2*3);
 const total=vol.length/3+map.length/3,clock={at:performance.now()};
 const material=new SourceIndex(sources,0);
 const arrays=[{values:vol,point:(i:number)=>gridPoint(i,volume)},{values:map,point:(i:number)=>planeGridPoint(i,plane)}];
 let done=0;
 for(const {values,point} of arrays)for(let i=0;i<values.length/3;i++){
  const p=point(i);
  // Material nodes are placeholders, always excluded by the plotting/interpolation masks.
  if(!material.near(p,0))values.set(fieldAt(p,sources),i*3);done++;
  if(i%16===0){scheduler.progress?.({stage:"baseline",done,total});await yieldIfNeeded(scheduler,clock);}
 }
 checkpoint(scheduler);
 return {header:{version:2,fieldKernelVersion:FIELD_KERNEL_VERSION,domain:"air",signature,count:sources.length,volume,plane,center:fieldAt([0,0,0],sources)},volume:vol,plane:map};
}
export function encodeBaseline(data:Baseline):Uint8Array{
 const header=new TextEncoder().encode(JSON.stringify(data.header)),size=(header.length+3)&~3;
 const bytes=new Uint8Array(4+size+data.volume.byteLength+data.plane.byteLength);
 new DataView(bytes.buffer).setUint32(0,size,true);bytes.set(header,4);
 const floats=new Float32Array(bytes.buffer,4+size);floats.set(data.volume);floats.set(data.plane,data.volume.length);
 return bytes;
}
export function decodeBaseline(buffer:ArrayBuffer):Baseline{
 if(buffer.byteLength<12)throw new Error("Invalid baseline asset.");
 const size=new DataView(buffer).getUint32(0,true);
 if(size>buffer.byteLength-4||size%4!==0)throw new Error("Invalid baseline header.");
 const json=new TextDecoder().decode(new Uint8Array(buffer,4,size)).replace(/\u0000+$/,"");
 const header=JSON.parse(json) as BaselineHeader;
 if(header.version!==2||header.fieldKernelVersion!==FIELD_KERNEL_VERSION||header.domain!=="air"||header.volume.n<3||header.volume.n>101||header.plane.n<3||header.plane.n>161||header.volume.bound<=0||header.plane.bound<=0)throw new Error("Unsupported baseline specification.");
 const a=header.volume.n**3*3,b=header.plane.n**2*3;
 if(buffer.byteLength!==4+size+(a+b)*4)throw new Error("Baseline payload length mismatch.");
 const floats=new Float32Array(buffer,4+size);
 if(!floats.every(Number.isFinite))throw new Error("Non-finite baseline field.");
 return {header,volume:floats.subarray(0,a),plane:floats.subarray(a)};
}
function assertBaseline(data:Baseline,request:LiveFieldRequest,signature:string){
 if(data.header.fieldKernelVersion!==FIELD_KERNEL_VERSION||data.header.domain!=="air"||data.header.signature!==signature||data.header.count!==request.baseline.length||Math.abs(data.header.plane.angle-request.angle)>1e-12)throw new Error("Baseline does not match the selected geometry and source frame.");
}
// Small broad-phase index avoids testing every magnet on every RK4 sub-step.
export class SourceIndex {
 private cells=new Map<string,Source[]>();private size=1;
 private maximumMargin:number;
 constructor(sources:Source[],maximumMargin:number){this.maximumMargin=maximumMargin;
  for(const s of sources){
   const extent=[0,1,2].map(i=>(s.half+maximumMargin)*(Math.abs(s.u[i])+Math.abs(s.v[i])+Math.abs(s.n[i])));
   const lo=s.center.map((v,i)=>Math.floor((v-extent[i])/this.size)),hi=s.center.map((v,i)=>Math.floor((v+extent[i])/this.size));
   for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
    const key=x+","+y+","+z,items=this.cells.get(key);if(items)items.push(s);else this.cells.set(key,[s]);
   }
  }
 }
 near(p:Vec3,margin:number){
  if(margin>this.maximumMargin)throw new Error("Collision margin exceeds spatial index extent.");
  const items=this.cells.get(p.map(v=>Math.floor(v/this.size)).join(","))??[];
  return items.some(s=>{
   const d:Vec3=[p[0]-s.center[0],p[1]-s.center[1],p[2]-s.center[2]],limit=s.half+margin;
   return Math.abs(dot3(d,s.u))<=limit&&Math.abs(dot3(d,s.v))<=limit&&Math.abs(dot3(d,s.n))<=limit;
  });
 }
}
export function interpolateVolume(p:Vec3,values:Float32Array|Float64Array,spec:VolumeSpec,mask?:Uint8Array):Vec3|null{
 const step=2*spec.bound/(spec.n-1),f=p.map(v=>(v+spec.bound)/step),i=f.map(Math.floor);
 if(i.some(v=>v<0||v>=spec.n-1))return null;
 const t=f.map((v,k)=>v-i[k]),result:Vec3=[0,0,0];
 for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
  const index=(i[2]+z)*spec.n*spec.n+(i[1]+y)*spec.n+i[0]+x;
  if(mask?.[index])return null;
  const w=(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]);
  result[0]+=values[index*3]*w;result[1]+=values[index*3+1]*w;result[2]+=values[index*3+2]*w;
 }
 return result.every(Number.isFinite)?result:null;
}
async function applyDelta(base:Baseline,delta:ReturnType<typeof changedSources>,scheduler:Scheduler,previous?:WorkingState){
 const volume=new Float64Array(previous?.volume??base.volume),plane=new Float64Array(previous?.plane??base.plane),clock={at:performance.now()};
 const total=volume.length/3+plane.length/3;let done=0;
 if(!delta.length)return {volume,plane};
 const material=new SourceIndex(delta.flatMap(d=>[d.previous,d.next]),0);
 for(const {values,point} of [
  {values:volume,point:(i:number)=>gridPoint(i,base.header.volume)},
  {values:plane,point:(i:number)=>planeGridPoint(i,base.header.plane)}
 ])for(let i=0;i<values.length/3;i++){
  const p=point(i);
  if(material.near(p,0)){done++;continue;} // Same occupied cubes; these nodes remain masked.
  let bx=0,by=0,bz=0;
  for(const d of delta){const before=cuboidField(p,d.previous),after=cuboidField(p,d.next);bx+=after[0]-before[0];by+=after[1]-before[1];bz+=after[2]-before[2];}
  values[i*3]+=bx;values[i*3+1]+=by;values[i*3+2]+=bz;done++;
  if(i%(delta.length>32?1:64)===0){scheduler.progress?.({stage:"delta",done,total});await yieldIfNeeded(scheduler,clock);}
 }
 return {volume,plane};
}
const add=(p:Vec3,b:Vec3,h:number):Vec3=>[p[0]+h*b[0],p[1]+h*b[1],p[2]+h*b[2]];
function defaultSeeds(angle:number):Vec3[]{
 return [.5,1.6,2.8].flatMap(r=>Array.from({length:8},(_,i)=>i*Math.PI/4).map(a=>[r*Math.cos(a+angle),0,r*Math.sin(a+angle)] as Vec3));
}
export async function traceVolume(values:Float32Array|Float64Array,spec:VolumeSpec,sources:Source[],angle:number,reference:number,scheduler:Scheduler){
 const step=2*spec.bound/(spec.n-1),clipMargin=Math.max(.08,step*.3),index=new SourceIndex(sources,step),mask=new Uint8Array(spec.n**3),clock={at:performance.now()};
 for(let i=0;i<mask.length;i++){mask[i]=index.near(gridPoint(i,spec),step*.12)?1:0;if(i%1024===0)await yieldIfNeeded(scheduler,clock);}
 const nullThreshold=Math.max(reference*1e-5,1e-10);
 const sample=(p:Vec3):Vec3|null=>{
  if(index.near(p,clipMargin))return null;
  const b=interpolateVolume(p,values,spec,mask);if(!b)return null;const l=norm(b);
  return l<nullThreshold?null:[b[0]/l,b[1]/l,b[2]/l];
 };
 const h=Math.min(.12,step*.2),seeds=defaultSeeds(angle);
 async function trace(seed:Vec3,sign:number):Promise<Vec3[]>{
  const points:Vec3[]=[clone3(seed)];const signed=h*sign;
  for(let j=0;j<720;j++){
   const p=points.at(-1)!,k1=sample(p);if(!k1)break;
   const k2=sample(add(p,k1,signed/2));if(!k2)break;
   const k3=sample(add(p,k2,signed/2));if(!k3)break;
   const k4=sample(add(p,k3,signed));if(!k4)break;
   const average:Vec3=[(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6,(k1[2]+2*k2[2]+2*k3[2]+k4[2])/6],next=add(p,average,signed);
   if(!sample(next))break;points.push(next);
   if(j>30&&norm([next[0]-seed[0],next[1]-seed[1],next[2]-seed[2]])<h*.9)break;
   if(j%40===0)await yieldIfNeeded(scheduler,clock);
  }
  return points;
 }
 const lines:Vec3[][]=[];let checks=0,minAlignment=1;
 for(let i=0;i<seeds.length;i++){
  checkpoint(scheduler);
  const backward=await trace(seeds[i],-1),forward=await trace(seeds[i],1),line=[...backward.slice(1).reverse(),...forward];
  const displayed=line.filter((_,j)=>j%2===0),alignment=new Map<number,number>();
  // Validate every rendered segment with the exact full-source field. Work outwards
  // from the seed and stop at the first inaccurate segment on each side, so discarded
  // tails do not cost hundreds of unnecessary full-field checks.
  let localChecks=0;
  async function aligned(j:number):Promise<boolean>{
   const a=displayed[j],b=displayed[j+1],mid:Vec3=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],truth=fieldAt(mid,sources),t:Vec3=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],denominator=norm(truth)*norm(t),value=denominator>1e-12?dot3(truth,t)/denominator:-1;
   alignment.set(j,value);
   if(++localChecks%4===0)await yieldIfNeeded(scheduler,clock);
   return value>=.98;
  }
  const seedIndex=Math.min(displayed.length-1,Math.floor((backward.length-1)/2));
  let left=seedIndex,right=seedIndex;
  while(left>0&&await aligned(left-1))left--;
  while(right<displayed.length-1&&await aligned(right))right++;
  const verified=displayed.slice(left,right+1);
  if(verified.length>=10){
   lines.push(verified);
   for(let j=left;j<right;j++){minAlignment=Math.min(minAlignment,alignment.get(j)!);checks++;}
  }
  scheduler.progress?.({stage:"trace",done:i+1,total:seeds.length});await yieldIfNeeded(scheduler,clock,true);
 }
 return {lines,step:h,clipMargin,alignment:checks?minAlignment:null};
}
export async function solveLiveField(request:LiveFieldRequest,base:Baseline,scheduler:Scheduler):Promise<LiveFieldResult>{
 const signature=await sourceSignature(request.baseline);assertBaseline(base,request,signature);checkpoint(scheduler);
 const totalDelta=changedSources(request.baseline,request.current);
 for(const {previous:old,next} of totalDelta){
  const axes=[next.u,next.v,next.n];
  if(old.half!==next.half||old.center.some((v,i)=>v!==next.center[i])||![old.u,old.v,old.n].every(axis=>axes.some(candidate=>Math.abs(dot3(axis,candidate))>1-1e-12)))throw new Error("Air-grid updates require unchanged occupied cube geometry.");
 }
 // Returning to the immutable baseline is a direct restore, never an accumulated undo.
 const previous=totalDelta.length?workingCache.get(base):undefined;
 const delta=previous?changedSources(previous.sources,request.current):totalDelta;
 const updated=await applyDelta(base,delta,scheduler,previous);
 const baselineCenter=fieldAt([0,0,0],request.baseline),center=fieldAt([0,0,0],request.current),reference=Math.max(norm(baselineCenter),1e-12),length=norm(center);
 const centerAngleDegrees=length>1e-10?Math.acos(Math.max(-1,Math.min(1,dot3(center,baselineCenter)/(length*norm(baselineCenter)))))*180/Math.PI:null;
 const trace=await traceVolume(updated.volume,base.header.volume,request.current,request.angle,reference,scheduler);checkpoint(scheduler);
 const collision=new SourceIndex(request.current,1),mask=new Uint8Array(base.header.plane.n**2);
 for(let i=0;i<mask.length;i++)mask[i]=collision.near(planeGridPoint(i,base.header.plane),.06)?1:0;
 const profile=Array.from({length:41},(_,i)=>{const p:Vec3=[0,-10+i*.5,0],b=fieldAt(p,request.current);return {p,b,relative:norm(b)/reference}});
 const probes=(request.probes??[]).map(({id,p})=>{const b=fieldAt(p,request.current);return {id,p,b,relative:norm(b)/reference}});
 checkpoint(scheduler);
 // No awaited work after committing. A cancelled revision never replaces completed state.
 workingCache.set(base,{sources:snapshotSources(request.current),volume:updated.volume,plane:updated.plane});
 return {type:"result",fieldKernelVersion:FIELD_KERNEL_VERSION,revision:request.revision,schemeId:request.schemeId,changedCount:totalDelta.length,center,baselineCenter,referenceMagnitude:reference,centerRatio:length/reference,centerAngleDegrees,
  volume:{...base.header.volume,step:2*base.header.volume.bound/(base.header.volume.n-1)},
  plane:{...base.header.plane,step:2*base.header.plane.bound/(base.header.plane.n-1),values:new Float32Array(updated.plane),mask},
  lines3D:trace.lines,profile,probes,quality:{method:"exact uniform-cuboid superposition in air; material nodes masked; full 3D trilinear interpolation and normalized RK4 tracing",traceStep:trace.step,lineCount:trace.lines.length,nearMagnetMargin:trace.clipMargin,interpolationResolution:2*base.header.volume.bound/(base.header.volume.n-1),exactCheckMinimumAlignment:trace.alignment}};
}
