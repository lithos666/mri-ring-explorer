import * as THREE from "three";
import {gradientWindings,coilColors,COIL_DIMENSIONS as D,rfDirection,type GradientAxis,type SystemLayers} from "@/lib/coils";
export function createCoilGeometry(scale=1){
 const root=new THREE.Group(),gradients=new THREE.Group(),rf=new THREE.Group(),orientation=new THREE.Group();root.add(gradients,rf,orientation);root.scale.setScalar(scale);
 const geoms:THREE.BufferGeometry[]=[],mats:THREE.Material[]=[];
 const channels:Record<string,THREE.Group>={};for(const name of ["gx","gy","gz"]){channels[name]=new THREE.Group();gradients.add(channels[name]);}
 function material(color:string){const m=new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.34,emissive:color,emissiveIntensity:.25});mats.push(m);return m;}
 const gm={gx:material(coilColors.gx),gy:material(coilColors.gy),gz:material(coilColors.gz)},rm=material(coilColors.rf),cap=material("#f4dcff");
 function tube(points:THREE.Vector3[],mat:THREE.Material,parent:THREE.Group,r=.045){
  const curve=new THREE.CurvePath<THREE.Vector3>();for(let i=0;i<points.length-1;i++)curve.add(new THREE.LineCurve3(points[i],points[i+1]));
  const g=new THREE.TubeGeometry(curve,Math.max(24,points.length*2),r,6,false);geoms.push(g);const mesh=new THREE.Mesh(g,mat);parent.add(mesh);
 }
 for(const w of gradientWindings()){
  const pts=w.points.map(p=>new THREE.Vector3(...p));tube(pts,gm[w.axis],channels[w.axis]);
  // Arrows follow the nominal positive-channel loop current, not the local B field.
  for(const t of [.16,.66]){const k=Math.floor((pts.length-2)*t),dir=pts[k+1].clone().sub(pts[k]).normalize().multiplyScalar(w.current);
   const a=new THREE.ArrowHelper(dir,pts[k],.38,coilColors[w.axis],.17,.12);channels[w.axis].add(a);
  }
 }
 for(const y of [-D.rfHalfLength,D.rfHalfLength]){
  tube(Array.from({length:129},(_,i)=>new THREE.Vector3(D.rf*Math.cos(i/128*Math.PI*2),y,D.rf*Math.sin(i/128*Math.PI*2))),rm,rf,.055);
 }
 for(let i=0;i<D.rungs;i++){
  const t=i/D.rungs*Math.PI*2,x=D.rf*Math.cos(t),z=D.rf*Math.sin(t);
  tube([new THREE.Vector3(x,-D.rfHalfLength,z),new THREE.Vector3(x,-.13,z)],rm,rf,.05);
  tube([new THREE.Vector3(x,.13,z),new THREE.Vector3(x,D.rfHalfLength,z)],rm,rf,.05);
  for(const y of [-.13,.13]){
   const g=new THREE.BoxGeometry(.24,.035,.12);geoms.push(g);const plate=new THREE.Mesh(g,cap);plate.position.set(x,y,z);plate.rotation.y=-t+Math.PI/2;rf.add(plate);
  }
 }
 const b0=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1.9,0),4.1,"#b9d3db",.28,.17);orientation.add(b0);
 const b1=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,0),1.85,coilColors.rf,.29,.19);rf.add(b1);
 const planeMat=new THREE.LineDashedMaterial({color:coilColors.rf,dashSize:.10,gapSize:.12,transparent:true,opacity:.6});mats.push(planeMat);
 const circle=new THREE.BufferGeometry().setFromPoints(Array.from({length:97},(_,i)=>new THREE.Vector3(1.85*Math.cos(i/96*Math.PI*2),0,1.85*Math.sin(i/96*Math.PI*2))));geoms.push(circle);
 const plane=new THREE.Line(circle,planeMat);plane.computeLineDistances();rf.add(plane);
 const axisColors=["#c2d5de","#9daeba"];
 for(const [dir,color] of [[new THREE.Vector3(1,0,0),axisColors[0]],[new THREE.Vector3(0,0,-1),axisColors[1]]] as const){
  const a=new THREE.ArrowHelper(dir,new THREE.Vector3(0,-4.9,0),1.5,color,.18,.12);orientation.add(a);
 }
 return {root,update(layers:SystemLayers,axis:GradientAxis,phase:number,active:boolean){
  root.visible=active&&(layers.gradient||layers.rf);gradients.visible=layers.gradient;rf.visible=layers.rf;
  for(const name of ["gx","gy","gz"])channels[name].visible=axis==="all"||axis===name;
  b1.setDirection(new THREE.Vector3(...rfDirection(phase)));
 },dispose(){
  root.traverse(o=>{if(o instanceof THREE.ArrowHelper){o.line.geometry.dispose();o.cone.geometry.dispose();for(const material of [o.line.material,o.cone.material]){if(Array.isArray(material))material.forEach(m=>m.dispose());else material.dispose();}}});
  geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());root.clear();
 }};
}
