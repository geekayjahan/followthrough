import {london} from './domain.mjs';
export function installReceipts(e) {
 e.receipt=async({text='',image,event_id})=>{
  if(image&&!['image/jpeg','image/png','image/webp'].includes(image.mime))throw Error('Receipt image type not supported');
  const r=await e.p.model('Extract receipt facts only. JSON {supplier:string|null,amount:number|null,date:"YYYY-MM-DD"|null,currency:"GBP"|null,supplier_quote:string|null,amount_quote:string|null}. Preserve exact text evidence; do not infer missing amount or supplier.',{text,allowed_suppliers:e.d.orgs().map(o=>o.name)},{image});
  const org=e.d.orgs().find(o=>o.name.toLowerCase()===String(r.supplier||'').toLowerCase());
  if(!org||!Number.isFinite(r.amount)||r.amount<=0||r.currency!=='GBP'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')){
   e.s.audit('ask',{event_id,reason:'receipt_missing_or_unmapped_fields'});return {ask:'Please supply the synthetic supplier, GBP total and receipt date before approval.'};
  }
  if(text&&(!r.supplier_quote||!text.includes(r.supplier_quote)||!r.supplier_quote.toLowerCase().includes(org.name.toLowerCase())||!r.amount_quote||!text.includes(r.amount_quote)))throw Error('Receipt extraction lacks matching source quotes');
  const loop=e.d.loop('receipt',org.id,`receipt:${event_id}`,{source:'owner receipt',next_move:`Review ${org.name} expense: GBP ${r.amount.toFixed(2)}`});
  const a=e.s.action('expense',{supplier:org.name,org_id:org.id,amount:r.amount,date:r.date,currency:'GBP',description:'Owner-provided receipt',source:image?'receipt image via configured vision model':'receipt text',evidence:image?null:{supplier_quote:r.supplier_quote,amount_quote:r.amount_quote}},loop.id);
  return {action:a,readback:`Receipt from ${org.name}, GBP ${r.amount.toFixed(2)}, dated ${r.date}. Approve to record this expense in Books.`};
 };
}
