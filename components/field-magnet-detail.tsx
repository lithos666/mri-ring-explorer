"use client";
import {useEffect,useId,useRef,useState} from "react";
import {ChevronLeft,ChevronRight,ScanSearch,X} from "lucide-react";
import {directionNames,ringName,type Magnet,type MRIModel} from "@/lib/mri";
import {planeComponents} from "@/lib/live-field";
import {directionEnglish,shortEnglish,useLanguage} from "@/lib/language-context";
import "./field-magnet-detail.css";

/** Draw at the physical square's size. `normal` is already projected into
 * the section frame; SVG Y is the negative of the physical vertical axis.
 * The filled black arrow denotes M, never the local total B. */
export function MagnetPolarityGlyph({normal,size,labels=false}:{normal:[number,number,number];size:number;labels?:boolean}){
 const planar=Math.hypot(normal[0],normal[1]),rotation=Math.atan2(-normal[1],normal[0])*180/Math.PI;
 const s=size,outline=Math.min(s*.055,s*.08),border=s*.018;
 if(planar<1e-6){
  const out=normal[2]>0;
  return <g className="magnet-polarity-glyph" data-magnet-m-projected={normal.join(",")}>
   <rect x={-s/2} y={-s/2} width={s} height={s} rx={s*.035} fill={out?"#e53c36":"#0879e8"} stroke="#23313d" strokeWidth={border}/>
   <circle cx="0" cy="0" r={s*.20} fill="none" stroke="#fff" strokeWidth={s*.10}/>
   <circle cx="0" cy="0" r={s*.20} fill="none" stroke="#121820" strokeWidth={s*.052}/>
   {out?<circle cx="0" cy="0" r={s*.092} fill="#121820"/>:<path d={`M ${-s*.125} ${-s*.125} L ${s*.125} ${s*.125} M ${-s*.125} ${s*.125} L ${s*.125} ${-s*.125}`} stroke="#fff" strokeWidth={s*.12} strokeLinecap="round"/>}
   {!out&&<path d={`M ${-s*.125} ${-s*.125} L ${s*.125} ${s*.125} M ${-s*.125} ${s*.125} L ${s*.125} ${-s*.125}`} stroke="#121820" strokeWidth={s*.07} strokeLinecap="round"/>}
   {labels&&<><text x="0" y={-s*.32} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={s*.16} fontWeight="700">{out?"N":"S"}</text><text x="0" y={s*.35} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={s*.145} fontWeight="700">M {out?"⊙":"⊗"}</text></>}
  </g>;
 }
 const arrow=[[-.39,-.09],[.065,-.09],[.065,-.22],[.39,0],[.065,.22],[.065,.09],[-.39,.09]].map(([x,y])=>`${x*s},${y*s}`).join(" ");
 return <g className="magnet-polarity-glyph" data-magnet-m-projected={normal.join(",")} transform={`rotate(${rotation})`}>
  <rect x={-s/2} y={-s/2} width={s} height={s} rx={s*.035} fill="#fff" stroke="#23313d" strokeWidth={border}/>
  <rect x={-s/2} y={-s/2} width={s*.25} height={s} fill="#0879e8"/>
  <rect x={s*.25} y={-s/2} width={s*.25} height={s} fill="#e53c36"/>
  <polygon points={arrow} fill="#121820" stroke="#fff" strokeWidth={outline} strokeLinejoin="round" paintOrder="stroke fill"/>
  {labels&&<>
   <text x={-s*.375} y={-s*.32} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={s*.16} fontWeight="700" transform={`rotate(${-rotation},${-s*.375},${-s*.32})`}>S</text>
   <text x={s*.375} y={-s*.32} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={s*.16} fontWeight="700" transform={`rotate(${-rotation},${s*.375},${-s*.32})`}>N</text>
   <text x="0" y={s*.32} textAnchor="middle" dominantBaseline="middle" fill="#121820" fontSize={s*.15} fontWeight="700" transform={`rotate(${-rotation},0,${s*.32})`}>M</text>
  </>}
 </g>;
}

