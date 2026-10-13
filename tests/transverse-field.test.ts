import assert from "node:assert/strict";
import {models} from "../lib/mri.ts";
import {applyOverrides} from "../lib/design.ts";
import {fieldAt,sourcesFor,type Vec3,type Source,FIELD_KERNEL_VERSION} from "../lib/field.ts";
import {Cancelled,sourceSignature} from "../lib/live-field.ts";
import {devicePointToWorld,worldFieldToDevice,generateTransverseField,resultFromValues,roiMetrics,summarizeField,fovCurve,recommendFOV,encodeTransverseField,decodeTransverseField,TRANSVERSE_FIELD_VERSION,TRANSVERSE_DATA_VERSION,type TransverseFieldRequest,type TransverseFieldResult} from "../lib/transverse-field.ts";
const scheduler={cancelled:()=>false};
const close=(a:number,b:number,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);

// A proper rigid rotation preserves the magnitude and the direction of the physical +Z axis.
assert.deepEqual(devicePointToWorld(50,-25,75,25),[2,3,1]);
assert.deepEqual(worldFieldToDevice([2,3,4],1.43),[2860,-5720,4290]);
close(Math.hypot(...worldFieldToDevice([2,3,4],1.43)),Math.hypot(2,3,4)*1430);
assert.throws(()=>devicePointToWorld(1,2,3,0),/positive/);
const statistics=summarizeField([1,2,3]);
close(statistics.meanMT,2);close(statistics.stdMT,1);close(statistics.stdPPM!,500000);close(statistics.peakToPeakPPM!,1000000);
assert.equal(summarizeField([-1,1]).peakToPeakPPM,null);

for(const model of Object.values(models)){
 const original=sourcesFor(model),request:TransverseFieldRequest={type:"solve",revision:1,schemeId:model.id,current:original,unitMM:model.unitMM!,remanenceT:model.remanenceT,spec:{radiusMM:4,stepMM:2,slicesMM:[-2,-1,0,1,2]}};
 const baseline=await generateTransverseField(request,scheduler),pixels=baseline.grid.n**2;
 assert.equal(baseline.sourceSignature,await sourceSignature(original));
 close(baseline.centerMT[2],model.id==="latest"?37.34356893644353:32.26352645177672,1e-9);
 assert.ok(baseline.centerMT[2]>0);assert.ok(Math.hypot(baseline.centerMT[0],baseline.centerMT[1])<1e-9);
 for(let p=0;p<pixels;p++){
  const x=-4+p%5*2,y=-4+Math.floor(p/5)*2;
  if(x*x+y*y>16){assert.equal(baseline.mask[p],1);continue;}
  assert.equal(baseline.mask[p],0);let sumBz=0,sumMagnitude=0;
  for(let z=0;z<5;z++){
   // Independent coordinate expression and complete analytical source sum.
   const point:Vec3=[x/model.unitMM!,(z-2)/model.unitMM!,-y/model.unitMM!],b=fieldAt(point,original),physical=[b[0]*model.remanenceT*1000,-b[2]*model.remanenceT*1000,b[1]*model.remanenceT*1000],o=(z*pixels+p)*3;
   physical.forEach((v,k)=>close(baseline.values[o+k],v));sumBz+=physical[2]/5;sumMagnitude+=Math.hypot(...physical)/5;
  }
  close(baseline.averageBz[p],sumBz);close(baseline.averageMagnitude[p],sumMagnitude);
 }
 const roi=roiMetrics(baseline,8);assert.equal(roi.pixelCount,13);assert.equal(roi.volumeSampleCount,65);assert.equal(roi.coverageComplete,true);
 const selected=model.magnets.filter(m=>m.ring===7&&m.radial===1),edited=applyOverrides(model,Object.fromEntries(selected.map(m=>[m.id,"out"]))),current=sourcesFor(edited);
 const after=await generateTransverseField({...request,revision:2,current},scheduler,{result:baseline,sources:original});
 const full=await generateTransverseField({...request,revision:3,current},scheduler);
 after.values.forEach((v,k)=>close(v,full.values[k],2e-11));
 assert.notEqual(after.sourceSignature,baseline.sourceSignature);assert.deepEqual(after.mask,baseline.mask);
 const restored=await generateTransverseField({...request,revision:4},scheduler,{result:after,sources:current});
 restored.values.forEach((v,k)=>close(v,baseline.values[k],2e-11));
 // Input mutation after starting a solve cannot alter its completed snapshot.
 const copied=original.map(s=>({...s,center:[...s.center] as Vec3})),pending=generateTransverseField({...request,current:copied},scheduler);copied[0].center[0]+=10;
 const immutable=await pending;assert.equal(immutable.sourceSignature,baseline.sourceSignature);assert.deepEqual(immutable.values,baseline.values);
 const rebuilt=await resultFromValues(request,new Float64Array(baseline.values));assert.deepEqual(rebuilt.averageBz,baseline.averageBz);assert.deepEqual(rebuilt.mask,baseline.mask);
 const bytes=encodeTransverseField(baseline),roundTrip=decodeTransverseField(bytes.buffer as ArrayBuffer);assert.deepEqual(roundTrip.values,baseline.values);assert.deepEqual(roundTrip.averageBz,baseline.averageBz);assert.deepEqual(roundTrip.mask,baseline.mask);
 await assert.rejects(generateTransverseField(request,{cancelled:()=>true}),Cancelled);
 let cancel=false;await assert.rejects(generateTransverseField(request,{cancelled:()=>cancel,progress:()=>{cancel=true}}),Cancelled);
 assert.throws(()=>roiMetrics(baseline,9),/inside/);
 console.log(`PASS ${model.id}: physical XY rotation, positive Bz, every five-plane pixel vs complete analytical sum, exact 14/28-source delta, snapshot immutability, masks, Float64 binary and cancellation.`);
}

