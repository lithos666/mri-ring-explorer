"use client";
import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {directionColors,type ViewMode} from "@/lib/mri";
import {useMRIModel} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";

import {magnetBasis} from "@/lib/field";
import type {LiveFieldResult} from "@/lib/live-field";
import {createCoilGeometry} from "@/components/coil-geometry";
import {rfDirection,type SystemLayers,type GradientAxis} from "@/lib/coils";
interface Props {layers:SystemLayers;gradientAxis:GradientAxis;rfPhase:number;field:boolean;fieldData:LiveFieldResult|null;ring:number;selected:string|null;mode:ViewMode;expansion:number;arrows:boolean;reset:number;onSelect:(id:string)=>void;}
interface Runtime {update:(p:Props)=>void;dispose:()=>void;}
export default function MRIScene(props:Props){
 const {t,language}=useLanguage();
 const model=useMRIModel(),{magnets,rings,position,ringY,magnetById}=model,BLOCK_SIZE=model.blockSize,REPEATS=model.repeats;
 const modelRef=useRef(model);modelRef.current=model;
 const host=useRef<HTMLDivElement>(null);
 const runtime=useRef<Runtime|null>(null);
 const latest=useRef(props);latest.current=props;
 const startLabel=useRef<HTMLDivElement>(null);
 const endLabel=useRef<HTMLDivElement>(null);
 const northLabel=useRef<HTMLSpanElement>(null);
 const southLabel=useRef<HTMLSpanElement>(null);
 const b0Label=useRef<HTMLSpanElement>(null),b1Label=useRef<HTMLSpanElement>(null),xLabel=useRef<HTMLSpanElement>(null),yLabel=useRef<HTMLSpanElement>(null);
 const [error,setError]=useState(false);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  const container=host.current;if(!container)return;
  let renderer:THREE.WebGLRenderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));
  renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-label",t("磁环三维模型。拖动旋转，滚轮缩放，右键平移；点击磁铁查看详情。","3D magnet-ring model. Drag to rotate, scroll to zoom, and right-drag to pan. Select a magnet for details."));
  renderer.domElement.setAttribute("role","img");
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(37,1,.1,400);camera.position.set(29,22,34);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=7;controls.maxDistance=180;
  controls.target.set(0,0,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0xc6c9cd,2.0));
  const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(16,30,24);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffffff,1.0);fill.position.set(-20,3,-13);scene.add(fill);
  const root=new THREE.Group();scene.add(root);
  const coils=createCoilGeometry(model.coilScale);scene.add(coils.root);
  const geoms:THREE.BufferGeometry[]=[];
  const mats:THREE.Material[]=[];
  function inst(g:THREE.BufferGeometry,color:number,metalness=.2){
   const mat=new THREE.MeshStandardMaterial({color,roughness:.4,metalness});
   geoms.push(g);mats.push(mat);
   const mesh=new THREE.InstancedMesh(g,mat,magnets.length);
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);return mesh;
  }
  const poleThickness=BLOCK_SIZE*.5,poleOffset=(BLOCK_SIZE-poleThickness)/2;
  const body=inst(new THREE.BoxGeometry(BLOCK_SIZE*.96,BLOCK_SIZE*.98,BLOCK_SIZE*.96),0xffffff,.12);
  const north=inst(new THREE.BoxGeometry(BLOCK_SIZE,poleThickness,BLOCK_SIZE),0xffffff,.12);
  const south=inst(new THREE.BoxGeometry(BLOCK_SIZE,poleThickness,BLOCK_SIZE),0xffffff,.12);
  for(const pole of [north,south]){const mat=pole.material as THREE.MeshStandardMaterial;mat.polygonOffset=true;mat.polygonOffsetFactor=-1;mat.polygonOffsetUnits=-1;}
  const shafts=inst(new THREE.CylinderGeometry(BLOCK_SIZE*.032,BLOCK_SIZE*.032,BLOCK_SIZE*.8,5),0xffffff,.1);
  const heads=inst(new THREE.ConeGeometry(BLOCK_SIZE*.13,BLOCK_SIZE*.325,7),0xffffff,.1);
  const outlineGeom=new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_SIZE*1.14,BLOCK_SIZE*1.14,BLOCK_SIZE*1.14));
  const outlineMat=new THREE.LineBasicMaterial({color:0xd59116});
  geoms.push(outlineGeom);mats.push(outlineMat);
  const outline=new THREE.LineSegments(outlineGeom,outlineMat);scene.add(outline);
  const guideGroup=new THREE.Group();scene.add(guideGroup);
  const guideMat=new THREE.LineBasicMaterial({color:0x77818a,transparent:true,opacity:.45});mats.push(guideMat);
  const radialCenters=rings.flatMap(r=>r.radii);
  for(const radius of [model.dimensions?model.dimensions.boreRadiusMM/model.unitMM!:Math.min(...radialCenters)-BLOCK_SIZE*.65,model.dimensions?model.dimensions.supportOuterMM/model.unitMM!:Math.max(...radialCenters)+BLOCK_SIZE*.65]){
   const points=Array.from({length:145},(_,i)=>new THREE.Vector3(radius*Math.cos(i/144*Math.PI*2),0,radius*Math.sin(i/144*Math.PI*2)));
   const g=new THREE.BufferGeometry().setFromPoints(points);geoms.push(g);guideGroup.add(new THREE.Line(g,guideMat));
  }
  const axisMat=new THREE.LineDashedMaterial({color:0x7b91a6,dashSize:.28,gapSize:.22,transparent:true,opacity:.6});mats.push(axisMat);
  let axisGeom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,12,0),new THREE.Vector3(0,-12,0)]);geoms.push(axisGeom);
  const axis=new THREE.Line(axisGeom,axisMat);axis.computeLineDistances();scene.add(axis);
  const dummy=new THREE.Object3D(),v=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const q=new THREE.Quaternion(),col=new THREE.Color();
  const fluxGroup=new THREE.Group();scene.add(fluxGroup);
  let builtField:LiveFieldResult|null=null;
  const fluxGeometries:THREE.BufferGeometry[]=[];
  const fluxMaterials:THREE.Material[]=[];
  function buildFlux(data:LiveFieldResult){
   if(builtField===data)return;builtField=data;fluxGroup.children.forEach(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});fluxGroup.clear();fluxGeometries.forEach(g=>g.dispose());fluxMaterials.forEach(m=>m.dispose());fluxGeometries.length=0;fluxMaterials.length=0;
   const lineMat=new THREE.LineBasicMaterial({color:0x328060,transparent:true,opacity:.78});fluxMaterials.push(lineMat);
   const arrowMat=new THREE.MeshBasicMaterial({color:0x27764d});fluxMaterials.push(arrowMat);
   const arrowGeo=new THREE.ConeGeometry(.095,.32,6);fluxGeometries.push(arrowGeo);
   const markers:THREE.Object3D[]=[];
   for(const line of data.lines3D){
    const points=line.map(p=>new THREE.Vector3(...p));
    const g=new THREE.BufferGeometry().setFromPoints(points);fluxGeometries.push(g);fluxGroup.add(new THREE.Line(g,lineMat));
    for(let i=12;i<points.length-1;i+=24){const o=new THREE.Object3D();o.position.copy(points[i]);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),points[i+1].clone().sub(points[i-1]).normalize());o.updateMatrix();markers.push(o);}
   }
   const cones=new THREE.InstancedMesh(arrowGeo,arrowMat,markers.length);markers.forEach((o,i)=>cones.setMatrixAt(i,o.matrix));cones.computeBoundingSphere();fluxGroup.add(cones);
  }
  const basisMatrix=new THREE.Matrix4();
  function orient(m:typeof magnets[number]){const [u,n,w]=magnetBasis(m);return q.setFromRotationMatrix(basisMatrix.makeBasis(new THREE.Vector3(...u),new THREE.Vector3(...n),new THREE.Vector3(...w)));}
  let visibleIds:number[]=[];
  let prior:Props|null=null;
  let current=latest.current;
  let resetCamera=true;
  let selectedPosition:THREE.Vector3|null=null;
  let selectedNormal:THREE.Vector3|null=null;
  function frame(p:Props){
   const single=p.mode==="single";
   const mid=single?ringY(p.ring,p.expansion):0;
   const coilOnly=!single&&!p.layers.magnet&&!p.field;
   const height=single?0:coilOnly?10:Math.abs(ringY(1,p.expansion))*2;
   const aspect=camera.aspect;
   const bound=Math.max((p.field&&!single?29:coilOnly?12:18)/Math.min(aspect,1),height+(coilOnly?2:6));
   const distance=bound/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*.61;
   camera.position.copy(new THREE.Vector3(single?.32:.64,single?1.2:.62,single?.75:.94).normalize().multiplyScalar(distance).add(new THREE.Vector3(0,mid,0)));
   controls.target.set(0,mid,0);controls.update();
  }
  function update(p:Props){
   const {magnets,magnetById}=modelRef.current;
   current=p;
   if(p.fieldData)buildFlux(p.fieldData);fluxGroup.visible=p.field&&!!p.fieldData&&p.mode==="assembly"&&p.expansion===0;
   const assembly=p.mode==="assembly";coils.update(p.layers,p.gradientAxis,p.rfPhase,assembly);
   root.visible=!assembly||p.layers.magnet;guideGroup.visible=root.visible;
   const ghost=assembly&&(p.layers.gradient||p.layers.rf);
   for(const mesh of [body,north,south]){const mat=mesh.material as THREE.MeshStandardMaterial;mat.transparent=fluxGroup.visible||ghost;mat.opacity=ghost?.18:fluxGroup.visible?.38:1;mat.depthWrite=!mat.transparent;mat.needsUpdate=true;}
   const single=p.mode==="single";
   visibleIds=[];
   let n=0,ar=0;
   for(let i=0;i<magnets.length;i++){
    const m=magnets[i];if(single&&m.ring!==p.ring)continue;
    visibleIds.push(i);
    const isRing=m.ring===p.ring,isSelected=m.id===p.selected;
    v.set(...position(m,p.expansion));orient(m);
    dummy.position.copy(v);dummy.quaternion.copy(q);dummy.scale.setScalar(1);dummy.updateMatrix();body.setMatrixAt(n,dummy.matrix);
    body.setColorAt(n,col.set(isSelected?0xf0c97b:isRing?0xa8aeb5:0xbbc1c7));
    const off=new THREE.Vector3(...m.normal).multiplyScalar(poleOffset);
    dummy.position.copy(v).add(off);dummy.updateMatrix();north.setMatrixAt(n,dummy.matrix);north.setColorAt(n,col.set(isSelected?0xf25247:0xe03d34));
    dummy.position.copy(v).sub(off);dummy.updateMatrix();south.setMatrixAt(n,dummy.matrix);south.setColorAt(n,col.set(isSelected?0x2587fa:0x0071e3));
    if(p.arrows&&isRing){
     dummy.position.copy(v).addScaledVector(new THREE.Vector3(...m.normal),BLOCK_SIZE*.95);dummy.updateMatrix();shafts.setMatrixAt(ar,dummy.matrix);
     dummy.position.copy(v).addScaledVector(new THREE.Vector3(...m.normal),BLOCK_SIZE*1.5125);dummy.updateMatrix();heads.setMatrixAt(ar,dummy.matrix);
     const color=directionColors[m.direction];shafts.setColorAt(ar,col.set(color));heads.setColorAt(ar,col);ar++;
    }
    n++;
   }
   for(const mesh of [body,north,south]){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
   for(const mesh of [shafts,heads]){mesh.count=ar;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
   guideGroup.position.y=ringY(p.ring,p.expansion);
   const aY=ringY(1,p.expansion)+2,bY=ringY(14,p.expansion)-2;
   const arr=axis.geometry.attributes.position as THREE.BufferAttribute;arr.setXYZ(0,0,aY,0);arr.setXYZ(1,0,bY,0);arr.needsUpdate=true;axis.computeLineDistances();
   axis.visible=!single&&p.layers.magnet;
   const sm=p.selected?magnetById.get(p.selected):null;
   outline.visible=root.visible&&!!sm&&(!single||sm.ring===p.ring);
   selectedPosition=outline.visible&&sm?new THREE.Vector3(...position(sm,p.expansion)):null;
   selectedNormal=outline.visible&&sm?new THREE.Vector3(...sm.normal):null;
   if(sm&&outline.visible){outline.position.copy(selectedPosition!);outline.quaternion.copy(orient(sm));}
   if(resetCamera||!prior||p.mode!==prior.mode||p.field!==prior.field||p.layers.magnet!==prior.layers.magnet||p.layers.gradient!==prior.layers.gradient||p.layers.rf!==prior.layers.rf||p.reset!==prior.reset||p.expansion!==prior.expansion||(single&&p.ring!==prior.ring)){frame(p);resetCamera=false;}
   prior={...p};
  }
  function resize(){const w=container!.clientWidth,h=container!.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();frame(current);}
  const observer=new ResizeObserver(resize);observer.observe(container);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let startX=0,startY=0;
  const down=(e:PointerEvent)=>{startX=e.clientX;startY=e.clientY;};
  const pick=(e:PointerEvent)=>{if(!root.visible||e.button!==0||Math.hypot(e.clientX-startX,e.clientY-startY)>5)return;
   const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
   ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([body,north,south])[0];
   if(hit?.instanceId!==undefined){const m=modelRef.current.magnets[visibleIds[hit.instanceId]];if(m)latest.current.onSelect(m.id);}
  };
  renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointerup",pick);
  const lost=(e:Event)=>{e.preventDefault();setError(true);};
  renderer.domElement.addEventListener("webglcontextlost",lost);
  function label(el:HTMLElement|null,point:THREE.Vector3,visible=true){
   if(!el)return;const p=point.clone().project(camera);el.style.display=visible&&p.z<1?"block":"none";
   el.style.left=(p.x*.5+.5)*container!.clientWidth+"px";el.style.top=(-p.y*.5+.5)*container!.clientHeight+"px";
  }
  let raf=0;
  function animate(){raf=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);
   label(startLabel.current,new THREE.Vector3(0,ringY(1,current.expansion)+2,0),current.mode!=="single"&&current.layers.magnet);
   label(endLabel.current,new THREE.Vector3(0,ringY(14,current.expansion)-2,0),current.mode!=="single"&&current.layers.magnet);
   const system=current.mode==="assembly"&&(current.layers.gradient||current.layers.rf);
   label(b0Label.current,new THREE.Vector3(0,2.6,0),system);
   label(b1Label.current,new THREE.Vector3(...rfDirection(current.rfPhase)).multiplyScalar(2),system&&current.layers.rf);
   label(xLabel.current,new THREE.Vector3(1.8,-4.9,0),system);label(yLabel.current,new THREE.Vector3(0,-4.9,-1.8),system);
   label(northLabel.current,selectedPosition?.clone().addScaledVector(selectedNormal!,BLOCK_SIZE*.9)??new THREE.Vector3(),!!selectedPosition);
   label(southLabel.current,selectedPosition?.clone().addScaledVector(selectedNormal!,-BLOCK_SIZE*.9)??new THREE.Vector3(),!!selectedPosition);
  }
  update(latest.current);resize();animate();setReady(true);
  runtime.current={update,dispose(){
   cancelAnimationFrame(raf);coils.dispose();observer.disconnect();controls.dispose();
   renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointerup",pick);renderer.domElement.removeEventListener("webglcontextlost",lost);
   fluxGeometries.forEach(g=>g.dispose());fluxMaterials.forEach(m=>m.dispose());fluxGroup.children.forEach(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());[body,north,south,shafts,heads].forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }};
  return ()=>{runtime.current?.dispose();runtime.current=null;};
 },[]);
 useEffect(()=>{host.current?.querySelector("canvas")?.setAttribute("aria-label",t("磁环三维模型。拖动旋转，滚轮缩放，右键平移；点击磁铁查看详情。","3D magnet-ring model. Drag to rotate, scroll to zoom, and right-drag to pan. Select a magnet for details."));},[language]);
 useEffect(()=>{runtime.current?.update(props);},[props.ring,props.selected,props.mode,props.expansion,props.arrows,props.reset,props.field,props.fieldData,props.layers,props.gradientAxis,props.rfPhase,model]);
 return <div className="scene-host" ref={host} data-scheme={model.id} data-magnet-count={magnets.length} data-columns={REPEATS} data-magnets-visible={props.mode!=="assembly"||props.layers.magnet} data-gradients-visible={props.mode==="assembly"&&props.layers.gradient} data-rf-visible={props.mode==="assembly"&&props.layers.rf} data-gradient-axis={props.gradientAxis} data-rf-phase={props.rfPhase} data-field-visible={props.field&&props.mode==="assembly"&&props.expansion===0&&!!props.fieldData} data-scene-ready={ready} data-webgl-error={error}>
  <span ref={b0Label} className="coil-axis-label">{t("z · 装置参考轴","z · device axis")}</span><span ref={b1Label} className="coil-axis-label rf-label">{t("B₁ · 方向示意","B₁ · illustrative direction")}</span><span ref={xLabel} className="coil-axis-label">x</span><span ref={yLabel} className="coil-axis-label">y</span>
  <div className="end-label" ref={startLabel}>R01 <span>{t("+Z 端","+Z end")}</span></div>
  <div className="end-label" ref={endLabel}>R14 <span>{t("−Z 端","−Z end")}</span></div>
  <span ref={northLabel} className="pole-label pole-n">N</span><span ref={southLabel} className="pole-label pole-s">S</span>
  {ready&&!error&&props.mode==="assembly"&&!props.layers.magnet&&!props.layers.gradient&&!props.layers.rf&&!props.field&&<div className="scene-message">{t("所有结构图层已隐藏，可在上方重新打开。","All structural layers are hidden. Use the controls above to show them again.")}</div>}
  {!ready&&!error&&<div className="scene-message">{t(`正在载入 ${magnets.length} 块磁铁…`,`Loading ${magnets.length} magnets…`)}</div>}
  {error&&<div className="scene-message"><strong>{t("此浏览器暂时无法显示 3D","3D is unavailable in this browser")}</strong><p>{t("请切换「径向剖面」或打开「排布清单」，仍可核对所有磁铁方向和数量。","Switch to Radial section or open the Layout list to check all magnet directions and counts.")}</p></div>}
 </div>;
}
