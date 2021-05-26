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
			func();
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
		this.timer = 10000;
	}
	update(delta){
		this.ball.setSteer(0, -1, 0.005);
		this.timer -= delta;
		if (this.timer <= 0)
			this.ball.normal();
	}
};

f[1] = function(){
	// playSound("generic_collected");

	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.antigravity = new Antigravity(ball);
	}

	game.top.createMonitor(
		"Antigravity", "balls", "antigravity", "timer");
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
	// playSound("generic_collected");
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
	
	// playSound("generic_collected");
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

//Energy
var tempRecord;
var tempIndex;

let Energy = class{
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
}

//FireBall
let FireBall = class{
	constructor(ball){
		this.ball = ball;
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
			ball.setTexture("ball_main_1_0");
			ball.components.fireball = new FireBall(ball);
		}
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
		ball.damage = 100;
		ball.pierce = true;
		ball.components.mega = new Mega(ball);
	}
};

//Sight laser
let SightLaser = class{
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
			//ceiling = m*x
			//ceiling = (vy / vx) * x
		}




		// let dist = 1000;
		// let dx = nx * dist;
		// let dy = ny * dist;
		// laser.lineTo(x0 + dx, y0 + dy);

		// let [check, mag] = Ball.raycastTo(paddle, x0, y0, vx, vy, r, laser);
		// if (check){
		// 	let x1 = x0 + nx * mag;
		// 	let y1 = y0 + ny * mag;
		// 	laser.lineStyle()
		// 		.beginFill(0xFF0000, 0.5)
		// 		.drawCircle(x1, y1, r);
		// }

	}
}
f[100] = function(){
	playSound("generic_collected");
	for (let ball of game.get("balls")){
		if (!ball.components.sightlaser)
			ball.components.sightlaser = new SightLaser(ball);
	}
}

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

//Weak
let Weak = class{
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
}

/*****************
* Paddle Weapons *
******************/

//Gun Weapon subcategory

//NOTE: Need to copy extra arguments too
let PaddleWeapon = class{
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

let BallCannon = class extends PaddleWeapon{
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
};
f[5] = function(){
	playSound("cannon_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_26_2");
	paddle.setComponent("weapon", new BallCannon(paddle));
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

	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		playSound("laser_fire");
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

//Drill Missile
let DrillMissile = class extends PaddleWeapon{
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
};
f[23] = function(){
	playSound("drill_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_24_1");
	paddle.setComponent("weapon", new DrillMissile(paddle));
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

let Shotgun = class extends PaddleWeapon{
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
};
f[99] = function(){
	playSound("shotgun_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_26_1");
	paddle.setComponent("weapon", new Shotgun(paddle));
}

//Missile
let Missile = class extends PaddleWeapon{
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
};
f[66] = function(){
	playSound("missile_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_23_1");
	paddle.setComponent("weapon", new Missile(paddle));
};

//Erratic Missile
let ErraticMissile = class extends PaddleWeapon{
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
};
f[27] = function(){
	playSound("missile_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_24_1");
	paddle.setComponent("weapon", new ErraticMissile(paddle));
};

//Subcategory Subweapons

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
			if (y1 < DIM.ceiling){
				this.kill();
				console.log("javelin die");
			}
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
let Autopilot = class{
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
}

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
	playSound("catch_collected");
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
	playSound("catch_activated");
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
};
f[38] = function(){
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_18_3");
	paddle.setComponent("catch", new Glue(paddle));
};

/****************
* Brick-Related *
*****************/

//Bulk
let bulkNormal = function(br){
	let {i, j} = br.normalInfo;
	if (j == 20)
		i = 0;
	let bulkTex = `brick_bulk_${i}_${j}`;
	let oldTex = br.texture;
	br.setTexture(bulkTex);
	br.health = 20;
	br.points *= 2; 

	br.takeDamage = function(damage, strength){
		NormalBrick.prototype.takeDamage.call(this, damage, strength);
		if (this.health <= 10)
			this.setTexture(oldTex);
	};
};
let bulkMetal = function(br){
	let level = Math.min(6, br.level + 1);
	let tex = `brick_main_6_${level}`;
	let anistr = `brick_shine_${3+level}`;
	br.setTexture(tex);
	br.addAnim("shine", anistr, 0.25);
	br.level = level;
	br.health = (level + 1) * 10;
	br.points = 100 + (level - 1) * 20;
};
f[11] = function(){
	playSound("bulk_collected");
	for (let br of game.get("bricks")){
		if (br.brickType == "normal")
			bulkNormal(br);
		else if (br.brickType == "metal")
			bulkMetal(br);
	}
}

//Quasar
let Quasar = class extends Special{
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
			if (br.brickType == "funky" && br.isRegenerating)
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
};
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
}

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
}