"use node";
import { BrowseError } from "./browsePolicy";
import { liveWebFetchTimeoutMs, liveWebMaxPageBytes } from "./liveWebConfig";
import { redactSensitivePatterns, validatePublicHttpUrl } from "./liveWebSecurity";
import { fetchPublicDocument } from "./safePublicFetch";
import type { WebPageContent, WebPageReader } from "./types";
const MAX_EXCERPT_CHARS = 480;
const MAX_TEXT_CHARS = 12_000;
function decodeHtmlEntities(text: string): string {
  return text.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'");
}
function extractTitle(html: string): string {
  const match=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s+/g," ").trim()) : "";
}
function validDate(value: unknown): value is string {
  return typeof value==="string" && value.trim().length>0 && Number.isFinite(Date.parse(value));
}
function extractPublicationDate(html: string): string | undefined {
  const wanted=new Set(["article:published_time","datepublished","pubdate","date"]);
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs=new Map<string,string>();
    for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs.set(match[1].toLowerCase(),match[2]??match[3]??match[4]??"");
    const key=(attrs.get("property")??attrs.get("name")??attrs.get("itemprop")??"").toLowerCase();
    const value=attrs.get("content")?.trim();
    if(wanted.has(key)&&validDate(value)) return value;
  }
  const time=html.match(/<time\b[^>]*\bdatetime\s*=\s*["']([^"']+)["'][^>]*>/i)?.[1]?.trim();
  if(validDate(time)) return time;
  const candidates: unknown[]=[];
  const visit=(value:unknown):void=>{
    if(Array.isArray(value)){value.forEach(visit);return;}
    if(!value||typeof value!=="object") return;
    const row=value as Record<string,unknown>;
    candidates.push(row.datePublished,row.dateCreated);
    if(row["@graph"]) visit(row["@graph"]);
  };
  const scripts=html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)??[];
  for(const script of scripts){
    const json=script.replace(/^<script\b[^>]*>/i,"").replace(/<\/script>$/i,"");
    try{visit(JSON.parse(json));}catch{/* malformed JSON-LD is ignored */}
  }
  return candidates.find(validDate);
}
function htmlToText(html:string):string{
  let text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ").replace(/<header[\s\S]*?<\/header>/gi," ").replace(/<footer[\s\S]*?<\/footer>/gi," ").replace(/<nav[\s\S]*?<\/nav>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n\n").replace(/<\/h[1-6]>/gi,"\n\n").replace(/<[^>]+>/g," ");
  text=decodeHtmlEntities(text);
  return text.replace(/\s+\n/g,"\n").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
function buildExcerpt(text:string):string{
  const normalized=text.replace(/\s+/g," ").trim();
  return normalized.length<=MAX_EXCERPT_CHARS?normalized:normalized.slice(0,MAX_EXCERPT_CHARS-1).trim()+"…";
}
export function createFetchPageReader():WebPageReader{
  return {async read(rawUrl,options){
    const validated=validatePublicHttpUrl(rawUrl);
    if(!validated.ok) throw new Error(validated.reason);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),options.timeoutMs);
    try{
      const res=await fetchPublicDocument(validated.url.toString(),{timeoutMs:options.timeoutMs,maxBytes:options.maxBytes,signal:controller.signal});
      const contentType=res.contentType.toLowerCase();
      if(contentType.includes("application/pdf")) throw new Error("PDF detected; its contents were not extracted. PDF text extraction is not enabled.");
      if(!contentType.includes("text/html")&&!contentType.includes("text/plain")&&!contentType.includes("application/xhtml")) throw new Error("Unsupported content type: "+(contentType.split(";")[0]||"unknown"));
      const html=res.body;
      const title=extractTitle(html)||validated.domain;
      const text=redactSensitivePatterns(htmlToText(html).slice(0,MAX_TEXT_CHARS));
      if(!text) throw new Error("No readable text on page");
      const publishedAt=extractPublicationDate(html);
      return {uri:validated.url.toString(),title,domain:validated.domain,text,excerpt:buildExcerpt(text),accessedAt:Date.now(),...(publishedAt?{publishedAt}:{})} satisfies WebPageContent;
    }catch(err){
      if(controller.signal.aborted||(err instanceof BrowseError&&err.code==="timeout")) throw new Error("Page fetch timed out after "+options.timeoutMs+"ms");
      if(err instanceof BrowseError) throw new Error(err.message);
      throw err;
    }finally{clearTimeout(timer);}
  }};
}
export const defaultPageReader=createFetchPageReader();
export function defaultFetchOptions(){return {timeoutMs:liveWebFetchTimeoutMs(),maxBytes:liveWebMaxPageBytes()};}
