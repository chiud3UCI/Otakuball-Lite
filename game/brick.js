//NOTE: Rememember to add all the classes to brickClasses
//		at the bottom of this file

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
		}

		this.travel = null;

		this.health = 10;
		this.armor = 0;

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

	//x and y are the destination coordinates
	//mode can either be "speed" or "time"
	//onComplete can either be a string or function
	setTravel(x, y, mode="speed", value, onComplete){
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
					brick.moveTo(this.x, this.y);
					if (this.onComplete)
						this.onComplete(brick);
					brick.travel = null;
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
		//check both movement patch and velocity
		return (this.patch.move || this.vx || this.vy);
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
	checkSpriteHit(obj){
		let resp = super.checkSpriteHit(obj);
		if (!resp[0])
			return [false];
		if (obj.gameType == "ball" || obj.gameType == "menacer"){
			let norm = resp[1];
			if (!obj.validCollision(norm.x, norm.y))
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
		if (strength >= this.armor){
			this.health -= damage;
		}
		if (this.health <= 0)
			playSound(this.deathSound);
		else
			playSound(this.hitSound);
	}

	isDead(){
		return (this.health <= 0);
	}

	kill(){
		this.health = 0;
	}

	update(delta){
		if (this.travel)
			this.travel.update(delta);
		super.update(delta);
	}
}

class NullBrick extends Brick{
	constructor(x, y){
		super("brick_invis", x, y);
	}

	isDead(){
		return true;
	}

	checkSpriteHit(obj){
		return [false];
	}
}

class NormalBrick extends Brick{
	constructor(x, y, i, j){
		let tex = "brick_main_" + i + "_" + j;
		super(tex, x, y);
		this.normalInfo = {i, j};

		this.brickType = "normal";
	}
}

class MetalBrick extends Brick{
	//level should be [1-6]
	constructor(x, y, level){
		let j = level;
		let str = "brick_main_6_" + j;
		super(str, x, y);

		let anistr = `brick_shine_${3+level}`;
		this.addAnim("shine", anistr, 0.25);

		this.level = level;
		this.health = (level + 1) * 10;

		this.brickType = "metal";
	}

	//static because GreenMenacerBrick will also use this
	static setCoating(brick, oldBrick){
		let coat = 2;
		if (brick.brickType == "metal"){
			if (brick.level == 1)
				coat = 0;
			else if (brick.level == 2)
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
		this.plated = plated;
		this.health = 100;
		this.armor = 1;

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

		if (gold){
			this.health = 100;
			this.armor = 1;
			let j = fast ? 11 : 12;
			let anistr = "brick_shine_" + j;
			this.addAnim("shine", anistr, 0.25);
		}

		this.gold = gold;
		this.fast = fast;
		this.deltaSpeed = fast ? 0.05 : -0.05;

		this.brickType = "speed";
	}

	onSpriteHit(obj, norm, mag){
		super.onSpriteHit(obj, norm, mag);
		if (obj.gameType == "ball"){
			let spd = obj.getSpeed();
			spd = Math.max(0, spd + this.deltaSpeed);
			obj.setSpeed(spd);
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

		this.health = 100;
		this.armor = 1;

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
		this.norm = [xn, yn];

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
		let [mag, anispd] = ConveyorBrick.speeds[speedLevel];
		this.steerArgs = [xn, yn, mag, 0.01];

		this.setTexture("brick_invis");
		let anistr = "conveyor_" + i;
		this.addAnim("cycle", anistr, anispd, true, true);
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
	}

	//Funky Brick never dies
	isDead(){
		return false;
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
			laser.moveTo(this.x-2, this.y - laser.height - 2);
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
	//detonator types: normal, neo, freeze
	constructor(x, y, detType="normal"){
		super("brick_main_7_3", x, y);
		
		this.addAnim("glow", "brick_glow_0", 0.25, true);
		this.playAnim("glow");

		this.deathSound = "detonator_explode";

		this.detType = detType;
		this.brickType = "detonator";
	}

	onDeath(){
		//invisible explosion projectile
		game.top.emplaceCallback(50, () => {
			game.emplace("projectiles", new Explosion(
				this.x, this.y, 16*3-1, 8*3-1
			));
		});

		//explosion smoke particle
		let i = Math.floor(Math.random() * 4);
		let tex = "det_smoke_reg_" + i;
		let smoke = new Particle(tex, this.x, this.y);
		smoke.setGrowth(0.01, -0.00002);
		smoke.setFade(0.005);
		game.emplace("particles", smoke);

		//explosion blast particle
		let blast = new Particle(null, this.x, this.y);
		let anistr = [];
		for (let i = 0; i < 7; i++)
			anistr.push(`det_blast_${i}_0`);
		blast.addAnim("blast", anistr, 0.5);
		blast.playAnim("blast");
		blast.dieOnAniFinish = true;
		game.emplace("particles", blast);
	}
}

class GlassBrick extends Brick{
	constructor(x, y){
		super("brick_main_7_4", x, y);
		this.health = 10;
	}

	onSpriteHit(obj, norm, mag){
		if (obj.gameType == "ball")
			obj.pierceOverride = true;
		super.onSpriteHit(obj, norm, mag);
	}
}

class AlienBrick extends Brick{
	static actionTimes = [
		0, 2500, 2000, 1500, 1000
	];

	constructor(x, y){
		super("brick_main_7_6", x, y);
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

var brickClasses = {
	Brick,
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
	GlassBrick,
	AlienBrick,
}