import {types,currencyChoices,money} from './data.js?v=6';
export const text=(value,extra={})=>({type:'TextBlock',text:value,wrap:true,...extra});
export const title=value=>text(value,{size:'Medium',weight:'Bolder',spacing:'None'});
export const caption=value=>text(value,{size:'Small',isSubtle:true});
export const input=(id,label,value='',extra={})=>({type:'Input.Text',id,label,value,...extra});
export const number=(id,label,value,extra={})=>({type:'Input.Number',id,label,value,min:.01,isRequired:true,errorMessage:'Enter an amount greater than zero.',...extra});
export const choice=(id,label,choices,value)=>({type:'Input.ChoiceSet',id,label,value,style:'compact',isRequired:true,errorMessage:'Select an option.',choices:choices.map(c=>typeof c==='string'?{title:c,value:c}:c)});
export const action=(label,verb,data={},primary=false,extra={})=>({type:'Action.Submit',title:label,data:{verb,...data},...(primary?{style:'positive'}:{}),...extra});
export const noInputAction=(label,verb,data={},primary=false)=>action(label,verb,data,primary,{associatedInputs:'none'});
export const facts=rows=>({type:'FactSet',facts:rows.map(([title,value])=>({title,value:String(value)}))});
export const card=(body,actions=[])=>({$schema:'http://adaptivecards.io/schemas/adaptive-card.json',type:'AdaptiveCard',version:'1.5',body,actions});
export function receiptCard(line,{missing=false}={}){
 return card([
  title(missing?'Add item without a receipt':'Review expense details'),
  caption(missing?'Add this only if you have an expense with no original receipt.':line.sample?'Sample extraction · Review and correct before confirming.':'Manual entry · OCR is not connected in this demo.'),
  input('merchant','Merchant / description',line.merchant,{isRequired:true,errorMessage:'Enter a merchant or description.'}),
  {type:'ColumnSet',columns:[{type:'Column',width:'stretch',items:[{type:'Input.Date',id:'date',label:'Expense date',value:line.date,isRequired:true,errorMessage:'Select a date.'}]},{type:'Column',width:'stretch',items:[choice('currency','Receipt currency',currencyChoices,line.currency)]}]},
  {type:'ColumnSet',columns:[{type:'Column',width:'stretch',items:[number('originalAmount','Original receipt amount',line.originalAmount)]},{type:'Column',width:'stretch',items:[number('amount','Claim amount (SGD)',line.amount)]}]},
  choice('expenseType','Expense type',types,line.expenseType),
  input('justification','Justification',line.justification,{isMultiline:true,isRequired:true,errorMessage:'Please enter a justification.'}),
  ...(!missing?[choice('amountSource','SGD amount source',[
   {title:'Card statement — actual SGD charge',value:'statement'},
   {title:'Corporate rate — sample rate in demo',value:'corporate'},
   {title:'Manual SGD amount',value:'manual'}
  ],line.amountSource||'manual')]:[]),
  ...(missing?[caption('Original Receipt Missing will be set to Yes for this item.')]:[])
 ],[action(missing?'Add item':'Confirm details','confirmLine',{lineId:line.id,missing},true),noInputAction('Cancel','cancelLine')]);
}
export function welcomeCard(){return card([title('Prepare an expense report'),text('Upload your receipts and I’ll help prepare your expense report.'),caption('I save drafts only. You review and submit them in Oracle iExpense.')],[action('Start an expense report','start',{},true),action('View reports','reports')]);}
export function savedLineSections(lines,{heading='Saved expense lines',unknownCount=0,reportId=null}={}){
 const sections=[text(heading,{weight:'Bolder',spacing:'Medium',separator:true}),caption(reportId?'Saved items cannot be edited. Delete an item and add a new one to replace it. Deletions are saved immediately.':'Read only · These items are already saved.')];
 lines.forEach((line,index)=>{
  const original=Number(line.originalAmount),claim=Number(line.amount);
  sections.push({type:'Container',separator:true,spacing:'Medium',items:[
   {type:'ColumnSet',columns:[{type:'Column',width:'stretch',items:[text(`${index+1}. ${line.merchant}`,{weight:'Bolder',spacing:'None'}),caption(`${line.date||'Date unavailable'} · ${line.expenseType||'Type unavailable'}`)]},{type:'Column',width:'auto',items:[text('SGD '+money(claim),{weight:'Bolder',horizontalAlignment:'Right'})]}]},
   facts([
    ['Original amount',line.currency&&Number.isFinite(original)?`${line.currency} ${money(original)}`:'Unavailable'],
    ...(line.currency&&line.currency!=='SGD'&&original>0?[['Effective rate',`${(claim/original).toFixed(6).replace(/0+$/,'').replace(/\.$/,'')} SGD/${line.currency}`]]:[]),
    ['Original receipt missing',line.receiptMissing?'Yes':'No'],
    ...(line.receiptFileName?[['Receipt file',line.receiptFileName]]:[])
   ]),
   text('Justification: '+(line.justification||'Not provided'),{size:'Small',isSubtle:true}),
   ...(reportId?[{type:'ActionSet',actions:[noInputAction('Delete line','deleteLineAsk',{reportId,lineId:line.id})]}]:[])
  ]});
 });
 if(unknownCount)sections.push(caption(`${unknownCount} older line(s) have no details available in this browser’s legacy demo data. Their amounts remain included in the saved total.`));
 if(!lines.length&&!unknownCount)sections.push(caption('No expense lines are recorded for this report.'));
 return sections;
}
export function previewCard(report,lines,baseTotal=0){
 const total=baseTotal+lines.reduce((s,l)=>s+Number(l.amount),0);
 const body=[title(report.existingId?'Review additional expenses':'Review your expense report'),facts([['Prepared for',report.person.name],['Purpose',report.purpose],['Template',report.template],['Cost center',report.person.costCenter+' · from employee default'],...(report.existingId?[['Existing draft',report.existingId],['Existing saved amount','SGD '+money(baseTotal)]]:[])])];
 if(report.existingId)body.push(...savedLineSections(report.savedLines||[],{heading:'Existing saved lines',unknownCount:report.unknownSavedCount||0,reportId:report.existingId}));
 body.push(text('New expense lines',{weight:'Bolder',spacing:'Medium',separator:true}));
 for(const line of lines){body.push({type:'Container',separator:true,spacing:'Medium',items:[{type:'ColumnSet',columns:[{type:'Column',width:'stretch',items:[text(line.merchant,{weight:'Bolder',spacing:'None'}),caption(`${line.expenseType} · ${line.date}${line.receiptMissing?' · Original receipt missing':''}`)]},{type:'Column',width:'auto',items:[text('SGD '+money(line.amount),{weight:'Bolder',horizontalAlignment:'Right'})]}]},caption(line.currency!=='SGD'?`${line.currency} ${money(line.originalAmount)} · Effective rate ${(line.amount/line.originalAmount).toFixed(6).replace(/0+$/,'').replace(/\.$/,'')} SGD/${line.currency}`:'Receipt and claim are in SGD'),{type:'ActionSet',actions:[noInputAction('Edit','editLine',{lineId:line.id}),noInputAction('Remove','removeLine',{lineId:line.id})]}]});}
 body.push({type:'Container',separator:true,spacing:'Medium',items:[facts([['Total draft amount','SGD '+money(total)]]),caption('Save as draft. Review and submit later in Oracle.')]});
 return card(body,[action(report.existingId?'Save additional lines':'Save draft','save',{},true,{isEnabled:lines.length>0}),noInputAction('Add receipt','upload'),noInputAction('Add item without a receipt','addMissing'),...(report.existingId?[noInputAction('Delete draft','deleteAsk',{reportId:report.existingId})]:[])]);
}
