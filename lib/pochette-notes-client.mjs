// Uses the existing account-encrypted vault and its 15-minute retry loop.
export function createNoteClient(send,getVault,collaborator=false){
 return async input=>{
  const v=await getVault();
  const list=async()=>v.atomic(s=>{
   const map=Object.fromEntries((s.meta['pochette-notes']||[]).map(n=>[n.pochette,n]));
   for(const j of s.jobs.filter(j=>j.module==='pochetteNotes'))map[j.row.data.number]=j.row.data.snapshot;
   return {notes:Object.values(map)};
  });
  if(input.mode==='list'){
   if(navigator.onLine){try{const r=await send(input);await v.meta('pochette-notes',r.notes||[]);}catch(e){if(e.status&&e.status<500&&e.status!==429)throw e}}
   return list();
  }
  if(input.mode==='seen'){
   if(!navigator.onLine||await v.atomic(s=>s.jobs.some(j=>j.module==='pochetteNotes'&&j.row.data.number===input.number)))throw Error('Attendez la synchronisation de la note avant de la marquer comme vue.');
   return send(input);
  }
  if(navigator.onLine){try{return await send(input)}catch(e){if(!(e instanceof TypeError)&&!['AbortError','TimeoutError'].includes(e.name)&&!(e.status>=500||e.status===429))throw e}}
  const snapshot=await v.atomic(s=>{
   const old=s.jobs.find(j=>j.module==='pochetteNotes'&&j.row.data.number===input.number);
   if(old?.error)throw Error('Cette note présente un conflit. Consultez les opérations en attente.');
   if(old?.attempted)throw Error('La synchronisation de cette note est en cours. Attendez sa confirmation.');
   const revision=old?.row.data.revision??input.revision;
   const cached=(s.meta['pochette-notes']||[]).find(n=>n.pochette===input.number);
   const snapshot={pochette:input.number,body:input.text,revision:revision+1,pending:collaborator||!!cached?.pending,author:'En attente de synchronisation',updated_at:new Date().toISOString(),queued:true};
   const row={id:'note:'+input.number,record_key:'note:'+input.number,data:{...input,revision,note:input.text,no:input.number,label:'Note de pochette',snapshot}};
   if(old){old.row=row;old.id=crypto.randomUUID()}else s.jobs.push({id:crypto.randomUUID(),module:'pochetteNotes',kind:'save',row});
   return snapshot;
  });
  await v.refresh();return {note:snapshot};
 };
}
