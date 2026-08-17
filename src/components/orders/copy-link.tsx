"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
export function CopyLink({url}:{url:string}){const[copied,setCopied]=useState(false);return <div className="flex gap-2 rounded-xl border bg-card p-2"><input readOnly value={url} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"/><button onClick={async()=>{await navigator.clipboard.writeText(url);setCopied(true)}} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">{copied?<Check className="size-3.5"/>:<Copy className="size-3.5"/>}{copied?"Копирано":"Копирай"}</button></div>}
