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

// for (let [i, name] of powerupNames.entries()){
// 	powerupNames[i] = i + " " + name;
// }

var badPowerups = [
	7, 11, 15, 29, 30, 36, 38, 39, 43, 47, 50, 52, 74, 75, 76, 84, 90,
	93, 94, 97, 98, 105, 106, 116, 123, 124, 126, 129, 130, 133
];
var badPowerupsLookup = {};
for (let id of badPowerups)
	badPowerupsLookup[id] = true;

/*
	Components with reference to ball
		+ More consistent
		+ one less argument in ball.js side
		- have to use this.ball which is longer than ball
	vs Components with ball as parameter
		+ more flexible
		+ can be copied?
		+ can use shorter ball var name?
	Conclusion: Component with ball member wins!!!
		- there is no need for ball in parameter as
		most components have stuff that's attached to a single ball
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
		if (cheats.disable_powerup_spawning)
			return false;
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
		this.isBad = badPowerupsLookup[id] === true;
		this.score = this.isBad ? 2000 : 200;
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
			func(this);
		else
			console.log("powerup " + this.id + " not implemented");

		let index = "0_0";
		switch(this.score){
			case 100:  index = "0_0"; break;
			case 200:  index = "1_0"; break;
			case 400:  index = "2_0"; break;
			case 1000: index = "1_1"; break;
			case 2000: index = "2_1"; break;
			case 4000: index = "2_0"; break;
		}
		let score = new Particle(
			"score_"+index, this.x, this.y, 0, -0.1);
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

//Powerup Ordering:
//	Although most will be ordered alphabetically, 
//  Similar ones will be grouped together

//Catagories:
//	Ball Addition
//	Ball Modifier
//  Paddle Modifier
//  Brick Modifier
var powerupFunc = {};

{ //Put all of these powerup component classes in a block just to be safe

let f = powerupFunc; //alias

/*****************
 * Ball Addition *
 *****************/
 
//Disrupt
f[21] =  function(){
	Ball.split(8);
	playSound("split_med");
};
//Frenzy
f[33] =  function(){
	Ball.split(24);
	playSound("split_large");
};
//Multiple
f[68] =  function(){
	Ball.split(3, true);
	playSound("split_small");
};
//Nano
f[70] = function(){
	playSound("nano_collected");
	let left = Math.random() < 0.5;
	const d0 = left ? 60 : 120;
	const x0 = left ? DIM.lwallx : DIM.rwallx;
	game.top.emplaceCallback(500, () => {
		playSound("nano_launch");
		for (let i = 0; i < 3; i++){
			let deg = d0 + (i-1) * 5;
			let rad = deg * Math.PI / 180;
			let [vx, vy] = Vector.rotate(0.8, 0, rad);
			let nano = new BallProjectile(
				"ball_main_5_5", x0, DIM.ceiling, vx, vy);
			nano.colFlag = {paddle: true};
			nano.onPaddleHit = function(paddle){
				this.kill();
				let ball = new Ball(this.x, this.y, this.vx, this.vy);
				ball.setTexture("ball_main_2_5");
				ball.strength = 1;
				ball.damage = 100;
				ball.pierce = true;
				ball.components.mega = new Mega(ball);
				game.emplace("balls", ball);
			};
			game.emplace("projectiles", nano);
		}
	});
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
	playSound("split_small");
};
//Triple
f[109] = function(){
	Ball.split(3);
	playSound("split_small");
};
//Two
f[111] = function(){
	Ball.split(2, true);
	playSound("split_small");
};


/***************
 * Ball Modify *
 ***************/

//Speed-related subcategory

//Fast
f[29] = function(){
	playSound("fast_collected");
	for (let ball of game.get("balls"))
		ball.setSpeed2(ball.getSpeed() + 0.15);
}

//Slow
f[101] = function(){
	playSound("slow_collected");
	for (let ball of game.get("balls"))
		ball.setSpeed2(ball.getSpeed() - 0.15);
}

//Zeal
f[133] = function(){
	playSound("fast_collected");
	for (let ball of game.get("balls"))
		ball.setSpeed2(ball.getSpeed() + 0.15*4);
}

//Ball modification

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
class Antigravity{
	constructor(ball){
		this.ball = ball;
		this.timer = 10000;
	}
	update(delta){
		this.ball.setSteer(0, -1, 0.005);
		this.timer -= delta;
		if (this.timer <= 0)
			this.ball.normal();
	}
}
f[1] = function(){
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.antigravity = new Antigravity(ball);
	}

	game.top.createMonitor(
		"Antigravity", "balls", "antigravity", "timer");
};

//Gravity
class Gravity{
	constructor(ball){
		this.ball = ball;
		this.timer = 10000;
	}
	update(delta){
		this.ball.setSteer(0, 1, 0.005);
		this.timer -= delta;
		if (this.timer <= 0)
			this.ball.normal();
	}
}
f[39] = function(){
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.gravity = new Gravity(ball);
	}
	game.top.createMonitor(
		"Gravity", "balls", "gravity", "timer");
};

//Attract
class Attract{
	constructor(ball){
		this.ball = ball;
		this.strength = 0.005;
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
		ball.setSteer(tx, ty, this.strength);
	}
};

f[3] = function(){
	// playSound("generic_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.attract = new Attract(ball);
	}
};

//Blossom
class Blossom{
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
}

f[9] = function(){
	const n = 24; //# of pellets
	
	// playSound("generic_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_2_0");
		ball.components.blossom = new Blossom(ball);
	};
};

//General Bomber Component
class Bomber{
	constructor(ball, explosionFunc){
		this.ball = ball;
		this.explosionFunc = explosionFunc;
		this.fuse = new PIXI.Container();
		ball.addChild(this.fuse);
		playSound("bomber_fuse", true);
	}
	destructor(){
		this.ball.removeChild(this.fuse);
		stopSound("bomber_fuse");
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
}

function bomberNormal(i0, j0){
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
}

function bomberColumn(i0, j0){
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
}

function bomberRow(i0, j0){
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
}

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
class Combo{
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
class Domino{
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
class Emp{
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
};

//Energy
var tempRecord;
var tempIndex;

class Energy{
	constructor(ball){
		this.ball = ball;
		this.maxEnergy = 3;
		this.balls = [];
		//keeps track of previous positions of the ball
		this.record = []; //[t, x, y];
		this.timeLimit = 500; //remove records older than this

		this.recharge();
	}

	destructor(){
		for (let e of this.balls)
			e.kill();
	}

	recharge(){
		let ball = this.ball;
		let len = this.balls.length;
		let max = this.maxEnergy;
		if (len == max)
			return;
		playSound("energy_collected");
		for (let i = len; i < max; i++){
			let energy = new BallProjectile(
				"ball_main_7_6", ball.x, ball.y);
			energy.bounce = "weak";
			energy.intangible = true;
			energy.targetTime = 56 + i*60;
			energy.time = 0;
			this.balls.push(energy);
			game.emplace("projectiles", energy);
		}
	}

	preUpdate(delta){
		let ball = this.ball;
		//update stored positions
		let record = this.record;
		record.unshift([0, ball.x, ball.y, ball.vx, ball.vy]);
		for (let r of record)
			r[0] += delta;
		while (record[record.length-1][0] > this.timeLimit)
			record.pop();
		//update energy ball positions
		for (let [i, e] of this.balls.entries()){
			if (record.length == 0){
				e.setPos(ball.x, ball.y);
				continue;
			}
			let time = e.time;
			e.time = Math.min(e.targetTime, e.time + delta);
			let index = 0;
			//TODO: add interpolation to make the balls smoother
			while (index < record.length-1 && record[index][0] < time)
				index++;
			tempRecord = record;
			tempIndex = index;
			let [t, x, y, vx, vy] = record[index];
			e.setPos(x, y);
			e.setVel(vx, vy);
		}
	}

	onSpriteHit(obj, norm, mag){
		let ball = this.ball;
		if (obj.gameType != "brick")
			return;
		if (obj.armor > ball.strength)
			return;
		for (let e of this.balls){
			e.intangible = false;
		}
		this.balls = [];
	}

	onPaddleHit(paddle){
		this.recharge();
	}
}
f[26] = function(){
	playSound("energy_collected");
	for (let ball of game.get("balls")){
		if (ball.components.energy){
			ball.components.energy.maxEnergy = 6;
			ball.components.energy.recharge();
		}
		else{
			ball.normal();
			ball.components.energy = new Energy(ball);
		}
	}
};

//FireBall
class FireBall{
	constructor(ball){
		this.ball = ball;
		ball.setTexture("ball_main_1_0");
	}

	onSpriteHit(obj, norm, mag){
		if (obj.gameType != "brick")
			return;
		let e = new Explosion(obj.x, obj.y, 32*3-1, 16*3-1);
		e.onSpriteHit = () => {}; //disable the stopping of sounds
		game.emplace("projectiles", e);
	}
}
f[31] = function(){
	for (let ball of game.get("balls")){
		if (!ball.components.fireball){
			ball.normal();
			ball.components.fireball = new FireBall(ball);
		}
	}
};

//Generator Ball
class GeneratorBall{
	constructor(ball){
		this.ball = ball;
		this.babies = new PIXI.Container();
		this.rechargeBalls();
		this.ball.addChild(this.babies);
		this.storedRotation = 0;
	}

	destructor(){
		this.ball.removeChild(this.babies);
	}

