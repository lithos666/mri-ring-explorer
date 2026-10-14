import assert from "node:assert/strict";
import {cuboidField,fieldAt,type Source,type Vec3} from "../lib/field.ts";

// Independent evaluation of the original charged-face double integral.
// No panel/asinh/atan implementation is duplicated here.
function gaussLegendre(count:number):{nodes:number[];weights:number[]}{
 const nodes=Array<number>(count),weights=Array<number>(count);
 for(let i=0;i<Math.ceil(count/2);i++){
  let x=Math.cos(Math.PI*(i+.75)/(count+.5)),derivative=0;
  for(let iteration=0;iteration<30;iteration++){
   let p0=1,p1=x;
   for(let k=2;k<=count;k++){const next=((2*k-1)*x*p1-(k-1)*p0)/k;p0=p1;p1=next;}
   derivative=count*(x*p1-p0)/(x*x-1);
   const next=x-p1/derivative;
   if(Math.abs(next-x)<2e-16){x=next;break;}x=next;
  }
  let p0=1,p1=x;
  for(let k=2;k<=count;k++){const next=((2*k-1)*x*p1-(k-1)*p0)/k;p0=p1;p1=next;}
  derivative=count*(x*p1-p0)/(x*x-1);
  const weight=2/((1-x*x)*derivative*derivative);
  nodes[i]=-x;nodes[count-1-i]=x;weights[i]=weights[count-1-i]=weight;
 }
 return {nodes,weights};
}
function quadrature(p:Vec3,source:Source,count=48):Vec3{
 const d=p.map((v,i)=>v-source.center[i]);
 const axes=[source.u,source.v,source.n];
 const local=axes.map(axis=>axis.reduce((sum,v,i)=>sum+v*d[i],0));
 const result:Vec3=[0,0,0],a=source.half,{nodes,weights}=gaussLegendre(count);
 for(const polarity of [-1,1])for(let i=0;i<count;i++)for(let j=0;j<count;j++){
  const vector=[local[0]-a*nodes[i],local[1]-a*nodes[j],local[2]-polarity*a];
  const factor=polarity*a*a*weights[i]*weights[j]/(4*Math.PI*Math.hypot(...vector)**3);
  for(let component=0;component<3;component++)result[component]+=vector[component]*factor;
 }
 return result.map((_,i)=>axes.reduce((sum,axis,component)=>sum+axis[i]*result[component],0)) as Vec3;
}
const transform=(point:Vec3,source:Source):Vec3=>source.center.map((c,i)=>c+source.u[i]*point[0]+source.v[i]*point[1]+source.n[i]*point[2]) as Vec3;
const near=(actual:Vec3,expected:Vec3,tolerance:number,label:string)=>actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<=tolerance,`${label}, component ${i}: ${value} vs ${expected[i]}`));
const angle=.63,c=Math.cos(angle),s=Math.sin(angle);
const frames:Source[]=[
 {center:[0,0,0],u:[1,0,0],v:[0,1,0],n:[0,0,1],half:1},
 {center:[.7,-1.1,.3],u:[c,s,0],v:[-s,c,0],n:[0,0,1],half:1},
 {center:[-.4,.6,1.7],u:[c,0,s],v:[s,0,-c],n:[0,1,0],half:1},
 {center:[-.4,.6,1.7],u:[c,0,s],v:[-s,0,c],n:[0,1,0],half:1},
];
const points:Vec3[]=[[2.4,.3,.4],[.6,-2.1,-.8],[.2,.6,2.8],[-1.9,.2,1],[.1,2.6,-1],[1.6,1.7,0],[.4,-.1,-3.2]];
let maxError=0;
for(const frame of frames)for(const point of points){
 const world=transform(point,frame),actual=cuboidField(world,frame),reference=quadrature(world,frame);
 const error=Math.max(...actual.map((value,i)=>Math.abs(value-reference[i])));maxError=Math.max(maxError,error);
 near(actual,reference,2e-12,"Independent two-face surface integral, including negative/coplanar z and orthogonal frames");
}
const cube=frames[0];
near(cuboidField([0,0,0],cube),[0,0,2/3],1e-14,"Cube center requires B=μ₀(H+M), not μ₀H");
const reversed={...cube,n:[0,0,-1] as Vec3};
for(const p of points)near(cuboidField(p,reversed),cuboidField(p,cube).map(v=>-v) as Vec3,1e-14,"Reversing magnetization reverses the physical field");
for(const face of [-1,1]){
 const epsilon=1e-8,inside=cuboidField([.2,.3,face*(1-epsilon)],cube),outside=cuboidField([.2,.3,face*(1+epsilon)],cube),onFace=cuboidField([.2,.3,face],cube);
 near(inside,outside,2e-8,"Normal B continuous across smooth polarized face");
 near(onFace,inside.map((v,i)=>(v+outside[i])/2) as Vec3,2e-12,"Symmetric face convention uses half the polarization correction");
}
// At a nonsingular air point, the scalar-potential field satisfies Maxwell
// equations. Finite-difference truncation is independently controlled by h.
const probe:Vec3=[2.3,.7,-1.8],h=1e-4,derivatives:Vec3[]=[];
for(let axis=0;axis<3;axis++){
 const plus=[...probe] as Vec3,minus=[...probe] as Vec3;plus[axis]+=h;minus[axis]-=h;
 const bPlus=cuboidField(plus,cube),bMinus=cuboidField(minus,cube);
 derivatives.push(bPlus.map((value,i)=>(value-bMinus[i])/(2*h)) as Vec3);
}
const divergence=derivatives[0][0]+derivatives[1][1]+derivatives[2][2];
const curl=[derivatives[1][2]-derivatives[2][1],derivatives[2][0]-derivatives[0][2],derivatives[0][1]-derivatives[1][0]];
assert.ok(Math.abs(divergence)<2e-9,`Divergence-free air field: ${divergence}`);
assert.ok(Math.hypot(...curl)<2e-9,`Curl-free air field: ${curl}`);
const mixture=frames.slice(1),worldProbe:Vec3=[4.2,3.1,-2.4];
const independentlySummed=mixture.reduce((sum,source)=>{const b=quadrature(worldProbe,source);return sum.map((value,i)=>value+b[i]) as Vec3;},[0,0,0] as Vec3);
near(fieldAt(worldProbe,mixture),independentlySummed,2e-12,"Complete array superposition after coordinate conversion");
console.log(`PASS field derivation: ${frames.length*points.length} independent Gauss-integral comparisons (max normalized error ${maxError}), both orthogonal frame orientations, two-face signs, cube-center and smooth-face correction, reversal, air Maxwell equations and vector superposition.`);
