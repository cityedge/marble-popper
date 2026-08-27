// Marble Stage Generator Core v0.19
// Derived from the generation/export core in marble_stage_generator_lab_v19.html.
// Shape generation and validation are unchanged. The optional depth/strength
// ceilings are the Random Stage termination policy requested for bounded work.
(function(root){
'use strict';
const W=1280,H=720,BALL_R=20,BALL_SPACING=40.5,SAMPLE_BALLS=64;
const GENERATOR_VERSION='0.19';
// Match the game renderer's real geometry instead of reserving a second,
// invisible padding band.  The 58 px track needs 29 px at canvas edges; at
// the bottom it may approach the loaded shooter marble without overlapping it.
const TRACK_VISUAL_RADIUS=29,SHOOTER_Y=674,SHOOTER_CURRENT_OFFSET_Y=-27,SHOOTER_BALL_CENTER_Y=SHOOTER_Y+SHOOTER_CURRENT_OFFSET_Y,SHOOTER_BALL_R=21;
const SAFE_TRACK_BOTTOM=SHOOTER_BALL_CENTER_Y-SHOOTER_BALL_R-TRACK_VISUAL_RADIUS;
const B={l:TRACK_VISUAL_RADIUS,r:W-TRACK_VISUAL_RADIUS,t:TRACK_VISUAL_RADIUS,b:SAFE_TRACK_BOTTOM};
const FINAL_CLEAR=50,GEN_CLEAR=50,LOCAL_EXEMPT=BALL_SPACING*2.35,CROSS_EXEMPT=BALL_SPACING*1.30,MIN_ANGLE=89.5;
const COVER_CELL=32,COVER_RADIUS=28,GRID_COLS=Math.ceil((B.r-B.l)/COVER_CELL),GRID_ROWS=Math.ceil((B.b-B.t)/COVER_CELL),GRID_TOTAL=GRID_COLS*GRID_ROWS;
const MAX_DENSIFY_DEPTH=14,BEAM_WIDTH=3,BEAM_CHILDREN=5,BEAM_PATIENCE=3;
// 61 px yields a 21 x 10 lattice that almost exactly fills B.  Centering the
// lattice makes the first/last rows and columns symmetric, so vertical Flip
// maps generated lattice points back onto the same lattice.
const MAZE_STEP=61;
const MAZE_COLS=Math.floor((B.r-B.l)/MAZE_STEP)+1,MAZE_ROWS=Math.floor((B.b-B.t)/MAZE_STEP)+1;
const MAZE_X0=(B.l+B.r-(MAZE_COLS-1)*MAZE_STEP)/2,MAZE_Y0=(B.t+B.b-(MAZE_ROWS-1)*MAZE_STEP)/2;
const MAZE_TOTAL=MAZE_COLS*MAZE_ROWS;
const MAZE_BLOCK=54,MAZE_NEAR=112,MAZE_TRIALS=8,MAZE_SPAN_LIMIT=16;
const SURGERY_SPANS=[1,2,3,4,6,8,10,12];
const MAX_SIMPLIFY_STEPS=84,SIMPLIFY_TEST_LIMIT=90;
const COLORS=[['#ff5e67','#7b2028','#ffd2d6'],['#51a7ff','#174a7f','#d7ebff'],['#ffc84a','#7b5610','#fff0b8'],['#5bd58a','#1d6d40','#d9ffe7']];
let stage=null,phase='final',lastBatchBundle=null,batchCancelRequested=false,batchRunning=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,P=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y),copy=a=>a.map(p=>({...p}));
function hash32(v){let x=(v>>>0)||1;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return x>>>0}
function rng32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const rand=(r,a,b)=>lerp(a,b,r()),pick=(r,a)=>a[Math.floor(r()*a.length)];
const toPx=p=>P(lerp(B.l,B.r,p.x),lerp(B.t,B.b,p.y));
function segHit(a,b,c,d){const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-8)return null;const qx=c.x-a.x,qy=c.y-a.y,t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;if(t<=1e-5||t>=1-1e-5||u<=1e-5||u>=1-1e-5)return null;return{x:a.x+t*rx,y:a.y+t*ry,t,u}}
function angle(a,b,c){const ux=a.x-b.x,uy=a.y-b.y,vx=c.x-b.x,vy=c.y-b.y,lu=Math.hypot(ux,uy),lv=Math.hypot(vx,vy);if(lu<1e-6||lv<1e-6)return 180;return Math.acos(clamp((ux*vx+uy*vy)/(lu*lv),-1,1))*180/Math.PI}
function minAngle(p){let m=180;for(let i=1;i<p.length-1;i++)m=Math.min(m,angle(p[i-1],p[i],p[i+1]));return m}
function buildTrack(p){const c=[0];for(let i=1;i<p.length;i++)c.push(c[i-1]+dist(p[i-1],p[i]));return{pts:p,cum:c,length:c[c.length-1]}}
function trackPos(t,s){s=clamp(s,0,t.length);let lo=0,hi=t.cum.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(t.cum[m]<s)lo=m;else hi=m}const span=Math.max(1e-6,t.cum[hi]-t.cum[lo]),q=(s-t.cum[lo])/span;return P(lerp(t.pts[lo].x,t.pts[hi].x,q),lerp(t.pts[lo].y,t.pts[hi].y,q))}
function tangent(t,s){const a=trackPos(t,s-5),b=trackPos(t,s+5),d=Math.hypot(b.x-a.x,b.y-a.y)||1;return P((b.x-a.x)/d,(b.y-a.y)/d)}
function crossings(t){const out=[];for(let i=0;i<t.pts.length-1;i++)for(let j=i+2;j<t.pts.length-1;j++){const h=segHit(t.pts[i],t.pts[i+1],t.pts[j],t.pts[j+1]);if(!h)continue;out.push({i,j,x:h.x,y:h.y,s1:lerp(t.cum[i],t.cum[i+1],h.t),s2:lerp(t.cum[j],t.cum[j+1],h.u)})}const c=[];for(const h of out){const q=c.find(x=>Math.hypot(x.x-h.x,x.y-h.y)<9);if(q){q.x=(q.x+h.x)/2;q.y=(q.y+h.y)/2;q.s1=(q.s1+h.s1)/2;q.s2=(q.s2+h.s2)/2}else c.push({...h})}return c}
function intentional(s1,s2,c){return c.some(x=>(Math.abs(s1-x.s1)<=CROSS_EXEMPT&&Math.abs(s2-x.s2)<=CROSS_EXEMPT)||(Math.abs(s1-x.s2)<=CROSS_EXEMPT&&Math.abs(s2-x.s1)<=CROSS_EXEMPT))}
function clearOK(t,c,minClear=FINAL_CLEAR){const cell=minClear,map=new Map();let min=Infinity;const samples=[];for(let s=0;s<t.length;s+=14)samples.push({s,p:trackPos(t,s)});samples.push({s:t.length,p:trackPos(t,t.length)});for(const cur of samples){const gx=Math.floor(cur.p.x/cell),gy=Math.floor(cur.p.y/cell);for(let yy=gy-1;yy<=gy+1;yy++)for(let xx=gx-1;xx<=gx+1;xx++){const bucket=map.get(xx+','+yy);if(!bucket)continue;for(const prev of bucket){if(cur.s-prev.s<=LOCAL_EXEMPT||intentional(prev.s,cur.s,c))continue;const dx=cur.p.x-prev.p.x,dy=cur.p.y-prev.p.y,d=Math.hypot(dx,dy);min=Math.min(min,d);if(d<minClear)return{ok:false,min:d}}}const key=gx+','+gy;if(!map.has(key))map.set(key,[]);map.get(key).push(cur)}return{ok:true,min:Number.isFinite(min)?min:null}}
function validate(p,target,minClear=FINAL_CLEAR){if(p.length<2||p.some(q=>q.x<B.l||q.x>B.r||q.y<B.t||q.y>B.b))return{ok:false,why:'bounds'};const ma=minAngle(p);if(ma<MIN_ANGLE)return{ok:false,why:`acute ${ma.toFixed(1)}°`};const t=buildTrack(p),c=crossings(t);if(c.length!==target)return{ok:false,why:`crossings ${c.length}`};const cl=clearOK(t,c,minClear);if(!cl.ok)return{ok:false,why:`clearance ${cl.min.toFixed(1)}px`};return{ok:true,track:t,cross:c,clear:cl,minAngle:ma}}
function pointSeg(p,a,b){const vx=b.x-a.x,vy=b.y-a.y,d=vx*vx+vy*vy||1,t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/d,0,1);return Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t))}
function coverSet(p){const used=new Set();for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1],d=dist(a,b),n=Math.max(1,Math.ceil(d/9));for(let k=0;k<=n;k++){const t=k/n,x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t),gx0=Math.floor((x-B.l)/COVER_CELL),gy0=Math.floor((y-B.t)/COVER_CELL);for(let gy=gy0-2;gy<=gy0+2;gy++)for(let gx=gx0-2;gx<=gx0+2;gx++){if(gx<0||gy<0||gx>=GRID_COLS||gy>=GRID_ROWS)continue;const cx=B.l+(gx+.5)*COVER_CELL,cy=B.t+(gy+.5)*COVER_CELL;if(Math.hypot(cx-x,cy-y)<=COVER_RADIUS+COVER_CELL*.50)used.add(gy*GRID_COLS+gx)}}}return used}
const coverage=p=>coverSet(p).size/GRID_TOTAL;
function cellCenter(id){const gy=Math.floor(id/GRID_COLS),gx=id%GRID_COLS;return P(B.l+(gx+.5)*COVER_CELL,B.t+(gy+.5)*COVER_CELL)}
function freeRegions(p){const used=coverSet(p),seen=new Set(),regions=[];for(let id=0;id<GRID_TOTAL;id++){if(used.has(id)||seen.has(id))continue;const q=[id],cells=[];seen.add(id);let sx=0,sy=0;while(q.length){const v=q.pop(),gy=Math.floor(v/GRID_COLS),gx=v%GRID_COLS,c=cellCenter(v);cells.push(v);sx+=c.x;sy+=c.y;const nn=[[gx-1,gy],[gx+1,gy],[gx,gy-1],[gx,gy+1]];for(const [nx,ny] of nn){if(nx<0||ny<0||nx>=GRID_COLS||ny>=GRID_ROWS)continue;const ni=ny*GRID_COLS+nx;if(used.has(ni)||seen.has(ni))continue;seen.add(ni);q.push(ni)}}if(cells.length)regions.push({cells,size:cells.length,centroid:P(sx/cells.length,sy/cells.length)})}regions.sort((a,b)=>b.size-a.size);return regions}