interface Props {model:MRIModel;magnet:Magnet;onSelect:(id:string)=>void;readOnly:boolean}
export default function FieldMagnetDetail({model,magnet,onSelect,readOnly}:Props){
 const {t}=useLanguage(),dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null),labelId=useId();
 const [open,setOpen]=useState(false),[lensRing,setLensRing]=useState(magnet.ring),[inspectionId,setInspectionId]=useState(magnet.id);
 const inspected=model.magnetById.get(inspectionId)??magnet,ring=model.rings.find(item=>item.id===lensRing)??model.rings[0];
 const opposite=model.repeats/2+1,right=model.magnets.filter(item=>item.ring===ring.id&&item.sector===1).sort((a,b)=>a.radial-b.radial),left=model.magnets.filter(item=>item.ring===ring.id&&item.sector===opposite).sort((a,b)=>b.radial-a.radial);
 useEffect(()=>{
  const element=dialog.current;if(!element)return;
  if(open&&!element.open){element.showModal();closeButton.current?.focus();}
  if(!open&&element.open)element.close();
 },[open]);
 useEffect(()=>{if(open&&model.magnetById.has(magnet.id)){setLensRing(magnet.ring);setInspectionId(magnet.id);}},[magnet.id,model,open]);
 const projected=(item:Magnet)=>planeComponents(item.normal,model.angularOffset);
 const textDirection=(item:Magnet)=>t(directionNames[item.direction],directionEnglish[item.direction]);
 function choose(item:Magnet){setInspectionId(item.id);if(!readOnly)onSelect(item.id);}
 function changeRing(id:number){
  const currentColumn=inspected.sector===opposite?opposite:1;
  const items=model.magnets.filter(item=>item.ring===id&&item.sector===currentColumn);
  const next=items.find(item=>item.radial===inspected.radial)??items[0];
  if(!next)return;setLensRing(id);choose(next);
 }
 function magnify(){setLensRing(magnet.ring);setInspectionId(magnet.id);setOpen(true);}
 function cube(item:Magnet,side:"left"|"right"){
  return <button type="button" className={"field-lens-tile"+(inspected.id===item.id?" is-selected":"")} key={item.id} data-magnet-detail-id={item.id} aria-pressed={inspected.id===item.id} aria-label={item.id+" · "+textDirection(item)+" · R "+(item.radius*(model.unitMM??1)).toFixed(0)+" mm"} onClick={()=>choose(item)}>
   <span className="field-lens-layer">L{item.radial}</span>
   <svg width="74" height="74" viewBox="-37 -37 74 74" role="img" aria-label={t("黑色箭头：磁化方向 S 到 N","Black arrow: magnetization from S to N")}><MagnetPolarityGlyph normal={projected(item)} size={64} labels/></svg>
   <span className="field-lens-radius">{(item.radius*(model.unitMM??1)).toFixed(0)} mm</span>
   <span className="field-lens-direction">{t(item.direction==="out"?"朝外":item.direction==="in"?"朝内":item.direction==="axial"?"−Z":item.direction==="axialUp"?"+Z":item.direction==="tangent"?"+θ":"−θ",shortEnglish[item.direction])}</span>
   <span className="field-lens-column">{side==="right"?"A01":"A"+String(opposite).padStart(2,"0")}</span>
  </button>;
 }
 const bore=<div className="field-lens-bore" aria-label={t("中心通孔","Central bore")}><span/><small>{t("通孔","BORE")}</small></div>;
 return <>
  <section className="field-magnet-detail" aria-label={t("当前磁铁的磁化方向","Selected magnet magnetization")} data-field-magnet-detail-id={magnet.id}>
   <svg width="76" height="76" viewBox="-38 -38 76 76" role="img" aria-label={t("磁化 M 从蓝色 S 极指向红色 N 极","Magnetization M points from blue S to red N")}><MagnetPolarityGlyph normal={projected(magnet)} size={64} labels/></svg>
   <div className="field-magnet-detail-text"><small>{t("磁铁磁化 M · S → N","MAGNETIZATION M · S → N")}</small><strong>{magnet.id}</strong><span>{textDirection(magnet)}</span></div>
   <button className="field-magnet-magnify" type="button" onClick={magnify}><ScanSearch size={16}/>{t("放大此环","Magnify layer")}</button>
  </section>
  <dialog className="field-magnet-dialog" ref={dialog} aria-labelledby={labelId} onClose={()=>setOpen(false)} onCancel={()=>setOpen(false)} onClick={event=>{if(event.target!==event.currentTarget)return;const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)setOpen(false);}}>
   <div className="field-magnet-dialog-content">
    <header><div><small>{t("已计算排布 · 磁极放大镜","COMPUTED LAYOUT · POLE DETAIL")}</small><h2 id={labelId}>{t("看清磁铁的 S → N 方向","Read each magnet’s S → N direction")}</h2></div><button className="field-magnet-dialog-close" type="button" ref={closeButton} aria-label={t("关闭放大镜","Close magnifier")} onClick={()=>setOpen(false)}><X size={19}/></button></header>
    <div className="field-lens-ring-control"><button type="button" onClick={()=>changeRing(ring.id-1)} disabled={ring.id===model.rings[0].id} aria-label={t("上一环","Previous layer")}><ChevronLeft size={18}/></button><label htmlFor={labelId+"-ring"}>{t("磁层","Layer")}</label><select id={labelId+"-ring"} value={ring.id} onChange={event=>changeRing(Number(event.target.value))}>{model.rings.map(item=><option key={item.id} value={item.id}>{ringName(item.id)} · Z {item.zMM>=0?"+":""}{item.zMM} mm</option>)}</select><button type="button" onClick={()=>changeRing(ring.id+1)} disabled={ring.id===model.rings.at(-1)?.id} aria-label={t("下一环","Next layer")}><ChevronRight size={18}/></button><span>{ring.directions.length} {t("径向位置","radial positions")} · {model.repeats} {t("圆周列","columns")}</span></div>
    <div className="field-lens-rows">
     <section className="field-lens-row"><h3>A01 · {t("截面右侧：内 → 外","Right side: inner → outer")}</h3><div className="field-lens-right" style={{gridTemplateColumns:`58px repeat(${right.length}, minmax(0, 1fr))`}}>{bore}{right.map(item=>cube(item,"right"))}</div></section>
     <section className="field-lens-row"><h3>{"A"+String(opposite).padStart(2,"0")} · {t("截面左侧：外 → 内","Left side: outer → inner")}</h3><div className="field-lens-left" style={{gridTemplateColumns:`repeat(${left.length}, minmax(0, 1fr)) 58px`}}>{left.map(item=>cube(item,"left"))}{bore}</div></section>
    </div>
    <div className="field-lens-current" aria-live="polite"><strong>{inspected.id}</strong><span>{textDirection(inspected)}</span><span>R = {(inspected.radius*(model.unitMM??1)).toFixed(0)} mm</span><small>{readOnly?t("可查看；此视图不修改设计","Inspection only; this view does not edit the design"):t("点击只选择磁铁；用方向按钮修改排布","Clicking selects a magnet; use direction buttons to edit")}</small></div>
    <footer><div className="field-lens-legend"><span><i className="is-n"/>N</span><span><i className="is-s"/>S</span><span><b>→</b> M</span><span>⊙ {t("出截面","out of plane")}</span><span>⊗ {t("入截面","into plane")}</span></div><p>{t("按实际已计算排布展示；放大间距为示意，不按比例。绿色 B 箭头是合磁场，可与黑色 M 箭头不同。","Shows the actual computed layout; enlarged spacing is schematic, not to scale. Green B arrows show the total field and may differ from the black M arrows.")}</p></footer>
   </div>
  </dialog>
 </>;
}