	createBaby(){
		let baby = new BallProjectile(
			"ball_small", 0, 0, 0, 0);
		Object.assign(baby, {
			bounce: true,
			damage: 0,
			strength: 0
		});
		baby.colFlag.paddle = true;
		baby.onPaddleHit = function(paddle){
			this.kill();
			let ball = new Ball(this.x, this.y, this.vx, this.vy);
			game.emplace("balls", ball);
		};
		baby.scale.set(1);
		return baby;
	}

	rechargeBalls(){
		let babies = this.babies;
		let n = babies.children.length;
		if (n == 6)
			return;
		playSound("ball_generator");
		for (let i = n; i < 6; i++){
			let baby = this.createBaby();
			babies.addChild(baby);
		}
		this.preUpdate(0);
	}

	onSpriteHit(obj, norm, mag){
		let babies = this.babies;
		if (obj.isDead() && babies.children.length > 0){
			let baby = babies.removeChildAt(babies.children.length-1);
			baby.scale.set(2);
			let [x, y] = this.ball.getPos();
			baby.position.set(x, y);
			game.emplace("projectiles", baby);
		}
	}

	onPaddleHit(paddle){
		this.rechargeBalls();
	}

	preUpdate(delta){
		//You can't rotate the Container because it will
		//rotate the ball sprites
		// this.babies.rotation += delta * 0.001;
		this.storedRotation += delta * 0.001;
		let rot = this.storedRotation;

		for (let [i, baby] of this.babies.children.entries()){
			let rad = rot + i * 2 * Math.PI / 6;
			let [dx, dy] = Vector.rotate(0, 10, rad);
			baby.position.set(dx, dy);
			baby.vx = this.ball.vx;
			baby.vy = this.ball.vy;
		}
	}
}
f[35] = function(){
	for (let ball of game.get("balls")){
		if (!ball.components.generator){
			ball.normal();
			ball.components.generator = new GeneratorBall(ball);
		}
	}
};

//Giga
class Giga{
	constructor(ball){
		this.ball = ball;
		let aura = new BallProjectile("giga_forcefield");
		this.aura = aura;
		aura.damage = 1000;
		aura.strength = 2;
		aura.pierce = "strong";
		aura.flashTimer = 0;
		aura.flashPeriod = 150;
		game.emplace("projectiles", aura);
	}

	destructor(){
		this.aura.kill();
	}

	preUpdate(delta){
		let aura = this.aura;
		aura.setPos(...this.ball.getPos());
		aura.flashTimer += delta;
		if (aura.flashTimer > aura.flashPeriod){
			aura.flashTimer -= aura.flashPeriod;
			aura.visible = !aura.visible;
		}
	}

	postUpdate(delta){
		//will makke sure the aura doesn't "lag" 1 frame behind
		//the ball if the ball isn't stuck to the paddle
		let aura = this.aura;
		aura.setPos(...this.ball.getPos());
	}
}
f[37] = function(){
	for (let ball of game.get("balls")){
		if (!ball.components.giga){
			ball.normal();
			ball.damage = 1000;
			ball.strength = 2;
			ball.setTexture("ball_main_1_1");
			ball.components.giga = new Giga(ball);
		}
	}
	playSound("giga_collected");
};

//Halo
class Halo{
	constructor(ball){
		this.ball = ball;
		this.hasDamagedBrick = true;
		this.active = false;
		this.activate();
	}

	//prevent Halo from activating again if the ball
	//hasn't damaged any bricks between activations
	activate(){
		if (this.active || !this.hasDamagedBrick)
			return;

		this.active = true;
		let ball = this.ball;
		ball.alpha = 0.5;
		ball.intangible = true;
		this.hasDamagedBrick = false;
	}

	deactivate(){
		if (!this.active)
			return;

		this.active = false;
		let ball = this.ball;
		ball.alpha = 1;
		ball.intangible = false;
	}

	onPaddleHit(paddle){
		this.activate();
	}

	onSpriteHit(obj, norm, mag){
		if (obj.gameType != "brick")
			return;

		let br = obj;
		if (br.armor <= 0)
			this.hasDamagedBrick = true;
	}

	//become tangible once ball is traveling downwards and
	//is not overlapping any bricks
	update(delta){
		let ball = this.ball;
		if (!this.active || ball.vy <= 0)
			return;

		let grid = game.top.brickGrid;
		for (let br of grid.getBucket(ball)){
			let arr = br.checkCollision(ball);
			if (arr[0])
				return;
		}

		this.deactivate();
	}
}
f[42] = function(){
	playSound("halo_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.halo = new Halo(ball);
	}
};

//Ice Ball
class IceBall{
	constructor(ball){
		this.ball = ball;
	}
	//component.onSpriteHit will not activate if the ball
	//pierced through a brick (such as an Ice Brick)
	onSpriteHit(obj, norm, mag){
		if (obj.gameType != "brick")
			return;
		let brick = obj;
		if (brick.isDead()){
			stopSound(brick.deathSound);
			freezeBrick(brick);
		}
		//spawn 4 small freezing explosions around the block
		let off = [[0, -1], [1, 0], [0, 1], [-1, 0]];
		for (let [i, j] of off){
			let x = brick.x + 32 * j;
			let y = brick.y + 16 * i;
			let e = new Explosion(x, y, 32-1, 16-1, true);
			game.emplace("projectiles", e);
		}
		playSound("iceball_hit");
	}
}
f[45] = function(){
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_2_0");
		ball.damage = 100;
		ball.strength = 1;
		ball.components.iceball = new IceBall(ball);
	}
	playSound("iceball_collected");
};

//Irritate
class Irritate{
	constructor(ball){
		this.ball = ball;
	}

	//Should the ball also bounce randomly on walls?
	onSpriteHit(obj, norm, mag){
		let ball = this.ball;
		let spd = ball.getSpeed();
		let vec = norm.scale(spd);
		let rad = (2 * Math.random() - 1) * Math.PI/2;
		vec = vec.rotate(rad);
		ball.setVel(vec.x, vec.y);
	}
}
f[50] = function(){
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_4_0");
		ball.components.irritate = new Irritate(ball);
	}
};

//Kamikaze
//it's just a copy of Attract
class Kamikaze extends Attract{
	constructor(ball){
		super(ball);
		this.strength = 0.025;
	}
}
f[55] = function(){
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_0");
		ball.components.kamikaze = new Kamikaze(ball);
	}
};

//Knocker
class Knocker{
	constructor(ball){
		this.ball = ball;
		this.knockerHealth = 3;
		this.count = this.knockerHealth;
		let component = this;
		ball.pierce = function(_ball, obj){
			if (obj.isDead() && component.count > 0){
				component.count--;
				component.updateAppearance();
				return true;
			}
			return false;
		};

		this.knocker = new Sprite(PIXI.Texture.EMPTY,
			0, 0, 0, 0, 0, 1, 1);
		this.knocker.addAnim("spin", "knocker_spin", 1/8, true, true);
		this.ball.addChild(this.knocker);
	}
	destructor(){
		this.ball.removeChild(this.knocker);
	}
	updateAppearance(){
		this.knocker.visible = (this.count > 0);
	}
	onPaddleHit(paddle){
		this.count = this.knockerHealth;
		this.updateAppearance();
	}
}
f[56] = function(){
	playSound("knocker_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_2_3");
		ball.components.knocker = new Knocker(ball);
	}
};

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

//Laser Ball
class LaserBall{
	static delays = [500, 250, 100, 50, 25, 10];

	constructor(ball){
		this.ball = ball;
		this.level = 0;
		this.fireDelay = LaserBall.delays[0];
		this.timer = 0;
		this.preUpdate(0);
	}

	incrementLevel(){
		let delays = LaserBall.delays;
		this.level = Math.min(delays.length, this.level + 1);
		this.fireDelay = delays[this.level];
	}

	preUpdate(delta){
		this.timer -= delta;
		if (this.timer > 0)
			return;
		this.timer = this.fireDelay;

		let ball = this.ball;
		let rad = randRangeFloat(0, 2 * Math.PI);
		let norm = new Vector(...Vector.rotate(1, 0, rad));
		let vel = norm.scale(0.8);
		let pos = norm.scale(10).add(new Vector(...ball.getPos()));

		let laser = new Projectile("laser_2",
			pos.x, pos.y, vel.x, vel.y, rad + Math.PI/2, 2, 2);
		game.emplace("projectiles", laser);
		playSound("laser_fire");
	}
}
f[61] = function(){
	playSound("laserball_collected");
	for (let ball of game.get("balls")){
		if (ball.components.laserball)
			ball.components.laserball.incrementLevel();
		else{
			ball.normal();
			ball.setTexture("ball_main_2_4");
			ball.components.laserball = new LaserBall(ball);
		}
	}
};

//Mega Ball
class Mega{
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
		ball.damage = 100;
		ball.pierce = true;
		ball.components.mega = new Mega(ball);
	}
};

//Node.js
class Node{
	constructor(ball){
		this.ball = ball;
		this.timer = 0;
		this.splitDelay = 500;
	}

	preUpdate(delta){
		let count = game.get("balls").length;
		count += game.top.newObjects.balls.length;

		if (count >= 3){
			this.timer = this.splitDelay;
			return;
		}

		this.timer -= delta;
		if (this.timer > 0)
			return;

		playSound("node");
		this.timer = this.splitDelay;

		//split once or twice based on current ball count
		let rad = 10 * Math.PI / 180;
		let angles = (count == 1) ? [-rad, rad] : [rad];
		for (let theta of angles){
			let newBall = this.ball.clone();
			newBall.rotateVel(theta);
			game.emplace("balls", newBall);
		}
	}
}
f[73] = function(){
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_8");
		ball.components.node = new Node(ball);
	}
};

