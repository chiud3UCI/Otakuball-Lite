//media handles the loading of assets(textures, sounds) as well
//as dividing spritesheet textures into individual sprite textures

var media = {
	textures: {
		//will retrieve texture from TextureCache
		//if key is not found in media
		__proto__: PIXI.utils.TextureCache,
	},
	animations: {},
	shaders: {},
};

// var sound = PIXI.sound;
// var soundQueue = {};

//limit the number of times the sound can be played at a time
//also prevent the same sound from playing multiple times
//	in a short time window
var maxSoundInstances = 3;
var minSoundInterval = 0.05; //in seconds
PIXI.sound.volumeAll = 0.15;

//stores all running sound instances
var sound_record = {
	//queue is an array of SoundWrappers
	queue: [],
	//playing is an object with keys being the sound name
	//and values being the array of SoundWrappers
	playing: {},
}

class SoundWrapper{
	constructor(name, loop, object){
		this.name = name;
		this.loop = !!loop;
		this.object = object;
		this.sound = PIXI.sound._sounds[name];
		this.instance = null;
	}

	get elapsedTime(){
		if (!this.instance)
			return 0;
		return this.instance.progress * this.sound.duration;
	}

	start(){
		let playing = sound_record.playing;
		let wrap = this;
		let instance = this.sound.play({
			loop: this.loop,
			complete(){
				playing[wrap.name].shift();
			}
		});
		this.instance = instance;
		playing[this.name].push(this);
	}

	stop(){
		this.instance.stop();
	}
}

//Doesn't play the sound immediately.
//Instead, it queues the sound so it gets played at
//the update loop (simlar to PlayState.emplace)
function playSound(name, loop=false, object=null){
	if (!name)
		return;
	if (sound_record.playing[name] === undefined){
		alert(`sound "${name}" does not exist`);
		return;
	}

	let queue = sound_record.queue;
	//get rid of duplicate sounds
	if (queue.some(wrap => wrap.name == name))
		return;
	queue.push(new SoundWrapper(name, loop, object));
}

//stops all queued and playing sounds
//if object is passed, then only stop sound wrappers
//	with specified object
//TODO: implement suppress, which will cancel incoming
//	sounds if no sounds have been stopped
function stopSound(name, suppress=false, object=null){
	if (!name)
		return;
	if (sound_record.playing[name] === undefined){
		alert(`sound "${name}" does not exist`);
		return;
	}

	//remove from sound queue
	let record = sound_record;
	if (object){
		remove_if(record.queue,
			wrap => wrap.name == name && wrap.object === object
		);
	}
	else{
		remove_if(record.queue,
			wrap => wrap.name == name
		);
	}

	//remove from currently playing sounds
	let play = record.playing[name];
	if (object){
		let removed = remove_if(play,
			wrap => wrap.object === object
		);
		for (let wrap of removed)
			wrap.stop();
	}
	else{
		while (play.length > 0)
			play.pop().stop();
	}
}

function playQueuedSounds(){
	let record = sound_record;

	for (let wrap of record.queue){
		let name = wrap.name;
		let playing = record.playing[name];
		if (playing === undefined)
			console.log("undefined: " + name);
		let n = playing.length;

		if (n > 0 && playing[n-1].elapsedTime <= minSoundInterval)
			continue;
		wrap.start();
		if (n == maxSoundInstances)
			playing.shift().stop();
	}
	record.queue = [];
}

function stopAllSounds(){
	PIXI.sound.stopAll();
	sound_record.queue = [];
	let playing = sound_record.playing;
	for (let name of Object.keys(playing))
		playing[name] = [];
}

let fontData = {};

//creates a BitmapText object
//do not use for regular fonts
function printText(string, font, tint=0x000000, scale=1, x=0, y=0){
	let size = fontData[font];
	let text = new PIXI.BitmapText(string, {
		fontName: font,
		fontSize: size,
		tint: tint
	});
	text.x = x;
	text.y = y;
	text.scale.set(scale);
	return text;
}

