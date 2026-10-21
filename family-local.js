// Local-only workbench. No game imports, model API calls, browser data persistence, or HTML injection.
const $=s=>document.querySelector(s), host=$('#content'), note=$('#message');
const uid=()=>crypto.randomUUID(), version='family-authoring/1';
let mode='question',questions=[],assignments=[],q=null,w=null,proposal=null,student=null,answers={};
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e};
const button=(title,fn)=>{const e=node('button',title);e.type='button';e.onclick=fn;return e};
function field(parent,title,value,change,large=false){const label=node('label',title),input=node(large?'textarea':'input');input.value=value??'';input.oninput=()=>change(input.value);label.append(input);parent.append(label);return input}
function select(parent,title,options,selected,change){const label=node('label',title),s=node('select');for(const [v,text] of options){const o=node('option',text);o.value=v;s.append(o)}s.value=selected;s.onchange=()=>change(s.value);label.append(s);parent.append(label)}
function panel(title){return node('section',undefined)}
function card(parent,title){const e=node('div');e.className='card stack';e.append(node('h3',title));parent.append(e);return e}
const newQuestion=()=>({schemaVersion:version,id:uid(),revision:1,title:'',subject:'Mathematics',prompt:'',parts:[{id:uid(),kind:'short_text',prompt:''}]});
const newWorkbook=()=>({schemaVersion:version,id:uid(),revision:1,title:'',instructions:'',sections:[{id:uid(),title:'Section 1',category:'',items:[]}]});
async function request(path,body){const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const obj=await r.json();if(!r.ok)throw Error(obj.error||'Request failed');return obj.data}
function alertMessage(text){note.textContent=text}
async function refresh(){questions=await request('questions');assignments=await request('assignments')}
function execute(fn){return async()=>{try{await fn();alertMessage('Saved successfully.');await refresh();render()}catch(e){alertMessage(e.message)}}}
function choose(name){mode=name;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===name));render()}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>choose(b.dataset.tab));
function saveQuestion(){return execute(async()=>{if(!q)throw Error('No question draft');if(!q.prompt.trim()||q.parts.some(p=>!p.prompt.trim()))throw Error('Enter question and part prompts');const old=questions.find(x=>x.id===q.id);q.revision=old?old.revision+1:1;await request('questions',q);q=null})()}
function questionEditor(){
 const box=card(host,'Question Library');box.append(button('Create question',()=>{q=newQuestion();render()}));
 questions.forEach(item=>{const r=card(box,(item.title||item.prompt)+' · revision '+item.revision);r.append(button('Revise',()=>{q=structuredClone(item);render()}),button('Duplicate',()=>{q=structuredClone(item);q.id=uid();q.revision=1;render()}))});
 if(!q)return;
 const e=card(host,'Question draft');field(e,'Title',q.title,v=>q.title=v);field(e,'Subject',q.subject,v=>q.subject=v);field(e,'Main prompt',q.prompt,v=>q.prompt=v,true);
 q.parts.forEach((part,index)=>{const c=card(e,'Part '+(index+1));field(c,'Prompt',part.prompt,v=>part.prompt=v,true);
 select(c,'Response type',[['single_choice','Single choice'],['multi_choice','Multiple choice'],['short_text','Short text'],['number','Numeric'],['long_text','Descriptive']],part.kind,v=>{part.kind=v;delete part.options;delete part.answerSpec;render()});
 if(part.kind.includes('choice')){field(c,'Options (one per line)',(part.options||[]).join('\n'),v=>part.options=v.split('\n').map(x=>x.trim()).filter(Boolean),true);field(c,'Correct option(s), one per line',Array.isArray(part.answerSpec?.correct)?part.answerSpec.correct.join('\n'):part.answerSpec?.correct||'',v=>{const a=v.split('\n').map(x=>x.trim()).filter(Boolean);part.answerSpec={correct:part.kind==='single_choice'?a[0]||'':a}},true)}
 if(part.kind==='number')field(c,'Correct number',part.answerSpec?.correct??'',v=>part.answerSpec={correct:Number(v)});
 if(part.kind==='short_text')field(c,'Accepted text answer',part.answerSpec?.correct??'',v=>part.answerSpec={correct:v});
 if(part.kind==='long_text')field(c,'Manual review rubric',part.answerSpec?.reviewGuidance??'',v=>part.answerSpec={reviewGuidance:v},true);
 c.append(button('Remove part',()=>{q.parts.splice(index,1);render()}))});
 e.append(button('Add question part',()=>{q.parts.push({id:uid(),kind:'short_text',prompt:''});render()}),button('Save question revision',saveQuestion));
}
function workbookEditor(){
 const box=card(host,'Workbook Library');box.append(button('Create workbook',()=>{w=newWorkbook();render()}));
 assignments.forEach(item=>{const r=card(box,item.title+' · revision '+item.revision);r.append(button('Revise',()=>{w=structuredClone(item);render()}),button('Duplicate',()=>{w=structuredClone(item);w.id=uid();w.revision=1;render()}))});
 if(!w)return;
 const e=card(host,'Workbook draft');field(e,'Workbook title',w.title,v=>w.title=v);field(e,'Instructions',w.instructions,v=>w.instructions=v,true);
 w.sections.forEach((section,si)=>{const c=card(e,'Section '+(si+1));field(c,'Section title',section.title,v=>section.title=v);field(c,'Category',section.category,v=>section.category=v);
 section.items.forEach((item,ii)=>{const r=card(c,item.questionSnapshot.title||item.questionSnapshot.prompt);r.append(button('Move up',()=>{if(ii){[section.items[ii-1],section.items[ii]]=[section.items[ii],section.items[ii-1]];render()}}),button('Move down',()=>{if(ii<section.items.length-1){[section.items[ii+1],section.items[ii]]=[section.items[ii],section.items[ii+1]];render()}}),button('Remove',()=>{section.items.splice(ii,1);render()}))});
 const opts=[['','Select a question'],...questions.map(x=>[x.id,x.title||x.prompt])];select(c,'Add library question',opts,'',id=>{const item=questions.find(x=>x.id===id);if(item){section.items.push({id:uid(),questionId:item.id,questionRevision:item.revision,questionSnapshot:structuredClone(item)});render()}});
 c.append(button('Remove section',()=>{w.sections.splice(si,1);render()}))});
 e.append(button('Add section',()=>{w.sections.push({id:uid(),title:'New section',category:'',items:[]});render()}),button('Save workbook revision',execute(async()=>{if(!w)throw Error('No workbook');const old=assignments.find(x=>x.id===w.id);w.revision=old?old.revision+1:1;await request('assignments',w);w=null})));
}
function agentEditor(){const e=card(host,'Agent-ready structured proposal');e.append(node('p','Write a workbook brief in natural language, copy it into an AI assistant, then paste its structured JSON proposal below. No AI API or charges are incurred.'));
 const brief=field(e,'Workbook instructions for AI','Create 30 questions in 3 ordered sections for fourth-grade mathematics, with a mix of choice, numeric and descriptive responses.',()=>{},true);
 const prompt=node('textarea');prompt.setAttribute('aria-label','Agent instructions output');prompt.readOnly=true;prompt.rows=7;e.append(button('Prepare agent prompt',()=>{prompt.value='Generate only valid JSON using schemaVersion family-authoring/1. kind must be assignment, draft must contain id,revision,title,instructions,sections. Every section has id,title,category,items; every item has id,questionId,questionRevision,questionSnapshot. Snapshot is a question with schemaVersion,id,revision,subject,prompt,parts. Each part has id,prompt,kind (single_choice,multi_choice,short_text,number,long_text), optional options and answerSpec. Use unique string ids and revision 1. Never include real personal information. Request: '+brief.value}));e.append(prompt);
 const input=field(e,'Paste generated JSON proposal','',()=>{},true);
 e.append(button('Validate proposal',()=>{try{const parsed=JSON.parse(input.value);const draft=parsed.kind==='assignment'?parsed.draft:parsed.kind==='question'?parsed.draft:null;if(parsed.schemaVersion!==version||!draft)throw Error('Expected family-authoring/1 question or assignment proposal');proposal=parsed;alertMessage('Parsed proposal; review and explicitly accept below.');render()}catch(err){alertMessage('Invalid proposal: '+err.message)}}));
 if(proposal){const pre=node('pre',JSON.stringify(proposal.draft,null,2));pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';e.append(pre);e.append(button('Accept as editable draft',()=>{if(proposal.kind==='question'){q=proposal.draft;choose('question')}else{w=proposal.draft;choose('workbook')}proposal=null}))}
}
function studentEditor(){
 const e=card(host,'Fictional learner preview');e.append(node('p','Learner view intentionally excludes answer keys and grading rubrics.'));
 select(e,'Workbook',[['','Select a workbook'],...assignments.map(x=>[x.id,x.title])],student?.id||'',id=>{student=assignments.find(x=>x.id===id)||null;answers={};render()});
 if(!student)return;
 student.sections.forEach(s=>{const c=card(e,s.title+' · '+(s.category||'Practice'));s.items.forEach(item=>{const q=item.questionSnapshot;const r=card(c,q.prompt);q.parts.forEach(p=>{const key=item.id+':'+p.id;if(['single_choice','multi_choice'].includes(p.kind)){const opts=p.options.map(o=>[o,o]);select(r,p.prompt,[['','Choose an answer'],...opts],answers[key]||'',v=>answers[key]=p.kind==='multi_choice'?v.split(','):v)}else field(r,p.prompt,answers[key]||'',v=>answers[key]=v,p.kind==='long_text')})})});
 e.append(button('Submit fictional answers',execute(async()=>{const response=await request('attempts',{assignmentId:student.id,answers});alertMessage(JSON.stringify(response.feedback));student=null})));
}
function render(){host.replaceChildren();if(mode==='question')questionEditor();if(mode==='workbook')workbookEditor();if(mode==='agent')agentEditor();if(mode==='student')studentEditor()}
refresh().then(render).catch(e=>alertMessage('Local database unavailable: '+e.message));
