var brickClasses;

//when this function is called at the bottom, all classes
//will already be initialized so I can successfully assign
//them to brickClasses
function initBrickClasses(){
	brickClasses = {
		Brick,
		ForbiddenBrick,
		GhostBrick,
		NormalBrick,
		MetalBrick,
		GoldBrick,
		PlatinumBrick,
		SpeedBrick,
		CopperBrick,
		JumperBrick,
		OneWayBrick,
		ConveyorBrick,
		FunkyBrick,
		ShooterBrick,
		DetonatorBrick,
		TriggerDetonatorBrick,
		GlassBrick,
		AlienBrick,
		RainbowBrick,
		GateBrick,
		CometBrick,
		LaserEyeBrick,
		BoulderBrick,
		TikiBrick,
		TriggerBrick,
		SwitchBrick,
		FlipBrick,
		StrongFlipBrick,
		ShoveBrick,
		FactoryBrick,
		ShoveDetonatorBrick,
		SequenceBrick,
		OnixBrick,
		SlotMachineBrick,
		LauncherBrick,
		TwinLauncherBrick,
		ParachuteBrick,
		SplitBrick,
		PowerupBrick,
		FuseBrick,
		ResetBrick,
		SlimeBrick,
		ScatterBombBrick,
		ScatterBrick,
		LaserGateBrick,
	};
}

var explosiveLookup = generateLookup([
	"detonator",
	"comet",
	"triggerdetonator",
	"shovedetonator",
	"fuse",
]);

class Brick extends Sprite{
	constructor(texture, x, y){
		//use default brick texture if no texture specified
		//in order to make sure the shape is the right size
		if (!texture)
			texture = "brick_main_0_0";

		super(texture, x, y);
		this.createShape();

		this.patch = {
			shield: {},
			move: null,
			storedMove: null,
			invisible: false,
			antilaser: null,
			snapper: null
		}

		//will be set and used by PlayState during level loading
		this.initialParams = {};

		//keeps track of recently collided sprites
		this.disableOverlapCheck = false;
		this.overlap = new Map();

		this.travel = null;

		this.health = 10;
		this.armor = 0;
		this.score = 20;
		this.essential = true;

		//disable certain brick abilities if true
		this.suppress = false;

		this.hitSound = "brick_armor";
		this.deathSound = "brick_hit";

		this.gameType = "brick";
		this.brickType = "brick";
	}

	initPatches(newPatch){
		if (!newPatch)
			return;
		let p = newPatch;

		//shields
		if (p[0] === 0)
			this.initShield("up");
		if (p[1] === 0)
			this.initShield("down");
		if (p[2] === 0)
			this.initShield("left");
		if (p[3] === 0)
			this.initShield("right");

		//movement
		let move = this.patch.move;
		if (p[4] !== undefined)
			this.initMovementPatch(p[4]);

		//invisible
		if (p[5] === 0){
			this.patch.invisible = true;
			this.visible = false;
		}

		//antilaser
		if (p[6] === 0){
			let laserShield = new Sprite("patch_1_0");
			laserShield.scale.set(1);
			this.addChild(laserShield);
			this.patch.antilaser = true;
		}

		//regen
		if (p[7] === 0)
			this.initRegenPatch();
	}

	initShield(dir){
		let column = {
			up: 4,
			down: 5,
			left: 6,
			right: 7
		}
		let shield = new Sprite(`patch_0_${column[dir]}`);
		shield.scale.set(1);
		shield.addAnim("shine", "shield_shine_" + dir, 0.5);
		this.patch.shield[dir] = shield;
		this.addChild(shield);
	}

	initMovementPatch(value){
		let hit = (value >= 12);
		let n = value % 12;
		let i = Math.floor(n / 3); //dir
		let j = n % 3; //speed

		let speeds = [0.05, 0.1, 0.2];
		let vectors = [[0,-1], [0,1], [-1,0], [1,0]];

		let spd = speeds[j];
		let [vx, vy] = vectors[i];
		vx *= spd;
		vy *= spd;

		let move = {vx, vy};
		if (hit)
			this.patch.storedMove = move;
		else
			this.patch.move = move;
	}

	initRegenPatch(){
		this.essential = false;
		let mask = new Sprite("brick_regen_mask_8");
		mask.scale.set(1);
		let spd = 0.25;
		mask.regen = {
			aniDelay: 1000 / (60 * spd),
			aniTimer: 1000 / (60 * spd),
			delay: 2000,
			timer: 0,
			index: 8,
			baseHealth: this.health,
			healthFlag: false,
			hasStarted: false,
		};
		let brick = this;
		mask.startRegen = function(){
			let regen = this.regen;
			if (regen.hasStarted)
				return;
			regen.hasStarted = true;
			regen.index = 0;
			this.setTexture("brick_regen_mask_0");
			regen.timer = regen.delay;
			regen.aniTimer = 0;
			regen.healthFlag = false;
			brick.onDeath();
		};
		mask.updateRegen = function(delta){
			let regen = this.regen;
			if (regen.index == 8)
				return;
			regen.timer -= delta;
			if (regen.timer > 0)
				return;
			if (!regen.healthFlag){
				regen.healthFlag = true;
				regen.hasStarted = false;
				brick.health = regen.baseHealth;
			}
			regen.aniTimer -= delta;
			if (regen.aniTimer > 0)
				return;
			
			regen.aniTimer += regen.aniDelay;
			regen.index++;
			let tex = `brick_regen_mask_${regen.index}`;
			this.setTexture(tex);
		};
		this.addChild(mask);
		this.mask = mask;
		this.regenMask = mask;
	}

	onDeath(){
		super.onDeath();
		if (this.patch.snapper){
			stopSound(this.hitSound);
			stopSound(this.deathSound);
			DetonatorBrick.explode(this);
		}
	}

	attachSnapper(){
		if (this.patch.snapper)
			return;
		this.patch.snapper = true;
		let ani = [];
		for (let i = 0; i < 5; i++)
			ani.push(`snapper_${i}`);
		for (let i = 3; i >= 1; i--)
			ani.push(ani[i]);
		let snapper = new Sprite("snapper_0");
		snapper.scale.set(1);
		snapper.addAnim("glow", ani, 0.25, true, true);
		this.addChild(snapper);
	}

	static travelComplete = {
		//die if the brick overlaps another brick
		default(brick){
			let grid = game.top.brickGrid.grid;
			let [i, j] = getGridPos(brick.x, brick.y);
			if (!boundCheck(i, j)){
				brick.kill();
				return;
			}
			for (let br of grid[i][j]){
				//use br.gridDat.move instead of br.isMoving()
				//because gr.gridDat.move is constant between updates
				if (br !== brick && !br.gridDat.move){
					brick.kill();
					return;
				}
			}
		},
		//kill any brick it overlaps
		kill(brick){
			let grid = game.top.brickGrid;
			let [i, j] = getGridPos(brick.x, brick.y);
			if (!boundCheck(i, j)){
				brick.kill();
				return;
			}
			for (let br of grid.get(i, j)){
				if (br != brick && !br.isMoving())
					br.kill();
			}
		}
	};

	//x and y are the destination coordinates
	//mode can either be "speed" or "time"
	//onComplete can either be a string from Brick.travelComplete
	//or a custom function
	setTravel(x, y, mode="speed", value=0.5, onComplete="default"){
		if (this.patch.move || this.patch.storedMove)
			return;

		let dx = x - this.x;
		let dy = y - this.y;
		let dist = Vector.dist(dx, dy);
		let nx = dx / dist;
		let ny = dy / dist;

		let timer, spd;
		if (mode == "speed"){
			spd = value;
			timer = dist / spd;
		}
		else{ //mode == "time"
			timer = value;
			spd = dist / timer;
		}

		if (typeof(onComplete) == "string")
			onComplete = Brick.travelComplete[onComplete];

		let brick = this;
		this.travel = {
			x: x,
			y: y,
			vx: nx * spd,
			vy: ny * spd,
			timer: timer,
			onComplete: onComplete,
			update(delta){
				this.timer -= delta;
				if (this.timer <= 0){
					brick.travel = null;
					brick.moveTo(this.x, this.y);
					if (this.onComplete)
						this.onComplete(brick);
				}
				else{
					brick.x += this.vx * delta;
					brick.y += this.vy * delta;
					brick.updateShape();
				}
			}
		}
	}

	isMoving(){
		//check both movement patch and travel
		return (this.patch.move || this.travel);
	}

	static getHitSide(norm){
		let rad = Math.atan2(norm.y, norm.x);
		let deg = rad * 180 / Math.PI;
		if (deg >= -135 && deg < -45)
			return "up";
		if (deg >= -45 && deg < 45)
			return "right";
		if (deg >= 45 && deg < 135)
			return "down";
		return "left";
	}

	invisReveal(){
		let tex = this.texture;
		let rect = tex.frame;
		for (let i = 0; i < 30; i++){
			let dx = randRange(0, 13);
			let dy = randRange(0, 5);
			let x = rect.x + dx;
			let y = rect.y + dy;
			let rad = Math.random() * Math.PI * 2;
			let mag = 0.05 + Math.random() * 0.15;
			let [vx, vy] = Vector.rotate(0, mag, rad);
			let rect2 = new PIXI.Rectangle(x, y, 2, 2);
			let tex2 = new PIXI.Texture(tex, rect2);
			dx *= Math.random() * 4 - 2;
			dy *= Math.random() * 4 - 2;
			let p = new Particle(tex2, this.x + dx, this.y + dy, vx, vy);
			p.ay = 0.001;
			game.emplace("particles", p);
		}
		playSound("invisible_reveal");
	}

	//returns true if the brick will take damage
	handlePatches(obj, norm){
		let patch = this.patch;

		if (patch.storedMove){
			patch.move = patch.storedMove;
			patch.storedMove = null;
		}

		if (patch.invisible){
			patch.invisible = false;
			this.visible = true;
			this.invisReveal();
			if (obj.strength < this.armor || 
				obj.damage < this.health + 10)
				return false;
		}

		if (patch.snapper)
			return true;

		let dir = Brick.getHitSide(norm);
		let shield = patch.shield[dir];
		if (shield && obj.strength < 1){
			shield.playAnim("shine");
			return false;
		}

		if (patch.antilaser && obj.isLaser){
			playSound("antilaser_hit");
			return false;
		}
		return true;
	}