//Normal Ball
f[74] = function(){
	playSound("normal_collected");
	for (let ball of game.get("balls")){
		ball.normal();
	}
};

//Particle powerup
class ParticlePowerup{
	constructor(ball){
		this.ball = ball;
		this.speedMultiplier = 1.2;
		this.outerRadius = 200;
		this.innerRadius = 30;
		this.projectiles = [];
		this.addProjectile();
		this.addProjectile();

		// ball.addChild((new PIXI.Graphics())
		// 	.lineStyle(1, 0xFFFF00)
		// 	.drawCircle(0, 0, this.outerRadius/2)
		// 	.drawCircle(0, 0, this.innerRadius/2)
		// );
	}

	destructor(){
		for (let p of this.projectiles)
			p.actuallyDead = true;
	}

	setRandomVel(p, spd=1){
		let rad = randRangeFloat(0, 2 * Math.PI);
		let [vx, vy] = Vector.rotate(spd, 0, rad);
		p.setVel(vx, vy);
	}

	addProjectile(){
		const r = 4;
		let ball = this.ball;

		let p = new BallProjectile(
			null, ball.x, ball.y);
		this.setRandomVel(p);

		p.setShape(new CircleShape(0, 0, r));
		let gr = new PIXI.Graphics();
		gr.beginFill(0xFFFFFF).drawCircle(0, 0, r/2);
		p.addChild(gr);
		p.particleCircle = gr;
		
		p.setBounce(true);
		p.actuallyDead = false;
		p.shouldBeRemoved = function(){
			return this.actuallyDead;
		};

		game.emplace("projectiles", p);
		this.projectiles.push(p);
	}

	preUpdate(delta){
		let ball = this.ball;
		let spd = ball.getSpeed() * this.speedMultiplier;
		spd = Math.max(0.5, spd);
		for (let p of this.projectiles){
			//TODO: Figure out why p velocity becomes NaN
			if (Number.isNaN(p.vx) ||
				Number.isNaN(p.vy) ||
				p.getSpeed() < 0.01)
			{
				this.setRandomVel(p);
				p.setPos(...ball.getPos());
			}
			p.setSpeed(spd);
			let [bx, by] = ball.getPos();
			let [px, py] = p.getPos();
			let [nx, ny] = Vector.normalize(bx-px, by-py);
			Ball.prototype.updateSteer.call(p,
				[nx, ny, 0.01, 0.01], delta);
			//make the particles intangible if it stays too far
			//away from the ball
			let dist = Vector.dist(bx-px, by-py);
			if (dist > this.outerRadius){
				p.intangible = true;
				p.particleCircle.tint = 0xFFFF00;
			}
			else if (dist < this.innerRadius){
				p.intangible = false;
				p.particleCircle.tint = 0xFFFFFF;
			}
		}
	}
}
f[80] = function(){
	playSound("particle_collected");
	for (let ball of game.get("balls")){
		if (ball.components.particle){
			ball.components.particle.addProjectile();
		}
		else{
			ball.normal();
			ball.components.particle = new ParticlePowerup(ball);			
		}
	}
};

//Probe
class Probe{
	constructor(ball){
		this.ball = ball;
		let paddle = game.get("paddles")[0];
		this.paddle = paddle;

		this.probe = new BallProjectile("probe");
		Object.assign(this.probe,
			{damage: 100, strength: 1, pierce: "strong"});
		this.probe.setPos(DIM.w/2, DIM.h/2);
		this.probe.actuallyDead = false;
		this.probe.shouldBeRemoved = function(){
			return this.actuallyDead;
		};
		game.emplace("projectiles", this.probe);

		//fixed overlay for both ball and paddle for convenience
		this.ballOverlay = new Sprite("probe");
		this.ballOverlay.scale.set(1);
		ball.addChild(this.ballOverlay);

		this.paddleOverlay = new Sprite("probe");
		this.paddleOverlay.scale.set(1);
		paddle.addChild(this.paddleOverlay); 

		this.steerStrength = 0.025;
		//probe will travel in a straight line for short time
		//before homing in on the paddle
		this.homingDelay = 300;
		this.homingTimer = 0;

		this.setState("ball");
	}

	destructor(){
		this.probe.actuallyDead = true;
		this.ball.removeChild(this.ballOverlay);
		this.paddle.removeChild(this.paddleOverlay);
	}

	//set where the probe is located
	//"ball", "paddle", or "free"
	setState(state){
		let ball = this.ball;
		let probe = this.probe;
		let ballOverlay = this.ballOverlay;
		let paddleOverlay = this.paddleOverlay;

		if (state == "ball"){
			playSound("probe_collected");
			probe.setVel(0, 0);
			probe.visible = false;
			probe.intangible = true;
			ballOverlay.visible = true;
			paddleOverlay.visible = false;
		}
		else if (state == "paddle"){
			probe.setVel(0, 0);
			probe.visible = false;
			probe.intangible = true;
			paddleOverlay.visible = true;
		}
		else{ //"free"
			probe.visible = true;
			probe.intangible = false;
			ballOverlay.visible = false;

			let [vx, vy] = ball.getVel();
			let spd = Vector.dist(vx, vy);
			[vx, vy] = Vector.normalize(vx, vy);
			spd *= 1.5;
			probe.setVel(vx * spd, vy * spd);
			probe.setPos(...ball.getPos());

			this.homingTimer = this.homingDelay;
		}

		this.state = state;
	}

	onPaddleHit(paddle){
		if (this.state == "paddle" && paddle === this.paddle){
			this.setState("ball");
		}
	}

	preUpdate(delta){
		let probe = this.probe;
		let paddle = game.get("paddles")[0];

		if (this.state == "free"){
			this.homingTimer -= delta;
			if (this.homingTimer <= 0){
				//home in on the paddle
				//maybe I should move this to probe.update()
				let [bx, by] = probe.getPos();
				let [px, py] = paddle.getPos();
				let [nx, ny] = Vector.normalize(px-bx, py-by);
				Ball.prototype.updateSteer.call(probe,
					[nx, ny, this.steerStrength, 0.01], delta);
			}
			//attach to paddle
			let [check] = paddle.checkCollision(probe);
			if (check)
				this.setState("paddle");
		}
	}

	update(delta){
		if (mouse.m1 == 1 && this.state == "ball"){
			this.setState("free");
		}
	}
}
f[83] = function(){
	for (let ball of game.get("balls")){
		if (!ball.components.probe){
			ball.normal();
			ball.components.probe = new Probe(ball);
		}
	}
};

//Shrink
f[97] = function(){
	playSound("shrink_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_small");
		ball.createShape(true);
		ball.damage = 5;
	}
};

//Sight laser
class SightLaser{
	constructor(ball){
		this.ball = ball;
		//create a graphics object in order to draw lasers on it
		let laser = new PIXI.Graphics();
		game.top.hud.addChild(laser);
		this.laser = laser;
		//used for drawing the paddle's hitbox for debugging
		this.debugHitbox = new PIXI.Graphics();
		laser.addChild(this.debugHitbox);
	}
	destructor(){
		game.top.hud.removeChild(this.laser);
	}
	preUpdate(delta){
		let paddle = game.get("paddles")[0];
		let ball = this.ball;
		let [x0, y0] = ball.getPos();
		let [x1, y1] = [null, null];		
		let vx = ball.vx;
		let vy = ball.vy;
		[vx, vy] = Vector.normalize(vx, vy);
		let r = ball.shape.radius;
		let lwall = DIM.lwallx + r;
		let rwall = DIM.rwallx - r;
		let floor = DIM.height;
		let ceil = DIM.ceiling;

		let laser = this.laser;
		laser.clear()
			.lineStyle(1, 0xFFFF00)
			.moveTo(x0, y0);

		let debugHitbox = this.debugHitbox;

		debugHitbox.clear();

		//limit number of laser bounces to 10
		for (let i = 0; i < 10; i++){
			let [check, mag] = Ball.raycastTo(
				paddle, x0, y0, vx, vy, r, //debugHitbox
			);
			if (check && vy > 0){
				//Rebound off paddle
				//draw line to paddle hit location
				x1 = x0 + vx * mag;
				y1 = y0 + vy * mag;
				laser.lineTo(x1, y1);
				[x0, y0] = [x1, y1];
				//draw projected ball hit location
				debugHitbox.beginFill(0xFF0000, 0.5)
					.drawCircle(x1, y1, r)
					.endFill();
				//change velocity based on paddle rebound
				//see Paddle.reboundBall()
				let dx = x1 - paddle.x;
				let mag2 = dx / (paddle.paddleWidth/2);
				mag2 = Math.max(-1, Math.min(1, mag2));
				let rad = 60 * mag2 * Math.PI / 180; //radians
				[vx, vy] = Vector.rotate(0, -1, rad);
			}
			else{
				if (vx == 0)
					break;
				let wall = (vx < 0) ? lwall : rwall;
				let dx = wall - x0;
				let dy = dx * vy / vx;
				x1 = x0 + dx;
				y1 = y0 + dy;
				//stop the laser if it goes above the ceiling
				//or below the floor
				if (y1 < ceil || y1 > floor){
					y1 = (y1 < ceil) ? ceil : floor;
					x1 = x0 + ((y1 - y0) * vx / vy);
					laser.lineTo(x1, y1);
					break;
				}
				laser.lineTo(x1, y1);
				vx = -vx;
				[x0, y0] = [x1, y1];
			}
		}
	}
}
f[100] = function(){
	playSound("generic_collected");
	for (let ball of game.get("balls")){
		if (!ball.components.sightlaser)
			ball.components.sightlaser = new SightLaser(ball);
	}
};

