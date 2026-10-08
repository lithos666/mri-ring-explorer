import fs from "node:fs";
import {createHash} from "node:crypto";
import {fieldAt as fullField,nearMagnet as nearSources,sourcesFor,type Vec3,type FieldData} from "../lib/field.ts";
import {models} from "../lib/mri.ts";
const generationSignature=createHash("sha256").update(["scripts/generate-field.ts","lib/field.ts","lib/mri.ts","lib/matlab-geometry.ts"].map(p=>fs.readFileSync(p,"utf8")).join("\n")).digest("hex");
for(const model of Object.values(models)){
 const magnets=model.magnets,sources=sourcesFor(model),angle=model.angularOffset;
 const destination="public/field-data-"+model.id+".json",signature=createHash("sha256").update(JSON.stringify(sources)).digest("hex");
 try{const cached=JSON.parse(fs.readFileSync(destination,"utf8"));if(cached.generationSignature===generationSignature&&cached.signature===signature&&cached.schemeId===model.id&&cached.count===sources.length){console.log("Field cache verified",model.id,cached.count);continue;}}catch{}
 const toPlane=([x,y]:Vec3):Vec3=>[x*Math.cos(angle),y,x*Math.sin(angle)];
 const fieldAt=(p:Vec3,items=sources):Vec3=>{const b=fullField(toPlane(p),items);return [b[0]*Math.cos(angle)+b[2]*Math.sin(angle),b[1],-b[0]*Math.sin(angle)+b[2]*Math.cos(angle)];};
 const nearMagnet=(p:Vec3,margin=.12)=>nearSources(toPlane(p),margin,sources);
const bound=12,step=.2,n=121;
const grid:(Vec3|null)[]=Array.from({length:n*n},(_,i)=>{
 const p:Vec3=[-bound+(i%n)*step,-bound+Math.floor(i/n)*step,0];
 return nearMagnet(p)?null:fieldAt(p);
});
function sample(x:number,y:number):[number,number]|null{
 const fx=(x+bound)/step,fy=(y+bound)/step,ix=Math.floor(fx),iy=Math.floor(fy);
 if(ix<0||iy<0||ix>=n-1||iy>=n-1)return null;
 const q=[grid[iy*n+ix],grid[iy*n+ix+1],grid[(iy+1)*n+ix],grid[(iy+1)*n+ix+1]];
 if(q.some(v=>!v))return null;
 const dx=fx-ix,dy=fy-iy,w=[(1-dx)*(1-dy),dx*(1-dy),(1-dx)*dy,dx*dy];
 const b:[number,number]=[0,0];q.forEach((v,i)=>{b[0]+=v![0]*w[i];b[1]+=v![1]*w[i];});
 const length=Math.hypot(...b);return length<1e-8?null:[b[0]/length,b[1]/length];
}
function trace(seed:[number,number],sign:number){
 const points:[number,number][]=[seed];const h=.07*sign;
 for(let i=0;i<2200;i++){
  const [x,y]=points.at(-1)!;const k1=sample(x,y);if(!k1)break;
  const k2=sample(x+h*k1[0]/2,y+h*k1[1]/2);if(!k2)break;
  const k3=sample(x+h*k2[0]/2,y+h*k2[1]/2);if(!k3)break;
  const k4=sample(x+h*k3[0],y+h*k3[1]);if(!k4)break;
  const p:[number,number]=[x+h*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,y+h*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6];
  if(!sample(...p))break;points.push(p);
  if(i>80&&Math.hypot(p[0]-seed[0],p[1]-seed[1])<.08)break;
 }
 return points;
}
const seeds:[number,number][]=[...[-10.5,-9.3,-7.1,-5.2,-3.1,-2.3,-1.4,-.5,.5,1.4,2.3,3.1,5.2,7.1,9.3,10.5].map(x=>[x,0] as [number,number]),...[-8,-5,-2,2,5,8].flatMap(x=>[[x,10.6],[x,-10.6]] as [number,number][])];
const lines=seeds.map(seed=>[...trace(seed,-1).slice(1).reverse(),...trace(seed,1)]).filter(line=>line.length>15).map(line=>line.filter((_,i)=>i%2===0).map(p=>p.map(v=>+v.toFixed(4)) as [number,number]));
const center=fieldAt([0,0,0]),reference=Math.hypot(...center);
const vectors:FieldData["vectors"]=[];
for(let x=-10;x<=10;x+=2)for(let y=-10;y<=10;y+=2){if(nearMagnet([x,y,0],.6))continue;const b=sample(x,y);if(b)vectors.push({p:[x,y],b});}
const data:FieldData={model:"uniform-cuboid-surface-integral-v1",schemeId:model.id,generationSignature,signature,bounds:bound,step,count:sources.length,center,
 contributions:{radial:fieldAt([0,0,0],sources.filter((_,i)=>magnets[i].direction!=="axial")),axial:fieldAt([0,0,0],sources.filter((_,i)=>magnets[i].direction==="axial"))},lines,vectors,
 profile:Array.from({length:81},(_,i)=>{const y=-10+i*.25;return {y,relative:Math.hypot(...fieldAt([0,y,0]))/reference};})};
fs.writeFileSync("public/field-data-"+model.id+".json",JSON.stringify(data));
if(model.id==="latest")fs.writeFileSync("public/field-data.json",JSON.stringify(data));
console.log(JSON.stringify({count:data.count,center,contributions:data.contributions,lines:lines.length,points:lines.reduce((s,l)=>s+l.length,0),signature:data.signature}));
}
