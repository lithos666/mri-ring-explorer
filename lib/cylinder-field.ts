import {FIELD_KERNEL_VERSION,type Source,type Vec3} from "./field.ts";
import {sourceSignature} from "./live-field.ts";

export const CYLINDER_REPORT_VERSION="cylinder-fov-report-v1" as const;
export const CYLINDER_ALGORITHM="equal-volume-midpoint-cylinder-v1" as const;
export interface CylinderRegion {diameterMM:number;lengthMM:number;centerMM:Vec3;axis:"Z"}
export interface CylinderResolution {radial:number;angular:number;axial:number}
export const DEFAULT_CYLINDER_REGION:CylinderRegion={diameterMM:150,lengthMM:200,centerMM:[0,0,0],axis:"Z"};
export const CYLINDER_LEVELS:readonly CylinderResolution[]=[{radial:16,angular:64,axial:40},{radial:32,angular:128,axial:80},{radial:64,angular:256,axial:160}];
export type CylinderSampleDomain="volume"|"sidewall"|"endcap"|"axis"|"center";
export interface CylinderSample {pointMM:Vec3;domain:CylinderSampleDomain}
export interface CylinderProbe extends CylinderSample {vectorMT:Vec3;magnitudeMT:number}
export interface CylinderPartial {count:number;mean:number;m2:number;boundaryCount:number;min:CylinderProbe|null;max:CylinderProbe|null}
export interface CylinderLevel {
 resolution:CylinderResolution;volumeSampleCount:number;boundarySampleCount:number;meanMT:number;stdMT:number;stdPPM:number|null;
 min:CylinderProbe;max:CylinderProbe;peakToPeakMT:number;peakToPeakPPM:number|null;
 deltaFromPrevious:{meanMT:number;peakToPeakMT:number;peakToPeakPPM:number|null}|null;
}
export interface CylinderIdentity {
 schemeId:string;geometrySignature:string;sourceSignature:string;sourceCount:number;fieldKernelVersion:string;unitMM:number;remanenceT:number;
 region:CylinderRegion;algorithm:typeof CYLINDER_ALGORITHM;resolutions:CylinderResolution[];
}
export interface CylinderFieldReport extends CylinderIdentity {
 version:typeof CYLINDER_REPORT_VERSION;createdAt:string;quantity:"magnitude";units:{length:"mm";field:"mT";homogeneity:"ppm"};
 analysisSignature:string;center:{pointMM:Vec3;vectorMT:Vec3;magnitudeMT:number};levels:CylinderLevel[];
 classification:"sampling-and-integration-estimate";
}
const finite=(n:unknown):n is number=>typeof n==="number"&&Number.isFinite(n);
const vector=(a:unknown):a is Vec3=>Array.isArray(a)&&a.length===3&&a.every(finite);
export function validateCylinderRegion(region:CylinderRegion):CylinderRegion {
 if(!region||!finite(region.diameterMM)||region.diameterMM<=0||region.diameterMM>200||!finite(region.lengthMM)||region.lengthMM<=0||region.lengthMM>200||region.axis!=="Z"||!vector(region.centerMM)||region.centerMM.some(v=>v!==0))throw new Error("Cylinder must be centered at the origin, aligned with Z, with diameter and length in (0, 200] mm.");
 return {...region,centerMM:[0,0,0]};
}
export function validateCylinderResolution(resolution:CylinderResolution):CylinderResolution {
 if(!resolution||![resolution.radial,resolution.angular,resolution.axial].every(n=>Number.isInteger(n)&&n>0)||resolution.radial>64||resolution.angular>256||resolution.axial>160)throw new Error("Invalid cylinder resolution (maximum 64 × 256 × 160).");
 return {...resolution};
}
/** Conservative geometric proof for this bore-centred analysis, independent of sample spacing. */
export function validateCylinderAirRegion(sources:Source[],region:CylinderRegion,unitMM:number) {
 validateCylinderRegion(region);
 if(!sources.length||!finite(unitMM)||unitMM<=0)throw new Error("Invalid cylinder source geometry or unit scale.");
 for(const source of sources){
  if(!source||!vector(source.center)||!vector(source.u)||!vector(source.v)||!vector(source.n)||!finite(source.half)||source.half<=0||[source.u,source.v,source.n].some(axis=>Math.abs(Math.hypot(...axis)-1)>1e-9)||[[source.u,source.v],[source.u,source.n],[source.v,source.n]].some(([a,b])=>Math.abs(a.reduce((sum,v,i)=>sum+v*b[i],0))>1e-9))throw new Error("Invalid cuboid geometry in cylinder analysis.");
  // A cube is contained by its circumscribed sphere. At least one separation
  // condition must hold for the entire finite cylinder, not just sampled nodes.
  const sphere=source.half*Math.sqrt(3)*unitMM,radial=Math.hypot(source.center[0],source.center[2])*unitMM,axial=Math.abs(source.center[1])*unitMM;
  if(radial-sphere<=region.diameterMM/2&&axial-sphere<=region.lengthMM/2)throw new Error("Cannot establish complete cylinder air-domain coverage; a magnet bounding sphere overlaps the ROI.");
 }
}
export function cylinderSampleCounts(resolution:CylinderResolution) {
 const {radial:r,angular:t,axial:z}=validateCylinderResolution(resolution);
 const volume=r*t*z,boundary=t*(z+1)+2*r*t+z+1+1;
 return {volume,boundary,total:volume+boundary};
}
/** Every interior cell has identical volume: u=r²/R², theta and Z are uniform. */
export function cylinderSampleAt(index:number,region:CylinderRegion,resolution:CylinderResolution):CylinderSample {
 const {radial:nr,angular:nt,axial:nz}=resolution,{volume,boundary}=cylinderSampleCounts(resolution);
 if(!Number.isInteger(index)||index<0||index>=volume+boundary)throw new Error("Cylinder sample index is out of bounds.");
 const radius=region.diameterMM/2,length=region.lengthMM;
 const polar=(r:number,theta:number,z:number):Vec3=>[r*Math.cos(theta),r*Math.sin(theta),z];
 if(index<volume){const ri=index%nr,ti=Math.floor(index/nr)%nt,zi=Math.floor(index/(nr*nt));return {pointMM:polar(radius*Math.sqrt((ri+.5)/nr),2*Math.PI*(ti+.5)/nt,length*((zi+.5)/nz-.5)),domain:"volume"};}
 index-=volume;const side=nt*(nz+1);
 if(index<side){const ti=index%nt,zi=Math.floor(index/nt);return {pointMM:polar(radius,2*Math.PI*ti/nt,length*(zi/nz-.5)),domain:"sidewall"};}
 index-=side;const ends=2*nr*nt;
 if(index<ends){const ri=index%nr,ti=Math.floor(index/nr)%nt,sideIndex=Math.floor(index/(nr*nt));return {pointMM:polar(radius*Math.sqrt((ri+1)/nr),2*Math.PI*ti/nt,(sideIndex?1:-1)*length/2),domain:"endcap"};}
 index-=ends;
 if(index<nz+1)return {pointMM:[0,0,length*(index/nz-.5)],domain:"axis"};
 return {pointMM:[0,0,0],domain:"center"};
}
export function emptyCylinderPartial():CylinderPartial {return {count:0,mean:0,m2:0,boundaryCount:0,min:null,max:null};}
/** Surface/axis points contribute only to sampled extrema, never volume moments. */
export function addCylinderSample(partial:CylinderPartial,sample:CylinderSample,vectorMT:Vec3) {
 if(!vector(vectorMT)||!vector(sample.pointMM))throw new Error("Non-finite cylinder field sample.");
 const magnitudeMT=Math.hypot(...vectorMT),probe:CylinderProbe={...sample,pointMM:[...sample.pointMM],vectorMT:[...vectorMT],magnitudeMT};
 if(!finite(magnitudeMT))throw new Error("Non-finite cylinder field magnitude.");
 if(!partial.min||magnitudeMT<partial.min.magnitudeMT)partial.min=probe;
 if(!partial.max||magnitudeMT>partial.max.magnitudeMT)partial.max=probe;
 if(sample.domain==="volume"){partial.count++;const delta=magnitudeMT-partial.mean;partial.mean+=delta/partial.count;partial.m2+=delta*(magnitudeMT-partial.mean);}
 else partial.boundaryCount++;
}
export function mergeCylinderPartials(a:CylinderPartial,b:CylinderPartial):CylinderPartial {
 const merged:CylinderPartial={...a};
 if(b.count){if(!a.count){merged.count=b.count;merged.mean=b.mean;merged.m2=b.m2;}else{const n=a.count+b.count,d=b.mean-a.mean;merged.count=n;merged.mean=a.mean+d*b.count/n;merged.m2=a.m2+b.m2+d*d*a.count*b.count/n;}}
 merged.boundaryCount+=b.boundaryCount;
 if(b.min&&(!merged.min||b.min.magnitudeMT<merged.min.magnitudeMT))merged.min=b.min;
 if(b.max&&(!merged.max||b.max.magnitudeMT>merged.max.magnitudeMT))merged.max=b.max;
 return merged;
}
export function finishCylinderLevel(partial:CylinderPartial,resolution:CylinderResolution,previous?:CylinderLevel):CylinderLevel {
 const expected=cylinderSampleCounts(resolution);
 if(partial.count!==expected.volume||partial.boundaryCount!==expected.boundary||!partial.min||!partial.max||![partial.mean,partial.m2].every(finite))throw new Error("Incomplete or non-finite cylinder analysis; a partial ROI cannot be reported.");
 const stdMT=Math.sqrt(Math.max(0,partial.m2/partial.count)),peakToPeakMT=partial.max.magnitudeMT-partial.min.magnitudeMT,ref=Math.abs(partial.mean);
 const peakToPeakPPM=ref>1e-12?peakToPeakMT/ref*1e6:null;
 return {resolution:{...resolution},volumeSampleCount:partial.count,boundarySampleCount:partial.boundaryCount,meanMT:partial.mean,stdMT,stdPPM:ref>1e-12?stdMT/ref*1e6:null,min:partial.min,max:partial.max,peakToPeakMT,peakToPeakPPM,deltaFromPrevious:previous?{meanMT:partial.mean-previous.meanMT,peakToPeakMT:peakToPeakMT-previous.peakToPeakMT,peakToPeakPPM:peakToPeakPPM!==null&&previous.peakToPeakPPM!==null?peakToPeakPPM-previous.peakToPeakPPM:null}:null};
}
export function analyzeCylinderFunction(region:CylinderRegion,resolution:CylinderResolution,evaluate:(pointMM:Vec3)=>Vec3):CylinderLevel {
 validateCylinderRegion(region);validateCylinderResolution(resolution);const partial=emptyCylinderPartial();
 for(let i=0;i<cylinderSampleCounts(resolution).total;i++){const sample=cylinderSampleAt(i,region,resolution);addCylinderSample(partial,sample,evaluate(sample.pointMM));}
 return finishCylinderLevel(partial,resolution);
}
export async function cylinderAnalysisSignature(identity:CylinderIdentity):Promise<string> {
 validateCylinderRegion(identity.region);identity.resolutions.forEach(validateCylinderResolution);
 const {schemeId,geometrySignature,sourceSignature,sourceCount,fieldKernelVersion,unitMM,remanenceT,region,algorithm,resolutions}=identity;
 const bytes=new TextEncoder().encode(JSON.stringify({version:CYLINDER_REPORT_VERSION,schemeId,geometrySignature,sourceSignature,sourceCount,fieldKernelVersion,unitMM,remanenceT,region,algorithm,resolutions}));
 const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,"0")).join("");
}
export async function cylinderIdentity(inputs:{schemeId:string;geometrySignature:string;sources:Source[];unitMM:number;remanenceT:number;region:CylinderRegion;resolutions:readonly CylinderResolution[]}):Promise<CylinderIdentity> {
 if(!inputs.sources.length||!finite(inputs.unitMM)||inputs.unitMM<=0||!finite(inputs.remanenceT)||inputs.remanenceT<=0)throw new Error("Cylinder analysis requires positive physical units and magnetic sources.");
 validateCylinderAirRegion(inputs.sources,inputs.region,inputs.unitMM);
 return {schemeId:inputs.schemeId,geometrySignature:inputs.geometrySignature,sourceSignature:await sourceSignature(inputs.sources),sourceCount:inputs.sources.length,fieldKernelVersion:FIELD_KERNEL_VERSION,unitMM:inputs.unitMM,remanenceT:inputs.remanenceT,region:validateCylinderRegion(inputs.region),algorithm:CYLINDER_ALGORITHM,resolutions:inputs.resolutions.map(validateCylinderResolution)};
}
/** Browser-safe provenance and consistency checks; does not run magnetic calculations. */
export function validateCylinderReport(input:unknown,expected?:Partial<Pick<CylinderIdentity,"sourceSignature"|"schemeId"|"sourceCount"|"unitMM"|"remanenceT"|"geometrySignature">>):CylinderFieldReport {
 const r=input as CylinderFieldReport,close=(a:number,b:number)=>Math.abs(a-b)<=Math.max(1,Math.abs(a),Math.abs(b))*1e-10;
 if(!r||typeof r!=="object"||r.version!==CYLINDER_REPORT_VERSION||r.fieldKernelVersion!==FIELD_KERNEL_VERSION||r.algorithm!==CYLINDER_ALGORITHM||r.quantity!=="magnitude"||r.classification!=="sampling-and-integration-estimate"||r.units?.length!=="mm"||r.units?.field!=="mT"||r.units?.homogeneity!=="ppm"||!finite(r.unitMM)||r.unitMM<=0||!finite(r.remanenceT)||r.remanenceT<=0||!Number.isInteger(r.sourceCount)||r.sourceCount<=0||typeof r.schemeId!=="string"||!r.schemeId||typeof r.geometrySignature!=="string"||!r.geometrySignature||typeof r.sourceSignature!=="string"||!/^[a-f0-9]{64}$/.test(r.sourceSignature)||typeof r.analysisSignature!=="string"||!/^[a-f0-9]{64}$/.test(r.analysisSignature)||typeof r.createdAt!=="string"||!finite(Date.parse(r.createdAt)))throw new Error("Invalid or unsupported cylinder report.");
 validateCylinderRegion(r.region);
 if(!r.center||!vector(r.center.pointMM)||r.center.pointMM.some(v=>v!==0)||!vector(r.center.vectorMT)||!finite(r.center.magnitudeMT)||!close(r.center.magnitudeMT,Math.hypot(...r.center.vectorMT)))throw new Error("Invalid cylinder centre probe.");
 if(!Array.isArray(r.levels)||r.levels.length<1||r.levels.length>3||!Array.isArray(r.resolutions)||r.resolutions.length!==r.levels.length)throw new Error("Invalid cylinder report levels.");
 const probeOK=(p:CylinderProbe)=>p&&vector(p.pointMM)&&vector(p.vectorMT)&&finite(p.magnitudeMT)&&p.magnitudeMT>=0&&close(p.magnitudeMT,Math.hypot(...p.vectorMT))&&Math.hypot(p.pointMM[0],p.pointMM[1])<=r.region.diameterMM/2+1e-8&&Math.abs(p.pointMM[2])<=r.region.lengthMM/2+1e-8&&["volume","sidewall","endcap","axis","center"].includes(p.domain);
 r.levels.forEach((level,index)=>{
  const counts=cylinderSampleCounts(level.resolution),spec=validateCylinderResolution(r.resolutions[index]);
  if(spec.radial!==level.resolution.radial||spec.angular!==level.resolution.angular||spec.axial!==level.resolution.axial||counts.volume!==level.volumeSampleCount||counts.boundary!==level.boundarySampleCount||![level.meanMT,level.stdMT,level.peakToPeakMT].every(finite)||level.meanMT<0||level.stdMT<0||level.peakToPeakMT<0||!probeOK(level.min)||!probeOK(level.max)||level.min.magnitudeMT>level.max.magnitudeMT||level.meanMT<level.min.magnitudeMT-1e-9||level.meanMT>level.max.magnitudeMT+1e-9||!close(level.peakToPeakMT,level.max.magnitudeMT-level.min.magnitudeMT)||!(level.peakToPeakPPM===null||finite(level.peakToPeakPPM))||!(level.stdPPM===null||finite(level.stdPPM)))throw new Error("Inconsistent or incomplete cylinder report level.");
  const ref=Math.abs(level.meanMT);
  if(ref>1e-12?level.peakToPeakPPM===null||level.stdPPM===null||!close(level.peakToPeakPPM,level.peakToPeakMT/ref*1e6)||!close(level.stdPPM,level.stdMT/ref*1e6):level.peakToPeakPPM!==null||level.stdPPM!==null)throw new Error("Invalid cylinder ppm normalization.");
  if(index===0){if(level.deltaFromPrevious!==null)throw new Error("First cylinder level cannot have a refinement delta.");}
  else {const previous=r.levels[index-1],d=level.deltaFromPrevious;if(!d||!finite(d.meanMT)||!finite(d.peakToPeakMT)||!close(d.meanMT,level.meanMT-previous.meanMT)||!close(d.peakToPeakMT,level.peakToPeakMT-previous.peakToPeakMT)||(level.peakToPeakPPM!==null&&previous.peakToPeakPPM!==null?d.peakToPeakPPM===null||!finite(d.peakToPeakPPM)||!close(d.peakToPeakPPM,level.peakToPeakPPM-previous.peakToPeakPPM):d.peakToPeakPPM!==null))throw new Error("Invalid cylinder refinement delta.");}
 });
 if(expected&&(["sourceSignature","schemeId","sourceCount","unitMM","remanenceT","geometrySignature"] as const).some(key=>expected[key]!==undefined&&r[key]!==expected[key]))throw new Error("Cylinder report does not match the completed magnetic design.");
 return r;
}
