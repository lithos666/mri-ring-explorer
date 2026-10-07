import fs from "node:fs";
import {createHash} from "node:crypto";
import {fieldAt,type Vec3} from "../lib/field.ts";
import {wireField,toWorld} from "../lib/coils.ts";
import {layoutsFor,layoutSources as modelSources,roiMetric,comparisonWindings,spherePoints,type LayoutId,type CoilSize,type ComparisonData} from "../lib/comparison.ts";
import {models} from "../lib/mri.ts";
const generationSignature=createHash("sha256").update(["scripts/generate-comparison.ts","lib/comparison.ts","lib/field.ts","lib/mri.ts","lib/coils.ts"].map(p=>fs.readFileSync(p,"utf8")).join("\n")).digest("hex");
for(const model of Object.values(models)){
 const layouts=layoutsFor(model),layoutSources=(id:LayoutId)=>modelSources(id,model);
 const destination="public/comparison-data-"+model.id+".json";
 const signature=createHash("sha256").update(JSON.stringify({sources:layouts.map(x=>layoutSources(x.id)),windings:["standard","compact","large"].map(x=>comparisonWindings(x as CoilSize,"gx"))})).digest("hex");
 try{const cached=JSON.parse(fs.readFileSync(destination,"utf8"));if(cached.generationSignature===generationSignature&&cached.signature===signature&&cached.schemeId===model.id&&cached.count===model.magnets.length){console.log("Comparison cache verified",model.id,cached.count);continue;}}catch{}
 const angle=model.angularOffset,plane=(x:number,y:number):Vec3=>[x*Math.cos(angle),y,x*Math.sin(angle)];
const base=Math.hypot(...fieldAt([0,0,0],layoutSources("baseline")));
const data:ComparisonData={model:"equal-magnetization-cuboids-and-filament-gradients-v1",schemeId:model.id,count:model.magnets.length,generationSignature,signature:"",layouts:{} as ComparisonData["layouts"],gradients:{} as ComparisonData["gradients"],planeSize:31,planeBound:3,profileBound:4,gradientRadius:1.5};
for(const config of layouts){
 const items=layoutSources(config.id),c=fieldAt([0,0,0],items);
 data.layouts[config.id]={center:Math.hypot(...c),centerRatio:Math.hypot(...c)/base,direction:Math.sign(c[1]),metrics:[.75,1.5,2.25].map(r=>roiMetric(items,r)),
 profile:Array.from({length:81},(_,i)=>Math.hypot(...fieldAt([0,-4+i*.1,0],items))/base),
 plane:Array.from({length:31*31},(_,i)=>Math.hypot(...fieldAt(plane(-3+i%31*.2,-3+Math.floor(i/31)*.2),items))/base)};
 console.log(config.id,JSON.stringify({centerRatio:data.layouts[config.id].centerRatio,metrics:data.layouts[config.id].metrics}));
}
for(const size of ["standard","compact","large"] as CoilSize[]){
 data.gradients[size]={} as ComparisonData["gradients"][CoilSize];
 for(const axis of ["gx","gy","gz"] as const){
  const items=comparisonWindings(size,axis),idx={gx:0,gy:1,gz:2}[axis],v:Vec3=[0,0,0];v[idx]=.001;
  const neg=v.map(x=>-x) as Vec3;
  const derivative=(ws:typeof items)=>(wireField(toWorld(v),ws)[1]-wireField(toWorld(neg),ws)[1])/.002;
  const g=derivative(items),ref=derivative(comparisonWindings("standard",axis));
  const pts=spherePoints(data.gradientRadius);
  const error=Math.max(...pts.map(p=>Math.abs(wireField(toWorld(p),items)[1]-g*p[idx])))/(Math.abs(g)*data.gradientRadius)*100;
  data.gradients[size][axis]={efficiency:g,relativeEfficiency:g/ref,error,samples:pts.length,profile:Array.from({length:61},(_,i)=>{const p:Vec3=[0,0,0];p[idx]=-1.5+i*.05;return wireField(toWorld(p),items)[1]/ref;})};
 }
}
data.signature=createHash("sha256").update(JSON.stringify({sources:layouts.map(x=>layoutSources(x.id)),windings:["standard","compact","large"].map(x=>comparisonWindings(x as CoilSize,"gx"))})).digest("hex");
fs.writeFileSync("public/comparison-data-"+model.id+".json",JSON.stringify(data));
if(model.id==="latest")fs.writeFileSync("public/comparison-data.json",JSON.stringify(data));
console.log("Comparison data ready",data.signature);
}
