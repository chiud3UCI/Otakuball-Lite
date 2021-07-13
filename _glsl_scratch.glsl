//Edit the shader code here and then copy and paste into media.js


//Gradient Shader
#define PI 3.14159265359

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

vec3 colorA = vec3(0.149,0.141,0.912);
vec3 colorB = vec3(1.000,0.833,0.224);

float plot (vec2 st, float pct){
  return  smoothstep( pct-0.01, pct, st.y) -
		  smoothstep( pct, pct+0.01, st.y);
}

void main(void){
	vec2 st = gl_FragCoord.xy/u_resolution.xy;
	vec3 color = vec3(0.0);

	vec3 pct = vec3(st.x);

	// pct.r = smoothstep(0.0,1.0, st.x);
	// pct.g = sin(st.x*PI);
	// pct.b = pow(st.x,0.5);

	color = mix(colorA, colorB, pct);

	// Plot transition lines for each channel
	color = mix(color,vec3(1.0,0.0,0.0),plot(st,pct.r));
	color = mix(color,vec3(0.0,1.0,0.0),plot(st,pct.g));
	color = mix(color,vec3(0.0,0.0,1.0),plot(st,pct.b));

	gl_FragColor = vec4(color,1.0);
}


//Gradient Shader v2
uniform float width;
uniform float xpos;

uniform vec3 color0;
uniform vec3 color1;

void main(void){
	//smoothstep clamps arg[2] to between arg[0] and arg[1]
	//using an easing function and then scales the result
	//to range [0.0, 1.0]
	float val = smoothstep(0.0, 1.0, (gl_FragCoord.x - xpos) / width);
	vec3 color = mix(color0, color1, vec3(val));
	gl_FragColor = vec4(color, 1.0);
}