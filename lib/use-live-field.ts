"use client";
import {useEffect,useRef,useState} from "react";
import {useMRIModel,useBaselineMRIModel} from "./mri-context";
import {sourcesFor} from "./field";
import {LiveFieldClient,type LiveStatus} from "./live-field-client";
import type {LiveFieldResult,LiveFieldProgress} from "./live-field";
export function useLiveField(){
 const model=useMRIModel(),baseline=useBaselineMRIModel();
 const current=useRef(model);current.current=model;const requested=useRef<typeof model|null>(null);
 const client=useRef<LiveFieldClient|null>(null);
 const [state,setState]=useState<{model:typeof model|null;status:LiveStatus;data:LiveFieldResult|null;progress:LiveFieldProgress|null}>({model:null,status:"idle",data:null,progress:null});
 useEffect(()=>{
  const solver=new LiveFieldClient(reply=>{
   if(requested.current!==current.current)return;
   if(reply.type==="result")setState({model:current.current,status:"ready",data:reply,progress:null});
   else if(reply.type==="progress")setState(previous=>({...previous,status:"computing",progress:reply}));
   else {console.error("Live field:",reply.message);setState({model:current.current,status:"error",data:null,progress:null});}
  });client.current=solver;
  return ()=>{solver.dispose();client.current=null;};
 },[]);
 useEffect(()=>{
  setState({model,status:"computing",data:null,progress:null});
  const timer=setTimeout(()=>{try{requested.current=model;client.current?.solve({schemeId:model.id,baseline:sourcesFor(baseline),current:sourcesFor(model),angle:model.angularOffset,baselineAssetURL:"/live-field-baseline-"+model.id+".bin"});}catch(error){console.error("Starting live field:",error);setState({model,status:"error",data:null,progress:null});}},160);
  return ()=>{clearTimeout(timer);client.current?.cancel();};
 },[model,baseline]);
 return {data:state.model===model&&state.status==="ready"?state.data:null,status:state.model===model?state.status:"computing",progress:state.model===model?state.progress:null};
}
