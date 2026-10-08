"use client";
import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {layoutSources,comparisonWindings,type LayoutId,type CoilSize,type RFDesign} from "@/lib/comparison";
import {coilColors} from "@/lib/coils";
import {useBaselineMRIModel as useMRIModel} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
export type CompareTopic="magnet"|"gradient"|"rf";
export default function ComparisonScene({topic,layout,size,axis,rf,roi}:{topic:CompareTopic;layout:LayoutId;size:CoilSize;axis:"gx"|"gy"|"gz";rf:RFDesign;roi:number}){
 const {t,language}=useLanguage();
 const model=useMRIModel(),BLOCK_SIZE=model.blockSize;
 const host=useRef<HTMLDivElement>(null),[error,setError]=useState(false);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}catch{setError(true);return;}
  setError(false);renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setClearColor(0xffffff,0);el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("role","img");renderer.domElement.setAttribute("aria-label",t("当前对照方案三维结构，可拖动旋转","3D structure of the current comparison design. Drag to rotate."));
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,200),controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=100;
  scene.add(new THREE.HemisphereLight(0xffffff,0xbac0c7,2));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(8,12,10);scene.add(light);
  const root=new THREE.Group();scene.add(root);
  const geoms:THREE.BufferGeometry[]=[],mats:THREE.Material[]=[];
  function material(color:string,opacity=1){const m=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.2,transparent:opacity<1,opacity,depthWrite:opacity===1});mats.push(m);return m;}
  function path(points:THREE.Vector3[],color:string,r=.045){const c=new THREE.CurvePath<THREE.Vector3>();for(let i=1;i<points.length;i++)c.add(new THREE.LineCurve3(points[i-1],points[i]));
   const g=new THREE.TubeGeometry(c,Math.max(32,points.length*2),r,6,false);geoms.push(g);root.add(new THREE.Mesh(g,material(color)));
  }
  function arrow(dir:THREE.Vector3,p:THREE.Vector3,len:number,color:string){root.add(new THREE.ArrowHelper(dir,p,len,color,.25,.13));}
  if(topic==="magnet"){
   const items=layoutSources(layout,model),g=new THREE.BoxGeometry(BLOCK_SIZE*.96,BLOCK_SIZE*.98,BLOCK_SIZE*.96),mat=material("#73969d",.38),mesh=new THREE.InstancedMesh(g,mat,items.length);geoms.push(g);root.add(mesh);
   const poleThickness=BLOCK_SIZE*.5,poleOffset=(BLOCK_SIZE-poleThickness)/2;
   const poleG=new THREE.BoxGeometry(BLOCK_SIZE,poleThickness,BLOCK_SIZE);geoms.push(poleG);const north=new THREE.InstancedMesh(poleG,material("#e03d34"),items.length),south=new THREE.InstancedMesh(poleG,material("#0071e3"),items.length);root.add(north,south);
   for(const pole of [north,south]){const m=pole.material as THREE.MeshStandardMaterial;m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;}
   const o=new THREE.Object3D(),basis=new THREE.Matrix4();
   items.forEach((s,i)=>{o.quaternion.setFromRotationMatrix(basis.makeBasis(new THREE.Vector3(...s.u),new THREE.Vector3(...s.n),new THREE.Vector3(...s.v)));o.position.set(...s.center);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
    o.position.addScaledVector(new THREE.Vector3(...s.n),poleOffset);o.updateMatrix();north.setMatrixAt(i,o.matrix);o.position.addScaledVector(new THREE.Vector3(...s.n),-2*poleOffset);o.updateMatrix();south.setMatrixAt(i,o.matrix);
   });
   const sg=new THREE.SphereGeometry(roi,24,16);geoms.push(sg);const roiMat=material("#488c69",.32);roiMat.depthTest=false;const roiMesh=new THREE.Mesh(sg,roiMat);roiMesh.renderOrder=4;root.add(roiMesh);
   arrow(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-2,0),4,"#488c69");
  }else if(topic==="gradient"){
   for(const w of comparisonWindings(size,axis,model)){const pts=w.points.map(p=>new THREE.Vector3(...p));path(pts,coilColors[axis]);const k=15;arrow(pts[k+1].clone().sub(pts[k]).normalize().multiplyScalar(w.current),pts[k],.45,coilColors[axis]);}
   const sg=new THREE.SphereGeometry(1.5,20,14);geoms.push(sg);root.add(new THREE.Mesh(sg,material("#a7bac4",.08)));
   arrow(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-2,0),4,"#55616c");
  }else{
   const purple=coilColors.rf,r=2.2,h=2.6;
   if(rf==="birdcage"||rf==="array"){
    for(const y of [-h,h])path(Array.from({length:97},(_,i)=>new THREE.Vector3(r*Math.cos(i/96*Math.PI*2),y,r*Math.sin(i/96*Math.PI*2))),purple);
    for(let i=0;i<16;i++){const t=i/16*Math.PI*2,x=r*Math.cos(t),z=r*Math.sin(t);for(const sign of [-1,1])path([new THREE.Vector3(x,sign*h,z),new THREE.Vector3(x,sign*.13,z)],purple);
     for(const y of [-.13,.13]){const g=new THREE.BoxGeometry(.22,.03,.12);geoms.push(g);const cap=new THREE.Mesh(g,material("#f4dcff"));cap.position.set(x,y,z);cap.rotation.y=-t+Math.PI/2;root.add(cap);}
    }
   }
   if(rf==="saddle"||rf==="array"){
    const n=rf==="array"?4:2,rr=rf==="array"?1.85:2.2,hh=rf==="array"?1.8:2.6,a=rf==="array"?Math.PI*.28:Math.PI/3;
    for(let i=0;i<n;i++){const phi=i/n*Math.PI*2,pts:THREE.Vector3[]=[];
     const p=(t:number,y:number)=>new THREE.Vector3(rr*Math.cos(t),y,rr*Math.sin(t));
     for(let j=0;j<=36;j++)pts.push(p(phi-a+2*a*j/36,-hh));pts.push(p(phi+a,hh));
     for(let j=1;j<=36;j++)pts.push(p(phi+a-2*a*j/36,hh));pts.push(p(phi-a,-hh));
     path(pts,rf==="array"?["#6be6cf","#f5b768","#a3beff","#f387a4"][i]:purple,.055);
    }
   }
   if(rf==="solenoid")path(Array.from({length:801},(_,i)=>new THREE.Vector3(r*Math.cos(i/800*16*Math.PI),-h+i/800*2*h,r*Math.sin(i/800*16*Math.PI))),purple,.055);
   arrow(new THREE.Vector3(0,1,0),new THREE.Vector3(-.5,-2.8,0),5.6,"#55616c");
   arrow(rf==="solenoid"?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,0),2,purple);
  }
  if(topic==="rf")root.scale.setScalar(model.coilScale);
  function resize(){const w=el!.clientWidth,h=el!.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const sphere=new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());const half=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));camera.position.set(.7,.62,1).normalize().multiplyScalar(sphere.radius/Math.sin(half)*1.05);controls.target.set(0,0,0);controls.update();}
  const obs=new ResizeObserver(resize);obs.observe(el);resize();let frame=0;
  const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
  el.dataset.ready="true";
  return()=>{cancelAnimationFrame(frame);obs.disconnect();controls.dispose();root.traverse(o=>{if(o instanceof THREE.ArrowHelper){o.dispose();}if(o instanceof THREE.InstancedMesh)o.dispose();});geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();delete el.dataset.ready;};
 },[topic,layout,size,axis,rf,roi,model]);
 useEffect(()=>{host.current?.querySelector("canvas")?.setAttribute("aria-label",t("当前对照方案三维结构，可拖动旋转","3D structure of the current comparison design. Drag to rotate."));},[language,t]);
 return <div ref={host} className="compare-scene" data-language={language} data-scheme={model.id} data-magnet-count={model.magnets.length} data-topic={topic} data-layout={layout} data-size={size} data-rf={rf}>{error&&<p>{t("此浏览器暂时无法显示 3D；下方计算图与方案说明仍可使用。","This browser cannot display 3D. The calculated plots and design explanations below remain available.")}</p>}<span className="compare-scene-hint">{t("拖动旋转 · 滚轮缩放 · ","Drag to rotate · Scroll to zoom · ")}{topic==="magnet"?t("磁体尺寸来自 MATLAB","Magnet dimensions from MATLAB"):t("线圈结构为示意","Coil structures are schematic")}</span></div>;
}
