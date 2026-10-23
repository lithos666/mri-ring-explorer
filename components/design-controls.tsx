"use client";
import {useRef,useState} from "react";
import {Undo2,Redo2,RotateCcw,Save,FolderOpen,Download,Upload} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useMRIModel,useBaselineMRIModel,useMRIDesign} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
import {ringName,type Direction} from "@/lib/mri";
import {EDIT_DIRECTIONS,MAX_IMPORT_BYTES,selectionTargets} from "@/lib/design";
import type {LiveStatus} from "@/lib/live-field-client";

interface Props{selectedRing:number;selected:string|null;onRing:(ring:number)=>void;onSelect:(id:string)=>void;onCompute:()=>void;status:LiveStatus;filesInDialog?:boolean;}
const orientationCopy:Record<Direction,[string,string]>={
 out:["径向朝外","Radially outward"],in:["径向朝内","Radially inward"],
 axial:["轴向朝下 · −Z","Axial down · −Z"],axialUp:["轴向朝上 · +Z","Axial up · +Z"],
 tangent:["切向 · +θ","Tangential · +θ"],tangentNeg:["切向 · −θ","Tangential · −θ"]
};
const orientationShort:Record<Direction,[string,string]>={
 out:["朝外","Outward"],in:["朝内","Inward"],axial:["向下 −Z","Down −Z"],axialUp:["向上 +Z","Up +Z"],tangent:["切向 +θ","Tangential +θ"],tangentNeg:["切向 −θ","Tangential −θ"]
};
const stripShort:Record<Direction,[string,string]>={out:["朝外","Out"],in:["朝内","In"],axial:["−Z","−Z"],axialUp:["+Z","+Z"],tangent:["+θ","+θ"],tangentNeg:["−θ","−θ"]};

