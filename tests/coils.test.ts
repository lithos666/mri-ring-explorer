import assert from "node:assert/strict";
import {gradientWindings,wireField,toWorld,toMRI,rfDirection,COIL_DIMENSIONS as D,type V3} from "../lib/coils.ts";
import {rings,BLOCK_SIZE,models} from "../lib/mri.ts";
import {comparisonWindings} from "../lib/comparison.ts";
const ws=gradientWindings(),norm=(v:number[])=>Math.hypot(...v);
const boreRadius=Math.min(...rings.flatMap(r=>r.radii))-BLOCK_SIZE/2;
assert.equal(ws.length,10);assert.equal(ws.filter(w=>w.axis==="gz").length,2);
for(const w of ws){
 assert.ok(norm(w.points[0].map((v,i)=>v-w.points.at(-1)![i]))<1e-10);
 for(const p of w.points){assert.ok(Math.abs(Math.hypot(p[0],p[2])-D[w.axis])<1e-10);assert.ok(Math.hypot(p[0],p[2])+D.wireRadius<boreRadius);}
}
assert.ok(D.rf+.2<D.gz-D.wireRadius);
for(const model of Object.values(models)){
 const bore=Math.min(...model.rings.flatMap(r=>r.radii))-model.blockSize/2;
 for(const size of ["standard","compact","large"] as const)for(const w of comparisonWindings(size,"gx",model))for(const p of w.points)assert.ok(Math.hypot(p[0],p[2])+D.wireRadius*model.coilScale*1.2<bore);
 assert.ok((D.rf+.2)*model.coilScale<bore);
}
const metrics=[];
for(const axis of ["gx","gy","gz"] as const){
 const subset=ws.filter(w=>w.axis===axis);assert.ok(norm(wireField([0,0,0],subset))<1e-12);
 const derivative:V3=[0,0,0];
 for(let k=0;k<3;k++){const p:V3=[0,0,0],m:V3=[0,0,0];p[k]=.005;m[k]=-.005;derivative[k]=(wireField(toWorld(p),subset)[1]-wireField(toWorld(m),subset)[1])/.01;}
 const j={gx:0,gy:1,gz:2}[axis];assert.ok(derivative[j]>0);
 for(let k=0;k<3;k++)if(k!==j)assert.ok(Math.abs(derivative[k])<derivative[j]*1e-6);
 metrics.push({axis,dBz:derivative});
}
const gz=ws.filter(w=>w.axis==="gz"),h=.005;
const deriv=(k:number)=>{const p:V3=[0,0,0],m:V3=[0,0,0];p[k]=h;m[k]=-h;const b=toMRI(wireField(toWorld(p),gz)),a=toMRI(wireField(toWorld(m),gz));return (b[k]-a[k])/(2*h);};
assert.ok(Math.abs(deriv(0)/deriv(2)+.5)<1e-4);assert.ok(Math.abs(deriv(1)/deriv(2)+.5)<1e-4);
for(let phase=0;phase<=360;phase+=15){const b=rfDirection(phase);assert.ok(Math.abs(norm(b)-1)<1e-12);assert.equal(b[1],0);}
assert.deepEqual(toMRI(toWorld([1,2,3])),[1,2,3]);
console.log(JSON.stringify({status:"PASS",checks:"10 closed reference loops; bore clearance; three independent signed Bz derivatives; zero center gradient field; Maxwell concomitant terms; transverse unit RF direction at all phases",metrics}));