//creates a PIXI.Sprite (not Sprite) using the texture string
function makeSprite(texstr, scale=1, x=0, y=0){
	let sprite = new PIXI.Sprite(media.textures[texstr]);
	sprite.position.set(x, y);
	sprite.scale.set(scale);
	return sprite;
}

function setTexture(sprite, texstr){
	sprite.texture = media.textures[texstr];
}

//list of all textures to be loaded
//make sure each filename is unique across all folders
let recursive_texture_names = [
	["bricks/", [
		"main_bricks",
		"brick_shine",
		"brick_idle",
		"brick_menacer",
		"brick_regen",
		"jumper",
		"split",
		"patches",
		"brick_gate",
		"brick_slot",
		"brick_title",
		"snapper",
		"bulk",
		"brick_regen_mask",
		"unification",
		"barrier_brick",
		"laser_gate",
		"brick_scatter",
	]],

	["paddles/", [
		"paddle",
		"paddles",
		"frozen_paddle",
		"protect_outline",
		"paddle_white",
	]],

	["balls/", [
		"main_balls",
		"giga_forcefield",
		"knocker_border",
		"parachute",
	]],
	
	["etc/", [
		"border",
		"gate",
		"powerups",
		"bg",
		"bg2",
		"title_bg",
		"no_bg",
		"control_crosshair",
		"assist",
	]],

	["enemy/", [
		"dropper",
		"enemies",
		"gumball",
	]],

	["particles/", [
		"detonator_explosion",
		"explosion_regular",
		"explosion_freeze",
		"explosion_mega",
		"comet_ember",
		"quasar",
		"whiskey",
		"invert",
	]],

	["gui/", [
		"tools",
		"scores",
		"editorbuttons",
		"editorenemy",
		"menubuttons",
		"title_subtext",
		"paddlelife",
	]],

	["projectiles/", [
		"lasers",
		"comet",
		"lasereye_laser",
		"boulder_debris",
		"blossom",
		"javelin",
		"shotgun_pellet",
		"ballcannon_ball",
		"drill",
		"missile",
		"rapid_bullets",
		"probe",
		"buzzer",
		"raindrop",
		"gelato",
		"shotgun",
	]]
];