//Snapper
class Snapper{
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

//Volt
class Volt{
	constructor(ball){
		const ticks_per_second = 10;
		const damage_per_tick = 3;
		const shock_framerate = 30;

		this.ball = ball;
		this.target = null;
		this.attackRadius = 250;
		this.searchRadius = 200;
		this.timer = 0;
		this.delay = 1000 / ticks_per_second;
		this.damage = damage_per_tick;

		this.shock = new PIXI.Graphics();
		game.top.hud.addChild(this.shock);
		this.shockTimer = 0;
		this.shockDelay = 1000 / shock_framerate;
	}

	destructor(){
		game.top.hud.removeChild(this.shock);
		stopSound("volt_attack", false, this);
	}

	preUpdate(delta){
		if (!this.ball.isActive())
			this.shock.clear();
	}

	update(delta){
		//update the gameplay tick (find target, damage target)
		let change = false;

		this.timer -= delta;
		if (this.timer <= 0){
			this.timer += this.delay;
			change = this.tick();
		}

		if (this.target){
			if (change)
				this.shockTimer = 0;
			else
				this.shockTimer -= delta;
			if (this.shockTimer <= 0){
				this.shockTimer += this.shockDelay;
				this.drawShock();
			}
		}
		else if (change)
			this.shock.clear();
	}

	getDist(obj){
		let [x0, y0] = this.ball.getPos();
		let [x1, y1] = obj.getPos();
		return Vector.dist(x0, y0, x1, y1);
	}

	//returns true if this.target has changed
	tick(){
		let prevTarget = this.target;
		//remove target if it is too far away
		if (this.target && this.getDist(this.target) > this.attackRadius)
			this.target = null;
		//acquire a new target if target doesn't exist
		if (!this.target){
			let closest = null;
			let minDist = Infinity;
			for (let br of game.get("bricks")){
				if (br.armor <= 0){
					let dist = this.getDist(br);
					if (dist < minDist){
						closest = br;
						minDist = dist;
					}
				}
			}
			if (minDist < this.searchRadius)
				this.target = closest;
		}
		//deal damage to the target and remove if target is dead
		if (this.target){
			//do not do damage to newly-acquired targets
			if (prevTarget === this.target)
				this.target.takeDamage(this.damage, 0);
			if (this.target.isDead())
				this.target = null;
			else
				stopSound(this.target.hitSound);
		}
		if (!prevTarget && this.target)
			playSound("volt_attack", true, this);
		else if (prevTarget && !this.target)
			stopSound("volt_attack", false, this);
		return prevTarget !== this.target;
	}

	drawShock(){
		if (!this.target){
			alert("Volt Target does not exist!");
			return;
		}
		let [x0, y0] = this.ball.getPos();
		let [x1, y1] = this.target.getPos();

		let shock = this.shock;
		shock.clear();
		let colors = [0xFFFFFF, 0xFFFF00, 0x00FFFF];
		for (let color of colors)
			shockify(shock, x0, y0, x1, y1, {color});
	}
}
f[120] = function(){
	playSound("volt_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_2");
		ball.components.weak = new Volt(ball);
	}
};

//Voodoo
class Voodoo{
	constructor(ball){
		this.ball = ball;
	}
	onSpriteHit(obj, norm, mag){
		if (obj.gameType != "brick")
			return;
		if (obj.armor > 0)
			return;

		//instantly damage two other bricks
		let bricks = game.get("bricks").filter(
			brick => (brick.armor < 1 && brick != obj)
		);
		for (let i = 0; i < 2; i++){
			if (bricks.length == 0)
				break;
			let [br] = bricks.splice(randRange(bricks.length), 1);
			br.takeDamage(10, 0);
		}
	}
}
f[121] = function(){
	playSound("voodoo_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_1");
		ball.components.voodoo = new Voodoo(ball);
	}
};

//Weak
class Weak{
	constructor(ball){
		this.ball = ball;
		this.timer = 20000;
		ball.damage = (Math.random() < 0.5) ? 10 : 0;
	}
	onSpriteHit(obj, norm, mag){
		this.ball.damage = (Math.random() < 0.5) ? 10 : 0;
	}
	preUpdate(delta){
		this.timer -= delta;
		if (this.timer <= 0)
			this.ball.normal();
	}
}
f[123] = function(){
	playSound("weak_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_3_1");
		ball.components.weak = new Weak(ball);
	}
	game.top.createMonitor("Weak", "balls", "weak", "timer");
};

//Whiskey or Whisky if you're Canadian
class Whiskey{
	constructor(ball){
		this.ball = ball;
		this.timer = 0;
		this.emitterTimer = 0;
		this.emitterDelay = 15;
	}

	preUpdate(delta){
		this.emitterTimer -= delta;
		if (this.emitterTimer > 0)
			return;

		let ball = this.ball;
		this.emitterTimer += this.emitterDelay;
		let tex = "whiskey_" + randRange(4);

		let vel = new Vector(0, -1);
		vel = vel.rotate(randRange(-60, 60) * Math.PI / 180);
		vel = vel.scale(randRangeFloat(0.01, 0.1));

		let pos = new Vector(0, randRangeFloat(ball.radius));
		pos = pos.rotate(randRangeFloat(2 * Math.PI));
		pos = pos.add(new Vector(...ball.getPos()));

		let p = new Particle(tex, pos.x, pos.y, vel.x, vel.y);
		p.setFade(0.002, 0, 100, true);
		game.emplace("particles", p);

	}
	update(delta){
		this.timer += delta;
		let deg = Math.sin(15 * this.timer / (1000 * Math.PI));
		deg *= 0.12 * delta;
		this.ball.rotateVel(deg * Math.PI / 180);
	}
}
f[126] = function(){
	playSound("whiskey_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_3_2");
		ball.components.whiskey = new Whiskey(ball);
	}
};
//YoYo
class Yoyo{
	constructor(ball){
		this.ball = ball;
	}

	preUpdate(delta){
		let ball = this.ball;
		let by = ball.y;
		let multiplier = 0.8 + 5*(1-(by/900))**2;
		ball.velOverride = {
			vx: ball.vx * multiplier,
			vy: ball.vy * multiplier
		};
	}
}
f[129] = function(){
	playSound("yoyoga_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_4_5");
		ball.components.yoyo = new Yoyo(ball);
	}
};

//Y-Return YReturn
class YReturn{
	constructor(ball){
		this.ball = ball;
	}

	update(delta){
		let ball = this.ball;
		if (ball.vy <= 0)
			return;

		let paddle = game.get("paddles")[0];
		let [bx, by] = ball.getPos();
		let [px, py] = paddle.getPos();
		ball.setSteer(px-bx, py-by, 0.005);
	}
}
f[131] = function(){
	playSound("yreturn_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.setTexture("ball_main_1_5");
		ball.components.yreturn = new YReturn(ball);
	}
};

/*****************
* Paddle Weapons *
******************/

//Gun Weapon subcategory

//NOTE: Need to copy extra arguments too
class PaddleWeapon{
	constructor(paddle, name, maxBullets){
		this.paddle = paddle;
		this.name = name;
		this.maxBullets = maxBullets;
		this.bulletCount = 0;
		this.clickPriority = 0;
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

class BallCannon extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "ballcannon", 8);
	}
	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		let deg = [-15, -5, 5, 15];
		for (let theta of deg){
			let rad = theta*Math.PI/180;
			let [vx, vy] = Vector.rotate(0, -0.8, rad);
			let p = new BallProjectile("ballcannon_ball", 0, 0, vx, vy);
			p.damage = 10;
			p.colFlag.paddle = true;
			p.setBounce(true);
			p.timer = 3000;

			this.fireProjectile(p, 0);
		}
		playSound("ballcannon_fire");
	}
}
f[5] = function(){
	playSound("cannon_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_26_2");
	paddle.setComponent("weapon", new BallCannon(paddle));
};

//Beam
class Beamer{
	constructor(paddle){
		this.paddle = paddle;
		this.name = "beamer";

		this.isFiring = false;
		this.timerMax = 5000; //in milliseconds
		this.timer = this.timerMax;
		this.initialCost = 250;
		this.minActivation = 1000;
		this.regenSpd = 1; //regen speed multiplier
		this.regenDelay = 500;
		this.regenTimer = this.regenDelay;

		//beam graphic
		const [, py] = paddle.getPos();
		const [, ph] = paddle.getDim();
		const bw = 40;
		const bh = py - ph/2 - DIM.ceiling;
		let beam = new PIXI.Graphics();
		beam.beginFill(0x00FF00)
			.drawRect(-bw/2, -bh - ph/2, bw, bh);
		beam.scale.set(0.5);
		beam.alpha = 0.5;
		beam.visible = false;
		paddle.addChild(beam);
		this.beam = beam;
		this.beamWidth = bw;

		//energy bar hud
		let bar = new PIXI.Graphics();
		bar.scale.set(0.5);
		//val should be in range [0-1]
		let comp = this;
		bar.setProgress = function(val){
			let w = paddle.paddleWidth - 40;
			let h = 10;
			w *= val;
			this.clear();
			if (val < comp.minActivation / comp.timerMax)
				this.beginFill(0xFFBB00);
			else
				this.beginFill(0x00FF00);
			this.drawRect(-w/2, -h/2, w, h);
		};
		bar.setProgress(1);
		paddle.addChild(bar);
		this.bar = bar;

		//debug, remove when done
		// let text = new PIXI.Text("00000", 
		// 	{fill: 0xFFFFFF, fontSize: 12});
		// text.position.set(0, -30);
		// paddle.addChild(text);
		// this.text = text;

	}

