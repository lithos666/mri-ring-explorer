"use client";
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import {siteBranding} from "./site-branding";
export type Language="zh"|"en";
export type Translator=(zh:string,en:string)=>string;
const LanguageContext=createContext<{language:Language;setLanguage:(language:Language)=>void;t:Translator}|null>(null);
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [language,setLanguage]=useState<Language>("zh"),[ready,setReady]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem("mri-language");if(saved==="zh"||saved==="en")setLanguage(saved);}catch{}setReady(true);},[]);
 useEffect(()=>{document.documentElement.lang=language==="zh"?"zh-CN":"en";document.title=`${siteBranding.name} | ${siteBranding.subtitle[language]}`;if(ready){try{localStorage.setItem("mri-language",language);}catch{}}},[language,ready]);
 const t=useCallback<Translator>((zh,en)=>language==="zh"?zh:en,[language]);
 const value=useMemo(()=>({language,setLanguage,t}),[language,t]);
 return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){const value=useContext(LanguageContext);if(!value)throw new Error("LanguageProvider is required");return value;}
export const directionEnglish={out:"Radially outward",in:"Radially inward",axial:"Axially downward (−Z)",axialUp:"Axially upward (+Z)",tangent:"Tangential +θ",tangentNeg:"Tangential −θ"};
export const shortEnglish={out:"Out",in:"In",axial:"Axial",axialUp:"Axial↑",tangent:"Tan+",tangentNeg:"Tan−"};