// ----- Base shapes: type RNG and parameter RNG are intentionally separate -----
function baseStraight(r){return[P(rand(r,.06,.13),rand(r,.16,.38)),P(rand(r,.87,.94),rand(r,.16,.38))]}
function baseS(r){const p=[],n=8,flip=r()<.5?-1:1,a=rand(r,.21,.28);for(let i=0;i<n;i++){const t=i/(n-1);p.push(P(lerp(.07,.93,t),clamp(.48+flip*Math.sin(t*Math.PI*2)*a,.08,.90)))}return p}
function baseU(r){const l=rand(r,.08,.15),rr=rand(r,.85,.92),t=rand(r,.10,.18),b=rand(r,.76,.89);return r()<.5?[P(l,t),P(rr,t),P(rr,b),P(l,b),P(l,.56)]:[P(rr,t),P(l,t),P(l,b),P(rr,b),P(rr,.56)]}
function baseRectWave(r){const rows=3+Math.floor(r()*2),l=rand(r,.07,.13),rr=rand(r,.87,.93),t=rand(r,.10,.16),b=rand(r,.80,.89),p=[];for(let i=0;i<rows;i++){const y=lerp(t,b,i/(rows-1)),xa=i%2?rr:l,xb=i%2?l:rr;if(i===0)p.push(P(xa,y));p.push(P(xb,y));if(i<rows-1)p.push(P(xb,lerp(t,b,(i+1)/(rows-1))))}return p}
function baseSerp(r){const p=[],n=11,w=1.5+Math.floor(r()*2)*.5,a=rand(r,.20,.29),ph=rand(r,-.3,.3);for(let i=0;i<n;i++){const t=i/(n-1);p.push(P(lerp(.07,.93,t),clamp(.48+Math.sin(t*Math.PI*2*w+ph)*a,.08,.90)))}return p}
function baseSpiral(r){const p=[],n=19,turns=1.4+rand(r,0,.35),cw=r()<.5?1:-1,cx=rand(r,.46,.55),cy=rand(r,.45,.52),start=rand(r,-.4,.4);for(let i=0;i<n;i++){const t=i/(n-1),a=start+cw*t*Math.PI*2*turns,s=lerp(1,.25,t);p.push(P(cx+Math.cos(a)*.41*s,cy+Math.sin(a)*.38*s))}return p}
function baseRectSpiral(r){const cw=r()<.5,l=.07,rr=.93,t=.09,b=.89,g=rand(r,.135,.155);return cw?[P(l,t),P(rr,t),P(rr,b),P(l,b),P(l,b-g),P(rr-g,b-g),P(rr-g,t+g),P(l+g,t+g),P(l+g,b-2*g),P(rr-2*g,b-2*g)]:[P(rr,t),P(l,t),P(l,b),P(rr,b),P(rr,b-g),P(l+g,b-g),P(l+g,t+g),P(rr-g,t+g),P(rr-g,b-2*g),P(l+2*g,b-2*g)]}
function baseLoop(r){const l=.10,rr=.90,t=.11,b=.87;return r()<.5?[P(l,.34),P(l,t),P(rr,t),P(rr,b),P(l,b),P(l,.60)]:[P(rr,.34),P(rr,t),P(l,t),P(l,b),P(rr,b),P(rr,.60)]}
const CROSS2_PAIRINGS=['AABB','ABAB','ABBA'];
function transformCrossTemplate(p,r){
  // Mirrors and mild axis scaling preserve the crossing topology and all 90°
  // skeleton turns while moving the crossings to genuinely different regions.
  const mx=r()<.5,my=r()<.5,sx=rand(r,.96,1.015),sy=rand(r,.96,1.015);
  return p.map(q=>{
    let x=.5+(q.x-.5)*sx,y=.5+(q.y-.5)*sy;
    if(mx)x=1-x;if(my)y=1-y;
    return P(x,y)
  })
}
function baseCross1(r){
  const p=[P(.08,.20),P(.82,.20),P(.82,.78),P(.18,.78),P(.18,.34),P(.92,.34)];
  return transformCrossTemplate(p,r)
}
function baseCross2(r){
  const pairing=pick(r,CROSS2_PAIRINGS);
  const templates={
    // Two independent crossing loops: visit order A A B B.
    AABB:[P(.05,.15),P(.38,.15),P(.38,.45),P(.12,.45),P(.12,.28),P(.45,.28),P(.55,.28),P(.55,.12),P(.90,.12),P(.90,.48),P(.62,.48),P(.62,.30),P(.96,.30)],
    // Interleaved crossings: visit order A B A B.
    ABAB:[P(.08,.18),P(.82,.18),P(.82,.78),P(.18,.78),P(.18,.34),P(.92,.34),P(.92,.62),P(.35,.62)],
    // Nested crossings: visit order A B B A.
    ABBA:[P(.05,.15),P(.90,.15),P(.90,.85),P(.10,.85),P(.10,.30),P(.60,.30),P(.60,.70),P(.25,.70),P(.25,.45),P(.72,.45),P(.72,.30),P(.96,.30)]
  };
  return transformCrossTemplate(templates[pairing],r)
}
const TYPES=['straight','s','horseshoe','rectwave','serpentine','spiral','rectspiral','loop','cross1','cross2'];
const LABEL={straight:'Straight',s:'S Curve',horseshoe:'Horseshoe / U',rectwave:'Rectangular Wave',serpentine:'Smooth Serpentine',spiral:'Circular Spiral',rectspiral:'Rectangular Spiral',loop:'Open Loop',cross1:'One Crossing',cross2:'Two Crossings'};
function crossTarget(t){return t==='cross1'?1:t==='cross2'?2:0}
function makeBase(t,r){let p=t==='straight'?baseStraight(r):t==='s'?baseS(r):t==='horseshoe'?baseU(r):t==='rectwave'?baseRectWave(r):t==='serpentine'?baseSerp(r):t==='spiral'?baseSpiral(r):t==='rectspiral'?baseRectSpiral(r):t==='loop'?baseLoop(r):t==='cross1'?baseCross1(r):baseCross2(r);return p.map(toPx)}
function crossingOrderInfo(c){
  const ranked=c.map((x,index)=>({index,first:Math.min(x.s1,x.s2),second:Math.max(x.s1,x.s2)})).sort((a,b)=>a.first-b.first);
  const rankByIndex=new Map(ranked.map((q,i)=>[q.index,i]));
  const events=[];
  ranked.forEach((q,rank)=>{events.push({s:q.first,rank,first:true});events.push({s:q.second,rank,first:false})});
  events.sort((a,b)=>a.s-b.s);
  return{ranked,rankByIndex,events}
}
function crossingTopology(c){
  if(!c.length)return'—';
  const info=crossingOrderInfo(c);
  return info.events.map(e=>String.fromCharCode(65+e.rank)).join('')
}
function crossingDepthSequence(c,bits){
  if(!c.length)return'—';
  const info=crossingOrderInfo(c);
  return info.events.map(e=>{
    const upperFirst=!!bits?.[e.rank];
    const upper=e.first?upperFirst:!upperFirst;
    return upper?'↑':'↓'
  }).join('')
}