let recursive_sound_names = [
	["paddle/", [
		"ballcannon_fire",
		"beam_fire",
		"cannon_drumroll",
		"cannon_fire",
		"control_active",
		"drill_explode",
		"drill_fire",
		"heaven_hit",
		"invert_fire",
		"javelin_charge",
		"javelin_fire",
		"laser_fire",
		"laserplus_fire",
		"missile_erratic_fire",
		"missile_fire",
		"paddle_catch",
		"paddle_death_1",
		"paddle_death_2",
		"paddle_hit",
		"pause_activated",
		"rapidfire_fire",
		"rocket_launch",
		"shotgun_fire",
		"transform_brick",
		"int_shadow_hit",
		"illusion_hit",
	]],
	["brick/", [
		"alien_death",
		"alien_hit",
		"antilaser_hit",
		"boulder_break",
		"brick_armed",
		"brick_armor",
		"brick_disarmed",
		"brick_divide",
		"brick_hit",
		"detonator_explode",
		"detonator_ice",
		"gate_enter_1",
		"gate_enter_2",
		"invisible_reveal",
		"ultraviolet_pop",
		"brick_speed_up",
		"brick_speed_down",	
	]],
	["ball/", [
		"ball_generator",
		"blossom_fire",
		"bomber_explode",
		"bomber_fuse",
		"combo",
		"iceball_hit",
		"node",
		"snapper_placed",
		"split_large",
		"split_med",
		"split_small",
		"volt_attack",
	]],
	["powerup/", [
		"acid_collected",
		"blackout_collected",
		"bomber_collected",
		"bulk_collected",
		"cannon_collected",
		"catch_collected",
		"change_collected",
		"combo_collected",
		"control_collected",
		"domino_collected",
		"drill_collected",
		"energy_collected",
		"extend_collected",
		"fast_collected",
		"fireball_collected",
		"freeze_collected",
		"generic_collected",
		"ghost_collected",
		"giga_collected",
		"glue_collected",
		"hacker_collected",
		"haha_collected",
		"halo_collected",
		"iceball_collected",
		"indigestion_collected",
		"int_shadow_collected",
		"knocker_collected",
		"large_ball_collected",
		"laser_collected",
		"laserball_collected",
		"mega_collected",
		"missile_collected",
		"nano_collected",
		"nano_launch",
		"nervous_collected",
		"normal_collected",
		"particle_collected",
		"pause_collected",
		"probe_collected",
		"quasar_collected",
		"reserve_collected",
		"restrict_collected",
		"rocket_collected",
		"shotgun_collected",
		"shrink_collected",
		"slow_collected",
		"terraform_collected",
		"vector_collected",
		"volt_collected",
		"voodoo_collected",
		"weak_collected",
		"weight_collected",
		"whiskey_collected",
		"xbomb_collected",
		"xbomb_explode",
		"xbomb_launch",
		"yoyoga_collected",
		"yreturn_collected",
		"zenshove_collected",
		"poison_collected",
		"shadow_collected",
		"buzzer_collected",
		"unification_collected",
		"open_collected",
		"disarm_collected",
		"drop_collected",
		"quake_collected",
		"barrier_collected",
		"tractor_collected",
		"undead_collected",
		"junk_collected",
		"jewel_collected",
		"joker_collected",
		"luck_collected",
		"laceration_collected",
		"invert_collected",
		"undestructible_collected",
		"player_collected",
		"wet_storm_collected",
		"gelato_collected",
		"ultraviolet_collected",
		"xray_collected",
		"oldie_collected",
		"lock_collected",
		"assist_collected",
		"attract_collected",
		"protect_collected",
		"illusion_collected",
		"orbit_collected",
		"kamikaze_collected",
		"antigravity_collected",
		"gravity_collected",
		"irritate_collected",
		"sightlaser_collected",
		"trail_collected",
		"emp_collected",
		"bypass_collected",
		"bypass_exit",
	]],
	["enemy/", [
		"enemy_death",
	]],
	["etc/", [
		"board_saved.ogg",
	]],
]

let font_names = [
	["windows", 16],
	["arcade", 20],
	["pokemon", 16]
]


media.load = function(callback){
	let loader = PIXI.Loader.shared;

	//load ALL the levels
	loader.add("default_levels", "levels/default_levels.json");
	//can be accessed at loader.resources.default_levels.data
	loader.add("default_playlists", "levels/default_playlists.json");
	
	//load changelog
	loader.add("changelog", "changelog.txt");
	//can be accessed at loader.resources.changelog.data

	for (let pair of recursive_texture_names){
		let [path, names] = pair;
		path = "media/" + path;
		for (let name of names){
			loader.add(name, path + name + ".png");
		}
	}

	for (let [path, names] of recursive_sound_names){
		path = "audio/" + path;
		for (let name of names){
			//if there is no extension, assume the file is .wav
			let i = name.indexOf(".");
			let trunc;
			if (i == -1){
				trunc = name;
				name += ".wav";
			}
			else
				trunc = name.slice(0, i);
			loader.add(trunc, path + name);
			//initialize a queue for each sound
			sound_record.playing[trunc] = [];
		}
	}

	for (let [name, sz] of font_names){
		path = "media/fonts/" + name + ".fnt";
		loader.add(name, path);
		fontData[name] = sz;
	}

	//create shaders
	this.createShaders();
	
	//will call callback once all assets are loaded
	loader.load(callback);
}

media.createShaders = function(){
	let shaderText;

	shaderText = `
		varying vec2 vTextureCoord;
		uniform sampler2D uSampler;

		uniform vec3 color;
		uniform float mag;

		void main(void){
			vec4 pixel = texture2D(uSampler, vTextureCoord);
			float r = pixel.r + (color.r - pixel.r) * mag; 
			float g = pixel.g + (color.g - pixel.g) * mag; 
			float b = pixel.b + (color.b - pixel.b) * mag;

			//idk why but you need to multiply rgb by the alpha
			//or else the transparent pixels will become visible
			//Lookup "premultiplied alpha"
			vec3 c = vec3(r, g, b) * pixel.a;

		    gl_FragColor = vec4(c.r, c.g, c.b, pixel.a);
		}
	`;
	/**
	 * TODO: Convert this into a generator/class
	 * in order to support having multiple objects with the
	 * glow effect
	 */
	this.shaders.paddleGlow = new PIXI.Filter(null, shaderText, {
		color: [1.0, 1.0, 1.0],
		mag: 1.0,
	});
}

