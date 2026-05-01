(function(){
  if(document.getElementById('__karou_hamster__')) return;

  // ─── HOST（fixed位置、透過） ──────────────────────────
  const host = document.createElement('div');
  host.id = '__karou_hamster__';
  Object.assign(host.style, {
    position:'fixed', bottom:'24px', right:'24px',
    zIndex:'2147483647', pointerEvents:'auto',
  });
  (document.body || document.documentElement).appendChild(host);

  // ─── SHADOW DOM ───────────────────────────────────────
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `
<style>
*{margin:0;padding:0;box-sizing:border-box}
#container{
  position:relative;
  cursor:grab;
  user-select:none;
  -webkit-user-select:none;
  font-family:'Courier New',monospace;
}
#container.dragging{cursor:grabbing}
#wrap{position:relative;width:220px;height:300px}
#wrap svg{position:absolute;top:0;left:0;overflow:visible}
#info-panel{
  display:none;
  position:absolute;
  bottom:calc(100% + 8px);
  left:50%;
  transform:translateX(-50%);
  white-space:nowrap;
  background:rgba(20,20,36,.86);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.12);
  border-radius:14px;
  padding:14px 20px;
  text-align:center;
}
#info-panel.open{display:block}
#tdisp{
  font-size:1.7rem;font-weight:bold;
  color:rgba(255,255,255,.88);
  letter-spacing:.06em;margin-bottom:5px;
}
#recovery{font-size:.72rem;color:rgba(255,255,255,.48);letter-spacing:.02em}
</style>
<div id="container">
  <div id="info-panel">
    <div id="tdisp">00:00:00</div>
    <div id="recovery">－</div>
  </div>
  <div id="wrap"></div>
</div>`;

  const $ = id => root.getElementById(id);
  const container = $('container');
  const panel     = $('info-panel');
  const wrap      = $('wrap');
  const tdisp     = $('tdisp');
  const recovery  = $('recovery');

  // ─── STAGE CONFIG ─────────────────────────────────────
  const ST=[
    {n:'眠り',          lim:1800,     spd:'1.4s'},
    {n:'元気',          lim:5400,     spd:'0.5s'},
    {n:'ハイテンション', lim:10800,    spd:'0.3s'},
    {n:'しんどい',       lim:18000,    spd:'0.65s'},
    {n:'バキバキ',       lim:28800,    spd:'0.8s'},
    {n:'昇天 ✦',        lim:Infinity, spd:'1.0s'},
  ];
  const MAX_SEC=28800;
  function getStage(s){for(let i=0;i<ST.length;i++) if(s<ST[i].lim) return i; return ST.length-1;}

  // ─── SVG PARTS ────────────────────────────────────────
  const LEGS=`<path d="M 58 238 Q 42 250 40 265 Q 39 274 52 272 Q 67 269 70 254 Q 72 241 62 236" fill="#c8c0b8" stroke="#333" stroke-width="3.5" stroke-linecap="round"/><path d="M 142 238 Q 158 250 160 265 Q 161 274 148 272 Q 133 269 130 254 Q 128 241 138 236" fill="#c8c0b8" stroke="#333" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="52" cy="268" rx="10" ry="6" fill="#f0b0b8" opacity=".8" transform="rotate(-8,52,268)"/><ellipse cx="148" cy="268" rx="10" ry="6" fill="#f0b0b8" opacity=".8" transform="rotate(8,148,268)"/>`;
  const BODY=`<path d="M 44 165 Q 24 182 22 210 Q 20 238 34 254 Q 50 270 100 272 Q 150 270 166 254 Q 180 238 178 210 Q 176 182 156 165 Q 136 148 100 146 Q 64 148 44 165" fill="#a8a09a" stroke="#333" stroke-width="4"/><path d="M 62 174 Q 50 194 50 214 Q 50 240 64 254 Q 78 265 100 266 Q 122 265 136 254 Q 150 240 150 214 Q 150 194 138 174 Q 124 159 100 157 Q 76 159 62 174" fill="#f0ede8"/><path d="M 100 148 Q 99 178 99 210 Q 99 238 100 270" stroke="#2a2820" stroke-width="6" stroke-linecap="round"/><path d="M 46 178 Q 36 205 40 232" stroke="#807870" stroke-width="10" stroke-linecap="round" opacity=".35"/><path d="M 154 178 Q 164 205 160 232" stroke="#807870" stroke-width="10" stroke-linecap="round" opacity=".35"/><path d="M 170 244 Q 188 240 190 232 Q 190 224 180 226 Q 170 230 170 244" fill="#c8c0b8" stroke="#333" stroke-width="2"/>`;
  const EARS=`<path d="M 62 68 Q 57 55 68 52 Q 76 50 78 62" stroke="#333" stroke-width="3.5" fill="#b0a8a0"/><path d="M 64 67 Q 60 57 68 55 Q 74 53 75 63" fill="#f0a8b0" opacity=".7"/><path d="M 138 68 Q 143 55 132 52 Q 124 50 122 62" stroke="#333" stroke-width="3.5" fill="#b0a8a0"/><path d="M 136 67 Q 140 57 132 55 Q 126 53 125 63" fill="#f0a8b0" opacity=".7"/>`;
  const HEAD=`<path d="M 54 72 Q 34 78 30 96 Q 24 118 26 138 Q 28 158 40 167 Q 55 177 76 180 Q 88 182 100 182 Q 112 182 124 180 Q 145 177 160 167 Q 172 158 174 138 Q 176 116 170 96 Q 166 78 146 72 Q 128 56 100 54 Q 72 56 54 72" fill="#a8a09a" stroke="#333" stroke-width="4.2"/><path d="M 100 56 Q 99 80 99 110 Q 99 140 100 170" stroke="#2a2820" stroke-width="5" stroke-linecap="round" opacity=".7"/><path d="M 72 60 Q 74 78 100 80 Q 126 78 128 60 Q 116 50 100 49 Q 84 50 72 60" fill="#d0c8c0" opacity=".5"/><path d="M 28 128 Q 16 116 22 136 Q 26 152 46 142 Q 48 130 28 128" fill="#e8e4de"/><path d="M 172 128 Q 184 116 178 136 Q 174 152 154 142 Q 152 130 172 128" fill="#e8e4de"/>`;
  const NOSE_TEETH=`<path d="M 95 132 Q 100 127 105 132 Q 103 138 100 139 Q 97 138 95 132" fill="#e88898"/><path d="M 86 142 Q 92 150 100 151 Q 108 150 114 142" stroke="#333" stroke-width="3" stroke-linecap="round"/><rect x="90" y="142" width="9" height="12" rx="2" fill="white" stroke="#333" stroke-width="2"/><rect x="101" y="142" width="9" height="12" rx="2" fill="white" stroke="#333" stroke-width="2"/>`;
  const EYE_OPEN=`<circle cx="74" cy="110" r="11" fill="#111"/><circle cx="78" cy="106" r="3.5" fill="white" opacity=".8"/><circle cx="126" cy="110" r="11" fill="#111"/><circle cx="130" cy="106" r="3.5" fill="white" opacity=".8"/>`;
  const EYE_HALF=`<circle cx="74" cy="110" r="11" fill="#111"/><circle cx="78" cy="109" r="3" fill="white" opacity=".6"/><rect x="62" y="99" width="24" height="12" fill="#a8a09a"/><circle cx="126" cy="110" r="11" fill="#111"/><circle cx="130" cy="109" r="3" fill="white" opacity=".6"/><rect x="114" y="99" width="24" height="12" fill="#a8a09a"/>`;
  const EYE_WRECK=`<circle cx="74" cy="110" r="11" fill="white" stroke="#b82020" stroke-width="1.5"/><path d="M74,110 m4,0 a4,4 0 1,0 -8,0 a6,6 0 1,0 12,0 a9,9 0 1,0 -18,0" fill="none" stroke="#b82020" stroke-width="1.5" stroke-linecap="round"/><circle cx="126" cy="110" r="11" fill="white" stroke="#333" stroke-width="1.5"/><circle cx="126" cy="110" r="5" fill="#b82020" opacity=".6"/><line x1="116" y1="103" x2="121" y2="108" stroke="#b82020" stroke-width="1.2"/><line x1="136" y1="103" x2="131" y2="108" stroke="#b82020" stroke-width="1.2"/><line x1="116" y1="117" x2="121" y2="112" stroke="#b82020" stroke-width="1.2"/><line x1="136" y1="117" x2="131" y2="112" stroke="#b82020" stroke-width="1.2"/>`;
  const EYE_X=`<line x1="66" y1="102" x2="82" y2="118" stroke="#222" stroke-width="4" stroke-linecap="round"/><line x1="82" y1="102" x2="66" y2="118" stroke="#222" stroke-width="4" stroke-linecap="round"/><line x1="118" y1="102" x2="134" y2="118" stroke="#222" stroke-width="4" stroke-linecap="round"/><line x1="134" y1="102" x2="118" y2="118" stroke="#222" stroke-width="4" stroke-linecap="round"/>`;
  const ARMS_A=`<path d="M 50 188 Q 30 172 24 156 Q 20 144 32 147" stroke="#333" stroke-width="4" stroke-linecap="round"/><path d="M 32 147 Q 20 140 20 153 Q 20 164 32 161" stroke="#333" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="23" cy="154" rx="8" ry="6" fill="#f0a8b0" opacity=".7"/><path d="M 150 188 Q 170 200 176 215 Q 179 226 169 225" stroke="#333" stroke-width="4" stroke-linecap="round"/><path d="M 169 225 Q 181 228 181 217 Q 181 207 169 210" stroke="#333" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="176" cy="218" rx="8" ry="6" fill="#f0a8b0" opacity=".7"/>`;
  const ARMS_B=`<path d="M 50 188 Q 32 202 26 218 Q 23 228 34 226" stroke="#333" stroke-width="4" stroke-linecap="round"/><path d="M 34 226 Q 21 230 21 218 Q 21 208 34 211" stroke="#333" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="26" cy="219" rx="8" ry="6" fill="#f0a8b0" opacity=".7"/><path d="M 150 188 Q 168 174 174 158 Q 177 147 167 150" stroke="#333" stroke-width="4" stroke-linecap="round"/><path d="M 167 150 Q 179 144 180 156 Q 180 167 168 164" stroke="#333" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="175" cy="157" rx="8" ry="6" fill="#f0a8b0" opacity=".7"/>`;
  const SW1=`<path d="M 163 65 Q 166 57 169 65 Q 166 71 163 65" fill="#88ccff" opacity=".85"/>`;
  const SW3=`<path d="M 157 57 Q 160 49 163 57 Q 160 63 157 57" fill="#88ccff" opacity=".85"/><path d="M 170 76 Q 173 68 176 76 Q 173 82 170 76" fill="#88ccff" opacity=".85"/><path d="M 35 65 Q 38 57 41 65 Q 38 71 35 65" fill="#88ccff" opacity=".85"/>`;
  const SW_MANY=`<path d="M 153 52 Q 156 44 159 52 Q 156 58 153 52" fill="#88ccff" opacity=".9"/><path d="M 167 68 Q 170 60 173 68 Q 170 74 167 68" fill="#88ccff" opacity=".9"/><path d="M 180 88 Q 183 80 186 88 Q 183 94 180 88" fill="#88ccff" opacity=".9"/><path d="M 30 60 Q 33 52 36 60 Q 33 66 30 60" fill="#88ccff" opacity=".9"/><path d="M 16 82 Q 19 74 22 82 Q 19 88 16 82" fill="#88ccff" opacity=".9"/>`;
  const HI_A=`<ellipse cx="64" cy="121" rx="11" ry="8" fill="#ff4466" opacity=".32"/><ellipse cx="136" cy="121" rx="11" ry="8" fill="#ff4466" opacity=".32"/><text x="158" y="48" font-size="18" fill="#ffdd00" opacity=".95">★</text><text x="16" y="63" font-size="13" fill="#ff88cc" opacity=".9">★</text><text x="168" y="86" font-size="12" fill="#88ffee" opacity=".9">✦</text>${SW1}`;
  const HI_B=`<ellipse cx="64" cy="121" rx="11" ry="8" fill="#ff4466" opacity=".32"/><ellipse cx="136" cy="121" rx="11" ry="8" fill="#ff4466" opacity=".32"/><text x="162" y="53" font-size="13" fill="#ffdd00" opacity=".95">★</text><text x="13" y="68" font-size="18" fill="#ff88cc" opacity=".9">★</text><text x="165" y="80" font-size="16" fill="#88ffee" opacity=".9">✦</text>${SW1}`;
  const WRECK=`<ellipse cx="100" cy="120" rx="56" ry="48" fill="#ffee44" opacity=".1"/><path d="M 103 156 Q 107 172 105 182 Q 102 188 99 182 Q 97 170 101 158" fill="#44aaff" opacity=".85"/>${SW_MANY}`;
  const ASCEND_A=`<ellipse cx="100" cy="38" rx="30" ry="8" fill="none" stroke="#ffdd44" stroke-width="4" opacity=".9"/><g opacity=".42"><ellipse cx="100" cy="12" rx="15" ry="20" fill="white"/><ellipse cx="89" cy="28" rx="9" ry="12" fill="white"/><ellipse cx="111" cy="28" rx="9" ry="12" fill="white"/></g><circle cx="88" cy="160" r="5" fill="white" opacity=".8"/><circle cx="98" cy="165" r="4" fill="white" opacity=".72"/><circle cx="110" cy="161" r="3" fill="white" opacity=".65"/>${SW_MANY}`;
  const ASCEND_B=`<ellipse cx="100" cy="38" rx="30" ry="8" fill="none" stroke="#ffdd44" stroke-width="4" opacity=".9"/><g opacity=".42"><ellipse cx="100" cy="7" rx="15" ry="20" fill="white"/><ellipse cx="89" cy="23" rx="9" ry="12" fill="white"/><ellipse cx="111" cy="23" rx="9" ry="12" fill="white"/></g><circle cx="88" cy="160" r="5" fill="white" opacity=".8"/><circle cx="99" cy="166" r="3" fill="white" opacity=".72"/><circle cx="110" cy="161" r="4" fill="white" opacity=".65"/>${SW_MANY}`;
  const SLP_A=`<svg width="220" height="177" viewBox="0 0 220 175" fill="none" overflow="visible"><path d="M 36 110 Q 28 138 40 158 Q 58 174 110 175 Q 162 174 180 158 Q 192 138 184 110 Q 178 82 160 66 Q 140 50 110 48 Q 80 50 60 66 Q 42 82 36 110" fill="#a8a09a" stroke="#222" stroke-width="4" stroke-linejoin="round"/><path d="M 58 115 Q 52 136 58 152 Q 70 168 110 170 Q 150 168 162 152 Q 168 136 162 115 Q 154 96 110 92 Q 66 96 58 115" fill="#f0ede8"/><path d="M 110 50 Q 112 80 114 110 Q 116 138 114 168" stroke="#2a2820" stroke-width="5.5" stroke-linecap="round"/><path d="M 40 118 Q 34 140 40 158" stroke="#807870" stroke-width="10" stroke-linecap="round" opacity=".3"/><path d="M 180 118 Q 186 140 180 158" stroke="#807870" stroke-width="10" stroke-linecap="round" opacity=".3"/><path d="M 58 88 Q 44 92 40 104 Q 36 118 40 130 Q 46 142 60 146 Q 74 150 90 150 Q 104 150 118 148 Q 136 144 146 134 Q 154 124 152 110 Q 150 96 140 90 Q 126 78 100 76 Q 76 78 58 88" fill="#a8a09a" stroke="#222" stroke-width="3.8" stroke-linejoin="round"/><path d="M 100 78 Q 101 100 102 122 Q 103 138 102 148" stroke="#2a2820" stroke-width="4.5" stroke-linecap="round" opacity=".65"/><path d="M 66 88 Q 61 77 72 74 Q 80 72 82 83" stroke="#222" stroke-width="3.2" stroke-linejoin="round" fill="#b0a8a0"/><path d="M 68 87 Q 64 79 73 77 Q 79 75 80 84" fill="#f0a0b0" opacity=".65"/><path d="M 130 88 Q 136 77 124 74 Q 116 72 114 83" stroke="#222" stroke-width="3.2" stroke-linejoin="round" fill="#b0a8a0"/><path d="M 128 87 Q 132 79 123 77 Q 117 75 116 84" fill="#f0a0b0" opacity=".65"/><path d="M 78 110 Q 84 106 92 110" stroke="#222" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M 110 110 Q 116 106 124 110" stroke="#222" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M 96 120 Q 100 116 104 120 Q 102 125 100 125 Q 98 125 96 120" fill="#e08090"/><text x="152" y="70" font-size="16" fill="rgba(255,255,255,.5)" font-family="sans-serif" font-weight="bold">z</text><text x="164" y="54" font-size="20" fill="rgba(255,255,255,.45)" font-family="sans-serif" font-weight="bold">z</text><text x="178" y="34" font-size="25" fill="rgba(255,255,255,.4)" font-family="sans-serif" font-weight="bold">z</text><path d="M 168 158 Q 186 162 182 148 Q 178 138 166 144" fill="#e8e4de" stroke="#222" stroke-width="2"/></svg>`;
  const SLP_B=`<svg width="220" height="177" viewBox="0 0 220 175" fill="none" overflow="visible"><path d="M 34 112 Q 26 140 38 160 Q 56 176 110 177 Q 164 176 182 160 Q 194 140 186 112 Q 180 84 162 68 Q 142 52 110 50 Q 78 52 58 68 Q 40 84 34 112" fill="#a8a09a" stroke="#222" stroke-width="4"/><path d="M 56 117 Q 50 138 56 154 Q 68 170 110 172 Q 152 170 164 154 Q 170 138 164 117 Q 156 98 110 94 Q 64 98 56 117" fill="#f0ede8"/><path d="M 110 52 Q 112 82 114 112 Q 116 140 114 170" stroke="#2a2820" stroke-width="5.5" stroke-linecap="round"/><path d="M 38 120 Q 32 142 38 160" stroke="#807870" stroke-width="10" stroke-linecap="round" opacity=".3"/><path d="M 182 120 Q 188 142 182 160" stroke="#807870" stroke-width="10" stroke-linecap="round" opacity=".3"/><path d="M 57 90 Q 43 94 39 107 Q 35 121 39 133 Q 45 145 59 149 Q 73 153 89 153 Q 103 153 117 151 Q 135 147 145 137 Q 153 127 151 113 Q 149 99 139 93 Q 125 81 99 79 Q 75 81 57 90" fill="#a8a09a" stroke="#222" stroke-width="3.8"/><path d="M 99 81 Q 100 103 101 125 Q 102 141 101 151" stroke="#2a2820" stroke-width="4.5" stroke-linecap="round" opacity=".65"/><path d="M 65 90 Q 60 79 71 76 Q 79 74 81 85" stroke="#222" stroke-width="3.2" fill="#b0a8a0"/><path d="M 67 89 Q 63 81 72 79 Q 78 77 79 86" fill="#f0a0b0" opacity=".65"/><path d="M 129 90 Q 135 79 123 76 Q 115 74 113 85" stroke="#222" stroke-width="3.2" fill="#b0a8a0"/><path d="M 127 89 Q 131 81 121 79 Q 115 77 115 86" fill="#f0a0b0" opacity=".65"/><path d="M 77 112 Q 83 107 91 112" stroke="#222" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M 109 112 Q 115 107 123 112" stroke="#222" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M 95 122 Q 99 118 103 122 Q 101 127 99 127 Q 97 127 95 122" fill="#e08090"/><text x="154" y="68" font-size="16" fill="rgba(255,255,255,.5)" font-family="sans-serif" font-weight="bold">z</text><text x="167" y="51" font-size="20" fill="rgba(255,255,255,.45)" font-family="sans-serif" font-weight="bold">z</text><text x="182" y="30" font-size="25" fill="rgba(255,255,255,.4)" font-family="sans-serif" font-weight="bold">z</text><path d="M 168 160 Q 187 164 183 150 Q 179 140 167 146" fill="#e8e4de" stroke="#222" stroke-width="2"/></svg>`;

  function mkSVG(w,h,inner){return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" overflow="visible">${inner}</svg>`;}
  function stand(e,a,x=''){return mkSVG(200,300,LEGS+BODY+EARS+HEAD+e+NOSE_TEETH+a+x);}
  const FRAMES=[
    [SLP_A,SLP_B],
    [stand(EYE_OPEN,ARMS_A),         stand(EYE_OPEN,ARMS_B)],
    [stand(EYE_OPEN,ARMS_A,HI_A),    stand(EYE_OPEN,ARMS_B,HI_B)],
    [stand(EYE_HALF,ARMS_A,SW3),     stand(EYE_HALF,ARMS_B,SW3)],
    [stand(EYE_WRECK,ARMS_A,WRECK),  stand(EYE_WRECK,ARMS_B,WRECK)],
    [stand(EYE_X,ARMS_A,ASCEND_A),   stand(EYE_X,ARMS_B,ASCEND_B)],
  ];
  const DIM=[{w:220,h:177},{w:200,h:300},{w:200,h:300},{w:200,h:300},{w:200,h:300},{w:200,h:300}];

  // ─── FRAME TOGGLE ─────────────────────────────────────
  let frameTimer=null, frameIdx=0;
  const ABS='position:absolute;top:0;left:0;';
  function startFrameToggle(spd){
    clearInterval(frameTimer); frameIdx=0;
    const c=wrap.children;
    if(c[0]) c[0].setAttribute('style',ABS+'opacity:1');
    if(c[1]) c[1].setAttribute('style',ABS+'opacity:0');
    frameTimer=setInterval(()=>{
      frameIdx=1-frameIdx;
      const ch=wrap.children;
      if(ch[0]) ch[0].setAttribute('style',ABS+'opacity:'+(frameIdx===0?1:0));
      if(ch[1]) ch[1].setAttribute('style',ABS+'opacity:'+(frameIdx===1?1:0));
    }, spd*1000/2);
  }

  // ─── STATE ────────────────────────────────────────────
  let fatigue=0, sessionVisible=0, isActive=true;
  let lastTick=Date.now(), curStage=-1, saveTick=0;
  const sessionStart=Date.now();

  // ─── RENDER ───────────────────────────────────────────
  function render(si){
    if(si===curStage) return;
    curStage=si;
    const d=DIM[si], [fa,fb]=FRAMES[si];
    wrap.style.width=d.w+'px'; wrap.style.height=d.h+'px';
    wrap.innerHTML=fa+fb;
    startFrameToggle(parseFloat(ST[si].spd));
  }
  function fmt(s){
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=Math.floor(s%60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  // ─── TICK ─────────────────────────────────────────────
  function tick(){
    const now=Date.now(), dt=(now-lastTick)/1000;
    lastTick=now;
    const sessionAge=(now-sessionStart)/1000;
    if(isActive){ fatigue=Math.min(MAX_SEC,fatigue+dt); sessionVisible+=dt; }
    else          fatigue=Math.max(0,fatigue-dt);
    render(sessionAge<ST[0].lim ? 0 : getStage(fatigue));
    tdisp.textContent=fmt(sessionVisible);
    recovery.textContent=fatigue<=0
      ? '完全回復済み ✓'
      : `完全回復まで ${fmt(Math.ceil(fatigue))}`;
    saveTick++;
    if(saveTick%10===0){
      try{ chrome.storage.local.set({fatigue, lastTimestamp:Date.now(), isIdle:!isActive, sessionVisible}); }catch(e){}
    }
  }

  // ─── DRAG & CLICK ─────────────────────────────────────
  let isDragging=false, hasMoved=false, dragStartX, dragStartY, startLeft, startTop;

  container.addEventListener('mousedown', e=>{
    isDragging=true; hasMoved=false;
    dragStartX=e.clientX; dragStartY=e.clientY;
    const r=host.getBoundingClientRect();
    startLeft=r.left; startTop=r.top;
    host.style.right='auto'; host.style.bottom='auto';
    host.style.left=startLeft+'px'; host.style.top=startTop+'px';
    container.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e=>{
    if(!isDragging) return;
    const dx=e.clientX-dragStartX, dy=e.clientY-dragStartY;
    if(Math.abs(dx)>4||Math.abs(dy)>4) hasMoved=true;
    host.style.left=(startLeft+dx)+'px'; host.style.top=(startTop+dy)+'px';
  });
  document.addEventListener('mouseup', ()=>{
    if(!isDragging) return;
    isDragging=false;
    container.classList.remove('dragging');
    if(!hasMoved) panel.classList.toggle('open');
  });

  // ─── 他タブのストレージ変更を監視してリアルタイム同期 ──
  try{
    chrome.storage.onChanged.addListener((changes)=>{
      if(changes.isIdle)         isActive       = !changes.isIdle.newValue;
      if(changes.fatigue)        fatigue        = parseFloat(changes.fatigue.newValue)        || 0;
      if(changes.sessionVisible) sessionVisible = parseFloat(changes.sessionVisible.newValue) || 0;
    });
  }catch(e){}

  // ─── INIT（ストレージ読み込み後に初回描画） ──────────────
  try{
    chrome.storage.local.get(['fatigue','lastTimestamp','isIdle','sessionVisible'], d=>{
      if(chrome.runtime.lastError){ lastTick=Date.now(); tick(); setInterval(tick,1000); return; }
      const now=Date.now();
      const savedF=parseFloat(d.fatigue||0);
      const savedT=parseFloat(d.lastTimestamp||now);
      const wasIdle=d.isIdle??false;
      const offSec=Math.max(0,(now-savedT)/1000);
      fatigue        = wasIdle ? Math.max(0,savedF-offSec) : Math.min(MAX_SEC,savedF+offSec);
      const savedV   = parseFloat(d.sessionVisible||0);
      sessionVisible = wasIdle ? savedV : savedV+offSec;
      isActive       = !wasIdle;
      lastTick=Date.now();
      tick(); // 正しい疲労値で初回描画
      setInterval(tick,1000);
    });
  }catch(e){ lastTick=Date.now(); tick(); setInterval(tick,1000); }

})();
