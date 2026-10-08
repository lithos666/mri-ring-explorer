"use client";
import DesignDiagram,{type DiagramView} from "./design-diagram";
import DesignFieldStatus from "./design-field-status";
import {FieldSection} from "./field-view";
import {useMRIModel} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
import type {LiveFieldResult,LiveFieldProgress} from "@/lib/live-field";
import type {LiveStatus} from "@/lib/live-field-client";
import type {FieldSnapshot} from "@/lib/use-live-field";
import type {EditScope} from "@/lib/design";
interface Props{ring:number;selected:string|null;scope:EditScope;mode:DiagramView;onMode:(mode:DiagramView)=>void;onSelect:(id:string)=>void;onRing:(ring:number)=>void;reset:number;data:LiveFieldResult|null;status:LiveStatus;progress:LiveFieldProgress|null;lastCompleted:FieldSnapshot|null;}
export default function GraphWorkbench(props:Props){
 const model=useMRIModel(),{t}=useLanguage();
 const snapshot=props.data?{model,data:props.data}:props.lastCompleted;
 const stale=!!snapshot&&snapshot.model!==model;
 return <div className="graph-workspace">
  <div className="graph-edit-pane"><DesignDiagram {...props}/></div>
  <section className={"graph-field-pane"+(stale?" is-stale":"")} aria-label={t("完整阵列磁场预览","Full-array field preview")} data-snapshot-state={stale?"previous":snapshot?"current":"empty"}>
   <div className="graph-pane-heading"><strong>{t("3 · 观察磁场","3 · Observe the field")}</strong><span>{t("全 14 环 · 固定轴截面","All 14 rings · Fixed axial slice")}</span></div>
   <DesignFieldStatus data={props.data} status={props.status} progress={props.progress}/>
   <p className="field-snapshot-label" role="status">{stale?(props.status==="error"?t("上一结果 · 更新失败","Previous result · Update failed"):t("上一结果，正在更新","Previous result · Updating")):snapshot?t("当前结果 · 色标与初始参考值固定","Current result · Fixed scale and initial reference"):t("首次计算中 · 中心读数已更新","First calculation · Center readings updated")}</p>
   {snapshot?<FieldSection compact key={model.id} data={snapshot.data} displayModel={snapshot.model} readOnly={stale} onSelect={props.onSelect}/>:<div className="graph-field-placeholder">{t("正在计算完整三维磁场…","Computing the complete 3D field…")}</div>}
   <p className="graph-field-note">{t("绿色箭头：B 的截面投影 · ⊙ 出图面 / ⊗ 入图面。理想有限磁块计算，尺寸待确认。","Green arrows: projected B · ⊙ out / ⊗ into plane. Ideal finite-cuboid model; dimensions provisional.")}</p>
  </section>
 </div>;
}
