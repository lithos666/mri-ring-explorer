import {assemblyPhaseProgress} from "./assembly-timing.ts";

export const CLEAR_COVER_QUARTERS=4;
export const CLIPS_PER_QUARTER=3;
export const TEMPORARY_CLIP_COUNT=CLEAR_COVER_QUARTERS*CLIPS_PER_QUARTER;
export const RETAINER_LOCATIONS=Array.from({length:TEMPORARY_CLIP_COUNT},(_,index)=>({
 index,quarter:Math.floor(index/CLIPS_PER_QUARTER),slot:index%CLIPS_PER_QUARTER,
 angleWithinQuarter:(index%CLIPS_PER_QUARTER+.5)*Math.PI/(2*CLIPS_PER_QUARTER),
}));

/** Eight-second teaching sequence; every quarter remains restrained until
 * its cap has approached, and its three clips leave before final seating. */
export function ringCapQuarterProgress(progress:number,quarter:number){
 const start=.045+quarter*.215,span=.21;
 const phase=(from:number,to:number)=>assemblyPhaseProgress(progress,start+span*from,start+span*to);
 return {approach:phase(0,.3),seat:phase(.65,.82),fasten:phase(.82,1),
  restrained:progress>=start+span*.3,
  clipWithdrawal:(slot:number)=>phase(.34+slot*.055,.51+slot*.055),
 };
}

export function ringClipArrival(progress:number,quarter:number,slot:number){
 const start=.055+quarter*.205+slot*.042;
 return {visible:progress>=start,amount:assemblyPhaseProgress(progress,start,start+.115)};
}