	//extra checking for ball collisions
	checkSpriteHit(obj, overlapCheck=true){
		if (this.regenMask && this.health <= 0)
			return [false];
		let resp = super.checkSpriteHit(obj);
		if (!resp[0])
			return [false];
		if (obj.gameType == "ball" || obj.gameType == "menacer"){
			let norm = resp[1];
			if (!obj.validCollision(norm.x, norm.y))
				return [false];
		}
		//prevent collision if the sprite has collided
		//this brick in the previous frame
		if (overlapCheck && !this.disableOverlapCheck){
			let prevOverlap = this.overlap.has(obj);
			this.overlap.set(obj, 1);
			if (prevOverlap)
				return [false];
		}
		return resp;
	}

	onSpriteHit(obj, norm, mag){
		if (obj.gameType != "menacer"){
			if (this.handlePatches(obj, norm))
				this.takeDamage(obj.damage, obj.strength);
		}
		obj.onSpriteHit(this, norm, mag);
	}
	
	takeDamage(damage, strength){
		if (this.patch.snapper)
			this.kill();
		this.damaged = false;
		if (strength >= this.armor){
			this.health -= damage;
			this.damaged = true;
		}
		if (this.health <= 0){
			playSound(this.deathSound);
			this.regenMask?.startRegen();
		}
		else
			playSound(this.hitSound);
	}

	shouldBeRemoved(){
		if (this.regenMask)
			return false;
		return super.shouldBeRemoved();
	}

	isDead(){
		return (this.health <= 0);
	}

	kill(){
		this.health = 0;
		this.regenMask?.startRegen();
	}

	update(delta){
		if (this.travel)
			this.travel.update(delta);
		for (let [obj, val] of this.overlap.entries()){
			if (val == 1)
				this.overlap.set(obj, 0);
			else
				this.overlap.delete(obj);
		}
		this.regenMask?.updateRegen(delta);
		super.update(delta);
	}
}

class NullBrick extends Brick{
	constructor(x, y){
		super("brick_invis", x, y);
		this.health = 9999;
		this.armor = 999;
		this.essential = false;
		this.brickType = "null";
	}

	isDead(){
		return true;
	}

	checkSpriteHit(obj){
		return [false];
	}
}

class ForbiddenBrick extends Brick{
	constructor(x, y){
		super("brick_invis", x, y);
		this.health = 9999;
		this.armor = 999;
		this.score = 0;
		this.essential = false;
		this.brickType = "forbidden";

		this.updateAppearance();
	}

	updateAppearance(){
		this.setTexture(
			cheats.get("show_forbidden") ? "brick_main_12_12" : "brick_invis"
		);
	}

	checkSpriteHit(obj){
		return [false];
	}
}

class GhostBrick extends Brick{
	constructor(x, y){
		super("brick_invis", x, y);
		setConstructorInfo(this, GhostBrick, arguments);

		this.health = 1000;
		this.armor = 2;
		this.essential = false;
		this.addAnim("shine", "ghost_shine", 0.25);
		this.brickType = "ghost";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
	}
}

class NormalBrick extends Brick{
	//return arguments for a random colored brick
	static randomColor(){
		let n = randRange(0, 123);
		let i = n % 6;
		let j = Math.floor(n / 6);
		return [i, j];
	}

	constructor(x, y, i=null, j=null){
		if (i === null)
			[i, j] = NormalBrick.randomColor();
		let tex = "brick_main_" + i + "_" + j;
		super(tex, x, y);
		//arguments won't work because i and j can be
		//procedurally generated
		setConstructorInfo(this, NormalBrick, [x, y, i, j]);
		// setConstructorInfo(this, NormalBrick, arguments);
		this.normalInfo = [i, j];

		this.brickType = "normal";
	}

	onDeath(){
		super.onDeath();
		if (this.suppress)
			return;
		let spawner = game.top.powerupSpawner;
		if (spawner.canSpawn()){
			let id = spawner.getId();
			let pow = new Powerup(this.x, this.y, id);
			game.emplace("powerups", pow);
		}
	}
}

class MetalBrick extends Brick{
	//level should be [0-5] inclusive
	constructor(x, y, level){
		let str = `brick_main_6_${1+level}`;
		super(str, x, y);
		setConstructorInfo(this, MetalBrick, arguments);

		let anistr = `brick_shine_${4+level}`;
		this.addAnim("shine", anistr, 0.25);

		this.level = level;
		this.health = (2 + level) * 10;
		this.score = 100 + level * 20;

		this.brickType = "metal";
	}

	//static because GreenMenacerBrick will also use this
	static setCoating(brick, oldBrick){
		let coat = 2;
		if (brick.brickType == "metal"){
			if (brick.level == 0)
				coat = 0;
			else if (brick.level == 1)
				coat = 1;
		}
		//add the underlay texture
		let underlay = new Sprite(oldBrick.texture);
		underlay.scale.set(1);
		brick.addChild(underlay);
		//create coating overlay animation
		let anistr = "menacer_coat_" + coat;
		let ani = brick.addAnim("coat", anistr, 0.25);
		//modify ani so that it deletes the underlay
		//once the ani is done
		ani.onCompleteCustom = function(){
			brick.removeChild(underlay);
		}
		brick.playAnim("coat");
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
	}
}

class GreenMenacerBrick extends Brick{
	constructor(x, y){
		super("brick_main_6_16", x, y);
		setConstructorInfo(this, GreenMenacerBrick, arguments);

		this.health = 80;
		this.armor = 1;
		this.armorTimer = 50000;
		this.decayTimer = 1000;

		this.addAnim("shine", "menacer_shine", 0.25);

		this.brickType = "greenmenacer";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (strength >= 1)
			this.armor = 1;

		if (this.armor == 1)
			this.playAnim("shine");
		else
			this.updateAppearance();
	}

	updateAppearance(){
		if (this.health >= 80){
			this.setTexture("brick_main_6_16");
			return;
		}
		let row = 0;
		for (let i = 70; i >= 0; i -= 10){
			if (this.health >= i){
				this.setTexture(`brick_menacer_${row}_4`);
				return;
			}
			row = Math.min(6, row+1);
		}
	}

	update(delta){
		if (this.armor == 1){
			this.armorTimer -= delta;
			if (this.armorTimer <= 0)
				this.armor = 0;
		}
		else{
			this.decayTimer -= delta;
			if (this.decayTimer <= 0){
				this.decayTimer = 1000;
				if (this.health > 10)
					this.health -= 10;
				this.updateAppearance();
			}
		}
		super.update(delta);
	}
}

class GoldBrick extends Brick{
	constructor(x, y, plated){
		let tex = "brick_main_6_0";
		if (plated)
			tex = "brick_main_6_7";
		super(tex, x, y);
		setConstructorInfo(this, GoldBrick, arguments);

		this.plated = plated;
		this.health = 100;
		this.armor = 1;
		this.score = 500;
		this.essential = false;

		this.addAnim("shine", "brick_shine_3", 0.25);
		this.addAnim("plated_shine", "brick_shine_10", 0.25);

		this.brickType = "gold";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (this.plated){
			this.playAnim("plated_shine");
			if (strength >= 0){
				this.plated = false;
				this.setTexture("brick_main_6_0");
				game.incrementScore(20);
			}
		}
		else{
			this.playAnim("shine");
		}
	}
}

class PlatinumBrick extends Brick{
	constructor(x, y){
		super("brick_main_6_10", x, y);
		this.health = 100;
		this.armor = 2;
		this.score = 500;
		this.essential = false;

		this.addAnim("shine", "brick_shine_13", 0.25);

		this.brickType = "platinum";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
	}
}

class SpeedBrick extends Brick{
	constructor(x, y, gold, fast){
		let suffix = fast ? "8_12" : "8_13";
		if (gold)
			suffix = fast ? "6_8" : "6_9";
		super("brick_main_" + suffix, x, y);
		setConstructorInfo(this, SpeedBrick, arguments);

		if (gold){
			this.health = 100;
			this.armor = 1;
			this.score = 500;
			this.essential = false;
			let j = fast ? 11 : 12;
			let anistr = "brick_shine_" + j;
			this.addAnim("shine", anistr, 0.25);
		}

		this.gold = gold;
		this.fast = fast;
		this.deltaSpeed = fast ? 0.05 : -0.05;

		this.hitSound = fast ? "brick_speed_up" : "brick_speed_down";
		this.deathSound = this.hitSound;

		this.brickType = "speed";
	}

	onSpriteHit(obj, norm, mag){
		super.onSpriteHit(obj, norm, mag);
		if (obj.gameType == "ball"){
			obj.setSpeed2(obj.getSpeed() + this.deltaSpeed);
		}
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (this.gold)
			this.playAnim("shine");
	}
}

class CopperBrick extends Brick{
	constructor(x, y){
		super("brick_main_6_11", x, y);
		setConstructorInfo(this, CopperBrick, arguments);

		this.health = 100;
		this.armor = 1;
		this.score = 500;
		this.essential = false;

		this.addAnim("shine", "brick_shine_14", 0.25);

		this.brickType = "copper";
	}

	onSpriteHit(obj, norm, mag){
		super.onSpriteHit(obj, norm, mag);
		if (obj.gameType == "ball"){
			let ball = obj;

			let spd = ball.getSpeed();
			let vec = norm.scale(spd);
			let rad = (2 * Math.random() - 1) * Math.PI/2;
			vec = vec.rotate(rad);
			ball.setVel(vec.x, vec.y);
		}
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
	}
}

class JumperBrick extends Brick{
	constructor(x, y){
		super("brick_jumper_0_0", x, y);
		setConstructorInfo(this, JumperBrick, arguments);

		this.armor = 1;
		this.health = 10;
		this.charges = 3;

		//custom function that makes the brick jump
		//halfway through the jump animation
		let jumper = this;
		let jumpHalfway = function(){
			if (this.currentFrame == 7)
				jumper.jump();
		}
		//function that changes the jumper's texture
		//after the jumping animation is over 
		let showJumper = function(){
			jumper.setTexture(jumper.storedTexture);
		}
		for (let i = 0; i < 3; i++){
			let anistr = "brick_jumper_" + i;
			let name = "jump" + (3-i);
			let ani = this.addAnim(name, anistr, 0.25);
			ani.onFrameChange = jumpHalfway;
			ani.onCompleteCustom = showJumper;
		}

		this.brickType = "jumper";
	}