	destructor(){
		this.paddle.removeChild(this.beam, this.bar);
		stopSound("beam_fire", false, this);
		// this.paddle.removeChild(this.text);	
	}

	onClick(){
		//do nothing
	}

	update(delta){
		let paddle = this.paddle;
		const {
			timerMax, 
			initialCost,
			minActivation, 
			regenSpd, 
			regenDelay
		} = this;

		let prevFiring = this.isFiring;

		if (paddle.timeSinceRelease > 200 && mouse.m1 && mouse.inBoard()){
			if (this.isFiring){
				this.timer -= delta;
				if (this.timer <= 0){
					this.isFiring = false;
					this.timer = 0;
				}
			}
			else if (this.timer > minActivation){
				this.isFiring = true;
				this.timer -= initialCost;
				this.regenTimer = regenDelay;
			}
		}
		else{
			this.isFiring = false;
			this.regenTimer -= delta;
			if (this.regenTimer <= 0){
				this.timer += delta * regenSpd;
				this.timer = Math.min(this.timer, timerMax);
			}
		}

		this.beam.visible = this.isFiring;
		this.bar.setProgress(this.timer / timerMax);

		if (this.isFiring)
			this.pullBalls(delta);

		if (!prevFiring && this.isFiring)
			playSound("beam_fire", true, this);
		else if (prevFiring && !this.isFiring)
			stopSound("beam_fire", false, this);

		// this.text.text = String(Math.floor(this.timer));
	}

	//pull balls towards the center of the beam
	pullBalls(delta){
		const bw = this.beamWidth;
		const px = this.paddle.x;

		//make ball travel at a 45 degree angle
		//if it's traveling too horizontally
		function fixTradjectory(ball){
			let [vx, vy] = ball.getVel();
			if (Math.abs(vx) > Math.abs(vy)){
				let spd = ball.getSpeed();
				let [nx, ny] = Vector.normalize(
					(vx > 0) ? 1 : -1,
					(vy > 0) ? 1 : -1
				);
				ball.setVel(nx*spd, ny*spd);
			}
		}

		for (let ball of game.get("balls")){
			
			//once inside the beam, make ball bounce along
			//the "walls"
			const r = ball.shape.radius;
			const ball_left = ball.x - r;
			const ball_right = ball.x + r;
			const beam_left = px - bw/2;
			const beam_right = px + bw/2;

			let steer_x = (ball.x < px) ? 1 : -1;
			let steer_y = 0;

			if (ball.x > beam_left && ball.x < beam_right){
				steer_y = (ball.vy > 0) ? 1 : -1;
				if (ball.vx < 0 && ball_left < beam_left){
					ball.handleCollision(1, 0);
					fixTradjectory(ball);
				}
				else if (ball.vx > 0 && ball_right > beam_right){
					ball.handleCollision(-1, 0);
					fixTradjectory(ball);
				}
			}

			ball.setSteer(steer_x, steer_y*2, 0.01);
		}
	}
}
f[8] = function(){
	playSound("generic_collected");
	let paddle = game.get("paddles")[0];
	if (paddle.components.weapon?.name == "beamer"){
		let beamer = paddle.components.weapon;
		beamer.timerMax += 5000;
		beamer.timer = beamer.timerMax;
	}
	else{
		paddle.clearPowerups();
		paddle.setTexture("paddle_20_1");
		paddle.setComponent("weapon", new Beamer(paddle));
	}
};

//Control
/* The Plan:
	1. get vector from ball to control
	2. scale vector down (or up) to control.radius/2
	3. rotate vector around control.center by small amount
	4. make ball steer towards control.center + vector
	5. ???
	6. Profit!
*/
class Control{
	constructor(paddle){
		this.paddle = paddle;

		let control = new Sprite(null);
		Object.assign(control, {
			active: false,
			visible: false,
			radius: 50,
			ctrlTimer: 0,
			ctrlTimerMax: 5000,
			cd: 0,
			cdMax: 10000,
		});
		control.scale.set(1);
		control.rings = new PIXI.Graphics();
		control.addChild(control.rings);
		game.emplace("ball_underlay", control);
		this.control = control;

		let crosshair = new Sprite("control_crosshair");
		game.top.hud.addChild(crosshair);
		this.crosshair = crosshair;

		this.name = "control";
	}

	destructor(){
		this.control.kill();
		game.top.hud.removeChild(this.crosshair);
		stopSound("control_active");
	}

	onClick(mouseVal){
		let ctrl = this.control;
		if (mouseVal != 1 || ctrl.cd > 0)
			return;

		ctrl.active = true;
		ctrl.visible = true;
		ctrl.ctrlTimer = 0;
		ctrl.cd = ctrl.cdMax;
		ctrl.setPos(mouse.x, mouse.y);
		playSound("control_active", true);
	}

	update(delta){
		let ctrl = this.control;
		let cross = this.crosshair;

		ctrl.cd = Math.max(0, ctrl.cd - delta);
		if (ctrl.active){
			this.pullBalls(delta);
			ctrl.ctrlTimer += delta;
			if (ctrl.ctrlTimer >= ctrl.ctrlTimerMax){
				ctrl.active = false;
				ctrl.visible = false;
				stopSound("control_active");
			}
			else{
				this.drawRings();
			}
		}

		cross.position.set(mouse.x, mouse.y);
		cross.visible = ctrl.cd == 0;
	}

	pullBalls(delta){
		const mag = 0.5 * Math.PI / 180;
		const {x, y, radius: r} = this.control;
		let center = new Vector(x, y);
		for (let ball of game.get("balls")){
			let pos = new Vector(ball.x, ball.y);
			let vec = pos.sub(center);
			let dist = vec.len();

			if (dist > 5 && dist < r){
				//make the ball spin in a circle

				//move clockwise or counterclockwise based
				//on the ball's velocity relative to displacement
				let sign = Vector.angleSign(vec.x, vec.y, ball.vx, ball.vy);

				vec = vec.rotate(delta * mag * sign);
				let factor = 1 - delta/(10*dist);
				let pos2 = center.add(vec.scale(factor));
				let target = pos2.sub(pos);
				ball.setSteer(target.x, target.y, 0.025);
			}

			else if (dist < r + 20){
				//trap the ball inside the control circle
				let norm = vec.normalized().scale(-1);
				ball.handleCollision(norm.x, norm.y);
			}
		}
	}

	drawRings(){
		let {rings, radius, ctrlTimer: t} = this.control;

		const gap = 20;
		const off = (t / 25) % gap;
		rings.clear();
		rings.lineStyle(2, 0x00FFFF);

		for (let r = radius - off; r > 0; r -= gap){
			rings.drawCircle(0, 0, r);
		}
	}
}
f[19] = function(){
	playSound("control_collected");
	let paddle = game.get("paddles")[0];
	if (paddle.components.weapon?.name != "control"){
		paddle.clearPowerups();
		paddle.setTexture("paddle_17_2");
		paddle.setComponent("weapon", new Control(paddle));
	}
};

//Drill Missile
class DrillMissile extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "ballcannon", 1);
	}
	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		let mx = mouse.x;
		let j = Math.floor((mx - DIM.lwallx) / 32);
		j = Math.max(0, Math.min(13-1, j));
		let x = DIM.lwallx + 16 + (32*j);
		let y = this.paddle.y - 20;

		let drill = new Projectile("drill_0_0", x, y, 0, -0.3);
		drill.onDeath = function(){
			Projectile.prototype.onDeath.call(this);
			let i = Math.floor(Math.random() * 4);
			let tex = `det_smoke_normal_${i}`;
			let smoke = new Particle(tex, this.x, this.y);
			smoke.setGrowth(0.01, -0.00002);
			smoke.setFade(0.005);
			game.emplace("particles", smoke);
			playSound("drill_explode");
		};

		drill.addAnim("spin", "drill_yellow", 0.25, true, true);
		drill.damage = 100;
		drill.strength = 1;
		drill.pierce = true;
		drill.parentWeapon = this;
		this.bulletCount++;
		game.emplace("projectiles", drill);
		
		playSound("drill_fire");
	}
}
f[23] = function(){
	playSound("drill_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_24_1");
	paddle.setComponent("weapon", new DrillMissile(paddle));
};

//Hacker
class Hacker{
	static hackableBricks = generateLookup([
		"shooter",
		"shove",
		"factory",
		"jumper",
		"rainbow",
		"split",
		"slotmachine",
		"launcher",
		"twinlauncher",
		"comet"
	]);

	constructor(paddle){
		this.paddle = paddle;

		let sprite = new GraphicsSprite();
		game.emplace("particles", sprite);
		this.sprite = sprite;
	}

	destructor(){
		this.sprite.kill();
	}

	onClick(mouseVal){
		if (mouseVal != 1)
			return;
		if (!this.target)
			return;

		let br = this.target;
		br.takeDamage(10, 0);
		if (br.brickType == "factory")
			this.factoryHack(br);
	}