// ----- Densification v0.10: normal surgery + fine-grid/global fallback -----
// Most seeds now work well with the standard multi-span surgery. The special
// case we still need to rescue is the "sealed pocket" family (rectangular
// spirals, nested U shapes, etc.), where the coarse maze grid sees no legal
// first move even though there is clearly empty space available.
//
// Strategy:
//   1) Keep the existing surgery as the default path.
//   2) If a state yields no normal children, try a finer planning grid.
//   3) If that still fails, try a broader 'global surgery' that can replace a
//      longer span at once and accept small temporary losses in length so long
//      as the resulting route fills more space overall.
function protectedSegs(p,target){const t=buildTrack(p),c=crossings(t),z=new Set();if(c.length!==target)return z;for(const x of c){z.add(x.i);z.add(x.j)}return z}
function mazeCfg(step,nearMul=1.75){const cols=Math.floor((B.r-B.l)/step)+1,rows=Math.floor((B.b-B.t)/step)+1,x0=(B.l+B.r-(cols-1)*step)/2,y0=(B.t+B.b-(rows-1)*step)/2;return{step,x0,y0,cols,rows,total:cols*rows,block:MAZE_BLOCK,near:Math.max(84,step*nearMul)}}
const DEFAULT_MAZE_CFG=mazeCfg(MAZE_STEP,MAZE_NEAR/MAZE_STEP);
function mazeIdCfg(x,y,c){return y*c.cols+x}
function mazeXYCfg(id,c){return{x:id%c.cols,y:Math.floor(id/c.cols)}}
function mazePointCfg(id,c){const q=mazeXYCfg(id,c);return P(c.x0+q.x*c.step,c.y0+q.y*c.step)}
function mazeNeighborsCfg(id,c){const q=mazeXYCfg(id,c),a=[];if(q.x>0)a.push(mazeIdCfg(q.x-1,q.y,c));if(q.x+1<c.cols)a.push(mazeIdCfg(q.x+1,q.y,c));if(q.y>0)a.push(mazeIdCfg(q.x,q.y-1,c));if(q.y+1<c.rows)a.push(mazeIdCfg(q.x,q.y+1,c));return a}
function mazeId(x,y){return mazeIdCfg(x,y,DEFAULT_MAZE_CFG)}
function mazeXY(id){return mazeXYCfg(id,DEFAULT_MAZE_CFG)}
function mazePoint(id){return mazePointCfg(id,DEFAULT_MAZE_CFG)}
function mazeNeighbors(id){return mazeNeighborsCfg(id,DEFAULT_MAZE_CFG)}
function rangeTouchesProtected(prot,i,j){for(let k=i;k<j;k++)if(prot.has(k))return true;return false}
function pointPathExceptRange(q,p,i,j){let m=1e9;for(let k=0;k<p.length-1;k++){if(k>=i&&k<j)continue;m=Math.min(m,pointSeg(q,p[k],p[k+1]))}return m}
function blockedMazeNodesRangeCfg(p,i,j,c){const z=new Set(),a=p[i],b=p[j];for(let id=0;id<c.total;id++){const q=mazePointCfg(id,c);if(pointPathExceptRange(q,p,i,j)<c.block&&dist(q,a)>c.near*.72&&dist(q,b)>c.near*.72)z.add(id)}return z}
function blockedMazeNodesRange(p,i,j){return blockedMazeNodesRangeCfg(p,i,j,DEFAULT_MAZE_CFG)}
function mazeEdgeHitsRestRangeCfg(u,v,p,i,j,c){const a=mazePointCfg(u,c),b=mazePointCfg(v,c);for(let k=0;k<p.length-1;k++){if(k>=i&&k<j)continue;if(segHit(a,b,p[k],p[k+1]))return true}return false}
function mazeEdgeHitsRestRange(u,v,p,i,j){return mazeEdgeHitsRestRangeCfg(u,v,p,i,j,DEFAULT_MAZE_CFG)}
function connectorHitsRestRange(a,b,p,i,j){for(let k=0;k<p.length-1;k++){if(k>=i&&k<j)continue;if(segHit(a,b,p[k],p[k+1]))return true}return false}
function mazeUseSet(p){const t=buildTrack(p),z=new Set();for(let id=0;id<DEFAULT_MAZE_CFG.total;id++){const q=mazePointCfg(id,DEFAULT_MAZE_CFG);let m=1e9;for(let k=1;k<t.pts.length;k++){m=Math.min(m,pointSeg(q,t.pts[k-1],t.pts[k]));if(m<24)break}if(m<24)z.add(id)}return z}
function nearMazeNodesCfg(q,blocked,c,maxNodes=10){const a=[],lo=Math.max(18,c.step*.28),hi=c.near;for(let id=0;id<c.total;id++){if(blocked.has(id))continue;const d=dist(q,mazePointCfg(id,c));if(d>=lo&&d<=hi)a.push({id,d})}a.sort((x,y)=>x.d-y.d);return a.slice(0,maxNodes).map(x=>x.id)}
function nearMazeNodes(q,blocked){return nearMazeNodesCfg(q,blocked,DEFAULT_MAZE_CFG)}
function endApproachOKCfg(prev,end,anchor,c){if(!anchor)return true;const p=mazePointCfg(prev,c),e=mazePointCfg(end,c);return((p.x-e.x)*(anchor.x-e.x)+(p.y-e.y)*(anchor.y-e.y))<=1e-6}
function bfsMazeCfg(start,end,blocked,forbidden,c,endAnchor=null,edgeBad=null){const prev=new Map(),q=[start],seen=new Set([start]);for(let h=0;h<q.length;h++){const v=q[h];if(v===end)break;for(const n of mazeNeighborsCfg(v,c)){if(blocked.has(n)||(forbidden.has(n)&&n!==end)||seen.has(n)||(edgeBad&&edgeBad(v,n)))continue;if(n===end&&!endApproachOKCfg(v,end,endAnchor,c))continue;seen.add(n);prev.set(n,v);q.push(n)}}if(!seen.has(end))return null;const out=[];for(let v=end;;v=prev.get(v)){out.push(v);if(v===start)break}out.reverse();return out}
function longMazeRouteCfg(start,end,blocked,r,desired,startAnchor,endAnchor,edgeBad,c){if(start===end)return null;const path=[start],used=new Set([start]);let cur=start;desired=Math.max(3,desired);for(let step=0;step<desired;step++){let opts=[];for(const n of mazeNeighborsCfg(cur,c)){if(n===end||blocked.has(n)||used.has(n)||(edgeBad&&edgeBad(cur,n)))continue;if(path.length===1&&startAnchor){const sp=mazePointCfg(start,c),np=mazePointCfg(n,c);if((startAnchor.x-sp.x)*(np.x-sp.x)+(startAnchor.y-sp.y)*(np.y-sp.y)>1e-6)continue}const f=new Set(used);f.add(n);const tail=bfsMazeCfg(n,end,blocked,f,c,endAnchor,edgeBad);if(!tail)continue;let degree=0;for(const z of mazeNeighborsCfg(n,c))if(!blocked.has(z)&&!f.has(z)&&!(edgeBad&&edgeBad(n,z)))degree++;const ep=mazePointCfg(n,c),tp=mazePointCfg(end,c),away=Math.hypot(ep.x-tp.x,ep.y-tp.y)/c.step;opts.push({n,score:(4-degree)*.58+away*.09+r()*.72})}if(!opts.length)break;opts.sort((a,b)=>b.score-a.score);const pickN=opts[Math.min(opts.length-1,Math.floor(r()*Math.min(3,opts.length)))].n;path.push(pickN);used.add(pickN);cur=pickN}const tail=bfsMazeCfg(cur,end,blocked,used,c,endAnchor,edgeBad);if(!tail)return null;for(let k=1;k<tail.length;k++){if(used.has(tail[k])&&tail[k]!==end)return null;path.push(tail[k]);used.add(tail[k])}return path.length>=5?path:null}
function joinAngleOKRangeCfg(p,i,j,route,c){if(!route.length)return false;const first=mazePointCfg(route[0],c),last=mazePointCfg(route[route.length-1],c);if(i>0&&angle(p[i-1],p[i],first)<MIN_ANGLE)return false;if(j+1<p.length&&angle(last,p[j],p[j+1])<MIN_ANGLE)return false;return true}
function joinAngleOKRange(p,i,j,route){return joinAngleOKRangeCfg(p,i,j,route,DEFAULT_MAZE_CFG)}
function replaceRangeByRouteCfg(p,i,j,route,c){const mid=route.map(id=>mazePointCfg(id,c)),out=[...p.slice(0,i+1)];for(const q of mid)if(dist(out[out.length-1],q)>4)out.push(q);if(dist(out[out.length-1],p[j])>4)out.push(p[j]);out.push(...p.slice(j+1));return out}
function replaceRangeByRoute(p,i,j,route){return replaceRangeByRouteCfg(p,i,j,route,DEFAULT_MAZE_CFG)}
function spanFrontierScore(p,i,j,blocked,c){let free=0,arc=0;for(let k=i;k<j;k++)arc+=dist(p[k],p[k+1]);for(let id=0;id<c.total;id++){if(blocked.has(id))continue;const q=mazePointCfg(id,c);let d=1e9;for(let k=i;k<j;k++)d=Math.min(d,pointSeg(q,p[k],p[k+1]));if(d<c.step*2.2)free++}const chord=dist(p[i],p[j]);return free*4+Math.min(280,arc)*.55+Math.max(0,arc-chord)*.18}
function candidateSurgerySpansCfg(p,target,c,spanSet=SURGERY_SPANS,limit=MAZE_SPAN_LIMIT){const prot=protectedSegs(p,target),a=[];for(let i=0;i<p.length-1;i++){for(const span of spanSet){const j=i+span;if(j>=p.length)continue;if(rangeTouchesProtected(prot,i,j))continue;let arc=0;for(let k=i;k<j;k++)arc+=dist(p[k],p[k+1]);if(arc<48)continue;const blocked=blockedMazeNodesRangeCfg(p,i,j,c),score=spanFrontierScore(p,i,j,blocked,c);a.push({i,j,blocked,score})}}a.sort((x,y)=>y.score-x.score);return a.slice(0,limit)}
function candidateSurgerySpans(p,target){return candidateSurgerySpansCfg(p,target,DEFAULT_MAZE_CFG)}
function pathSignature(p){const z=mazeUseSet(p),ids=[...z].sort((a,b)=>a-b);let h=2166136261>>>0;for(const id of ids){h^=id;h=Math.imul(h,16777619)}h^=p.length;return h>>>0}
function frontierPotential(p){const used=mazeUseSet(p);let score=0;for(let id=0;id<DEFAULT_MAZE_CFG.total;id++){if(used.has(id))continue;let near=0,freeN=0;for(const n of mazeNeighborsCfg(id,DEFAULT_MAZE_CFG)){if(used.has(n))near++;else freeN++}if(near)score+=1+Math.min(2,freeN)*.35}return score}
function surgeryCandidatesGeneric(cur,target,r,depth,c,opt={}){const oldGrid=mazeUseSet(cur),oldCov=coverage(cur),oldLen=buildTrack(cur).length,spans=candidateSurgerySpansCfg(cur,target,c,opt.spans||SURGERY_SPANS,opt.spanLimit||MAZE_SPAN_LIMIT),cand=[],trials=opt.trials||MAZE_TRIALS,maxNodes=opt.maxNodes||10,maxChildren=opt.maxChildren||BEAM_CHILDREN;for(const sg of spans){const {i,j,blocked}=sg,starts=nearMazeNodesCfg(cur[i],blocked,c,maxNodes).filter(id=>!connectorHitsRestRange(cur[i],mazePointCfg(id,c),cur,i,j)),ends=nearMazeNodesCfg(cur[j],blocked,c,maxNodes).filter(id=>!connectorHitsRestRange(mazePointCfg(id,c),cur[j],cur,i,j)),edgeBad=(u,v)=>mazeEdgeHitsRestRangeCfg(u,v,cur,i,j,c);if(!starts.length||!ends.length)continue;for(let trial=0;trial<trials;trial++){const st=starts[Math.floor(r()*starts.length)],en=ends[Math.floor(r()*ends.length)];if(st===en)continue;const freeCount=c.total-blocked.size,hi=opt.hi??(depth<4?34:depth<9?28:22),lo=opt.lo??(depth<4?14:depth<9?10:6),desired=Math.min(Math.floor(rand(r,lo,hi+1)),Math.max(4,freeCount-2)),route=longMazeRouteCfg(st,en,blocked,r,desired,cur[i],cur[j],edgeBad,c);if(!route||!joinAngleOKRangeCfg(cur,i,j,route,c))continue;const q=replaceRangeByRouteCfg(cur,i,j,route,c),v=validate(q,target,GEN_CLEAR);if(!v.ok)continue;const ng=mazeUseSet(q),nc=coverage(q),len=v.track.length;let gain=0,lost=0;for(const id of ng)if(!oldGrid.has(id))gain++;for(const id of oldGrid)if(!ng.has(id))lost++;const netGrid=ng.size-oldGrid.size,netCov=nc-oldCov,lenGain=len-oldLen;if(gain<(opt.gainMin??2)||netGrid<(opt.netGridMin??1)||netCov<(opt.netCovMin??-.025)||lenGain<(opt.lenGainMin??20))continue;const future=frontierPotential(q),localScore=netGrid*(opt.gridWeight??16)+gain*(opt.gainWeight??5)+netCov*(opt.covWeight??900)+Math.min(10,Math.max(-10,lenGain)/100)*(opt.lenWeight??1)+future*(opt.futureWeight??.28)-lost*(opt.lostWeight??2.5)+route.length*(opt.routeWeight??.18)+(opt.globalBonus??0)+(j-i)*(opt.spanWeight??0)+r()*.05;cand.push({points:q,coverage:nc,gridUse:ng.size,gridGain:netGrid,entered:gain,lost,lenGain,routeNodes:route.length,future,localScore,kind:`${opt.kindPrefix||'surgery'}-${j-i}`,span:j-i})}}cand.sort((a,b)=>b.localScore-a.localScore);const out=[],seen=new Set();for(const c0 of cand){const sig=pathSignature(c0.points);if(seen.has(sig))continue;seen.add(sig);out.push(c0);if(out.length>=maxChildren)break}return out}
function surgeryCandidates(cur,target,r,depth,maxChildren=BEAM_CHILDREN,opt={}){return surgeryCandidatesGeneric(cur,target,r,depth,DEFAULT_MAZE_CFG,{...opt,maxChildren,kindPrefix:'surgery'})}
function canonicalMazeCycleCoords(cols,rows){
  // Hamiltonian cycle for an even number of rows. It snakes through every
  // column except column 0, then returns up column 0.
  if(rows%2!==0||cols<2||rows<2)return[];
  const a=[{x:0,y:0}];
  for(let x=1;x<cols;x++)a.push({x,y:0});
  for(let y=1;y<rows;y++){
    if(y%2){for(let x=cols-1;x>=1;x--)a.push({x,y})}
    else{for(let x=1;x<cols;x++)a.push({x,y})}
  }
  a.push({x:0,y:rows-1});
  for(let y=rows-2;y>=1;y--)a.push({x:0,y});
  return a
}
function mazeCycleVariants(c){
  const out=[];
  function add(coords){
    const ids=coords.map(q=>mazeIdCfg(q.x,q.y,c));
    const sig=ids.join(',');
    if(!out.some(x=>x.sig===sig))out.push({ids,sig})
  }
  const base=canonicalMazeCycleCoords(c.cols,c.rows);
  if(base.length){
    add(base);
    add(base.map(q=>({x:c.cols-1-q.x,y:q.y})));
    add(base.map(q=>({x:q.x,y:c.rows-1-q.y})));
    add(base.map(q=>({x:c.cols-1-q.x,y:c.rows-1-q.y})));
  }
  // A transposed construction gives a genuinely different weave when the
  // original number of columns is even.
  const tr=canonicalMazeCycleCoords(c.rows,c.cols);
  if(tr.length){
    const mapped=tr.map(q=>({x:q.y,y:q.x}));
    add(mapped);
    add(mapped.map(q=>({x:c.cols-1-q.x,y:q.y})));
    add(mapped.map(q=>({x:q.x,y:c.rows-1-q.y})));
    add(mapped.map(q=>({x:c.cols-1-q.x,y:c.rows-1-q.y})));
  }
  return out
}
function cycleArc(ids,ia,ib,dir){
  const n=ids.length,out=[];
  let k=ia;
  for(let guard=0;guard<=n;guard++){
    out.push(ids[k]);
    if(k===ib)return out;
    k=(k+dir+n)%n
  }
  return[]
}
function nearestCycleIndices(anchor,ids,c,count=8){
  const a=ids.map((id,i)=>({i,d:dist(anchor,mazePointCfg(id,c))}));
  a.sort((x,y)=>x.d-y.d);return a.slice(0,count).map(x=>x.i)
}
function hasLargeEmptyPocket(p){const z=freeRegions(p);return !!(z.length&&z[0].size>=18)}
function wholePathRescueCandidates(cur,target,r,minNetGrid=4,maxTrials=30){
  // Last-resort topology reset for zero-crossing bases that cannot make even
  // one normal surgery. The old base interior is NOT treated as a wall here:
  // only SPAWN and BASE are kept as anchors, and a long self-avoiding maze route
  // is rebuilt across the board. This is what actually solves rectangular
  // spirals / nested U layouts with sealed interior pockets.
  if(target!==0||cur.length<2)return[];
  const c=DEFAULT_MAZE_CFG,oldGrid=mazeUseSet(cur),oldCov=coverage(cur),oldLen=buildTrack(cur).length;
  const blocked=new Set(),startAnchor=cur[0],endAnchor=cur[cur.length-1];
  const starts=nearMazeNodesCfg(startAnchor,blocked,c,12),ends=nearMazeNodesCfg(endAnchor,blocked,c,12);
  if(!starts.length||!ends.length)return[];

  const cand=[];
  for(let trial=0;trial<maxTrials;trial++){
    const st=starts[Math.floor(r()*starts.length)],en=ends[Math.floor(r()*ends.length)];
    if(st===en)continue;

    // Aim for a board-scale path. longMazeRouteCfg keeps a valid route to BASE
    // while greedily consuming unused cells, so the resulting path may finish
    // earlier than desired but remains a single self-avoiding route.
    const desired=Math.floor(rand(r,70,126));
    const route=longMazeRouteCfg(st,en,blocked,r,desired,startAnchor,endAnchor,null,c);
    if(!route)continue;

    const q=replaceRangeByRouteCfg(cur,0,cur.length-1,route,c);
    const v=validate(q,target,GEN_CLEAR);
    if(!v.ok)continue;

    const ng=mazeUseSet(q),nc=coverage(q),len=v.track.length;
    let gain=0,lost=0;
    for(const id of ng)if(!oldGrid.has(id))gain++;
    for(const id of oldGrid)if(!ng.has(id))lost++;
    const netGrid=ng.size-oldGrid.size,netCov=nc-oldCov,lenGain=len-oldLen;

    // Grid occupancy is the primary criterion for this rescue. Rectangular
    // spirals can already score deceptively high on the broad coverage metric
    // while using very few planning cells, so requiring coverage to increase
    // would reproduce the v0.10 failure.
    if(netGrid<minNetGrid)continue;
    const future=frontierPotential(q);
    const localScore=ng.size*24+nc*1100+future*.30+route.length*.20-lost*.35+r()*.02;
    cand.push({
      points:q,coverage:nc,gridUse:ng.size,gridGain:netGrid,entered:gain,lost,
      lenGain,routeNodes:route.length,future,localScore,
      kind:'whole-rescue-random',span:cur.length-1
    })
  }

  cand.sort((a,b)=>b.localScore-a.localScore);
  const out=[],seen=new Set();
  for(const q of cand){
    const sig=pathSignature(q.points);
    if(seen.has(sig))continue;
    seen.add(sig);out.push(q);
    if(out.length>=BEAM_CHILDREN+1)break
  }
  return out
}

