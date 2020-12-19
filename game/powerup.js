var powerupNames = [ 
	"Acid", "AntiGravity", "Assist", "Attract", "Autopilot", "Ball Cannon", "Barrier", "Blackout", "Beam", "Blossom",
	"Bomber", "Bulk", "Bypass", "Cannon", "Catch", "Change", "Chaos", "Column Bomber", "Combo", "Control",
	"Disarm", "Disrupt", "Domino", "Drill Missile", "Drop", "EMP Ball", "Energy", "Erratic Missile", "Extend", "Fast",
	"Freeze", "Fireball", "Forcefield", "Frenzy", "Gelato", "Generator Ball", "Ghost", "Giga", "Glue", "Gravity",
	"Hold Once", "Hacker", "Halo", "HaHa", "Heaven", "Ice Ball", "Illusion", "Indigestion", "Intelligent Shadow", "Invert",
	"Irritate", "Javelin", "Junk", "Jewel", "Joker", "Kamikaze", "Knocker", "Laceration", "Large Ball", "Laser",
	"Laser Plus", "Laser Ball", "Lock", "Luck", "Magnet", "Mega", "Missile", "Mobility", "Multiple", "Mystery",
	"Nano", "Nebula", "New Ball", "Node", "Normal Ball", "Normal Ship", "Nervous", "Oldie", "Open", "Orbit",
	"Particle", "Pause", "Player", "Probe", "Poison", "Protect", "Quake", "Quasar", "Quadruple", "Rapidfire",
	"Restrict", "Regenerate", "Re-Serve", "Reset", "Risky Mystery", "Rocket", "Row Bomber", "Shrink", "Shadow", "Shotgun",
	"Sight Laser", "Slow", "Snapper", "Slug", "Terraform", "Time Warp", "Trail", "Tractor", "Transform", "Triple",
	"Twin", "Two", "Ultraviolet", "Unification", "Undead", "Unlock", "Undestructible", "Vendetta", "Vector", "Venom",
	"Volt", "Voodoo", "Warp", "Weak", "Weight", "Wet Storm", "Whisky", "X-Bomb", "X-Ray", "Yoyo",
	"Yoga", "Y-Return", "Buzzer", "Zeal", "Zen Shove"
];

/*
	Components with reference to ball
		+ More consistent
		+ one less argument in ball.js side
		- have to use this.ball which is longer than ball
	vs Components with ball as parameter
		+ more flexible
		+ can be copied?
		+ can use shorter ball var name?
	Conclusion:
		- there is no need for ball in parameter as
		most components have stuff that's attach to a single ball
		- Although some components are simple enough to be copied,
		it is easier to treat them all like the complex ones
*/

var DISABLE_INACTIVE = true;

class PowerupSpawner{
	constructor(globalRate, weights){
		this.globalRate = globalRate;
		//don't modify the original weights
		weights = weights.slice();

		if (DISABLE_INACTIVE){
			for (let i = 0; i < weights.length; i++){
				if (!powerupFunc[i])
					weights[i] = 0;
			}
		}

		this.sum = weights.reduce((a, b) => a + b, 0);
		this.weights = weights;
	}

	//randomly decide if powerup should spawn
	//will be false if all weights are 0
	canSpawn(){
		return (
			this.sum > 0 &&
			Math.random() < this.globalRate
		);
	}

	//get a random powerup id or null if all weights are 0
	getId(){
		if (this.sum == 0)
			return null;
		let n = Math.random() * this.sum;
		for (let [i, w] of this.weights.entries()){
			n -= w;
			if (n <= 0)
				return i;
		}
	}
}

