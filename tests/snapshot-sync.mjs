import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {withClientLabels} from '../supabase/functions/collaborator-gateway/client-labels.mjs';
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function evaluate(p,context,mocks){const mod={exports:{}};vm.runInContext('(function(require,module,exports){'+compile(p)+'\n})',context)(name=>{if(name in mocks)return mocks[name];throw Error('Unexpected dependency '+name)},mod,mod.exports);return mod.exports;}
let handler,revoked=false,label='Client initial',reads=0;
const clientId='11111111-1111-4111-8111-111111111111';
const row=(id,module,data)=>({id,module,record_key:id,updated_at:'unchanged-timestamp',data});
const database={planning:[row('plan','planning',{kind:'entry',collaborateur:'Alice',clientId,photo:'data:image/png;base64,photo'})],pochettes:[],devis:[],discussion:[],messages:[],commandes:[]};
const db={from(table){const filters={};let low=0,high=499;return {select(){return this},eq(k,v){filters[k]=v;return this},in(){return this},order(){return this},range(a,b){low=a;high=b;return this},maybeSingle(){return this},then(resolve,reject){return Promise.resolve().then(()=>{
 if(table==='collaborator_sessions')return {data:revoked?null:{expires_at:new Date(Date.now()+3600000).toISOString(),collaborator_devices:{id:'device',approved_at:'yes',revoked_at:null,collaborator_accounts:{id:'alice',display_name:'Alice',is_active:true}}},error:null};
 if(table==='crm_client_labels')return {data:[{client_id:clientId,display_name:label}],error:null};
 assert.equal(table,'crm_records');reads++;return {data:structuredClone(database[filters.module].slice(low,high+1)),error:null};
 }).then(resolve,reject)}}}};
const context=vm.createContext({console,crypto,TextEncoder,Uint8Array,Date,Request,Response,structuredClone,Deno:{env:{get:()=>''},serve:f=>handler=f}});
evaluate('supabase/functions/collaborator-gateway/index.ts',context,{'npm:@supabase/supabase-js@2.116.0':{createClient:()=>db},'./client-labels.mjs':{withClientLabels},'./device-owner.mjs':{isDeviceOwner:()=>false},'./pochette-notes.ts':{}});
async function call(revision,token='a'.repeat(64)){return handler(new Request('https://example.test',{method:'POST',headers:{'X-Collaborator-Session':token},body:JSON.stringify({action:'read',revision})}));}
let response=await call();let first=await response.json();assert.equal(response.status,200);assert.equal(first.planning.length,1);assert.equal(first.planning[0].data.photo,database.planning[0].data.photo);
let next=await (await call(first.revision)).json();assert.equal(next.unchanged,true);assert.equal(Object.hasOwn(next,'planning'),false);
database.planning[0].data.note='changed without a timestamp';next=await (await call(first.revision)).json();assert.equal(next.planning[0].data.note,'changed without a timestamp');assert.notEqual(next.revision,first.revision);
first=next;label='Client renommé';next=await (await call(first.revision)).json();assert.notEqual(next.revision,first.revision);
first=next;database.planning[0].data.collaborateur='Bob';next=await (await call(first.revision)).json();assert.equal(next.planning.length,0);assert.notEqual(next.revision,first.revision);
first=next;database.messages=[row('m','messages',{message:'visible'})];next=await (await call(first.revision)).json();first=next;database.messages=[];next=await (await call(first.revision)).json();assert.equal(next.messages.length,0);
revoked=true;const before=reads;assert.equal((await call(next.revision)).status,401);assert.equal(reads,before,'authentication precedes snapshot access');revoked=false;
assert.equal((await call(undefined,'invalid')).status,401);
database.messages=Array.from({length:501},(_,i)=>row('m'+i,'messages',{message:String(i)}));next=await (await call()).json();assert.equal(next.messages.length,501,'pagination keeps rows beyond the first page');
console.log('PASS: full/unchanged snapshots, photos, timestamp-independent updates, labels, reassignment, deletion, revoked access and pagination.');

// Frontend: a cached revision is usable only with a complete local snapshot.
const names=['planning','pochettes','devis','discussion','messages','conges','primes','commandes'];
let state={rows:{},jobs:[],meta:{}},writes=0,requests=0,reply,networkFailure=false,duringRequest;
const storage=new Map([['bosc-collaborateur-session','session'],['bosc-collaborateur-appareil','device'],['bosc-collaborateurs-name','Alice']]);
class Vault{constructor(owner){this.owner=owner}async flush(){}async atomic(fn,write=true){const value=fn(state);if(write)writes++;return value}async meta(k,v){if(v!==undefined){state.meta[k]=v;writes++}return state.meta[k]}async readMany(modules){return Object.fromEntries(modules.map(m=>[m,structuredClone(state.rows[m]||[])]))}async cacheMany(batch,meta){state.rows=structuredClone(batch);Object.assign(state.meta,meta);writes++;return structuredClone(batch)}}
const browser=vm.createContext({console,crypto,TextEncoder,Uint8Array,Date,AbortSignal,Error,TypeError,navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)},fetch:async(_url,options)=>{requests++;await Promise.resolve();if(networkFailure)throw new TypeError('network');if(duringRequest)duringRequest();return {ok:true,json:async()=>reply(JSON.parse(options.body))}}});
const api=evaluate('lib/crm-sync.ts',browser,{'./offline-core':{OfflineStore:Vault},'./Notifications':{},'./pochette-notes-client.mjs':{createNoteClient:()=>({})}});
const full=()=>({...Object.fromEntries(names.map(n=>[n,[]])),planning:[row('p','planning',{kind:'entry',photo:'original-photo'})],revision:'r1'});
reply=()=>full();await Promise.all([api.readSharedCrm(),api.readSharedCrm()]);assert.equal(requests,1);assert.equal(writes,1);
reply=body=>{assert.equal(body.revision,'r1');return {unchanged:true,revision:'r1'}};writes=0;await api.readSharedCrm();assert.equal(writes,0);
duringRequest=()=>state.rows.planning.push(row('local','planning',{kind:'entry'}));const latest=await api.readSharedCrm();assert.equal(latest.planning.length,2,'local edits made during a read remain visible');duringRequest=null;
networkFailure=true;assert.equal((await api.readSharedCrm()).planning[0].data.photo,'original-photo');networkFailure=false;
state.meta.auth.until=0;networkFailure=true;await assert.rejects(api.readSharedCrm());networkFailure=false;
delete state.rows.messages;reply=body=>{assert.equal(body.revision,undefined);return full()};await api.readSharedCrm();
reply=()=>({unchanged:true,revision:'r1'});duringRequest=()=>storage.set('bosc-collaborateur-session','another-session');await assert.rejects(api.readSharedCrm(),/session/);
console.log('PASS: one shared request, one initial cache write, zero unchanged writes, offline photos, access expiry and session isolation.');
