// GLSL for the peroxisome.
//
// A glossy liquid drop. The body is one sphere, pushed by slow noise into
// a soft organic outline. Inside, deep colour swirls slowly (domain-warped
// noise in the organelle's own space, so it turns with it); a thick glowing
// rim, a darker band just inside it and a bright caustic near the bottom
// give it the look of a lit drop of coloured liquid.
// Intro controls: uReveal pixelates it into place tile by tile, and uDecay
// darkens it and knocks the tiles loose again.

// Simplex noise by Ian McEwan / Ashima Arts (MIT licence).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// The wobbling silhouette.
const SHAPE = /* glsl */ `
uniform float uTime;
uniform float uWobble;

float bump(vec3 p){
  float slow = snoise(p * 0.8 + vec3(0.0, uTime * 0.08, uTime * 0.05)) * 0.75;
  float fine = snoise(p * 1.6 + vec3(uTime * 0.07, 0.0, -uTime * 0.04)) * 0.1;
  return (slow + fine) * uWobble;
}
vec3 shape(vec3 n){ return n * (1.0 + bump(n)); }

// Displaces a unit-sphere vertex and rebuilds its normal from two neighbours.
void shaped(in vec3 unit, out vec3 pos, out vec3 nrm){
  vec3 axis = abs(unit.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t = normalize(cross(axis, unit));
  vec3 b = cross(unit, t);
  float e = 0.035;
  pos = shape(unit);
  vec3 p1 = shape(normalize(unit + t * e));
  vec3 p2 = shape(normalize(unit + b * e));
  nrm = normalize(cross(p1 - pos, p2 - pos));
  nrm *= sign(dot(nrm, unit));
}
`;

export const bodyVertex = /* glsl */ `
${NOISE}
${SHAPE}
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPosO;

void main(){
  vec3 pos; vec3 nrm;
  shaped(normalize(position), pos, nrm);
  vPosO = pos;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = -mv.xyz;
  vNormal = normalMatrix * nrm;
  gl_Position = projectionMatrix * mv;
}
`;

export const bodyFragment = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uEnergy;   // 0 at rest, rises on hover and on each pulse
uniform float uReveal;   // intro: 0 = no tiles yet, 1 = whole drop
uniform float uDecay;    // intro: 0 = healthy, 1 = breaking apart
uniform vec3 uTint;      // mid body colour
uniform vec3 uRimA;      // outermost rim light
uniform vec3 uRimB;      // rim glow and caustic tint
uniform vec3 uCoreA;     // brightest swirls
uniform vec3 uCoreB;     // main colour
uniform vec3 uCoreC;     // deepest colour
uniform vec3 uCamO;      // camera position in the organelle's own space

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPosO;

const float CELLS = 6.5;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float edge = 1.0 - ndv;

  // Slow swirls of colour inside, warped so they flow like liquid.
  float t = uTime * 0.05;
  vec3 p = vPosO * 0.6;
  vec3 w = vec3(snoise(p + vec3(0.0, t, 0.0)), snoise(p + vec3(5.2, 1.3, t)), snoise(p + vec3(t, 9.1, 2.7)));
  float n1 = snoise(p * 0.9 + w * 0.9 + vec3(t)) * 0.5 + 0.5;
  float n2 = snoise(p * 1.3 + w * 0.6 - vec3(t * 1.3)) * 0.5 + 0.5;
  vec3 col = mix(uCoreC, uCoreB, smoothstep(0.2, 0.75, n1));
  col = mix(col, uTint, smoothstep(0.5, 0.85, n2) * 0.55);
  col = mix(col, uCoreA, smoothstep(0.62, 0.92, n1 * 0.55 + n2 * 0.5) * 0.6);

  // Lit from the lower right, as in a studio shot of a drop.
  float lit = dot(N, normalize(vec3(0.35, -0.35, 0.87))) * 0.5 + 0.5;
  col *= 0.7 + 0.5 * lit + 0.15 * uEnergy;

  // A darker band just inside the rim, then a thick glowing rim.
  float band = smoothstep(0.22, 0.4, edge) * (1.0 - smoothstep(0.42, 0.55, edge));
  col *= 1.0 - 0.35 * band;
  // A softer glow towards the edge, with no hard white line.
  vec3 rimCol = mix(uRimB, uRimA, smoothstep(0.75, 1.0, edge) * 0.35);
  col = mix(col, rimCol, smoothstep(0.45, 0.9, edge) * (0.55 + 0.1 * uEnergy));

  // A bright caustic pooled near the bottom, and a soft highlight up top.
  // (a small one, set inside the rim like the reference)
  float caus = smoothstep(0.962, 0.99, dot(N, normalize(vec3(-0.05, -0.62, 0.78))));
  col = mix(col, mix(uRimB, uRimA, 0.3), caus * 0.8);
  col = mix(col, uCoreB * 0.7, smoothstep(0.986, 0.998, dot(N, normalize(vec3(-0.05, -0.62, 0.78)))) * 0.7);

  // Intro tiles: the drop arrives, and breaks up, as a grid of tiles.
  vec3 ro = vPosO;
  vec3 rd = normalize(vPosO - uCamO);
  vec2 q = (ro + rd * (-ro.z / min(rd.z, -0.05))).xy;
  vec2 g = q * CELLS;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  float h2 = hash(id + 17.3);
  float dist = length((id + 0.5) / CELLS);
  float th = 0.08 + 0.5 * clamp(dist, 0.0, 1.0) + 0.32 * h;
  float lp = clamp((uReveal - th * 0.9) / 0.12, 0.0, 1.0);
  lp = lp * lp * (3.0 - 2.0 * lp);
  float slip = uDecay * (0.25 + 0.75 * h2);
  f += (vec2(h, h2) - 0.5) * 0.45 * slip;
  // Tiles grow past their cell once in place, so the whole drop is seamless.
  float size = mix(0.15, 0.62, lp) * (1.0 - 0.3 * slip);
  float box = max(abs(f.x), abs(f.y));
  float aa = fwidth(box) * 1.2 + 1e-4;
  float tile = 1.0 - smoothstep(size - aa, size + aa, box);
  float lost = step(1.0 - uDecay * 0.5, h2);
  float dark = step(h, uDecay * 0.42) * uDecay;
  col = mix(col, uCoreC * 0.35, dark * 0.85);
  col *= 1.0 - 0.25 * uDecay;

  // Fine grain.
  col += (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.03;

  // Fade out over the outer part of the drop so it melts into the page.
  float alpha = (1.0 - smoothstep(0.55, 0.98, edge)) * tile * lp * (1.0 - lost);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
  #include <colorspace_fragment>
}
`;