class Powerup extends Sprite{
	constructor(x, y, id){
		if (id === null || id === undefined)
			console.error("Invalid Powerup ID");
		
		let tex = "powerup_default_" + id;
		super(tex, x, y, 0, 0.1);
		//powerup needs a shape or else the paddle will collide
		//against the powerup's label
		this.createShape();

		let anistr = `powerup_${id}`;
		this.addAnim("spin", anistr, 0.25, true);
		this.playAnim("spin");

		this.id = id;
		this.dead = false;

		//add label to the left (or right) of it
		let label = printText(powerupNames[id], "pokemon");
		label.tint = 0xFFFFFF;
		label.scale.set(0.5);
		label.y = -5;
		this.label = label;
		this.updateLabel();
		this.addChild(label);

		this.gameType = "powerup";
	}

	isDead(){
		if (this.dead)
			return true;
		if (this.x - this.height/2 > DIM.height)
			return true;
		return false;
	}

	activate(){
		this.dead = true;
		let func = powerupFunc[this.id];
		if (func)
			func();
		else
			console.log("powerup " + this.id + " not implemented");

		let score = new Particle(
			"score_1_1", this.x, this.y, 0, -0.1);
		score.timer = 2000;
		game.emplace("particles", score);
	}

	updateLabel(){
		let label = this.label;
		if (this.x - DIM.lwallx < label.textWidth + 40)
			label.x = 10;
		else
			label.x = -10 - label.textWidth/2;
	}
	update(delta){
		super.update(delta);
		this.updateLabel();
	}

	// update(delta){
	// 	super.update(delta);
	// 	this.drawHitbox();
	// }
}

//Catagories:
//	Ball Addition
//	Ball Modifier
//  Paddle Modifier
//  Brick Modifier
var powerupFunc = {};
let f = powerupFunc; //alias
/*****************
 * Ball Addition *
 *****************/
 
//Disrupt
f[21] =  function(){
	Ball.split(8);
};
//Frenzy
f[33] =  function(){
	Ball.split(24);
};
//Multiple
f[68] =  function(){
	Ball.split(3, true);
};
//New Ball
f[72] =  function(){
	let paddle = game.get("paddles")[0];
	let ball = new Ball(0, 0, 0.4, 0);
	game.emplace("balls", ball);
	paddle.attachBall(ball, true);
};
//Quadruple
f[88] =  function(){
	let paddle = game.get("paddles")[0];
	let x = paddle.x;
	let y = paddle.y - 8;
	let deg = 15;
	for (let i = 0; i < 4; i++){
		let rad = (i-1.5) * deg * Math.PI / 180;
		let ball = new Ball(x, y, 0, -0.4);
		ball.rotateVel(rad);
		game.emplace("balls", ball);
	}
};
//Triple
f[109] = function(){
	Ball.split(3);
};
//Two
f[111] = function(){
	Ball.split(2, true);
};


/***************
 * Ball Modify *
 ***************/

//Acid
f[0] = function(){
	playSound("acid_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_4");
		ball.damage = 100;
		ball.strength = 1;
		ball.pierce = (b, obj) => {
			return (
				obj.gameType == "brick" &&
				obj.brickType == "normal" &&
				obj.isDead()
			);
		}
	}
};

//Antigravity
let Antigravity = class{
	constructor(ball){
		this.ball = ball;
	}
	update(delta){
		this.ball.setSteer(0, -1, 0.005);
	}
};

f[1] = function(){
	playSound("generic_collected");

	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.antigravity = new Antigravity(ball);
	}
};

//Attract
let Attract = class{
	constructor(ball){
		this.ball = ball;
	}
	update(delta){
		let ball = this.ball;
		let closest = null;
		let storedDist = Infinity;
		for (let br of game.get("bricks")){
			if (br.armor > 0)
				continue;
			let dist = (br.x-ball.x)**2 + (br.y-ball.y)**2;
			if (dist < storedDist){
				closest = br;
				storedDist = dist;
			}
		}
		if (!closest)
			return;
		let dx = closest.x - ball.x;
		let dy = closest.y - ball.y;
		let [tx, ty] = Vector.normalize(dx, dy);
		ball.setSteer(tx, ty, 0.005);
	}
};

f[3] = function(){
	playSound("generic_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.attract = new Attract(ball);
	}
};