media.makeTexture = function(texname, rx, ry, rw, rh){
	let tex = this.textures[texname];
	let rect = new PIXI.Rectangle(rx, ry, rw, rh);
	return new PIXI.Texture(tex, rect);
}

media.processTextures = function(){
	let rects;

	//make white_pixel and clear_pixel
	this.textures.white_pixel = new PIXI.Texture(
		PIXI.Texture.WHITE,
		new PIXI.Rectangle(0, 0, 1, 1)
	);
	this.textures.clear_pixel = PIXI.Texture.EMPTY;

	//divide a large sprite sheet into multiple
	//uniform-sized textures
	let default_w = 16;
	let default_h = 8;

	let partition = (texname, name, w, h, padx=0, pady=0) => {
		if (w === undefined)
			w = default_w;
		if (h === undefined)
			h = default_h;
		let tex = this.textures[texname];
		let rows = Math.floor((tex.height+pady) / (h+pady));
		let cols = Math.floor((tex.width+padx) / (w+padx));
		for (let i = 0; i < rows; i++){
			for (let j = 0; j < cols; j++){
				let rect = new PIXI.Rectangle((w+padx)*j, (h+pady)*i, w, h);
				let tex2 = new PIXI.Texture(tex, rect);
				let str = `${name}_${i}_${j}`;
				if (rows == 1)
					str = `${name}_${j}`;
				else if (cols == 1)
					str = `${name}_${i}`;
				this.textures[str] = tex2;
			}
		}
	}

	default_w = 16;
	default_h = 8;
	partition("main_bricks", "brick_main");
	partition("brick_shine", "brick_shine");
	partition("brick_idle", "brick_idle");
	partition("brick_menacer", "brick_menacer");
	partition("patches", "patch");
	partition("jumper", "brick_jumper");
	partition("split", "brick_split");
	partition("brick_regen", "brick_regen");
	partition("brick_gate", "brick_gate");
	partition("brick_slot", "brick_slot");
	partition("snapper", "snapper");
	partition("bulk", "brick_bulk");
	partition("unification", "brick_unification");
	partition("brick_scatter", "brick_scatter");
	//also create an invisible brick texture
	this.textures["brick_invis"] = this.textures["brick_main_5_20"];

	//title bricks are half the size of regular bricks
	partition("brick_title", "brick_title", 8, 4);

	//experimental brick regen mask
	partition("brick_regen_mask", "brick_regen_mask", 16, 8);

	//laser gate turrets
	tex = this.textures.laser_gate;
	for (let i = 0; i < 10; i++){
		let rect = new PIXI.Rectangle(8, 27+i*8, 7, 7);
		let str = "laser_core_" + i;
		this.textures[str] = new PIXI.Texture(tex, rect);

		rect = new PIXI.Rectangle(24, 28+i*8, 23, 5);
		str = "laser_turret_" + i;
		this.textures[str] = new PIXI.Texture(tex, rect);
	}
	for (let i = 0; i < 5; i++){
		for (let j = 0; j < 3; j++){
			let rect = new PIXI.Rectangle(16*i, 8*j, 16, 8);
			let str = `brick_laser_${j}_${i}`;
			this.textures[str] = new PIXI.Texture(tex, rect);
		}
		rect = new PIXI.Rectangle(49, 28+i*16, 1, 5);
		str = "laser_laser_" + i;
		this.textures[str] = new PIXI.Texture(tex, rect);
	}

	//process main_balls
	partition("main_balls", "ball_main", 7, 7, 1, 1);
	this.textures["ball_large"] = 
		this.makeTexture("main_balls", 1, 40, 14, 14);
	this.textures["ball_small"] = 
		this.makeTexture("main_balls", 31, 40, 3, 3);

	//ball parachute
	partition("parachute", "parachute", 15, 16, 1, 1);

	//split paddle into 3 sections
	//to allow for paddle elargement
	tex = this.textures.paddles;
	for (let i = 0; i < 32; i++){
		for (let j = 0; j < 4; j++){
			let leftRect = new PIXI.Rectangle(64*j, 8*i, 10, 8);
			let midRect = new PIXI.Rectangle(64*j+10, 8*i, 1, 8);
			let leftTex = new PIXI.Texture(tex, leftRect);
			let midTex = new PIXI.Texture(tex, midRect);
			let leftStr = `paddle_${i}_${j}_left`;
			let midStr = `paddle_${i}_${j}_mid`;
			this.textures[leftStr] = leftTex;
			this.textures[midStr] = midTex;
		}
	}

	//background tiles
	partition("bg", "bg", 32, 32);
	partition("bg2", "bg2", 32, 32);

	//tool textures
	tex = this.textures.tools;
	for (let i = 0; i < 10; i++){
		let rect = new PIXI.Rectangle(16*i, 0, 16, 16);
		let tex2 = new PIXI.Texture(tex, rect);
		let str = "tool_" + i;
		this.textures[str] = tex2;
	}

	//powerups
	tex = this.textures.powerups;
	for (let frame = 0; frame < 17; frame++){
		let index = 0;
		for (let j = 0; j < 4; j++){
			let max_i = 40;
			if (j == 2)
				max_i = 37;
			else if (j == 3)
				max_i  = 18;
			for (let i = 0; i < max_i; i++){
				let x = frame*64 + j*16;
				let y = i*8;
				let rect = new PIXI.Rectangle(x, y, 16, 8);
				let tex2 = new PIXI.Texture(tex, rect);
				let str = "powerup_" + frame + "_" + index;
				this.textures[str] = tex2;
				//add default alias for ui stuff
				if (frame == 8){
					let str2 = "powerup_default_" + index;
					this.textures[str2] = tex2;
				}
				index++;
			}
		}
	}

	//particles
	partition("detonator_explosion", "det_blast", 48, 24);
	partition("explosion_regular", "det_smoke_normal", 24, 24);
	partition("explosion_freeze", "det_smoke_freeze", 24, 24);
	partition("explosion_mega", "det_smoke_neo", 32, 32);

	partition("brick_scatter", "brick_scatter_explosion", 48, 24);

	//whiskey bubbles
	rects = [
		[1, 1, 9, 9],
		[11, 2, 7, 7],
		[19, 3, 6, 6],
		[26, 4, 4, 4]
	];
	for (let [i, rect] of rects.entries()){
		let tex = this.makeTexture("whiskey", ...rect);
		this.textures["whiskey_"+i] = tex;
	}

	//knocker saw blade
	partition("knocker_border", "knocker", 13, 13);

	//Invert shockwave thing?
	partition("invert", "invert", 9, 26);

	//projectiles

	//lasers
	//NOTE: lasers.png had to be enlarged to 64x64
	//		in order to prevent graphical errors.
	//		Maybe the old texture was too small?
	rects = [
		[0, 0, 3, 10],
		[4, 0, 4, 10],
		[9, 0, 3, 7],
		[0, 11, 2, 4],
		[3, 11, 2, 7],
		[6, 11, 4, 9],
	];
	for (let [i, rect] of rects.entries()){
		let tex = this.makeTexture("lasers", ...rect);
		this.textures["laser_" + i] = tex;
	}

	partition("rapid_bullets", "rapid", 10, 15, 2, 0);

	//boulder debris/rocks
	rects = [
		[0, 0, 5, 5],
		[6, 0, 7, 7],
		[14, 0, 9, 9],
		[24, 0, 12, 12],
		[37, 0, 14, 14],
	]

	for (let [i, rect] of rects.entries()){
		let tex = this.makeTexture("boulder_debris", ...rect);
		this.textures["boulder_" + i] = tex;
	}

	partition("drill", "drill", 15, 41, 1, 1);
	partition("missile", "missile", 16, 40);
	partition("buzzer", "buzzer", 48, 48, 2, 0);
	partition("shotgun", "shotgun", 10, 10);

	//enemies
	partition("dropper", "dropper", 23, 24, 1, 0);
	partition("enemies", "enemy_main", 16, 16);
	partition("gumball", "enemy_gumball", 6, 6, 1, 1);

	//gui stuff
	partition("scores", "score", 15, 6, 2, 2);
	partition("editorbuttons", "editorbutton", 16, 16);
	partition("editorenemy", "editorenemy", 12, 12);
	partition("menubuttons", "menu_button", 20, 20);

	//title subtext
	rects = [
		[0, 2, 270, 11],
		[0, 14, 146, 23],
		[0, 39, 287, 13]
	]
	for (let [i, rect] of rects.entries()){
		let tex = this.makeTexture("title_subtext", ...rect);
		this.textures["title_subtext_"+i] = tex;
	}

	//border stuff
	this.textures["border_left"] = this.makeTexture(
		"border", 0, 0, 8, 264);
	this.textures["border_up"] = this.makeTexture(
		"border", 0, 0, 224, 8);

	//gate stuff
	rects = [
		["gate_left", [0, 0, 9, 8]],
		["gate_right", [9, 0, 9, 8]],
		["gate_slice", [0, 8, 1, 8]],
	]
	for (let [name, rect] of rects){
		this.textures[name] = this.makeTexture("gate", ...rect);
	}

	//assist sprites
	this.textures["assist_base"] = this.makeTexture(
		"assist", 0, 0, 22, 22);
	this.textures["assist_bullet"] = this.makeTexture(
		"assist", 23, 0, 6, 8);
	this.textures["assist_gun"] = this.makeTexture(
		"assist", 23, 10, 6, 8);

}

