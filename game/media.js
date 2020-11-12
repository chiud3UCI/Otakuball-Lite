//media handles the loading of assets(textures, sounds) as well
//as dividing spritesheet textures into individual sprite textures

var media = {
	textures: {
		//will retrieve texture from TextureCache
		//if key is not found in media
		__proto__: PIXI.utils.TextureCache,
	},
	animations: {},
};

// var sound = PIXI.sound;
var soundQueue = {};

//limit the number of times the same sound being
//played at a time
var maxSoundInstances = 3;
var minSoundInterval = 0.05;
PIXI.sound.volumeAll = 0.15;

function playSound(name, loop=false){
	let queue = soundQueue[name];

	//don't play new sound if previous sound
	//was recently played
	if (queue.length > 0){
		let instance = queue[queue.length-1];
		if (instance.progress <= minSoundInterval)
			return;
	}

	if (queue.length >= maxSoundInstances){
		//stop the oldest instance
		let instance = queue.shift();
		instance.stop();
	}

	let options = {
		loop: loop,
		complete(){
			queue.shift(); //pops first element
		}
	}
	let instance = PIXI.sound.play(name, options);
	queue.push(instance);
}

function stopSound(name){
	let queue = soundQueue[name];
	while (queue.length > 0){
		let instance = queue.pop();
		instance.stop();
	}
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

//list of all textures to be loaded
//make sure each name is unique across all folders
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
	]],

	["paddles/", [
		"paddle",
		"paddles",
	]],

	["balls/", [
		"main_balls",
	]],
	
	["etc/", [
		"border",
		"gate",
		"powerups"
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
	]],

	["gui/", [
		"tools",
		"scores",
		"editorbuttons",
		"editorenemy",
	]],

	["projectiles/", [
		"lasers",
	]]
];

let recursive_sound_names = [
	["paddle/", [
		"paddle_hit",
	]],
	["brick/", [
		"brick_hit",
		"brick_armor",
		"detonator_explode",
		"invisible_reveal",
		"antilaser_hit",
		"alien_hit",
		"alien_death",
	]],
	["ball/", [
	]],
	["powerup/", [
		"acid_collected",
	]],
	["enemy/", [
		"enemy_death",
	]],
]

let font_names = [
	["windows", 16],
	["arcade", 20],
	["pokemon", 16]
]

media.load = function(callback){
	let loader = PIXI.Loader.shared;

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
			soundQueue[trunc] = [];
		}
	}

	for (let [name, sz] of font_names){
		path = "media/fonts/" + name + ".fnt";
		loader.add(name, path);
		fontData[name] = sz;
	}
	//will call callback once all assets are loaded
	loader.load(callback);
}

media.makeTexture = function(texname, rx, ry, rw, rh){
	let tex = this.textures[texname];
	let rect = new PIXI.Rectangle(rx, ry, rw, rh);
	return new PIXI.Texture(tex, rect);
}

media.processTextures = function(){
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
		let rows = Math.floor(tex.height / (h+pady));
		let cols = Math.floor(tex.width / (w+padx));
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
	//also create an invisible brick texture
	this.textures["brick_invis"] = this.textures["brick_main_12_13"];

	//process main_balls
	partition("main_balls", "ball_main", 7, 7, 1, 1);

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
	partition("explosion_regular", "det_smoke_reg", 24, 24);
	partition("explosion_freeze", "det_smoke_freeze", 24, 24);
	partition("explosion_mega", "det_smoke_neo", 32, 32);

	//projectiles

	//lasers
	//NOTE: lasers.png had to be enlarged to 64x64
	//		in order to prevent graphical errors.
	//		Maybe the old texture was too small?
	let rects = [
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

	//enemies
	partition("dropper", "dropper", 23, 24, 1, 0);
	partition("enemies", "enemy_main", 16, 16);
	partition("gumball", "enemy_gumball", 7, 7, 1, 1);

	//gui stuff
	partition("scores", "score", 15, 6, 2, 2);
	partition("editorbuttons", "editorbutton", 16, 16);
	partition("editorenemy", "editorenemy", 12, 12);

	//gate stuff
	rects = [
		["gate_left", [0, 0, 9, 8]],
		["gate_right", [9, 0, 9, 8]],
		["gate_slice", [0, 8, 1, 8]],
	]
	for (let [name, rect] of rects){
		this.textures[name] = this.makeTexture("gate", ...rect);
	}

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
	}

	//regular brick shine
	for (let i = 0; i < 23; i++){
		let col = i % 14;
		let row = Math.floor(i/14);
		let name = "brick_shine_" + i;
		create(name, "brick_shine", row*7, col, 7, 1);
	}

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
	create("enemy_death", "enemy_main", 2, 3, 1, 4);
	let arr = this.animations["enemy_death"];
	let arr2 = [];
	let frames = [0, 3, 1, 3, 2, 3];
	for (let i of frames)
		arr2.push(arr[i]);
	this.animations["enemy_death"] = arr2;

}