//Blossom
let Blossom = class{
	static pellets = 24;

	constructor(ball){
		this.ball = ball;
		this.armed = true;
		this.ring = new PIXI.Container();
		for (let i = 0; i < 6; i++){
			let rad = i * 2 * Math.PI / 6;
			let [dx, dy] = Vector.rotate(0, 10, rad);
			let p = new Particle("blossom",
				dx, dy, 0, 0, rad, 1, 1);
			this.ring.addChild(p);
		}
		ball.addChild(this.ring);
	}
	destructor(){
		this.ball.removeChild(this.ring);
	}
	onPaddleHit(paddle){
		this.armed = true;
		this.ring.visible = true;
	}
	update(delta){
		if (mouse.m1 == 1 && this.armed){
			playSound("blossom_fire");
			this.armed = false;
			this.ring.visible = false;
			let [x, y] = this.ball.getPos();
			for (let i = 0; i < 3; i++){
				game.top.emplaceCallback(i*100, () => {
					this.fireRing(x, y, i);
				});
			}
		}
	}
	preUpdate(delta){
		if (!this.armed)
			return;
		this.ring.rotation += delta * 0.001;
	}
	fireRing(x, y, off){
		let n = Blossom.pellets;
		for (let i = 0; i < n; i++){
			let rad = (i + off*1/3) * 2 * Math.PI / n;
			let [vx, vy] = Vector.rotate(0, 0.25, rad);
			let p = new Projectile("blossom",
				x, y, vx, vy, rad);
			game.emplace("projectiles", p);
		}
	}
};

f[9] = function(){
	const n = 24; //# of pellets
	
	playSound("generic_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_2_0");
		ball.components.blossom = new Blossom(ball);
	};
};

//General Bomber Component
let Bomber = class{
	constructor(ball, explosionFunc){
		this.ball = ball;
		this.explosionFunc = explosionFunc;
		this.fuse = new PIXI.Container();
		ball.addChild(this.fuse);
		playSound("bomber_fuse", true);
	}
	destructor(){
		this.ball.removeChild(this.fuse);
		stopSound("bomber_fuse", true);
	}
	//return array of any extra args after ball
	getArgs(){
		return [this.explosionFunc];
	}
	preUpdate(delta){
		let fuse = this.fuse;
		// let dead = [];
		// for (let spark of fuse.children){
		// 	spark.update(delta);
		// 	if (spark.isDead())
		// 		dead.push(spark);
		// }
		// for (let spark of dead)
		// 	fuse.removeChild(spark);
		updateAndRemove(fuse, delta);

		this.timer -= delta;
		if (this.timer > 0)
			return;
		this.timer = 100;
		let [vx, vy] = Vector.rotate(
			0,
			randRange(25, 50) / 1000,
			(0.75 + 0.5 * Math.random()) * Math.PI
		);
		let spark = new Particle(
			"white_pixel",
			0, 
			-this.ball.shape.radius/2,
			vx, vy, 0, 1, 1);
		let r = 255;
		let g = randRange(256);
		let b = randRange(g+1);
		spark.tint = 
			0x010000 * r +
			0x000100 * g +
			0x000001 * b;
		spark.timer = 150;
		fuse.addChild(spark);
	}
	onSpriteHit(obj, norm, mag){
		if (obj.gameType != "brick")
			return;
		this.ball.normal(); //will call destructor
		let [i0, j0] = getGridPos(...obj.getPos());
		if (!boundCheck(i0, j0))
			return;
		playSound("bomber_explode");
		this.explosionFunc(i0, j0);
	}
};

let bomberNormal = function(i0, j0){
	let cells = [];
	let abs = Math.abs;
	for (let di = -3; di <= 3; di++){
		for (let dj = -3; dj <= 3; dj++){
			if (abs(di) + abs(dj) > 3)
				continue;
			let i = i0 + di;
			let j = j0 + dj;
			if (!boundCheck(i, j))
				continue;
			cells.push([i, j]);
		}
	}
	for (let [i, j] of cells){
		let [x, y] = getGridPosInv(i, j);
		let p = new Particle("white_pixel",
			x, y, 0, 0, 0, 32, 16);
		p.setGrowth(-0.005, 0, 0, true);
		game.emplace("particles", p);

		let e = new Explosion(x, y, 32-1, 16-1);
		game.emplace("projectiles", e);
	}
};

