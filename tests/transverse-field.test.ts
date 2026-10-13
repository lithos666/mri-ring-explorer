import assert from "node:assert/strict";
import {models} from "../lib/mri.ts";
import {applyOverrides} from "../lib/design.ts";
import {fieldAt,sourcesFor,type Vec3,type Source,FIELD_KERNEL_VERSION} from "../lib/field.ts";
import {Cancelled,sourceSignature} from "../lib/live-field.ts";
import {devicePointToWorld,worldFieldToDevice,generateTransverseField,resultFromValues,roiMetrics,summarizeField,fovCurve,recommendFOV,encodeTransverseField,decodeTransverseField,TRANSVERSE_FIELD_VERSION,TRANSVERSE_DATA_VERSION,type TransverseFieldRequest,type TransverseFieldResult} from "../lib/transverse-field.ts";
import {TRANSVERSE_RANGES} from "../lib/transverse-ranges.ts";
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

// The exploratory range is nine independently solved planes. Its center
// reference is still the actual device origin, not the first/averaged plane.
const wideSlices=[-100,-75,-50,-25,0,25,50,75,100];
assert.deepEqual(TRANSVERSE_RANGES.explore.grid.slicesMM,wideSlices);
assert.equal(TRANSVERSE_RANGES.explore.assetURL,"/transverse-field-initial-wide.bin");
assert.deepEqual(TRANSVERSE_RANGES.matlab.grid.slicesMM,[-2,-1,0,1,2]);
for(const model of Object.values(models)){
 const original=sourcesFor(model),request:TransverseFieldRequest={type:"solve",revision:11,schemeId:model.id,current:original,unitMM:model.unitMM!,remanenceT:model.remanenceT,spec:{radiusMM:4,stepMM:4,slicesMM:wideSlices},generationSignature:TRANSVERSE_RANGES.explore.generationSignature};
 const baseline=await generateTransverseField(request,scheduler),pixels=baseline.grid.n**2,centerPixel=Math.floor(pixels/2);
 assert.deepEqual(baseline.grid.slicesMM,wideSlices);
 assert.equal(baseline.generationSignature,TRANSVERSE_RANGES.explore.generationSignature);
 const centerReference=worldFieldToDevice(fieldAt([0,0,0],original),model.remanenceT);
 centerReference.forEach((value,k)=>close(baseline.centerMT[k],value));
 centerReference.forEach((value,k)=>close(baseline.values[(4*pixels+centerPixel)*3+k],value));
 assert.notEqual(baseline.values[centerPixel*3+2],baseline.centerMT[2],"Z=-100 must not replace the true Z=0 reference");
 for(let p=0;p<pixels;p++){
  const x=-4+p%3*4,y=-4+Math.floor(p/3)*4;
  if(x*x+y*y>16){assert.equal(baseline.mask[p],1);continue;}
  assert.equal(baseline.mask[p],0);
  for(let slice=0;slice<wideSlices.length;slice++){
   const b=fieldAt([x/model.unitMM!,wideSlices[slice]/model.unitMM!,-y/model.unitMM!],original),physical=[b[0]*model.remanenceT*1000,-b[2]*model.remanenceT*1000,b[1]*model.remanenceT*1000],offset=(slice*pixels+p)*3;
   physical.forEach((value,k)=>close(baseline.values[offset+k],value));
   const opposite=((wideSlices.length-1-slice)*pixels+p)*3;
   // Only the initial IO-symmetric template has this parity: transverse B
   // reverses while Bz and |B| agree at +/-Z. Editing may break the symmetry.
   close(baseline.values[offset+2],baseline.values[opposite+2],2e-9);
   close(Math.hypot(...baseline.values.subarray(offset,offset+3)),Math.hypot(...baseline.values.subarray(opposite,opposite+3)),2e-9);
  }
 }
 const roi=roiMetrics(baseline,8),allMagnitudes:number[]=[];
 for(let p=0;p<pixels;p++)if(!baseline.mask[p])for(let slice=0;slice<wideSlices.length;slice++){
  const offset=(slice*pixels+p)*3;allMagnitudes.push(Math.hypot(...baseline.values.subarray(offset,offset+3)));
 }
 assert.equal(roi.volumeSampleCount,roi.pixelCount*9);
 const independentRaw=summarizeField(allMagnitudes);
 close(roi.volumeMagnitude.meanMT,independentRaw.meanMT);
 close(roi.peakToPeakCenterReferencePPM!,(Math.max(...allMagnitudes)-Math.min(...allMagnitudes))/Math.hypot(...centerReference)*1e6,1e-7);
 assert.ok(roi.volumeMagnitude.peakToPeakPPM!>roi.averageBz.peakToPeakPPM!,"Averaging wide planes must not hide the raw-nine-plane FOV variation");
 const edits=model.magnets.filter(m=>m.ring===7&&m.radial===1),edited=applyOverrides(model,Object.fromEntries(edits.map(m=>[m.id,"axialUp"]))),current=sourcesFor(edited);
 const incremental=await generateTransverseField({...request,revision:12,current},scheduler,{result:baseline,sources:original}),full=await generateTransverseField({...request,revision:13,current},scheduler);
 assert.notEqual(incremental.sourceSignature,baseline.sourceSignature);
 incremental.values.forEach((value,k)=>close(value,full.values[k],2e-10));assert.deepEqual(incremental.mask,full.mask);
 const restored=await generateTransverseField({...request,revision:14},scheduler,{result:incremental,sources:current});
 restored.values.forEach((value,k)=>close(value,baseline.values[k],2e-10));
 const bytes=encodeTransverseField(baseline),roundTrip=decodeTransverseField(bytes.buffer as ArrayBuffer);assert.deepEqual(roundTrip.grid.slicesMM,wideSlices);assert.deepEqual(roundTrip.values,baseline.values);
 console.log(`PASS ${model.id} wide range: all nine planes vs full sum, actual Z=0 reference, IO parity, raw-nine-plane FOV statistics, edit differences, reset and binary plane identity.`);
}

// Changing the plane range changes the material mask as well as the payload.
// A magnet intersecting only Z=25 must not borrow the narrow-range air mask.
const displacedSource:Source={center:[0,25,0],u:[1,0,0],v:[0,0,1],n:[0,1,0],half:.25};
const displacedRequest:TransverseFieldRequest={type:"solve",revision:20,schemeId:"mask-test",current:[displacedSource],unitMM:1,remanenceT:1,spec:{radiusMM:1,stepMM:1,slicesMM:[-2,-1,0,1,2]}};
const fineMask=await generateTransverseField(displacedRequest,scheduler);
const wideMask=await generateTransverseField({...displacedRequest,revision:21,spec:{radiusMM:1,stepMM:1,slicesMM:wideSlices}},scheduler,{result:fineMask,sources:[displacedSource]});
assert.equal(fineMask.mask[4],0);assert.equal(wideMask.mask[4],2);assert.equal(roiMetrics(wideMask,2).coverageComplete,false);
console.log("PASS plane-range isolation: wide material mask is recomputed instead of reusing the five-plane cache.");

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
assert.equal(summarizeField([-1e-14,1e-14]).stdPPM,null);
assert.equal(recommendFOV({...synthetic,centerMT:[0,0,1e-14]},100000).diameterMM,null);
console.log("PASS sampled FOV: all-plane |B| differs from averaged Bz, fixed-center nested bound, user threshold, incomplete ROI and zero-reference rejection; no claim about unsampled volume or clinical suitability.");