	factoryHack(br){
		//angle between horizontal and bottom right corner of brick
		const phi = Vector.angleBetween(1, 0, 2, 1);
		const PI = Math.PI;

		let mx = mouse.x;
		let my = mouse.y;
		let rad = Math.atan2(my-br.y, mx-br.x);
		
		//brick comes out on the side opposite to cursor
		let side = null;
		if (rad > -phi && rad < phi)
			side = "right";
		else if (rad >= phi && rad < PI - phi)
			side = "down";
		else if (rad <= -phi && rad > -(PI - phi))
			side = "up";
		else
			side = "left";

		// console.log(`factory hack ${rad*180/PI} ${dir}`);
		br.generateBrick(side);

	}

	canHack(brick){
		return !!Hacker.hackableBricks[brick.brickType];
	}

	acquireTarget(){
		let mx = mouse.x;
		let my = mouse.y;

		let minDist = Infinity;
		let target = null;
		for (let br of game.get("bricks")){
			let dist = Vector.dist2(br.x, br.y, mx, my);
			if (this.canHack(br) && dist < minDist){
				minDist = dist;
				target = br;
			}
		}

		this.target = target;
	}

	update(delta){
		let gr = this.sprite;
		let paddle = this.paddle;

		this.acquireTarget();

		gr.clear();
		if (this.target){
			let br = this.target;
			gr.lineStyle(2, 0xFFFF000)
				.moveTo(paddle.x, paddle.y)
				.lineTo(br.x, br.y + 8)
				.drawRect(br.x-16, br.y-8, 32, 16);
		}
	}
}

f[41] = function(){
	playSound("hacker_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_21_1");
	paddle.setComponent("weapon", new Hacker(paddle));
}


class Invert{
	constructor(paddle){
		this.paddle = paddle;
		this.cdMax = 2000;
		this.cd = 0;
	}

	onClick(mouseVal){
		if (mouseVal != 1)
			return;
		if (this.cd > 0)
			return;
		this.cd = this.cdMax;

		for (let ball of game.get("balls")){
			ball.vy *= -1;
			let p = new Particle(null, ball.x, ball.y);
			p.setRotation(Math.PI / 2);
			let ani = p.addAnim("invert", "invert", 0.25, false, true);
			ani.onCompleteCustom = function(){
				p.kill();
			}
			game.emplace("particles",  p);
		}

	}

	update(delta){
		this.cd = Math.max(0, this.cd - delta);
	}
}
f[49] = function(){
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_29_1");
	paddle.setComponent("weapon", new Invert(paddle));
}

//Laser and Laser Plus
class Laser extends PaddleWeapon{
	constructor(paddle, plus=false){
		super(paddle, "laser", plus ? 6 : 4);
		this.isPlus = plus;
	}

	upgrade(plus){
		this.isPlus = this.isPlus || plus;
		this.maxBullets += 2;
	}

	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		playSound(this.isPlus ? "laserplus_fire" : "laser_fire");
		let paddle = this.paddle;
		let off = paddle.paddleWidth/2 - 17;
		let tex = this.isPlus ? "laser_1" : "laser_0";
		for (let dx of [-off, off]){
			let proj = new Projectile(tex, 0, 0, 0, -1);
			proj.damage = this.isPlus ? 1000 : 10;
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

//Pause
class Pause{
	constructor(paddle){
		this.paddle = paddle;
		this.pausedBalls = new Map();

		//amount of time the balls are slowed down
		this.pauseTimer = 0;
		this.pauseTimerMax = 2000;
		//time between pause activations
		this.cd = 0;
		this.cdMax = 5000;

		let ring = new GraphicsSprite();
		ring.expandSpeed = 0.8;
		ring.radius = 0;
		ring.maxRadius = Math.sqrt(DIM.boardw**2 + DIM.boardh**2);
		game.emplace("particles", ring);
		this.ring = ring;
	}

	destructor(){
		this.ring.kill();
	}

	onClick(mouseVal){
		let paddle = this.paddle;
		let ring = this.ring;

		if (this.cd > 0 || mouseVal != 1)
			return;

		this.cd = this.cdMax;
		this.pauseTimer = this.pauseTimerMax;

		this.pausedBalls.clear();
		ring.x = paddle.x;
		ring.y = paddle.y;
		ring.radius = 0;
		ring.visible = true;

		playSound("pause_activated");
	}

	update(delta){
		let {paddle, ring, pausedBalls} = this;

		this.cd = Math.max(0, this.cd-delta);

		if (this.pauseTimer > 0){
			this.pauseTimer -= delta;
			if (this.pauseTimer <= 0){
				ring.visible = false;
			}

			for (let ball of game.get("balls")){
				let dist = Vector.dist(ring.x, ring.y, ball.x, ball.y);
				if (dist < ring.radius)
					pausedBalls.set(ball, true);
			}
			for (let ball of pausedBalls.keys()){
				let [vx, vy] = ball.getVel();
				ball.velOverride = {vx: vx*0.1, vy: vy*0.1};
			}

			ring.radius += ring.expandSpeed * delta;
			if (ring.radius < ring.maxRadius){
				ring.clear()
					.lineStyle(2, 0xFFFFFF)
					.drawCircle(0, 0, ring.radius);				
			}
		}
	}
}
f[81] = function(){
	playSound("pause_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setComponent("weapon", new Pause(paddle));
}

//Rapidfire
class RapidFire extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "rapidfire");
		this.maxDelay = 200;
		this.delay = this.maxDelay;
		this.maxFlipDelay = 1000;
		this.flipDelay = this.maxFlipDelay;
		this.flip = false;
	}

	onClick(mouseVal){
		let paddle = this.paddle;

		if (paddle.timeSinceRelease < this.maxDelay)
			return;
		if (this.delay > 0)
			return;

		this.delay = this.maxDelay;
		let off = paddle.paddleWidth/2 - 17;
		for (let [i, dx] of [-off, off].entries()){
			if (this.flip)
				i = 1 - i;
			let proj = new Projectile(`rapid_${i}`, 0, 0, 0, -1);
			proj.damage = 5;
			this.fireProjectile(proj, dx);
		}
		playSound("rapidfire_fire");
	}

	update(delta){
		this.flipDelay -= delta;
		if (this.flipDelay <= 0){
			this.flipDelay = this.maxFlipDelay;
			this.flip = !this.flip;
		}
		this.delay = Math.max(0, this.delay-delta);
	}
}
f[89] = function(){
	playSound("shotgun_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_4_1");
	paddle.setComponent("weapon", new RapidFire(paddle));
};

//Shotgun
class Shotgun extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "shotgun", 12);
	}
	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		let deg = [-25, -15, -5, 5, 15, 25];
		for (let theta of deg){
			let rad = theta*Math.PI/180;
			let [vx, vy] = Vector.rotate(0, -0.8, rad);
			let p = new Projectile("shotgun_pellet", 0, 0, vx, vy);
			p.scale.set(1);
			p.damage = 5;
			this.fireProjectile(p, 0);
		}
		playSound("shotgun_fire");
	}
}
f[99] = function(){
	playSound("shotgun_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_26_1");
	paddle.setComponent("weapon", new Shotgun(paddle));
};

//Missile
class Missile extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "missile", 4);
	}
	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		playSound("missile_fire");
		let paddle = this.paddle;
		let off = paddle.paddleWidth/2 - 17;
		for (let dx of [-off, off]){
			let p = new Projectile("missile_0_0", 0, 0, 0, -0.1);
			p.ay = -0.002;
			p.scale.set(1);
			p.createShape();
			p.addAnim("spin", "missile_normal", 0.25, true, true);
			p.onSpriteHit = function(obj, norm, mag){
				this.kill();
				DetonatorBrick.explode(obj);
			};
			this.fireProjectile(p, dx);
		}
	}
}
f[66] = function(){
	playSound("missile_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_23_1");
	paddle.setComponent("weapon", new Missile(paddle));
};

//Erratic Missile
class ErraticMissile extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "erraticmissile", 4);
	}
	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		playSound("missile_erratic_fire");
		let paddle = this.paddle;
		let off = paddle.paddleWidth/2 - 17;
		for (let dx of [-off, off]){
			let p = new Projectile("missile_1_0", 0, 0, 0, -0.6);
			p.scale.set(1);
			p.createShape();
			p.addAnim("spin", "missile_erratic", 0.25, true, true);
			this.setHoming(p);
			this.fireProjectile(p, dx);
		}
	}
	//TODO: Add raycasting to to prevent missiles from targeting
	//		bricks hidden behind indestructible bricks
	setHoming(p){
		let updateSteer = Ball.prototype.updateSteer;
		p.update = function(delta){
			let closest = {br: null, dist: Infinity};
			for (let br of game.get("bricks")){
				if (br.armor > 0)
					continue;
				let dist = (br.x-this.x)**2 + (br.y-this.y)**2;
				if (dist < closest.dist){
					closest.br = br;
					closest.dist = dist;
				}
			}
			if (closest.br){
				let br = closest.br;
				let steer = [br.x-this.x, br.y-this.y, 0.01, 0.01];
				updateSteer.call(this, steer, delta);
				let rad = Math.atan2(this.vy, this.vx);
				this.setRotation(rad+Math.PI/2);
			}
			Projectile.prototype.update.call(this, delta);
		}
	}
}
f[27] = function(){
	playSound("missile_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_24_1");
	paddle.setComponent("weapon", new ErraticMissile(paddle));
};