let bomberColumn = function(i0, j0){
	let [x, y] = getGridPosInv(i0, j0);
	y = DIM.ceiling + DIM.boardh/2;
	let w = 32;
	let h = DIM.boardh;
	let p = new Particle("white_pixel",
		x, y, 0, 0, 0, w, h);
	p.update = function(delta){
		this.scale.x -= 0.2 * delta;
		if (this.scale.x <= 0)
			this.kill();
	};
	game.emplace("particles", p);

	let e = new Explosion(x, y, w-1, h-1);
	game.emplace("projectiles", e);
};

let bomberRow = function(i0, j0){
	let [x, y] = getGridPosInv(i0, j0);
	x = DIM.lwallx + DIM.boardw/2;
	let w = DIM.boardw;
	let h = 16;
	let p = new Particle("white_pixel",
		x, y, 0, 0, 0, w, h);
	p.update = function(delta){
		this.scale.y -= 0.2 * delta / 2;
		if (this.scale.y <= 0)
			this.kill();
	};
	game.emplace("particles", p);

	let e = new Explosion(x, y, w-1, h-1);
	game.emplace("projectiles", e);
};

//Bomber
f[10] = function(){
	playSound("bomber_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_0");
		ball.components.bomber =
			new Bomber(ball, bomberNormal);
	}
};

//Column Bomber
f[17] = function(){
	playSound("bomber_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_0");
		ball.components.bomber =
			new Bomber(ball, bomberColumn);
	}
};
 
//Row Bomber
f[96] = function(){
	playSound("bomber_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_0");
		ball.components.bomber =
			new Bomber(ball, bomberRow);
	}
};

//Combo
let Combo = class{
	static speed = 1.5;

	constructor(ball){
		this.ball = ball;
		this.active = false;
		this.count = 10;
		this.delay = 0;
		this.timeout = 0;
		this.oldSpeed = null;
	}

	searchTarget(){
		let [x, y] = this.ball.getPos();
		let closest = null;
		let closestDist = Infinity;
		for (let br of game.get("bricks")){
			if (br.isDead() || br.armor > 0)
				continue;
			let dist = Vector.dist(x, y, br.x, br.y);
			if (dist < closestDist){
				closest = br;
				closestDist = dist;
			}
		}
		if (!closest)
			return null;
		return [closest, closestDist];
	}

	destructor(){
		this.comboEnd();
	}

	//reverts the new ball back to the old speed
	onCopy(newBall){
		if (this.active)
			newBall.setSpeed(this.oldSpeed);
	}

	//reverts ball speed if previously active
	comboEnd(){
		if (this.active)
			this.ball.setSpeed(this.oldSpeed);
		this.active = false;
	}

	onSpriteHit(obj, norm, mag){
		let ball = this.ball;
		if (obj.gameType != "brick")
			return;
		if (!obj.isDead())
			return;
		this.count--;
		let target = this.searchTarget(ball);
		if (!target || this.count < 0){
			ball.normal();
			return;
		}
		let prevActive = this.active;
		this.active = true;
		this.delay = 200;
		let [br, dist] = target;
		this.timeout = dist / Combo.speed;
		if (!prevActive)
			this.oldSpeed = ball.getSpeed();

		let v = new Vector(br.x - ball.x, br.y - ball.y);
		v = v.normalized().scale(Combo.speed);
		ball.setVel(v.x, v.y);

		playSound("combo");
	}

	onPaddleHit(paddle){
		this.comboEnd();
	}

	preUpdate(delta){
		if (!this.active)
			return;

		if (this.delay > 0){
			this.delay -= delta;
			this.ball.velOverride = {vx:0, vy:0};
			return;
		}

		this.timeout -= delta;
		if (this.timeout <= 0)
			this.comboEnd();
	}
}