function fallbackSurgeryCandidates(cur,target,r,depth,allowWhole=true){
  // The original sealed-pocket case is still fastest to solve by a full reset.
  if(depth===0&&target===0&&allowWhole&&hasLargeEmptyPocket(cur)){
    let kids=wholePathRescueCandidates(cur,target,r,4,30);
    if(kids.length)return{kids,mode:'whole-rescue'}
  }

  let kids=surgeryCandidatesGeneric(cur,target,r,depth,mazeCfg(48),{
    kindPrefix:'fine48',trials:10,spanLimit:20,maxNodes:12,maxChildren:BEAM_CHILDREN,
    lo:depth<4?18:12,hi:depth<4?40:28,gainMin:2,netGridMin:1,netCovMin:-.04,
    lenGainMin:0,routeWeight:.16,futureWeight:.32
  });
  if(kids.length)return{kids,mode:'fine48'};

  kids=surgeryCandidatesGeneric(cur,target,r,depth,mazeCfg(48),{
    kindPrefix:'global48',spans:[6,8,10,12,16,20,24,28],spanLimit:20,trials:14,
    maxNodes:14,maxChildren:BEAM_CHILDREN+1,lo:20,hi:52,gainMin:1,netGridMin:1,
    netCovMin:-.08,lenGainMin:-60,routeWeight:.16,futureWeight:.36,spanWeight:.6,
    globalBonus:10
  });
  if(kids.length)return{kids,mode:'global48'};

  // New in v0.12: Rescue is no longer a depth-0-only escape hatch. If a
  // lineage has become locally saturated but a large contiguous empty pocket
  // still remains, rebuild the zero-crossing route and put the result back
  // into the beam. A lineage may do this at most twice.
  if(target===0&&allowWhole&&hasLargeEmptyPocket(cur)){
    kids=wholePathRescueCandidates(cur,target,r,depth===0?4:2,depth===0?30:22);
    if(kids.length)return{kids,mode:'whole-rescue'}
  }

  return{kids:[],mode:'none'}
}
function extentMetrics(p){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const q of p){minX=Math.min(minX,q.x);maxX=Math.max(maxX,q.x);minY=Math.min(minY,q.y);maxY=Math.max(maxY,q.y)}const x=clamp((maxX-minX)/(B.r-B.l),0,1),y=clamp((maxY-minY)/(B.b-B.t),0,1);return{x,y,min:Math.min(x,y),area:x*y}}
function decorateGenerationState(s){s.length=buildTrack(s.points).length;s.extent=extentMetrics(s.points);return s}
function generationCost(s,opt){const minLen=opt.targetLength-opt.lengthTolerance,maxLen=opt.targetLength+opt.lengthTolerance,under=Math.max(0,minLen-s.length),over=Math.max(0,s.length-maxLen),reachMiss=Math.max(0,opt.minScreenReach-s.extent.min),center=Math.abs(s.length-opt.targetLength);return reachMiss*9+(under+over)/Math.max(1,opt.targetLength)*4+center/Math.max(1,opt.targetLength)*.22-s.coverage*.05}
function stateScore(s,opt){return-generationCost(s,opt)*10000+s.gridUse*1.5+s.future*.08}
function betterTarget(a,b,opt){if(!b)return true;const ca=generationCost(a,opt),cb=generationCost(b,opt);if(Math.abs(ca-cb)>.0001)return ca<cb;if(Math.abs(a.coverage-b.coverage)>.002)return a.coverage>b.coverage;return a.gridUse>b.gridUse}
function generationGoalsMet(s,opt){return s.length>=opt.targetLength-opt.lengthTolerance&&s.length<=opt.targetLength+opt.lengthTolerance&&s.extent.min>=opt.minScreenReach}
function densifyFull(base,target,r,opt){
  const root=decorateGenerationState({points:copy(base),coverage:coverage(base),gridUse:mazeUseSet(base).size,future:frontierPotential(base),depth:0,parent:null,kind:'base',span:0,rescueCount:0});
  root.searchScore=stateScore(root,opt);
  const depthLimit=clamp(Math.floor(opt.maxDensifyDepth??MAX_DENSIFY_DEPTH),1,MAX_DENSIFY_DEPTH);
  const beamWidth=clamp(Math.floor(opt.maxBeamWidth??BEAM_WIDTH),1,BEAM_WIDTH),beamChildren=clamp(Math.floor(opt.maxBeamChildren??BEAM_CHILDREN),1,BEAM_CHILDREN);
  let beam=[root],best=root,expanded=0,stale=0,stop='target search',fallbackHits=0,rescueHits=0;
  if(generationGoalsMet(root,opt))stop='base meets targets';
  for(let depth=0;depth<depthLimit;depth++){
    if(generationGoalsMet(best,opt)){stop='length and reach targets met';break}
    const pool=[],seen=new Set();
    for(const state of beam){
      const remaining=Math.max(MAZE_STEP*4,opt.targetLength+opt.lengthTolerance-state.length),nodeBudget=clamp(Math.ceil(remaining/MAZE_STEP),5,30),hi=clamp(nodeBudget+4,8,34),lo=clamp(Math.round(nodeBudget*.42),4,Math.max(4,hi-2));
      let kids=surgeryCandidates(state.points,target,r,depth,beamChildren,{lo,hi,lenGainMin:0,trials:opt.trialsPerSpan??MAZE_TRIALS,spanLimit:opt.spanLimit??MAZE_SPAN_LIMIT}),fallbackMode='none';
      if(!kids.length&&!opt.disableFallback){
        const fb=fallbackSurgeryCandidates(state.points,target,r,depth,(state.rescueCount||0)<1);
        kids=fb.kids;fallbackMode=fb.mode;
        if(kids.length){fallbackHits++;if(fallbackMode==='whole-rescue')rescueHits++}
      }
      expanded+=kids.length;
      for(const k of kids){
        const child=decorateGenerationState({...k,depth:depth+1,parent:state,rescueCount:(state.rescueCount||0)+(fallbackMode==='whole-rescue'?1:0)});
        child.searchScore=stateScore(child,opt)+(fallbackMode==='none'?0:1.25);
        const sig=pathSignature(child.points);
        if(seen.has(sig))continue;
        seen.add(sig);pool.push(child)
      }
    }
    if(!pool.length){stop=fallbackHits?'no legal surgery after fallback':'no legal surgery';break}
    pool.sort((a,b)=>b.searchScore-a.searchScore);beam=pool.slice(0,beamWidth);
    let improved=false;
    for(const q of beam)if(betterTarget(q,best,opt)){best=q;improved=true}
    if(improved)stale=0;else stale++;
    if(stale>=BEAM_PATIENCE){stop='beam plateau';break}
    if(depth===depthLimit-1)stop=depthLimit<MAX_DENSIFY_DEPTH?'random attempt cap':'depth cap'
  }
  const lineage=[];for(let q=best;q;q=q.parent)lineage.push(q);lineage.reverse();
  return{best,history:lineage,coverage:best.coverage,gridUse:best.gridUse,stop,expanded,depth:best.depth,fallbackHits,rescueHits,options:{...opt},lengthTargetMet:best.length>=opt.targetLength-opt.lengthTolerance&&best.length<=opt.targetLength+opt.lengthTolerance,screenReachMet:best.extent.min>=opt.minScreenReach}
}

