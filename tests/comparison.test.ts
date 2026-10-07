import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {sourcesFor,fieldAt,dot,cross,type Vec3} from "../lib/field.ts";
import {models} from "../lib/mri.ts";
import {layoutSources,layoutsFor,comparisonWindings,coilScales,imagingMetrics,parallelSNR,type CoilSize,type ComparisonData} from "../lib/comparison.ts";
import {wireField,toWorld} from "../lib/coils.ts";
const almost=(a:number,b:number,t=1e-8)=>assert.ok(Math.abs(a-b)<t);
for(const model of Object.values(models)){
 const sources=sourcesFor(model),magnets=model.magnets,layouts=layoutsFor(model),base=fieldAt([0,0,0],sources);
 assert.deepEqual(layoutSources("baseline",model),sources);
 for(const config of layouts){
  const items=layoutSources(config.id,model);assert.equal(items.length,magnets.length);
  for(const [i,s] of items.entries()){
   const original=sources[i],m=magnets[i];almost(dot(s.u,s.n),0);almost(dot(s.u,s.u),1);almost(dot(cross(s.u,s.n),s.v),1);almost(s.half,model.blockSize/2);
   almost(s.center[0],original.center[0]);almost(s.center[2],original.center[2]);almost(s.center[1],original.center[1]*(config.id==="spread"?1.15:1));
   if(config.id==="radial"&&m.direction==="axial"){almost(s.n[1],0);almost(s.n[0]*Math.cos(m.theta)+s.n[2]*Math.sin(m.theta),m.ring<=7?1:-1);}
   else if(config.id==="flip"&&m.direction==="axial")assert.deepEqual(s.n,[0,1,0]);else assert.deepEqual(s.n,original.n);
  }
 }
 const flipped=fieldAt([0,0,0],layoutSources("flip",model)),radial=fieldAt([0,0,0],sources.filter(s=>Math.abs(s.n[1])<.5));almost((base[1]+flipped[1])/2,radial[1]);
 const data=JSON.parse(fs.readFileSync("public/comparison-data-"+model.id+".json","utf8")) as ComparisonData;
 assert.equal(data.schemeId,model.id);assert.equal(data.count,magnets.length);
 const signature=createHash("sha256").update(JSON.stringify({sources:layouts.map(x=>layoutSources(x.id,model)),windings:["standard","compact","large"].map(x=>comparisonWindings(x as CoilSize,"gx"))})).digest("hex");assert.equal(data.signature,signature);
 for(const config of layouts){const result=data.layouts[config.id],items=layoutSources(config.id,model),center=fieldAt([0,0,0],items);almost(result.center,Math.hypot(...center));almost(result.centerRatio,Math.hypot(...center)/Math.hypot(...base));assert.equal(result.plane.length,961);assert.equal(result.profile.length,81);almost(result.plane[480],result.centerRatio);almost(result.profile[40],result.centerRatio);assert.ok(result.metrics.every(m=>m.samples===515&&Number.isFinite(m.spread)&&Number.isFinite(m.rms)));}almost(data.layouts.baseline.centerRatio,1);
}
for(const size of ["standard","compact","large"] as CoilSize[])for(const axis of ["gx","gy","gz"] as const){
 const p:Vec3=[0,0,0];p[{gx:0,gy:1,gz:2}[axis]]=.0001;
 const g=(s:CoilSize)=>wireField(toWorld(p),comparisonWindings(s,axis))[1]/.0001;almost(g(size)/g("standard"),1/coilScales[size]**2,1e-7);
}
const a=imagingMetrics(.05,10,200,10,50),b=imagingMetrics(.05,10,400,10,50);almost(a.frequencyMHz,2.128873946);almost(a.rampMS,.2);almost(a.shiftPixels,.1064436973);almost(b.pixelMM,a.pixelMM*2);almost(b.shiftPixels,a.shiftPixels/2);almost(b.relativeBandwidthSNR,1/Math.sqrt(2));almost(parallelSNR(4,1.2),1/2.4);
assert.throws(()=>imagingMetrics(.05,0,200,10,50));assert.throws(()=>imagingMetrics(Infinity,10,200,10,50));
console.log("PASS: both comparison datasets match their own 756/1736-source geometry; controlled variants, cancellation, curve centers, signature, gradient scaling and imaging formulas.");
