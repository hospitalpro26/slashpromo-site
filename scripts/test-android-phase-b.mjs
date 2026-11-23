import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url));
const manifest=JSON.parse(get('manifest.webmanifest').toString('utf8'));
const config=JSON.parse(get('android/twa-manifest.json').toString('utf8'));
assert.equal(config.host,'slashpromo.com');
assert.equal(config.enableNotifications,false);
assert.deepEqual(config.additionalTrustedOrigins,[]);
assert.deepEqual(config.fingerprints,[]);
assert.match(config.packageId,/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
assert.equal(config.signingKey.path,'release.keystore');
const icons=[
 ['/assets/pwa-icon-192.png',192,'any'],
 ['/assets/pwa-icon-512.png',512,'any'],
 ['/assets/pwa-maskable-512.png',512,'maskable']
];
for(const [path,size,purpose] of icons){
 const item=manifest.icons.find(i=>i.src===path&&i.sizes===size+'x'+size&&i.type==='image/png'&&i.purpose===purpose);
 assert(item,'Manifest lacks '+path);
 const raw=get(path.slice(1));
 assert.equal(raw.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature');
 assert.equal(raw.readUInt32BE(16),size,'PNG width');
 assert.equal(raw.readUInt32BE(20),size,'PNG height');
 assert.equal(raw[24],2,'PNG indexed 2-bit depth');
 assert.equal(raw[25],3,'PNG palette color type');
 console.log('PASS',path,raw.byteLength,'bytes');
}
assert(manifest.start_url.startsWith('/'));
assert(!manifest.icons.some(i=>i.src.startsWith('http')));
console.log('PASS Android Phase B static checks; no certificate identity or signed APK is asserted.');
