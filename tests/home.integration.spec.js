import {test,expect} from '@playwright/test';
test.describe('Magic World home routing',()=>{
 test('root has discoverable activity options and labels unfinished features',async({page})=>{
   await page.goto('/index.html');
   await expect(page.getByRole('heading',{name:'What shall we do today?'})).toBeVisible();
   await expect(page.getByRole('link',{name:/Play My Game/})).toHaveAttribute('href','play.html');
   await expect(page.getByRole('link',{name:/My Homework/})).toHaveAttribute('href','education.html');
   await expect(page.getByRole('link',{name:/Study Guide/})).toHaveAttribute('href','education.html');
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
   await page.getByRole('link',{name:/Unicorn Magic Run/}).click();
   await expect(page.getByRole('heading',{name:'What shall we do today?'})).toBeVisible();
 });
 test('mobile width keeps hub accessible',async({page})=>{
   await page.setViewportSize({width:375,height:812});await page.goto('/');
   await expect(page.getByRole('link',{name:/Play My Game/})).toBeVisible();
   await expect(page.getByRole('link',{name:/My Homework/})).toBeVisible();
   const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   expect(overflows).toBe(false);
 });
});
