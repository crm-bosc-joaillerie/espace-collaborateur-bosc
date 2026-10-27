import {createPortal} from 'react-dom';
import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
type Note={pochette:string;body:string;revision:number;pending:boolean;author:string;updated_at:string;queued?:boolean};
type Api=(data:Record<string,any>)=>Promise<any>;
const Notes=createContext<{notes:Record<string,Note>;api:Api;principal:boolean;refresh:()=>Promise<void>;replace:(n:Note)=>void}>({notes:{},api:async()=>{throw Error('Notes indisponibles.');},principal:false,refresh:async()=>{},replace:()=>{}});
export function PochetteNotesProvider({api,principal=false,children}:{api:Api;principal?:boolean;children:React.ReactNode}){
 const [notes,setNotes]=useState<Record<string,Note>>({});const mounted=useRef(true),serial=useRef(0);
 const replace=useCallback((n:Note)=>setNotes(old=>({...old,[n.pochette]:n})),[]);
 const refresh=useCallback(async()=>{const id=++serial.current;try{const r=await api({mode:'list'});if(mounted.current&&id===serial.current)setNotes(Object.fromEntries((r.notes||[]).map((n:Note)=>[n.pochette,n])));}catch{/* Retain the latest known notes on a network failure. */}},[api]);
 useEffect(()=>{mounted.current=true;void refresh();const timer=window.setInterval(()=>void refresh(),20000);const update=()=>void refresh();window.addEventListener('focus',update);window.addEventListener('online',update);return()=>{mounted.current=false;serial.current++;clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('online',update)}},[refresh]);
 return <Notes.Provider value={{notes,api,principal,refresh,replace}}>{children}</Notes.Provider>;
}
export function PochetteName({number,children}:{number:any;children:React.ReactNode}){
 const {notes}=useContext(Notes);const pending=notes[String(number||'').trim()]?.pending;
 return <span style={pending?{color:'#B42318',fontWeight:700}:undefined} title={pending?'Note du collaborateur à lire et à marquer comme vue':undefined}>{children}</span>;
}
export function PochetteNote({number}:{number:any}){
 const ctx=useContext(Notes),key=String(number||'').trim(),note=ctx.notes[key];
 const [opened,setOpened]=useState(false),[draft,setDraft]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLTextAreaElement>(null),button=useRef<HTMLButtonElement>(null);const heading=React.useId();
 const close=()=>{if(!busy){setOpened(false);button.current?.focus();}};
 useEffect(()=>{if(opened)input.current?.focus()},[opened]);
 if(!key||key==='—')return null;
 const open=async()=>{setError('');setDraft(note?.body||'');setRevision(note?.revision||0);setOpened(true);void ctx.refresh();};
 const act=async(mode:'save'|'seen')=>{setBusy(true);setError('');try{const r=await ctx.api({mode,number:key,text:draft,revision});ctx.replace(r.note);setRevision(r.note.revision);setDraft(r.note.body);await ctx.refresh();}catch(e){setError(e instanceof Error?e.message:'Enregistrement impossible.');}finally{setBusy(false)}};
 const changed=draft!==(note?.body||'');
 return <><button ref={button} type="button" onClick={e=>{e.stopPropagation();void open()}} style={{padding:'5px 9px',border:'1px solid '+(note?.pending?'#F0A69E':'#D6CBB8'),borderRadius:7,background:note?.pending?'#FFF0EE':'#FAF7F0',color:note?.pending?'#B42318':'#19213D',fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}} title={note?.body||'Ajouter une note partagée'}>{note?.pending?'● Note à lire':note?.body?'Note':'＋ Note'}</button>
 {note?.body&&<span style={{display:'block',fontSize:12,color:'#626879',whiteSpace:'pre-wrap',maxWidth:280,marginTop:4}}>{note.body.length>100?note.body.slice(0,100)+'…':note.body}</span>}{opened&&createPortal(<div onDoubleClick={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} style={{position:'fixed',inset:0,zIndex:25000,background:'#0007',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
 <section role="dialog" aria-modal="true" aria-labelledby={heading} onKeyDown={e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const items=e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),input:not(:disabled)');const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}} style={{width:'100%',maxWidth:620,maxHeight:'90vh',overflowY:'auto',background:'white',color:'#19213D',padding:24,borderRadius:16,textAlign:'left',whiteSpace:'normal',boxShadow:'0 20px 80px #0003'}}>
 <h2 id={heading} style={{fontSize:20,margin:'0 0 8px'}}>Note · Pochette {key}</h2>
 <p style={{fontSize:13,margin:'0 0 16px',color:'#626879'}}>Commune au CRM principal et aux collaborateurs affectés à cette pochette.</p>
 <label style={{fontSize:13,fontWeight:600}}>Note partagée<textarea ref={input} value={draft} maxLength={2000} disabled={busy} onChange={e=>setDraft(e.target.value)} style={{display:'block',width:'100%',minHeight:160,resize:'vertical',border:'1px solid #D6CBB8',borderRadius:8,padding:12,marginTop:6,font:'inherit',fontWeight:400,boxSizing:'border-box'}}/></label>
 {note?.author&&<p style={{fontSize:12,color:'#626879'}}>Dernière modification : {note.author} · {new Date(note.updated_at).toLocaleString('fr-FR')}</p>}
 {note?.queued&&<p role="status" style={{fontSize:13}}>Note conservée sur cet appareil, en attente de synchronisation.</p>}
 {ctx.principal&&note&&<label style={{display:'flex',gap:8,alignItems:'center',marginTop:16,color:'#B42318',fontSize:14}}><input type="checkbox" checked={!note.pending} disabled={!note.pending||busy||changed||note.queued||revision!==note.revision} onChange={()=>void act('seen')}/>Vu — j’ai lu cette note</label>}
 {ctx.principal&&note&&!note.pending&&<p style={{fontSize:12,color:'#52685A'}}>Aucune modification du collaborateur en attente de lecture.</p>}
 {note&&revision!==note.revision&&<p role="alert" style={{color:'#B42318'}}>La note a changé pendant la lecture. Fermez puis rouvrez-la pour lire la dernière version.</p>}
 {error&&<p role="alert" style={{color:'#B42318',fontSize:13}}>{error}</p>}
 <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}><button type="button" disabled={busy} onClick={close} style={{padding:'9px 14px',borderRadius:8,border:'1px solid #D6CBB8',background:'white'}}>Fermer</button><button type="button" disabled={busy||!changed} onClick={()=>void act('save')} style={{padding:'9px 14px',borderRadius:8,border:0,background:'#19213D',color:'white'}}>{busy?'Enregistrement…':'Enregistrer la note'}</button></div>
 </section></div>,document.body)}</>;
}