// ----- v0.8 extended-strength simplification -----
// Densification above is intentionally unchanged.
//
// The simplifier has two priorities:
//   1) REFIT: remove local waypoint noise while retaining the local footprint.
//   2) SHORTCUT: only when refit cannot clean the tier, remove a detour.
//
// In addition, every accepted operation must stay inside a CUMULATIVE budget
// measured from the original saturated path. This prevents a sequence of
// individually-small shortcuts from silently deleting a major protrusion.

function polylineLength(p){
  let z=0;
  for(let i=0;i<p.length-1;i++)z+=dist(p[i],p[i+1]);
  return z
}

function shortcutVariants(p,i,j){
  const a=p[i],b=p[j],vars=[];
  vars.push({points:[...p.slice(0,i+1),...p.slice(j)],kind:'shortcut-direct'});
  for(const e of [P(b.x,a.y),P(a.x,b.y)]){
    if(dist(a,e)<10||dist(e,b)<10)continue;
    vars.push({points:[...p.slice(0,i+1),e,...p.slice(j)],kind:'shortcut-elbow'})
  }
  return vars
}

function localShapeStats(p,i,j){
  let arc=0,turn=0,minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9,maxDev=0;
  const a=p[i],b=p[j];

  for(let k=i;k<j;k++)arc+=dist(p[k],p[k+1]);
  for(let k=i+1;k<j;k++)turn+=Math.max(0,180-angle(p[k-1],p[k],p[k+1]));

  let peakIndex=-1,peakDev=-1;
  for(let k=i;k<=j;k++){
    const q=p[k],d=lineDist(q,a,b);
    minX=Math.min(minX,q.x);maxX=Math.max(maxX,q.x);
    minY=Math.min(minY,q.y);maxY=Math.max(maxY,q.y);
    maxDev=Math.max(maxDev,d);
    if(k>i&&k<j&&d>peakDev){peakDev=d;peakIndex=k}
  }

  const chord=dist(a,b);
  const wiggle=Math.max(0,arc-chord);
  const bboxDiag=Math.hypot(maxX-minX,maxY-minY);
  const turnDensity=turn/Math.max(1,arc/MAZE_STEP);
  const inefficiency=wiggle/Math.max(1,arc);

  return{
    arc,chord,wiggle,turn,maxDev,bboxDiag,turnDensity,inefficiency,
    span:j-i,peakIndex
  }
}

