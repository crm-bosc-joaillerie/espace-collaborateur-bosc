export const pocketNumber=(d:Record<string,any>)=>String(d.nPochette||d.no||d.numeroPochette||d.pochette||d.interventionId||'').trim();
export async function pochetteNotes(db:any,body:any,actor:{name:string;collaborator:boolean},allowed:Set<string>|null){
 const number=String(body.number||'').trim(),mode=body.mode||'list';
 if(mode==='list'){
  const notes:any[]=[];
  for(let offset=0;offset<20000;offset+=500){
   const r=await db.from('crm_pochette_notes').select('pochette,body,revision,pending,author,updated_at,seen_at').eq('workspace_key','bosc').order('pochette').range(offset,offset+499);
   if(r.error)throw Error('Lecture des notes impossible.');
   notes.push(...r.data.filter((n:any)=>!allowed||allowed.has(n.pochette)));
   if(r.data.length<500)return {notes};
  }
  throw Error('Trop de notes : lecture incomplète.');
 }
 if(!['save','seen'].includes(mode)||!allowed?.has(number)||(actor.collaborator&&mode==='seen'))throw Object.assign(Error('Note non autorisée.'),{status:403});
 if(typeof body.text!=='string'||body.text.length>2000||!Number.isInteger(body.revision)||body.revision<0)throw Error('Note invalide.');
 const r=await db.rpc('pochette_note_write',{p_number:number,p_body:body.text,p_expected:body.revision,p_author:actor.name,p_collaborator:actor.collaborator,p_seen:mode==='seen'});
 if(r.error)throw Object.assign(Error(r.error.message.includes('NOTE_CONFLICT')?'La note a changé. Fermez puis rouvrez la note pour lire la nouvelle version avant de réessayer.':'Enregistrement de la note impossible.'),{status:409});
 return {note:r.data};
}