export default function DesignControls({selectedRing,selected,onRing,onSelect,onCompute,status,filesInDialog=false}:Props){
 const {t,language}=useLanguage(),model=useMRIModel(),baseline=useBaselineMRIModel(),design=useMRIDesign();
 const fileInput=useRef<HTMLInputElement>(null);
 const fileDialog=useRef<HTMLDialogElement>(null);
 const [fileError,setFileError]=useState<[string,string]|null>(null);
 const selectedMagnet=selected?model.magnetById.get(selected):null;
 const ring=selectedMagnet?.ring??selectedRing,radial=selectedMagnet?.radial??1;
 const id=selectedMagnet?.id??ringName(ring)+"-L"+radial+"-A01";
 const original=baseline.magnetById.get(id)!;
 const ringMagnets=model.magnets.filter(item=>item.ring===ring);
 // Saved designs can contain individual edits. Always inspect all actual members.
 const targets=selectionTargets(model,id,"layer");
 const counts=EDIT_DIRECTIONS.map(direction=>({direction,count:targets.filter(item=>item.direction===direction).length})).filter(item=>item.count);
 const uniform=counts.length===1?counts[0].direction:null;
 const copy=(direction:Direction)=>t(...orientationCopy[direction]);
 const action=(callback:()=>void)=>()=>{setFileError(null);callback();};
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
 const fileContent=<>
  <div className="design-file-actions">
   <Button onClick={action(design.save)} disabled={!design.storageReady} aria-label={t("保存设计","Save design")}><Save size={15}/>{t("保存设计","Save design")}</Button>
   <Button variant="outline" disabled={!design.storageReady||!design.hasSaved} onClick={action(design.restore)}><FolderOpen size={15}/>{t("加载已保存","Load saved")}</Button>
   <Button variant="outline" onClick={action(download)}><Download size={15}/>{t("下载 JSON","Download JSON")}</Button>
   <Button variant="outline" onClick={()=>fileInput.current?.click()}><Upload size={15}/>{t("导入 JSON","Import JSON")}</Button>
  </div>
  {design.notice?.type==="success"&&<p className="design-notice success" role="status">{t(design.notice.zh,design.notice.en)}</p>}
  {filesInDialog&&design.notice?.type==="error"&&<p className="design-notice error" role="alert">{t(design.notice.zh,design.notice.en)}</p>}
  {filesInDialog&&fileError&&<p className="design-notice error" role="alert">{t(...fileError)}</p>}
  <p className="magnet-design-note">{t("初始场自动载入。修改后点击计算；结果对应点击时的排布，后续修改需要再次计算。保存只记录方向，保存在此浏览器；JSON 可分享和恢复。","The initial field loads automatically. After editing, click Compute. Results use the layout at that click; later changes need another Compute. Save stores orientations in this browser; JSON files can be shared and restored.")}</p>
  <p className="magnet-original-direction">{t("此磁铁初始方向：","This magnet's initial direction: ")}{copy(original.direction)} · {id}</p>
  <p className="magnet-design-note">{t("导入文件可以保留同层的单块差异；方向按钮会统一所选径向位置。加载、导入和重置均可撤销。","Imports can preserve individual differences within a layer. Direction buttons unify the selected radial position. Loading, importing and resetting can be undone.")}</p>
  {design.savedAt&&<p className="magnet-design-storage">{t("上次保存：","Last saved: ")}{new Date(design.savedAt).toLocaleString(language==="zh"?"zh-CN":"en-US")}</p>}
 </>;
 return <section className="magnet-design" aria-label={t("磁铁方向设计","Magnet orientation designer")} data-edit-scope="layer">
  <div className="magnet-design-heading"><h2>{t("修改磁铁方向","Edit magnet direction")}</h2><span className={"design-save-state "+(design.isSaved?"is-saved":"is-dirty")} data-modified-count={design.modifiedCount}>{design.modifiedCount}{t(" 块已改"," edited")}</span></div>
  <div className="magnet-design-editor">
   <label className="basic-ring-picker"><span>{t("1 · 选择磁层","1 · Choose a layer")}</span><select value={ring} onChange={event=>{setFileError(null);onRing(Number(event.currentTarget.value));}} aria-label={t("选择磁层","Choose a layer")}>{model.rings.map(item=><option key={item.id} value={item.id}>{ringName(item.id)}</option>)}</select></label>
   <div className="layer-strip-heading"><span>{t("2 · 选择径向位置","2 · Choose a radial position")}</span><span>{t("由内到外","Inner to outer")}</span></div>
   <div className="edit-layer-strip" role="group" aria-label={t("放大的径向排布条","Enlarged radial layer strip")}>{model.rings[ring-1].directions.map((_,index)=>{
    const members=ringMagnets.filter(item=>item.radial===index+1),same=members.every(item=>item.direction===members[0].direction);
    const label=same?t(...stripShort[members[0].direction]):t("混合","Mixed");
    return <Button key={index} variant="outline" aria-pressed={radial===index+1} aria-label={"L"+(index+1)+" · "+(same?copy(members[0].direction):t("混合方向","Mixed orientations"))} onClick={()=>{onSelect(ringName(ring)+"-L"+(index+1)+"-A01");setFileError(null);}}><b>L{index+1}</b><span>{label}</span></Button>;
   })}</div>
   <p className="target-summary" data-target-count={targets.length} aria-live="polite">{ringName(ring)} · L{radial} · <strong>{targets.length}</strong>{t(" 颗磁铁"," magnets")}</p>
   {!uniform&&<ul className="mixed-direction-counts" aria-label={t("当前方向数量","Current orientation counts")}>{counts.map(item=><li key={item.direction}>{copy(item.direction)} <b>{item.count}</b></li>)}</ul>}
   <div className="orientation-editor"><div className="orientation-editor-title"><strong>{t("3 · 选择 N 极方向","3 · Choose N-pole direction")}</strong><span>S → N</span></div>
    <div className="orientation-presets" role="group" aria-label={t("选中磁铁的 N 极方向","Selected magnet N-pole orientation")}>{EDIT_DIRECTIONS.map(direction=><Button key={direction} variant="outline" aria-label={copy(direction)} title={copy(direction)} aria-pressed={uniform===direction} onClick={()=>{design.setDirections(targets.map(item=>({id:item.id,direction})));setFileError(null);}}>{t(...orientationShort[direction])}</Button>)}</div>
   </div>
  </div>
  <p className="design-edit-hint">{uniform?t("同一径向位置的 28 颗一起修改。","All 28 magnets at this radial position change together."):t("此位置包含混合方向；修改会统一 28 颗，可撤销。","This position has mixed orientations. Editing unifies all 28 magnets; one undo restores them.")}</p>
  <Button className="compute-field-button" onClick={onCompute} disabled={status==="computing"} aria-label={t("计算磁场","Compute field")}>{status==="computing"?t("计算中…","Computing…"):t("计算磁场","Compute field")}</Button>
  <div className="magnet-design-toolbar" role="group" aria-label={t("设计历史","Design history")}>
   <Button variant="outline" disabled={!design.canUndo} onClick={action(design.undo)} aria-label={t("撤销","Undo")}><Undo2 size={15}/>{t("撤销","Undo")}</Button>
   <Button variant="outline" disabled={!design.canRedo} onClick={action(design.redo)} aria-label={t("重做","Redo")}><Redo2 size={15}/>{t("重做","Redo")}</Button>
   <Button variant="outline" disabled={design.modifiedCount===0} onClick={action(design.reset)} aria-label={t("重置设计","Reset design")}><RotateCcw size={15}/>{t("重置","Reset")}</Button>
  </div>
  {!filesInDialog&&design.notice?.type==="error"&&<p className="design-notice error" role="alert">{t(design.notice.zh,design.notice.en)}</p>}
  {!filesInDialog&&fileError&&<p className="design-notice error" role="alert">{t(...fileError)}</p>}
  {filesInDialog?<>
   <button className="design-file-trigger" type="button" onClick={()=>fileDialog.current?.showModal()}>{t("保存与文件","Save & files")}{!design.isSaved&&<span>{t("未保存","Unsaved")}</span>}</button>
   <dialog ref={fileDialog} className="design-file-dialog" aria-labelledby="transverse-design-files-title">
    <header><h3 id="transverse-design-files-title">{t("保存与文件","Save & files")}</h3><button type="button" className="design-file-dialog-close" aria-label={t("关闭文件窗口","Close file window")} onClick={()=>fileDialog.current?.close()}>×</button></header>
    {fileContent}
   </dialog>
  </>:<details className="workbench-disclosure design-file-details"><summary>{t("保存与文件","Save & files")}{!design.isSaved&&<span className="basic-file-unsaved"> · {t("未保存","Unsaved")}</span>}</summary>{fileContent}</details>}
  <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label={t("选择设计 JSON 文件","Choose design JSON file")} onChange={event=>{void importFile(event.currentTarget.files?.[0]);event.currentTarget.value="";}}/>
 </section>;
}
