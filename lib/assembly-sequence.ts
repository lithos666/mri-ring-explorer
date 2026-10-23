import {assemblyPhaseProgress} from "./assembly-timing.ts";
import {RETAINER_LOCATIONS} from "./assembly-ring-retainers.ts";

export type AssemblySequenceStage=11|12|13|14|15|16|17|18|19|20|21;
export const isAssemblySequenceStage=(stage:number):stage is AssemblySequenceStage=>stage>=11&&stage<=21;
export function legacyAssemblyScene(stage:number){return ({11:1,12:3,13:4,14:3,15:2,16:4,17:6,18:8,19:9,20:7,21:0} as Record<number,number>)[stage]??stage;}
const clamp=(value:number)=>Math.min(1,Math.max(0,value));
export interface SequenceCapPose {visible:boolean;approach:number;seat:number;fasten:number;restrained:boolean;withdraw:(slot:number)=>number;}
const absent=():SequenceCapPose=>({visible:false,approach:0,seat:0,fasten:0,restrained:false,withdraw:()=>0});
const complete=():SequenceCapPose=>({visible:true,approach:1,seat:1,fasten:1,restrained:true,withdraw:()=>1});
function movingCap(progress:number,start:number,end:number):SequenceCapPose{
 const phase=(from:number,to:number)=>assemblyPhaseProgress(progress,start+(end-start)*from,start+(end-start)*to);
 return {visible:true,approach:phase(0,.28),seat:phase(.65,.82),fasten:phase(.82,1),restrained:progress>=start+(end-start)*.28,withdraw:(slot:number)=>phase(.33+slot*.035,.52+slot*.035)};
}
export function sequenceBaseQuarters(stage:number){return stage<=13?[0,1]:stage===14?[2,3]:[0,1,2,3];}
export function sequenceLoadingProgress(stage:number,progress:number){return stage===14?assemblyPhaseProgress(progress,.16,.76):progress;}
export function sequenceColumnCycle(stage:number,progress:number){return assemblyPhaseProgress(sequenceLoadingProgress(stage,progress),.04,.9)*14;}
export function sequenceColumnPose(stage:number,progress:number,index:number){
 const position=sequenceColumnCycle(stage,progress)-index;
 return {visible:position>.04,drop:32*(1-assemblyPhaseProgress(position,.04,.48)),seated:position>=.48,released:position>=.95};
}
/** Acrylic advances immediately behind the currently held column, never after
 * all fourteen columns have been left exposed on the half-layer. */
export function sequenceCoveredColumns(stage:number,progress:number){
 const cycle=sequenceColumnCycle(stage,progress),whole=Math.floor(cycle);
 return Math.min(14,whole+assemblyPhaseProgress(cycle-whole,.48,.95));
}
export function sequenceCapPose(stage:number,progress:number,quarter:number):SequenceCapPose{
 if(stage===13)return quarter===1?movingCap(progress,.055,.9):absent();
 if(stage===14)return quarter===3&&progress>=.76?movingCap(progress,.77,.97):absent();
 if(stage===15)return quarter===1||quarter===3?complete():absent();
 if(stage===16)return quarter===1||quarter===3?complete():movingCap(progress,quarter===0?.045:.48,quarter===0?.44:.9);
 if(stage>=17)return complete();
 return absent();
}
export function sequenceClipPose(stage:number,progress:number,location:typeof RETAINER_LOCATIONS[number]){
 const half=Math.floor(location.quarter/2),inner=location.quarter%2===0?location.slot===2:location.slot===0;
 const centralCap=half*2+1,remainingCap=[0,2,2,0][location.quarter];
 let visible=false,amount=1,withdrawal=0;
 if(stage===12||stage===14){
  const activeHalf=stage===12?0:1;
  const angleFraction=((location.quarter%2)*3+location.slot+.5)/6;
  const covered=sequenceCoveredColumns(stage,progress),start=angleFraction*14;
  visible=half===activeHalf&&covered>=start;
  amount=assemblyPhaseProgress(covered,start,start+.5);
  if(stage===14&&inner){const cap=sequenceCapPose(stage,progress,centralCap);withdrawal=cap.withdraw(location.slot===2?0:1);visible=visible&&withdrawal<1;}
 }else if(stage===13){
  const cap=sequenceCapPose(stage,progress,centralCap);withdrawal=inner?cap.withdraw(location.slot===2?0:1):0;
  visible=half===0&&withdrawal<1;
 }else if(stage===15){visible=!inner;
 }else if(stage===16){
  const cap=sequenceCapPose(stage,progress,remainingCap);withdrawal=cap.withdraw((location.quarter%2)*2+Math.min(location.slot,1));visible=!inner&&withdrawal<1;
 }
 return {visible,radialOffset:55*(1-amount)+65*withdrawal,inner,remainingCap};
}
export function sequenceCoverFraction(stage:number,progress:number,quarter:number){
 if(stage===11)return 0;
 if(stage===12||stage===14){const half=stage===12?0:1;if(Math.floor(quarter/2)!==half)return 0;return clamp(sequenceCoveredColumns(stage,progress)/7-quarter%2);}
 return sequenceBaseQuarters(stage).includes(quarter)?1:0;
}
