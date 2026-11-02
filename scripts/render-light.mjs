import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const mix = (a,b,t) => a+(b-a)*t;
const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const fract = n => n-Math.floor(n);
const crcTable = Uint32Array.from({length:256},(_,i) => {
  let c=i; for (let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; return c>>>0;
});
function crc32(bytes) {
  let c=0xffffffff; for (const b of bytes) c=crcTable[(c^b)&255]^(c>>>8); return (c^0xffffffff)>>>0;
}
function chunk(name,data) {
  const type=Buffer.from(name); const result=Buffer.alloc(data.length+12);
  result.writeUInt32BE(data.length); type.copy(result,4); data.copy(result,8);
  result.writeUInt32BE(crc32(Buffer.concat([type,data])),result.length-4); return result;
}
function field(width,height,time=14) {
  const pixels=Buffer.alloc((width*3+1)*height);
  for (let row=0;row<height;row++) for (let column=0;column<width;column++) {
    const uvx=(column+.5)/width; const uvy=1-(row+.5)/height;
    let x=(column+.5-width*.5)/height-(width/height<1.15?.02:.36);
    let y=(height-row-.5-height*.5)/height;
    x*=1.6; y*=1.6;
    const rx=(.92*x+.39*y)*.88; const ry=-.39*x+.92*y;
    const a=Math.atan2(ry,rx); const r=Math.hypot(rx,ry);
    const fold=r+.13*Math.sin(3*a+time*.16)+.045*Math.sin(7*a-time*.1);
    const envelope=Math.exp(-(((fold-.58)/.255)**4));
    const filament=(.5+.5*Math.cos(141*fold+4*Math.sin(2*a)+time*.24))**13;
    const silk=(.5+.5*Math.sin(48*fold+3*a-time*.16))**4*.19;
    const rim=Math.exp(-Math.abs(fold-.8)*110)*.9+Math.exp(-Math.abs(fold-.35)*85)*.45;
    const light=(.12+filament*.8+silk+rim)*envelope;
    const side=.5+.5*Math.sin(a*2.+fold*5-time*.08);
    const pearl=[.42,.53,.94].map((c,i) => mix(c,[.95,.51,.53][i],side));
    const gold=(.5+.5*Math.cos(a+1.3))**12;
    for (let i=0;i<3;i++) pearl[i]=mix(pearl[i],[.95,.85,.67][i],gold);
    const depth=.4+.6*(.5+.5*Math.sin(a*3.+fold*4))**2;
    const mist=Math.exp(-Math.hypot(rx-.1,ry+.2)*1.8)*.08;
    const shade=.42+.58*smooth(.16,.62,uvx);
    const grain=(fract(Math.sin((column+.5)*12.9898+(height-row-.5)*78.233)*43758.5453)-.5)*.018;
    const vignette=1-.18*Math.hypot(uvx-.5,uvy-.5)**1.3;
    for (let i=0;i<3;i++) {
      let c=[.055,.045,.072][i]+pearl[i]*light*depth*1.18+pearl[i]*.07*Math.exp(-(((r-.6)/.5)**2))+[.3,.14,.3][i]*mist;
      c=(c*shade+grain)*vignette;
      pixels[row*(width*3+1)+column*3+1+i]=Math.max(0,Math.min(255,Math.round(c*255)));
    }
  }
  const header=Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8]=8; header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
for (const [filename,width,height] of [['light-study.png',1200,820],['light-study-mobile.png',600,720]]) {
  const image=field(width,height);
  await writeFile(new URL(`../public/${filename}`,import.meta.url),image);
  console.log(`${filename}: ${Math.round(image.length/1024)} KB`);
}