function refitVariants(p,i,j,shape){
  const a=p[i],b=p[j],vars=[];
  if(shape.span<3)return vars;

  // Peak refit: retain the point that carries the largest local protrusion.
  // This tends to preserve the large silhouette while removing stair-step noise.
  if(shape.peakIndex>i&&shape.peakIndex<j){
    const peak=p[shape.peakIndex];
    const q=[...p.slice(0,i+1),peak,...p.slice(j)];
    vars.push({points:q,kind:'refit-peak'})
  }

  // Two-anchor refit: retain representative anchors from each half.
  // Use the farthest-from-chord point in each half, in original path order.
  if(shape.span>=5){
    let k1=-1,d1=-1,k2=-1,d2=-1;
    const mid=Math.floor((i+j)/2);
    for(let k=i+1;k<=mid;k++){
      const d=lineDist(p[k],a,b);
      if(d>d1){d1=d;k1=k}
    }
    for(let k=mid+1;k<j;k++){
      const d=lineDist(p[k],a,b);
      if(d>d2){d2=d;k2=k}
    }
    if(k1>i&&k2>k1&&k2<j){
      const q=[...p.slice(0,i+1),p[k1],p[k2],...p.slice(j)];
      vars.push({points:q,kind:'refit-two'})
    }
  }

  return vars
}

// Scale tiers. "max*" values are per-operation geometric limits.
// CUMULATIVE preservation is handled separately by simplifyBudget().
const SIMPLIFY_TIERS=[
  {
    name:'micro',
    maxSpan:5,maxArc:330,maxDev:88,maxBox:245,
    minNoise:.18,minTurnDensity:72
  },
  {
    name:'local',
    maxSpan:8,maxArc:520,maxDev:145,maxBox:390,
    minNoise:.14,minTurnDensity:52
  },
  {
    name:'medium',
    maxSpan:12,maxArc:820,maxDev:230,maxBox:600,
    minNoise:.10,minTurnDensity:34
  },
  {
    name:'macro',
    maxSpan:18,maxArc:1600,maxDev:520,maxBox:1120,
    minNoise:.065,minTurnDensity:22
  }
];

// Cumulative preservation budget from the ORIGINAL saturated path.
// The budgets are deliberately strict through the first half of simplification.
// This is what protects broad protrusions while local noise is being cleaned.
//
// stageFrac is based on the planned simplification step (0..1), not on a
// particular candidate. Values between knots are linearly interpolated.
function simplifyBudget(strength){
  const knots=[
    // 0–100: conservative v0.8 style
    {s:0,minLen:.995,minGrid:.995,minCov:.995},
    {s:20,minLen:.970,minGrid:.970,minCov:.975},
    {s:40,minLen:.940,minGrid:.940,minCov:.950},
    {s:60,minLen:.880,minGrid:.890,minCov:.900},
    {s:80,minLen:.760,minGrid:.780,minCov:.820},
    {s:100,minLen:.620,minGrid:.650,minCov:.700},
    // 100–200: same priority order, looser preservation budget
    {s:125,minLen:.560,minGrid:.595,minCov:.650},
    {s:150,minLen:.500,minGrid:.535,minCov:.595},
    {s:175,minLen:.420,minGrid:.465,minCov:.520},
    {s:200,minLen:.340,minGrid:.395,minCov:.445}
  ];
  const x=clamp(strength,0,200);
  for(let i=0;i<knots.length-1;i++){
    const a=knots[i],b=knots[i+1];
    if(x<=b.s){
      const t=(x-a.s)/(b.s-a.s||1);
      return{
        minLen:lerp(a.minLen,b.minLen,t),
        minGrid:lerp(a.minGrid,b.minGrid,t),
        minCov:lerp(a.minCov,b.minCov,t)
      }
    }
  }
  return knots[knots.length-1]
}

function tierAccepts(shape,tier){
  if(
    shape.span>tier.maxSpan||
    shape.arc>tier.maxArc||
    shape.maxDev>tier.maxDev||
    shape.bboxDiag>tier.maxBox
  )return false;

  return(
    shape.inefficiency>=tier.minNoise||
    shape.turnDensity>=tier.minTurnDensity
  )
}

function candidateGlobalStats(newP,base){
  const len=polylineLength(newP);
  const cov=coverage(newP);
  const grid=mazeUseSet(newP);
  return{
    len,cov,grid,
    lenRatio:len/base.len,
    gridRatio:grid.size/base.grid.size,
    covRatio:cov/base.cov
  }
}

function withinCumulativeBudget(g,budget){
  return(
    g.lenRatio+1e-9>=budget.minLen&&
    g.gridRatio+1e-9>=budget.minGrid&&
    g.covRatio+1e-9>=budget.minCov
  )
}

function candidateNoiseBenefit(oldShape,newP,i,newEndIndex){
  // Estimate turn-density reduction on the replacement itself.
  // Even when indices change, the score remains stable enough to distinguish
  // a footprint-preserving refit from a large route deletion.
  if(newEndIndex<=i+1)return oldShape.turnDensity;
  const s=localShapeStats(newP,i,newEndIndex);
  return Math.max(0,oldShape.turnDensity-s.turnDensity)
}

function collectTierCandidates(p,target,tierIndex,base,budget,mode){
  const tier=SIMPLIFY_TIERS[tierIndex],prot=protectedSegs(p,target),raw=[];

  for(let i=0;i<p.length-2;i++){
    for(let span=2;span<=tier.maxSpan;span++){
      const j=i+span;
      if(j>=p.length||rangeTouchesProtected(prot,i,j))continue;

      const shape=localShapeStats(p,i,j);
      if(!tierAccepts(shape,tier))continue;

      // Small spatial scale + high direction-change density goes first.
      const noise=
        shape.turnDensity*.78+
        shape.inefficiency*165+
        shape.turn*.040;
      const scalePenalty=
        shape.arc*.038+
        shape.maxDev*.090+
        shape.bboxDiag*.020;

      raw.push({i,j,shape,pre:noise-scalePenalty})
    }
  }

  raw.sort((a,b)=>b.pre-a.pre);
  let best=null;

  for(const c of raw.slice(0,SIMPLIFY_TEST_LIMIT)){
    const variants=mode==='refit'
      ? refitVariants(p,c.i,c.j,c.shape)
      : shortcutVariants(p,c.i,c.j);

    for(const variant of variants){
      const q=variant.points,v=validate(q,target,GEN_CLEAR);
      if(!v.ok)continue;

      const g=candidateGlobalStats(q,base);
      if(!withinCumulativeBudget(g,budget))continue;

      const removed=p.length-q.length;
      if(removed<1)continue;

      const currentLen=polylineLength(p);
      const lengthLoss=Math.max(0,currentLen-g.len);
      const cumulativeLenLoss=Math.max(0,base.len-g.len);
      const cumulativeGridLoss=Math.max(0,base.grid.size-g.grid.size);
      const cumulativeCovLoss=Math.max(0,base.cov-g.cov);

      // Find the new index corresponding to old j. Since replacement removes
      // interior points, it becomes i + number of retained interior anchors + 1.
      const retainedInterior=
        variant.kind==='refit-two'?2:
        variant.kind==='refit-peak'?1:
        variant.kind==='shortcut-elbow'?1:0;
      const newJ=c.i+retainedInterior+1;
      const noiseBenefit=candidateNoiseBenefit(c.shape,q,c.i,newJ);

      // v0.8 key change:
      // - REFIT receives a large priority bonus.
      // - shortening is a PENALTY, especially at micro/local scale.
      // - cumulative footprint loss is also penalized even if still within budget.
      const lengthPenalty=
        tierIndex===0?.150:
        tierIndex===1?.115:
        tierIndex===2?.060:.028;

      const footprintPenalty=
        cumulativeGridLoss*1.9+
        cumulativeCovLoss*150+
        cumulativeLenLoss*.012;

      const score=
        c.shape.turnDensity*.72+
        c.shape.inefficiency*150+
        noiseBenefit*1.15+
        removed*.45-
        lengthLoss*lengthPenalty-
        footprintPenalty-
        c.shape.arc*.010-
        c.shape.maxDev*.018+
        (mode==='refit'?32:0);

      if(!best||score>best.score){
        best={
          points:q,
          score,
          kind:variant.kind,
          tier:tierIndex,
          tierName:tier.name,
          removed,
          localArc:c.shape.arc,
          localDev:c.shape.maxDev,
          turnDensity:c.shape.turnDensity,
          lengthLoss,
          len:g.len,cov:g.cov,gridUse:g.grid.size,
          lenRatio:g.lenRatio,
          gridRatio:g.gridRatio,
          covRatio:g.covRatio,
          budget
        }
      }
    }
  }

  return best
}

