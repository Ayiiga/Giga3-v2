import JSZip from "jszip";
import { documentAppearance, type DocumentAppearance } from "@/lib/documents/designs";
import type { GigaDocument } from "@/lib/documents/types";
import { tipTapJsonToMarkdown } from "@/lib/documents/model";

/** Small, dependency-light editable PowerPoint export (OOXML). */
const NS = {
  p: "http://schemas.openxmlformats.org/presentationml/2006/main",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  pr: "http://schemas.openxmlformats.org/package/2006/relationships",
};
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const SW = 12192000; // 13.333 in, 16:9
const SH = 6858000; // 7.5 in

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function plain(value: string): string {
  return value.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|\*|\x60/g, "").trim();
}

type SlideContent = { title: string; lines: string[] };

function splitLongLine(line: string, max = 108): string[] {
  const words = line.split(/\s+/);
  const pieces: string[] = [];
  let part = "";
  for (const word of words) {
    if (part.length && (part + " " + word).length > max) {
      pieces.push(part);
      part = "";
    }
    if (word.length > max) {
      if (part) { pieces.push(part); part = ""; }
      for (let i = 0; i < word.length; i += max) pieces.push(word.slice(i, i + max));
    } else part += (part ? " " : "") + word;
  }
  if (part) pieces.push(part);
  return pieces;
}

/** Keep all document text: create continuation slides instead of dropping overflow. */
export function slidesFromDocument(doc: GigaDocument): SlideContent[] {
  const markdown = doc.markdown || tipTapJsonToMarkdown(doc.content);
  const sections: SlideContent[] = [];
  let title = doc.title || "Presentation";
  let current: SlideContent | null = null;
  for (const sourceLine of markdown.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line === "---") continue;
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const headingText = plain(heading[2]);
      if (heading[1].length === 1 && sections.length === 0 && !current) {
        title = headingText;
        continue;
      }
      if (current) sections.push(current);
      current = { title: headingText, lines: [] };
    } else {
      if (!current) current = { title: "Overview", lines: [] };
      const clean = plain(line.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, ""));
      if (clean) current.lines.push(...splitLongLine(clean));
    }
  }
  if (current) sections.push(current);
  const slides: SlideContent[] = [{ title, lines: [] }];
  for (const section of sections) {
    if (!section.lines.length) {
      slides.push(section);
      continue;
    }
    const lines = section.lines;
    for (let start = 0; start < lines.length; start += 6) {
      slides.push({
        title: start ? `${section.title} (continued)` : section.title,
        lines: lines.slice(start, start + 6),
      });
    }
  }
  if (slides.length > 200) throw new Error("This document is too long for one presentation. Export it as PDF/Word, or create a shorter slide summary.");
  return slides;
}

function shape(id: number, name: string, text: string[], x: number, y: number, w: number, h: number, size: number, color: string, font: string): string {
  const paragraphs = text.map((v) => `<a:p><a:pPr marL="0" marR="0" algn="l"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="${size}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/></a:rPr><a:t>${esc(v)}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p>`).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}

const SP_TREE = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

