"use client";
import {useRef,useState} from "react";
import {Undo2,Redo2,RotateCcw,Save,FolderOpen,Download,Upload} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useMRIModel,useBaselineMRIModel,useMRIDesign} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
import {ringName,type Direction} from "@/lib/mri";
import {EDIT_DIRECTIONS,MAX_IMPORT_BYTES,selectionTargets,type EditScope} from "@/lib/design";
import type {LiveStatus} from "@/lib/live-field-client";
interface Props{selectedRing:number;selected:string|null;onSelect:(id:string)=>void;scope:EditScope;onScope:(scope:EditScope)=>void;onCompute:()=>void;status:LiveStatus;}
const orientationCopy:Record<Direction,[string,string]>={
 out:["径向朝外","Radially outward"],in:["径向朝内","Radially inward"],
 axial:["轴向朝下 · −Z","Axial down · −Z"],axialUp:["轴向朝上 · +Z","Axial up · +Z"],
 tangent:["切向 · +θ","Tangential · +θ"],tangentNeg:["切向 · −θ","Tangential · −θ"]
};
export default function DesignControls({selectedRing,selected,onSelect,scope,onScope,onCompute,status}:Props){
 const {t,language}=useLanguage(),model=useMRIModel(),baseline=useBaselineMRIModel(),design=useMRIDesign();
 const fileInput=useRef<HTMLInputElement>(null);
 const [fileError,setFileError]=useState<[string,string]|null>(null);
 const selectedMagnet=selected?model.magnetById.get(selected):null;
 const ring=selectedMagnet?.ring??selectedRing,radial=selectedMagnet?.radial??1,sector=selectedMagnet?.sector??1;
 const id=ringName(ring)+"-L"+radial+"-A"+String(sector).padStart(2,"0"),magnet=model.magnetById.get(id)!;
 const original=baseline.magnetById.get(id)!;
 const targets=selectionTargets(model,id,scope),counts=EDIT_DIRECTIONS.map(d=>({direction:d,count:targets.filter(m=>m.direction===d).length})).filter(c=>c.count);
 const uniform=counts.length===1?counts[0].direction:null;
 const ringMagnets=model.magnets.filter(m=>m.ring===ring);
 const ringEdits=ringMagnets.filter(m=>design.overrides[m.id]!==undefined).length;
 const mixedLayers=model.rings[ring-1].directions.map((_,i)=>{
  const items=ringMagnets.filter(m=>m.radial===i+1);return items.some(m=>m.direction!==items[0].direction);
 }).filter(Boolean).length;
 const copy=(d:Direction)=>t(...orientationCopy[d]);
 const stripCopy=(d:Direction)=>t(...({out:["朝外","Out"],in:["朝内","In"],axial:["−Z","−Z"],axialUp:["+Z","+Z"],tangent:["+θ","+θ"],tangentNeg:["−θ","−θ"]} as Record<Direction,[string,string]>)[d]);
 const shortCopy=(d:Direction)=>t(...({out:["朝外","Outward"],in:["朝内","Inward"],axial:["向下 −Z","Down −Z"],axialUp:["向上 +Z","Up +Z"],tangent:["切向 +θ","Tangential +θ"],tangentNeg:["切向 −θ","Tangential −θ"]} as Record<Direction,[string,string]>)[d]);
 function choose(nextRing:number,nextRadial:number,nextSector:number){
  const last=model.rings[nextRing-1].directions.length;
  onSelect(ringName(nextRing)+"-L"+Math.max(1,Math.min(last,nextRadial))+"-A"+String(nextSector).padStart(2,"0"));
  setFileError(null);
 }
 function download(){
  const url=URL.createObjectURL(new Blob([design.exportJSON()],{type:"application/json"})),link=document.createElement("a");
  link.href=url;link.download="mri-"+model.id+"-design-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function importFile(file:File|undefined){
  if(!file)return;setFileError(null);
  if(file.size>MAX_IMPORT_BYTES){setFileError(["文件过大，最大为 512 KB。","The file is too large; the maximum size is 512 KB."]);return;}
  try{design.importJSON(await file.text());}catch{setFileError(["无法读取此文件。当前设计未改变。","The file could not be read. The current design was not changed."]);}
 }
 const action=(callback:()=>void)=>()=>{setFileError(null);callback();};
 return <section className="magnet-design" aria-label={t("磁铁方向设计","Magnet orientation designer")}>
  <div className="magnet-design-heading"><h2>{t("排布修改","Edit magnets")}</h2>
   <span className={"design-save-state "+(design.isSaved?"is-saved":"is-dirty")} data-modified-count={design.modifiedCount}>
    {design.modifiedCount}{t(" 块已改"," edited")} · {design.isSaved?(design.savedAt?t("已保存","Saved"):t("初始","Initial")):t("未保存","Unsaved")}
   </span>
  </div>
  <div className="magnet-design-editor">

   <div className="edit-scope" role="group" aria-label={t("修改范围","Edit scope")}>
    <Button variant="outline" aria-pressed={scope==="layer"} onClick={()=>onScope("layer")}>{t("整层","Entire layer")} · {model.repeats}</Button>
    <Button variant="outline" aria-pressed={scope==="magnet"} onClick={()=>onScope("magnet")}>{t("单块","Single magnet")}</Button>
   </div>
   <div className="selected-target"><strong>{id}</strong><span>{model.unitMM?"R ≈ "+Math.round(magnet.radius*model.unitMM)+" mm":"R = "+magnet.radius}</span></div>
   <div className="layer-strip-heading"><span>{t("内圈 → 外圈","Inner → outer")}</span><span>{ringName(ring)}</span></div>
   <div className="edit-layer-strip" role="group" aria-label={t("放大的径向排布条","Enlarged radial layer strip")}>{model.rings[ring-1].directions.map((_,i)=>{
    const members=ringMagnets.filter(m=>m.radial===i+1),same=members.every(m=>m.direction===members[0].direction),shown=scope==="layer"?(same?stripCopy(members[0].direction):t("混合","Mixed")):stripCopy(members.find(m=>m.sector===sector)!.direction);
    return <Button key={i} variant="outline" aria-pressed={radial===i+1} aria-label={"L"+(i+1)+" · "+(same?copy(members[0].direction):t("混合方向","Mixed orientations"))} onClick={()=>choose(ring,i+1,sector)}><b>L{i+1}</b><span>{shown}</span></Button>;
   })}</div>
   <p className="target-summary" data-target-count={targets.length} aria-live="polite">{t("将修改 ","Will change ")}<strong>{targets.length}</strong>{t(" 块"," magnets")} · {uniform?t("统一方向","Uniform"):t("混合方向","Mixed orientations")}</p>
   {!uniform&&<ul className="mixed-direction-counts" aria-label={t("当前方向数量","Current orientation counts")}>{counts.map(c=><li key={c.direction}>{copy(c.direction)} <b>{c.count}</b></li>)}</ul>}
   <div className="orientation-editor">
    <div className="orientation-editor-title"><strong>{t("N 极方向","N-pole direction")}</strong><span>{t("S → N","S → N")}</span></div>
    <div className="orientation-presets" role="group" aria-label={t("选中磁铁的 N 极方向","Selected magnet N-pole orientation")}>
     {EDIT_DIRECTIONS.map(direction=><Button key={direction} variant="outline" aria-label={copy(direction)} title={copy(direction)} aria-pressed={uniform===direction} onClick={()=>{onSelect(magnet.id);design.setDirections(targets.map(m=>({id:m.id,direction})));setFileError(null);}}>{shortCopy(direction)}</Button>)}
    </div>
   </div>
  </div>
  <p className="design-edit-hint">{scope==="layer"?!uniform?t("将统一整层方向，覆盖差异；可撤销。","Replaces mixed orientations; undoable."):t("整层统一修改，可一次撤销。","All columns in this layer; one undo."):t("只改变这一块磁铁。","Only this magnet changes.")}</p>
  <Button className="compute-field-button" onClick={onCompute} disabled={status==="computing"} aria-label={t("计算磁场","Compute field")}>{status==="computing"?t("计算中…","Computing…"):t("计算磁场","Compute field")}</Button>
  <div className="magnet-design-toolbar" role="group" aria-label={t("设计历史与保存","Design history and saving")}>
   <Button variant="outline" disabled={!design.canUndo} onClick={action(design.undo)} aria-label={t("撤销","Undo")} title={t("撤销","Undo")}><Undo2 size={15}/>{t("撤销","Undo")}</Button>
   <Button variant="outline" disabled={!design.canRedo} onClick={action(design.redo)} aria-label={t("重做","Redo")} title={t("重做","Redo")}><Redo2 size={15}/>{t("重做","Redo")}</Button>
   <Button variant="outline" disabled={design.modifiedCount===0} onClick={action(design.reset)} aria-label={t("重置设计","Reset design")} title={t("重置设计","Reset design")}><RotateCcw size={15}/>{t("重置","Reset")}</Button>
   <Button onClick={action(design.save)} aria-label={t("保存设计","Save design")} title={t("保存设计","Save design")}><Save size={15}/>{t("保存","Save")}</Button>
  </div>
  {design.notice?.type==="error"&&<p className={"design-notice "+design.notice.type} role={design.notice.type==="error"?"alert":"status"}>{t(design.notice.zh,design.notice.en)}</p>}
  {fileError&&<p className="design-notice error" role="alert">{t(...fileError)}</p>}
  <details className="workbench-disclosure design-file-details"><summary>{t("文件与设计说明","Files & design notes")}</summary>
   {design.notice?.type==="success"&&<p className="design-notice success" role="status">{t(design.notice.zh,design.notice.en)}</p>}
   <p className="magnet-design-note">{t("点击计算时保存一份排布快照。计算中可以继续编辑，但新修改需再次点击计算。保存设计只保存方向，不保存场结果。整层统一会覆盖该层差异，可一次撤销。","Compute captures the layout at that click. You can keep editing during calculation; later edits need another Compute. Saving stores orientations, not field results. Unifying a layer replaces its differences and is undone in one step.")}</p>
   <div className="design-file-actions">
    <Button variant="outline" disabled={!design.storageReady||!design.hasSaved} onClick={action(design.restore)}><FolderOpen size={15}/>{t("加载已保存","Load saved")}</Button>
    <Button variant="outline" onClick={action(download)}><Download size={15}/>{t("下载 JSON","Download JSON")}</Button>
    <Button variant="outline" onClick={()=>fileInput.current?.click()}><Upload size={15}/>{t("导入 JSON","Import JSON")}</Button>
   </div>
   <p className="magnet-original-direction">{t("初始方向：","Initial orientation: ")}{copy(original.direction)} · θ = {(magnet.theta*180/Math.PI).toFixed(1)}° · {t("θ 按圆周列号递增；从 R01 端看为顺时针。","θ increases with column order; clockwise when viewed from the R01 end.")}</p>
   <p className="magnet-design-note">{ringName(ring)}{t(" 已修改 "," has ")}{ringEdits}{t(" 块；"," modified magnets; ")}{mixedLayers?t(mixedLayers+" 个径向层的圆周方向不再一致。",mixedLayers+" radial layers have different orientations around the circumference."):t("同层的圆周方向一致。","Each layer has the same orientation around its circumference.")}{t(" 两套方案的修改与历史分别保留。六个主轴方向的 90° 旋转不改变磁块占据范围。","Edits and history are separate for each configuration. Six cube-axis orientations preserve occupied geometry under 90° rotations.")}</p>
   <p className="magnet-design-storage">{t("保存存放在此浏览器；下载文件可交给同事继续编辑。加载、导入和重置均可撤销。","Save stores the design in this browser. Download a file for colleagues to continue editing. Loading, importing and resetting can be undone.")}{design.savedAt&&<> {t("上次保存：","Last saved: ")}{new Date(design.savedAt).toLocaleString(language==="zh"?"zh-CN":"en-US")}</>}</p>
  </details>
  <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label={t("选择设计 JSON 文件","Choose design JSON file")} onChange={e=>{void importFile(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/>
 </section>;
}