function bestSimplificationAtTier(p,target,tierIndex,base,budget){
  // Strict operation ordering inside each scale:
  // 1) footprint-preserving refit
  // 2) only if no legal refit exists, shortcut
  const refit=collectTierCandidates(p,target,tierIndex,base,budget,'refit');
  if(refit)return refit;
  return collectTierCandidates(p,target,tierIndex,base,budget,'shortcut')
}

function simplifyFull(saturated,target,maxStrength=200){
  const base={
    len:polylineLength(saturated),
    cov:coverage(saturated),
    grid:mazeUseSet(saturated)
  };

  const history=[{
    points:copy(saturated),
    coverage:base.cov,
    gridUse:base.grid.size,
    length:base.len,
    lengthRatio:1,gridRatio:1,covRatio:1,
    kind:'saturated',
    tier:-1,tierName:'none',
    removed:0,
    strength:0
  }];

  let cur=copy(saturated),stop='simplified',tierCursor=0;

  for(let step=0;step<MAX_SIMPLIFY_STEPS;step++){
    let best=null;

    // Budget grows gradually. Early steps are intentionally unable to delete
    // a large protrusion even when that deletion is locally legal.
    const strength=(step+1)*(200/MAX_SIMPLIFY_STEPS);
    if(strength>maxStrength+1e-9){stop='requested strength cap';break}
    const budget=simplifyBudget(strength);

    // Strict scale ordering. A successful larger change resets the search to
    // MICRO because it may expose new local noise.
    for(let t=tierCursor;t<SIMPLIFY_TIERS.length;t++){
      best=bestSimplificationAtTier(cur,target,t,base,budget);
      if(best){
        tierCursor=0;
        break
      }
      tierCursor=t+1
    }

    if(!best){
      // If current budget is too tight, do not permanently give up: the next
      // simplification stage has a looser cumulative budget. Advance the stage
      // but keep geometry unchanged by recording no-op only internally.
      // To keep the user-facing history meaningful, search the next few budget
      // levels immediately and only append an actual geometry change.
      let foundLater=null;
      for(let look=step+1;look<MAX_SIMPLIFY_STEPS;look++){
        const laterStrength=(look+1)*(200/MAX_SIMPLIFY_STEPS);
        if(laterStrength>maxStrength+1e-9)break;
          const laterBudget=simplifyBudget(laterStrength);
        for(let t=0;t<SIMPLIFY_TIERS.length;t++){
          foundLater=bestSimplificationAtTier(cur,target,t,base,laterBudget);
          if(foundLater)break
        }
        if(foundLater){
          best=foundLater;
          step=look; // consume the skipped budget stages
          break
        }
      }
    }

    if(!best){
      stop='no legal budgeted simplification';
      break
    }

    cur=best.points;
    history.push({
      points:copy(cur),
      coverage:best.cov,
      gridUse:best.gridUse,
      length:best.len,
      lengthRatio:best.lenRatio,
      gridRatio:best.gridRatio,
      covRatio:best.covRatio,
      kind:best.kind,
      tier:best.tier,
      tierName:best.tierName,
      removed:best.removed,
      lengthLoss:best.lengthLoss,
      strength:(step+1)*(200/MAX_SIMPLIFY_STEPS)
    })
  }

  if(history.length-1>=MAX_SIMPLIFY_STEPS)stop='simplify cap';
  return{history,stop,base}
}

// ----- Always-smooth finishing. Large radius first; shrink only if legality requires it. -----
function roundPath(p,scale){if(p.length<3)return copy(p);const out=[{...p[0]}];for(let i=1;i<p.length-1;i++){const a=p[i-1],b=p[i],c=p[i+1],turn=180-angle(a,b,c);if(turn<2){out.push({...b});continue}const d1=dist(a,b),d2=dist(b,c);let cut=Math.min(86*scale,Math.min(d1,d2)*.43*scale);cut=Math.max(4,cut);if(cut>=d1*.49||cut>=d2*.49)cut=Math.min(d1,d2)*.46;const p0=P(b.x+(a.x-b.x)*cut/d1,b.y+(a.y-b.y)*cut/d1),p2=P(b.x+(c.x-b.x)*cut/d2,b.y+(c.y-b.y)*cut/d2);if(dist(out[out.length-1],p0)>1)out.push(p0);const steps=Math.max(6,Math.ceil(cut/8));for(let k=1;k<=steps;k++){const t=k/steps,u=1-t;out.push(P(u*u*p0.x+2*u*t*b.x+t*t*p2.x,u*u*p0.y+2*u*t*b.y+t*t*p2.y))}}out.push({...p[p.length-1]});return out}
function denseSample(p){const out=[{...p[0]}];for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],n=Math.max(1,Math.ceil(dist(a,b)/7));for(let k=1;k<=n;k++)out.push(P(lerp(a.x,b.x,k/n),lerp(a.y,b.y,k/n)))}return out}
function finalPath(p,target){for(const s of [1,.84,.70,.58,.46,.35,.26,.18,.12,.08,.05,.03]){const q=denseSample(roundPath(p,s)),v=validate(q,target,FINAL_CLEAR);if(v.ok)return{points:q,roundScale:s}}const q=denseSample(p);return{points:q,roundScale:0}}

// ----- Metrics: significant turns use a track-distance window, not individual sampled vertices. -----
function lineDist(p,a,b){const vx=b.x-a.x,vy=b.y-a.y,d=vx*vx+vy*vy||1,t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/d,0,1);return Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t))}
function dirAngle(v){return Math.atan2(v.y,v.x)}
function angleDiff(a,b){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d}
function turnMetrics(t){let total=0;const step=22;let prev=dirAngle(tangent(t,0));for(let s=step;s<=t.length;s+=step){const now=dirAngle(tangent(t,s)),d=Math.abs(angleDiff(prev,now))*180/Math.PI;total+=d;prev=now}let sig=0,inTurn=false,lastCenter=-1e9;const window=52,scan=26;for(let s=window;s<t.length-window;s+=scan){const a=dirAngle(tangent(t,s-window)),b=dirAngle(tangent(t,s+window)),d=Math.abs(angleDiff(a,b))*180/Math.PI;const hot=d>=30;if(hot&&!inTurn&&s-lastCenter>70){sig++;lastCenter=s}inTurn=hot}return{turn:total,sig}}
function metrics(p){const t=buildTrack(p),a=p[0],b=p[p.length-1],direct=Math.max(1,dist(a,b));let maxDev=0,minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;for(const q of p){maxDev=Math.max(maxDev,lineDist(q,a,b));minX=Math.min(minX,q.x);maxX=Math.max(maxX,q.x);minY=Math.min(minY,q.y);maxY=Math.max(maxY,q.y)}const tm=turnMetrics(t),bbox=((maxX-minX)*(maxY-minY))/((B.r-B.l)*(B.b-B.t)),stretch=t.length/direct,cov=coverage(p),score=Math.round(100*(.32*clamp((stretch-1)/3.2,0,1)+.25*clamp(tm.turn/900,0,1)+.18*clamp(maxDev/330,0,1)+.15*clamp(bbox/.72,0,1)+.10*clamp(cov/.75,0,1)));return{length:t.length,stretch,turn:tm.turn,sig:tm.sig,maxDev,bbox,cov,score}}
function verticalRatio(t){let v=0,all=0;for(let i=1;i<t.pts.length;i++){const a=t.pts[i-1],b=t.pts[i],dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y),d=Math.hypot(dx,dy);if(d<.1)continue;all+=d;if(dy>dx*2.14)v+=d}return all?v/all:0}
function distTrack(t,p){let m=1e9;for(let i=1;i<t.pts.length;i++)m=Math.min(m,pointSeg(p,t.pts[i-1],t.pts[i]));return m}
function obstacles(t,n,seed){const r=rng32(hash32(seed^0xB51F23A9)),o=[];let tries=0;while(o.length<n&&tries++<500){const type=r()<.55?'circle':'rect',x=rand(r,95,W-95),y=rand(r,88,SAFE_TRACK_BOTTOM-55),rr=rand(r,22,37),w=rand(r,48,84),h=rand(r,36,68),e=type==='circle'?rr:Math.hypot(w,h)*.42;if(distTrack(t,P(x,y))<e+BALL_R+18)continue;if(o.some(q=>Math.hypot(q.x-x,q.y-y)<e+(q.r||Math.hypot(q.w,q.h)*.42)+22))continue;o.push(type==='circle'?{type,x,y,r:rr}:{type,x,y,w,h})}return o}

