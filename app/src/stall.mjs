import {london} from './domain.mjs';
export function installStall(e) {
 e.cashup=async(text,event_id,owner)=>{
  const previous=e.s.get('cashup_pending',owner);
  const r=await e.p.model('Extract a stall cash-up. JSON {count:number|null,bag_grams:number|null,lot_id:string|null,amount:number|null,currency:"GBP"|null}. No inferred size or values. Combine explicit clarification with prior missing values. Allowed lots supplied.',{text,previous:previous?.parsed||null,lots:e.s.all('lots').map(l=>({id:l.id,name:l.name}))});
  if(!Number.isInteger(r.count)||r.count<=0||!Number.isFinite(r.bag_grams)||r.bag_grams<=0||!e.s.get('lots',r.lot_id)||!Number.isFinite(r.amount)||r.amount<=0||r.currency!=='GBP'){
   e.s.put('cashup_pending',owner,{parsed:{count:r.count,bag_grams:r.bag_grams,lot_id:r.lot_id,amount:r.amount,currency:r.currency},event_id});e.s.audit('ask',{event_id,reason:'cashup_missing_fields'});return {ask:'Please supply the bag count, bag size in grams, lot and GBP cash total. Nothing has been recorded.'};
  }
  const lot=e.s.get('lots',r.lot_id);
  const payload={count:r.count,bag_grams:r.bag_grams,lot_id:lot.id,books_item_id:lot.books_item_id,amount:Math.round(r.amount*100)/100,kg:r.count*r.bag_grams/1000,date:london().date,currency:'GBP'};
  if(!Number.isSafeInteger(r.count*r.bag_grams)||payload.kg>lot.left_kg)throw Error('Insufficient stock or invalid bag quantity');
  const loop=e.d.loop('stall',null,`cashup:${previous?.event_id||event_id}`,{stall_date:payload.date,next_move:`Review ${r.count} bags of ${lot.name}`});
  const action=e.s.action('sale',payload,loop.id);e.s.del('cashup_pending',owner);
  return {action,readback:`${r.count} × ${r.bag_grams}g bags of ${lot.name}: ${payload.kg}kg and GBP ${payload.amount.toFixed(2)} cash. Approve to record the sale and reduce this lot.`};
 };
 e.validateSale=payload=>{
  const lot=e.s.get('lots',payload.lot_id);if(!lot?.books_item_id||lot.books_item_id!==payload.books_item_id)throw Error('Missing Books item mapping for lot');
  const reserved=e.s.all('actions').filter(a=>a.kind==='sale'&&['executing','needs_reconciliation'].includes(a.status)&&a.payload.lot_id===lot.id).reduce((n,a)=>n+a.payload.kg,0);
  if(!Number.isFinite(payload.kg)||payload.kg<=0||Math.abs(payload.kg-payload.count*payload.bag_grams/1000)>1e-9||payload.kg>lot.left_kg-reserved)throw Error('Insufficient unreserved stock');
 };
 e.commitStock=(action,receipt)=>{
  if(e.s.get('stock_moves',action.id))return;
  const lot=e.s.get('lots',action.payload.lot_id);
  if(lot.left_kg<action.payload.kg)throw Error('Insufficient stock during reconciliation');
  lot.left_kg=Math.round((lot.left_kg-action.payload.kg)*1000000)/1000000;
  e.s.put('lots',lot.id,lot);e.s.put('stock_moves',action.id,{action_id:action.id,lot_id:lot.id,kg:-action.payload.kg,books_id:receipt.id});
 };
}
