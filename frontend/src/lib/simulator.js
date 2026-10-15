// Data
export const CATS=[
  {id:'fill',label:'Fill'},
  {id:'line',label:'Line'},
  {id:'loop',label:'Loop'},
  {id:'special',label:'Special'},
  {id:'edge',label:'Edge'},
  {id:'digital',label:'Digital'},
];
export const STITCHES=[
  {id:'auto',    cat:'fill',   icon:'✦',name:'Auto',        sub:'Smart fill + satin',density:0.95,dm:1.0,
   desc:'Picks the right stitch for each part of the artwork, like professional auto-digitizing: tatami fill with underlay for solid areas, satin columns that follow strokes and lettering, and a running stitch for hairlines.'},
  {id:'satin',   cat:'fill',   icon:'▬',name:'Satin',       sub:'Smooth fill',      density:1.0,dm:1.0,
   desc:'Dense parallel stitches at a consistent angle. Real satin stitch renders each thread as an overlapping strand with gloss shimmer based on angle.'},
  {id:'tatami',  cat:'fill',   icon:'▦',name:'Tatami',      sub:'Brick pattern',    density:0.8,dm:0.9,
   desc:'Offset rows of short run stitches in a brick pattern. Each row offsets by half to eliminate visible seams between rows.'},
  {id:'seed',    cat:'fill',   icon:'∴',name:'Seed',        sub:'Scattered dots',   density:0.4,dm:0.45,
   desc:'Randomly scattered short stitches. Each seed stitch is a small straight stitch of random angle — used for shading and texture.'},
  {id:'spiral',  cat:'fill',   icon:'🌀',name:'Spiral',     sub:'Concentric arcs',  density:0.7,dm:0.75,
   desc:'Outward concentric stitch rows following shape centre. Machine runs spiral from inside out.'},
  {id:'contour', cat:'fill',   icon:'〰',name:'Contour',    sub:'Shape-following',  density:0.75,dm:0.8,
   desc:'Fill stitches run parallel to shape edge contour. Creates a flowing, topographic appearance.'},
  {id:'radial',  cat:'fill',   icon:'✳',name:'Radial',      sub:'Fan from centre',  density:0.7,dm:0.75,
   desc:'Stitches radiate outward like spokes from a centre point. Strong dimensional effect.'},
  {id:'run',     cat:'line',   icon:'—',name:'Running',     sub:'Dashed outline',   density:0.2,dm:0.25,
   desc:'Single-pass dashed stitch tracing edges. Each stitch is a discrete segment with gap between.'},
  {id:'bean',    cat:'line',   icon:'⋯',name:'Bean/Triple', sub:'Bold outline',     density:0.3,dm:0.35,
   desc:'Running stitch made three times over the same path for a thick rope-like outline.'},
  {id:'stem',    cat:'line',   icon:'〜',name:'Stem',        sub:'Rope curve',       density:0.35,dm:0.4,
   desc:'Overlapping angled stitches forming a twisted rope. Each stitch returns to midpoint of previous.'},
  {id:'back',    cat:'line',   icon:'⟵',name:'Back',        sub:'Solid line',       density:0.3,dm:0.35,
   desc:'Continuous solid line — each stitch starts where previous ended. Strongest outline stitch.'},
  {id:'straight',cat:'line',   icon:'━',name:'Straight',    sub:'Free stitches',    density:0.15,dm:0.2,
   desc:'Individual freely-placed straight stitches of varying length and angle. Used for fur, grass, hair.'},
  {id:'chain',   cat:'loop',   icon:'⧠',name:'Chain',       sub:'Interlocked loops',density:0.6,dm:0.7,
   desc:'Each loop is anchored through the previous loop, creating a chain. High texture and dimension.'},
  {id:'feather', cat:'loop',   icon:'🪶',name:'Feather',     sub:'Branching loops',  density:0.45,dm:0.5,
   desc:'Alternating left/right loops from a centre spine. Creates feathery branching decorative border.'},
  {id:'blanket', cat:'loop',   icon:'⊓',name:'Blanket',     sub:'Edge loops',       density:0.4,dm:0.45,
   desc:'Perpendicular loops over fabric edge. Real blanket stitch has a bar at top and loop at bottom.'},
  {id:'fly',     cat:'loop',   icon:'⋎',name:'Fly',         sub:'Y-shaped loops',   density:0.35,dm:0.4,
   desc:'Open Y-shape. Two upper arms converge to a tied-down tail. Used for leaf and feather motifs.'},
  {id:'cross',   cat:'special',icon:'✕',name:'Cross',       sub:'× pattern',        density:0.7,dm:0.85,
   desc:'Two diagonal stitches crossing at centre. Bottom stitch first, top stitch second (consistent direction).'},
  {id:'padded',  cat:'special',icon:'◈',name:'Padded Satin',sub:'3D raised',        density:1.1,dm:1.1,
   desc:'Multiple stacked satin layers create a raised 3D effect. First pass diagonal, second perpendicular on top.'},
  {id:'motif',   cat:'special',icon:'❋',name:'Motif Fill',  sub:'Repeat pattern',   density:0.5,dm:0.55,
   desc:'Small geometric motif (star/diamond) repeated in a grid pattern across the fill area.'},
  {id:'stipple', cat:'special',icon:'⠿',name:'Stipple',     sub:'Meander path',     density:0.35,dm:0.4,
   desc:'A single continuous non-crossing meander path through the fill area. Classic quilting stitch.'},
  {id:'zigzag',  cat:'edge',   icon:'⟨⟩',name:'Zigzag',    sub:'Alternating diag', density:0.5,dm:0.55,
   desc:'Alternating left-right diagonal stitches. Real zigzag has consistent bite width and stitch length.'},
  {id:'scallop', cat:'edge',   icon:'∿',name:'Scallop',     sub:'Arc border',       density:0.4,dm:0.45,
   desc:'Repeating arcs along an edge. Each arc is a series of radial satin stitches fanning from a point.'},
  {id:'picot',   cat:'edge',   icon:'⌇',name:'Picot',       sub:'Looped trim',      density:0.35,dm:0.4,
   desc:'Small anchor loops projecting from edge. Each picot is a loop held by two lock stitches.'},
  {id:'prog',    cat:'digital',icon:'▤',name:'Programmable',sub:'DST grid fill',    density:0.9,dm:1.0,
   desc:'Computer-optimised snake-scan stitch path. Renders actual machine needle positions as in DST files.'},
  {id:'dst',     cat:'digital',icon:'⊛',name:'DST Trace',   sub:'Path visualise',   density:0.6,dm:0.65,
   desc:'Visualises the machine needle path including jump stitches (orange dashes) and lock points.'},
  {id:'photo',   cat:'digital',icon:'📷',name:'Photo',       sub:'Tone by density',  density:0.85,dm:0.9,
   desc:'Photo-realistic simulation: stitch density varies by pixel luminance. Dark areas = dense stitches.'},
];
export const FABRICS=[
  {id:'cotton',   icon:'🌿',name:'Cotton',      sub:'Standard',    color:'#f5f0e8',grain:true, desc:'Most common fabric. Easy to hoop.',stab:'Cut-away',   needle:'75/11 Sharp', tension:'Normal'},
  {id:'aida',     icon:'⊞',name:'Aida',         sub:'Cross stitch',color:'#f0ece0',grain:true, desc:'Evenweave for cross stitch.',      stab:'None',        needle:'75/11 Sharp', tension:'Normal'},
  {id:'denim',    icon:'👖',name:'Denim',        sub:'Heavy',       color:'#4a6fa5',grain:true, desc:'Heavy woven, strong needle.',      stab:'Tear-away',   needle:'90/14 Denim', tension:'Loose'},
  {id:'silk',     icon:'✨',name:'Silk',         sub:'Delicate',    color:'#f8f2e0',grain:false,desc:'Reduce density 20%.',              stab:'Tear+topping',needle:'65/9 Microtex',tension:'Tight'},
  {id:'fleece',   icon:'🧣',name:'Fleece',       sub:'Stretch',     color:'#e8e0d8',grain:false,desc:'Use cut-away + topping.',          stab:'Cut+topping', needle:'75/11 Ball',  tension:'Normal'},
  {id:'leather',  icon:'🟫',name:'Leather',      sub:'Vinyl/bags',  color:'#7a5230',grain:false,desc:'Puncture-permanent, keep low.',    stab:'No-show mesh',needle:'90/14 Leather',tension:'Loose'},
  {id:'towel',    icon:'🏊',name:'Towel',        sub:'Terry pile',  color:'#d0e8f0',grain:false,desc:'Always use wash-away topping.',    stab:'Cut+wash top',needle:'75/11 Ball',  tension:'Normal'},
  {id:'linen',    icon:'🌾',name:'Linen',        sub:'Natural',     color:'#d8cbb4',grain:true, desc:'Crisp natural texture.',           stab:'Light tear',  needle:'80/12 Sharp', tension:'Normal'},
  {id:'organza',  icon:'💎',name:'Organza',      sub:'Sheer',       color:'#e8f4f8',grain:false,desc:'Water-soluble stabilizer only.',   stab:'Water-soluble',needle:'65/9 Microtex',tension:'Tight'},
  {id:'polyester',icon:'🔵',name:'Polyester',    sub:'Athletic',    color:'#e0eaf5',grain:false,desc:'Reduce foot pressure.',            stab:'Tear-away',   needle:'75/11 Ball',  tension:'Normal'},
  {id:'canvas',   icon:'🎨',name:'Canvas',       sub:'Heavy-duty',  color:'#e0d8c0',grain:true, desc:'Very stable, ideal for fills.',    stab:'None',        needle:'90/14 Denim', tension:'Normal'},
  {id:'felt',     icon:'🟥',name:'Felt',         sub:'Craft',       color:'#f0d8d0',grain:false,desc:'Non-woven, no stabilizer needed.', stab:'None',        needle:'75/11 Sharp', tension:'Normal'},
];