	//teleport to a random empty space on the board
	jump(){
		//is AnimatedSprite calling this outside of playstate?
		if (game.top.stateName != "playstate")
			return;
		let grid = game.top.brickGrid.grid;
		let empty = [];
		for (let i = 0; i < 32-8; i++){
			for (let j = 0; j < 13; j++){
				if (grid[i][j].length == 0)
					empty.push([i, j]);
			}
		}
		if (empty.length == 0)
			return;
		let index = randRange(empty.length);
		let [i, j] = empty[index];
		let [x, y] = getGridPosInv(i, j);
		this.moveTo(x, y);
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (this.charges > 0 && !this.isAnimating){
			let col = 4 - this.charges;
			this.storedTexture = "brick_jumper_0_" + col;
			this.setTexture("brick_invis");
			this.playAnim("jump" + this.charges);
			this.charges--;
			if (this.charges == 0)
				this.armor = 0;
		}
	}
}

class OneWayBrick extends Brick{
	static data = {
		//dir: [i, j, xn, yn]
		up:    [12, 7,   0, -1],
		down:  [12, 8,   0,  1],
		left:  [12, 9,  -1,  0],
		right: [12, 10,  1,  0]
	};

	constructor(x, y, dir){
		let [i, j, xn, yn] = OneWayBrick.data[dir];
		super(`brick_main_${i}_${j}`, x, y);
		this.health = 1000;
		this.armor = 10;
		this.essential = false;
		this.norm = [xn, yn];

		this.disableOverlapCheck = true;

		this.brickType = "oneway";
	}

	//only handle balls
	checkSpriteHit(obj){
		if (obj.gameType != "ball")
			return [false];
		return super.checkSpriteHit(obj);
	}

	//will only be called on balls
	onSpriteHit(ball, norm, mag){
		ball.handleCollision(...this.norm);
	}
}

class ConveyorBrick extends Brick{
	static data = {
		//dir: [i, xn, yn]
		up:    [0,  0, -1],
		down:  [1,  0,  1],
		left:  [2, -1,  0],
		right: [3,  1,  0]
	};

	static speeds = [
		//[mag, anispd]
		[0.005, 0.0625],
		[0.01, 0.125],
		[0.02, 0.25]
	]

	//speedLevel is in range [0, 1, 2]
	constructor(x, y, dir, speedLevel){
		let [i, xn, yn] = ConveyorBrick.data[dir];
		let j = speedLevel;
		super(`brick_main_${i}_${21+j}`, x, y);

		this.essential = false;
		this.health = 10000;
		this.armor = 10;

		let [mag, anispd] = ConveyorBrick.speeds[speedLevel];
		this.steerArgs = [xn, yn, mag, 0.01];

		this.disableOverlapCheck = true;

		this.setTexture("brick_invis");
		let anistr = "conveyor_" + i;
		this.addAnim("cycle", anistr, anispd, true, true);

		this.brickType = "conveyor";
	}

	//only handle balls
	checkSpriteHit(obj){
		if (obj.gameType != "ball")
			return [false];
		return super.checkSpriteHit(obj);
	}

	onSpriteHit(ball, norm, mag){
		ball.setSteer(...this.steerArgs);
	}
}

class FunkyBrick extends Brick{
	//level is in range [0, 1, 2]
	constructor(x, y, level){
		let tex = `brick_main_7_${level}`;
		super(tex, x, y);
		this.health = (level + 2) * 10;
		this.storedHealth = this.health;
		this.funkyLevel = level;
		this.essential = false;

		this.storedTexture = tex;
		this.isRegenerating = false;

		//shine ani
		let anistr = `brick_shine_${level}`;
		this.addAnim("shine", anistr, 0.25);
		//regen ani
		anistr = `brick_regen_${level}`;
		let ani = this.addAnim("regen", anistr, 0.25);
		ani.onCompleteCustom = () => {
			this.setTexture(this.storedTexture);
		}

		this.brickType = "funky";
	}

	shouldBeRemoved(){
		return this.suppress && this.isRegenerating;
	}

	//set brick.suppress to true to kill it for good
	isDead(){
		return false;
	}

	//how do we kill it for good?
	kill(){
		this.stopAnim();
		this.isRegenerating = true;
		this.regenTimer = 4000;
		this.setTexture("brick_invis");
	}

	checkSpriteHit(sprite){
		if (this.isRegenerating)
			return [false];
		return super.checkSpriteHit(sprite);
	}

	takeDamage(damage, strength){
		if (this.isRegenerating)
			return;
		super.takeDamage(damage, strength);
		if (this.health <= 0){
			this.stopAnim();
			this.isRegenerating = true;
			this.regenTimer = 4000;
			this.setTexture("brick_invis");
		}
		else
			this.playAnim("shine");
	}

	update(delta){
		if (this.isRegenerating){
			this.regenTimer -= delta;
			if (this.regenTimer <= 0){
				this.isRegenerating = false;
				this.health = this.storedHealth;
				this.playAnim("regen");
			}
		}

		super.update(delta);
	}
}

class ShooterBrick extends FunkyBrick{
	constructor(x, y, level){
		//just ignore the previous constructor
		super(x, y, 0);

		let tex = `brick_main_8_${16+level}`;
		this.setTexture(tex);
		this.health = 100;
		this.armor = 2;
		this.score = 500;
		this.essential = false;
		this.storedHealth = this.health;
		this.level = level;

		this.storedTexture = tex;
		this.isRegenerating = false;

		//shine ani
		let anistr = `brick_shine_${20+level}`;
		this.addAnim("shine", anistr, 0.25);
		//regen ani
		anistr = `brick_regen_${3+level}`;
		let ani = this.addAnim("regen", anistr, 0.25);
		ani.onCompleteCustom = () => {
			this.setTexture(this.storedTexture);
		}

		this.brickType = "shooter";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (!this.isRegenerating && !this.hasFired){
			let tex = `laser_${3+this.level}`;
			let laser = new Projectile(tex, 0, 0, 0, -0.8);
			if (this.level == 1){
				laser.damage = 100;
			}
			else if (this.level == 2){
				laser.damage = 100;
				laser.strength = 1;
			}
			laser.moveTo(this.x-2, this.y - 8 - laser.height/2 - 2);
			game.emplace("projectiles", laser);
			//prevents brick from shooting multiple times
			//in a single frame
			this.hasFired = true;
		}
	}

	update(delta){
		this.hasFired = false;
		super.update(delta);
	}
}

class DetonatorBrick extends Brick{
	static data = {
		normal: 0,
		neo: 1,
		freeze: 2,
	};
	//detonator types: normal, neo, freeze
	constructor(x, y, detType="normal"){
		//base texture wont' mater because
		//this brick will always be animating
		super("brick_main_7_3", x, y);
		setConstructorInfo(this, DetonatorBrick, arguments);

		let i = DetonatorBrick.data[detType];
		
		this.addAnim("glow", `brick_glow_${i}`, 0.25, true);
		this.playAnim("glow");

		this.deathSound = null;

		this.detType = detType;
		this.brickType = "detonator";
	}

	//other powerups might call this
	//create explosion at location of obj
	static explode(obj, detType="normal"){
		//invisible explosion projectile
		let scale = (detType == "neo") ? 5 : 3;
		game.top.emplaceCallback(50, () => {
			game.emplace("projectiles", new Explosion(
				obj.x, 
				obj.y, 
				32*scale-1, 
				16*scale-1,
				(detType == "freeze")
			));
		});

		//explosion smoke particle
		let i = Math.floor(Math.random() * 4);
		let tex = `det_smoke_${detType}_${i}`;
		let smoke = new Particle(tex, obj.x, obj.y);
		smoke.setGrowth(0.01, -0.00002);
		smoke.setFade(0.005);
		game.emplace("particles", smoke);

		//explosion blast particle
		let blast = new Particle(null, obj.x, obj.y);
		if (detType == "neo")
			blast.scale.set(3);
		let anistr = [];
		let j = (detType == "freeze") ? 1 : 0;
		for (let i = 0; i < 7; i++)
			anistr.push(`det_blast_${i}_${j}`);
		blast.addAnim("blast", anistr, 0.5);
		blast.playAnim("blast");
		blast.dieOnAniFinish = true;
		game.emplace("particles", blast);

		//play sound
		if (detType == "freeze")
			playSound("detonator_ice");
		else
			playSound("detonator_explode");
	}

	onDeath(){
		super.onDeath();
		DetonatorBrick.explode(this, this.detType);
	}
}

class TriggerDetonatorBrick extends DetonatorBrick{
	constructor(x, y){
		super(x, y, "normal");
		setConstructorInfo(this, TriggerDetonatorBrick, arguments);

		this.stopAnim();
		this.removeAnim("glow");
		this.setTexture("brick_main_8_14");
		this.hitSound = null;
		this.deathSound = null;
		this.health = 10;
		this.armor = 1;
		this.active = false;
		this.addAnim("active", "brick_glow2_1", 0.125, true);
		this.brickType = "triggerdetonator";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (this.isDead()){
			playSound("detonator_explode");
			return;
		}
		if (this.active){
			this.active = false;
			this.stopAnim();
			playSound("brick_disarmed");
		}
		else{
			this.active = true;
			this.playAnim("active");
			let check = false;
			for (let br of game.get("bricks")){
				if (br != this &&
					br.brickType == "triggerdetonator" &&
					br.active){
					br.kill();
					this.kill();
					check = true;
					break;
				}
			}
			if (check)
				playSound("detonator_explode");
			else
				playSound("brick_armed");
		}
	}
}

class GlassBrick extends Brick{
	constructor(x, y){
		super("brick_main_7_4", x, y);

		setConstructorInfo(this, GlassBrick, arguments);

		this.health = 10;
		this.brickType = "glass";
	}

	onSpriteHit(obj, norm, mag){
		if (obj.gameType == "ball")
			obj.pierceOverride = true;
		super.onSpriteHit(obj, norm, mag);
	}
}

class IceBrick extends GlassBrick{
	constructor(x, y, texture){
		super(x, y);
		this.setTexture(texture);
		this.addChild(
			makeSprite("brick_main_7_4", 1, -8, -4));
		this.brickType = "ice";
	}