// The averaged Bz map can look uniform even while individual planes differ greatly.
const n=21,pixels=n*n,values=new Float64Array(5*pixels*3),mask=new Uint8Array(pixels),averageBz=new Float64Array(pixels),averageMagnitude=new Float64Array(pixels);
for(let p=0;p<pixels;p++){
 const x=-100+p%n*10,y=-100+Math.floor(p/n)*10,r2=x*x+y*y;if(r2>10000){mask[p]=1;continue;}
 for(let z=0;z<5;z++){const o=(z*pixels+p)*3;values[o+2]=10+(z-2)*.02+r2*.000001;averageBz[p]+=values[o+2]/5;averageMagnitude[p]+=Math.abs(values[o+2])/5;}
}
const synthetic:TransverseFieldResult={type:"result",version:TRANSVERSE_FIELD_VERSION,revision:1,schemeId:"synthetic",sourceSignature:"a".repeat(64),sourceCount:1,generationSignature:TRANSVERSE_DATA_VERSION,fieldKernelVersion:FIELD_KERNEL_VERSION,unitMM:25,remanenceT:1.43,grid:{radiusMM:100,stepMM:10,n,slicesMM:[-2,-1,0,1,2]},values,mask,averageBz,averageMagnitude,centerMT:[0,0,10]};
const curve=fovCurve(synthetic);
for(let i=1;i<curve.length;i++)assert.ok(curve[i].peakToPeakCenterReferencePPM!>=curve[i-1].peakToPeakCenterReferencePPM!);
const metrics=roiMetrics(synthetic,150);assert.ok(metrics.volumeMagnitude.peakToPeakPPM!>metrics.averageBz.peakToPeakPPM!);assert.equal(metrics.volumeSampleCount,metrics.pixelCount*5);
const threshold=curve[10].peakToPeakCenterReferencePPM!,valid=curve.filter(item=>item.peakToPeakCenterReferencePPM!<=threshold),recommendation=recommendFOV(synthetic,threshold);
assert.equal(recommendation.diameterMM,valid.at(-1)!.diameterMM);assert.equal(recommendFOV(synthetic,0).diameterMM,null);assert.equal(recommendFOV({...synthetic,centerMT:[0,0,0]},100000).diameterMM,null);
const masked={...synthetic,mask:new Uint8Array(mask)};masked.mask[Math.floor(pixels/2)]=2;assert.equal(roiMetrics(masked,150).coverageComplete,false);assert.equal(recommendFOV(masked,100000).diameterMM,null);
assert.throws(()=>recommendFOV(synthetic,-1),/non-negative/);
console.log("PASS sampled FOV: all-plane |B| differs from averaged Bz, fixed-center nested bound, user threshold, incomplete ROI and zero-reference rejection; no claim about unsampled volume or clinical suitability.");