f[18] = function(){
	playSound("combo_collected");

	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.combo = new Combo(ball);
	}
};

//Domino
let Domino = class{
	constructor(ball){
		this.ball = ball;
		this.ready = true;
		this.active = false;
	}
	scanRow(dir, i, j){
		let dj = dir;
		let grid = game.top.brickGrid;
		let count = 0;
		j += dj;
		while (boundCheck(i, j)){
			let check = false;
			for (let br of grid.get(i, j)){
				if (br.gridDat.move)
					continue;
				if (br.health > 10 || br.armor > 0)
					continue;
				check = true;
				break;
			}
			if (!check)
				break;
			count++;
			j += dj;
		}
		return count;
	}
	stopDomino(){
		if (!this.active)
			return;
		this.active = false;
		this.ball.setVel(...this.oldVel);
		this.ball.pierce = false;
	}
	destructor(){
		this.stopDomino();
	}
	//stops the new ball from permanently having pierce
	onCopy(newBall){
		if (this.active)
			newBall.pierce = false;
	}
	onSpriteHit(obj, norm, mag){
		let ball = this.ball;
		if (!this.ready || this.active)
			return;
		if (obj.gameType != "brick")
			return;
		if (!obj.isDead())
			return;
		let dx = obj.x - ball.x;
		let dir = (dx > 0) ? 1 : -1;
		//scan for longest row of unbroken bricks
		let [i, j] = getGridPos(obj.x, obj.y);
		let count = this.scanRow(dir, i, j);
		if (count == 0)
			return;

		this.ready = false;
		this.active = true;
		this.oldVel = [ball.vx, ball.vy];
		let spd = ball.getSpeed();
		let dist = count * 32;
		this.timer = dist / spd;
		ball.moveTo(...getGridPosInv(i, j));
		ball.setVel(spd * dir, 0);
		ball.pierce = true;
	}
	handleCollision(xn, yn){
		this.stopDomino();
	}
	update(delta){
		if (!this.active)
			return;
		this.timer -= delta;
		if (this.timer <= 0)
			this.stopDomino();
	}
	onPaddleHit(paddle){
		if (this.active)
			console.error("active domino hits paddle");
		this.ready = true;
	}
}

f[22] = function(){
	playSound("domino_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.domino = new Domino(ball);
	}
};

//EMP
let Emp = class{
	constructor(ball){
		this.ball = ball;
		this.armed = true;
		this.timer = 0;
	}
	preUpdate(delta){
		let ball = this.ball;
		if (!this.armed)
			return;
		this.timer -= delta;
		if (this.timer <= 0){
			this.timer = 100;
			if (ball.tint == 0xFFFFFF)
				ball.tint = 0xAAAAAA;
			else
				ball.tint = 0xFFFFFF;
		}
	}
	onSpriteHit(obj, norm, mag){
		if (!this.armed)
			return;
		if (obj.gameType != "brick")
			return;

		this.armed = false;
		this.ball.tint = 0xAAAAAA;
		DetonatorBrick.explode(obj);
		stopSound(obj.hitSound);
		stopSound(obj.deathSound);
	}
	onPaddleHit(paddle, delta){
		this.armed = true;
	}
}

f[25] = function(){
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_1");
		ball.components.emp = new Emp(ball);
	}
}

//Large Ball
f[58] = function(){
	playSound("large_ball_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_large");
		ball.createShape(true);
		ball.damage = 40;
		ball.strength = 1;
	}
};

//Mega Ball
let Mega = class{
	constructor(ball){
		this.ball = ball;
		this.timer = 0;
	}
	update(delta){
		let ball = this.ball;
		this.timer -= delta;
		if (this.timer > 0)
			return;
		this.timer = 16;
		let p = new Particle(
			ball.texture, ball.x, ball.y
		);
		p.alpha = 0.3;
		p.setFade(0.001, 0, 250);
		game.emplace("particles", p);
	}
}

