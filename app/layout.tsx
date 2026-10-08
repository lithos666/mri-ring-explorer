import type { Metadata } from "next";
import "./globals.css";
import {LanguageProvider} from "@/lib/language-context";
import "./white-theme.css";
import "./workbench.css";
import "./graph-editor.css";
export const metadata:Metadata={
 title:"磁环实验台 | 14环便携式 MRI",
 description:"交互查看14环IO阵列、梯度与RF线圈，对比排布和线圈改变对场分布及成像参数的影响。理想模型，尺寸待确认。",
 icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="zh-CN"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
