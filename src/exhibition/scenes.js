import { lightPrediction, pairPrediction } from './model.js';

const CREAM = '#f5e8d8'; const BLUE = '#a0b5f0'; const ROSE = '#eda7b8'; const GOLD = '#e5cd9a'; const MUTED = '#aba4b7';
const TAU = Math.PI * 2;
const hash = value => { const n = Math.sin(value * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const mix = (a, b, t) => a + (b - a) * t;
const bezier = (a,b,c,d,t) => (1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d;

export class ScenePainter {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.quality = Math.min(devicePixelRatio || 1, 1.75); this.detail=1; }
  begin() {
    const box = this.canvas.getBoundingClientRect(); this.w = box.width; this.h = box.height;
    const dpr = this.quality;
    if (this.canvas.width !== Math.round(this.w*dpr) || this.canvas.height !== Math.round(this.h*dpr)) {
      this.canvas.width = Math.round(this.w*dpr); this.canvas.height = Math.round(this.h*dpr);
    }
    this.ctx.setTransform(dpr,0,0,dpr,0,0); this.ctx.clearRect(0,0,this.w,this.h);
  }
  text(text,x,y,color = MUTED,size = 15,align = 'center') {
    const c = this.ctx; c.save(); c.globalAlpha=1; c.font = `${Math.max(14,size)}px "Source Sans 3"`; c.textAlign = align; c.fillStyle = color; c.fillText(text,x,y); c.restore();
  }
  line(points,color,width = 1,glow = 0) {
    const c = this.ctx; c.beginPath();
    for (let i=0;i<points.length;i++) { const [x,y]=points[i]; if (i) c.lineTo(x,y); else c.moveTo(x,y); }
    c.strokeStyle=color; c.lineWidth=width; c.shadowColor=color; c.shadowBlur=glow; c.stroke(); c.shadowBlur=0;
  }
  dot(x,y,r,color = CREAM,glow = 0) {
    const c=this.ctx; c.beginPath(); c.arc(x,y,r,0,TAU); c.fillStyle=color; c.shadowColor=color; c.shadowBlur=glow; c.fill(); c.shadowBlur=0;
  }
  halo(x,y,r,color = BLUE,alpha = .25) {
    const c=this.ctx; c.save(); c.globalAlpha=alpha;
    const gradient=c.createRadialGradient(x,y,0,x,y,r); gradient.addColorStop(0,color); gradient.addColorStop(.2,`${color}80`); gradient.addColorStop(1,`${color}00`);
    c.fillStyle=gradient; c.fillRect(x-r,y-r,r*2,r*2); c.restore();
  }
  lens(x,y,r,color = BLUE,angle = 0) {
    const c=this.ctx; this.halo(x,y,r*2.6,color,.13);
    const g=c.createRadialGradient(x-r*.3,y-r*.4,0,x,y,r);
    g.addColorStop(0,'#ffffff15'); g.addColorStop(.55,`${color}10`); g.addColorStop(1,`${color}40`);
    c.beginPath(); c.arc(x,y,r,0,TAU); c.fillStyle=g; c.fill(); c.strokeStyle=`${color}90`; c.lineWidth=1; c.stroke();
    c.beginPath(); c.ellipse(x,y,r*.91,r*.68,-.5,Math.PI,TAU*1.4); c.strokeStyle=`${CREAM}40`; c.stroke();
    for (let i=-2;i<=2;i++) {
      const offset=i*r*.19; const length=Math.sqrt(Math.max(0,r*r*.72-offset*offset));
      const dx=Math.cos(angle); const dy=Math.sin(angle);
      this.line([[x+offset*-dy-length*dx,y+offset*dx-length*dy],[x+offset*-dy+length*dx,y+offset*dx+length*dy]],`${color}${i ? '20':'b0'}`,i ? 1:1.6,i ? 0:6);
    }
  }
  prism(x,y,color = CREAM) {
    const c=this.ctx; const r=this.w<500?9:14;
    c.save(); c.translate(x,y); c.rotate(Math.PI/4);
    const gradient=c.createLinearGradient(-r,-r,r,r); gradient.addColorStop(0,`${color}80`); gradient.addColorStop(.5,'#ffffff06'); gradient.addColorStop(1,`${color}40`);
    c.fillStyle=gradient; c.fillRect(-r,-r,r*2,r*2); c.strokeStyle=`${color}90`; c.lineWidth=1; c.strokeRect(-r,-r,r*2,r*2); c.restore();
    this.halo(x,y,r*4,color,.12);
  }
  water(time) {
    this.begin(); const w=this.w; const h=this.h;
    if (this.fieldFallback) this.waterFallback(time);
    for (const [i,x] of [[0,w*.37],[1,w*.63]]) {
      this.halo(x,h*.5,w*.08,i?ROSE:BLUE,.12);
      this.dot(x,h*.5,3,i?ROSE:BLUE,18);
      const r=7+(time*5)%18;
      const c=this.ctx; c.globalAlpha=(1-(r-7)/18)*.35;
      c.beginPath(); c.ellipse(x,h*.5,r,r*.68,0,0,TAU); c.strokeStyle=i?ROSE:BLUE; c.lineWidth=1; c.stroke(); c.globalAlpha=1;
    }
    this.text('fonte 1',w*.37,h*.5+35,BLUE,14); this.text('fonte 2',w*.63,h*.5+35,ROSE,14);
    this.text('A soma das ondas altera o movimento.',w/2,h*.82,MUTED,w<500?14:17);
  }
  waterFallback(time) {
    this.waterBuffer ??= document.createElement('canvas');
    const width=Math.round(Math.min(220,Math.max(90,Math.floor(this.w/5)))*this.detail); const height=Math.round(Math.min(140,Math.max(70,Math.floor(this.h/5)))*this.detail);
    if (this.waterBuffer.width===width && this.waterBuffer.height===height && Math.abs(time-(this.waterFrameTime ?? -1))<.05) {
      this.ctx.drawImage(this.waterBuffer,0,0,this.w,this.h); return;
    }
    this.waterFrameTime=time;
    this.waterBuffer.width=width; this.waterBuffer.height=height;
    const context=this.waterBuffer.getContext('2d'); const data=context.createImageData(width,height);
    const separation=this.w/this.h*.325;
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      const px=(x/width-.5)*this.w/this.h*2.5; const py=(y/height-.5)*2.5*1.47;
      const d1=Math.hypot(px+separation,py); const d2=Math.hypot(px-separation,py);
      const sum=(Math.cos(d1*29-time*1.65)/Math.sqrt(1+d1*2)+Math.cos(d2*29-time*1.65)/Math.sqrt(1+d2*2))*.5;
      const crease=Math.abs(sum)**3; const contour=(.5+.5*Math.cos((d1-d2)*29))**6; const falloff=Math.exp(-Math.hypot(px,py)*.55);
      const at=(y*width+x)*4;
      const weight=.5+.5*sum; const amplitude=(crease*.7+contour*.055)*falloff;
      data.data[at]=Math.round((mix(.36,.81,weight)*amplitude+.055)*255);
      data.data[at+1]=Math.round((mix(.58,.63,weight)*amplitude+.045)*255);
      data.data[at+2]=Math.round((mix(.72,.53,weight)*amplitude+.072)*255);
      data.data[at+3]=255;
    }
    context.putImageData(data,0,0); this.ctx.drawImage(this.waterBuffer,0,0,this.w,this.h);
  }
  light(state,time) {
    if (state.step===0) { this.water(time); return; }
    this.begin(); const w=this.w; const h=this.h; const c=this.ctx;
    const source=[w*.085,h*.48]; const split=[w*.25,h*.48]; const meet=[w*.73,h*.48];
    const output=[[w*.9,h*.3],[w*.9,h*.62]]; const p=lightPrediction(state);
    this.halo(w*.49,h*.46,w*.31,BLUE,.035);
    this.lens(...source,w<500?10:17,CREAM,0); this.text(w<500?'luz':'um fóton por vez',source[0],source[1]+42,MUTED,w<500?13:15);
    if (state.step===1) {
      this.line([[source[0]+15,source[1]],[w*.78,source[1]]],`${CREAM}26`,1);
      this.halo(w*.79,source[1],40,GOLD,.2); this.lens(w*.79,source[1],w<500?23:38,GOLD);
      this.text('registro',w*.79,source[1]+64,CREAM,15);
      const flight=Math.min(1,(time-(state.records.at(-1)?.shownAt || 0))/1.35);
      this.dot(mix(source[0]+20,w*.77,flight),source[1],2.2,CREAM,12);
      this.records(state,[[w*.79,source[1]],[w*.79,source[1]]],time);
      return;
    }
    this.line([[source[0]+18,source[1]],split],`${CREAM}55`,1.2,4);
    this.prism(...split); this.prism(...meet);
    const phases=[0,state.phase];
    const strands=Math.round((w<500?19:36)*this.detail); const samples=Math.round((w<500?44:68)*this.detail);
    for (const [branch,sign] of [[0,-1],[1,1]]) {
      const color=branch?ROSE:BLUE;
      this.halo(w*.49,h*(branch?.71:.25),w*.18,color,.055*state.coherence+.018);
      for (let j=0;j<strands;j++) {
        const offset=(j/(strands-1)-.5);
        const points=[];
        const phase=phases[branch]+(1-state.coherence)*j*2.3;
        for (let i=0;i<=samples;i++) {
          const u=i/samples; const x=bezier(split[0],w*.37,w*.61,meet[0],u);
          const y=bezier(split[1],h*(sign<0?.11:.86),h*(sign<0?.11:.86),meet[1],u);
          const envelope=Math.sin(u*Math.PI);
          const ripple=Math.sin(u*28-time*1.5+phase+j*.055);
          points.push([x,y+envelope*(offset*(w<500?18:35)+ripple*(2+offset*4))]);
        }
        c.globalAlpha=(.11+.14*(1-Math.abs(offset)*2))*(.35+state.coherence*.65);
        this.line(points,color,j===Math.floor(strands/2)?1.5:.65,j===Math.floor(strands/2)?5:0);
      }
      c.globalAlpha=1;
      this.text(`caminho ${branch?'2':'1'}`,w*.49,h*(branch?.8:.17),color,w<500?13:15);
    }
    if (state.step===4) {
      this.prism(w*.49,h*.23,ROSE);
      this.text(state.phase===0?'fase inicial':'meia volta',w*.49,h*.23+40,MUTED,w<500?13:15);
    }
    const appear=state.step===2?.12:1;
    for (let i=0;i<2;i++) {
      const q=i?p.b:p.a; const color=i?ROSE:BLUE;
      c.globalAlpha=appear;
      for (const [width,alpha] of [[15,.035],[5,.12],[1,.55]]) {
        c.globalAlpha=appear*(.08+q*.92)*alpha;
        this.line([meet,output[i]],color,width,8);
      }
      c.globalAlpha=appear;
      this.lens(...output[i],w<500?18:29,color,0);
      this.halo(...output[i],w<500?36:64,color,q*.2*appear);
      this.text(`saída ${i?'B':'A'}`,output[i][0],output[i][1]+(w<500?40:52),color,w<500?14:16);
    }
    c.globalAlpha=1;
    if (state.step>=5 && state.step<=6) this.environment(state,time);
    if (state.step>=3) this.records(state,output,time);
    this.text('preparar',split[0],h*.88,MUTED,w<500?13:15);
    this.text('reunir',meet[0],h*.88,MUTED,w<500?13:15);
  }
  records(state,positions,time) {
    const c=this.ctx;
    for (const record of state.records.slice(-36)) {
      const point=positions[record.result]; const color=record.result?ROSE:BLUE;
      const angle=hash(record.id+3)*TAU; const r=5+hash(record.id+61)*(this.w<500?10:21);
      this.dot(point[0]+Math.cos(angle)*r,point[1]+Math.sin(angle)*r,1.7,color);
    }
    const last=state.records.at(-1);
    if (last) {
      const age=time-(last.shownAt ?? last.time);
      if (age<1.4) {
        const point=positions[last.result]; const color=last.result?ROSE:BLUE;
        c.globalAlpha=1-age/1.4;
        this.halo(...point,35+age*22,color,.38); this.dot(...point,3.2,CREAM,16);
        c.beginPath(); c.arc(...point,(this.w<500?20:32)+age*15,0,TAU); c.strokeStyle=color; c.lineWidth=1; c.stroke(); c.globalAlpha=1;
      }
    }
  }
  environment(state,time) {
    const {w,h,ctx:c}=this;
    if (state.isolated) {
      c.save(); c.beginPath(); c.ellipse(w*.49,h*.48,w*.31,h*.39,0,0,TAU);
      const g=c.createLinearGradient(0,h*.1,0,h*.9); g.addColorStop(0,`${BLUE}06`); g.addColorStop(.8,'#dce6ff03'); g.addColorStop(1,`${BLUE}16`);
      c.fillStyle=g; c.fill(); c.strokeStyle=`${BLUE}45`; c.lineWidth=1; c.stroke(); c.restore();
      if (w>=650) this.text('contato interrompido',w*.49,h*.08,BLUE,15);
    } else {
      for (let i=0;i<(w<500?18:32);i++) {
        const angle=hash(i+7)*TAU+time*.025;
        const drift=(time*.1+hash(i))%1;
        const x=w*.49+Math.cos(angle)*w*(.14+drift*.23);
        const y=h*.47+Math.sin(angle)*h*(.15+drift*.25);
        c.globalAlpha=(.2+.4*(1-state.coherence))*(1-drift*.7);
        this.dot(x,y,1.4,GOLD,5);
        if (i%4===0) this.line([[x,y],[x-Math.cos(angle)*10,y-Math.sin(angle)*10]],`${GOLD}60`);
      }
      c.globalAlpha=1;
      if (w>=650) this.text('pistas no ambiente',w*.49,h*.08,GOLD,14);
    }
  }
  pairs(state,time) {
    this.begin(); const {w,h,ctx:c}=this; const p=pairPrediction(state);
    const left=[w*.25,h*.33]; const right=[w*.75,h*.33]; const radius=Math.min(w*.115,h*.15,77);
    this.halo(w*.5,h*.32,w*.4,BLUE,.028);
    this.lens(...left,radius,BLUE,state.angleA*Math.PI/180);
    this.lens(...right,radius,ROSE,state.angleB*Math.PI/180);
    this.text('analisador A',left[0],left[1]-radius-20,BLUE,w<500?14:17);
    this.text('analisador B',right[0],right[1]-radius-20,ROSE,w<500?14:17);
    if (state.step>=2) {
      this.text(`${state.angleA}°`,left[0],left[1]+radius+28,MUTED,14);
      this.text(`${state.angleB}°`,right[0],right[1]+radius+28,MUTED,14);
    }
    this.halo(w*.5,h*.33,28,CREAM,.16); this.dot(w*.5,h*.33,3,CREAM,18);
    this.text('um par',w*.5,h*.33+30,MUTED,w<500?13:15);
    const records=state.records.slice(-7);
    const rowHeight=Math.min(25,h*.041); const top=h*.61;
    this.text('registros de A',left[0],top-22,MUTED,13);
    this.text('registros de B',right[0],top-22,MUTED,13);
    for (let i=0;i<records.length;i++) {
      const row=records[i]; const y=top+i*rowHeight;
      const same=row.a===row.b; const a=row.a>0?BLUE:ROSE; const b=row.b>0?BLUE:ROSE;
      if (state.step>0) {
        c.globalAlpha=.22;
        c.beginPath(); c.moveTo(left[0]+10,y); c.bezierCurveTo(w*.4,y-8,w*.6,y+8,right[0]-10,y); c.strokeStyle=same?CREAM:ROSE; c.lineWidth=.8; c.stroke(); c.globalAlpha=1;
      }
      this.dot(left[0],y,4,a,3); this.text(row.a>0?'+':'−',left[0]-20,y+5,a,14);
      if (state.step>0) { this.dot(right[0],y,4,b,3); this.text(row.b>0?'+':'−',right[0]+20,y+5,b,14); }
      else { c.fillStyle='#d5c9e916'; c.fillRect(right[0]-4,y-4,8,8); }
    }
    if (state.step===0) this.text('compare para reunir',right[0],h*.92,MUTED,w<500?13:15);
    else this.text(state.classical?'mistura de comparação':'par entrelaçado',w*.5,h*.94,MUTED,w<500?13:15);
    const last=state.records.at(-1);
    if (last && state.elapsed-last.time<1.2) {
      const opacity=Math.max(0,1-(state.elapsed-last.time)/1.2);
      this.halo(...left,radius*1.6,last.a>0?BLUE:ROSE,opacity*.14);
      this.halo(...right,radius*1.6,last.b>0?BLUE:ROSE,opacity*.14);
    }
    return p;
  }
}
