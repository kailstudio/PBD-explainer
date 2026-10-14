// GLSL for the peroxisome.
//
// A milky membrane around a glowing core. The body is one sphere, rippled by
// slow noise into a soft, wavy outline. It is drawn part-transparent over a
// blurred disc (see .peroxisome-frost), so the page shows through it.
// The core is not a second mesh: each pixel fires a ray into the body and
// works out where it would meet a sphere in the middle. That gives real
// parallax when the organelle tilts. A lattice of fine dots is laid over the
// membrane and bends with it.

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
  float slow = snoise(p * 1.05 + vec3(0.0, uTime * 0.11, uTime * 0.07)) * 0.55;
  float fine = snoise(p * 3.1 + vec3(uTime * 0.09, 0.0, -uTime * 0.05)) * 0.3;
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
uniform float uReveal;   // intro: 0 = not formed yet, 1 = whole
uniform float uDecay;    // intro: 0 = healthy, 1 = breaking apart
uniform vec3 uTint;      // the milky membrane
uniform vec3 uRimA;      // bright rim
uniform vec3 uRimB;      // shadow in the membrane's folds
uniform vec3 uCoreA;     // core: brightest side
uniform vec3 uCoreB;     // core: main colour
uniform vec3 uCoreC;     // core: deepest point
uniform vec3 uCamO;      // camera position in the organelle's own space

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPosO;

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  vec3 L = normalize(vec3(-0.5, 0.7, 0.55));
  vec3 H = normalize(L + V);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float edge = 1.0 - ndv;
  float wrap = dot(N, L) * 0.5 + 0.5;

  // The core: where would this pixel's ray meet a sphere in the middle?
  vec3 ro = vPosO;
  vec3 rd = normalize(vPosO - uCamO);
  float drift = uTime * 0.12;
  vec3 cc = vec3(0.03 + 0.04 * sin(drift), -0.07 + 0.03 * cos(drift * 0.8), 0.02);
  float R = 0.6 + 0.02 * uEnergy;
  vec3 oc = cc - ro;
  float t = dot(oc, rd);
  float d2 = max(dot(oc, oc) - t * t, 0.0);
  float inside = d2 / (R * R);
  float coreMask = (1.0 - smoothstep(0.72, 1.0, inside)) * smoothstep(-0.2, 0.3, t);
  vec3 hit = ro + rd * (t - sqrt(max(R * R - d2, 0.0)));
  vec3 cn = normalize(hit - cc);
  float lit = dot(cn, normalize(vec3(0.55, 0.65, 0.5))) * 0.5 + 0.5;
  float centre = 1.0 - inside;
  vec3 core = mix(uCoreB, uCoreA, smoothstep(0.55, 0.95, lit));
  core = mix(core, uCoreC, clamp(smoothstep(0.45, 0.05, lit) * 0.75 + smoothstep(0.3, 1.0, centre) * smoothstep(0.7, 0.3, lit) * 0.6, 0.0, 1.0));

  // Decay: the core dims and dark, necrotic patches spread across it.
  float rot = snoise(cn * 2.6 + 3.0) * 0.5 + 0.5;
  float patches = smoothstep(0.62 - 0.35 * uDecay, 0.78 - 0.35 * uDecay, rot) * uDecay;
  core *= 1.0 - 0.3 * uDecay;
  core = mix(core, vec3(0.12, 0.08, 0.09), patches * 0.85);

  // The membrane: milky white with soft folds catching the light.
  float fold = snoise(vPosO * 1.6 + vec3(0.0, uTime * 0.05, 0.0)) * 0.5 + 0.5;
  float sheen = snoise(vPosO * 2.4 - vec3(uTime * 0.04, 0.0, 0.0)) * 0.5 + 0.5;
  vec3 membrane = mix(uRimB, uTint, 0.5 + 0.5 * fold);
  membrane = mix(membrane, vec3(1.0), smoothstep(0.62, 0.95, sheen) * 0.55);
  membrane *= 0.95 + 0.08 * wrap;

  // The core shows through the membrane, veiled more towards the edge.
  float veil = 0.08 + 0.4 * smoothstep(0.4, 1.0, edge);
  vec3 col = mix(membrane, core, coreMask * (1.0 - veil));

  // Decay: the membrane breaks up into holes with dark cracked edges, so
  // the core shows through bare where it has gone.
  float shell = snoise(vPosO * 2.1 + 11.0) * 0.5 + 0.5;
  float gone = uDecay * 1.15 - 0.05;
  float intact = smoothstep(gone - 0.03, gone + 0.03, shell);
  float crack = (1.0 - smoothstep(0.0, 0.035, abs(shell - gone))) * step(0.02, uDecay);
  col = mix(core, col, intact);
  col = mix(col, uCoreC * 0.55, crack * 0.7);

  // Bright rim and a soft highlight.
  col = mix(col, uRimA, pow(edge, 3.2) * (0.8 + 0.2 * uEnergy));
  col += vec3(1.0) * pow(max(dot(N, H), 0.0), 36.0) * 0.22;

  // A lattice of fine dots, laid over the membrane so it bends with it.
  vec2 cell = fract(vPosO.xy * 26.0) - 0.5;
  float dd = length(cell);
  float aa = fwidth(dd) + 1e-4;
  float radius = mix(0.1, 0.15, coreMask);
  float dotMark = 1.0 - smoothstep(radius - aa, radius + aa, dd);
  float dotShow = (0.55 + 0.45 * coreMask) * (1.0 - smoothstep(0.6, 0.95, edge));
  col = mix(col, vec3(1.0), dotMark * dotShow * 0.92);

  // Fine grain.
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.035;

  float alpha = mix(0.8, 0.97, pow(edge, 1.5)) + coreMask * 0.2;
  alpha = mix(coreMask * 0.98, alpha, intact);
  alpha = max(alpha, crack * 0.8);

  // Reveal: the body fills in in soft patches, as if condensing.
  float grain2 = snoise(vPosO * 3.2 - 5.0) * 0.5 + 0.5;
  float formed = smoothstep(grain2 - 0.12, grain2 + 0.12, uReveal * 1.3 - 0.15);
  alpha *= formed;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  #include <colorspace_fragment>
}
`;