	onSpriteHit(obj, norm, mag){
		//ignore any freezing explosions
		if (obj.gameType == "projectile" &&
			obj.projectileType == "explosion"){
			if (obj.freeze)
				return;
		}
		super.onSpriteHit(obj, norm, mag);
	}
}

class AlienBrick extends Brick{
	static actionTimes = [
		0, 2500, 2000, 1500, 1000
	];

	constructor(x, y){
		super("brick_main_7_6", x, y);

		setConstructorInfo(this, AlienBrick, arguments);

		this.health = 50;
		for (let i = 0; i < 4; i++){
			let name = "alien_" + i;
			this.addAnim(name, name, 0.0625, true);
		}
		this.playAnim("alien_0");
		this.hitSound = "alien_hit";
		this.deathSound = "alien_death";
		this.healthLevel = 4;
		let times = AlienBrick.actionTimes;
		this.actionDelay = times[this.healthLevel];
		this.actionTimer = this.actionDelay;
		this.moveCount = 25;
		this.zIndex = 1;
		this.brickType = "alien";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		let level = Math.floor(this.health/10) - 1;
		level = Math.min(level, 4);
		if (level < this.healthLevel){
			this.healthLevel = level;
			let times = AlienBrick.actionTimes;
			this.actionDelay = times[level];
			if (level <= 0)
				this.stopAnim();
			else
				this.playAnim("alien_" + (4-level));
		}
	}

	takeAction(){
		let grid = game.top.brickGrid;
		let [i0, j0] = getGridPos(this.x, this.y);
		let cross = [];
		let diag = [];
		for (let i = i0-1; i <= i0+1; i++){
			for (let j = j0-1; j <= j0+1; j++){
				if (!boundCheck(i, j) || i > 32-8)
					continue;
				if (i == i0 && j == j0)
					continue;
				if (!grid.isEmpty(i, j))
					continue;
				if (i == i0 || j == j0)
					cross.push([i, j]);
				else
					diag.push([i, j]);
			}
		}

		if (cross.length > 0){
			let [i, j] = cross[randRange(cross.length)];
			let [x, y] = getGridPosInv(i, j);
			let br = new NormalBrick(this.x, this.y, 1, 0);
			br.zIndex = -1;
			br.setTravel(x, y, "time", 250);
			game.emplace("bricks", br);
			grid.reserve(i, j);
		}
		else if (diag.length > 0 && this.moveCount > 0){
			let select = null;
			if (this.prevMove){
				let prev = this.prevMove;
				for (let [i, j] of diag){
					if (i-i0 == prev[0] && j-j0 == prev[1]){
						select = [i, j];
						break;
					}
				}
			}
			if (!select)
				select = diag[randRange(diag.length)];

			let br = new NormalBrick(this.x, this.y, 0, 0);
			br.zIndex = -1;
			game.emplace("bricks", br);

			let [i, j] = select;
			let [x, y] = getGridPosInv(i, j);
			this.setTravel(x, y, "time", 250);
			grid.reserve(i, j);

			this.prevMove = [select[0]-i0, select[1]-j0];
			this.moveCount--;
		}
	}

	update(delta){
		if (this.healthLevel > 0){
			this.actionTimer -= delta;
			if (this.actionTimer <= 0){
				this.actionTimer += this.actionDelay;
				this.takeAction();
			}
		}

		super.update(delta);
	}
}

class RainbowBrick extends Brick{
	constructor(x, y){
		super("brick_main_7_7", x, y);
		this.brickType = "rainbow";
	}

	onDeath(){
		super.onDeath();

		setConstructorInfo(this, RainbowBrick, arguments);

		let grid = game.top.brickGrid;
		let empty = [];
		let [i0, j0] = getGridPos(this.x, this.y);
		for (let i = i0-1; i <= i0+1; i++){
			for (let j = j0-1; j <= j0+1; j++){
				if (i == i0 && j == j0)
					continue;
				if (grid.isEmpty(i, j))
					empty.push([i, j]);
			}
		}

		if (empty.length == 0)
			return;

		//remove 0 to n-1 elements from empty
		let numRemove = randRange(0, empty.length);
		for (let n = 0; n < numRemove; n++){
			let index = randRange(0, empty.length);
			empty.splice(index, 1);
		}

		for (let [i, j] of empty){
			let [x, y] = getGridPosInv(i, j);
			let br = new NormalBrick(this.x, this.y);
			br.zIndex = -1;
			br.setTravel(x, y, "time", 250);
			game.emplace("bricks", br);
		}
	}
}

class GateBrick extends Brick{
	constructor(x, y, gateId, exitOnly){
		let e = exitOnly ? 1 : 0;
		let tex = `brick_gate_${e}_${gateId}`;
		super(tex, x, y);
		this.health = 1000;
		this.armor = 1000;
		this.essential = false;
		this.gateId = gateId;
		this.exitOnly = exitOnly;

		this.ballQueue = [];
		this.ballDelay = 0;
		//keep track of recently exited balls
		this.recentBalls = new Map();
		this.disableOverlapCheck = true;

		//flashing animation
		let anistr = `gate_flash_${gateId}_${e}`;
		let ani = this.addAnim("flash", anistr, 0.25);
		ani.onCompleteCustom = () => {
			this.ejectBall();
		this.brickType = "gate";
		}
	}

	//ignore everything but balls
	checkSpriteHit(ball){
		if (this.exitOnly)
			return [false];
		if (ball.gameType != "ball")
			return [false];
		if (this.recentBalls.has(ball))
			return [false];
		return super.checkSpriteHit(ball);
	}

	onSpriteHit(ball, norm, mag){
		//prevent the ball from reentering this gate
		//for 3 seconds
		// this.recentBalls.set(ball, 3000);

		let regular = [];
		let dark = [];
		for (let br of game.get("bricks")){
			if (br != this && br.gateId == this.gateId){
				if (br.exitOnly)
					dark.push(br);
				else
					regular.push(br);
			}
		}

		let exits = (dark.length > 0) ? dark : regular;

		if (exits.length == 0)
			return;

		let gate = exits[randRange(exits.length)];
		gate.addToQueue(ball);
		playSound("gate_enter_1");
		playSound("gate_enter_2");
	}

	addToQueue(ball){
		this.ballQueue.push(ball);
		ball.moveTo(this.x, this.y);
		ball.teleporting = true;
		ball.visible = false;
	}

	//pop ball from queue and eject it from this gate
	ejectBall(){
		let ball = this.ballQueue.shift();
		this.recentBalls.set(ball, 3000);
		ball.teleporting = false;
		ball.visible = true;
	}

	update(delta){
		let recent = this.recentBalls;
		for (let [ball, time] of recent.entries()){
			time -= delta;
			if (time <= 0)
				recent.delete(ball);
			else
				recent.set(ball, time);
		}

		if (this.ballDelay > 0)
			this.ballDelay -= delta;
		else if (this.ballQueue.length > 0){
			this.ballDelay = 750;
			this.playAnim("flash");
		}

		super.update(delta);
	}
}

class CometBrick extends Brick{
	static data = {
		//dir: col
		left: 3,
		right: 4,
		horizontal: 5,
		vertical: 6
	};

	static rotation = {
		//dir: radians
		up: 0,
		down: Math.PI,
		right: Math.PI/2,
		left: -Math.PI/2
	};

	constructor(x, y, dir){
		//TODO: create a comet brick glow
		let tex;
		let col;
		if (dir == "up" || dir == "down"){
			tex = (dir == "up") ? "brick_main_12_20" : "brick_main_12_21";
		}
		else{
			col = CometBrick.data[dir];
			tex = `brick_idle_0_${col}`;
		}
		super(tex, x, y);
		setConstructorInfo(this, CometBrick, arguments);
		
		this.cometDir = dir;

		if (dir != "up" && dir != "down"){
			let anistr = `brick_glow_${col}`;
			this.addAnim("glow", anistr, 0.25, true, true);
		}

		this.brickType = "comet";
	}

	onDeath(){
		super.onDeath();
		switch (this.cometDir){
			case "left":
				this.fireComet("left");
				break;
			case "right":
				this.fireComet("right");
				break;
			case "up":
				this.fireComet("up");
				break;
			case "down":
				this.fireComet("down");
				break;
			case "vertical":
				this.fireComet("up");
				this.fireComet("down");
				break;
			case "horizontal":
				this.fireComet("left");
				this.fireComet("right");
				break;
		}
	}

	fireComet(dir){
		let rad = CometBrick.rotation[dir];
		let [vx, vy] = Vector.rotate(0, -1, rad);
		let [dx, dy] = Vector.rotate(0, -16, rad);
		let comet = new Projectile(
			"comet", this.x+dx, this.y+dy, vx, vy, rad
		);
		comet.damage = 100;
		comet.strength = 1;
		//TODO: Add brick overlap check for piercing
		comet.pierce = "strong";
		comet.emitterTimer = 0;
		comet.emitterDelay = 10;

		//give horizontal comets a shorter hitbox
		//the reason why this rectangle is like this is
		//because the original comet is vertical
		if (dir == "left" || dir == "right")
			comet.setShape(new RectangleShape(12, 32));

		comet.update = function(delta){
			this.emitterTimer -= delta;
			if (this.emitterTimer <= 0){
				this.emitterTimer += this.emitterDelay;
				let rad = Math.random() * 2 * Math.PI;
				let [vx, vy] = Vector.rotate(0.2, 0, rad);
				let p = new Particle(
					"comet_ember", this.x, this.y, vx, vy);
				p.floorCheck = true;
				p.ay = 0.0025;
				game.emplace("particles", p);
			}
			//call super
			Projectile.prototype.update.call(this, delta);
		}

		game.emplace("projectiles", comet);
	}
}

class LaserEyeBrick extends Brick{
	constructor(x, y){
		super("brick_main_7_14", x, y);
		setConstructorInfo(this, LaserEyeBrick, arguments);

		this.health = 20;
		this.addAnim("glow", "brick_glow2_0", 0.125, true);
		this.active = false;
		this.fireDelay = 3000;
		this.fireTimer = this.fireDelay;

		this.brickType = "lasereye";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (!this.active){
			this.active = true;
			this.playAnim("glow");
		}
	}

