import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {MATLAB_JET,displayColorScale,colorLegendDecimals,scaledColormapColor,colormapGradient} from "../lib/transverse-display.ts";

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
console.log("PASS transverse display: actual MATLAB LUT fingerprint, physical extrema, local/reference precision, scaled colors, clipping and constant-field handling.");
