import {test,expect} from '@playwright/test';
test.describe('Magic World home routing',()=>{
 test('root has discoverable activity options and labels unfinished features',async({page})=>{
   await page.goto('/index.html');
   await expect(page.getByRole('heading',{name:'What shall we do today?'})).toBeVisible();
   await expect(page.getByRole('link',{name:/Play My Game/})).toHaveAttribute('href','play.html');
   await expect(page.getByRole('link',{name:/My Homework/})).toHaveAttribute('href','education.html');
   await expect(page.getByRole('link',{name:/Study Guide/})).toHaveAttribute('href','study-guide.html');
   await expect(page.getByText('Coming later')).toBeVisible();
 });
 test('home -> game -> home navigation preserves game canvas',async({page})=>{
   await page.goto('/');
   await page.getByRole('link',{name:/Play My Game/}).click();
   await expect(page).toHaveURL(/\/play\.html$/);
   await expect(page.locator('#gameCanvas')).toBeVisible();
   await page.getByRole('link',{name:/Magic World Home/}).click();
   await expect(page.getByRole('heading',{name:'What shall we do today?'})).toBeVisible();
 });
 test('home -> homework -> home navigation works',async({page})=>{
   await page.goto('/');
   await page.getByRole('link',{name:/My Homework/}).click();
   await expect(page).toHaveURL(/\/education\.html$/);
   await expect(page.getByRole('heading',{name:'My Learning Space'})).toBeVisible();
   await page.getByRole('link',{name:/Magic World Home/}).click();
   await expect(page.getByRole('heading',{name:'What shall we do today?'})).toBeVisible();
 });
 test('study guide has distinct instructional content',async({page})=>{
   await page.goto('/');await page.getByRole('link',{name:/Study Guide/}).click();
   await expect(page).toHaveURL(/study-guide[.]html$/);
   await expect(page.getByRole('heading',{name:'Multiplication Study Guide'})).toBeVisible();
   await expect(page.getByText('23 × 4',{exact:false})).toBeVisible();
 });
 test('assignment builder controls have accessible names',async({page})=>{
   await page.goto('/education.html');await page.getByRole('button',{name:'Assignment Builder'}).click();
   for(const name of ['Title','Grade (1–12)','Subject']) await expect(page.getByRole('textbox',{name,exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Add question'}).click();
   for(const name of ['Question','Answer','Explanation','Choices (one per line; leave blank for number response)']) await expect(page.getByRole('textbox',{name,exact:true})).toBeVisible();
 });
 test('mobile width keeps hub accessible',async({page})=>{
   await page.setViewportSize({width:375,height:812});await page.goto('/');
   await expect(page.getByRole('link',{name:/Play My Game/})).toBeVisible();
   await expect(page.getByRole('link',{name:/My Homework/})).toBeVisible();
   const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   expect(overflows).toBe(false);
 });
});