function verticalFlipPoint(p){return P(p.x,B.t+B.b-p.y)}
function verticalFlipPath(p){return p.map(verticalFlipPoint)}
function verticalFlipObstacle(o){return {...o,y:B.t+B.b-o.y}}
function resolveVerticalFlip(seed,mode,salt=0){if(mode==='on')return true;if(mode==='off')return false;const r=rng32(hash32(seed^0x4F1BBCDC^hash32(salt+1)));return r()<.5}
function applySimplifyTo(s,amount,obstacleCount){
  if(!s||s.failed)return s;
  const h=s.simplifyFull.history;let idx=0;for(let i=1;i<h.length;i++){if((h[i].strength??0)<=amount+1e-9)idx=i;else break}
  s.simplifyIndex=idx;s.simplified=copy(h[idx].points);
  const fp=finalPath(s.simplified,s.crossTarget);s.finalRaw=copy(fp.points);s.roundScale=fp.roundScale;
  const rawTrack=buildTrack(s.finalRaw),rawObs=obstacles(rawTrack,obstacleCount,s.seed);
  s.final=s.verticalFlip?verticalFlipPath(s.finalRaw):copy(s.finalRaw);
  s.finalTrack=buildTrack(s.final);s.finalCross=crossings(s.finalTrack);s.metrics=metrics(s.final);s.vertical=verticalRatio(s.finalTrack);
  s.obs=s.verticalFlip?rawObs.map(verticalFlipObstacle):rawObs;
  s.simplifyStrength=amount;s.obstacleCount=obstacleCount;
  return s
}
function applySimplify(){if(!stage||stage.failed)return;applySimplifyTo(stage,+$('simplify').value,+$('obstacles').value)}
function generationSettingsFromUI(){return{targetLength:+$('targetLength').value,lengthTolerance:+$('lengthTolerance').value,minScreenReach:+$('screenReach').value/100}}
function createStage(seed,type,{simplifyStrength=72,obstacleCount=0,verticalFlip=false,verticalFlipMode='random',targetLength=6000,lengthTolerance=800,minScreenReach=.82,maxDensifyDepth=MAX_DENSIFY_DEPTH,maxSimplifyStrength=200,maxBeamWidth=BEAM_WIDTH,maxBeamChildren=BEAM_CHILDREN,trialsPerSpan=MAZE_TRIALS,spanLimit=MAZE_SPAN_LIMIT,disableFallback=false}={}){
  seed=(seed||1)>>>0;if(!seed)seed=1;
  const paramR=rng32(hash32(seed^0xC8013EA4^hash32(TYPES.indexOf(type)+1))),target=crossTarget(type),base=makeBase(type,paramR),vb=validate(base,target,GEN_CLEAR);
  if(!vb.ok)return{failed:true,seed,type,why:`Base invalid: ${vb.why}`,verticalFlip,verticalFlipMode};
  const generationOptions={targetLength,lengthTolerance,minScreenReach,maxDensifyDepth,maxBeamWidth,maxBeamChildren,trialsPerSpan,spanLimit,disableFallback},depthR=rng32(hash32(seed^0x91E10DA5^hash32(target+101))),crossUpperFirst=Array.from({length:target},()=>depthR()<.5),baseTopology=crossingTopology(vb.cross),densifyR=rng32(hash32(seed^0xD15EA5E5^hash32(TYPES.indexOf(type)+17))),full=densifyFull(base,target,densifyR,generationOptions),saturated=copy(full.best.points),sf=simplifyFull(saturated,target,maxSimplifyStrength);
  const s={seed,type,crossTarget:target,base,baseV:vb,baseTopology,crossUpperFirst,full,saturated,simplifyFull:sf,verticalFlip:!!verticalFlip,verticalFlipMode,generationOptions};
  applySimplifyTo(s,simplifyStrength,obstacleCount);
  const vv=validate(s.final,target,FINAL_CLEAR);if(!vv.ok)return{failed:true,seed,type,why:`Final invalid: ${vv.why}`,verticalFlip,verticalFlipMode};
  return s
}
function resolvedStageSpecCrossings(s=stage){
  const c=s.finalCross||[];
  const info=crossingOrderInfo(c);
  return info.ranked.map((q,rank)=>{
    const x=c[q.index],firstS=q.first,secondS=q.second;
    const upperFirst=!!s.crossUpperFirst?.[rank];
    const upperS=upperFirst?firstS:secondS;
    const lowerS=upperFirst?secondS:firstS;
    return{
      id:String.fromCharCode(65+rank),
      x:x.x,y:x.y,
      s1:x.s1,s2:x.s2,
      firstS,secondS,upperS,lowerS,
      upperVisit:upperFirst?'first':'second'
    }
  })
}
function stageSpecObject(s=stage,meta={}){
  if(!s||s.failed)throw new Error('No valid generated stage to export.');
  const m=metrics(s.final),sat=s.full.best;
  const simplifyStrength=s.simplifyStrength??+$('simplify').value;
  const obstacleCount=s.obs?.length||0;
  const generationOptions=s.generationOptions||generationSettingsFromUI();
  const flipSuffix=s.verticalFlip?'-vf':'';
  const stageId=`${s.type}-${s.seed}-l${generationOptions.targetLength}-r${Math.round(generationOptions.minScreenReach*100)}-s${simplifyStrength}-o${obstacleCount}${flipSuffix}`;
  const source={
    generator:'Marble Stage Generator Lab',
    generatorVersion:GENERATOR_VERSION,
    seed:s.seed,
    family:s.type,
    familyLabel:LABEL[s.type],
    targetTrackLength:generationOptions.targetLength,
    trackLengthTolerance:generationOptions.lengthTolerance,
    minimumScreenReach:generationOptions.minScreenReach,
    simplifyStrength,
    verticalFlip:!!s.verticalFlip,
    verticalFlipMode:s.verticalFlipMode||'off',
    topology:crossingTopology(s.finalCross),
    depthSequence:crossingDepthSequence(s.finalCross,s.crossUpperFirst)
  };
  if(meta.batchIndex!=null)source.batchIndex=meta.batchIndex;
  if(meta.familyCycle!=null)source.familyCycle=meta.familyCycle;
  if(meta.batchStartSeed!=null)source.batchStartSeed=meta.batchStartSeed;
  return{
    format:'marble-popper-stage',
    schemaVersion:2,
    stageId,
    source:{...source,generationConstraints:{shooterReservedTopY:SAFE_TRACK_BOTTOM,minTrackClearance:FINAL_CLEAR,targetTrackLength:generationOptions.targetLength,trackLengthTolerance:generationOptions.lengthTolerance,minimumScreenReach:generationOptions.minScreenReach}},
    coordinateSystem:{width:W,height:H},
    compatibility:{ruleset:'marble-popper-core-v1',marbleRadius:BALL_R,marbleSpacing:BALL_SPACING,maxCrossings:2},
    geometry:{
      pathEncoding:'absolute-dense-points-v1',
      path:s.final.map(q=>({x:q.x,y:q.y})),
      trackLength:s.finalTrack.length,
      crossings:resolvedStageSpecCrossings(s),
      obstacles:(s.obs||[]).map(o=>({...o}))
    },
    metrics:{
      coverage:m.cov,
      length:m.length,
      stretch:m.stretch,
      totalTurnDegrees:m.turn,
      significantTurns:m.sig,
      meanderScore:m.score,
      bboxUsage:m.bbox,
      saturatedGridUsed:sat.gridUse,
      saturatedGridTotal:MAZE_TOTAL,
      saturatedCoverage:sat.coverage,
      generatedLength:sat.length,
      generatedReachX:sat.extent.x,
      generatedReachY:sat.extent.y,
      lengthTargetMet:!!s.full.lengthTargetMet,
      screenReachTargetMet:!!s.full.screenReachMet,
      densifyDepth:s.full.depth,
      fallbackHits:s.full.fallbackHits||0,
      wholeRescueHits:s.full.rescueHits||0
    }
  }
}
root.MarbleStageGeneratorCoreV19={
  GENERATOR_VERSION,TYPES:[...TYPES],LABEL:{...LABEL},
  createStage,stageSpecObject,resolveVerticalFlip,metrics,extentMetrics,
  validate,crossTarget,crossingTopology,crossingDepthSequence
};
})(typeof window!=='undefined'?window:globalThis);
