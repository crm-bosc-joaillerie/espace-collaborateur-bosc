// Aggregate only the rows already authorized for the connected collaborator.
const done = (value:unknown) => /^fait(?:e|s|es)?$/i.test(String(value || "").trim());
const unique = (values:unknown[]) => [...new Set(values.map(value=>String(value ?? "").trim()).filter(value=>value && value!=="—"))].join(" · ");
function minutes(value:unknown) {
  const match=String(value || "").match(/^(\d+) h (\d+) min$/);
  return match ? Number(match[1])*60+Number(match[2]) : 0;
}
export function groupCollaboratorPockets<T extends Record<string,any>>(rows:T[], matches:(row:T)=>boolean=()=>true):Array<T & {members:T[]}> {
  const groups=new Map<string,T[]>();
  const originals=rows.flatMap(row=>row.members || [row]) as T[];
  originals.forEach((row,index)=>{
    const number=String(row.no ?? row.pochette ?? "").trim();
    const key=number && number!=="—" ? "pocket:"+number : "unassigned:"+index;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key)!.push(row);
  });
  return [...groups.values()].filter(members=>members.some(matches)).map(members=>{
    const anchor=members.find(matches)||members[0];
    const total=members.reduce((sum,row)=>sum+minutes(row.duree),0);
    const statuses=members.map(row=>row.etat || row.statut || "En attente");
    const status=statuses.every(done)?"Fait":statuses.some(done)?"En cours":unique(statuses);
    return {...anchor,piece:unique(members.map(row=>row.piece)),type:unique(members.map(row=>row.type)),
      duree:total ? Math.floor(total/60)+" h "+String(total%60).padStart(2,"0")+" min" : members.some(row=>row.duree==="0 h 00 min")?"0 h 00 min":"—",
      etat:status,statut:status,members};
  });
}
// Each write retains its source identity and its own intervention details.
export function pocketWrites(group:Record<string,any>|null,input:Record<string,any>) {
  return (group?.members || (group?[group]:[null])).map((member:Record<string,any>|null)=>{
    const write={...input};
    if(member && group) {
      for(const field of ["piece","etat","livraison","client","no"]) {
        if(input[field]===undefined || input[field]===group[field])write[field]=member[field];
      }
      if(input.note===undefined || input.note===String(group.data?.note || group.data?.commentaire || ""))write.note=member.data?.note || member.data?.commentaire || "";
    }
    return {...write,kind:"entry",_crmId:member?._crmId,record_key:member?.record_key,
      ...(member?.data?.interventionId?{interventionId:member.data.interventionId}:{})};
  });
}
