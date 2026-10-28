export const people = [
 { id:'sarah', name:'Sarah Lim', employee:'SG-0102', costCenter:'1100', delegated:false },
 { id:'alex', name:'Alex Tan', employee:'SG-0048', costCenter:'1200', delegated:true }
];
export const types=['Accommodation','Transportation','Meals','Office supplies','Other expense'];
export const currencyChoices=['SGD','USD','MYR','THB','IDR','EUR'];
export const sampleRates={SGD:1,USD:1.352,MYR:.31,THB:.039,IDR:.000086,EUR:1.46};
export const initialReports=[
 {id:'ER-DEMO-1042',claimant:'alex',purpose:'Jakarta client meeting',template:'Non HR — Trip Expenses',trip:'BTR-DEMO-001',status:'Draft',total:420,existingLines:0,lines:[
  {id:'saved-1042-1',merchant:'Hotel Nusantara',date:'2026-10-19',expenseType:'Accommodation',currency:'USD',originalAmount:200,amount:270,amountSource:'statement',justification:'Two nights for the Jakarta client meeting',receiptMissing:false,receiptFileName:'nusantara-hotel.pdf',sample:true},
  {id:'saved-1042-2',merchant:'Jakarta Airport Transfer',date:'2026-10-19',expenseType:'Transportation',currency:'SGD',originalAmount:150,amount:150,amountSource:'manual',justification:'Airport transfer for the client meeting',receiptMissing:false,receiptFileName:'airport-transfer.pdf',sample:true}
 ],files:[{name:'nusantara-hotel.pdf',sample:true},{name:'airport-transfer.pdf',sample:true}]},
 {id:'ER-DEMO-1038',claimant:'alex',purpose:'Regional finance workshop',template:'Non HR — Trip Expenses',trip:'BTR-DEMO-002',status:'Pending approval',total:280,existingLines:0,lines:[
  {id:'saved-1038-1',merchant:'Harbour Business Hotel',date:'2026-10-22',expenseType:'Accommodation',currency:'SGD',originalAmount:250,amount:250,amountSource:'manual',justification:'Overnight stay for the finance workshop',receiptMissing:false,receiptFileName:'harbour-hotel.pdf',sample:true},
  {id:'saved-1038-2',merchant:'Workshop Lunch',date:'2026-10-22',expenseType:'Meals',currency:'SGD',originalAmount:30,amount:30,amountSource:'manual',justification:'Lunch during the regional finance workshop',receiptMissing:true,sample:true}
 ],files:[{name:'harbour-hotel.pdf',sample:true}],approver:'Jamie Lee'},
 {id:'ER-DEMO-1031',claimant:'sarah',purpose:'SG office supplies',template:'Non HR — Other Expenses',trip:'none',status:'Approved',total:46.50,existingLines:0,lines:[
  {id:'saved-1031-1',merchant:'Office Stationery SG',date:'2026-10-16',expenseType:'Office supplies',currency:'SGD',originalAmount:46.50,amount:46.50,amountSource:'manual',justification:'Stationery for the Singapore office',receiptMissing:false,receiptFileName:'stationery-receipt.pdf',sample:true}
 ],files:[{name:'stationery-receipt.pdf',sample:true}],approver:'Finance review completed'}
];
// Enrich only recognised legacy sample reports; preserve edits, new lines and deletions.
// Unknown historical lines remain explicitly unavailable instead of being invented.
export function hydrateLegacySampleReports(reports){
 return reports.map(report=>{
  const fixture=initialReports.find(f=>f.id===report.id);
  if(!fixture||!report.existingLines)return report;
  const addedTotal=report.lines.reduce((sum,l)=>sum+Number(l.amount||0),0);
  if(report.existingLines!==fixture.lines.length||Math.abs(report.total-addedTotal-fixture.total)>.01)return report;
  const knownIds=new Set(report.lines.map(l=>l.id));
  const files=[...fixture.files,...(report.files||[])].filter((f,i,all)=>all.findIndex(x=>x.name===f.name)===i);
  return {...report,existingLines:0,lines:[...structuredClone(fixture.lines).filter(l=>!knownIds.has(l.id)),...report.lines],files};
 });
}
export const notes={
 welcome:{step:'1 · Start / identify user',items:[['bot','Teams SSO → FND user','Production ระบุผู้จัดทำจาก Teams SSO แล้ว map ไป FND user ใน demo ใช้ Sarah Lim เป็นข้อมูลตัวอย่าง'],['missing','User context query','ขอ responsibility / org ที่ใช้ได้ของผู้จัดทำ และ employee identity จาก Oracle']]},
 context:{step:'3 · Org / delegation (proposed earlier)',items:[['bot','Teams dialog wizard','ใช้ pattern เดียวกับ HR bot: chat เปิด dialog แล้วทำ form actions ภายในโดยตรง ไม่ส่งข้อความให้ LLM ตีความ (demo ใช้ browser dialog; production ใช้ Teams Dialog)'],['missing','Expense Entry Permissions query','แสดงเฉพาะผู้ที่มอบสิทธิ์ให้ Sarah ทำแทนได้ ตัวเลือกใน demo เป็นข้อมูลสมมติ'],['missing','Default account / cost center','อ่านจาก EBS ของผู้เบิกโดยอัตโนมัติ ไม่ให้เลขาเลือก cost center เอง'],['partial','create_report / p_preparer_id','มี parameter แต่ยังไม่ได้บันทึก preparer และยังต้องตรวจสิทธิ์ทำแทนตอน write']]},
 drafts:{step:'2 · New / continue draft',items:[['missing','Latest 10 drafts + detail query','กรองตามผู้เบิก Org และ delegation แสดงเฉพาะรายงานที่เข้าถึงได้'],['partial','get_report_status','อ่าน status/total/count ได้ทีละ report ไม่ได้คืน draft list หรือ line details'],['bot','Sequence proposal','เลือกผู้เบิกก่อนโหลด draft เพื่อกรองได้ตรงคน ให้ VE ยืนยันการสลับ step 2/3 จาก PPT']]},
 setup:{step:'4 · Template / purpose / trip',items:[['missing','Templates / types / DFF query','รายการตาม responsibility และผู้เบิก รวม Local–Expat / flags / field mapping'],['missing','Approved BTR query','ขอ SQL approved leave ของผู้เบิก รวมกรณีเลขาทำแทน'],['ready','create_report header inputs','มี template, purpose, currency, cost center และ header attribute1–5 แล้ว รอ DFF mapping']]},
 upload:{step:'5 · Upload receipts',items:[['bot','Attachment + document processing','ไฟล์จริงเลือกได้และเก็บในหน่วยความจำ browser เท่านั้น Demo ไม่ทำ OCR; ตัวอย่างแยกหลายใบเสร็จระบุชัด'],['ready','XXAP_IEXP_ATTACH.attach_file','มี BLOB attachment สูงสุด 10 MB/ไฟล์ เรียกหลังได้ report id ต้องยืนยัน configuration ก่อนใช้จริง']]},
 receipt:{step:'6 · Review / edit receipt',items:[['bot','Real Adaptive Cards inputs','ใช้ Microsoft Adaptive Cards SDK และ Input.Number / Input.Text / Input.ChoiceSet กรอกได้จริง เก็บ state และคำนวณใหม่'],['ready','xxap_iexp_line_obj','มี amount, receipt_amount/currency/rate, dates, justification และ DFF แล้ว ยอด SGD ตามบัตรใช้ field เดิมได้'],['missing','Corporate rate query','ไม่มี statement ใช้ manual rate หรือ lookup Corporate rate (rate ใน demo เป็นค่าตัวอย่าง)'],['partial','Custom validation · if provided','ขอ signature และ error contract ถ้ามี package เพิ่ม ต้องตรวจที่ API ซ้ำก่อน save']]},
 preview:{step:'9 · Preview / optional additions',items:[['ready','XXAP_IEXP_API.create_report','สร้างใหม่ส่ง p_submit=N, SGD, header + line collection; แก้ delegation และ missing flag ตาม gap'],['missing','append_draft_lines (proposed)','ต่อ draft เดิมต้องเพิ่ม operation ตรวจสิทธิ์+สถานะ คง template และรวมยอด ไม่ update existing lines; อนุญาตลบแล้วเพิ่มใหม่'],['bot','Optional missing-receipt action','ไม่บังคับผ่านหน้า skip: เพิ่มจากปุ่มบน preview เมื่อมีรายการจริง ยอดรวมคำนวณจาก state']]},
 missing:{step:'8 · Optional original receipt missing',items:[['partial','xxap_iexp_line_obj / receipt flag','ต้องเพิ่ม input ต่อ line ปัจจุบัน insert receipt_missing_flag=N ตายตัว'],['bot','Add an item, not an extra mandatory step','เมื่อผู้ใช้กดเพิ่ม จะสร้าง line ใหม่ที่ receiptMissing=true; กดยกเลิกไม่เพิ่มและไม่เปลี่ยนยอด']]},
 saved:{step:'9 · Save draft result',items:[['bot','Dialog → chat result','บันทึกสำเร็จแล้วปิด popup และส่งผลสรุปกลับ chat เท่านั้น ไม่มีข้อความจำลอง Next / Confirm ระหว่าง wizard'],['ready','create_report → attach_file → status','ใน production เรียก create/append แนบไฟล์ และอ่านผลกลับ พร้อมกำหนด transaction/retry ให้ชัด'],['bot','Local demo storage','บันทึก metadata และตัวเลขใน localStorage ของ browser เท่านั้น ไม่ส่ง Oracle และไม่บันทึกไฟล์แนบข้าม refresh'],['missing','Full detail read query','หากแสดง lines/attachment list จาก EBS ต้อง query เพิ่ม get_report_status คืนเพียงจำนวน/ยอด']]},
 reports:{step:'Additional · report inquiry',items:[['missing','Report list / details query','กรอง employee/delegation/org และ status รวม pagination'],['ready','get_report_status','อ่าน raw report status / total / counts ได้ราย report'],['missing','Current approver query','ชื่อผู้อนุมัติและ approval trail ยังไม่มีใน status procedure ระดับ preview-routing ต้องยืนยัน']]},
 delete:{step:'Additional · delete draft',items:[['missing','delete_draft (proposed)','ตรวจสิทธิ์และสถานะล่าสุดก่อนลบ พร้อมจัดการ lines/attachments ตามวิธีที่ Oracle team ยืนยัน'],['missing','delete_draft_line (proposed)','ลบ line ที่บันทึกแล้วเฉพาะ Draft ตรวจสิทธิ์/สถานะล่าสุดและคำนวณยอด header ใหม่ใน transaction เดียวกัน; ยังต้องให้ Oracle team ยืนยัน operation'],['bot','Confirmation + refresh','ยืนยันก่อนลบ line หรือ report ทั้งฉบับ ลบทันทีแล้ว refresh ยอด/รายละเอียด; ไม่รองรับ update saved line']]}
};
notes.deleteWizard=notes.delete;
export const money=n=>new Intl.NumberFormat('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
export const uid=()=>crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
