import {hash} from './store.mjs';
import {connected,recipient,list} from './config.mjs';
import {london,warmPath,affirmative} from './domain.mjs';
export class Engine {
 constructor(store,domain,providers,c){this.s=store;this.d=domain;this.p=providers;this.c=c;}
 async draft(loop) {
  const pending=this.s.all('actions').find(a=>a.loop_id===loop.id&&a.status==='pending');if(pending)return pending;
  if(loop.status!=='open'||this.d.blocked(loop.org_id))return null;
  const org=this.s.get('orgs',loop.org_id),person=this.d.data.people.find(p=>p.org===loop.org_id);
  if(!person)return null;
  if(org?.status==='lead'&&!this.s.get('qualifications',org.id)?.complete)return null;
  const path=warmPath(org.id,this.d.orgs(),this.d.data.edges);
  const names=path.map(id=>this.s.get('orgs',id)?.name);
  const r=await this.p.model('Draft a short factual follow-up. JSON {text:string,subject:string}. Use only loop facts. Name the shared connection when supplied. Do not invent promises.',{loop,organization:org.name,path:names});
  if(typeof r.text!=='string'||!r.text.trim()||r.text.length>4000||typeof r.subject!=='string')throw Error('Model draft schema invalid');
  if(names.length>1&&!r.text.includes(names[1]))throw Error('Model draft omitted sourced shared connection');
  const channel=person.email?'email':'whatsapp',to=person.email||person.whatsapp;
  return this.s.action('message',{channel,to,text:r.text,subject:r.subject,org_id:org.id,source:'configured model',path},loop.id);
 }
 validateAction(id,input) {
  const a=this.s.get('actions',id);
  if(!a||a.status!=='pending'||a.version!==input.version||a.hash!==input.hash||hash(a.payload)!==a.hash)throw Error('Action changed, already handled, or no longer available');
  if(a.loop_id){const loop=this.s.get('loops',a.loop_id);if(!loop||loop.status!=='open')throw Error('Loop is closed');if(this.d.blocked(loop.org_id))throw Error('Action suppressed for organization');}
  return a;
 }
 edit(id,input) {
  const a=this.validateAction(id,input);if(a.kind!=='message'||typeof input.text!=='string'||!input.text.trim()||input.text.length>4000)throw Error('Invalid message edit');
  a.payload={...a.payload,text:input.text};a.version++;a.hash=hash(a.payload);a.edited_at=new Date().toISOString();this.s.put('actions',id,a);this.s.audit('edit',{action_id:id,version:a.version,hash:a.hash});
  return a;
 }
 drop(id,input) {
  const a=this.validateAction(id,input);a.status='dropped';this.s.put('actions',id,a);if(a.loop_id)this.d.close(a.loop_id,'owner dropped');this.s.audit('drop',{action_id:id,loop_id:a.loop_id});return a;
 }
 async preflight(a) {
  connected(this.c);
  if(a.kind==='message'){
   recipient(this.c,a.payload.channel,a.payload.to);
   const loop=this.s.get('loops',a.loop_id);
   if(loop?.type==='invoice'){
    const invoice=await this.p.invoice(loop.books_invoice_id);
    if(invoice.status==='paid'||Number(invoice.balance)===0){this.d.close(loop.id,'paid');throw Error('Loop invoice already paid');}
   }
  }
  if(a.kind==='sale')this.validateSale(a.payload);
 }
 async approve(id,input,source='owner UI') {
  let a=this.validateAction(id,input);
  await this.preflight(a);
  a=this.s.tx(()=>{
   const current=this.validateAction(id,input);current.status='executing';current.approved_at=new Date().toISOString();current.approval_source=source;this.s.put('actions',id,current);
   this.s.put('intents',id,{action_id:id,hash:current.hash,status:'started',at:current.approved_at});return current;
  });
  this.s.audit('approve',{action_id:id,loop_id:a.loop_id,hash:a.hash,version:a.version,source});
  try {
   let receipt;
   if(a.kind==='message')receipt=a.payload.channel==='email'?await this.p.email(a.payload):await this.p.whatsapp(a.payload.to,a.payload.text,{lastInbound:this.s.get('windows',a.payload.to)?.at});
   else if(a.kind==='expense')receipt=await this.p.expense({...a.payload,reference:`FT-${id}`});
   else if(a.kind==='sale')receipt=await this.p.sale({...a.payload,reference:`FT-${id}`});
   else if(a.kind==='shipment'){this.d.ship(a.loop_id);receipt={id:`local-${id}`};}
   else throw Error('Unsupported action kind');
   this.s.tx(()=>{
    if(a.kind==='sale')this.commitStock(a,receipt);
    a.status='completed';a.receipt={id:receipt.id,to:receipt.to};a.completed_at=new Date().toISOString();this.s.put('actions',id,a);this.s.put('intents',id,{action_id:id,status:'confirmed',receipt_id:receipt.id});
   });
   this.s.audit(a.kind==='message'?'send':a.kind==='shipment'?'shipment':'books_write',{action_id:id,loop_id:a.loop_id,kind:a.kind,provider_id:receipt.id,recipient:receipt.to});
   if(a.kind==='sale')this.s.audit('stock_move',{action_id:id,lot_id:a.payload.lot_id,kg:-a.payload.kg,provider_id:receipt.id});
   if(a.loop_id){if(a.kind==='message')this.d.touch(a.loop_id,'approved send');else this.d.close(a.loop_id,`${a.kind} recorded`);}
   return a;
  } catch(e) {
   // A started external operation is never retried automatically, even for an error response.
   a.status='needs_reconciliation';a.error='Provider outcome requires owner reconciliation before another write';this.s.put('actions',id,a);this.s.put('intents',id,{action_id:id,status:'unknown',at:new Date().toISOString()});this.s.audit('blocked',{action_id:id,reason:'external_outcome_requires_reconciliation'});throw e;
  }
 }
 async approvalReply(text,contextId,owner) {
  if(!list(this.c.WHATSAPP_OWNER_NUMBERS).includes(owner))throw Error('Approval requires owner');
  const binding=contextId&&this.s.get('message_bindings',contextId);
  if(!binding||!affirmative(text))return false;
  await this.approve(binding.action_id,binding,'owner WhatsApp reply');return true;
 }
 async brief(now=new Date()) {
  if(this.c.ENABLE_JOBS!=='true')return;
  const local=london(now),slot=local.time.startsWith('08:0')&&Number(local.time.slice(3))<=2?'08:00':local.time.startsWith('18:0')&&Number(local.time.slice(3))<=2?'18:00':null;
  if(!slot)return;
  const key=`${local.date}:${slot}`;
  if(this.s.get('brief_slots',key))return;
  connected(this.c);
  // Persist slot before sending: restart may not repeat an uncertain external delivery.
  this.s.put('brief_slots',key,{key,status:'preparing',at:now.toISOString()});
  try {
   if(this.syncBooks)await this.syncBooks();
   if(this.pollMail)await this.pollMail();
   const loops=this.d.cold(now),actions=[];
   for(const loop of loops){const action=await this.draft(loop);if(action)actions.push(action);}
   const heading=`Followthrough ${slot}\n${loops.length} loops need attention.\n`;
   const text=heading+loops.map(l=>`${this.s.get('orgs',l.org_id)?.name||l.type}: ${l.next_move}`).join('\n');
   this.s.put('brief_slots',key,{key,status:'sending',at:now.toISOString()});
   for(const owner of list(this.c.WHATSAPP_OWNER_NUMBERS)){
    const lastInbound=this.s.get('windows',owner)?.at;
    await this.p.whatsapp(owner,text,{lastInbound,template:true});
    // Separate action messages bind quoted yes to exactly one immutable payload.
    for(const a of actions){const r=await this.p.whatsapp(owner,`${a.payload.text}\nApprove this exact draft, reply with an edit, or drop it.`,{lastInbound,action:a});this.s.put('message_bindings',r.id,{action_id:a.id,version:a.version,hash:a.hash});}
   }
   this.s.put('brief_slots',key,{key,status:'completed',at:now.toISOString()});this.s.audit('brief',{slot,key,loop_ids:loops.map(l=>l.id),action_ids:actions.map(a=>a.id)});
  }catch(e){this.s.put('brief_slots',key,{key,status:'failed_no_retry',at:now.toISOString()});this.s.audit('blocked',{reason:'brief_failed',slot});throw e;}
 }
}