	fireLaser(){
		let paddle = game.get("paddles")[0];
		let vec = new Vector(
			paddle.x - this.x, paddle.y - this.y
		);
		vec = vec.normalized();
		vec = vec.scale(0.3);
		let laser = new Projectile(
			"lasereye_laser", this.x, this.y, vec.x, vec.y);
		laser.colFlag = {paddle: true};
		laser.hostile = true;
		laser.onPaddleHit = function(paddle){
			paddle.stun = {x: 0.25, timer: 1000};
			this.kill();
		};
		game.emplace("projectiles", laser);
	}

	update(delta){
		if (this.active){
			this.fireTimer -= delta;
			if (this.fireTimer <= 0){
				this.fireTimer = this.fireDelay;
				this.fireLaser();
			}
		}
		super.update(delta);
	}
}

class BoulderBrick extends Brick{
	constructor(x, y){
		super("brick_main_7_16", x, y);
		setConstructorInfo(this, BoulderBrick, arguments);

		this.health = 20;
		this.deathSound = "boulder_break";
		this.brickType = "boulder";
	}

	onDeath(){
		super.onDeath();
		if (this.suppress)
			return;
		for (let i = 0; i < 5; i++){
			let index = randRange(5);
			let rad = Math.random() * 2 * Math.PI;
			let [vx, vy] = Vector.rotate(0.1, 0, rad);
			let b = new Projectile(
				"boulder_" + i, this.x, this.y, vx, vy);
			b.ay = 0.001;
			b.createShape(true);
			b.colFlag = {paddle: true};
			b.hostile = true;
			b.onPaddleHit = function(paddle){
				paddle.stun = {x: 0.25, timer: 1000};
				this.colFlag.paddle = false;
				this.vy = -this.vy * 0.4;
			}
			game.emplace("projectiles", b);
		}
	}
}

class TikiBrick extends Brick{
	constructor(x, y){
		super("brick_main_8_11", x, y);
		this.health = 100;
		this.armor = 1;
		this.essential = false;
		this.hitCount = 0;

		this.addAnim("shine", "tiki_shine", 0.25);

		this.brickType = "tiki";
	}

	fireLaser(){
		let paddle = game.get("paddles")[0];
		let vec = new Vector(
			paddle.x - this.x, paddle.y - this.y
		);
		vec = vec.normalized();
		let vel = vec.scale(0.5);
		let off = vec.scale(12);
		let laser = new Projectile(
			"white_pixel",
			this.x + off.x, 
			this.y + off.y, 
			vel.x, 
			vel.y, 
			vec.getAngle(),
			24,
			4
		);
		laser.tint = 0xFFFF00;
		laser.colFlag = {paddle: true};
		laser.hostile = true;
		laser.onPaddleHit = function(paddle){
			paddle.incrementSize(-1);
			this.kill();
		};
		game.emplace("projectiles", laser);
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
		this.hitCount++;
		if (this.hitCount == 3){
			this.hitCount = 0;
			this.fireLaser();
		}
	}
}

class TriggerBrick extends Brick{
	//if forceOnOff is true, then all regular flip bricks
	//	will be set to on and all strong flip bricks
	// 	will be set to off
	static flipBricks(switchId, forceOnOff=false){
		for (let br of game.get("bricks")){
			let type = br.brickType;
			if (!(type == "flip" || type == "strongflip" || type == "laserwall"))
				continue;
			if (br.switchId === switchId)
				br.flip(forceOnOff);
		}
	}

	//permanently set all flip bricks on and strong flip bricks off
	//once all trigger and switch bricks of that color
	//are dead
	static flipFailSafe(switchId){
		let bricks = game.get("bricks");
		//check if all switch bricks are dead
		for (let br of bricks){
			let type = br.brickType;
			if (!(type == "trigger" || type == "switch"))
				continue;
			if (br.switchId !== switchId)
				continue;
			if (!br.isDead())
				return;
		}
		//force all flip bricks to on state
		TriggerBrick.flipBricks(switchId, true);
	}

	constructor(x, y, switchId){
		let tex = `brick_main_${8+switchId}_6`;
		super(tex, x, y);
		this.switchId = switchId;
		this.brickType = "trigger";
	}

	destructor(){
		super.destructor();
		TriggerBrick.flipFailSafe(this.switchId);
	}

	onDeath(){
		super.onDeath();
		TriggerBrick.flipBricks(this.switchId);
	}

}

class SwitchBrick extends Brick{
	constructor(x, y, switchId){
		let tex0 = `brick_main_${8+switchId}_4`;
		let tex1 = `brick_main_${8+switchId}_5`;
		super(tex0, x, y);
		this.switchId = switchId;
		this.flipState = false;
		this.texOff = tex0;
		this.texOn = tex1;
		this.health = 1000;
		this.armor = 2;
		this.essential = false;
		this.brickType = "switch";
	}

	destructor(){
		super.destructor();
		TriggerBrick.flipFailSafe(this.switchId);
	}

	flip(){
		this.flipState = !this.flipState;
		this.setTexture(
			this.flipState ? this.texOn : this.texOff
		);
	}

	onSpriteHit(sprite, norm, mag){
		super.onSpriteHit(sprite, norm, mag);
		if (sprite.gameType == "ball"){
			this.flip();
			TriggerBrick.flipBricks(this.switchId);
		}
	}

}

class FlipBrick extends Brick{
	constructor(x, y, switchId, flipState){
		let tex0 = `brick_main_${8+switchId}_0`;
		let tex1 = `brick_main_${8+switchId}_1`;
		super(flipState ? tex1 : tex0, x, y);
		this.switchId = switchId;
		this.flipState = flipState;
		this.texOff = tex0;
		this.texOn = tex1;
		this.brickType = "flip";
	}

	flip(forceOn){
		if (forceOn)
			this.flipState = true;
		else
			this.flipState = !this.flipState;
		this.setTexture(
			this.flipState ? this.texOn : this.texOff
		);
	}

	checkSpriteHit(sprite){
		if (!this.flipState)
			return [false];
		return super.checkSpriteHit(sprite);
	}
}

class StrongFlipBrick extends Brick{
	constructor(x, y, switchId, flipState){
		let tex0 = `brick_main_${8+switchId}_2`;
		let tex1 = `brick_main_${8+switchId}_3`;
		super(flipState ? tex1 : tex0, x, y);
		this.switchId = switchId;
		this.flipState = flipState;
		this.texOff = tex0;
		this.texOn = tex1;
		this.health = 100;
		this.armor = 1;
		this.essential = false;

		let anistr = `brick_shine_${15+switchId}`;
		this.addAnim("shine", anistr, 0.25);

		this.brickType = "strongflip";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
	}

	flip(forceOff){
		if (forceOff)
			this.flipState = false;
		else
			this.flipState = !this.flipState;
		this.setTexture(
			this.flipState ? this.texOn : this.texOff
		);
		this.stopAnim();
	}

	checkSpriteHit(sprite){
		if (!this.flipState)
			return [false];
		return super.checkSpriteHit(sprite);
	}
}

class OnixBrick extends Brick{
	static data = {
		up_left:    [4, 10, 20, [0,0,  32,0,  0,16]],
		up_right:   [3, 10, 19, [0,0,  32,0,  32,16]],
		down_left:  [2, 9, 20, [0,0,  32,16,  0,16]],
		down_right: [1, 9, 19, [32,0,  32,16,  0,16]],
		whole:      [0, 9, 18, [0,0,  32,0,  32,16,  0,16]],
	}

	constructor(x, y, dir){
		let [n, i, j, points] = OnixBrick.data[dir];
		let tex = `brick_main_${i}_${j}`;
		super(tex, x, y);
		this.setShape(new PolygonShape(points));
		this.health = 100;
		this.armor = 1;
		this.essential = false;

		let anistr = `onix_shine_${n}`;
		this.addAnim("shine", anistr, 0.25);

		this.brickType = "onix";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
	}
}

class ShoveBrick extends Brick{
	//recursively push bricks
	//make sure di and dj are not both 0
	static shove(i, j, di, dj){
		let grid = game.top.brickGrid.grid;
		let prevMove = true;
		while (prevMove && boundCheck(i, j)){
			prevMove = false;
			for (let br of grid[i][j]){
				if (!br.gridDat.move && br.armor <= 0){
					let [x, y] = getGridPosInv(i+di, j+dj);
					br.zIndex = -1;
					br.setTravel(x, y, "speed", 0.2);
					prevMove = true;
					break;
				}
			}
			i += di;
			j += dj;
		}
	}

	constructor(x, y, isRight){
		let tex = `brick_main_9_${isRight ? 10 : 11}`;
		super(tex, x, y);
		this.isRight = isRight;
		this.armor = 1;
		this.brickType = "shove";
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);

		if (this.isMoving())
			return;

		//to make this brick shoveable
		this.armor = 0;
		let [i, j] = getGridPos(this.x, this.y);
		let dj = this.isRight ? 1 : -1;
		ShoveBrick.shove(i, j, 0, dj);
		this.armor = 1;
	}


}

class FactoryBrick extends Brick{
	constructor(x, y){
		super("brick_shine_0_14", x, y);
		this.health = 70;
		this.cooldown = 0;
		for (let i = 0; i < 3; i++){
			let anistr =  `factory_shine_${i}`;
			this.addAnim("shine"+i, anistr, 0.25);
		}
		this.updateAppearance();
		this.brickType = "factory";
	}

	updateAppearance(){
		let off = 0;
		if (this.health <= 10)
			off = 2;
		else if (this.health <= 20)
			off = 1;

		this.hitAni = `shine${off}`;
		this.setTexture(`brick_shine_0_${14+off}`);
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.stopAnim();
		this.updateAppearance();
		this.playAnim(this.hitAni);
	}

	onSpriteHit(obj, norm, mag){
		super.onSpriteHit(obj, norm, mag);
		if (obj.gameType == "ball"){
			let side = Brick.getHitSide(norm);
			this.generateBrick(side);
		}
	}