media.processSounds = function(){
	//adjust the volume of some sounds
	//because some of them are making my ears bleed
	let setVol = function(name, val){
		let sound = PIXI.sound._sounds[name];
		sound.volume = val;
	};

	setVol("bomber_explode", 0.5);
	setVol("rapidfire_fire", 0.5);
	setVol("iceball_hit", 0.25);
	setVol("laser_fire", 0.75);
	setVol("transform_brick", 0.5);
	setVol("heaven_hit", 0.5);
	setVol("laceration_collected", 0.25);
	setVol("boulder_break", 0.5);
	setVol("illusion_collected", 0.75);
}

//some animations may be created outside of this method
media.createAnimations = function(){
	//make sure irange and jrange are at least 1
	//or else no animations will be created
	let create = (name, basetex, i0, j0, irange, jrange) => {
		let arr = [];
		for (let i = i0; i < i0 + irange; i++){
			for (let j = j0; j < j0 + jrange; j++){
				let name = `${basetex}_${i}_${j}`;
				arr.push(this.textures[name]);
			}
		}
		this.animations[name] = arr;
		return arr;
	}

	//for one-dimensional sprite sheets
	let create2 = (name, basetex, i0, irange) => {
		let arr = [];
		for (let i = i0; i < i0 + irange; i++){
			let name = `${basetex}_${i}`;
			arr.push(this.textures[name]);
		}
		this.animations[name] = arr;
		return arr;
	}

	//ball stuff
	//knocker sawblade spin
	create2("knocker_spin", "knocker", 0, 2);

	//regular brick shine
	for (let i = 0; i < 23; i++){
		let col = i % 14;
		let row = Math.floor(i/14);
		let name = "brick_shine_" + i;
		create(name, "brick_shine", row*7, col, 7, 1);
	}

	//onix brick shine
	for (let i = 0; i < 5; i++){
		let col = 9 + i;
		let name = "onix_shine_" + i;
		create(name, "brick_shine", 7, col, 6, 1);
	}

	//factory brick shine
	for (let i = 0; i < 3; i++){
		let rows = [0, 1, 2, 1];
		let arr = [];
		for (let j in rows){
			let name = `brick_shine_${j}_${14+i}`;
			arr.push(this.textures[name]);
		}
		this.animations[`factory_shine_${i}`] = arr;
	}

	//tiki and ghost shine
	create("tiki_shine", "brick_shine", 7, 14, 5, 1);
	create("ghost_shine", "brick_shine", 7, 15, 5, 1);

	//brick glowing
	for (let i = 0; i < 8; i++){
		let name = "brick_glow_" + i;
		create(name, "brick_idle", 0, i, 10, 1);
		//the glowing animation goes back and forth
		//between normal and light
		let arr = this.animations[name];
		for (let i = 8; i >= 1; i--)
			arr.push(arr[i]);
	}
	//brick glowing 2 (shorter cycle)
	for (let i = 0; i < 4; i++){
		let name = "brick_glow2_" + i;
		let arr = create(name, "brick_idle", 4, 8+i, 4, 1);
		for (let i = 2; i >= 1; i--)
			arr.push(arr[i]);
	}

	//alien loop
	for (let i = 0; i < 4; i++){
		let name = "alien_" + i;
		create(name, "brick_idle", 0, 8+i, 4, 1);
	}

	//brick regen
	for (let i = 0; i < 6; i++){
		let name = "brick_regen_" + i;
		create(name, "brick_regen", 0, i, 8, 1);
	}

	//experimental regen mask
	// create2("brick_regen_mask", "brick_regen_mask", 0, 9);

	//jumper brick
	for (let i = 0; i < 3; i++){
		let name = "brick_jumper_" + i;
		create(name, "brick_jumper", 0, i, 14, 1);
	}

	//conveyor brick
	for (let i = 0; i < 4; i++){
		let name = "conveyor_" + i;
		create(name, "brick_main", 4+i, 21, 1, 3);
	}

	//gate flash for both normal and exitOnly
	for (let i = 0; i < 4; i++){
		for (let e = 0; e < 2; e++){
			let name = `gate_flash_${i}_${e}`;
			let pair = [
				`brick_gate_${2}_${i}`,
				`brick_gate_${e}_${i}`
			];
			let arr = [];
			//repeat animation
			for (let j = 0; j < 4; j++) 
				arr = arr.concat(pair);
			this.animations[name] = arr;
		}
	}

	//split brick
	let ani = create("split_glow_red", "brick_split", 0, 1, 5, 1);
	for (let i = 3; i >= 1; i--)
		ani.push(ani[i]);
	ani = create("split_glow_blue", "brick_split", 8, 2, 6, 1);
	for (let i = 4; i >= 1; i--)
		ani.push(ani[i]);
	create("split_red", "brick_split", 5, 1, 3, 1);
	create("split_blue_left", "brick_split", 5, 0, 9, 1);
	let ani2 = this.animations["split_blue_left"].slice();
	for (let i = 0; i < 3; i++)
		ani2[i] = `brick_split_${5+i}_2`;
	this.animations["split_blue_right"] = ani2;

	//scatter bomb brick glow
	create("scatter_glow", "brick_scatter", 0, 0, 8, 1);
	//scatter bomb brick spawn
	create("scatter_spawn", "brick_scatter", 0, 1, 8, 1);
	//scatter bomb brick explosion
	create("scatter_explosion", "brick_scatter_explosion", 0, 1, 5, 1);

	//menacer coating
	for (let i = 0; i < 3; i++){
		let name = "menacer_coat_" + i;
		create(name, "brick_menacer", 0, i, 9, 1);
	}

	//green menacer brick shine
	create("menacer_shine", "brick_menacer", 0, 3, 7, 1);
	//green menacer brick cracking will be implemented manually

	//shield shine
	let names = ["up", "down", "left", "right"];
	for (let [j, name] of names.entries()){
		name = "shield_shine_" + name;
		create(name, "patch", 0, j+4, 5, 1);
		let arr = this.animations[name];
		for (let i = 3; i >= 1; i--)
			arr.push(arr[i]);
	}

	//powerup spin
	for (let i = 0; i < 135; i++){
		let name = "powerup_" + i;
		create(name, "powerup", 0, i, 17, 1);
	}

	//enemies
	create("enemy_dizzy", "enemy_main", 0, 0, 1, 8);
	create("enemy_cubic", "enemy_main", 1, 0, 1, 8);
	for (let i = 0; i < 3; i++){
		let arr = create(
			"gumball_blink_"+i, "enemy_gumball", i, 0, 1, 3);
		//extend the blank face by a few frames
		for (let j = 0; j < 3; j++)
			arr.splice(1, 0, arr[0]);
		create("gumball_panic_"+i, "enemy_gumball", i, 3, 1, 8);
	}
	for (let i = 0; i < 3; i++){
		let arr = [];
		for (let j of [0, 1, 2, 1])
			arr.push(`enemy_main_${j+2}_${i}`);
		this.animations[`walkblock_${i}`] = arr;
	}

	create("enemy_death", "enemy_main", 2, 3, 1, 4);
	let arr = this.animations["enemy_death"];
	let arr2 = [];
	let frames = [0, 3, 1, 3, 2, 3];
	for (let i of frames)
		arr2.push(arr[i]);
	this.animations["enemy_death"] = arr2;
	this.animations["enemy_death_small"] = arr2.slice(2);
	//drill missile
	create("drill_yellow", "drill", 0, 0, 1, 41);
	create("drill_green", "drill", 1, 0, 1, 41);

	//missiles
	create("missile_normal", "missile", 0, 0, 1, 3);
	create("missile_erratic", "missile", 1, 0, 1, 3);

	//particles
	//invert
	create2("invert", "invert", 0, 5);
}

