// GLSL for the peroxisome.
//
// The body is one sphere, pushed around by slow noise so it never sits as a
// perfect ball. Shading is done by hand (soft wrap light + rim) rather than
// with a physically based material, which keeps it stylised and cheap.
// The glowing core is not a second mesh: each pixel fires a ray into the body
// and measures how close it passes to a few points inside. That gives real
// parallax when the organelle tilts towards the cursor.

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

// Shared by body and halo so the glow hugs the same silhouette.
const SHAPE = /* glsl */ `
uniform float uTime;
uniform float uWobble;

float bump(vec3 p){
  float slow = snoise(p * 1.05 + vec3(0.0, uTime * 0.11, uTime * 0.07)) * 0.62;
  float fine = snoise(p * 2.2 + vec3(uTime * 0.09, 0.0, -uTime * 0.05)) * 0.26;
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
uniform vec3 uDeep;      // shadow side
uniform vec3 uMid;       // lit side
uniform vec3 uGlow;      // rim + core
uniform vec3 uHot;       // brightest points
uniform vec3 uCamO;      // camera position in the organelle's own space

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPosO;

// How much light a ray picks up passing a soft point at c with radius r.
float blob(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = c - ro;
  float t = dot(oc, rd);
  float d2 = max(dot(oc, oc) - t * t, 0.0);
  return exp(-d2 / (r * r)) * smoothstep(0.0, 0.25, t);
}

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  vec3 L = normalize(vec3(-0.55, 0.62, 0.56));
  vec3 H = normalize(L + V);

  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float wrap = pow(dot(N, L) * 0.5 + 0.5, 2.4);
  float rim = pow(1.0 - ndv, 2.4);

  // Surface mottling lives in object space, so it turns with the organelle.
  float mott = snoise(vPosO * 2.6 + vec3(0.0, 0.0, uTime * 0.04)) * 0.5 + 0.5;
  float grain = snoise(vPosO * 11.0) * 0.5 + 0.5;

  vec3 col = mix(uDeep * 0.16, uMid, wrap);
  col *= 0.76 + 0.32 * mott;
  col *= 0.94 + 0.1 * grain;

  // Interior: one dense core, off-centre, and a few granules around it.
  vec3 ro = vPosO;
  vec3 rd = normalize(vPosO - uCamO);
  float drift = uTime * 0.25;
  float core = blob(ro, rd, vec3(0.13 + 0.03 * sin(drift), -0.06, 0.1 + 0.03 * cos(drift)), 0.38);
  float bits =
      blob(ro, rd, vec3(-0.40,  0.30,  0.22), 0.11)
    + blob(ro, rd, vec3( 0.30,  0.44, -0.24), 0.09)
    + blob(ro, rd, vec3(-0.16, -0.47,  0.30), 0.10)
    + blob(ro, rd, vec3( 0.50, -0.20, -0.12), 0.08)
    + blob(ro, rd, vec3(-0.52, -0.12, -0.20), 0.07);

  float lift = 1.0 + uEnergy;
  col += uGlow * core * (0.36 + 0.5 * uEnergy);
  col += uHot * pow(core, 3.0) * 0.3 * lift;
  col += uGlow * bits * 0.4 * lift;

  col += uGlow * rim * (0.26 + 0.74 * wrap) * (0.85 + 0.9 * uEnergy);
  col += uGlow * pow(max(dot(N, H), 0.0), 22.0) * 0.3;
  col *= 1.0 + 0.2 * uEnergy;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export const haloVertex = /* glsl */ `
${NOISE}
${SHAPE}
varying vec3 vNormal;
varying vec3 vView;

void main(){
  vec3 pos; vec3 nrm;
  shaped(normalize(position), pos, nrm);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = -mv.xyz;
  vNormal = normalMatrix * nrm;
  gl_Position = projectionMatrix * mv;
}
`;

// Drawn on the inside of a larger shell with add-only blending and zero alpha,
// so it lands on the page as pure light and never darkens what is behind it.
export const haloFragment = /* glsl */ `
uniform float uEnergy;
uniform vec3 uGlow;
varying vec3 vNormal;
varying vec3 vView;

void main(){
  float facing = clamp(-dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
  float glow = pow(facing, 3.2) * (0.5 + 0.9 * uEnergy);
  gl_FragColor = vec4(uGlow * glow, 0.0);
  #include <colorspace_fragment>
}
`;
