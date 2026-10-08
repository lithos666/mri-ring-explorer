import {DEFAULT_VOLUME,DEFAULT_PLANE,type LiveFieldResult} from "./live-field.ts";
export interface InitialFieldAsset{
 version:1;signature:string;count:number;generationSignature:string;
 result:Omit<LiveFieldResult,"plane">&{plane:Omit<LiveFieldResult["plane"],"values"|"mask">&{values:number[];mask:number[]}};
}
interface ExpectedInitialField{schemeId:string;signature:string;count:number;angle:number;generationSignature?:string;}
const finiteVector=(value:unknown):boolean=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
export function encodeInitialField(result:LiveFieldResult,signature:string,count:number,generationSignature:string):InitialFieldAsset{
 return {version:1,signature,count,generationSignature,result:{...result,plane:{...result.plane,values:Array.from(result.plane.values),mask:Array.from(result.plane.mask)}}};
}
export function decodeInitialField(raw:unknown,expected:ExpectedInitialField):LiveFieldResult{
 if(!raw||typeof raw!=="object")throw new Error("Invalid initial field asset.");
 const a=raw as InitialFieldAsset,r=a.result;
 if(a.version!==1||a.signature!==expected.signature||a.count!==expected.count||!a.generationSignature||(expected.generationSignature&&a.generationSignature!==expected.generationSignature)||!r||r.type!=="result"||r.schemeId!==expected.schemeId||r.revision!==0||r.changedCount!==0)throw new Error("Initial field does not match this configuration.");
 const plane=r.plane,volume=r.volume;
 if(!plane||!volume||volume.n!==DEFAULT_VOLUME.n||volume.bound!==DEFAULT_VOLUME.bound||volume.step!==2*volume.bound/(volume.n-1)||plane.n!==DEFAULT_PLANE.n||plane.bound!==DEFAULT_PLANE.bound||plane.step!==2*plane.bound/(plane.n-1)||Math.abs(plane.angle-expected.angle)>1e-12||!Number.isFinite(plane.angle))throw new Error("Initial field grid does not match.");
 if(!Array.isArray(plane.values)||plane.values.length!==plane.n**2*3||!plane.values.every(Number.isFinite)||!Array.isArray(plane.mask)||plane.mask.length!==plane.n**2||!plane.mask.every(v=>v===0||v===1))throw new Error("Invalid initial field grid.");
 if(!finiteVector(r.center)||!finiteVector(r.baselineCenter)||!Number.isFinite(r.referenceMagnitude)||r.referenceMagnitude<=0||!Number.isFinite(r.centerRatio)||(r.centerAngleDegrees!==null&&!Number.isFinite(r.centerAngleDegrees)))throw new Error("Invalid initial field metrics.");
 if(r.center.some((v,i)=>v!==r.baselineCenter[i])||Math.abs(r.centerRatio-1)>1e-12)throw new Error("Initial field is not the unedited configuration.");
 if(!Array.isArray(r.lines3D)||!r.lines3D.every(line=>Array.isArray(line)&&line.every(finiteVector))||!Array.isArray(r.profile)||!r.profile.length||!r.profile.every(p=>finiteVector(p.p)&&finiteVector(p.b)&&Number.isFinite(p.relative))||!Array.isArray(r.probes)||!r.quality)throw new Error("Invalid initial field traces.");
 const values=new Float32Array(plane.values);if(!values.every(Number.isFinite))throw new Error("Initial field values overflow.");
 return {...r,plane:{...plane,values,mask:new Uint8Array(plane.mask)}};
}