f[65] = function(){
	playSound("mega_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_2_5");
		ball.strength = 1;
		ball.pierce = true;
		ball.components.mega = new Mega(ball);
	}
};

//Snapper
let Snapper = class{
	constructor(ball){
		this.ball = ball;
	}
	onSpriteHit(obj, norm, mag){
		if (obj.gameType != "brick")
			return;
		let brick = obj;
		if (brick.patch.snapper || brick.armor > 1)
			return;
		brick.attachSnapper();
		playSound("snapper_placed");
		stopSound(brick.hitSound);
	}
}

f[102] = function(){
	playSound("generic_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_2");
		ball.damage = 0;
		ball.components.snapper = new Snapper(ball);
	}
};

/*****************
* Paddle Weapons *
******************/
//NOTE: Need to copy extra arguments too
let PaddleWeapon = class{
	constructor(paddle, name, maxBullets){
		this.paddle = paddle;
		this.name = name;
		this.maxBullets = maxBullets;
		this.bulletCount = 0;
	}

	onProjectileDeath(proj){
		this.bulletCount--;
	}

	//places projectile right above the paddle at the
	//specified x-offset
	//also add it to the projectile layer
	fireProjectile(proj, dx){
		let paddle = this.paddle;
		let x = paddle.x + dx;
		let y = paddle.y - paddle.height/2 - proj.height/2;
		proj.moveTo(x, y);
		proj.parentWeapon = this;
		game.emplace("projectiles", proj);
		this.bulletCount++;
	}

	onClick(){
		//call fireProjectile in here
	}

	update(delta){
		//implement this in subclass if needed
	}
}

//Laser and Laser Plus
let Laser = class extends PaddleWeapon{
	constructor(paddle, plus=false){
		super(paddle, "laser", plus ? 6 : 4);
		this.isPlus = plus;
	}

	upgrade(plus){
		this.isPlus = this.isPlus || plus;
		this.maxBullets += 2;
	}

	onClick(){
		if (mouse.m1 != 1 || this.bulletCount > this.maxBullets)
			return;
		playSound("laser_fire");
		let paddle = this.paddle;
		let off = paddle.paddleWidth/2 - 17;
		let tex = this.isPlus ? "laser_1" : "laser_0";
		for (let dx of [-off, off]){
			let proj = new Projectile(tex, 0, 0, 0, -1);
			proj.isLaser = true;
			this.fireProjectile(proj, dx); 
		}
	}
}

//laser
f[59] = function(){
	playSound("laser_collected");
	let paddle = game.get("paddles")[0];
	let cmp = paddle.components.weapon;
	if (cmp?.name == "laser")
		cmp.upgrade(false);
	else{
		paddle.clearPowerups();
		paddle.setTexture("paddle_27_1");
		paddle.setComponent("weapon", new Laser(
			paddle, false));
	}
};

//Laser Plus
f[60] = function(){
	playSound("laser_collected");
	let paddle = game.get("paddles")[0];
	let extraBullets = 0;
	let cmp = paddle.components.weapon;
	if (cmp?.name == "laser"){
		paddle.setTexture("paddle_27_2");
		cmp.upgrade(true);
	}
	else{
		paddle.clearPowerups();
		paddle.setTexture("paddle_27_2");
		paddle.setComponent("weapon", new Laser(
			paddle, true));
	}
};