//draws a lightning bolt to a PIXI.Graphics object
//Code adapted from: https://gamedevelopment.tutsplus.com/tutorials/how-to-generate-shockingly-good-2d-lightning-effects--gamedev-2681
function shockify(gr, x0, y0, x1, y1, options={}){
	//default options
	let opt = {
		color: 0xFFFF00,
		minSegment: 10,
		maxSegment: 20,
		deviation: 20,
		amplitude: 30,
		rectangle: false,
	};
	Object.assign(opt, options);

	let start = new Vector(x0, y0);
	let end = new Vector(x1, y1);

	let tangent = end.sub(start);
	let normal = tangent.perpendicular().normalized();
	let length = tangent.len();

	const minSeg = opt.minSegment / length;
	const maxSeg = opt.maxSegment / length;
	let segments = [0];
	while (true){
		let segOff = randRangeFloat(minSeg, maxSeg);
		let seg = segments[segments.length-1] + segOff;
		if (seg >= 1)
			break;
		segments.push(seg);
	}

	//maximum height difference between adjacent points
	const deviation = opt.deviation;
	//all points must be between 2 sine waves with this amplitude
	const amplitude = opt.amplitude;
	//if rectangle is true, then the sine wave will be replaced
	//with a simple rectangular function
	const rectangle = opt.rectangle;

	let points = [start];
	let prevHeight = 0;

	for (let i = 1; i < segments.length; i++){
		let seg = segments[i];
		let prevSeg = segments[i-1];

		let bound;
		if (rectangle)
			bound = amplitude;
		else
			bound = Math.sin(Math.PI * seg) * amplitude;
		
		let minHeight = prevHeight - deviation;
		let maxHeight = prevHeight + deviation;

		minHeight = Math.max(-bound, minHeight);
		maxHeight = Math.min(bound, maxHeight);

		let height = randRangeFloat(minHeight, maxHeight);
		prevHeight = height;

		let base = tangent.scale(seg);
		let offset = normal.scale(height);
		let point = start.add(base.add(offset));
		points.push(point);
	}
	points.push(end);

	gr.lineStyle(1, opt.color);
	gr.moveTo(...points[0].unpack());
	for (let i = 1; i < points.length; i++)
		gr.lineTo(...points[i].unpack());

	//debug draw red points
	// gr.lineStyle();
	// gr.beginFill(0xFF0000, 0.5);
	// for ({x, y} of points)
	// 	gr.drawCircle(x, y, 2);
	// gr.endFill();
}

