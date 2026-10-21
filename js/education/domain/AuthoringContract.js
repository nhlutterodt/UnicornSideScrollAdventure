// Family Space authoring contract v1. Pure domain logic: no browser, database or AI provider.
export const SCHEMA_VERSION = 'family-authoring/1';
const TYPES = new Set(['single_choice','multi_choice','short_text','number','long_text']);
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const unique = (xs) => new Set(xs).size === xs.length;
const add = (errors,path,message) => errors.push({path,message});
const jsonCopy = x => JSON.parse(JSON.stringify(x));

export function validateQuestion(q) {
  const errors=[];
  if (!isObject(q)) return [{path:'$',message:'Question must be an object'}];
  if(q.schemaVersion!==SCHEMA_VERSION)add(errors,'schemaVersion','Unsupported version');
  if(!nonempty(q.id))add(errors,'id','ID required');
  if(!Number.isInteger(q.revision)||q.revision<1)add(errors,'revision','Positive integer revision required');
  if(!nonempty(q.prompt))add(errors,'prompt','Prompt required');
  if(!nonempty(q.subject))add(errors,'subject','Subject required');
  if(!Array.isArray(q.parts)||!q.parts.length){add(errors,'parts','At least one answer part required');return errors}
  const ids=[];
  q.parts.forEach((part,i)=>{
    const p=`parts[${i}]`;
    if(!isObject(part)){add(errors,p,'Part must be an object');return}
    ids.push(part.id);
    if(!nonempty(part.id))add(errors,p+'.id','ID required');
    if(!nonempty(part.prompt))add(errors,p+'.prompt','Part prompt required');
    if(!TYPES.has(part.kind))add(errors,p+'.kind','Unsupported response kind');
    if(['single_choice','multi_choice'].includes(part.kind)){
      if(!Array.isArray(part.options)||part.options.length<2||!part.options.every(nonempty)||!unique(part.options))add(errors,p+'.options','At least two distinct nonempty choices required');
      if(part.answerSpec!==undefined){
        const correct=part.answerSpec?.correct;
        const selections=part.kind==='single_choice'?[correct]:correct;
        if(!Array.isArray(selections)||!selections.length||!selections.every(s=>typeof s==='string'&&part.options?.includes(s))||!unique(selections)|| (part.kind==='single_choice'&&typeof correct!=='string'))add(errors,p+'.answerSpec','Answer must match the defined options');
      }
    }
    if(part.kind==='number' && part.answerSpec!==undefined && (typeof part.answerSpec?.correct!=='number'||!Number.isFinite(part.answerSpec.correct)))add(errors,p+'.answerSpec','Numeric answer required');
    if(part.kind==='long_text' && part.answerSpec!==undefined && !nonempty(part.answerSpec?.reviewGuidance))add(errors,p+'.answerSpec','Long response requires review guidance, not a forced exact-match answer');
  });
  if(!unique(ids))add(errors,'parts','Duplicate part IDs');
  return errors;
}

export function validateAssignment(a){
  const errors=[];
  if(!isObject(a))return [{path:'$',message:'Assignment must be an object'}];
  if(a.schemaVersion!==SCHEMA_VERSION)add(errors,'schemaVersion','Unsupported version');
  if(!nonempty(a.id))add(errors,'id','ID required');
  if(!Number.isInteger(a.revision)||a.revision<1)add(errors,'revision','Positive integer revision required');
  if(!nonempty(a.title))add(errors,'title','Title required');
  if(!Array.isArray(a.sections)||!a.sections.length){add(errors,'sections','At least one section required');return errors}
  const sectionIds=[],itemIds=[];
  let count=0;
  a.sections.forEach((s,i)=>{
    const p=`sections[${i}]`;
    if(!isObject(s)){add(errors,p,'Section must be an object');return}
    sectionIds.push(s.id);
    if(!nonempty(s.id))add(errors,p+'.id','ID required');
    if(!nonempty(s.title))add(errors,p+'.title','Section title required');
    if(!Array.isArray(s.items)){add(errors,p+'.items','Items array required');return}
    s.items.forEach((item,j)=>{
      const path=`${p}.items[${j}]`;count++;
      if(!isObject(item)){add(errors,path,'Item must be an object');return}
      itemIds.push(item.id);
      if(!nonempty(item.id))add(errors,path+'.id','ID required');
      if(!nonempty(item.questionId)||!Number.isInteger(item.questionRevision)||item.questionRevision<1)add(errors,path,'Question id and revision required');
      if(!isObject(item.questionSnapshot)){add(errors,path+'.questionSnapshot','Question snapshot required');return}
      if(item.questionId!==item.questionSnapshot.id||item.questionRevision!==item.questionSnapshot.revision)add(errors,path+'.questionSnapshot','Reference must match snapshot ID and revision');
      for(const issue of validateQuestion(item.questionSnapshot))add(errors,path+'.questionSnapshot.'+issue.path,issue.message);
    });
  });
  if(count===0)add(errors,'sections','Assignment requires at least one question');
  if(!unique(sectionIds))add(errors,'sections','Duplicate section IDs');
  if(!unique(itemIds))add(errors,'sections.items','Duplicate assignment item IDs');
  return errors;
}

export function validateProposal(proposal){
  if(!isObject(proposal)||proposal.schemaVersion!==SCHEMA_VERSION)return [{path:'schemaVersion',message:'Unsupported proposal version'}];
  if(proposal.kind==='question')return validateQuestion(proposal.draft);
  if(proposal.kind==='assignment')return validateAssignment(proposal.draft);
  return [{path:'kind',message:'Proposal must be a question or assignment'}];
}

// Student/learner projection explicitly whitelists fields: never copy arbitrary agent-provided keys.
export function learnerQuestion(question){
  const errors=validateQuestion(question);
  if(errors.length)throw new Error('Invalid question: '+errors[0].path);
  return {schemaVersion:SCHEMA_VERSION,id:question.id,revision:question.revision,prompt:question.prompt,subject:question.subject,parts:question.parts.map(p=>({
    id:p.id,prompt:p.prompt,kind:p.kind,...(['single_choice','multi_choice'].includes(p.kind)?{options:[...p.options]}:{})
  }))};
}
export function learnerAssignment(assignment){
  const errors=validateAssignment(assignment);
  if(errors.length)throw new Error('Invalid assignment: '+errors[0].path);
  return {schemaVersion:SCHEMA_VERSION,id:assignment.id,revision:assignment.revision,title:assignment.title,instructions:assignment.instructions??'',sections:assignment.sections.map(s=>({
    id:s.id,title:s.title,category:s.category??'',instructions:s.instructions??'',items:s.items.map(item=>({id:item.id,question:learnerQuestion(item.questionSnapshot)}))
  }))};
}
export function snapshotQuestion(question){
  const errors=validateQuestion(question);
  if(errors.length)throw new Error('Invalid question: '+errors[0].path);
  return jsonCopy(question);
}
