"use client";
import {useCallback,useState} from "react";
import {Box,Magnet,Move,RotateCcw,Scan} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {FieldSection} from "@/components/field-view";
import DesignControls from "@/components/design-controls";
import DesignFieldStatus from "@/components/design-field-status";
import MRIScene from "@/components/mri-scene";
import {DEFAULT_LAYERS} from "@/lib/coils";
import {ringName} from "@/lib/mri";
import {MRIModelProvider,useMRIModel} from "@/lib/mri-context";
import {SceneActivityProvider,useSceneActivity} from "@/lib/scene-activity";
import {useLanguage} from "@/lib/language-context";
import {useLiveField} from "@/lib/use-live-field";
import {useTransverseField} from "@/lib/use-transverse-field";
import TransverseFieldPanel,{type TransversePanelState} from "@/components/transverse-field-panel";
import type {TransverseRangeId} from "@/lib/transverse-ranges";
import {createInitialTransverseDisplayState} from "@/lib/transverse-display-state";
import CylinderFieldReportCard from "@/components/cylinder-field-report";
import FieldDerivation from "@/components/field-derivation";
import "./physics-workbench.css";

/** Keep this provider mounted when the teaching portal changes sections. */
export default function PhysicsWorkbench({active=true}:{active?:boolean}){
 return <SceneActivityProvider active={active}><MRIModelProvider scheme="latest"><BasicLab/></MRIModelProvider></SceneActivityProvider>;
}