//Transform
var transformableBricks = generateLookup([
	"metal",
	"gold",
	"copper",
	"speed",
	"alien",
	"factory",
	"tiki",
	"lasereye",
	"boulder",
	"jumper",
	"rainbow",
	"parachute",
	"sequence",
	"split"
]);

function canBeTransformed(brick){
	return !!transformableBricks[brick.brickType];
}

//kill brick and replace it with a Normal Brick
function transformBrick(brick, ci=0, cj=0){
	//make sure to check if brick can be transformed first
	brick.kill();
	brick.suppress = true;
	let [i, j] = getGridPos(...brick.getPos());
	let [x, y] = getGridPosInv(i, j);

	let newBrick = new NormalBrick(x, y, ci, cj);
	game.emplace("bricks", newBrick);
}

class Transform{
	constructor(paddle){
		this.paddle = paddle;
		this.target = null;

		this.timer = 0;
		this.maxTimer = 1000;

		const [bw, bh] = [32, 16];
		let glow = new Sprite(null);
		glow.scale.set(1);
		let gr = new PIXI.Graphics()
			.beginFill(0xFFFFFF)
			.drawRect(-bw/2, -bh/2, bw, bh);
		glow.addChild(gr);
		game.emplace("particles", glow);
		this.glow = glow;

		let lasers = new GraphicsSprite(0, 0);
		game.emplace("particles", lasers);
		this.lasers = lasers;
	}

	destructor(){
		this.glow.kill();
		this.lasers.kill();
	}

	onClick(mouseVal){
		let paddle = this.paddle;
		if (paddle.timeSinceRelease < 200)
			return;

		if (!this.target){
			this.acquireTarget();
		}
	}

	acquireTarget(){
		let mx = mouse.x;
		let my = mouse.y;
		let minDist = Infinity;
		let target = null;
		for (let br of game.get("bricks")){
			let dist = Vector.dist2(mx, my, br.x, br.y);
			if (canBeTransformed(br) && dist < minDist){
				minDist = dist;
				target = br;
			}
		}

		if (target){
			this.target = target;
			this.glow.setPos(target.x, target.y);
			this.glow.visible = true;
			this.lasers.visible = true;
			this.timer = 0;
		}
	}

	update(delta){
		let glow = this.glow;
		let lasers = this.lasers;
		let paddle = this.paddle;

		if (mouse.m1 == 0){
			this.target = null;
		}

		if (this.target){
			this.timer += delta;
			if (this.timer >= this.maxTimer){
				transformBrick(this.target, 1, 2);
				playSound("transform_brick");
				this.target = null;
			}
			else{
				glow.alpha = this.timer / this.maxTimer;

				let [tx, ty] = this.target.getPos();
				let [px, py] = paddle.getPos();
				let pw = paddle.paddleWidth / 2 - 16;
				lasers.clear()
					.lineStyle(2, 0xFF9900)
					.moveTo(px-pw, py)
					.lineTo(tx, ty)
					.moveTo(px+pw, py)
					.lineTo(tx, ty);
			}
		}

		glow.visible = !!this.target;
		lasers.visible = !!this.target;

	}
}

f[108] = function(){
	let paddle = game.get("paddles")[0];
	if (paddle.components.weapon?.name != "transform"){
		paddle.clearPowerups();
		paddle.setTexture("paddle_24_1");
		paddle.setComponent("weapon", new Transform(paddle));
	}
}

//Paddle Subweapon Subcategory

//Javelin
class Javelin{
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
		this.clickPriority = -1;

		let glow = media.shaders.glow;
		paddle.filters = [glow];
		glow.uniforms.color = [1, 1, 1];
		glow.uniforms.mag = 0;
		this.glowShader = glow;
	}
	destructor(){
		stopSound("javelin_charge");
		this.paddle.removeChild(this.energyParticles);
		this.paddle.filters = null;
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
		p.wallCheck = false;
		p.damage = 1000;
		p.strength = 1;
		p.pierce = "strong";
		let superUpdate = p.update;
		p.update = function(delta){
			let [x0, y0, x1, y1] = this.getAABB();
			if (y1 < DIM.ceiling)
				this.kill();
			superUpdate.call(this, delta);
		}

		game.emplace("projectiles", p);
	}
	onClick(mouseVal){
		if (mouseVal == 1)
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
		this.glowShader.uniforms.mag = 1-val;

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
};

//Rocket
class Rocket{
	constructor(paddle){
		this.paddle = paddle;

		this.rocketSpeed = 1;
		this.state = "ready";
		this.loop = 0;
	}

	destructor(){
		this.paddle.y = Paddle.baseLine;
		this.projectiles?.kill();
	}

	onClick(mouseVal){
		if (mouseVal != 1)
			return;
		if (this.state != "ready")
			return;

		this.state = "active";
		this.attachProjectile();
		playSound("rocket_launch");
	}

	update(delta){
		let paddle = this.paddle;
		if (this.state == "active"){
			paddle.y -= this.rocketSpeed * delta;
			if (paddle.y < DIM.ceiling - 16 - 8){
				paddle.y = DIM.h + 8;
				this.loop++;
			}
			if (this.loop && paddle.y < Paddle.baseLine){
				paddle.clearPowerups();
			}
			this.projectile.setPos(...paddle.getPos());
		}
	}

	attachProjectile(){
		let paddle = this.paddle;
		let p = new Projectile(null, paddle.x, paddle.y);
		p.setShape(new RectangleShape(paddle.paddleWidth, 16));
		p.damage = 100;
		p.strength = 1;
		p.pierce = "strong";
		p.wallCheck = false;
		p.floorCheck = false;
		game.emplace("projectiles", p);
		this.projectile = p;
	}
}
f[95] = function(){
	playSound("rocket_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setComponent("weapon", new Rocket(paddle));

}

//X-Bomb (Xbomb)
class Xbomb{
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
	playSound("xbomb_collected");
	let paddle = game.get("paddles")[0];
	if (paddle.components.subweapon?.name == "xbomb")
		return;

	paddle.setComponent("subweapon", new Xbomb(paddle));
};

/****************
* Paddle Modify *
*****************/
//Autopilot
class Autopilot{
	//Implmentation of Autopilot is done in Paddle.autopilot
	//This component only keeps track of the timer
	constructor(paddle){
		this.paddle = paddle;
		this.timer = 10000;
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0)
			this.paddle.clearPowerups();
	}
}
f[4] = function(){
	let paddle = game.get("paddles")[0];
	let auto = paddle.components.autopilot;
	if (auto){
		auto.timer += 10000;
		return;
	}
	paddle.clearPowerups();
	paddle.setComponent("autopilot", new Autopilot(paddle));
	game.top.createMonitor(
		"Autopilot", "paddles", "autopilot", "timer");
};

//Cannon
class Cannonball{
	constructor(ball){
		this.ball = ball;
		ball.setTexture("ball_main_2_9");
		ball.damage = 1000;
		ball.strength = 1;
		ball.pierce = true;
	}

	preUpdate(delta){
		this.ball.velOverride = {vx:0, vy:-1};
	}

	handleCollision(xn, yn){
		//turn into a fireball
		let ball = this.ball;
		ball.normal();
		ball.components.fireball = new FireBall(ball);
		let [vx, vy] = ball.getVel();
		let rad = randRange(-45, 45) * Math.PI / 180;
		[vx, vy] = Vector.rotate(vx, vy, rad);
		ball.setVel(vx, vy);
	}
}
class Cannon{
	constructor(paddle){
		this.paddle = paddle;
		this.name = "cannon";
		this.ball = null;

		let stuckBalls = paddle.stuckBalls;
		if (stuckBalls.length > 0){
			let [ball, offset] = stuckBalls.pop();
			this.attachCannonball(ball);
		}

	}

	destructor(){
		if (this.ball)
			this.fire();
	}

	attachCannonball(ball){
		playSound("cannon_drumroll", true);
		this.ball = ball;
		ball.normal();
		ball.components.cannon = new Cannonball(ball);
		ball.stuckToPaddle = true;
		ball.setVel(0, -ball.getSpeed());
	}

	onBallHit(ball){
		if (this.ball)
			return;
		this.attachCannonball(ball);
	}

	onClick(mouseVal){
		if (mouseVal == 1 && this.ball)
			this.fire();
	}

	fire(){
		let ball = this.ball;
		this.ball = null;
		ball.stuckToPaddle = false;
		stopSound("cannon_drumroll");
		playSound("cannon_fire");
		this.paddle.clearPowerups();
	}

	update(delta){
		if (!this.ball)
			return;

		let ball = this.ball;
		ball.setPos(...this.paddle.getPos());
	}
}
f[13] = function(){
	let paddle = game.get("paddles")[0];
	if (paddle.components.subweapon?.name != "cannon"){
		playSound("cannon_collected");
		paddle.clearPowerups();
		paddle.setTexture("paddle_31_1");
		paddle.setComponent("subweapon", new Cannon(paddle));
	}
};

//Catch
class Catch{
	constructor(paddle){
		this.paddle = paddle;
		this.name = "catch";
	}
	onBallHit(ball){
		this.paddle.attachBall(ball);
	}
}
f[14] = function(){
	playSound("catch_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_10_2");
	paddle.setComponent("catch", new Catch(paddle));
};

//Hold Once
class HoldOnce extends Catch{
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
	playSound("catch_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_30_1");
	paddle.setComponent("catch", new HoldOnce(paddle));
};