function slideXml(slide: SlideContent, index: number, appearance: DocumentAppearance): string {
  const accent = appearance.color.substring(1).toUpperCase();
  const isCover = index === 0;
  const darkCover = isCover && appearance.treatment === "signature";
  const background = darkCover ? accent : isCover && appearance.treatment === "band" ? "EDF1F5" : "FFFFFF";
  const color = darkCover ? "FFFFFF" : accent;
  const font = appearance.serif ? "Georgia" : "Aptos";
  const title = shape(2, "Title", [slide.title], 720000, isCover ? 1900000 : 490000, 10800000, 1170000, isCover ? 4200 : 3500, color, font);
  const body = slide.lines.length
    ? shape(3, "Body", slide.lines.map(x => "•  " + x), 830000, 1800000, 10400000, 4300000, 2400, "263649", font)
    : "";
  const accentRule = appearance.treatment === "plain" ? "" : `<p:sp><p:nvSpPr><p:cNvPr id="4" name="Accent rule"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="720000" y="${isCover ? 1510000 : 1540000}"/><a:ext cx="${isCover ? 1180000 : 870000}" cy="53000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
  return XML + `<p:sld xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${SP_TREE}${accentRule}${title}${body}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
const RELS_ROOT = `xmlns="${NS.pr}"`;
const rel = (id: string, type: string, target: string) =>
  `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;

function themeXml(): string {
  const colors = ["dk1:sysClr val=\"windowText\" lastClr=\"000000\"", "lt1:sysClr val=\"window\" lastClr=\"FFFFFF\"", "dk2:srgbClr val=\"1E1B4B\"", "lt2:srgbClr val=\"F8FAFC\"", "accent1:srgbClr val=\"5B21B6\"", "accent2:srgbClr val=\"2563EB\"", "accent3:srgbClr val=\"0891B2\"", "accent4:srgbClr val=\"16A34A\"", "accent5:srgbClr val=\"EA580C\"", "accent6:srgbClr val=\"CA8A04\"", "hlink:srgbClr val=\"2563EB\"", "folHlink:srgbClr val=\"7C3AED\""];
  const clr = colors.map((item) => {
    const i = item.indexOf(":");
    const tag = item.slice(0, i);
    const element = item.includes(":sysClr") ? "sysClr" : "srgbClr";
    const attrs = item.slice(i + 1 + element.length).trim();
    return `<a:${tag}><a:${element} ${attrs}/></a:${tag}>`;
  }).join("");
  return XML + `<a:theme xmlns:a="${NS.a}" name="Giga3 AI"><a:themeElements><a:clrScheme name="Giga3">${clr}</a:clrScheme><a:fontScheme name="Giga3"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="Giga3"><a:fillStyleLst><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}

export async function exportDocumentPptx(doc: GigaDocument): Promise<Uint8Array> {
  const slides = slidesFromDocument(doc);
  const zip = new JSZip();
  const overrides = [
    ["presentation", "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"],
    ["slideMasters/slideMaster1", "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"],
    ["slideLayouts/slideLayout1", "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"],
    ["theme/theme1", "application/vnd.openxmlformats-officedocument.theme+xml"],
  ];
  const contentTypes = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides.map(([name,type]) => `<Override PartName="/ppt/${name}.xml" ContentType="${type}"/>`).join("")}${slides.map((_,i) => `<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  zip.file("[Content_Types].xml", XML + contentTypes);
  zip.file("_rels/.rels", XML + `<Relationships ${RELS_ROOT}>${rel("rId1","officeDocument","ppt/presentation.xml")}<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.file("docProps/core.xml", XML + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(doc.title)}</dc:title><dc:creator>Giga3 AI</dc:creator></cp:coreProperties>`);
  zip.file("docProps/app.xml", XML + `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Giga3 AI</Application><Slides>${slides.length}</Slides></Properties>`);
  const ids = slides.map((_,i) => `<p:sldId id="${256+i}" r:id="rId${i+2}"/>`).join("");
  zip.file("ppt/presentation.xml", XML + `<p:presentation xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${SW}" cy="${SH}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", XML + `<Relationships ${RELS_ROOT}>${rel("rId1","slideMaster","slideMasters/slideMaster1.xml")}${slides.map((_,i) => rel(`rId${i+2}`,"slide",`slides/slide${i+1}.xml`)).join("")}</Relationships>`);
  zip.file("ppt/theme/theme1.xml", themeXml());
  zip.file("ppt/slideMasters/slideMaster1.xml", XML + `<p:sldMaster xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"><p:cSld><p:spTree>${SP_TREE}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" tx1="dk1" tx2="dk2" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", XML + `<Relationships ${RELS_ROOT}>${rel("rId1","slideLayout","../slideLayouts/slideLayout1.xml")}${rel("rId2","theme","../theme/theme1.xml")}</Relationships>`);
  zip.file("ppt/slideLayouts/slideLayout1.xml", XML + `<p:sldLayout xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}" type="blank" preserve="1" showMasterSp="0"><p:cSld name="Blank"><p:spTree>${SP_TREE}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", XML + `<Relationships ${RELS_ROOT}>${rel("rId1","slideMaster","../slideMasters/slideMaster1.xml")}</Relationships>`);
  const appearance = documentAppearance(doc);
  slides.forEach((slide, i) => {
    zip.file(`ppt/slides/slide${i+1}.xml`, slideXml(slide, i, appearance));
    zip.file(`ppt/slides/_rels/slide${i+1}.xml.rels`, XML + `<Relationships ${RELS_ROOT}>${rel("rId1","slideLayout","../slideLayouts/slideLayout1.xml")}</Relationships>`);
  });
  return new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}
