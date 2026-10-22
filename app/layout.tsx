import type { Metadata } from "next";
import "./globals.css";
import {LanguageProvider} from "@/lib/language-context";
import {siteBranding} from "@/lib/site-branding";
import "./white-theme.css";
import "./workbench.css";
import "./graph-editor.css";
import "./hackathon.css";
export const metadata:Metadata={
 title:`${siteBranding.name} | ${siteBranding.subtitle.zh}`,
 description:"MRI 黑客松双语教学：材料清单、CAD 分步装配、14 层磁体、磁场原理与交互实验、工程资料。",
 icons:{icon:"/brand/mri-hardware-ai-transparent.png",shortcut:"/brand/mri-hardware-ai-transparent.png",apple:"/brand/mri-hardware-ai-transparent.png"}
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="zh-CN"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
