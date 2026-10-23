"use client";
import {useEffect,useId,useRef,useState} from "react";
import {ZoomIn,ZoomOut,Move,RotateCcw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useMRIModel} from "@/lib/mri-context";
import {useLanguage,directionEnglish} from "@/lib/language-context";
import {directionNames,ringName,type Magnet} from "@/lib/mri";
import {selectionTargets,type EditScope} from "@/lib/design";
import TileBoard from "./tile-board";
export type DiagramView="tiles"|"section"|"radial";
interface Props{ring:number;selected:string|null;scope:EditScope;mode:DiagramView;onMode:(mode:DiagramView)=>void;onSelect:(id:string)=>void;onRing:(ring:number)=>void;reset:number;}
export default function DesignDiagram({ring,selected,scope,mode,onMode,onSelect,onRing,reset}:Props){
 const model=useMRIModel(),{t}=useLanguage(),marker=useId().replace(/:/g,"");
 const id=selected??ringName(ring)+"-L1-A01";
 const active=new Set(selectionTargets(model,id,scope).map(m=>m.id));
 const initial=mode==="section"?[-225,-275,450,550]:[-215,-215,430,430];
 const [box,setBox]=useState(initial),[panning,setPanning]=useState(false);
 const gesture=useRef<{x:number;y:number;box:number[];moved:boolean;pointer:number}|null>(null),suppress=useRef(false);
 useEffect(()=>{setBox(mode==="section"?[-225,-275,450,550]:[-215,-215,430,430]);gesture.current=null;suppress.current=false;setPanning(false);},[mode,model.id,reset]);
 useEffect(()=>{
  const finish=(event:PointerEvent)=>{const g=gesture.current;if(g?.pointer===event.pointerId){suppress.current=g.moved||panning;gesture.current=null;}};
  const cancel=()=>{gesture.current=null;suppress.current=true;};
  window.addEventListener("pointerup",finish);window.addEventListener("pointercancel",cancel);window.addEventListener("blur",cancel);
  return ()=>{window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",cancel);window.removeEventListener("blur",cancel);};
 },[panning]);
 const items=mode==="radial"?model.magnets.filter(m=>m.ring===ring):model.magnets.filter(m=>m.sector===1||m.sector===model.repeats/2+1);
 const u=25,size=model.blockSize*u,angle=model.angularOffset;
 function zoom(factor:number){setBox(b=>{const width=Math.max(65,Math.min(1600,b[2]*factor)),height=width*b[3]/b[2];return [b[0]+(b[2]-width)/2,b[1]+(b[3]-height)/2,width,height];});}
 function location(m:Magnet){return mode==="radial"?[m.radius*Math.cos(m.theta)*u,m.radius*Math.sin(m.theta)*u]:[(m.sector===1?m.radius:-m.radius)*u,-model.ringY(m.ring)*u];}
 function components(m:Magnet){return mode==="radial"?[m.normal[0],m.normal[2],m.normal[1]]:[m.normal[0]*Math.cos(angle)+m.normal[2]*Math.sin(angle),-m.normal[1],-m.normal[0]*Math.sin(angle)+m.normal[2]*Math.cos(angle)];}
 if(mode==="tiles")return <TileBoard ring={ring} selected={selected} scope={scope} onSelect={onSelect} onMode={onMode}/>;
 return <section className="design-diagram" aria-label={t("点选磁铁排布","Select magnets in the layout")}>
  <div className="graph-pane-heading"><strong>{t("磁铁排布","Magnet layout")}</strong>
   <div className="diagram-mode" role="group" aria-label={t("编辑图类型","Editor diagram type")}>
    <Button variant="ghost" aria-pressed={false} onClick={()=>onMode("tiles")}>{t("大格","Blocks")}</Button>
    <Button variant="ghost" aria-pressed={mode==="section"} onClick={()=>onMode("section")}>{t("剖面","Section")}</Button>
    <Button variant="ghost" aria-pressed={mode==="radial"} onClick={()=>onMode("radial")}>{t("径向","Radial")}</Button>
   </div>
  </div>
  {mode==="radial"&&<div className="diagram-rings" role="group" aria-label={t("径向图磁层","Radial diagram layer")}>{model.rings.map(r=><Button key={r.id} variant="ghost" aria-pressed={ring===r.id} onClick={()=>onRing(r.id)}>{ringName(r.id)}</Button>)}</div>}
  <p className="diagram-context">{mode==="section"?t("14 层 · A01 与对置列","14 layers · A01 and opposite column"):ringName(ring)+t(" · 从 R01 端看 · "," · Viewed from R01 · ")+model.repeats+t(" 列"," columns")}</p>
  <div className="diagram-canvas">
   <svg data-testid="design-diagram" data-mode={mode} viewBox={box.join(" ")} aria-label={mode==="section"?t("可点选的 14 层轴向剖面","Selectable 14-layer longitudinal section"):t("可点选的磁层径向排布","Selectable radial magnet layout")}
    style={{touchAction:panning?"none":"pan-y",cursor:panning?"grab":"default"}}
    onPointerDown={e=>{
     if(gesture.current){gesture.current.moved=true;suppress.current=true;return;}
     suppress.current=false;gesture.current={x:e.clientX,y:e.clientY,box:[...box],moved:false,pointer:e.pointerId};
     if(panning)e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={e=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
     if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>6){g.moved=true;suppress.current=true;}
     if(panning&&g.moved){const c=e.currentTarget.getBoundingClientRect(),unit=Math.max(g.box[2]/c.width,g.box[3]/c.height);setBox([g.box[0]-(e.clientX-g.x)*unit,g.box[1]-(e.clientY-g.y)*unit,g.box[2],g.box[3]]);}
    }}
    onPointerUp={e=>{const g=gesture.current;if(g&&g.pointer===e.pointerId){suppress.current=g.moved||panning;gesture.current=null;}}}
    onPointerCancel={()=>{gesture.current=null;suppress.current=true;}}
    onClickCapture={e=>{if(suppress.current){e.stopPropagation();suppress.current=false;}}}
   >
    <defs><marker id={marker} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto"><path d="M0 0L4 2L0 4Z" fill="#1d1d1f"/></marker></defs>
    {mode==="radial"?<>
     {(model.dimensions?[model.dimensions.boreRadiusMM,model.dimensions.acrylicOuterMM]:[Math.min(...model.rings.flatMap(r=>r.radiiMM))-model.blockSizeMM!/2,Math.max(...model.rings.flatMap(r=>r.radiiMM))+model.blockSizeMM!/2]).map(r=><circle key={r} r={r} fill="none" stroke="#d8dde4" strokeWidth="1"/>)}
     <line x1="-208" x2="208" stroke="#e4e7eb" strokeDasharray="3 5"/><line y1="-208" y2="208" stroke="#e4e7eb" strokeDasharray="3 5"/>
     <text y="-4" textAnchor="middle" fill="#6e6e73" fontSize="12">{ringName(ring)}</text><text y="13" textAnchor="middle" fill="#6e6e73" fontSize="11">{t("通孔","Bore")}</text>
    </>:<>
     <line y1="-260" y2="260" stroke="#a4acb6" strokeDasharray="4 5"/>
     <text x="4" y="-258" fontSize="12" fill="#6e6e73">+Z · R01</text>
     <text x="4" y="267" fontSize="12" fill="#6e6e73">−Z · R14</text>
     {model.rings.map(r=><g key={r.id}><line x1="-205" x2="205" y1={-model.ringY(r.id)*u} y2={-model.ringY(r.id)*u} stroke="#e6e9ee" strokeDasharray="2 5"/><text x="-220" y={-model.ringY(r.id)*u+4} fontSize="11" fill={r.id===ring?"#0071e3":"#6e6e73"}>{ringName(r.id)}</text></g>)}
    </>}
    {items.map(m=>{
     const [x,y]=location(m),n=components(m),planar=Math.hypot(n[0],n[1]),rotation=planar>.1?Math.atan2(n[1],n[0])*180/Math.PI:mode==="radial"?m.theta*180/Math.PI:0;
     const label=m.id+" · "+t(directionNames[m.direction],directionEnglish[m.direction]);
     return <g key={m.id} data-magnet-id={m.id} data-direction={m.direction} data-target={active.has(m.id)} role="button" tabIndex={0} aria-label={label} aria-pressed={active.has(m.id)} className="editable-magnet"
      transform={"translate("+x+" "+y+") rotate("+rotation+")"} onClick={()=>onSelect(m.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(m.id);}}}>
      <title>{label}</title>
      {active.has(m.id)&&<rect x={-size/2-2} y={-size/2-2} width={size+4} height={size+4} rx="1" fill="#0071e3" fillOpacity=".12" stroke="#0071e3" strokeWidth="1.7"/>}
      <rect x={-size/2} y={-size/2} width={size} height={size} fill={planar>.1?"#fff":n[2]>0?"#e54035":"#0071e3"} stroke="#41464e" strokeWidth=".65"/>
      {planar>.1?<>
       <rect x={-size/2} y={-size/2} width={size*.24} height={size} fill="#0071e3"/>
       <rect x={size*.26} y={-size/2} width={size*.24} height={size} fill="#e54035"/>
       <line x1={-size*.2} x2={size*.23} stroke="#1d1d1f" strokeWidth=".9" markerEnd={"url(#"+marker+")"}/>
      </>:<text textAnchor="middle" y={size*.29} fontSize={size*.85} fill="#fff">{n[2]>0?"⊙":"⊗"}</text>}
     </g>;
    })}
   </svg>
  </div>
  <div className="diagram-tools" role="group" aria-label={t("图形缩放与平移","Diagram zoom and pan")}>
   <Button variant="ghost" onClick={()=>zoom(.75)} aria-label={t("放大编辑图","Zoom in editor")}><ZoomIn size={16}/></Button>
   <Button variant="ghost" onClick={()=>zoom(1/.75)} aria-label={t("缩小编辑图","Zoom out editor")}><ZoomOut size={16}/></Button>
   <Button variant="ghost" onClick={()=>setPanning(v=>!v)} aria-pressed={panning}><Move size={15}/>{t("平移","Pan")}</Button>
   <Button variant="ghost" onClick={()=>{setBox(initial);setPanning(false);}} aria-label={t("复位编辑图","Fit editor diagram")}><RotateCcw size={15}/>{t("适合窗口","Fit")}</Button>
  </div>
  <p className="diagram-legend"><span><i className="north-swatch"/>N</span><span><i className="south-swatch"/>S</span><span>⊙ {t("出图面","out")} · ⊗ {t("入图面","in")}</span></p>

 </section>;
}
