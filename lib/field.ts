import {models,type MRIModel,type Magnet,type SchemeId} from "./mri.ts";
export type Vec3=[number,number,number];
export const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function magnetBasis(m:Magnet):[Vec3,Vec3,Vec3]{
 const u:Vec3=(m.direction==="out"||m.direction==="in")?[-Math.sin(m.theta),0,Math.cos(m.theta)]:[Math.cos(m.theta),0,Math.sin(m.theta)];
 return [u,m.normal,cross(u,m.normal)];
}
export interface Source {center:Vec3;u:Vec3;v:Vec3;n:Vec3;half:number;}
const sourceCache=new WeakMap<MRIModel,Source[]>();
export function sourcesFor(model:MRIModel):Source[]{
 let items=sourceCache.get(model);if(items)return items;
 items=model.magnets.map(m=>{const [u,n,v]=magnetBasis(m);return {center:model.position(m),u,v,n,half:model.blockSize/2};});
 sourceCache.set(model,items);return items;
}
export const sources=sourcesFor(models.latest);
function local(p:Vec3,s:Source):Vec3{const d:Vec3=[p[0]-s.center[0],p[1]-s.center[1],p[2]-s.center[2]];return [dot(d,s.u),dot(d,s.v),dot(d,s.n)];}
export function nearMagnet(p:Vec3,margin=.12,items=sources){return items.some(s=>local(p,s).every(c=>Math.abs(c)<=s.half+margin));}
// Closed-form surface integral of (r-r')/|r-r'|^3 for a uniformly charged rectangle.
// This is an independently implemented magnetic scalar-potential model, not a MagTetris port.
// B is normalized by the common prescribed polarization J = mu0*M.
// Changes to this kernel also invalidate the precomputed field grids.
export const FIELD_KERNEL_VERSION="uniform-cube-poles-v2";
function asinhDifference(upper:number,lower:number,h:number){
 if(h>0)return Math.asinh(upper/h)-Math.asinh(lower/h);
 // Exact coplanar face extensions have finite log limits. Charged edges
 // straddling zero are singular in the ideal sharp-edged uniform model.
 if(upper>0&&lower>0)return Math.log(upper/lower);
 if(upper<0&&lower<0)return Math.log(lower/upper);
 return Infinity;
}
function panel(x:number,y:number,z:number,a:number):Vec3{
 const bx=asinhDifference(y+a,y-a,Math.hypot(x-a,z))-asinhDifference(y+a,y-a,Math.hypot(x+a,z));
 const by=asinhDifference(x+a,x-a,Math.hypot(y-a,z))-asinhDifference(x+a,x-a,Math.hypot(y+a,z));
 let bz=0;
 for(let i=0;i<2;i++)for(let j=0;j<2;j++){
  const u=x+(i?1:-1)*a,v=y+(j?1:-1)*a,r=Math.hypot(u,v,z),sign=(i===j?1:-1);
  if(z!==0)bz+=sign*Math.atan(u*v/(z*r));
 }
 return [bx,by,bz];
}
export function cuboidField(p:Vec3,s:Source):Vec3{
 const [x,y,z]=local(p,s),a=s.half;
 const plus=panel(x,y,z-a,a),minus=panel(x,y,z+a,a);
 const b:Vec3=plus.map((v,i)=>(v-minus[i])/(4*Math.PI)) as Vec3;
 // B = mu0(H+M) within a prescribed uniformly magnetized body.
 if(Math.abs(x)<a&&Math.abs(y)<a){
  if(Math.abs(z)<a)b[2]+=1;
  else if(Math.abs(z)===a)b[2]+=.5; // Smooth polarized face: continuous B, average H + half M.
 }
 return [s.u[0]*b[0]+s.v[0]*b[1]+s.n[0]*b[2],s.u[1]*b[0]+s.v[1]*b[1]+s.n[1]*b[2],s.u[2]*b[0]+s.v[2]*b[1]+s.n[2]*b[2]];
}
export function fieldAt(p:Vec3,items=sources):Vec3{
 const b:Vec3=[0,0,0];for(const s of items){const c=cuboidField(p,s);b[0]+=c[0];b[1]+=c[1];b[2]+=c[2];}return b;
}
export interface FieldData {
 model:string;schemeId:SchemeId;generationSignature:string;signature:string;bounds:number;step:number;count:number;
 center:Vec3;contributions:{radial:Vec3;axial:Vec3};
 lines:[number,number][][];vectors:{p:[number,number];b:[number,number]}[];
 profile:{y:number;relative:number}[];
}
