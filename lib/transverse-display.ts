/** Rendering helpers only: none of these functions modifies magnetic-field data. */
// Exported from installed MATLAB R2022a figure(2)'s colormap after `colormap jet`.
// Source palette evidence: work/qa/matlab-display-audit/matlab-jet.json.
export const MATLAB_JET:ReadonlyArray<ReadonlyArray<number>>=[[0,0,0.515625],[0,0,0.53125],[0,0,0.546875],[0,0,0.5625],[0,0,0.578125],[0,0,0.59375],[0,0,0.609375],[0,0,0.625],[0,0,0.640625],[0,0,0.65625],[0,0,0.671875],[0,0,0.6875],[0,0,0.703125],[0,0,0.71875],[0,0,0.734375],[0,0,0.75],[0,0,0.765625],[0,0,0.78125],[0,0,0.796875],[0,0,0.8125],[0,0,0.828125],[0,0,0.84375],[0,0,0.859375],[0,0,0.875],[0,0,0.890625],[0,0,0.90625],[0,0,0.921875],[0,0,0.9375],[0,0,0.953125],[0,0,0.96875],[0,0,0.984375],[0,0,1],[0,0.015625,1],[0,0.03125,1],[0,0.046875,1],[0,0.0625,1],[0,0.078125,1],[0,0.09375,1],[0,0.109375,1],[0,0.125,1],[0,0.140625,1],[0,0.15625,1],[0,0.171875,1],[0,0.1875,1],[0,0.203125,1],[0,0.21875,1],[0,0.234375,1],[0,0.25,1],[0,0.265625,1],[0,0.28125,1],[0,0.296875,1],[0,0.3125,1],[0,0.328125,1],[0,0.34375,1],[0,0.359375,1],[0,0.375,1],[0,0.390625,1],[0,0.40625,1],[0,0.421875,1],[0,0.4375,1],[0,0.453125,1],[0,0.46875,1],[0,0.484375,1],[0,0.5,1],[0,0.515625,1],[0,0.53125,1],[0,0.546875,1],[0,0.5625,1],[0,0.578125,1],[0,0.59375,1],[0,0.609375,1],[0,0.625,1],[0,0.640625,1],[0,0.65625,1],[0,0.671875,1],[0,0.6875,1],[0,0.703125,1],[0,0.71875,1],[0,0.734375,1],[0,0.75,1],[0,0.765625,1],[0,0.78125,1],[0,0.796875,1],[0,0.8125,1],[0,0.828125,1],[0,0.84375,1],[0,0.859375,1],[0,0.875,1],[0,0.890625,1],[0,0.90625,1],[0,0.921875,1],[0,0.9375,1],[0,0.953125,1],[0,0.96875,1],[0,0.984375,1],[0,1,1],[0.015625,1,0.984375],[0.03125,1,0.96875],[0.046875,1,0.953125],[0.0625,1,0.9375],[0.078125,1,0.921875],[0.09375,1,0.90625],[0.109375,1,0.890625],[0.125,1,0.875],[0.140625,1,0.859375],[0.15625,1,0.84375],[0.171875,1,0.828125],[0.1875,1,0.8125],[0.203125,1,0.796875],[0.21875,1,0.78125],[0.234375,1,0.765625],[0.25,1,0.75],[0.265625,1,0.734375],[0.28125,1,0.71875],[0.296875,1,0.703125],[0.3125,1,0.6875],[0.328125,1,0.671875],[0.34375,1,0.65625],[0.359375,1,0.640625],[0.375,1,0.625],[0.390625,1,0.609375],[0.40625,1,0.59375],[0.421875,1,0.578125],[0.4375,1,0.5625],[0.453125,1,0.546875],[0.46875,1,0.53125],[0.484375,1,0.515625],[0.5,1,0.5],[0.515625,1,0.484375],[0.53125,1,0.46875],[0.546875,1,0.453125],[0.5625,1,0.4375],[0.578125,1,0.421875],[0.59375,1,0.40625],[0.609375,1,0.390625],[0.625,1,0.375],[0.640625,1,0.359375],[0.65625,1,0.34375],[0.671875,1,0.328125],[0.6875,1,0.3125],[0.703125,1,0.296875],[0.71875,1,0.28125],[0.734375,1,0.265625],[0.75,1,0.25],[0.765625,1,0.234375],[0.78125,1,0.21875],[0.796875,1,0.203125],[0.8125,1,0.1875],[0.828125,1,0.171875],[0.84375,1,0.15625],[0.859375,1,0.140625],[0.875,1,0.125],[0.890625,1,0.109375],[0.90625,1,0.09375],[0.921875,1,0.078125],[0.9375,1,0.0625],[0.953125,1,0.046875],[0.96875,1,0.03125],[0.984375,1,0.015625],[1,1,0],[1,0.984375,0],[1,0.96875,0],[1,0.953125,0],[1,0.9375,0],[1,0.921875,0],[1,0.90625,0],[1,0.890625,0],[1,0.875,0],[1,0.859375,0],[1,0.84375,0],[1,0.828125,0],[1,0.8125,0],[1,0.796875,0],[1,0.78125,0],[1,0.765625,0],[1,0.75,0],[1,0.734375,0],[1,0.71875,0],[1,0.703125,0],[1,0.6875,0],[1,0.671875,0],[1,0.65625,0],[1,0.640625,0],[1,0.625,0],[1,0.609375,0],[1,0.59375,0],[1,0.578125,0],[1,0.5625,0],[1,0.546875,0],[1,0.53125,0],[1,0.515625,0],[1,0.5,0],[1,0.484375,0],[1,0.46875,0],[1,0.453125,0],[1,0.4375,0],[1,0.421875,0],[1,0.40625,0],[1,0.390625,0],[1,0.375,0],[1,0.359375,0],[1,0.34375,0],[1,0.328125,0],[1,0.3125,0],[1,0.296875,0],[1,0.28125,0],[1,0.265625,0],[1,0.25,0],[1,0.234375,0],[1,0.21875,0],[1,0.203125,0],[1,0.1875,0],[1,0.171875,0],[1,0.15625,0],[1,0.140625,0],[1,0.125,0],[1,0.109375,0],[1,0.09375,0],[1,0.078125,0],[1,0.0625,0],[1,0.046875,0],[1,0.03125,0],[1,0.015625,0],[1,0,0],[0.984375,0,0],[0.96875,0,0],[0.953125,0,0],[0.9375,0,0],[0.921875,0,0],[0.90625,0,0],[0.890625,0,0],[0.875,0,0],[0.859375,0,0],[0.84375,0,0],[0.828125,0,0],[0.8125,0,0],[0.796875,0,0],[0.78125,0,0],[0.765625,0,0],[0.75,0,0],[0.734375,0,0],[0.71875,0,0],[0.703125,0,0],[0.6875,0,0],[0.671875,0,0],[0.65625,0,0],[0.640625,0,0],[0.625,0,0],[0.609375,0,0],[0.59375,0,0],[0.578125,0,0],[0.5625,0,0],[0.546875,0,0],[0.53125,0,0],[0.515625,0,0],[0.5,0,0]];
export type TransverseColorMode="local"|"reference";
export interface ColorLimits {min:number;max:number}
export interface TransverseColorScale extends ColorLimits {
 renderMin:number;renderMax:number;span:number;constant:boolean;nearConstant:boolean;
}
export function displayColorScale(current:ColorLimits,reference:ColorLimits,mode:TransverseColorMode):TransverseColorScale {
 const {min,max}=mode==="local"?current:reference;
 if(!Number.isFinite(min)||!Number.isFinite(max)||max<min)throw new Error("Invalid display-only color limits.");
 const span=max-min,epsilon=Number.EPSILON*Math.max(1,Math.abs(min),Math.abs(max))*8;
 const nearConstant=span<=epsilon,constant=span===0;
 // Preserve reported extrema. A representable epsilon-sized renderer interval
 // avoids dividing by zero without inventing a percentage-sized field variation.
 return {min,max,span,constant,nearConstant,renderMin:nearConstant?min-epsilon:min,renderMax:nearConstant?max+epsilon:max};
}
export function colorLegendDecimals(scale:TransverseColorScale,mode:TransverseColorMode):number {
 if(mode==="reference"&&scale.span>=.1)return 3;
 return scale.span>0?Math.min(14,Math.max(6,Math.ceil(-Math.log10(scale.span))+2)):6;
}
/** MATLAB scaled CData maps into a discrete colormap; entries are normalized RGB. */
export function scaledColormapColor(value:number,scale:TransverseColorScale,palette:ReadonlyArray<ReadonlyArray<number>>):[number,number,number] {
 if(!palette.length)throw new Error("An exported colormap is required.");
 const fraction=(value-scale.renderMin)/(scale.renderMax-scale.renderMin),index=Math.max(0,Math.min(palette.length-1,Math.floor(fraction*palette.length))),rgb=palette[index];
 if(rgb.length!==3||rgb.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error("Invalid normalized colormap entry.");
 return rgb.map(v=>Math.round(v*255)) as [number,number,number];
}
export function colormapGradient(palette:ReadonlyArray<ReadonlyArray<number>>):string {
 if(!palette.length)throw new Error("An exported colormap is required.");
 return "linear-gradient(90deg,"+palette.map((rgb,i)=>"rgb("+rgb.map(v=>Math.round(v*255)).join(",")+") "+(i/(palette.length-1||1)*100).toFixed(6)+"%").join(",")+")";
}
