"use client";
import {Button} from "@/components/ui/button";
import {useMRIModel} from "@/lib/mri-context";
import {useLanguage,directionEnglish} from "@/lib/language-context";
import {directionNames,ringName,type Magnet} from "@/lib/mri";
import {selectionTargets,type EditScope} from "@/lib/design";
import type {DiagramView} from "./design-diagram";
interface Props{ring:number;selected:string|null;scope:EditScope;onSelect:(id:string)=>void;onMode:(mode:DiagramView)=>void;}
function PoleGlyph({magnet:m}:{magnet:Magnet}){
 const x=m.normal[0]*Math.cos(m.theta)+m.normal[2]*Math.sin(m.theta),y=-m.normal[1],perpendicular=-m.normal[0]*Math.sin(m.theta)+m.normal[2]*Math.cos(m.theta),planar=Math.hypot(x,y);
 return <svg className="tile-poles" viewBox="-20 -20 40 40" aria-hidden="true">
  <g transform={"rotate("+(planar>.1?Math.atan2(y,x)*180/Math.PI:0)+")"}>
   <rect x="-13" y="-13" width="26" height="26" rx="3" fill={planar>.1?"#fff":perpendicular>0?"#e54035":"#0071e3"} stroke="#b0b7c0" strokeWidth=".8"/>
   {planar>.1?<><rect x="-13" y="-13" width="6" height="26" rx="2" fill="#0071e3"/><rect x="7" y="-13" width="6" height="26" rx="2" fill="#e54035"/><path d="M-6 0H6M1-5L6 0L1 5" fill="none" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>:<text y="7" textAnchor="middle" fill="#fff" fontSize="23">{perpendicular>0?"⊙":"⊗"}</text>}
  </g>
 </svg>;
}
export default function TileBoard({ring,selected,scope,onSelect,onMode}:Props){
 const model=useMRIModel(),{t}=useLanguage(),m=selected?model.magnetById.get(selected):null;
 const sector=m?.sector??1,radial=m?.radial??1,id=m?.id??ringName(ring)+"-L1-A01";
 const active=new Set(selectionTargets(model,id,scope).map(m=>m.id));
 function chooseRing(next:number){onSelect(ringName(next)+"-L"+Math.min(radial,model.rings[next-1].directions.length)+"-A"+String(sector).padStart(2,"0"));}
 return <section className="design-diagram tile-diagram" aria-label={t("放大磁铁排布板","Enlarged magnet layout board")}>
  <div className="graph-pane-heading"><strong>{t("磁铁排布","Magnet layout")}</strong>
   <div className="diagram-mode" role="group" aria-label={t("编辑图类型","Editor diagram type")}>
    <Button variant="ghost" aria-pressed onClick={()=>onMode("tiles")}>{t("大格","Blocks")}</Button>
    <Button variant="ghost" aria-pressed={false} onClick={()=>onMode("section")}>{t("剖面","Section")}</Button>
    <Button variant="ghost" aria-pressed={false} onClick={()=>onMode("radial")}>{t("径向","Radial")}</Button>
   </div>
  </div>
  <div className="tile-board-context"><span>{t("内 → 外 · 非尺寸比例","Inner → outer · Not to scale")}</span>
   <label>{t("列","Column")} <select aria-label={t("排布板圆周列","Layout board column")} value={sector} onChange={e=>onSelect(ringName(ring)+"-L"+radial+"-A"+String(e.target.value).padStart(2,"0"))}>
    {Array.from({length:model.repeats},(_,i)=><option key={i} value={i+1}>A{String(i+1).padStart(2,"0")}{i===model.repeats/2?t(" · 对置"," · Opposite"):""}</option>)}
   </select></label>
  </div>
  <div className="tile-ring-picker" role="group" aria-label={t("放大排布磁环","Enlarged layout ring")}>{model.rings.map(r=><Button key={r.id} variant="ghost" aria-pressed={r.id===ring} onClick={()=>chooseRing(r.id)}>{ringName(r.id)}</Button>)}</div>
  <div className="tile-board" data-testid="tile-board">
   {model.rings.map(r=><div key={r.id} className="tile-ring-row" data-active={r.id===ring}>
    <Button variant="ghost" className="tile-ring-label" aria-label={t("选择磁环 ","Select ring ")+ringName(r.id)} onClick={()=>chooseRing(r.id)}>{ringName(r.id)}</Button>
    {r.directions.map((_,i)=>{
     const magnet=model.magnetById.get(ringName(r.id)+"-L"+(i+1)+"-A"+String(sector).padStart(2,"0"))!;
     const members=model.magnets.filter(m=>m.ring===r.id&&m.radial===i+1),mixed=members.some(m=>m.direction!==members[0].direction);
     const label=magnet.id+" · "+t(directionNames[magnet.direction],directionEnglish[magnet.direction]);
     return <Button key={i} variant="outline" className="magnet-tile" data-magnet-id={magnet.id} data-direction={magnet.direction} data-target={active.has(magnet.id)} aria-pressed={active.has(magnet.id)} aria-label={label+(mixed?t(" · 整层混合方向"," · Mixed layer"):"")} title={label+(mixed?t(" · 整层混合方向"," · Mixed layer"):"")} onClick={()=>onSelect(magnet.id)}>
      <span className="tile-layer">L{i+1}</span><PoleGlyph magnet={magnet}/>{mixed&&scope==="layer"&&<i className="tile-mixed" aria-label={t("混合方向","Mixed orientations")}>*</i>}
     </Button>;
    })}
   </div>)}
  </div>
  <div className="tile-key"><span><i className="north-swatch"/>N</span><span><i className="south-swatch"/>S</span><span>⊙ +θ · ⊗ −θ</span></div>
 </section>;
}
