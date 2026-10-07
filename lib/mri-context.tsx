"use client";
import {createContext,useContext,useEffect,useMemo,useReducer,useState} from "react";
import {models,type SchemeId,type MRIModel,type Direction} from "./mri";
import {
 applyOverrides,designReducer,initialDesignState,sameOverrides,exportDesign,validateDesign,DesignValidationError,
 type DirectionOverrides
} from "./design";

export interface DesignNotice{type:"success"|"error";zh:string;en:string;}
export interface MRIDesignContext{
 scheme:SchemeId;overrides:DirectionOverrides;modifiedCount:number;canUndo:boolean;canRedo:boolean;
 isSaved:boolean;savedAt:string|null;hasSaved:boolean;storageReady:boolean;notice:DesignNotice|null;
 setDirection:(id:string,direction:Direction)=>void;undo:()=>void;redo:()=>void;reset:()=>void;
 save:()=>void;restore:()=>void;exportJSON:()=>string;importJSON:(text:string)=>boolean;clearNotice:()=>void;
}
const MRIContext=createContext<MRIModel>(models.latest);
const BaselineContext=createContext<MRIModel>(models.latest);
const DesignContext=createContext<MRIDesignContext|null>(null);
export const designStorageKey=(scheme:SchemeId)=>"mri-design-v1-"+scheme;

export function MRIModelProvider({scheme,children}:{scheme:SchemeId;children:React.ReactNode}){
 const [state,dispatch]=useReducer(designReducer,undefined,initialDesignState);
 const [storageReady,setStorageReady]=useState(false);
 const [notices,setNotices]=useState<Record<SchemeId,DesignNotice|null>>({original:null,latest:null});
 const baseline=models[scheme],entry=state[scheme];
 const model=useMemo(()=>applyOverrides(baseline,entry.overrides),[baseline,entry.overrides]);
 // Read and validate save metadata only. Loading a saved design requires the Restore button.
 useEffect(()=>{
  for(const id of ["original","latest"] as SchemeId[]){
   try{
    const text=localStorage.getItem(designStorageKey(id));if(!text)continue;
    const valid=validateDesign(text,models[id]);
    dispatch({type:"saved",scheme:id,overrides:valid.overrides,at:valid.document.createdAt});
   }catch{/* A corrupt or incompatible save never modifies the current design. */}
  }
  setStorageReady(true);
 },[]);
 const notice=(value:DesignNotice|null)=>setNotices(previous=>({...previous,[scheme]:value}));
 const failure=(error:unknown,zh:string,en:string)=>{
  notice(error instanceof DesignValidationError?{type:"error",zh:error.zh,en:error.en}:{type:"error",zh,en});
 };
 const value:MRIDesignContext={
  scheme,overrides:entry.overrides,modifiedCount:Object.keys(entry.overrides).length,
  canUndo:entry.past.length>0,canRedo:entry.future.length>0,
  isSaved:entry.savedOverrides!==null?sameOverrides(entry.overrides,entry.savedOverrides):Object.keys(entry.overrides).length===0,
  savedAt:entry.savedAt,hasSaved:entry.savedAt!==null,storageReady,notice:notices[scheme],
  setDirection(id,direction){dispatch({type:"edit",scheme,id,direction});notice(null);},
  undo(){dispatch({type:"undo",scheme});notice(null);},
  redo(){dispatch({type:"redo",scheme});notice(null);},
  reset(){dispatch({type:"reset",scheme});notice({type:"success",zh:"已恢复此方案的初始方向，可撤销。",en:"The initial orientations for this configuration were restored. You can undo this action."});},
  save(){
   try{
    const at=new Date().toISOString(),text=exportDesign(baseline,entry.overrides,at);
    localStorage.setItem(designStorageKey(scheme),text);
    dispatch({type:"saved",scheme,overrides:entry.overrides,at});
    notice({type:"success",zh:"已保存在此浏览器。分享给同事请下载设计文件。",en:"Saved in this browser. Download the design file to share it with a colleague."});
   }catch(error){failure(error,"无法保存到此浏览器，请下载设计文件保存。","This browser could not save the design. Download the design file to keep it.");}
  },
  restore(){
   try{
    const text=localStorage.getItem(designStorageKey(scheme));
    if(!text)throw new DesignValidationError("此浏览器还没有保存当前方案。","This configuration has not yet been saved in this browser.");
    const valid=validateDesign(text,baseline);
    dispatch({type:"replace",scheme,overrides:valid.overrides});
    dispatch({type:"saved",scheme,overrides:valid.overrides,at:valid.document.createdAt});
    notice({type:"success",zh:"已加载此方案的保存版本，可撤销。",en:"Loaded the saved version of this configuration. You can undo this action."});
   }catch(error){failure(error,"无法读取浏览器中的设计。","The saved design could not be read from this browser.");}
  },
  exportJSON(){return exportDesign(baseline,entry.overrides);},
  importJSON(text){
   try{
    const valid=validateDesign(text,baseline);
    dispatch({type:"replace",scheme,overrides:valid.overrides});
    notice({type:"success",zh:"已导入当前方案的设计，可撤销。保存后会保留在此浏览器。",en:"Imported the design for this configuration. You can undo this action. Save to keep it in this browser."});
    return true;
   }catch(error){failure(error,"无法导入设计文件。当前设计未改变。","The design file could not be imported. The current design was not changed.");return false;}
  },
  clearNotice(){notice(null);}
 };
 return <BaselineContext.Provider value={baseline}><MRIContext.Provider value={model}><DesignContext.Provider value={value}>{children}</DesignContext.Provider></MRIContext.Provider></BaselineContext.Provider>;
}
export function useMRIModel(){return useContext(MRIContext);}
export function useBaselineMRIModel(){return useContext(BaselineContext);}
export function useMRIDesign(){
 const value=useContext(DesignContext);if(!value)throw new Error("MRIModelProvider is required");return value;
}
