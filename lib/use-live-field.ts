"use client";
import {useEffect,useRef,useState} from "react";
import {useMRIModel,useBaselineMRIModel} from "./mri-context";
import {sourcesFor} from "./field";
import {LiveFieldClient,type LiveStatus} from "./live-field-client";
import type {MRIModel} from "./mri";
import type {LiveFieldResult,LiveFieldProgress} from "./live-field";
export interface FieldSnapshot{model:MRIModel;data:LiveFieldResult;}
export function useLiveField(){
 const model=useMRIModel(),baseline=useBaselineMRIModel();
 const current=useRef(model);current.current=model;const requested=useRef<MRIModel|null>(null);
 const client=useRef<LiveFieldClient|null>(null);
 const [lastCompleted,setLastCompleted]=useState<FieldSnapshot|null>(null);
 const [state,setState]=useState<{model:MRIModel|null;status:LiveStatus;data:LiveFieldResult|null;progress:LiveFieldProgress|null}>({model:null,status:"idle",data:null,progress:null});
 useEffect(()=>{
  const solver=new LiveFieldClient(reply=>{
   if(requested.current!==current.current)return;
   if(reply.type==="result"){
    setLastCompleted({model:current.current,data:reply});
    setState({model:current.current,status:"ready",data:reply,progress:null});
   }else if(reply.type==="progress")setState(previous=>({...previous,status:"computing",progress:reply}));
   else {console.error("Live field:",reply.message);setState({model:current.current,status:"error",data:null,progress:null});}
  });client.current=solver;
  return ()=>{solver.dispose();client.current=null;};
 },[]);
 useEffect(()=>{
  setState({model,status:"computing",data:null,progress:null});
  const timer=setTimeout(()=>{try{requested.current=model;client.current?.solve({schemeId:model.id,baseline:sourcesFor(baseline),current:sourcesFor(model),angle:model.angularOffset,baselineAssetURL:"/live-field-baseline-"+model.id+".bin"});}catch(error){console.error("Starting live field:",error);setState({model,status:"error",data:null,progress:null});}},160);
  return ()=>{clearTimeout(timer);client.current?.cancel();};
 },[model,baseline]);
 useEffect(()=>{setLastCompleted(snapshot=>snapshot?.model.id===model.id?snapshot:null);},[model.id]);
 return {data:state.model===model&&state.status==="ready"?state.data:null,status:state.model===model?state.status:"computing",progress:state.model===model?state.progress:null,lastCompleted:lastCompleted?.model.id===model.id?lastCompleted:null};
}
