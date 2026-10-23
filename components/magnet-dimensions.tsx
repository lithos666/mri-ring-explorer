"use client";
import {ArrowUpRight,Download} from "lucide-react";
import {useLanguage} from "@/lib/language-context";

export default function MagnetDimensions(){
 const {language,t}=useLanguage();
 const asset="/diagrams/mri-14-layer-edge-dimensions-"+language;
 return <section id="magnet-dimensions" data-testid="magnet-dimensions" className="magnet-dimensions" aria-labelledby="magnet-dimensions-title">
  <div className="magnet-dimensions-heading">
   <div>
    <h2 id="magnet-dimensions-title">{t("14 层边缘尺寸","14-layer edge dimensions")}</h2>
    <p>{t("MATLAB 初始排布 · 单位 mm · 12 mm 方块 · 相邻环面间净距 26 mm","Initial MATLAB layout · Dimensions in mm · 12 mm cubes · 26 mm face-to-face layer gaps")}</p>
   </div>
   <nav className="magnet-dimensions-actions" aria-label={t("尺寸图查看与下载","View and download the dimension diagram")}>
    <a href={asset+".svg"} target="_blank" rel="noopener noreferrer" aria-label={t("查看尺寸大图（在新标签页打开）","View the full-size dimension diagram (opens in a new tab)")}>
     {t("查看大图","View full size")}<ArrowUpRight size={15} aria-hidden="true"/>
    </a>
    <a href={asset+".png"} download={"mri-14-layer-edge-dimensions-"+language+".png"} aria-label={t("下载 PNG 尺寸图","Download the PNG dimension diagram")} title={t("下载 PNG 尺寸图","Download the PNG dimension diagram")}>
     <Download size={15} aria-hidden="true"/>PNG
    </a>
    <a href={asset+".svg"} download={"mri-14-layer-edge-dimensions-"+language+".svg"} aria-label={t("下载 SVG 尺寸图","Download the SVG dimension diagram")} title={t("下载 SVG 尺寸图","Download the SVG dimension diagram")}>
     <Download size={15} aria-hidden="true"/>SVG
    </a>
   </nav>
  </div>
  <figure>
   <img data-testid="magnet-dimensions-image" src={asset+".svg"} width={1800} height={710} loading="lazy" decoding="async" alt={t("新版 14 层 MRI 初始排布的磁铁边缘尺寸图，标注径向与轴向尺寸，单位毫米。","Magnet edge dimensions for the initial 14-layer MRI layout, with radial and axial dimensions in millimetres.")}/>
   <figcaption>{t("箭头表示初始磁化方向；修改方向不改变尺寸。","Arrows show initial magnetization; changing magnet directions does not change dimensions.")}</figcaption>
  </figure>
 </section>;
}
