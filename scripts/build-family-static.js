// Build only the encrypted static Family Space application to a separate Vercel origin.
import {mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
const out='family-static-dist';
rmSync(out,{recursive:true,force:true});
const copies=[
 ['family-local.html','index.html'],
 ['family-local.js','family-local.js'],
 ['css/education.css','css/education.css'],
 ['js/education/EncryptedVault.js','js/education/EncryptedVault.js'],
 ['js/education/domain/AuthoringContract.js','js/education/domain/AuthoringContract.js']
];
for(const [from,to] of copies){const dest=join(out,to);mkdirSync(dirname(dest),{recursive:true});copyFileSync(from,dest)}
writeFileSync(join(out,'vercel.json'),JSON.stringify({
 headers:[{source:'/(.*)',headers:[
  {key:'Content-Security-Policy',value:"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'no-referrer'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
 ]}]
},null,2));
// Output is intentionally minimal and includes no server/database assets.