//Javelin
let Javelin = class{
	constructor(paddle){
		this.paddle = paddle;
		this.name = "javelin";
		this.timer = 6300;
		this.hasFired = false;
		this.energyParticles = new PIXI.Container();
		this.energyParticles.filters = [
			new PIXI.filters.BlurFilter(1.5, 2, 2)];
		this.particleTimer = 0;
		paddle.addChild(this.energyParticles);
		playSound("javelin_charge");
	}
	destructor(){
		stopSound("javelin_charge");
		this.paddle.removeChild(this.energyParticles);
	}
	fireJavelin(){
		//prevent firing twice due to timeout + click
		if (this.hasFired)
			return;
		this.hasFired = true;
		playSound("javelin_fire");

		let paddle = this.paddle;
		paddle.removeComponent("subweapon");

		let [px, py] = paddle.getPos();
		let mx = mouse.x;
		let j = Math.floor((mx - DIM.lwallx) / 32);
		j = Math.max(0, Math.min(13-1, j));
		let x = DIM.lwallx + 16 + (32 * j);

		let p = new Projectile("javelin",
			x, py, 0, -1.2);
		//create custom hitbox
		let points = [0, 0, 32-1, 146];
		p.setShape(new PolygonShape(points));
		p.boundCheck = false;
		p.damage = 1000;
		p.strength = 1;
		p.pierce = "strong";
		let superUpdate = p.update;
		p.update = function(delta){
			let [x0, y0, x1, y1] = this.getAABB();
			if (y1 < DIM.ceiling){
				this.kill();
				console.log("javelin die");
			}
			superUpdate.call(this, delta);
		}

		game.emplace("projectiles", p);
	}
	onClick(mouseVal){
		this.fireJavelin();
	}
	update(delta){
		this.timer -= delta;
		if (this.timer <= 0)
			this.fireJavelin();

		let ep = this.energyParticles;
		updateAndRemove(ep, delta);

		this.particleTimer -= delta;
		if (this.particleTimer > 0)
			return;
		let val = this.timer / 6300;
		this.particleTimer = 150 - (100 * (1-val));
		/* Plan for Glow:
			1. Create a white rectangle with PIXI.Graphics
			2. Set the graphic's mask to the current texture (sprite)
			3. Add the graphic + mask to the sprite and adjust alpha
		*/

		let p = new PIXI.Graphics();
		let rad = Math.random() * Math.PI * 2;
		let mag = randRange(20, 40);
		p.rotation = rad;
		p.dist = mag;
		p.rad = rad;
		p.radius = 2;
		p.update = function(delta){
			this.dist -= 0.1 * delta;
			this.radius += 0.01 * delta;
			this.clear()
				.beginFill(0xFFFFFF)
				.drawEllipse(0, 0, this.radius, this.radius*.66);
			let x = Math.cos(this.rad) * this.dist;
			let y = Math.sin(this.rad) * this.dist;
			this.position.set(x, y);
		};
		p.isDead = function(){
			return (this.dist <= 0);
		};
		p.update(0);
		ep.addChild(p);

	}
}
f[51] = function(){
	let paddle = game.get("paddles")[0];
	if (paddle.components.subweapon?.name == "javelin")
		return;
	paddle.setComponent("subweapon", new Javelin(paddle));
}