	//brick comes out from the opposite side
	generateBrick(side){
		if (this.cooldown > 0 || this.isMoving())
			return;
		this.cooldown = 500;

		let br = new NormalBrick(this.x, this.y);
		let dat = {
			//dir: [di, dj, dx, dy]
			up:    [ 1,  0,   0,  16],
			down:  [-1,  0,   0, -16],
			left:  [ 0,  1,  32,   0],
			right: [ 0, -1, -32,   0],
		};
		let [di, dj, dx, dy] = dat[side];
		br.zIndex = -1;
		br.setTravel(this.x + dx, this.y + dy, "speed", 0.2);
		game.emplace("bricks", br);
		let [i, j] = getGridPos(this.x, this.y);
		//shove the rest of the bricks
		ShoveBrick.shove(i+di, j+dj, di, dj);
	}

	update(delta){
		if (this.cooldown > 0)
			this.cooldown -= delta;
		super.update(delta);
	}
}

class ShoveDetonatorBrick extends Brick{
	constructor(x, y){
		super("brick_main_8_10", x, y);
		setConstructorInfo(this, ShoveDetonatorBrick, arguments);
		this.addAnim("glow", "brick_glow_7", 0.25, true, true);
		this.brickType = "shovedetonator";
	}

	/* Shove Algorithm
		1. create a list of empty "plan b" spaces that
		   does not include spaces near the shove detonator
		2. shove each adjacent brick outward
			2a. if destination is blocked, assign a custom
			    onComplete function that will move the brick
			    to one of the "plan b" spaces
	*/
	onDeath(){
		super.onDeath();
		let brickGrid = game.top.brickGrid;
		let [i0, j0] = getGridPos(this.x, this.y);
		//hash function
		let h = (i, j) => i + "_" + j;
		//get empty spaces
		let empty = {};
		for (let i = 0; i < 32; i++){
			for (let j = 0; j < 13; j++){
				if (brickGrid.isEmpty(i, j))
					empty[h(i, j)] = [i, j];
			}
		}
		
		//remove spaces in a 5x5 square around the detonator
		for (let i = i0-2; i <= i0+2; i++){
			for (let j = j0-2; j <= j0+2; j++){
				if (boundCheck(i, j))
					delete empty[h(i, j)];
			}
		}

		//helper function
		//get closest space to coordinates and remove from empty
		let getClosest = function(i0, j0){
			let closest = null;
			let minDist = Infinity;
			for (let value of Object.values(empty)){
				let [i, j] = value;
				let dist = (i-i0) ** 2 + (j-j0) ** 2;
				if (dist < minDist){
					minDist = dist;
					closest = value;
				}
			}
			if (closest){
				let [i, j] = closest;
				delete empty[h(i, j)];
				let pos = getGridPosInv(i, j);
				// console.log("closest " + closest);
				return pos;
			}
			return [null, null];
		};
		//shove all adjacent bricks
		for (let di = -1; di <= 1; di++){
			for (let dj = -1; dj <= 1; dj++){
				let i1 = i0 + di;
				let j1 = j0 + dj;
				if (di == 0 && dj == 0)
					continue;
				if (!boundCheck(i1, j1))
					continue;
				for (let br of brickGrid.grid[i1][j1]){
					if (br.gridDat.move)
						continue;
					if (br.armor > 0)
						continue;
					let i2 = i1 + di;
					let j2 = j1 + dj;
					//check if space is occupied
					let onComplete = null;
					if (brickGrid.isEmpty(i2, j2))
						brickGrid.reserve(i2, j2);
					else{
						let [x2, y2] = getClosest(i2+di, j2+dj);
						if (x2 === null){
							onComplete = function(brick){
								brick.kill();
							};
						}
						else{
							onComplete = function(brick){
								brick.setTravel(x2, y2, "speed", 0.3);
								//reserve?
							};
						}
						
					}
					let [x, y] = getGridPosInv(i2, j2);
					br.zIndex = 1;
					br.setTravel(x, y, "speed", 0.3, onComplete);
					break;
				}
			}
		}
	}
}

class SequenceBrick extends Brick{
	constructor(x, y, sequenceId){
		let tex = `brick_main_11_${15+sequenceId}`;
		super(tex, x, y);
		this.health = 10;
		this.armor = 1;
		this.sequenceId = sequenceId;
		this.brickType = "sequence";
	}

	destructor(){
		super.destructor();
		SequenceBrick.updateBricks(game.get("bricks"));
	}

	static activate(playstate){
		SequenceBrick.updateBricks(playstate.get("bricks"));
	}

	//change every sequence brick's armor and tint based
	//on which sequence bricks remain
	static updateBricks(bricks){
		let sequence = [];
		let min_id = 4;
		for (let br of bricks){
			if (br instanceof SequenceBrick && !br.isDead()){
				sequence.push(br);
				min_id = Math.min(br.sequenceId, min_id);
			}
		}
		for (let br of sequence){
			let delta = br.sequenceId - min_id;
			br.armor = (delta == 0) ? 0 : 1;
			let mag = (delta == 0) ? 0 : 128; //should be in range (0, 255)
			br.tint = 0xFFFFFF - (mag * 0x010101);
		}

	}
}

class SlotMachineBrick extends Brick{
	//the slot machine's index doesn't have to be constant
	//but must vary between brick
	static globalIndex = 0;

	static initialize(playstate){
		let slotPowerups = playstate.level.slotPowerups;
		if (!slotPowerups)
			return;

		let blueIndex = 0;
		let yellowIndex = 0;
		for (let br of playstate.get("bricks")){
			if (!(br instanceof SlotMachineBrick))
				continue;
			if (br.isYellow){
				br.powIds = slotPowerups[1];
				br.powIndex = yellowIndex;
				yellowIndex = (yellowIndex + 1) % 3;
			}
			else{
				br.powIds = slotPowerups[0];
				br.powIndex = blueIndex;
				blueIndex = (blueIndex + 1) % 3;
			}
			br.setTurn();
		}
	}

	//must be activated by calling SlotMachineBrick.initialize() right before the game starts
	constructor(x, y, isYellow){
		super("brick_invis", x, y);

		this.health = 1000;
		this.armor = 2;
		this.isYellow = isYellow;
		// this.powIds = slotPowerups[isYellow ? 1 : 0];
		// this.powIndex = SMB.globalIndex;
		// SMB.globalIndex = (SMB.globalIndex+1) % 3;
		this.turnTime = 500;
		this.checkTime = 500;

		//"turning", "checking", "idle";
		this.state = "idle";

		let powerups = new PIXI.Container();
		this.top = new Sprite("powerup_default_0");
		this.bottom = new Sprite("powerup_default_0");
		this.top.scale.set(1);
		this.bottom.scale.set(1);
		powerups.addChild(this.top, this.bottom);
		// this.setTurn();

		powerups.mask = new Mask(this.x-16, this.y-8, 32, 16);
		this.addChild(powerups);

		let j = isYellow ? 1 : 0;
		this.frame0 = new Sprite("brick_slot_0_"+j);
		this.frame1 = new Sprite("brick_slot_1_"+j);
		this.frame0.scale.set(1);
		this.frame1.scale.set(1);
		this.frame0.visible = true;
		this.frame1.visible = false;
		this.addChild(this.frame0);
		this.addChild(this.frame1);
		this.aniTime = 150;
		this.aniTimer = 0; 

		this.brickType = "slotmachine";
	}

	//sets up the powerup sprites for the next turn
	setTurn(){
		let curr = this.powIndex;
		let next = (curr+1) % 3;
		let topId = this.powIds[curr];
		let bottomId = this.powIds[next];

		this.top.setTexture("powerup_default_" + topId);
		this.bottom.setTexture("powerup_default_" + bottomId);
		this.top.y = 0;
		this.bottom.y = 8;
	}


	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (this.state != "turning"){
			this.state = "turning";
			this.turnTimer = this.turnTime;
			this.powIndex = (this.powIndex+1) % 3;
			this.aniTimer = 0;
		}
	}

	update(delta){
		if (this.state == "turning"){
			let ratio = this.turnTimer / this.turnTime;
			this.top.y = -8 * (1-ratio);
			this.bottom.y = this.top.y + 8;
			this.turnTimer -= delta;
			if (this.turnTimer <= 0){
				this.state = "checking";
				this.checkTimer = this.checkTime;
				this.setTurn();
				this.frame0.visible = true;
				this.frame1.visible = false;
			}

			this.aniTimer -= delta;
			if (this.aniTimer <= 0){
				this.aniTimer = this.aniTime;
				this.frame0.visible = !this.frame0.visible;
				this.frame1.visible = !this.frame1.visible;
			}

		}
		else if (this.state == "checking"){
			this.checkTimer -= delta;
			if (this.checkTimer <= 0){
				this.state = "idle";
				let sameBricks = [this];
				let allSame = true;
				for (let br of game.get("bricks")){
					if (br === this)
						continue;
					if (br.brickType != "slotmachine")
						continue;
					if (br.isYellow !== this.isYellow)
						continue;
					sameBricks.push(br);
					if (br.state == "turning" ||
						br.powIndex != this.powIndex){
						allSame = false;
						break;
					}
				}
				if (allSame){
					for (let br of sameBricks)
						br.kill();
					let pow = new Powerup(
						this.x, this.y, this.powIds[this.powIndex]);
					game.emplace("powerups", pow);
				}
			}
		}
		//idle state does nothing
		super.update(delta);
	}
}
var SMB = SlotMachineBrick; //shorter alias

class LauncherBrick extends Brick{
	//ccw means counter-clockwise
	constructor(x, y, left, ccw){
		super("brick_invis", x, y);
		setConstructorInfo(this, LauncherBrick, arguments);

		this.launchIndex = (left) ? 8 : 0;
		this.launchDelta = (ccw) ? -1 : 1;
		this.updateAppearance();
		this.spinDelay = 200;
		this.spinTimer = this.spinDelay;
		this.brickType = "launcher";
	}

	updateAppearance(){
		let index = this.launchIndex;
		let i = 10 + Math.floor(index / 8);
		let j = 7 + (index % 8);
		this.setTexture(`brick_main_${i}_${j}`);
	}

	onDeath(){
		super.onDeath();
		let rad = this.launchIndex * Math.PI / 8;
		let [vx, vy] = Vector.rotate(0.5, 0, rad);
		let p = new Projectile(
			this.texture, this.x, this.y, vx, vy
		);
		p.damage = 100;
		p.strength = 1;
		p.pierce = true;
		game.emplace("projectiles", p);
	}

