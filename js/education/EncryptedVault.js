// Family Space encrypted browser-local vault. No service endpoint or remote writes.
// Vault metadata contains only random salt and KDF parameters. All documents encrypted.
const DATABASE='family-space-private-v1', STORE='vault', encoder=new TextEncoder(), decoder=new TextDecoder();
let key=null, opened=false;
const base64=bytes=>btoa(String.fromCharCode(...bytes));
const unbase64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DATABASE,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function get(id){const d=await db();try{return await new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}finally{d.close()}}
async function put(id,value){const d=await db();try{await new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{d.close()}}
async function derive(pass,salt){const material=await crypto.subtle.importKey('raw',encoder.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function encrypt(doc){const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(doc)));return {iv:base64(iv),ciphertext:base64(new Uint8Array(ciphertext))}}
async function decrypt(payload){const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(payload.iv)},key,unbase64(payload.ciphertext));return JSON.parse(decoder.decode(bytes))}
function initial(){return {schemaVersion:'family-authoring/1',questions:[],assignments:[],attempts:[]}}
export async function exists(){return Boolean(await get('meta'))}
export async function unlock(pass){if(typeof pass!=='string'||pass.length<12)throw Error('Use a passphrase with at least 12 characters');let meta=await get('meta');if(!meta){const salt=crypto.getRandomValues(new Uint8Array(16));const candidate=await derive(pass,salt);key=candidate;const payload=await encrypt(initial());await put('data',payload);meta={salt:base64(salt),iterations:310000};await put('meta',meta);opened=true;return}key=await derive(pass,unbase64(meta.salt));try{await decrypt(await get('data'));opened=true}catch{key=null;opened=false;throw Error('Unable to unlock. Check passphrase or vault integrity.')}}
export function lock(){key=null;opened=false}
export async function read(){if(!opened||!key)throw Error('Vault locked');return decrypt(await get('data'))}
export async function write(next){if(!opened||!key)throw Error('Vault locked');await put('data',await encrypt(next))}
export async function exportVault(){const meta=await get('meta'),data=await get('data');if(!meta||!data)throw Error('No vault');return {format:'family-encrypted-backup/1',meta,data}}
export async function importVault(backup){if(await exists())throw Error('Vault exists. Restore only in a new browser profile; this will not overwrite existing data.');if(backup?.format!=='family-encrypted-backup/1'||!backup.meta?.salt||!backup.data?.ciphertext||!backup.data?.iv)throw Error('Invalid encrypted vault backup');await put('data',backup.data);await put('meta',backup.meta);lock()}