//X-Bomb (Xbomb)
let Xbomb = class{
	static travelTime = 1000;

	constructor(paddle){
		this.paddle = paddle;
		this.name = "xbomb";

		let xbomb = new Particle("powerup_default_127");
		this.xbomb = xbomb;
		xbomb.scale.set(1); //set it to 2 when released
		paddle.addChild(xbomb);

		let crosshair = new Sprite(PIXI.Texture.WHITE);
		this.crosshair = crosshair;
		crosshair.scale.set(32/16, 16/16);
		crosshair.alpha = 0.33;
		game.top.hud.addChild(crosshair);

		xbomb.onDeath = function(){
			playSound("xbomb_explode");
			//determine explosion coordinates
			let [i0, j0] = this.destination;
			let cells = [[i0, j0, 0]];
			for (let di = -1; di <= 1; di++){
				for (let dj = -1; dj <= 1; dj++){
					if (di == 0 && dj == 0)
						continue;
					let i = i0 + di;
					let j = j0 + dj;
					let delay = 1;
					while (boundCheck(i, j)){
						cells.push([i, j, delay++]);
						i += di;
						j += dj;
					}
				}
			}
			//create particles + explosions
			for (let [i, j, delay] of cells){
				let [x, y] = getGridPosInv(i, j);
				let p = new Particle("white_pixel",
					x, y, 0, 0, 0, 2/16, 1/16);
				p.grow = true;
				p.growRate = 0.15;
				p.shrinkDelay = 200;
				p.update = function(delta){
					let {x: sx, y: sy} = this.scale;
					let rate = this.growRate;
					if (this.grow){
						sx += delta * rate * 2;
						sy += delta * rate;
						if (sx >= 32){
							this.grow = false;
							game.emplace("projectiles", new Explosion(
								this.x, this.y, 32-1, 16-1));
						}
					}
					else{
						this.shrinkDelay -= delta;
						if (this.shrinkDelay > 0)
							return;
						sx -= delta * rate * 2;
						sy -= delta * rate;
						if (sx <= 0)
							this.dead = true;
					}
					this.scale.set(sx, sy);
				};
				game.top.emplaceCallback(delay*10, () => {
					game.emplace("particles", p);
				});
			}
		};

		let superUpdate = xbomb.update;
		xbomb.update = function(delta){
			//approximate a parabolic trajectory
			let time = Xbomb.travelTime;
			let val = 1 + 2*Math.sin(this.timer * Math.PI / time);
			this.scale.set(2*val);
			superUpdate.call(this, delta);
		}
	}
	destructor(){
		this.paddle.removeChild(this.xbomb);
		game.top.hud.removeChild(this.crosshair);
	}
	onClick(mouseVal){
		let paddle = this.paddle;
		let xbomb = this.xbomb;
		let time = Xbomb.travelTime;

		if (mouseVal != 1)
			return;
		playSound("xbomb_launch");
		paddle.removeComponent("subweapon");

		xbomb.scale.set(2);
		let [x0, y0] = paddle.getPos();
		xbomb.moveTo(x0, y0);

		let [i, j] = getGridPos(mouse.x, mouse.y);
		let [x1, y1] = getGridPosInv(i, j);

		let dx = x1 - x0;
		let dy = y1 - y0;
		xbomb.vx = (x1 - x0) / time;
		xbomb.vy = (y1 - y0) / time;

		xbomb.timer = time;
		xbomb.destination = [i, j];

		game.emplace("particles", xbomb);
	}
	update(delta){
		let [i, j] = getGridPos(mouse.x, mouse.y);
		if (!boundCheck(i, j))
			return false;
		let [x, y] = getGridPosInv(i, j);
		this.crosshair.moveTo(x, y);
	}
}
f[127] = function(){
	//xbomb will always hit the target in the
	//same amount of time
	const time = 1000;

	playSound("xbomb_collected");

	let paddle = game.get("paddles")[0];
	if (paddle.components.subweapon?.name == "xbomb")
		return;

	paddle.setComponent("subweapon", new Xbomb(paddle));
};

/****************
* Paddle Modify *
*****************/

//Catch
let Catch = class{
	constructor(paddle){
		this.paddle = paddle;
		this.name = "catch";
	}
	onBallHit(ball){
		this.paddle.attachBall(ball);
	}
};
f[14] = function(){
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_10_2");
	paddle.setComponent("catch", new Catch(paddle));
};

//Hold Once
let HoldOnce = class extends Catch{
	constructor(paddle){
		super(paddle);
		this.name = "holdonce";
	}
	onBallHit(ball){
		super.onBallHit(ball);
		this.paddle.clearPowerups();
	}
}
f[40] = function(){
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_30_1");
	paddle.setComponent("catch", new HoldOnce(paddle));
};

//Glue
let Glue = class extends Catch{
	constructor(paddle){
		super(paddle);
		this.timer = 5000;
		this.name = "glue";
	}
	update(delta){
		this.timer -= delta;
		if (this.timer <= 0){
			this.paddle.clearPowerups();
		}
	}
}
f[38] = function(){
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_18_3");
	paddle.setComponent("catch", new Glue(paddle));
};