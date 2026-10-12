"use client";
import {createContext,useContext,type ReactNode} from "react";

const SceneActivityContext=createContext(true);

/** Keep the laboratory mounted without drawing its hidden WebGL canvases. */
export function SceneActivityProvider({active,children}:{active:boolean;children:ReactNode}){
 return <SceneActivityContext.Provider value={active}>{children}</SceneActivityContext.Provider>;
}
export function useSceneActivity(){return useContext(SceneActivityContext);}
