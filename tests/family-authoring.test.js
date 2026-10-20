import {validateQuestion,validateAssignment,validateProposal,learnerAssignment,snapshotQuestion,SCHEMA_VERSION} from '../js/education/domain/AuthoringContract.js';
const question=()=>({schemaVersion:SCHEMA_VERSION,id:'q1',revision:1,subject:'Science',prompt:'Describe the observation',parts:[
  {id:'p1',kind:'single_choice',prompt:'Choose an answer',options:['A','B'],answerSpec:{correct:'B'}},
  {id:'p2',kind:'long_text',prompt:'Explain why',answerSpec:{reviewGuidance:'Assess evidence and reasoning'}}
]});
const assignment=()=>({schemaVersion:SCHEMA_VERSION,id:'a1',revision:1,title:'Science Workbook',sections:[{id:'s1',title:'Observations',category:'Inquiry',items:[{id:'i1',questionId:'q1',questionRevision:1,questionSnapshot:question()}]}]});
test('validates compound subject-neutral questions and workbook sections',()=>{
  expect(validateQuestion(question())).toEqual([]);
  expect(validateAssignment(assignment())).toEqual([]);
  expect(validateProposal({schemaVersion:SCHEMA_VERSION,kind:'assignment',draft:assignment()})).toEqual([]);
});
test('supports independent question proposals',()=>expect(validateProposal({schemaVersion:SCHEMA_VERSION,kind:'question',draft:question()})).toEqual([]));
test('rejects broken references, duplicate part ids, and empty workbook',()=>{
  const a=assignment();a.sections[0].items[0].questionId='wrong';
  expect(validateAssignment(a).some(e=>e.path.includes('questionSnapshot'))).toBe(true);
  const q=question();q.parts[1].id='p1';
  expect(validateQuestion(q).some(e=>e.message.includes('Duplicate'))).toBe(true);
  const empty=assignment();empty.sections[0].items=[];
  expect(validateAssignment(empty).some(e=>e.message.includes('at least one question'))).toBe(true);
});
test('learner projection strips answer keys and privileged review instructions, including nested parts',()=>{
  const out=learnerAssignment(assignment());
  const raw=JSON.stringify(out);
  expect(raw).not.toContain('answerSpec');
  expect(raw).not.toContain('reviewGuidance');
  expect(raw).not.toContain('Assess evidence');
  expect(out.sections[0].items[0].question.parts[0].options).toEqual(['A','B']);
});
test('snapshot does not mutate with subsequent question edits',()=>{
  const q=question(),snap=snapshotQuestion(q);q.parts[0].prompt='Changed';
  expect(snap.parts[0].prompt).toBe('Choose an answer');
});
test('rejects untrusted unsupported formats',()=>{
  expect(validateProposal({schemaVersion:SCHEMA_VERSION,kind:'execute_sql',draft:question()})[0].path).toBe('kind');
  const q=question();q.parts[0].answerSpec={correct:'C'};
  expect(validateQuestion(q).some(e=>e.path==='parts[0].answerSpec')).toBe(true);
});