function BasicLab(){
 const {t,language}=useLanguage(),model=useMRIModel();
 const [selectedRing,setSelectedRing]=useState(1);
 const [selected,setSelected]=useState<string|null>("R01-L1-A01");
 const [view,setView]=useState<"assembly"|"field"|"transverse">("assembly");
 const [transverseRange,setTransverseRange]=useState<TransverseRangeId>("explore");
 const [transverseDisplay,setTransverseDisplay]=useState(createInitialTransverseDisplayState);
 const [transversePage,setTransversePage]=useState<"map"|"report"|"formula">("map");
 const [reset,setReset]=useState(0);
 const {status,progress,lastCompleted,needsCompute,compute}=useLiveField();
 const snapshot=lastCompleted;
 const sceneActive=useSceneActivity(),transverse=useTransverseField(snapshot,sceneActive&&view==="transverse"&&transversePage==="map",transverseRange);
 const selectMagnet=useCallback((id:string)=>{
  const magnet=model.magnetById.get(id);if(!magnet)return;
  setSelectedRing(magnet.ring);setSelected(id);
 },[model]);
 const selectRing=useCallback((id:number)=>{
  if(!Number.isInteger(id)||id<1||id>model.rings.length)return;
  const radial=Math.min(selected?model.magnetById.get(selected)?.radial??1:1,model.rings[id-1].directions.length);
  setSelectedRing(id);setSelected(ringName(id)+"-L"+radial+"-A01");
 },[model,selected]);
 const computeField=()=>{compute();if(view!=="transverse")setView("field");else setTransversePage("map");};
 const transverseState:TransversePanelState=transverse.status==="error"?"error":transverse.status==="computing"||transverse.status==="loading"||status==="computing"?(transverse.completed?"updating":"loading"):!transverse.completed?"empty":needsCompute||!transverse.matchesSnapshot?"previous":"current";
 const snapshotState=!snapshot?"empty":status==="computing"?"updating":needsCompute?"previous":"current";
 const statusCopy=status==="loading"?t("正在载入初始磁场…","Loading the initial field…")
  :status==="computing"?(snapshot?t("上一结果 · 正在更新","Previous result · Updating"):t("正在计算磁场","Computing the field"))+(progress?" · "+Math.round(progress.done/progress.total*100)+"%":"…")
  :status==="error"?(snapshot?t("计算失败 · 保留上一结果，请重试","Calculation failed · Previous result retained; retry"):t("载入或计算失败，请点击计算重试","Loading or calculation failed; click Compute to retry"))
  :needsCompute?(snapshot?t("上一结果 · 修改待计算","Previous result · Draft changes need Compute"):t("点击计算磁场开始","Click Compute field to start"))
  :snapshot?.data.revision===0?t("初始磁场","Initial field"):t("已计算磁场","Computed field");
 return <section className="app-shell workbench-shell basic-lab" aria-label={t("基础磁场实验","Basic field experiment")} data-model-scheme={model.id} data-selected-ring={selectedRing} data-selected-magnet={selected??""} data-view={view}>
  <div className="mri-workbench basic-lab-workbench" aria-label={t("磁铁方向与磁场","Magnet orientations and field")}>
   <Tabs value={view} onValueChange={value=>{if(value==="assembly"||value==="field"||value==="transverse")setView(value);}} className="model-workspace">
    <div className="model-toolbar">
     <TabsList className="view-tabs" aria-label={t("模型视图","Model views")}>
      <TabsTrigger value="assembly" aria-label={t("3D 模型","3D model")}><Box size={17}/>{t("3D 模型","3D model")}</TabsTrigger>
      <TabsTrigger value="field" aria-label={t("磁场","Field")}><Magnet size={17}/>{t("磁场","Field")}</TabsTrigger>
      <TabsTrigger value="transverse" aria-label={t("横向剖面与 FOV","Transverse & FOV")}><Scan size={17}/>{t("横向剖面 · FOV","Transverse · FOV")}</TabsTrigger>
     </TabsList>
     <Button variant="ghost" className="reset-button" onClick={()=>setReset(value=>value+1)} disabled={view!=="assembly"} aria-label={t("复位视角","Reset camera")} title={t("复位视角","Reset camera")}><RotateCcw size={16}/><span>{t("复位视角","Reset camera")}</span></Button>
    </div>
    {view==="transverse"&&<nav className="transverse-subviews" role="tablist" aria-label={t("横向磁场内容","Transverse field content")}>{([
     ["map",t("场图与 FOV","Map & FOV")],["report",t("三维评估","3D assessment")],["formula",t("公式推导","Derivation")]
    ] as const).map(([id,label])=><button key={id} type="button" id={"transverse-tab-"+id} role="tab" aria-selected={transversePage===id} aria-controls={"transverse-page-"+id} onClick={()=>setTransversePage(id)}>{label}</button>)}</nav>}
    {view!=="transverse"&&<><DesignFieldStatus quiet data={snapshot?.data??null} status={status} progress={progress} needsCompute={needsCompute}/><p className="field-snapshot-label" role="status" data-snapshot-state={snapshotState}>{statusCopy}</p></>}
    <TabsContent value={view} className={view==="transverse"?"scene-panel transverse-scene-panel":"scene-panel"}>
     {view!=="transverse"&&<div className="scene-topline"><div><h2>{view==="assembly"?t("14 层磁体阵列","14-layer magnet array"):t("全阵列磁场截面","Full-array field slice")}</h2></div><span className="scene-selection">{ringName(selectedRing)}</span></div>}
     {view==="assembly"?<MRIScene basic layers={DEFAULT_LAYERS} gradientAxis="all" rfPhase={0} field={false} fieldData={null} ring={selectedRing} selected={selected} mode="assembly" expansion={0} arrows={true} reset={reset} onSelect={selectMagnet}/>
      :view==="transverse"?<div className="transverse-viewport" id={"transverse-page-"+transversePage} role="tabpanel" aria-labelledby={"transverse-tab-"+transversePage} data-transverse-page={transversePage}>
       {transversePage==="map"?<><TransverseFieldPanel rangeId={transverseRange} onRangeChange={setTransverseRange} result={transverse.completed?.data??null} baseline={transverse.baseline} baselineWide={transverse.baselineWide} displayState={transverseDisplay} onDisplayStateChange={setTransverseDisplay} displayModel={transverse.completed?.model??null} state={transverseState} progress={transverse.progress}/>{transverse.status==="error"&&<button className="transverse-retry" onClick={transverse.retry}>{t("重新载入横向场","Retry transverse field")}</button>}</>
        :transversePage==="report"?<CylinderFieldReportCard standalone model={snapshot?.model??null} baseline={snapshot?.baseline??null} state={snapshotState}/>
        :<FieldDerivation language={language}/>}</div>
      :snapshot?<FieldSection compact key={snapshot.model.id} data={snapshot.data} displayModel={snapshot.model} selected={selected} readOnly={status==="computing"} onSelect={selectMagnet}/>
       :<div className="scene-message">{status==="loading"?t("初始磁场自动载入，无需点击计算。","The initial field loads automatically; no Compute click is needed."):t("点击「计算磁场」重试。","Click Compute field to retry.")}</div>}
     {view==="assembly"&&<div className="scene-bottomline"><div className="legend-poles"><span><i className="north-swatch"/>{t("N 极侧","N pole")}</span><span><i className="south-swatch"/>{t("S 极侧","S pole")}</span></div><span className="scene-units">14 × 28 · 1,736</span></div>}
    </TabsContent>
    <div className="interaction-hint"><span><Move size={13}/>{view==="assembly"?t("拖动旋转 · 滚轮缩放 · 右键平移","Drag to rotate · Scroll to zoom · Right-drag to pan"):view==="transverse"?t("1 mm 网格 · 全 14 层叠加 · 调整 FOV 不改变磁铁","1 mm grid · All 14 layers · FOV changes do not edit magnets"):t("全 14 层 · 固定色标 · 点击空气区域读取磁场","All 14 layers · Fixed color scale · Click an air point to probe")}</span></div>
   </Tabs>
   <aside className="design-inspector" aria-label={t("磁铁方向修改","Edit magnet orientations")}>
    <DesignControls filesInDialog={view!=="assembly"} selectedRing={selectedRing} selected={selected} onRing={selectRing} onSelect={selectMagnet} onCompute={computeField} status={status}/>
   </aside>
  </div>
 </section>;
}
