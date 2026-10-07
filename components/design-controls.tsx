"use client";
import {useRef,useState} from "react";
import {Undo2,Redo2,RotateCcw,Save,FolderOpen,Download,Upload} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useMRIModel,useBaselineMRIModel,useMRIDesign} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
import {ringName,type Direction} from "@/lib/mri";
import {EDIT_DIRECTIONS,MAX_IMPORT_BYTES} from "@/lib/design";
interface Props{selectedRing:number;selected:string|null;onSelect:(id:string)=>void;}
const orientationCopy:Record<Direction,[string,string]>={
 out:["径向朝外","Radially outward"],in:["径向朝内","Radially inward"],
 axial:["轴向朝下 · −Z","Axial down · −Z"],axialUp:["轴向朝上 · +Z","Axial up · +Z"],
 tangent:["切向 · +θ","Tangential · +θ"],tangentNeg:["切向 · −θ","Tangential · −θ"]
};
export default function DesignControls({selectedRing,selected,onSelect}:Props){
 const {t,language}=useLanguage(),model=useMRIModel(),baseline=useBaselineMRIModel(),design=useMRIDesign();
 const fileInput=useRef<HTMLInputElement>(null);
 const [fileError,setFileError]=useState<[string,string]|null>(null);
 const selectedMagnet=selected?model.magnetById.get(selected):null;
 const ring=selectedMagnet?.ring??selectedRing,radial=selectedMagnet?.radial??1,sector=selectedMagnet?.sector??1;
 const id=ringName(ring)+"-L"+radial+"-A"+String(sector).padStart(2,"0"),magnet=model.magnetById.get(id)!;
 const original=baseline.magnetById.get(id)!;
 const ringMagnets=model.magnets.filter(m=>m.ring===ring);
 const ringEdits=ringMagnets.filter(m=>design.overrides[m.id]!==undefined).length;
 const mixedLayers=model.rings[ring-1].directions.map((_,i)=>{
  const items=ringMagnets.filter(m=>m.radial===i+1);return items.some(m=>m.direction!==items[0].direction);
 }).filter(Boolean).length;
 const copy=(d:Direction)=>t(...orientationCopy[d]);
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
  <div className="magnet-design-heading"><h2>{t("磁铁方向","Magnet orientation")}</h2>
   <span className={"design-save-state "+(design.isSaved?"is-saved":"is-dirty")} data-modified-count={design.modifiedCount}>
    {design.modifiedCount}{t(" 块已改"," edited")} · {design.isSaved?(design.savedAt?t("已保存","Saved"):t("初始","Initial")):t("未保存","Unsaved")}
   </span>
  </div>
  <div className="magnet-design-editor">
   <div className="magnet-locator">
    <label>{t("磁环","Ring")}<select aria-label={t("编辑磁环","Editing ring")} value={ring} onChange={e=>choose(Number(e.target.value),radial,sector)}>{model.rings.map(r=><option key={r.id} value={r.id}>{ringName(r.id)}</option>)}</select></label>
    <label>{t("径向层","Layer")}<select aria-label={t("编辑径向位置","Editing radial position")} value={radial} onChange={e=>choose(ring,Number(e.target.value),sector)}>{model.rings[ring-1].directions.map((_,i)=><option key={i} value={i+1}>L{i+1}</option>)}</select></label>
    <label>{t("圆周列","Column")}<select aria-label={t("编辑圆周列","Editing circumferential column")} value={sector} onChange={e=>choose(ring,radial,Number(e.target.value))}>{Array.from({length:model.repeats},(_,i)=><option key={i} value={i+1}>A{String(i+1).padStart(2,"0")}</option>)}</select></label>
   </div>
   <div className="orientation-editor">
    <div className="orientation-editor-title"><strong>{magnet.id}</strong><span>{t("N 极方向","N-pole direction")}</span></div>
    <div className="orientation-presets" role="group" aria-label={t("选中磁铁的 N 极方向","Selected magnet N-pole orientation")}>
     {EDIT_DIRECTIONS.map(direction=><Button key={direction} variant="outline" aria-pressed={magnet.direction===direction} onClick={()=>{onSelect(magnet.id);design.setDirection(magnet.id,direction);setFileError(null);}}>{copy(direction)}</Button>)}
    </div>
   </div>
  </div>
  <p className="design-edit-hint">{t("只改变选中磁铁，预览和读数同步更新。","Changes affect only this magnet. Preview and readings update together.")}</p>
  <div className="magnet-design-toolbar" role="group" aria-label={t("设计历史与保存","Design history and saving")}>
   <Button variant="outline" disabled={!design.canUndo} onClick={action(design.undo)} aria-label={t("撤销","Undo")} title={t("撤销","Undo")}><Undo2 size={15}/>{t("撤销","Undo")}</Button>
   <Button variant="outline" disabled={!design.canRedo} onClick={action(design.redo)} aria-label={t("重做","Redo")} title={t("重做","Redo")}><Redo2 size={15}/>{t("重做","Redo")}</Button>
   <Button variant="outline" disabled={design.modifiedCount===0} onClick={action(design.reset)} aria-label={t("重置设计","Reset design")} title={t("重置设计","Reset design")}><RotateCcw size={15}/>{t("重置","Reset")}</Button>
   <Button onClick={action(design.save)} aria-label={t("保存设计","Save design")} title={t("保存设计","Save design")}><Save size={15}/>{t("保存","Save")}</Button>
  </div>
  {design.notice&&<p className={"design-notice "+design.notice.type} role={design.notice.type==="error"?"alert":"status"}>{t(design.notice.zh,design.notice.en)}</p>}
  {fileError&&<p className="design-notice error" role="alert">{t(...fileError)}</p>}
  <details className="workbench-disclosure design-file-details"><summary>{t("文件与设计说明","Files & design notes")}</summary>
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
