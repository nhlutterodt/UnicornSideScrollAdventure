import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

let processHandle,workdir;
test.describe('Family Space local authoring journey',()=>{
 test.beforeAll(async()=>{
   workdir=mkdtempSync(join(tmpdir(),'family-local-e2e-'));
   processHandle=spawn('python3',['server/family_local.py'],{
     cwd:process.cwd(),env:{...process.env,FAMILY_SQLITE_PATH:join(workdir,'data.sqlite3')},stdio:'ignore'
   });
   let up=false;
   for(let n=0;n<80;n++){
     try{const r=await fetch('http://127.0.0.1:8765/api/questions');if(r.ok){up=true;break}}catch{}
     await new Promise(resolve=>setTimeout(resolve,200));
   }
   if(!up)throw new Error('Local Family Space server did not start');
 });
 test.afterAll(async()=>{
   if(processHandle){processHandle.kill();await new Promise(resolve=>setTimeout(resolve,200))}
   if(workdir)rmSync(workdir,{recursive:true,force:true});
 });
 test('create reusable question, add to workbook, preview learner, reject answer exposure',async({page})=>{
   await page.goto('http://127.0.0.1:8765/family-local.html');
   await expect(page.getByRole('heading',{name:'Questions & Workbooks'})).toBeVisible();
   await page.getByRole('button',{name:'Create question'}).click();
   await page.getByLabel('Title').fill('A quick multiplication check');
   await page.getByLabel('Main prompt').fill('Six groups of four');
   await page.getByLabel('Prompt',{exact:true}).fill('What is 6 times 4?');
   await page.getByLabel('Response type').selectOption('number');
   await page.getByLabel('Correct number').fill('24');
   await page.getByRole('button',{name:'Save question revision'}).click();
   await expect(page.getByText('A quick multiplication check',{exact:false}).first()).toBeVisible();
   await page.getByRole('button',{name:'Workbooks',exact:true}).click();
   await page.getByRole('button',{name:'Create workbook'}).click();
   await page.getByLabel('Workbook title').fill('Multiplication Workbook');
   await page.getByLabel('Add library question').selectOption({index:1});
   await page.getByRole('button',{name:'Save workbook revision'}).click();
   await page.getByRole('button',{name:'Sample student preview'}).click();
   await page.getByLabel('Workbook').selectOption({index:1});
   await expect(page.getByText('Six groups of four')).toBeVisible();
   await expect(page.getByText('Correct number')).toHaveCount(0);
   await page.getByLabel('What is 6 times 4?').fill('24');
   await page.getByRole('button',{name:'Submit fictional answers'}).click();
   await expect(page.locator('#message')).toContainText('Saved successfully.');
 });
});