	update(delta){
		this.spinTimer -= delta;
		if (this.spinTimer <= 0){
			this.spinTimer = this.spinDelay;
			this.launchIndex += this.launchDelta + 16;
			this.launchIndex %= 16;
			this.updateAppearance();
		}
		super.update(delta);
	}
}

class TwinLauncherBrick extends Brick{
	constructor(x, y, isYellow){
		let i = isYellow ? 1 : 0;
		super(`brick_main_9_${12+i}`, x, y);
		setConstructorInfo(this, TwinLauncherBrick, arguments);

		this.activeTexture = `brick_main_9_${14+i}`;
		this.health = 100;
		this.armor = 1;
		this.active = false;
		this.isYellow = isYellow;
		this.addAnim("active", `brick_glow2_${2+i}`, 0.125, true);
		this.brickType = "twinlauncher";
	}

	launchTo(brick){
		if (this.isDead())
			return;
		let vec = new Vector(brick.x - this.x, brick.y - this.y);
		vec = vec.normalized();
		vec = vec.scale(0.5);
		if (this.isYellow === brick.isYellow)
			vec = vec.scale(-1);
		let p = new Projectile(
			this.activeTexture, this.x, this.y, vec.x, vec.y
		);
		p.damage = 100;
		p.strength = 1;
		p.pierce = true;
		p.isTwinLauncher = true;
		let superUpdate = p.update;
		p.update = function(delta){
			for (let p of game.get("projectiles")){
				if (p == this)
					continue;
				if (!p.isTwinLauncher)
					continue;
				if (this.checkOverlap(p)){
					this.kill();
					p.kill();
				}
			}
			superUpdate.call(this, delta);
		}
		game.emplace("projectiles", p);
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		if (this.active){
			this.active = false;
			this.stopAnim();
			playSound("brick_disarmed");
		}
		else{
			this.active = true;
			this.playAnim("active");
			playSound("brick_armed");
			for (let br of game.get("bricks")){
				if (br == this)
					continue;
				if (br.brickType != "twinlauncher")
					continue;
				if (br.active){
					this.launchTo(br);
					br.launchTo(this);
					this.kill();
					br.kill();
				}
			}
		}
	}
}

class ParachuteBrick extends Brick{
	//Parachute is a component just like a ball powerup
	static Parachute = class{
		constructor(ball){
			this.ball = ball;
			ball.setVel(0, ball.getSpeed());
			this.speed = 0.15; //0.2

			this.frames = [2, 3, 4, 3, 2, 1, 0, 1];
			this.index = 0;
			this.aniDelay = 250;
			this.aniTimer = this.aniDelay;
			this.pos = [ball.x, ball.y];
			let off = {
				2: [0, 0],
				1: [-4, -2],
				0: [-8, -4]
			};
			off[3] = [-off[1][0], off[1][1]];
			off[4] = [-off[0][0], off[0][1]];
			this.off = off;

			let para = new Sprite("parachute_2");
			para.setPos(ball.x, ball.y);
			this.paraSprite = para;
			game.emplace("ball_underlay", para);
		}

		destructor(){
			// let ball = this.ball;
			// ball.moveTo(...this.pos);
			this.paraSprite.kill();
		}

		update(delta){
			let ball = this.ball;
			let pos = this.pos;
			pos[1] += this.speed * delta;
			let r = ball.shape.radius;

			let disable_pit = cheats.get("disable_pit");
			if ((disable_pit && pos[1] + r > DIM.h) ||
				(!disable_pit && pos[1] - r > DIM.h))
			{
				this.destructor();
				delete ball.parachute;
				return;
			}

			let para = this.paraSprite;
			let frames = this.frames;
			para.setPos(pos[0], pos[1] - 16);
			this.aniTimer -= delta;
			if (this.aniTimer <= 0){
				this.aniTimer += this.aniDelay;
				this.index = (this.index + 1) % frames.length;
				let tex = "parachute_" + frames[this.index];
				para.setTexture(tex);
			}
			//animation
			let off = this.off[frames[this.index]];
			ball.moveTo(pos[0] + off[0], pos[1] + off[1]);
		}

		onPaddleHit(){
			this.destructor();
			delete this.ball.parachute;
		}
	};

	constructor(x, y){
		super("brick_main_9_7", x, y);
		setConstructorInfo(this, ParachuteBrick, arguments);
		this.brickType = "parachute";
	}

	onSpriteHit(obj, norm, mag){
		super.onSpriteHit(obj, norm, mag);
		if (obj.gameType == "ball"){
			let ball = obj;
			if (!ball.parachute)
				ball.parachute = new ParachuteBrick.Parachute(ball);
		}
	}

}

class SplitBrick extends Brick{
	constructor(x, y, isBlue){
		let i = isBlue ? 18 : 17;
		super(`brick_main_12_${i}`, x, y);
		setConstructorInfo(this, SplitBrick, arguments);
		this.isBlue = isBlue;

		if (isBlue){
			//the red brick has to manually call these
			//animations
			let ani1, ani2;
			ani1 = this.addAnim("spawn_left", "split_blue_left", 0.25);
			ani2 = this.addAnim("spawn_right", "split_blue_right", 0.25);
			this.addAnim("glow", "split_glow_blue", 0.25, true);
			for (let ani of [ani1, ani2]){
				ani.onCompleteCustom = () => {
					this.playAnim("glow");
					this.intangible = false;
				};
			}
		}
		else{
			this.addAnim("glow", `split_glow_red`, 0.25, true);
			this.playAnim("glow");
			this.deathSound = "brick_divide";
		}

		this.brickType = "split";
	}

	onDeath(){
		super.onDeath();
		if (this.isBlue)
			return;

		let redSplit = new Particle("brick_invis", this.x, this.y);
		redSplit.addAnim("split", "split_red", 0.25, false, true);
		redSplit.dieOnAniFinish = true;
		game.emplace("particles", redSplit);

		let brickGrid = game.top.brickGrid;
		let [i, j0] = getGridPos(this.x, this.y);
		for (let j = j0-1; j <= j0+1; j+=2){
			if (!boundCheck(i, j) || !brickGrid.isEmpty(i, j))
				continue;
			let [x, y] = getGridPosInv(i, j);
			let blue = new SplitBrick(x, y, true);
			if (j < j0)
				blue.playAnim("spawn_left");
			else
				blue.playAnim("spawn_right");
			blue.intangible = true;
			game.emplace("bricks", blue);
		}
	}
}

class PowerupBrick extends Brick{
	constructor(x, y, powId){
		super("powerup_default_" + powId, x, y);
		setConstructorInfo(this, PowerupBrick, arguments);

		let overlay = new Sprite("brick_main_7_4");
		overlay.scale.set(1);
		overlay.alpha = 0.5;
		this.addChild(overlay);
		this.powId = powId;

		this.brickType == "poewrup";
	}

	onDeath(){
		super.onDeath();
		let pow = new Powerup(this.x, this.y, this.powId);
		game.emplace("powerups", pow);
	}
}

class FuseBrick extends Brick{
	constructor(x, y){
		super("brick_main_7_3", x, y);
		setConstructorInfo(this, FuseBrick, arguments);

		this.brickType = "fuse";
	}

	static delay = 50;

	static canDestroy(brick){
		if (brick.armor == 1)
			return true;
		let brickType = brick.brickType;
		if (brickType == "shovedetonator")
			return false;
		return !!explosiveLookup[brick.brickType];
	}

	static propagate(brick, initial=false){
		if (brick.isDead() && !initial)
			return;

		let grid = game.top.brickGrid;
		brick.kill();
		let [i0, j0] = getGridPos(...brick.getPos());
		let coords = [[i0,j0+1], [i0,j0-1], [i0+1,j0], [i0-1,j0]];
		for (let [i, j] of coords){
			if (!boundCheck(i, j))
				continue;
			let br = grid.getStatic(i, j);
			if (!br || br.isDead())
				continue;
			if (!FuseBrick.canDestroy(br))
				continue;
			game.top.emplaceCallback(FuseBrick.delay, () => {
				FuseBrick.propagate(br);
			});
		}
	}

	onDeath(){
		super.onDeath();
		FuseBrick.propagate(this, true);
	}
}

class ResetBrick extends TriggerBrick{
	constructor(x, y, switchId){
		super(x, y, switchId);
		this.brickType = "reset";
	}

	onDeath(){
		Brick.prototype.onDeath.call(this);
		TriggerBrick.flipBricks(this.switchId, true);
	}
}

class SlimeBrick extends Brick{
	static spreadDelay = 1000;
	static spreadChance = 0.25;
	static transformDelay = 100;

	constructor(x, y){
		super("brick_main_6_19", x, y);

		this.spreadTimer = SlimeBrick.spreadDelay;
		this.transformTimer = null;
		this.transformTarget = null;

		this.tint = 0x00FF00;

		this.brickType = "slime";
	}

	//when spreading to an existing brick, immediately trigger 
	//transformation and do a fake spread using particles
	update(delta){
		if (this.transformTarget){
			this.transformTimer -= delta;
			if (this.transformTimer <= 0){
				this.kill();
				let br = this.transformTarget.clone();
				br.setPos(...this.getPos());
				game.emplace("bricks", br);
			}
		}
		else{
			this.spreadTimer -= delta;
			if (this.spreadTimer <= 0){
				this.spreadTimer = SlimeBrick.spreadDelay;
				if (Math.random() < SlimeBrick.spreadChance)
					this.spreadOrTransform();
			}
		}

		super.update(delta);
	}

	//Will first check if there is a suitable adjacent brick
	//to transform to. Otherwise, will spread to empty adjacent brick.
	static crossOffsets = [[1,0], [-1,0], [0,1], [0,-1]];