//Glue
class Glue extends Catch{
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

//Extend
f[28] = function(){
	playSound("extend_collected");
	let paddle = game.get("paddles")[0];
	paddle.incrementSize(1);
};

//Normal Ship
f[75] = function(){
	playSound("normal_collected");
	let paddle = game.get("paddles")[0];
	paddle.normal();
};

//Restrict
f[90] = function(){
	playSound("restrict_collected");
	let paddle = game.get("paddles")[0];
	paddle.incrementSize(-1);
};

/****************
* Brick-Related *
*****************/

//Bulk
function bulkNormal(br){
	let [i, j] = br.normalInfo;
	if (j == 20)
		i = 0;
	let bulkTex = `brick_bulk_${i}_${j}`;
	if (!br.preBulkTex)
		br.preBulkTex = br.texture;
	br.setTexture(bulkTex);
	br.health = 20;
	br.points *= 2; 

	br.takeDamage = function(damage, strength){
		NormalBrick.prototype.takeDamage.call(this, damage, strength);
		if (this.health <= 10)
			this.setTexture(this.preBulkTex);
	}
}
function bulkMetal(br){
	let level = Math.min(6, br.level + 1);
	let tex = `brick_main_6_${level}`;
	let anistr = `brick_shine_${3+level}`;
	br.setTexture(tex);
	br.addAnim("shine", anistr, 0.25);
	br.level = level;
	br.health = (level + 1) * 10;
	br.points = 100 + (level - 1) * 20;
}
f[11] = function(){
	playSound("bulk_collected");
	for (let br of game.get("bricks")){
		if (br.brickType == "normal")
			bulkNormal(br);
		else if (br.brickType == "metal")
			bulkMetal(br);
	}
};

//HaHa
f[43] = function(powerup){
	playSound("haha_collected");
	let [px, py] = powerup.getPos();
	let grid = game.top.brickGrid;
	//get all empty grid nodes
	let choices = [];
	for (let i = 0; i < 32-8; i++){
		for (let j = 0; j < 13; j++){
			if (grid.isEmpty(i, j))
				choices.push([i, j]);
		}
	}
	//spawn bricks in random empty spaces
	for (let n = 0; n < 14; n++){
		if (choices.length == 0)
			break;
		let index = randRange(choices.length);
		let [i, j] = choices[index];
		choices.splice(index, 1);
		let [x, y] = getGridPosInv(i, j);
		//Spawn a Forbidden Brick at target location
		//to reserve the Normal Brick's destination
		let fb = new ForbiddenBrick(x, y);
		game.emplace("bricks", fb);
		fb.timer = 100 + n * 50
			+ Vector.dist(px, py, x, y) / 0.5;
		//Spawn a Normal Brick in a callback
		let br = new NormalBrick(px, py);
		br.setTravel(x, y, "speed", 0.5, "kill");
		game.top.emplaceCallback(
			n * 50,
			() => {game.emplace("bricks", br);}
		);
	}
};

//Indigestion
f[47] = function(){
	playSound("indigestion_collected");
	let grid = game.top.brickGrid;
	for (let br of game.get("bricks")){
		if (br.brickType != "normal")
			continue;
		if (br.isMoving())
			continue;
		let [x0, y0] = br.getPos();
		let [i0, j0] = getGridPos(x0, y0);
		let off = [[0, -1], [1, 0], [0, 1], [-1, 0]];
		for (let [di, dj] of off){
			let [i, j] = [i0 + di, j0 + dj];
			if (i >= 32-8)
				continue;
			if (!boundCheck(i, j))
				continue;
			if (!grid.isEmpty(i, j, true))
				continue;
			let [x, y] = getGridPosInv(i, j);
			let br2 = new NormalBrick(x0, y0, ...br.normalInfo);
			br2.setTravel(x, y, "time", 200);
			game.emplace("bricks", br2);
			grid.reserve(i, j);
		}
	}
};

//Terraform
//	See Transform for info on which bricks to convert
f[104] = function(){
	playSound("terraform_collected");
	for (let br of game.get("bricks")){
		if (canBeTransformed(br)){
			let i = randRange(1, 5);
			let j = randRange(7, 9);
			transformBrick(br, i, j);
		}
	}
}

//Trail
class Trail{
	constructor(ball){
		this.ball = ball;
		this.count = 10;
	}
	update(delta){
		let grid = game.top.brickGrid;
		let [i, j] = getGridPos(...this.ball.getPos());
		if (grid.isEmpty(i, j)){
			let [x, y] = getGridPosInv(i, j);
			let br = new NormalBrick(x, y);
			br.overlap.set(this.ball, 1);
			game.emplace("bricks", br);

			this.count--;
			if (this.count == 0)
				delete this.ball.components.trail;
		}
	}
}
f[106] = function(){
	for (let ball of game.get("balls")){
		if (ball.components.trail)
			ball.components.trail.count += 10;
		else
			ball.components.trail = new Trail(ball);
	}
};

//Quasar
class Quasar extends Special{
	static growth = {
		s: 1, //scale
		vs: 7.5, //velocity
		as: -0.0075 //acceleration
	};
	constructor(){
		let s = Quasar.growth.s;
		super("quasar", DIM.w/2, DIM.h/2-16);
		this.growth = Object.assign({}, Quasar.growth);
		this.scale.set(this.growth.s);
	}
	update(delta){
		let {s, vs, as} = this.growth;
		let dt = delta/1000;

		s += vs*dt + 0.5*as*dt*dt;
		vs += as*delta;
		if (s <= 0){
			this.kill();
			return;
		}
		this.scale.set(s);

		this.rotation += 3 * dt;

		Object.assign(this.growth, {s, vs});

		let r = this.width/2;
		for (let br of game.get("bricks")){
			if (br.armor > 1)
				continue;
			if (!circleRectOverlap(this.x, this.y, r, br.x, br.y, 32, 16))
				continue;
			// if (br.brickType == "funky" && br.isRegenerating)
			// 	continue;
			if (br.isDead())
				continue;
			br.suppress = true;
			br.kill();
			this.createBrickParticle(br);
		}
	}
	createBrickParticle(br){
		let tex = br.texture;
		//Funky bricks are special because they turn invisible
		//instead of 
		if (br.brickType == "funky")
			tex = br.storedTexture;
		let p = new Particle(tex, br.x, br.y);
		p.orbit = {
			cx: this.x,
			cy: this.y,
			rad: Math.atan2(br.y - this.y, br.x - this.x),
			r: Vector.dist(this.x, this.y, br.x, br.y)
		};
		p.orbit.vr = -0.005 * p.orbit.r ** 2;
		p.setGrowth(-0.00075);
		p.setFade(0.00075);
		p.update = function(delta){
			let dt = delta/1000;
			let {cx, cy, rad, r, vr} = this.orbit;

			this.x = cx + r * Math.cos(rad);
			this.y = cy + r * Math.sin(rad);
			rad += 2 * dt;
			r += vr * dt;

			Object.assign(this.orbit, {rad, r});
			Particle.prototype.update.call(this, delta);
		}

		game.emplace("particles", p);
	}
}
f[87] = function(){
	playSound("quasar_collected");
	game.emplace("specials1", new Quasar());
};

//Vendetta
f[117] = function(){
	let gr = game.top.brickGrid;
	let target = {row: 0, count: 0};
	for (let i = 0; i < 32; i++){
		let count = 0;
		for (let j = 0; j < 13; j++){
			for (let br of gr.grid[i][j]){
				if (br.armor < 2)
					count++;
			}
		}
		if (count > target.count){
			target.row = i;
			target.count = count;
		}
	}

	let [x, y] = getGridPosInv(target.row, 0);
	let drill = new Projectile("drill_1_0", x, y, 0.3, 0);
	drill.onDeath = function(){
		Projectile.prototype.onDeath.call(this);
		let i = Math.floor(Math.random() * 4);
		let tex = `det_smoke_normal_${i}`;
		let smoke = new Particle(tex, this.x, this.y);
		smoke.setGrowth(0.01, -0.00002);
		smoke.setFade(0.005);
		game.emplace("particles", smoke);
		playSound("drill_explode");
	};

	drill.addAnim("spin", "drill_green", 0.25, true, true);
	drill.damage = 100;
	drill.strength = 1;
	drill.pierce = true;
	//give it a smaller hitbox
	drill.setShape(new PolygonShape([
		0,0, 15,0, 15,31, 0,31
	]));
	drill.setRotation(Math.PI/2);
	game.emplace("projectiles", drill);

	playSound("drill_fire");
};

/********
* Other *
*********/

//Blackout
f[7] = function(){
	let black = new Special(PIXI.Texture.WHITE);
	black.anchor.set(0, 0);
	black.setPos(DIM.lwallx, DIM.ceiling);
	//PIXI.Texture.WHITE has a base size of 16x16
	black.scale.set(DIM.boardw/16, DIM.boardh/16);
	black.tint = 0x000000;
	black.alpha = 0;

	black.timer = 10000;
	black.update = function(delta){
		this.timer -= delta;
		if (this.timer <= 0){
			this.kill();
			return;
		}

		let t = 10000 - this.timer;
		if (t <= 1000)
			this.alpha = t/1000;
		else if (t <= 9000)
			this.alpha = 1;
		else
			this.alpha = 1 - (t-9000)/1000;
	};

	game.emplace("specials2", black);
	playSound("blackout_collected");
};

} //End block