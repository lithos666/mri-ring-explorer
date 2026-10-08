import assert from "node:assert/strict";
import {cuboidField,fieldAt,sourcesFor,nearMagnet,type FieldData,magnetBasis,dot,cross,type Source,type Vec3} from "../lib/field.ts";
import {models} from "../lib/mri.ts";
import fs from "node:fs";
import {createHash} from "node:crypto";
const near=(a:number,b:number,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const cube:Source={center:[0,0,0],u:[1,0,0],v:[0,1,0],n:[0,0,1],half:.4};
near(cuboidField([0,0,0],cube)[2],2/3);
assert.ok(cuboidField([0,0,2],cube)[2]>0);
assert.ok(cuboidField([2,0,0],cube)[2]<0);
// Independent solid-angle limit: B is continuous at the interior of a pole face.
const poleField=.5-Math.atan(1/(2*Math.sqrt(6)))/Math.PI;
for(const normal of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]] as Vec3[]){
 const u:Vec3=Math.abs(normal[0])===1?[0,1,0]:[1,0,0],v=cross(normal,u);
 const source:Source={...cube,u,v,n:normal};
 for(const side of [-1,1])for(const offset of [0,-1e-16,1e-16,-1e-12,1e-12,-1e-8,1e-8]){
  const p=normal.map(value=>value*(side*.4+offset)) as Vec3,b=cuboidField(p,source);
  b.forEach((value,k)=>near(value,normal[k]*poleField,1e-7));
 }
}
// Independent midpoint surface quadrature, off symmetry axes.
function quadrature(p:Vec3):Vec3{
 const b:Vec3=[0,0,0],n=400,h=.8/n;
 for(const face of [-1,1])for(let i=0;i<n;i++)for(let j=0;j<n;j++){
 const r:Vec3=[p[0]-(-.4+(i+.5)*h),p[1]-(-.4+(j+.5)*h),p[2]-face*.4];
 const f=face*h*h/(4*Math.PI*Math.hypot(...r)**3);for(let k=0;k<3;k++)b[k]+=r[k]*f;
 }return b;
}
for(const p of [[1.1,.7,.8],[-.9,1.2,-.6],[.15,.11,1.3],[.4,1.1,.4],[1.1,.4,-.4]] as Vec3[]){
 const a=cuboidField(p,cube),b=quadrature(p);
 a.forEach((v,i)=>near(v,b[i],2e-7));
}
const far=cuboidField([0,0,30],cube)[2],dipole=2*.8**3/(4*Math.PI*30**3);assert.ok(Math.abs(far/dipole-1)<1e-5);

for(const model of Object.values(models)){
 const sources=sourcesFor(model),magnets=model.magnets;
 for(const m of magnets){const [u,n,v]=magnetBasis(m);near(dot(u,n),0);near(dot(v,n),0);near(dot(u,u),1);cross(u,n).forEach((x,i)=>near(x,v[i]));}
 const p:Vec3=[1.1,.8,.2],angle=Math.PI*2/model.repeats;
 const rotate=(v:Vec3):Vec3=>[v[0]*Math.cos(angle)-v[2]*Math.sin(angle),v[1],v[0]*Math.sin(angle)+v[2]*Math.cos(angle)];
 const a=fieldAt(rotate(p),sources),b=rotate(fieldAt(p,sources));a.forEach((x,i)=>near(x,b[i]));
 const center=fieldAt([0,0,0],sources);near(center[0],0);near(center[2],0);assert.ok(center[1]>0);
 const h=1e-3,jac:number[][]=[];
 for(let k=0;k<3;k++){const plus=[...p] as Vec3,minus=[...p] as Vec3;plus[k]+=h;minus[k]-=h;const bp=fieldAt(plus,sources),bm=fieldAt(minus,sources);jac.push(bp.map((v,i)=>(v-bm[i])/(2*h)));}
 near(jac[0][0]+jac[1][1]+jac[2][2],0,1e-8);
 near(jac[0][1]-jac[1][0],0,1e-8);near(jac[1][2]-jac[2][1],0,1e-8);near(jac[2][0]-jac[0][2],0,1e-8);
 const data=JSON.parse(fs.readFileSync("public/field-data-"+model.id+".json","utf8")) as FieldData;
 assert.equal(data.schemeId,model.id);assert.equal(data.count,magnets.length);
 assert.equal(data.signature,createHash("sha256").update(JSON.stringify(sources)).digest("hex"));
 let minimumAlignment=1,checked=0;
 for(const line of data.lines)for(let i=2;i<line.length-2;i+=7){
  const x=line[i][0],y=line[i][1],theta=model.angularOffset,point:Vec3=[x*Math.cos(theta),y,x*Math.sin(theta)];
  assert.ok(!nearMagnet(point,0,sources));
  const worldB=fieldAt(point,sources),field=[worldB[0]*Math.cos(theta)+worldB[2]*Math.sin(theta),worldB[1]];
  const t=[line[i+1][0]-line[i-1][0],line[i+1][1]-line[i-1][1]];
  const alignment=dot([field[0],field[1],0],[t[0],t[1],0])/(Math.hypot(...field)*Math.hypot(...t));
  minimumAlignment=Math.min(minimumAlignment,alignment);checked++;
 }
 assert.ok(minimumAlignment>.96,"Traced arrows must follow exact B in the selected-column plane");
 console.log(JSON.stringify({scheme:model.id,fieldSignature:"PASS",sourceCount:sources.length,traceSamples:checked,minimumAlignment}));
}
console.log("PASS: pole-face continuity and six rotated normals, coplanar log limits, independent surface quadrature, dipole limit, source-free Maxwell checks, rotational covariance and rotated field planes.");