	static canTransformTo(br){
		if (br.brickType == "slime")
			return false;
		return br.armor < 1;
	}
	spreadOrTransform(){
		let grid = game.top.brickGrid;

		let [i0, j0] = getGridPos(...this.getPos());

		let transformTargets = [];
		let spreadTargets = [];
		for (let [di, dj] of SlimeBrick.crossOffsets){
			let i = i0 + di;
			let j = j0 + dj;
			if (!boundCheck(i, j))
				continue;
			if (grid.isEmpty(i, j))
				spreadTargets.push([i, j]);
			else{
				let br = grid.getStatic(i, j);
				if (br && SlimeBrick.canTransformTo(br))
					transformTargets.push(br);
			}
		}

		if (transformTargets.length > 0){
			let index = randRange(transformTargets.length);
			let brick = transformTargets[index];
			this.transformAllSlime(brick, grid);
		}

		else if (spreadTargets.length > 0){
			let [i, j] = spreadTargets[randRange(spreadTargets.length)];
			let br = new SlimeBrick(...this.getPos());
			br.zIndex = -1;
			let [x, y] = getGridPosInv(i, j);
			br.setTravel(x, y, "time", 250);
			game.emplace("bricks", br);
			grid.reserve(i, j);
		}
	}

	//transform itself and all connecting slime to the target brick
	transformAllSlime(brick, grid){
		const delay = SlimeBrick.transformDelay;

		//temporary measure - delete all new slime bricks
		remove_if(
			game.top.newObjects.bricks, br => br.brickType == "slime")

		this.transformTarget = brick;
		this.transformTimer = delay;
		this.tint = 0xFFFF00;

		let stack = [[this, delay]]; //[slimeBrick, tranformDelay]

		while (stack.length > 0){
			// console.log("stack: " + stack.length);
			let [slime, time] = stack.shift();
			let [i0, j0] = getGridPos(...slime.getPos());
			for (let [di, dj] of SlimeBrick.crossOffsets){
				let i = i0 + di;
				let j = j0 + dj;
				if (!boundCheck(i, j))
					continue;
				for (let br of grid.get(i, j)){
					if (br.brickType == "slime" && !br.transformTarget){
						br.transformTarget = brick;
						br.transformTimer = time + delay;
						br.tint = 0xFFFF00;
						stack.push([br, time + delay]);
					}
				}
			}
		}
	}
}

class ScatterBombBrick extends Brick{
	constructor(x, y){
		super("brick_main_12_22", x, y);

		this.addAnim("glow", "scatter_glow", 1/8, true, true);

		this.brickType = "scatterbomb";
	}

	onDeath(){
		super.onDeath();

		let blast = new Particle(null, this.x, this.y);
		blast.addAnim("blast", "scatter_explosion", 1/2, false, true);
		blast.dieOnAniFinish = true;
		game.emplace("particles", blast);

		//Any brick the Explosion hits will be placed into an array
		//Then new bricks will spawn at the location of those bricks
		let exp = new Explosion( this.x, this.y, 32*3-1, 16*3-1);
		game.top.emplaceCallback(50, () => {
			game.emplace("projectiles", exp);
		});

		let delay = 4.2 * 1000/30; //spawn bricks just before the end of the explosion animation
		let [i0, j0] = getGridPos(this.x, this.y);
		let grid = game.top.brickGrid;
		game.top.emplaceCallback(delay, () => {
			for (let di = -1; di <= 1; di++){
				for (let dj = -1; dj <= 1; dj++){
					let i = i0 + di;
					let j = j0 + dj;
					if (boundCheck(i, j) && grid.isEmpty(i, j)){
						let [x, y] = getGridPosInv(i, j);
						game.emplace("bricks", new ScatterBrick(x, y));
						grid.reserve(i, j);
					}
				}
			}
		});

		// let hitBlacklist = generateLookup([
		// 	"normal",
		// ]);

		// let transformBlacklist = generateLookup([
		// 	"normal",
		// 	"scatterbomb",
		// ]);

		// exp.canHit = function(sprite){
		// 	if (!(sprite instanceof Brick))
		// 		return false;
		// 	return !hitBlacklist[sprite.brickType];
		// };

		// exp.onSpriteHit = function(obj, norm, mag){
		// 	Explosion.prototype.onSpriteHit.call(this, obj, norm, mag);
		// 	if (!obj.isDead())
		// 		return;
		// 	if (!(obj instanceof Brick))
		// 		return;
		// 	if (transformBlacklist[obj.brickType])
		// 		return;
		// 	let br = new NormalBrick(obj.x, obj.y);
		// 	game.emplace("bricks", br);
		// };
		
	}
}

class ScatterBrick extends Brick{
	constructor(x, y){
		super("brick_invis", x, y);
		this.intangible = true;
		let ani = this.addAnim("spawn", "scatter_spawn", 1/4, false, true);
		ani.onCompleteCustom = () => {
			this.setTexture("brick_main_12_23");
		};
		ani.onFrameChangeCustom = (index) => {
			if (index == 4)
				this.intangible = false;
		};
		this.brickType = "scatter";
	}
}

class LaserGateBrick extends Brick{
	static thickness = 10;
	static hitboxThickness = 10;

	//link bricks based on playstate.level.edgess
	static activate(playstate){
		let edges = playstate.level.lasers;
		if (!edges)
			return;

		//create lookup table for all LaserGateBricks
		let lookup = new Map();
		for (let br of playstate.get("bricks")){
			if (br instanceof LaserGateBrick){
				let {i, j} = br.initialParams;
				lookup.set(`${i}_${j}`, br);
			}
		}

		//link all edges
		for (let [i0, j0, i1, j1] of edges){
			let br0 = lookup.get(`${i0}_${j0}`);
			let br1 = lookup.get(`${i1}_${j1}`);
			if (!br0 || !br1)
				console.error("Invalid Laser Gate Edges!");
			LaserGateBrick.link(playstate, br0, br1);
		}
	}

	//create laser linking two bricks together
	static laserOffset = 42;
	static link(playstate, br1, br2){
		//make sure br2 is always below br1
		if (br1.y > br2.y)
			[br1, br2] = [br2, br1];
		//get midpoint
		const off = -1;
		let [x1, y1] = br1.getPos();
		let [x2, y2] = br2.getPos();
		x1 += off;
		y1 += off;
		x2 += off;
		y2 += off;
		let length = Vector.dist(x1, y1, x2, y2);
		let angle = Vector.angleBetween(1, 0, x2-x1, y2-y1);

		//first create sprite without any rotation
		let laser = new Sprite(
			"laser_laser_" + br1.switchId,
			(x1+x2) / 2,
			(y1+y2) / 2,
			0,
			0,
			0,
			Math.max(4, length - LaserGateBrick.laserOffset),
			2,
		);
		laser.update = function(delta){
			if (this.intangible)
				return;
			for (let ball of game.get("balls")){
				let [check, norm, mag] = ball.checkCollision(this);
				if (check){
					let offset = norm.scale(mag);
					ball.translate(offset.x, offset.y);
					ball.handleCollision(norm.x, norm.y);
				}
			}
		};
		laser.setState = function(state){
			if (state){
				this.intangible = false;
				this.visible = true;
			}
			else{
				this.intangible = true;
				this.visible = false;
			}
		};
		laser.intagible = false;
		//give sprite a shape that's independent from the
		//sprite's size
		laser.setShape(new RectangleShape(length, 10));
		laser.setRotation(angle);
		playstate.add("specials2", laser);

		if (!br1.flipState)
			laser.setState(false);

		br1.addTurret(angle);
		br2.addTurret(angle + Math.PI);
		br1.lasers.push(laser);
		br2.lasers.push(laser);
	}

	//for use in EditorState only
	static editorDrawLaser(i0, j0, i1, j1, switchId){
		if (i0 > i1)
			[i0, j0, i1, j1] = [i1, j1, i0, j0];

		let [x1, y1] = getGridPosInv(i0, j0);
		let [x2, y2] = getGridPosInv(i1, j1);
		
		//get midpoint
		const off = -1;
		x1 += off;
		y1 += off;
		x2 += off;
		y2 += off;
		let length = Vector.dist(x1, y1, x2, y2);
		let angle = Vector.angleBetween(1, 0, x2-x1, y2-y1);

		//first create sprite without any rotation
		let laser = new Sprite(
			"laser_laser_" + switchId,
			(x1+x2) / 2,
			(y1+y2) / 2,
			0,
			0,
			angle,
			Math.max(4, length),
			2,
		);
		
		return laser;
	}

	//switchId is same as Switch/Trigger/Flip bricks
	constructor(x, y, switchId, initialState){
		let index = switchId * 2;
		let textures = {
			core_on: "laser_core_" + index,
			core_off: "laser_core_" + (index + 1),
			gun_on: "laser_turret_" + index,
			gun_off: "laser_turret_" + (index + 1),
		};

		super("brick_laser_0_" + switchId, x, y);
		this.laserTextures = textures;

		this.health = 9999;
		this.armor = 3;
		this.intangible = true;
		
		this.switchId = switchId;
		this.laserState = true;
		this.flipState = !!initialState;

		//add a circular hitbox right at the center (DEPRECATED?)
		// let radius = LaserGateBrick.thickness/2;
		// let circle = new CircleShape(this.x-2, this.y-2, radius);
		// this.circleHitbox = circle;

		this.turrets = new PIXI.Container();
		this.addChild(this.turrets);
		let str = initialState ? "on" : "off";
		this.core = new Sprite(textures["core_" + str], -0.5, -0.5, 0, 0, 0, 1, 1);
		this.addChild(this.core);

		//will be set externally
		this.lasers = [];

		this.essential = false;
		this.brickType = "laserwall";
	}

	addTurret(angle){
		let str = this.flipState ? "on" : "off";
		let tex = this.laserTextures;
		let gun = new Sprite(tex["gun_"+str], -0.5, -0.5, 0, 0, angle, 1, 1);
		this.turrets.addChild(gun);
	}

	flip(forceOff){
		if (forceOff)
			this.flipState = false;
		else
			this.flipState = !this.flipState;

		let str = this.flipState ? "on" : "off";
		let tex = this.laserTextures;
		for (let gun of this.turrets.children)
			gun.setTexture(tex["gun_" + str]);
		this.core.setTexture(tex["core_" + str]);

		for (let laser of this.lasers)
			laser.setState(this.flipState);
	}

	update(delta){
		if (this.flipState && this.lasers.length > 0){
			for (let ball of game.get("balls")){
				let [check, norm, mag] = ball.shape.collide(this.shape);
				if (check){
					let offset = norm.scale(mag);
					ball.translate(offset.x, offset.y);
					ball.handleCollision(norm.x, norm.y);
				}
			}
		}
		super.update(delta);
	}
}

//call this after all brick classes has been defined
initBrickClasses();