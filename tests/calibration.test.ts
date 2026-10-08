import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {models,type MRIModel} from "../lib/mri.ts";
import {fieldAt,sourcesFor,toMillitesla,type Vec3} from "../lib/field.ts";
import {MATLAB_GEOMETRY} from "../lib/matlab-geometry.ts";

// Independent cuboid implementation and direct MATLAB declaration readout.
// These are predictions for prescribed J≈Br, not measured apparatus fields.
const reference={original:32.26352645177672,latest:37.34356893644353};
for(const model of Object.values(models)){
 const input=MATLAB_GEOMETRY[model.id];
 assert.equal(createHash("sha256").update(fs.readFileSync(input.source)).digest("hex"),input.sourceSha256);
 const sources=sourcesFor(model),center=fieldAt([0,0,0],sources);
 const mT=toMillitesla(center,model);
 assert.ok(Math.abs(mT[1]-reference[model.id])<1e-7);
 assert.ok(Math.hypot(mT[0],mT[2])<1e-9);
 const initial=JSON.parse(fs.readFileSync(`public/live-field-initial-${model.id}.json`,"utf8"));
 assert.deepEqual(initial.result.center,center);
 const doubled={...model,remanenceT:2*model.remanenceT} as MRIModel;
 assert.deepEqual(toMillitesla(center,doubled),mT.map(v=>2*v));
 const reversed=sources.map(s=>({...s,n:s.n.map(v=>-v) as Vec3,v:s.v.map(v=>-v) as Vec3}));
 const opposite=toMillitesla(fieldAt([0,0,0],reversed),model);
 opposite.forEach((v,i)=>assert.ok(Math.abs(v+mT[i])<1e-9));
 console.log(`PASS ${model.id}: ${mT[1].toFixed(9)} mT; independent reference, initial cache, Br scaling and polarity reversal.`);
}
