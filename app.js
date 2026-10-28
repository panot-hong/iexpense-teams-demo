import {people,initialReports,notes,money,uid,sampleRates,hydrateLegacySampleReports} from './data.js?v=4';
import {card,title,text,caption,input,choice,action,noInputAction,facts,receiptCard,welcomeCard,previewCard,savedLineSections} from './cards.js?v=4';
import {icon,mountIcons} from './icons.js';

const $=s=>document.querySelector(s), log=$('#messages');
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='iexpense-teams-demo-v2';
let reports;try{const stored=JSON.parse(localStorage.getItem(storageKey));reports=Array.isArray(stored)&&stored.every(r=>r&&typeof r.id==='string'&&['sarah','alex'].includes(r.claimant)&&Array.isArray(r.lines)&&Number.isFinite(r.total))?stored:structuredClone(initialReports);}catch{reports=structuredClone(initialReports);}
reports=hydrateLegacySampleReports(reports);
const state={person:null,report:null,lines:[],files:[],pendingFiles:[],baseTotal:0,stage:'welcome',lastSaved:null};
let cards=[],toastTimer;
AdaptiveCards.AdaptiveCard.onProcessMarkdown=(source,result)=>{result.outputHtml=escapeHtml(source).replace(/\n/g,'<br>');result.didProcess=true;};
const hostConfig=new AdaptiveCards.HostConfig({fontFamily:'Segoe UI, system-ui, sans-serif',supportsInteractivity:true,fontSizes:{small:11,default:13,medium:17,large:20,extraLarge:24},fontWeights:{lighter:400,default:400,bolder:600},spacing:{small:6,default:12,medium:17,large:22,extraLarge:28,padding:18},containerStyles:{default:{backgroundColor:'#FFFFFF',foregroundColors:{default:{default:'#242424',subtle:'#6B6B75'},accent:{default:'#5B5FC7',subtle:'#7377D0'},good:{default:'#23734D'},attention:{default:'#B42332'}}},emphasis:{backgroundColor:'#F5F5FA',foregroundColors:{default:{default:'#242424',subtle:'#6B6B75'}}}},actions:{maxActions:8,spacing:'Default',buttonSpacing:8,showCard:{actionMode:'inline',inlineTopMargin:14},actionsOrientation:'horizontal',actionAlignment:'left'},factSet:{title:{size:'Small',weight:'Default',color:'Default',isSubtle:true,wrap:true,maxWidth:170},value:{size:'Default',weight:'Bolder',color:'Default',wrap:true},spacing:6},separator:{lineThickness:1,lineColor:'#E6E6EB'}});
mountIcons();
const wizard=$('#expense-wizard');
const wizardSteps=new Set(['context','drafts','setup','upload','receipt','preview','missing']);
let wizardEntry=null,wizardSuspended=false,returnFocus=null;
function updateWizardTotal(proposed=null){
 const total=proposed??(state.baseTotal+state.lines.reduce((s,l)=>s+l.amount,0));
 $('#wizard-total').textContent=`${proposed!==null?'Proposed total':'Draft total'}: SGD ${money(total)} · ${state.lines.length} new item${state.lines.length===1?'':'s'}`;
}
function updateWizardChrome(step){
 const number=['context','drafts','setup'].includes(step)?1:step==='preview'?3:2;
 $('#wizard-title').textContent=state.report?.existingId?'Add expenses to '+state.report.existingId:'Prepare expense report';
 $('#wizard-subtitle').textContent=state.person?`${state.person.name} · Singapore · SGD${state.report?.purpose?' · '+state.report.purpose:''}`:'Singapore · SGD';
 document.querySelectorAll('.wizard-steps li').forEach(n=>{n.classList.toggle('current',+n.dataset.step===number);n.classList.toggle('completed',+n.dataset.step<number);if(+n.dataset.step===number)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');});
 $('#wizard-back').hidden=['context','receipt','missing'].includes(step);
 $('#wizard-back').textContent=['receipt','missing'].includes(step)?'Cancel entry':'Back';
 const files=state.files.length?`<details class="wizard-files"><summary>Supporting files · ${state.files.length}</summary>${state.files.map(f=>`<div class="wizard-file">${icon('file')}<span>${escapeHtml(f.name)}</span><small>${f.sample?'Sample':'Browser only'}</small></div>`).join('')}</details>`:'';
 $('#wizard-attachment-list').innerHTML=['upload','receipt','preview'].includes(step)?files:'';
 updateWizardTotal();
}
function setLeavePrompt(show){
 $('#wizard-leave-prompt').hidden=!show;
 for(const selector of ['.wizard-header','.wizard-steps','.wizard-layout','.wizard-footer'])wizard.querySelector(selector).inert=show;
}
function openWizard(){
 if(!wizard.open){returnFocus=document.activeElement;wizard.showModal();}
 wizardSuspended=false;setLeavePrompt(false);
}
function beginWizard(){
 if(wizardSuspended&&wizardEntry){openWizard();setStep(state.wizardStage||'context');return;}
 state.report=null;state.lines=[];state.files=[];state.baseTotal=0;sampleQueue=[];
 context();
}
function finishWizard(){
 if(wizard.open)wizard.close();wizardSuspended=false;wizardEntry=null;
 $('#wizard-card').replaceChildren();$('#wizard-actions').replaceChildren();setLeavePrompt(false);
 cards=cards.filter(c=>!c.inWizard);
}
function requestWizardClose(){
 setLeavePrompt(true);$('#wizard-keep-editing').focus();
}
function pauseWizard(){
 wizardSuspended=true;setLeavePrompt(false);wizard.close();
 showCard('Your in-progress report is kept in this browser tab. Resume it when you’re ready.',card([title('Expense report in progress'),caption('Your entries are not saved to Oracle yet. Keep this tab open to resume.')],[noInputAction('Resume report','resumeWizard',{},true),noInputAction('Discard entries','discardWizard')]),'welcome');
 returnFocus?.focus?.();
}
function discardWizard(){
 finishWizard();state.report=null;state.lines=[];state.files=[];state.pendingFiles=[];state.baseTotal=0;sampleQueue=[];
 showCard('The unsaved report entries were discarded. Saved drafts are unchanged.',welcomeCard(),'welcome');
}
function goWizardBack(){
 switch(state.stage){
  case 'drafts':context();break;
  case 'setup':if(state.lines.length)preview();else chooseDraft(true);break;
  case 'upload':if(state.lines.length)preview();else if(state.report?.existingId)chooseDraft();else setup();break;
  case 'receipt':case 'missing':sampleQueue=[];if(state.lines.length||state.report?.existingId)preview();else upload();break;
  case 'preview':upload();break;
 }
}
wizard.addEventListener('cancel',e=>{e.preventDefault();if(!$('#wizard-leave-prompt').hidden){setLeavePrompt(false);$('#wizard-close').focus();}else requestWizardClose();});
$('#wizard-close').onclick=requestWizardClose;
$('#wizard-keep-editing').onclick=()=>{setLeavePrompt(false);$('#wizard-close').focus();};
$('#wizard-pause').onclick=pauseWizard;
$('#wizard-discard').onclick=discardWizard;
$('#wizard-back').onclick=goWizardBack;
$('#wizard-notes-toggle').onclick=()=>{const n=$('#wizard-technical');n.hidden=!n.hidden;wizard.classList.toggle('with-notes',!n.hidden);$('#wizard-notes-toggle').setAttribute('aria-expanded',String(!n.hidden));};

function scrollBottom(){requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight;});}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(reports));}catch{toast('Draft kept for this session. Browser storage is unavailable.');}}
// Only actual composer text is displayed as a user message; wizard actions use structured data.
function user(message,files=[],explicit=false){if(!explicit)return;const row=document.createElement('div');row.className='message user';const body=document.createElement('div');body.className='message-body';body.innerHTML=`<div class="message-meta"><strong>Sarah Lim</strong><span>${new Date().toLocaleTimeString('en-SG',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="user-bubble">${escapeHtml(message)}</div>`;for(const file of files){const f=document.createElement('div');f.className='file-bubble';f.innerHTML=icon('file')+`<div><strong>${escapeHtml(file.name)}</strong><small>${file.sample?'Sample attachment':`${Math.max(1,Math.round(file.size/1024))} KB · Browser only`}</small></div>`;body.appendChild(f);}row.appendChild(body);log.appendChild(row);scrollBottom();}
function bot(message){const row=document.createElement('div');row.className='message';row.innerHTML='<div class="bot-icon">iE</div><div class="message-body"><div class="message-meta"><strong>iExpense Assistant</strong><span>Now</span></div></div>';const body=row.querySelector('.message-body');if(message){const p=document.createElement('p');p.className='bot-text';p.textContent=message;body.appendChild(p);}log.appendChild(row);scrollBottom();return body;}
function archiveAll(){for(const entry of cards){if(entry.inWizard||entry.archived)continue;entry.archived=true;entry.host.classList.add('archived');entry.host.querySelectorAll('input,select,textarea,button').forEach(n=>n.disabled=true);const note=document.createElement('div');note.className='snapshot-note';note.textContent='Previous response · review the latest card below';entry.host.appendChild(note);}}
function showCard(message,payload,step,liveLine=null){
 const inWizard=wizardSteps.has(step);let body;
 if(inWizard){
  openWizard();if(wizardEntry)wizardEntry.archived=true;
  cards=cards.filter(c=>!c.inWizard);$('#wizard-card').replaceChildren();$('#wizard-actions').replaceChildren();
  body=document.createElement('div');$('#wizard-card').appendChild(body);$('#wizard-message').textContent=message;
 }else{if(step==='saved')finishWizard();archiveAll();body=bot(message);}
 setStep(step);if(inWizard){state.wizardStage=step;updateWizardChrome(step);}
 const host=document.createElement('div');host.className='card-host';body.appendChild(host);const ac=new AdaptiveCards.AdaptiveCard();ac.hostConfig=hostConfig;const entry={ac,host,body,archived:false,inWizard};if(inWizard)wizardEntry=entry;
ac.onExecuteAction=a=>{if(entry.archived)return;try{handleAction(a.data||{},entry);}catch(error){console.error(error);showError(entry,'Something went wrong in the demo. Your current entries are still here.');}};ac.parse(payload);const node=ac.render();host.appendChild(node);if(inWizard){const actions=node.lastElementChild;if(actions?.querySelector('.ac-actionSet'))$('#wizard-actions').appendChild(actions);}cards.push(entry);
 if(liveLine){const calculation=document.createElement('div');calculation.className='live-calculation';calculation.setAttribute('aria-live','polite');host.appendChild(calculation);let updating=false;
  const update=(changed)=>{if(updating)return;updating=true;const all=ac.getAllInputs(),get=id=>all.find(n=>n.id===id),original=Number(get('originalAmount')?.value),currency=get('currency')?.value||'SGD',source=get('amountSource')?.value||'manual';
   if((changed?.id==='amountSource'&&source==='corporate')||(source==='corporate'&&['originalAmount','currency'].includes(changed?.id))){get('amount').value=Math.round(original*(sampleRates[currency]||1)*100)/100;}
   if(changed?.id==='currency'&&currency==='SGD'){get('amount').value=original;}
   const amount=Number(get('amount')?.value);const otherTotal=state.lines.filter(l=>l.id!==liveLine.id).reduce((s,l)=>s+l.amount,0)+state.baseTotal;
   calculation.textContent=Number.isFinite(amount)&&Number.isFinite(original)&&original>0?`Claim: SGD ${money(amount)}${currency!=='SGD'?` · Effective rate: ${(amount/original).toFixed(6)} SGD/${currency}`:''} · Draft total after confirming: SGD ${money(otherTotal+amount)}${source==='corporate'?' · Sample Corporate rate':''}`:'Enter the receipt and claim amounts to calculate your draft total.';
   if(entry.inWizard)updateWizardTotal(Number.isFinite(amount)?otherTotal+amount:null);updating=false;};ac.onInputValueChanged=update;update();
 }
 if(inWizard){$('#wizard-body').scrollTop=0;requestAnimationFrame(()=>{const heading=host.querySelector('.ac-textBlock');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}});}else scrollBottom();return entry;
}
function showError(entry,message){let e=entry.host.querySelector('.message-error');if(!e){e=document.createElement('div');e.className='message-error';entry.host.prepend(e);}e.textContent=message;}
function setStep(step){state.stage=step;const n=notes[step]||notes.welcome;$('#tech-content').innerHTML=`<div class="tech-step">${escapeHtml(n.step)}</div>`+n.items.map(([status,heading,body])=>`<div class="tech-item"><div class="status ${status}">${{ready:'มีแล้วใน source',partial:'มีบางส่วน / ต้องแก้',missing:'ต้องเพิ่ม query / operation',bot:'งาน Bot / API'}[status]}</div><h3>${escapeHtml(heading)}</h3><p>${escapeHtml(body)}</p></div>`).join('');$('#wizard-tech-content').innerHTML=$('#tech-content').innerHTML;$('#claim-context').textContent=state.person?` · Preparing for ${state.person.name}`:'';}
function context(){showCard('Who is this expense report for?',card([title('Prepare an expense report'),choice('person','Prepare report for',people.map(p=>({title:p.name+(p.delegated?' · delegated to you':' · myself'),value:p.id})),state.person?.id||'sarah'),choice('responsibility','Oracle responsibility',[{title:'SG iExpense Employee',value:'sg'}],'sg'),caption('Singapore · SGD. The employee’s default cost center is filled automatically.')],[action('Continue','context',{},true),noInputAction('Cancel','pauseWizard')]),'context');}
function chooseDraft(backToContext=false){const list=reports.filter(r=>r.claimant===state.person.id&&r.status==='Draft').slice(0,10);if(!list.length){if(backToContext)context();else setup();return;}showCard(`You can create a new report or add receipts to ${state.person.name.split(' ')[0]}’s existing draft.`,card([title('New report or existing draft?'),choice('draftId','Latest drafts',list.map(r=>({title:`${r.id} · ${r.purpose} · SGD ${money(r.total)}`,value:r.id})),list[0].id),caption('Existing report owner and template stay unchanged. You can add new lines only.')],[noInputAction('Create new report','new',{},true),action('Continue selected draft','continueDraft')]),'drafts');}
function setup(){
 const template=choice('template','Expense template',['Non HR — Trip Expenses','Non HR — Other Expenses'],state.report?.template||'Non HR — Trip Expenses');
 if(state.lines.length)template.isEnabled=false;
 showCard('A few details first, then we can add your receipts.',card([title('Report details'),template,input('purpose','Purpose',state.report?.purpose||'Jakarta client meeting',{isRequired:true,errorMessage:'Enter a purpose.'}),choice('trip','Approved business trip',[{title:'BTR-DEMO-001 · Jakarta · 19–21 Oct 2026',value:'BTR-DEMO-001'},{title:'No business trip / not applicable',value:'none'}],state.report?.trip||'BTR-DEMO-001'),facts([['Prepared for',state.person.name],['Default cost center',state.person.costCenter],['Reimbursement currency','SGD']])],[action('Add receipts','setup',{},true),...(!state.lines.length?[noInputAction('Change person','start')]:[])]),'setup');
}
function upload(){showCard(state.lines.length?'Add another receipt to this report.':'Attach a receipt, or use the sample to try the complete flow.',card([title('Add receipts'),text('Upload a photo or PDF. You can attach a card statement with the receipt.'),caption('Actual files: enter expense details manually. Sample: try two extracted receipts and a matched SGD card charge.')],[noInputAction('Choose files','pickFile',{},true),noInputAction('Use sample receipts + statement','sample'),noInputAction('Enter details manually','manual'),...(state.lines.length?[noInputAction('Back to preview','preview')]:[])]),'upload');if(state.pendingFiles.length){const files=[...state.pendingFiles];state.pendingFiles=[];addFiles(files,false);}}
function newLine(overrides={}){return {id:uid(),merchant:'',date:'2026-10-21',currency:'SGD',originalAmount:0,amount:0,expenseType:'Transportation',justification:'',amountSource:'manual',receiptMissing:false,sample:false,...overrides};}
function review(line,missing=false){showCard(missing?'Add an expense only if its original receipt is missing.':'Check the extracted details. You can edit the numbers, currency and other fields directly.',receiptCard(line,{missing}),missing?'missing':'receipt',line);}
function preview(){if(!state.report){context();return;}showCard('Here’s your report so far. You can edit new items, add a receipt, or save the draft.',previewCard(state.report,state.lines,state.baseTotal),'preview');}
function showReports(filter='all'){const accessible=reports.filter(r=>people.some(p=>p.id===r.claimant));const filtered=accessible.filter(r=>filter==='all'||r.status===filter);const body=[title('Expense reports'),caption('Reports you own or are authorised to prepare.'),choice('statusFilter','Status',[{title:'All reports',value:'all'},...['Draft','Pending approval','Approved'].map(s=>({title:s,value:s}))],filter)];for(const r of filtered){const person=people.find(p=>p.id===r.claimant);body.push({type:'Container',separator:true,spacing:'Medium',items:[text(r.purpose,{weight:'Bolder'}),caption(`${r.id} · ${person.name} · ${r.status}`),text('SGD '+money(r.total),{weight:'Bolder'}),{type:'ActionSet',actions:[noInputAction('View details','reportDetail',{reportId:r.id}),...(r.status==='Draft'?[noInputAction('Continue draft','openDraft',{reportId:r.id}),noInputAction('Delete','deleteAsk',{reportId:r.id})]:[])]}]});}if(!filtered.length)body.push(text('No reports match this filter.'));showCard('Here are the reports you can access.',card(body,[action('Apply filter','filterReports',{},true),noInputAction('New expense report','start')]),'reports');}
function showReportDetail(id){const r=reports.find(r=>r.id===id);if(!r){showReports();return;}showCard('Here are the latest details for this report.',card([title(r.id),facts([['Purpose',r.purpose],['Prepared for',people.find(p=>p.id===r.claimant).name],['Status',r.status],['Amount','SGD '+money(r.total)],['Lines',r.lines.length+(r.existingLines||0)],...(r.approver?[['Current approver / outcome',r.approver]]:[])]),...savedLineSections(r.lines,{heading:'Expense lines',unknownCount:r.existingLines||0}),caption(r.status==='Draft'?'This is a draft. Submit it in Oracle when ready.':'Read-only inquiry. Approval actions are outside this demo.')],[noInputAction('Back to reports','reports',{},true),...(r.status==='Draft'?[noInputAction('Continue draft','openDraft',{reportId:r.id}),noInputAction('Delete draft','deleteAsk',{reportId:r.id})]:[])]),'reports');}
function startDraft(r){state.person=people.find(p=>p.id===r.claimant);state.report={person:state.person,purpose:r.purpose,template:r.template,trip:r.trip,existingId:r.id,savedLines:structuredClone(r.lines),unknownSavedCount:r.existingLines||0};state.baseTotal=r.total;state.lines=[];state.files=[];user(`Continue ${r.id}`);showCard(`We’ll add new items to ${r.id}. Existing lines and the template will stay unchanged.`,card([title('Continue existing draft'),facts([['Prepared for',state.person.name],['Purpose',r.purpose],['Saved amount','SGD '+money(r.total)]]),...savedLineSections(r.lines,{heading:'Existing saved lines',unknownCount:r.existingLines||0}),caption('Add new receipts below. Existing lines cannot be edited in the bot.')],[noInputAction('Add receipts','upload',{},true),noInputAction('Choose different draft','chooseDraft')]),'drafts');}
function save(){if(!state.report||!state.lines.length){toast('Add at least one expense before saving.');return;}const report=state.report;let total=state.lines.reduce((s,l)=>s+l.amount,0);let saved;if(report.existingId){saved=reports.find(r=>r.id===report.existingId);if(!saved||saved.status!=='Draft'){toast('This report is no longer a draft. Refresh the report list.');showReports();return;}saved.lines.push(...structuredClone(state.lines));saved.total=Math.round((saved.total+total)*100)/100;saved.files.push(...state.files.map(f=>({name:f.name,sample:!!f.sample})));}else{const seq=Math.max(1042,...reports.map(r=>Number(r.id.match(/(\d+)$/)?.[1])||0))+1;saved={id:'ER-DEMO-'+seq,claimant:state.person.id,purpose:report.purpose,template:report.template,trip:report.trip,status:'Draft',total:Math.round(total*100)/100,existingLines:0,lines:structuredClone(state.lines),files:state.files.map(f=>({name:f.name,sample:!!f.sample}))};reports.unshift(saved);}state.lastSaved=saved.id;persist();user(report.existingId?'Save additional lines':'Save draft');showCard(report.existingId?'Your new lines have been added to the existing draft.':'Your expense report draft is ready.',card([title('Draft saved'),text(saved.id,{color:'Good',weight:'Bolder'}),facts([['Prepared for',state.person.name],['Total','SGD '+money(saved.total)],['Status','Draft'],['Lines',saved.lines.length+(saved.existingLines||0)],['Supporting files',saved.files.length]]),text('Review and submit your report in Oracle iExpense.'),caption('Demo result saved in this browser only. No data was sent to Oracle.')],[noInputAction('View reports','reports',{},true),noInputAction('Start another report','start')]),'saved');state.report=null;state.lines=[];state.baseTotal=0;state.files=[];}
let sampleQueue=[];
function sample(){state.files.push({name:'receipts-photo.jpg',sample:true},{name:'card-statement.pdf',sample:true});user('Use sample receipts and card statement',[{name:'receipts-photo.jpg',sample:true},{name:'card-statement.pdf',sample:true}]);sampleQueue=[newLine({merchant:'Grand Hotel',date:'2026-10-20',currency:'USD',originalAmount:100,amount:135.20,expenseType:'Accommodation',justification:'Jakarta client meeting',amountSource:'statement',sample:true}),newLine({merchant:'Airport Taxi',originalAmount:28.80,amount:28.80,expenseType:'Transportation',justification:'Airport transfer',amountSource:'manual',sample:true})];review(sampleQueue.shift());}
function addFiles(files,announce=true){const accepted=[];for(const f of files){if(f.size>10*1024*1024){toast(`${f.name}: files must be 10 MB or smaller.`);continue;}if(!f.type.startsWith('image/')&&!/\.pdf$/i.test(f.name)){toast(`${f.name}: choose a receipt image or PDF.`);continue;}accepted.push(f);}if(!accepted.length)return;if(announce)user('Attached receipt / supporting documents',accepted);if(!state.report){state.pendingFiles.push(...accepted);context();return;}state.files.push(...accepted.map(f=>({name:f.name,size:f.size,file:f}))); const receipt=accepted.find(f=>!/statement/i.test(f.name));review(newLine({merchant:receipt?receipt.name.replace(/\.[^.]+$/,''):''}));}
function handleAction(d,entry){switch(d.verb){
 case 'pauseWizard':requestWizardClose();break;
 case 'resumeWizard':openWizard();setStep(state.wizardStage||'context');break;
 case 'discardWizard':openWizard();requestWizardClose();break;
 case 'chooseDraft':chooseDraft();break;
 case 'home':showCard('I can help when you’re ready.',welcomeCard(),'welcome');break;
 case 'start':beginWizard();break;
 case 'context':{const person=people.find(p=>p.id===d.person);if(!person)return;if(state.person?.id!==person.id){state.report=null;state.lines=[];state.files=[];state.baseTotal=0;}state.person=person;user('Prepare report for '+person.name);chooseDraft();break;}
 case 'new':state.report=null;state.lines=[];state.files=[];state.baseTotal=0;setup();break;
 case 'continueDraft':{const r=reports.find(r=>r.id===d.draftId&&r.claimant===state.person.id&&r.status==='Draft');if(r)startDraft(r);break;}
 case 'setup':state.report={person:state.person,purpose:String(d.purpose||'').trim(),template:d.template||state.report?.template,trip:d.trip};user(d.purpose);upload();break;
 case 'upload':upload();break;
 case 'pickFile':$('#file-picker').click();break;
 case 'sample':sample();break;
 case 'manual':review(newLine());break;
 case 'confirmLine':{const original=Number(d.originalAmount),amount=Number(d.amount);if(!Number.isFinite(original)||original<=0||!Number.isFinite(amount)||amount<=0){showError(entry,'Enter valid amounts greater than zero.');return;}if(d.currency==='SGD'&&Math.abs(original-amount)>.005){showError(entry,'For an SGD receipt, the original and claim amounts should match. Correct the amounts before confirming.');return;}const line={id:d.lineId,merchant:String(d.merchant||'').trim(),date:d.date,currency:d.currency,originalAmount:original,amount:Math.round(amount*100)/100,expenseType:d.expenseType,justification:String(d.justification||'').trim(),amountSource:d.amountSource||'manual',receiptMissing:!!d.missing,sample:state.files.some(f=>f.sample)};if(!line.merchant||!line.justification||!line.date){showError(entry,'Please complete the required expense fields.');return;}const i=state.lines.findIndex(l=>l.id===line.id);if(i<0)state.lines.push(line);else state.lines[i]=line;user(`${i>=0?'Updated':'Confirmed'} ${line.merchant} · SGD ${money(line.amount)}`);if(sampleQueue.length)review(sampleQueue.shift());else preview();break;}
 case 'preview':preview();break;
 case 'cancelLine':sampleQueue=[];user('Cancel this entry');if(state.lines.length||state.report?.existingId)preview();else upload();break;
 case 'addMissing':sampleQueue=[];user('Add item without a receipt');review(newLine({receiptMissing:true}),true);break;
 case 'editLine':{sampleQueue=[];const line=state.lines.find(l=>l.id===d.lineId);if(line){user('Edit '+line.merchant);review({...line},line.receiptMissing);}break;}
 case 'removeLine':state.lines=state.lines.filter(l=>l.id!==d.lineId);user('Remove this new item');preview();break;
 case 'save':save();break;
 case 'reports':user('Show expense reports');showReports();break;
 case 'filterReports':showReports(d.statusFilter);break;
 case 'reportDetail':showReportDetail(d.reportId);break;
 case 'openDraft':{const r=reports.find(r=>r.id===d.reportId&&r.status==='Draft');if(r)startDraft(r);break;}
 case 'deleteAsk':{const r=reports.find(r=>r.id===d.reportId&&r.status==='Draft');if(!r)return;showCard('Please confirm before deleting this draft.',card([title('Delete '+r.id+'?'),facts([['Purpose',r.purpose],['Prepared for',people.find(p=>p.id===r.claimant).name],['Amount','SGD '+money(r.total)]]),text('This removes the whole draft, including its expense items.',{color:'Attention'})],[action('Delete draft','deleteConfirm',{reportId:r.id},false,{style:'destructive'}),noInputAction('Keep draft','reports',{},true)]),'delete');break;}
 case 'deleteConfirm':{const r=reports.find(r=>r.id===d.reportId&&r.status==='Draft');if(!r)return;reports=reports.filter(r=>r.id!==d.reportId);persist();user('Delete '+d.reportId);bot(d.reportId+' was deleted from the demo.');if(state.report?.existingId===r.id){state.report=null;state.lines=[];state.baseTotal=0;}showReports();break;}
 default:toast('This action is not part of the demo.');
}}
function send(){const box=$('#message-input'),message=box.value.trim();if(!message)return;box.value='';user(message,[],true);if(/report|status|claim history|รายการ|สถานะ/i.test(message)&&!/new|start|create|ทำ|สร้าง/i.test(message)){showReports();return;}if(/receipt|upload|ใบเสร็จ/i.test(message)&&state.report){upload();return;}if(/preview|confirm|summary|สรุป/i.test(message)&&state.report){preview();return;}if(/new|start|create|expense|claim|เบิก|เริ่ม|สร้าง/i.test(message)){beginWizard();return;}showCard('Try “start an expense report”, “show reports”, or attach a receipt. This demo uses guided responses; it is not connected to an AI service.',welcomeCard(),'welcome');}
$('#send').onclick=send;$('#message-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}};
$('#attach-file').onclick=()=>$('#file-picker').click();$('#file-picker').onchange=e=>{addFiles([...e.target.files]);e.target.value='';};
$('#notes-toggle').onclick=()=>{const panel=$('#technical');panel.hidden=!panel.hidden;$('#notes-toggle').setAttribute('aria-expanded',String(!panel.hidden));};$('#notes-close').onclick=()=>{ $('#technical').hidden=true;$('#notes-toggle').setAttribute('aria-expanded','false');};
$('#reset').onclick=()=>{finishWizard();reports=structuredClone(initialReports);persist();state.person=null;state.report=null;state.lines=[];state.files=[];state.pendingFiles=[];state.baseTotal=0;sampleQueue=[];cards=[];log.innerHTML='<div class="day-divider"><span>Today</span></div>';showCard('Hi Sarah. Let’s take the paperwork out of your expense claims.',welcomeCard(),'welcome');};
$('#reports-tab').onclick=()=>{user('Show expense reports');showReports();};$('#chat-tab').onclick=()=>{log.focus();scrollBottom();};
$('#commands').onclick=()=>showCard('Here’s what I can help with.',welcomeCard(),'welcome');
$('#help').onclick=()=>showCard('About this interactive prototype',card([title('iExpense · SG Phase 1'),text('Prepare a new draft, continue a draft, review receipts, add optional items without a receipt, and check report status.'),caption('All identities, trips, permissions, rates, OCR results and Oracle operations are simulated. Actual files stay in this browser session. Draft metadata is stored locally in this browser. Use Restart demo to restore the samples.')],[noInputAction('Start an expense report','start',{},true),noInputAction('Show reports','reports')]),'welcome');
document.querySelectorAll('[data-rail]').forEach(b=>b.onclick=()=>b.dataset.rail==='chat'?scrollBottom():toast('This prototype focuses on the iExpense bot chat.'));
showCard('Hi Sarah. Let’s take the paperwork out of your expense claims.',welcomeCard(),'welcome');