// Helpers
function fitCanvas(cvs, W, H) {
  const t = 380, ds = Math.min(1, t / Math.max(W, H));
  cvs.style.width = Math.round(W * ds) + 'px';
  cvs.style.height = Math.round(H * ds) + 'px';
}
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function hexRgb(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function rgbHex(r,g,b) { return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function adjCol(hex, a) { const [r,g,b] = hexRgb(hex); return rgbHex(clamp(r+a), clamp(g+a), clamp(b+a)); }
function lumRGB(r,g,b) { return 0.299*r + 0.587*g + 0.114*b; }
function isBg(R,G,B,A,fc) { return A < 80 || (Math.abs(R-fc[0])<40 && Math.abs(G-fc[1])<40 && Math.abs(B-fc[2])<40) || (R>232 && G>232 && B>232); }

function drawGrain(ctx, W, H, col) {
  ctx.globalAlpha = .06; ctx.fillStyle = adjCol(col, -20);
  for (let x=0; x<W; x+=3) ctx.fillRect(x,0,1,H);
  for (let y=0; y<H; y+=3) ctx.fillRect(0,y,W,1);
  ctx.globalAlpha = 1;
}
let captureMode = false;
let capturedPoints = [];

function drawThread(ctx, x1, y1, x2, y2, R, G, B, thickness, shimAmt) {
  if (captureMode) {
    capturedPoints.push({x1, y1, x2, y2, R, G, B});
    return;
  }
  const len = Math.hypot(x2-x1, y2-y1);
  const shim = shimAmt || 0;
  
  ctx.save(); 
  
  // 1. Realistic Drop Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = thickness * 1.5;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1.5;
  
  // 2. Base Thread
  ctx.strokeStyle = `rgb(${R},${G},${B})`;
  ctx.lineWidth = thickness; 
  ctx.lineCap = 'round';
  ctx.beginPath(); 
  ctx.moveTo(x1, y1); 
  ctx.lineTo(x2, y2); 
  ctx.stroke();
  
  // Clear shadow for highlights/lowlights
  ctx.shadowColor = 'transparent';

  // 3. Highlight (Center Light)
  if (shim > 0 && len > 2) {
    ctx.strokeStyle = `rgba(255,255,255,${shim*0.6})`;
    ctx.lineWidth = Math.max(0.5, thickness * 0.35); 
    ctx.beginPath(); 
    ctx.moveTo(x1, y1); 
    ctx.lineTo(x2, y2); 
    ctx.stroke();
    
    // 4. Lowlight (Edge Darkening) for cylindrical 3D look
    ctx.strokeStyle = `rgba(0,0,0,${shim*0.3})`;
    ctx.lineWidth = thickness * 0.8;
    ctx.beginPath(); 
    ctx.moveTo(x1, y1+0.5); 
    ctx.lineTo(x2, y2+0.5); 
    ctx.stroke();
  }
  
  ctx.restore();
}

export function generateDSTPoints(src, stitch, fab) {
  captureMode = true;
  capturedPoints = [];
  // Mock context to intercept direct line and arc drawing
  let currentX = 0, currentY = 0;
  let currentR = 0, currentG = 0, currentB = 0;
  
  const mockCtx = {
    save:()=>{}, restore:()=>{}, beginPath:()=>{}, stroke:()=>{}, fill:()=>{},
    clip:()=>{}, fillRect:()=>{}, ellipse:()=>{}, setLineDash:()=>{},
    moveTo: (x, y) => {
      currentX = x; currentY = y;
    },
    lineTo: (x, y) => {
      capturedPoints.push({ x1: currentX, y1: currentY, x2: x, y2: y, R: currentR, G: currentG, B: currentB });
      currentX = x; currentY = y;
    },
    arc: (x, y, r, sAngle, eAngle) => {
      let diff = eAngle - sAngle;
      if (diff === 0) diff = Math.PI * 2;
      const steps = Math.max(3, Math.ceil(Math.abs(diff) * r / 2));
      for (let i = 0; i <= steps; i++) {
        const a = sAngle + diff * (i / steps);
        const nx = x + Math.cos(a) * r;
        const ny = y + Math.sin(a) * r;
        if (i === 0) {
          currentX = nx; currentY = ny;
        } else {
          capturedPoints.push({ x1: currentX, y1: currentY, x2: nx, y2: ny, R: currentR, G: currentG, B: currentB });
          currentX = nx; currentY = ny;
        }
      }
    }
  };
  Object.defineProperty(mockCtx, 'strokeStyle', {
    set: (v) => {
      if (typeof v === 'string') {
        const m = v.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (m) { currentR = +m[1]; currentG = +m[2]; currentB = +m[3]; }
      }
    },
    get: () => ''
  });
  
  renderStitchAtScale(mockCtx, src, stitch, fab, hexRgb(fab.color), 1);
  captureMode = false;
  
  // Quantize RGB to 16 levels per channel to preserve exact visual colors 
  // without creating 50,000 stops. This ensures whites, blacks, and all shades
  // are perfectly separated into different buckets.
  for (const pt of capturedPoints) {
    const r = Math.min(255, Math.max(0, Math.round((pt.R || 0) / 24) * 24));
    const g = Math.min(255, Math.max(0, Math.round((pt.G || 0) / 24) * 24));
    const b = Math.min(255, Math.max(0, Math.round((pt.B || 0) / 24) * 24));
    pt.cIdx = (r << 16) | (g << 8) | b;
    // Overwrite the point's color with the quantized color so SVG uses it consistently
    pt.R = r; pt.G = g; pt.B = b;
  }
  
  // Sort points by color to ensure machine sews all of one color before stopping
  capturedPoints.sort((a, b) => a.cIdx - b.cIdx);
  
  const stitches = [];
  let prevX = -9999, prevY = -9999;
  let prevColor = -1;
  
  // Center coordinates around 0,0 for the machine
  const cx = src.width / 2;
  const cy = src.height / 2;
  
  for (const pt of capturedPoints) {
    // scale 1 pixel = approx 0.25mm
    const scale = 0.25;
    const x1 = (pt.x1 - cx) * scale;
    const y1 = (pt.y1 - cy) * scale;
    const x2 = (pt.x2 - cx) * scale;
    const y2 = (pt.y2 - cy) * scale;
    
    const r = pt.R || 0, g = pt.G || 0, b = pt.B || 0;

    // Y is inverted in DST (standard cartesian)
    if (prevColor !== -1 && pt.cIdx !== prevColor) {
      // Color change!
      stitches.push([x1, -y1, 'JUMP', r, g, b]);
      stitches.push([x1, -y1, 'STOP', r, g, b]);
      stitches.push([x1, -y1, 'STITCH', r, g, b]);
    } else if (Math.hypot(x1 - prevX, y1 - prevY) > 0.5) {
      stitches.push([x1, -y1, 'JUMP', r, g, b]);
      stitches.push([x1, -y1, 'STITCH', r, g, b]);
    }
    
    stitches.push([x2, -y2, 'STITCH', r, g, b]);
    prevX = x2; prevY = y2;
    prevColor = pt.cIdx;
  }
  return stitches;
}

// ══════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════
export function drawStitch(src, stitch, fab, cvs) {
  const S = 4;
  const W = src.width*S, H = src.height*S;
  cvs.width = W; cvs.height = H; fitCanvas(cvs, W, H);
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = fab.color; ctx.fillRect(0,0,W,H);
  if (fab.grain) drawGrain(ctx, W, H, fab.color);
  const fc = hexRgb(fab.color);
  renderStitchAtScale(ctx, src, stitch, fab, fc, S);
}

export function drawZoom(src, stitch, fab, cvs) {
  const cw = Math.min(src.width, 30), ch = Math.min(src.height, 30);
  const ox = Math.floor((src.width-cw)/2), oy = Math.floor((src.height-ch)/2);
  const cropData = {width: cw, height: ch, data: new Uint8ClampedArray(cw*ch*4)};
  for (let y=0; y<ch; y++) for(let x=0; x<cw; x++) {
    const si = ((oy+y)*src.width+(ox+x))*4, di = (y*cw+x)*4;
    cropData.data[di] = src.data[si]; cropData.data[di+1] = src.data[si+1];
    cropData.data[di+2] = src.data[si+2]; cropData.data[di+3] = src.data[si+3];
  }
  const ZOOM_S = 8;
  const W = cw*ZOOM_S, H = ch*ZOOM_S;
  cvs.width = W; cvs.height = H; fitCanvas(cvs, W, H);
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = fab.color; ctx.fillRect(0,0,W,H);
  if (fab.grain) drawGrain(ctx, W, H, fab.color);
  renderStitchAtScale(ctx, cropData, stitch, fab, hexRgb(fab.color), ZOOM_S);
}

export function drawChart(src, palette, cvs) {
  const CELL = 12, W = src.width*CELL, H = src.height*CELL;
  cvs.width = W; cvs.height = H; fitCanvas(cvs, W, H);
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
  const syms = ['×','○','△','□','◇','★','▲','●','⊕','⊗'];
  for (let y=0; y<src.height; y++) for(let x=0; x<src.width; x++) {
    const i = (y*src.width+x)*4, R = src.data[i], G = src.data[i+1], B = src.data[i+2], A = src.data[i+3];
    if (A < 80 || (R > 230 && G > 230 && B > 230)) continue;
    let best = 0, bd = Infinity;
    palette.forEach((c,j) => { const d = Math.hypot(R-c.rgb[0], G-c.rgb[1], B-c.rgb[2]); if (d<bd) { bd = d; best = j; }});
    const col = palette[best], cx = x*CELL, cy = y*CELL;
    ctx.fillStyle = col.hex; ctx.fillRect(cx, cy, CELL, CELL);
    ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.lineWidth = .4; ctx.strokeRect(cx+.2, cy+.2, CELL-.4, CELL-.4);
    ctx.fillStyle = lumRGB(col.rgb[0], col.rgb[1], col.rgb[2]) > 140 ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.85)';
    ctx.font = `bold ${Math.round(CELL*.6)}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(syms[best%syms.length], cx+CELL/2, cy+CELL/2);
  }
}

export function drawOutline(src, cvs) {
  const S = 3, W = src.width*S, H = src.height*S;
  cvs.width = W; cvs.height = H; fitCanvas(cvs, W, H);
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#f7f4ef'; ctx.fillRect(0,0,W,H);
  for (let y=1; y<src.height-1; y++) for(let x=1; x<src.width-1; x++) {
    const i=(y*src.width+x)*4, R=src.data[i], G=src.data[i+1], B=src.data[i+2];
    const ri=(y*src.width+x+1)*4, di=((y+1)*src.width+x)*4;
    const l=lumRGB(R,G,B), r2=lumRGB(src.data[ri],src.data[ri+1],src.data[ri+2]), d=lumRGB(src.data[di],src.data[di+1],src.data[di+2]);
    if (Math.abs(l-r2)<20 && Math.abs(l-d)<20) continue;
    ctx.fillStyle = `rgb(${R},${G},${B})`; ctx.fillRect(x*S, y*S, S, S);
  }
}

function range(s,e,step=1){const a=[];if(step>0)for(let i=s;i<e;i+=step)a.push(i);else for(let i=s;i>e;i+=step)a.push(i);return a;}

// Stitch Rendering Dispatcher
function renderStitchAtScale(ctx, src, stitch, fab, fc, S) {
  const fn = {
    satin: rSatin, tatami: rTatami, seed: rSeed, spiral: rSpiral, contour: rContour, radial: rRadial,
    run: rRun, bean: rBean, stem: rStem, back: rBack, straight: rStraight,
    chain: rChain, feather: rFeather, blanket: rBlanket, fly: rFly,
    cross: rCross, padded: rPaddedSatin, motif: rMotif, stipple: rStipple,
    zigzag: rZigzag, scallop: rScallop, picot: rPicot, prog: rProg, dst: rDST, photo: rPhoto,
  };
  (fn[stitch.id] || rSatin)(ctx, src, fab, fc, S);
}

// 1. SATIN
function rSatin(ctx,src,fab,fc,S){
  const ANGLE=Math.PI/4; const TH=Math.max(1.2,S*.75); const cos=Math.cos(ANGLE),sin=Math.sin(ANGLE);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=x*S+S/2,cy=y*S+S/2,hl=S*.6;
    drawThread(ctx,cx-cos*hl,cy-sin*hl,cx+cos*hl,cy+sin*hl,R,G,B,TH,.6+.4*Math.abs(Math.sin(x*.4+y*.3)));
  }
}
// 2. TATAMI
function rTatami(ctx,src,fab,fc,S){
  const RL=S*3.5,TH=Math.max(1,S*.7);
  for(let y=0;y<src.height;y++){
    const off=(y%2===0?0:S*1.5);
    for(let x=0;x<src.width;x++){
      const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
      if(isBg(R,G,B,A,fc))continue;
      drawThread(ctx,x*S+off,y*S+S/2,x*S+off+RL,y*S+S/2,R,G,B,TH,.3);
    }
  }
}
// 3. SEED
function rSeed(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.5);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const hash=(x*2654435761^y*2246822519)>>>0;
    if(hash%3===0)continue;
    const ang=(hash%628)/100,len=S*(.6+(hash%4)*.25),cx=x*S+S/2,cy=y*S+S/2;
    drawThread(ctx,cx-Math.cos(ang)*len/2,cy-Math.sin(ang)*len/2,cx+Math.cos(ang)*len/2,cy+Math.sin(ang)*len/2,R,G,B,TH,.2);
  }
}
// 4. SPIRAL
function rSpiral(ctx,src,fab,fc,S){
  const BS=8;
  for(let gy=0;gy<Math.ceil(src.height/BS);gy++)for(let gx=0;gx<Math.ceil(src.width/BS);gx++){
    const px=gx*BS+Math.floor(BS/2),py=gy*BS+Math.floor(BS/2);
    if(px>=src.width||py>=src.height)continue;
    const i=(py*src.width+px)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=gx*BS*S+BS*S/2,cy=gy*BS*S+BS*S/2,TH=Math.max(1,S*.55);
    let prevX=cx,prevY=cy;
    for(let t=0.3;t<Math.PI*5;t+=.25){
      const r=t*S*.55,nx=cx+Math.cos(t)*r,ny=cy+Math.sin(t)*r;
      if(Math.abs(nx-cx)>BS*S/2+S||Math.abs(ny-cy)>BS*S/2+S)break;
      drawThread(ctx,prevX,prevY,nx,ny,R,G,B,TH,.25);
      prevX=nx;prevY=ny;
    }
  }
}
// 5. CONTOUR
function rContour(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.65);
  for(let pass=0;pass<5;pass++)for(let y=pass;y<src.height-pass;y++)for(let x=pass;x<src.width-pass;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    let ring=false;const dirs=[[0,1],[0,-1],[1,0],[-1,0]];
    for(const[dx,dy]of dirs){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=src.width||ny>=src.height){ring=true;break;}
      const ni=(ny*src.width+nx)*4;if(isBg(src.data[ni],src.data[ni+1],src.data[ni+2],src.data[ni+3],fc)){ring=true;break;}
    }
    if(pass===0&&!ring)continue;
    if(pass>0){
      let depth=0;for(let d=1;d<=pass;d++){let hit=false;for(const[dx,dy]of dirs){const nx=x+dx*d,ny=y+dy*d;if(nx<0||ny<0||nx>=src.width||ny>=src.height){hit=true;break;}const ni=(ny*src.width+nx)*4;if(isBg(src.data[ni],src.data[ni+1],src.data[ni+2],src.data[ni+3],fc)){hit=true;break;}}if(hit){depth=d;break;}}
      if(depth!==pass)continue;
    }
    drawThread(ctx,x*S,y*S+S/2,x*S+S,y*S+S/2,clamp(R+(pass%2?10:-10)),G,B,TH,pass%2===0?.4:.2);
  }
}
// 6. RADIAL
function rRadial(ctx,src,fab,fc,S){
  const cx0=src.width/2,cy0=src.height/2,TH=Math.max(1,S*.65);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const angle=Math.atan2(y-cy0,x-cx0),len=S*1.1,px=x*S+S/2,py=y*S+S/2;
    drawThread(ctx,px-Math.cos(angle)*len/2,py-Math.sin(angle)*len/2,px+Math.cos(angle)*len/2,py+Math.sin(angle)*len/2,R,G,B,TH,.5);
  }
}
// 7. RUNNING
function rRun(ctx,src,fab,fc,S){
  const TH=Math.max(1.2,S*.5);
  for(let y=1;y<src.height-1;y++)for(let x=1;x<src.width-1;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(A<80||(x+y)%2!==0)continue;
    const ri=(y*src.width+x+1)*4,di=((y+1)*src.width+x)*4;
    const l=lumRGB(R,G,B),r2=lumRGB(src.data[ri],src.data[ri+1],src.data[ri+2]),d=lumRGB(src.data[di],src.data[di+1],src.data[di+2]);
    if(Math.abs(l-r2)<18&&Math.abs(l-d)<18)continue;
    const angle=Math.atan2(d-l,r2-l)||.5,len=S*1.3,cx=x*S+S/2,cy=y*S+S/2;
    drawThread(ctx,cx-Math.cos(angle)*len/2,cy-Math.sin(angle)*len/2,cx+Math.cos(angle)*len/2,cy+Math.sin(angle)*len/2,R,G,B,TH,.3);
  }
}
// 8. BEAN
function rBean(ctx,src,fab,fc,S){
  const TH=Math.max(1.5,S*.55);
  for(let y=1;y<src.height-1;y++)for(let x=1;x<src.width-1;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(A<80)continue;
    const ri=(y*src.width+x+1)*4,di=((y+1)*src.width+x)*4;
    const l=lumRGB(R,G,B),r2=lumRGB(src.data[ri],src.data[ri+1],src.data[ri+2]),d=lumRGB(src.data[di],src.data[di+1],src.data[di+2]);
    if(Math.abs(l-r2)<18&&Math.abs(l-d)<18)continue;
    const angle=Math.atan2(d-l,r2-l)||.5,len=S*2,cx=x*S+S/2,cy=y*S+S/2,perp=angle+Math.PI/2;
    for(let p=-0.7;p<=0.7;p+=0.7)drawThread(ctx,cx-Math.cos(angle)*len/2+Math.cos(perp)*p,cy-Math.sin(angle)*len/2+Math.sin(perp)*p,cx+Math.cos(angle)*len/2+Math.cos(perp)*p,cy+Math.sin(angle)*len/2+Math.sin(perp)*p,R,G,B,TH,.4);
  }
}
// 9. STEM
function rStem(ctx,src,fab,fc,S){
  const TH=Math.max(1.5,S*.7);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const BASE_ANGLE=Math.PI/6+(((x*31+y*17)%100)/100)*.3,len=S*1.8,cx=x*S+S/2,cy=y*S+S/2;
    drawThread(ctx,cx,cy,cx+Math.cos(BASE_ANGLE)*len,cy+Math.sin(BASE_ANGLE)*len,R,G,B,TH,.5);
    drawThread(ctx,cx-Math.cos(BASE_ANGLE)*len*.5,cy-Math.sin(BASE_ANGLE)*len*.5,cx+Math.cos(BASE_ANGLE)*len*.5,cy+Math.sin(BASE_ANGLE)*len*.5,clamp(R+20),G,clamp(B+10),TH*.7,.6);
  }
}
// 10. BACK
function rBack(ctx,src,fab,fc,S){
  const TH=Math.max(1.5,S*.65);
  for(let y=0;y<src.height;y+=2){
    let prevX=-1,prevY=-1,prevR=0,prevG=0,prevB=0;
    for(let x=0;x<src.width;x++){
      const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
      if(isBg(R,G,B,A,fc)){prevX=-1;continue;}
      const cx=x*S+S/2,cy=y*S+S/2;
      if(prevX>=0)drawThread(ctx,cx,cy,prevX,prevY,prevR,prevG,prevB,TH,.35);
      prevX=cx;prevY=cy;prevR=R;prevG=G;prevB=B;
    }
  }
}
// 11. STRAIGHT
function rStraight(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.55);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const hash=(x*2654435761^y*2246822519)>>>0;
    if(hash%3!==0)continue;
    const ang=(hash%628)/100,len=S*(1+((hash>>8)%4)*.35),cx=x*S+S/2,cy=y*S+S/2;
    drawThread(ctx,cx-Math.cos(ang)*len/2,cy-Math.sin(ang)*len/2,cx+Math.cos(ang)*len/2,cy+Math.sin(ang)*len/2,R,G,B,TH,.25);
  }
}
// 12. CHAIN
function rChain(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.55);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=x*S+S/2,cy=y*S+S/2,a=(y%2===0)?0:Math.PI/2;
    ctx.save();ctx.strokeStyle=`rgb(${R},${G},${B})`;ctx.lineWidth=TH;ctx.lineCap='round';
    ctx.beginPath();for(let t=0;t<=Math.PI*2+.1;t+=.4)ctx.lineTo(cx+Math.cos(t+a)*S*.75,cy+Math.sin(t+a)*S*.42);
    ctx.stroke();ctx.fillStyle=`rgb(${clamp(R-20)},${clamp(G-20)},${clamp(B-20)})`;
    ctx.beginPath();ctx.arc(cx,cy,TH*.55,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
// 13. FEATHER
function rFeather(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.5);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=x*S+S/2,cy=y*S+S/2,dir=y%2===0?1:-1;
    drawThread(ctx,cx,cy-S*.65,cx,cy+S*.65,R,G,B,TH,.1);
    drawThread(ctx,cx,cy,cx-S*.8,cy-dir*S*.55,R,G,B,TH,.35);
    drawThread(ctx,cx,cy,cx+S*.8,cy+dir*S*.55,R,G,B,TH,.35);
  }
}
// 14. BLANKET
function rBlanket(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.5);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const bx=x*S,by=y*S;
    drawThread(ctx,bx+S*.1,by,bx+S*.1,by+S,R,G,B,TH,.1);
    drawThread(ctx,bx,by,bx+S,by,R,G,B,TH,.3);
  }
}
// 15. FLY
function rFly(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.5);
  for(let y=0;y<src.height;y+=2)for(let x=0;x<src.width;x+=2){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=x*S+S,cy=y*S+S;
    drawThread(ctx,cx-S*.9,cy-S*.5,cx,cy,R,G,B,TH,.3);
    drawThread(ctx,cx+S*.9,cy-S*.5,cx,cy,R,G,B,TH,.3);
    drawThread(ctx,cx,cy,cx,cy+S*.85,R,G,B,TH,.2);
    ctx.fillStyle=`rgb(${R},${G},${B})`;ctx.beginPath();ctx.arc(cx,cy+S*.85,TH*.6,0,Math.PI*2);ctx.fill();
  }
}
// 16. CROSS
function rCross(ctx,src,fab,fc,S){
  const TH=Math.max(1.2,S*.5);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const bx=x*S+1,by=y*S+1,ex=x*S+S-1,ey=y*S+S-1;
    drawThread(ctx,bx,ey,ex,by,clamp(R-20),clamp(G-20),clamp(B-20),TH,.15);
    drawThread(ctx,bx,by,ex,ey,R,G,B,TH,.55);
    ctx.fillStyle=`rgb(${clamp(R+15)},${clamp(G+15)},${clamp(B+15)})`;
    ctx.beginPath();ctx.arc((bx+ex)/2,(by+ey)/2,TH*.4,0,Math.PI*2);ctx.fill();
  }
}
// 17. PADDED SATIN
function rPaddedSatin(ctx,src,fab,fc,S){
  const A1=Math.PI/3,A2=Math.PI/4,TH=Math.max(1.4,S*.85);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=x*S+S/2,cy=y*S+S/2,l=S*.6;
    drawThread(ctx,cx-Math.cos(A1)*l,cy-Math.sin(A1)*l,cx+Math.cos(A1)*l,cy+Math.sin(A1)*l,clamp(R-30),clamp(G-30),clamp(B-30),TH,.1);
  }
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=x*S+S/2,cy=y*S+S/2,l=S*.62;
    drawThread(ctx,cx-Math.cos(A2)*l,cy-Math.sin(A2)*l,cx+Math.cos(A2)*l,cy+Math.sin(A2)*l,R,G,B,TH,.5+.5*Math.abs(Math.sin(x*.5)));
  }
}
// 18. MOTIF
function rMotif(ctx,src,fab,fc,S){
  const BS=6,TH=Math.max(1,S*.45);
  for(let gy=0;gy<Math.ceil(src.height/BS);gy++)for(let gx=0;gx<Math.ceil(src.width/BS);gx++){
    const px=gx*BS+Math.floor(BS/2),py=gy*BS+Math.floor(BS/2);
    if(px>=src.width||py>=src.height)continue;
    const i=(py*src.width+px)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=gx*BS*S+BS*S/2,cy=gy*BS*S+BS*S/2,r=S*1.6;
    for(let k=0;k<5;k++){const ang=k*Math.PI*2/5-Math.PI/2;drawThread(ctx,cx,cy,cx+Math.cos(ang)*r,cy+Math.sin(ang)*r,R,G,B,TH,.25);}
    ctx.strokeStyle=`rgb(${R},${G},${B})`;ctx.lineWidth=TH*.7;ctx.beginPath();ctx.arc(cx,cy,r*.38,0,Math.PI*2);ctx.stroke();
  }
}
// 19. STIPPLE
function rStipple(ctx,src,fab,fc,S){
  const pts=[];
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4;if(!isBg(src.data[i],src.data[i+1],src.data[i+2],src.data[i+3],fc))pts.push({x,y,r:src.data[i],g:src.data[i+1],b:src.data[i+2]});
  }
  if(!pts.length)return;
  pts.sort((a,b)=>a.y!==b.y?a.y-b.y:(a.y%2===0?a.x-b.x:b.x-a.x));
  const step=Math.max(1,Math.floor(pts.length/400)),TH=Math.max(1,S*.5);
  for(let k=step;k<pts.length;k+=step){
    const a=pts[k-step],b=pts[k];
    drawThread(ctx,a.x*S+S/2,a.y*S+S/2,b.x*S+S/2,b.y*S+S/2,a.r,a.g,a.b,TH,.2);
  }
}
// 20. ZIGZAG
function rZigzag(ctx,src,fab,fc,S){
  const TH=Math.max(1.2,S*.55);
  for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const bx=x*S,by=y*S,dir=y%2===0?1:-1;
    drawThread(ctx,bx,by+S/2,bx+S/2,by+S/2-dir*S*.7,R,G,B,TH,.35);
    drawThread(ctx,bx+S/2,by+S/2-dir*S*.7,bx+S,by+S/2+dir*S*.7,R,G,B,TH,.35);
  }
}
// 21. SCALLOP
function rScallop(ctx,src,fab,fc,S){
  const BS=8,TH=Math.max(1,S*.5);
  for(let gy=0;gy<Math.ceil(src.height/BS);gy++)for(let gx=0;gx<Math.ceil(src.width/BS);gx++){
    const px=gx*BS,py=gy*BS+Math.floor(BS*.6);
    if(px>=src.width||py>=src.height)continue;
    const i=(py*src.width+px)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=gx*BS*S+BS*S/2,cy=gy*BS*S+BS*S*.65,r=BS*S*.55;
    for(let t=0;t<=Math.PI;t+=Math.PI/7)drawThread(ctx,cx,cy,cx+Math.cos(Math.PI+t)*r,cy+Math.sin(Math.PI+t)*r,R,G,B,TH,.4);
  }
}
// 22. PICOT
function rPicot(ctx,src,fab,fc,S){
  const BS=5,TH=Math.max(1,S*.45);
  for(let gy=0;gy<Math.ceil(src.height/BS);gy++)for(let gx=0;gx<Math.ceil(src.width/BS);gx++){
    const px=gx*BS,py=gy*BS;if(px>=src.width||py>=src.height)continue;
    const i=(py*src.width+px)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(isBg(R,G,B,A,fc))continue;
    const cx=gx*BS*S+BS*S/2,cy=gy*BS*S+BS*S*.4;
    drawThread(ctx,cx-S*.5,cy+S*.6,cx-S*.9,cy-S*.8,R,G,B,TH,.2);
    drawThread(ctx,cx+S*.5,cy+S*.6,cx+S*.9,cy-S*.8,R,G,B,TH,.2);
    ctx.strokeStyle=`rgb(${R},${G},${B})`;ctx.lineWidth=TH;
    ctx.beginPath();ctx.arc(cx,cy-S*.5,S*.7,Math.PI*.15,Math.PI*.85);ctx.stroke();
  }
}
// 23. PROG
function rProg(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.55);let lX=-1,lY=-1,lR=0,lG=0,lB=0;
  for(let y=0;y<src.height;y++){
    const xs=y%2===0?range(0,src.width):range(src.width-1,-1,-1);
    for(const x of xs){
      const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
      if(isBg(R,G,B,A,fc)){lX=-1;continue;}
      const cx=x*S+S/2,cy=y*S+S/2;
      if(lX>=0)drawThread(ctx,lX,lY,cx,cy,lR,lG,lB,TH,.3);
      ctx.fillStyle=`rgb(${clamp(R-25)},${clamp(G-25)},${clamp(B-25)})`;ctx.beginPath();ctx.arc(cx,cy,TH*.4,0,Math.PI*2);ctx.fill();
      lX=cx;lY=cy;lR=R;lG=G;lB=B;
    }
  }
}
// 24. DST
function rDST(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.5);let lX=-1,lY=-1;
  for(let y=0;y<src.height;y+=2)for(let x=0;x<src.width;x++){
    const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
    if(A<80||isBg(R,G,B,A,fc)){
      if(lX>=0){
        ctx.save();ctx.setLineDash([S*1.2,S*.8]);ctx.strokeStyle='rgba(255,120,30,.7)';ctx.lineWidth=TH*.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(lX,lY);ctx.lineTo(x*S,y*S);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      }
      lX=-1;continue;
    }
    const cx=x*S+S/2,cy=y*S+S/2;
    if(lX>=0)drawThread(ctx,lX,lY,cx,cy,R,G,B,TH,.3);
    ctx.fillStyle=`rgb(${clamp(R-30)},${clamp(G-30)},${clamp(B-30)})`;ctx.beginPath();ctx.arc(cx,cy,TH*.35,0,Math.PI*2);ctx.fill();
    lX=cx;lY=cy;
  }
}
// 25. PHOTO
function rPhoto(ctx,src,fab,fc,S){
  const TH=Math.max(1,S*.55);
  for(let y=0;y<src.height;y+=2){
    const dir=(y%4===0)?1:-1,xs=dir>0?range(0,src.width):range(src.width-1,-1,-1);
    for(const x of xs){
      const i=(y*src.width+x)*4,R=src.data[i],G=src.data[i+1],B=src.data[i+2],A=src.data[i+3];
      if(A<80)continue;
      const lum=lumRGB(R,G,B)/255,density=1-lum;
      const hash=(x*31+y*17)%100;if(hash>density*120)continue;
      const cx=x*S+S/2,cy=y*S+S/2,sLen=S*(0.8+density*1.6);
      drawThread(ctx,cx,cy,cx+sLen*dir,cy,R,G,B,TH*(.5+density*.5),.2+density*.4);
    }
  }
}

export function extractPalette(data,k){
  const pixels=[],step=Math.max(1,Math.floor(data.length/4/2000));
  for(let i=0;i<data.length;i+=4*step){const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];if(a<128||lumRGB(r,g,b)>240)continue;pixels.push([r,g,b]);}
  if(!pixels.length)return[{rgb:[100,100,100],hex:'#646464',pct:100,name:'Gray',dmc:'DMC 415'}];
  let clusters=[pixels];
  while(clusters.length<k){
    let li=0;clusters.forEach((c,i)=>{if(c.length>clusters[li].length)li=i;});
    const cl=clusters[li];if(cl.length<2)break;
    let rng=[[255,0],[255,0],[255,0]];
    cl.forEach(p=>p.forEach((v,i)=>{rng[i][0]=Math.min(rng[i][0],v);rng[i][1]=Math.max(rng[i][1],v);}));
    const ch=rng.map(r=>r[1]-r[0]).indexOf(Math.max(...rng.map(r=>r[1]-r[0])));
    cl.sort((a,b)=>a[ch]-b[ch]);const mid=Math.floor(cl.length/2);
    clusters.splice(li,1,cl.slice(0,mid),cl.slice(mid));
  }
  const pal=clusters.filter(c=>c.length>0).map(c=>{
    const avg=c.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]).map(v=>Math.round(v/c.length));
    return{rgb:avg,hex:rgbHex(avg[0],avg[1],avg[2]),pct:Math.round(c.length/pixels.length*100),name:colorName(avg[0],avg[1],avg[2]),dmc:dmcCode(avg[0],avg[1],avg[2])};
  });
  pal.sort((a,b)=>b.pct-a.pct);
  const tot=pal.reduce((s,c)=>s+c.pct,0);if(tot>0)pal.forEach(c=>c.pct=Math.round(c.pct/tot*100));
  return pal;
}

export function calcMetrics(iD){
  const{data,width,height}=iD;let edges=0;
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=(y*width+x)*4,l=lumRGB(data[i],data[i+1],data[i+2]);
    const r=lumRGB(data[(y*width+x+1)*4],data[(y*width+x+1)*4+1],data[(y*width+x+1)*4+2]);
    const d=lumRGB(data[((y+1)*width+x)*4],data[((y+1)*width+x)*4+1],data[((y+1)*width+x)*4+2]);
    if(Math.abs(l-r)>20||Math.abs(l-d)>20)edges++;
  }
  const cs=new Set(),step=Math.max(1,Math.floor(data.length/4/1200));
  for(let i=0;i<data.length;i+=4*step){if(data[i+3]<128)continue;cs.add((data[i]>>4<<8)|(data[i+1]>>4<<4)|(data[i+2]>>4));}
  return{edgeDensity:edges/(width*height),colorComplexity:Math.min(cs.size/60,1)};
}

export function buildResult(metrics,palette,w,h,budget,stitch,fabric){
  const cmW=(w/96*2.54).toFixed(1),cmH=(h/96*2.54).toFixed(1),areaCm=parseFloat((cmW*cmH).toFixed(1));
  const cx=Math.min(1,metrics.edgeDensity*3+metrics.colorComplexity*.5);
  const cl=cx<.2?'Simple':cx<.45?'Moderate':cx<.7?'Complex':'Highly Complex';
  const stitchCount=Math.round(areaCm*(100+Math.round(cx*120))*stitch.density);
  const threadCount=Math.round(stitchCount*2.5*stitch.dm);
  const numColors=Math.max(2,palette.length);
  const hours=Math.max(1,Math.round(stitchCount/Math.round((2200-cx*1100)*stitch.dm)));
  const totalSkeins=numColors*Math.max(1,Math.round(stitchCount/numColors/900));
  const fabricCost=fabric.id==='silk'?800:fabric.id==='leather'?600:fabric.id==='organza'?400:100+Math.round(cx*180);
  const threadCost=totalSkeins*22,stabCost=['felt','canvas','aida'].includes(fabric.id)?0:fabric.id==='leather'?0:120;
  const misc=95,labor=hours*200,total=fabricCost+threadCost+stabCost+misc+labor;
  const feasibility=total<=budget?'Feasible':total<=budget*1.3?'Tight':'Over Budget';
  return{cmW,cmH,areaCm,complexityLabel:cl,stitchCount,threadCount,numColors,hours,totalSkeins,
    stitchName:stitch.name,fabricName:fabric.name,stab:fabric.stab,needle:fabric.needle,tension:fabric.tension,
    palette,fabricCost,threadCost,stabCost,misc,labor,total,feasibility,
    materials:[{item:fabric.name+' Fabric',qty:`1pc (${cmW}×${cmH}cm)`,cost:fabricCost},{item:`DMC Thread (${numColors} colors)`,qty:totalSkeins+' skeins',cost:threadCost},{item:'Stabilizer ('+fabric.stab+')',qty:'1 sheet',cost:stabCost},{item:'Needle + misc',qty:'Set',cost:misc}],
    tips:['🪡 '+stitch.desc.split('.')[0]+'.','🧵 '+fabric.desc,'📐 Use '+fabric.stab+' stabilizer · '+fabric.needle+' needle · '+fabric.tension+' tension.','🎨 '+numColors+' DMC colors — sort & label bobbins before starting.','⏱ Est. '+hours+' hour'+(hours>1?'s':'')+' machine time. Run a test on scrap fabric first.',],
    summary:`This ${cl.toLowerCase()} design (~${cmW}×${cmH}cm) uses ${stitch.name} on ${fabric.name}. ~${stitchCount.toLocaleString()} stitches, ${threadCount.toLocaleString()} thread segments, ${numColors} DMC colors. Machine time: ~${hours}h.`
  };
}

function colorName(r,g,b){const n=[[[220,36,36],'Red'],[[183,18,52],'Dark Red'],[[255,100,80],'Coral'],[[255,165,0],'Orange'],[[255,200,50],'Amber'],[[255,255,0],'Yellow'],[[50,150,50],'Green'],[[0,128,0],'Dark Green'],[[0,150,150],'Teal'],[[0,180,255],'Sky Blue'],[[30,80,180],'Blue'],[[100,50,200],'Violet'],[[200,100,150],'Pink'],[[180,120,80],'Tan'],[[100,60,30],'Brown'],[[200,200,200],'Silver'],[[128,128,128],'Gray'],[[50,50,50],'Charcoal'],[[200,150,50],'Gold'],[[240,230,210],'Cream']];let best='Custom',bd=Infinity;n.forEach(([rgb,nm])=>{const d=Math.hypot(r-rgb[0],g-rgb[1],b-rgb[2]);if(d<bd){bd=d;best=nm;}});return best;}
function dmcCode(r,g,b){const d=[[[220,36,36],'DMC 321'],[[183,18,52],'DMC 816'],[[255,100,80],'DMC 351'],[[255,165,0],'DMC 740'],[[255,200,100],'DMC 3825'],[[50,150,50],'DMC 700'],[[0,120,180],'DMC 996'],[[30,60,160],'DMC 792'],[[100,50,200],'DMC 3746'],[[200,100,150],'DMC 3689'],[[180,120,80],'DMC 435'],[[100,60,30],'DMC 801'],[[200,200,200],'DMC 762'],[[128,128,128],'DMC 415'],[[50,50,50],'DMC 310'],[[200,150,50],'DMC 783']];let best='DMC 310',bd=Infinity;d.forEach(([rgb,code])=>{const dist=Math.hypot(r-rgb[0],g-rgb[1],b-rgb[2]);if(dist<bd){bd=dist;best=code;}});return best;}
