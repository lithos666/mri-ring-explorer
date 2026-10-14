import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {MATLAB_JET,displayColorScale,colorLegendDecimals,scaledColormapColor,colormapGradient} from "../lib/transverse-display.ts";
import {decodeTransverseField} from "../lib/transverse-field.ts";
import {createInitialTransverseDisplayState,initialTransverseDetailLimits,transverseLimits,transverseMapValues,transverseProbeSample} from "../lib/transverse-display-state.ts";

// Authoritative reference: MATLAB R2022a's figure(2) after the original
// GenerateIORingHackathonBig_37mT.m command `colormap jet` (256 entries).
// This checks the independently exported LUT rather than rebuilding jet here.
assert.equal(MATLAB_JET.length,256);
assert.equal(createHash("sha256").update(JSON.stringify(MATLAB_JET)).digest("hex"),"2fdd05b71de2652817051ceeef30f786b7a10ac7bd489b53f4ac22edb80ba14f");
const z0=Object.freeze({min:37.343568936442715,max:37.35745534013443});
const wide=Object.freeze({min:32.25944892467525,max:43.867856709065265});
const local=displayColorScale(z0,wide,"local"),reference=displayColorScale(z0,wide,"reference");
assert.deepEqual([local.min,local.max,local.renderMin,local.renderMax],[z0.min,z0.max,z0.min,z0.max]);
assert.deepEqual([reference.min,reference.max],[wide.min,wide.max]);
assert.ok(local.span<.014&&reference.span>11.6);
assert.ok(colorLegendDecimals(local,"local")>=6,"Sub-0.014 mT differences must not disappear through legend rounding.");
assert.equal(colorLegendDecimals(reference,"reference"),3);
const normalized=displayColorScale({min:0,max:1},wide,"local");
assert.deepEqual(scaledColormapColor(-1,normalized,MATLAB_JET),[0,0,131]);
assert.deepEqual(scaledColormapColor(0,normalized,MATLAB_JET),[0,0,131]);
assert.deepEqual(scaledColormapColor(.5,normalized,MATLAB_JET),[131,255,124]);
assert.deepEqual(scaledColormapColor(1,normalized,MATLAB_JET),[128,0,0]);
assert.deepEqual(scaledColormapColor(2,normalized,MATLAB_JET),[128,0,0]);
const flat=displayColorScale({min:37.344,max:37.344},wide,"local");
assert.equal(flat.span,0);assert.equal(flat.constant,true);assert.equal(flat.nearConstant,true);
assert.equal(flat.min,37.344);assert.equal(flat.max,37.344);
assert.ok(flat.renderMax>flat.renderMin&&flat.renderMax-flat.renderMin<1e-10,"Constant-field rendering must not invent percentage-scale variation.");
assert.ok(scaledColormapColor(37.344,flat,MATLAB_JET).every(Number.isFinite));
const tiny=displayColorScale({min:37.344,max:37.344+Number.EPSILON*37.344},wide,"local");
assert.equal(tiny.nearConstant,true);assert.equal(tiny.constant,false);assert.ok(tiny.max>tiny.min);
assert.throws(()=>displayColorScale({min:2,max:1},wide,"local"),/Invalid/);
assert.throws(()=>displayColorScale({min:NaN,max:1},wide,"local"),/Invalid/);
assert.throws(()=>scaledColormapColor(0,normalized,[]),/required/);
assert.throws(()=>scaledColormapColor(0,normalized,[[0,2,0]]),/Invalid/);
assert.ok(colormapGradient(MATLAB_JET).startsWith("linear-gradient(90deg,rgb(0,0,131) 0.000000%"));
assert.ok(colormapGradient(MATLAB_JET).endsWith("rgb(128,0,0) 100.000000%)"));
const readMap=(name:string)=>{const buffer=readFileSync(new URL("../public/"+name,import.meta.url));return decodeTransverseField(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength) as ArrayBuffer);};
const wideInitial=readMap("transverse-field-initial-wide.bin"),fineInitial=readMap("transverse-field-initial-latest.bin");
const ui=createInitialTransverseDisplayState();
assert.equal(ui.diameter,150);assert.equal(ui.colorMode,"local");assert.equal(ui.quantity,"bz");assert.equal(wideInitial.grid.slicesMM[ui.selections.explore as number],0);assert.equal(ui.selections.matlab,"average");
for(const quantity of ["bz","magnitude"] as const){
 const initial=initialTransverseDetailLimits(wideInitial,quantity),fine=initialTransverseDetailLimits(fineInitial,quantity);
 assert.deepEqual(initial,fine,"Both ranges use exactly the same initial Z=0, D150 reference.");
 const reference=transverseLimits(wideInitial,quantity,200,"all"),values=transverseMapValues(wideInitial,4,quantity);
 const xy=Object.freeze({x:60,y:0}),probe150=transverseProbeSample(wideInitial,values,xy,150)!;
 for(const diameter of [20,100,150,200]){
  const point=transverseProbeSample(wideInitial,values,xy,diameter)!;
  assert.equal(point.value,probe150.value,"FOV never changes the field at a coordinate.");
  assert.equal(point.x,60);assert.equal(point.y,0);assert.equal(point.outsideROI,diameter<120);
  const scale=displayColorScale(initial,reference,"local");
  assert.deepEqual(scaledColormapColor(point.value,scale,MATLAB_JET),scaledColormapColor(probe150.value,displayColorScale(initial,reference,"local"),MATLAB_JET));
 }
 const z100=transverseMapValues(wideInitial,8,quantity);
 assert.notEqual(transverseProbeSample(wideInitial,z100,xy,150)!.value,probe150.value,"Changing Z updates the current coordinate's field reading.");
 assert.deepEqual(displayColorScale(initial,reference,"local"),displayColorScale(initial,reference,"local"),"Changing the selected plane does not change lock limits.");
 assert.equal(transverseProbeSample(wideInitial,values,{x:101,y:0},200),null);
 assert.equal(transverseProbeSample(wideInitial,values,{x:.5,y:0},200),null,"Probes persist actual grid coordinates, not arbitrary interpolated values.");
 const average=transverseMapValues(fineInitial,"average",quantity),fineCenter=transverseProbeSample(fineInitial,average,{x:0,y:0},20)!;
 assert.equal(fineCenter.value,quantity==="bz"?fineInitial.averageBz[20200]:fineInitial.averageMagnitude[20200]);
 const changed={...wideInitial,values:new Float64Array(wideInitial.values)},pixel=100*201+160;
 changed.values[(4*201**2+pixel)*3+2]+=.1;
 const changedProbe=transverseProbeSample(changed,transverseMapValues(changed,4,quantity),xy,150)!;
 assert.notEqual(changedProbe.value,probe150.value,"A new completed result updates the persistent probe, without storing stale scalar readings.");
 assert.deepEqual(initialTransverseDetailLimits(wideInitial,quantity),initial,"Changed result arrays cannot reset the initial reference.");
}
assert.equal(wideInitial.sourceSignature,fineInitial.sourceSignature);
assert.deepEqual([wideInitial.centerMT[2],fineInitial.centerMT[2]],[37.343568936442715,37.343568936442715]);
console.log("PASS transverse display: actual MATLAB LUT, locked Z0/D150 and full nine-plane/D200 references, fixed-point FOV invariance, updated completed-map probes, average probes, saturation and precision.");
