/** Teaching playback timing only; these intervals do not change CAD paths. */
export const ASSEMBLY_DURATION_SECONDS=8;
export const ASSEMBLY_EASING="cubic-bezier(0.42,0,0.58,1)";

/** Apple's Core Animation easeInEaseOut curve. Solve the Bézier's X
 * coordinate for elapsed time before evaluating Y; using time as the curve
 * parameter would produce a different acceleration profile. Both end slopes
 * are zero, and every value remains on the original path without overshoot. */
export function assemblyEaseInOut(value:number):number{
 const elapsed=Math.min(1,Math.max(0,value));
 if(elapsed===0||elapsed===1)return elapsed;
 let parameter=elapsed;
 // For these control points dX/dt is at least 0.87; four Newton iterations
 // converge without the unstable near-zero derivatives of general curves.
 for(let i=0;i<4;i++){
  const x=parameter*(1.26+parameter*(-.78+.52*parameter));
  const derivative=1.26+parameter*(-1.56+1.56*parameter);
  parameter-=(x-elapsed)/derivative;
 }
 return Math.min(1,Math.max(0,parameter*parameter*(3-2*parameter)));
}

export function assemblyPhaseProgress(progress:number,start:number,end:number):number{
 return assemblyEaseInOut((progress-start)/(end-start));
}

export const assemblyTiming={
 // Give the viewer a brief orientation, then move without a long idle lead-in.
 primary:[.055,.875],
 firstMagnetColumn:[.055,.63],
 remainingMagnetColumns:[.63,.89],
 acrylicSlide:[.055,.7],
 coverFasteners:[.69,.9],
 temporaryClip:[.055,.72],
 // Maintain temporary restraint while the cap approaches. Only withdraw the
 // clip after the cap has reached the schematic contact plane, then fasten.
 capApproach:[.055,.39],
 temporaryClipRemoval:[.42,.64],
 capFinalSeat:[.65,.76],
 supports:[.055,.64],
 spacers:[.57,.88],
 layers:[.055,.88],
 frameMount:[.055,.86],
 cameraClose:[.01,.07],
 cameraReturn:[.87,1],
 orientationEnd:.025,
 inspectionEnd:.055,
 finalCheckStart:.9,
} as const;

export function assemblyCameraBlend(progress:number):number{
 return assemblyPhaseProgress(progress,...assemblyTiming.cameraClose)*(1-assemblyPhaseProgress(progress,...assemblyTiming.cameraReturn));
}
