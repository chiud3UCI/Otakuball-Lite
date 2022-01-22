//There are a total of 135 powerups
var POWERUP_NAMES = [ 
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

var POWERUP_ID_LOOKUP = {};
for (let [index, name] of POWERUP_NAMES.entries()){
	POWERUP_ID_LOOKUP[name] = index;
}

var badPowerups = [
	7, 11, 15, 29, 30, 36, 38, 39, 43, 47, 50, 52, 74, 75, 76, 84, 90,
	93, 94, 97, 98, 105, 106, 116, 123, 124, 126, 129, 130, 133
];
var badPowerupsLookup = generateLookup(badPowerups);

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

class PowerupSpawner{
	constructor(globalRate, weights){
		this.globalRate = globalRate / 100;
		//don't modify the original weights
		weights = weights.slice();

		//disable inactive/unimplemented powerups
		for (let i = 0; i < weights.length; i++){
			if (!powerupFunc[i])
				weights[i] = 0;
		}

		this.sum = weights.reduce((a, b) => a + b, 0);
		this.weights = weights;
	}

	//randomly decide if powerup should spawn
	//will be false if all weights are 0
	canSpawn(){
		if (cheats.get("disable_powerup_spawning"))
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
		let n = randRange(1, this.sum + 1);
		for (let [id, weight] of this.weights.entries()){
			n -= weight;
			if (n <= 0)
				return id;
		}
		//this should never happen
		console.log("reached end of loop?");
		return 0;
	}
}

class Powerup extends Sprite{
	static baseSpeed = 0.1;
	static indexLookup = {
		100:   "0_0",
		200:   "1_0",
		400:   "2_0",
		500:   "0_1",
		1000:  "1_1",
		2000:  "2_1",
		4000:  "0_2",
		5000:  "1_2",
		"1up": "2_2",
	};

	constructor(x, y, id){
		if (id === null || id === undefined)
			console.error("Invalid Powerup ID");

		//make sure powerup is in between the walls
		x = clamp(x, DIM.lwallx + 16, DIM.rwallx - 16);
		
		let tex = "powerup_default_" + id;
		super(tex, x, y, 0, Powerup.baseSpeed);

		this.floorCheck = true;
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

		//this will contain offsets, not absolute positions
		this.storedAABB = null;

		//add label to the left (or right) of it
		let label = printText(POWERUP_NAMES[id], "pokemon");
		label.tint = 0xFFFFFF;
		label.scale.set(0.5);
		label.y = -5;
		this.label = label;
		this.rightLabel = false;
		this.updateLabel();
		this.addChild(label);

		//update storedAABB after all children are added
		this.updateHitbox();
		
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
			func.call(this);
		else
			console.log("powerup " + this.id + " not implemented");

		let score = this.score * (2 ** game.top.scoreMultiplier);
		let index = Powerup.indexLookup[score];
		if (this.id == 82)
			index = Powerup.indexLookup["1up"];
		let scoreParticle = new Particle(
			"score_"+index, this.x, this.y, 0, -0.1);
		scoreParticle.timer = 2000;
		game.emplace("particles", scoreParticle);

		//trigger twin syncComponent if it exists
		let paddle = game.get("paddles")[0];
		paddle.twinWrapper?.syncComponents();
	}

	updateLabel(){
		let label = this.label;
		let oldRightLabel = this.rightLabel;
		if (this.x - DIM.lwallx < label.textWidth + 40){
			label.x = 10;
			this.rightLabel = true;
		}
		else{
			label.x = -10 - label.textWidth/2;
			this.rightLabel = false;
		}
		if (oldRightLabel !== this.rightLabel){
			this.updateHitbox();
		}
	}

	//This hitbox will include both the powerup sprite
	//and the accompaning label text
	updateHitbox(){
		let {x: rx, y: ry, width: rw, height: rh} = this.getBounds();
		let [x, y] = this.getPos();

		this.storedAABB = [rx-x, ry-y, rx+rw-x, ry+rh-y];
		// console.log("Stored AABB: " + this.storedAABB);
	}
	
	getTransformedAABB(){
		let box = this.storedAABB;
		let [x, y] = this.getPos();
		return [x + box[0], y + box[1], x + box[2], y + box[3]];
	}
	//if two powerups overlap, make the upper powerup move slower
	updateSeparation(){
		for (let other of game.get("powerups")){
			if (this === other)
				continue;
			let box1 = this.getTransformedAABB();
			let box2 = other.getTransformedAABB();
			if (!AABBOverlap(box1, box2))
				continue;
			let dy = this.y - other.y;
			//separate the powerups apart if they are
			//too close vertically
			if (Math.abs(dy) <= 0.5){
				if (dy < 0){
					this.y -= 0.5;
					other.y += 0.5;
				}
				else{
					this.y += 0.5;
					other.y -= 0.5;
				}
			}
			if (dy < 0){
				this.vy = Powerup.baseSpeed * 0.5;
				return;
			}
		}
		this.vy = Powerup.baseSpeed;
	}

	update(delta){
		this.updateSeparation();
		super.update(delta);
		this.updateLabel();
	}
}

let twin_whitelist; //defined at the bottom of the file

function getPaddles(powerup){
	return [game.get("paddles")[0]];
	// if (twin_whitelist[powerup.id])
	// 	return game.get("paddles");
	// else
	// 	return [game.get("paddles")[0]];
}


var powerupFunc = {};

let f = powerupFunc; //alias

/** Categories:
 * 1. Ball Addition
 * 2. Ball Modify
 * 3. Paddle Weapon
 * 4. Paddle Modify
 * 5. Brick-Related
 * 6. Other
 * 7. Twin
 */

/*****************
 * Ball Addition *
 *****************/
 
//Disrupt
f[21] =  function(){
	playSound("split_med");
	Ball.split(8);
};
//Frenzy
f[33] =  function(){
	playSound("split_large");
	Ball.split(24);
};
//Multiple
f[68] =  function(){
	playSound("split_small");
	Ball.split(3, true);
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
	playSound("reserve_collected");
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
	playSound("split_small");
	Ball.split(3);
};
//Two
f[111] = function(){
	playSound("split_small");
	Ball.split(2, true);
};


/***************
 * Ball Modify *
 ***************/

/*==== Speed-Related Subcategory ====*/

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

/*==== Bomber Subcategory ====*/

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

/*==== Miscellaneous ====*/

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
	playSound("antigravity_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.antigravity = new Antigravity(ball);
	}

	game.createMonitor(
		"Antigravity", "balls", "components", "antigravity", "timer");
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
}
f[3] = function(){
	playSound("attract_collected");
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
		if (!this.armed)
			playSound("emp_collected");
		this.armed = true;
	}
}
f[25] = function(){
	playSound("emp_collected");
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
			e.timer = 10000;
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
	playSound("fireball_collected");
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
	playSound("gravity_collected");
	for (let ball of game.get("balls")){
		ball.normal();
		ball.components.gravity = new Gravity(ball);
	}
	game.createMonitor(
		"Gravity", "balls", "components", "gravity", "timer");
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
	playSound("irritate_collected");
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
	playSound("kamikaze_collected");
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
		this.knocker.addAnim("spin", "knocker_spin", 0.125, true, true);
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
	update(delta){
		this.knocker.update(delta);
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
		laser.isLaser = true;
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
	playSound("sightlaser_collected");
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
	game.createMonitor("Weak", "balls", "components", "weak", "timer");
};

//Whiskey or Whisky if you're Canadian
class Whiskey{
	constructor(ball){
		this.ball = ball;
		this.timer = 0;
		this.emitterTimer = 0;
		this.emitterDelay = 20;
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

/*==== Primary Weapon Subcategory ====*/

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

	twinClone(twin){
		return new BallCannon(twin);
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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_26_2");
		paddle.setComponent("weapon", new BallCannon(paddle));
	}
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
	//"generic_collected" is actually Beam's official powerup sound
	playSound("generic_collected");
	for (let paddle of getPaddles(this)){
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
	for (let paddle of getPaddles(this)){
		if (paddle.components.weapon?.name != "control"){
			paddle.clearPowerups();
			paddle.setTexture("paddle_17_2");
			paddle.setComponent("weapon", new Control(paddle));
		}
	}
};

//Drill Missile
class DrillMissile extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "drillmissile", 1);
	}

	twinClone(twin){
		return new DrillMissile(twin);
	}

	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		let mx = mouse.x;

		//copy this for all twin weapons that require mouse.x
		let paddle = this.paddle;
		if (paddle.twinWrapper){
			mx = paddle.twinWrapper.modifyMouseXPos(
				mx, paddle.isTwin, true);
		}

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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_24_1");
		paddle.setComponent("weapon", new DrillMissile(paddle));
	}
};

//Erratic Missile
class ErraticMissile extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "erraticmissile", 4);
	}

	twinClone(twin){
		return new ErraticMissile(twin);
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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_24_1");
		paddle.setComponent("weapon", new ErraticMissile(paddle));
	}
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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_21_1");
		paddle.setComponent("weapon", new Hacker(paddle));
	}
}

//Invert
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
		playSound("invert_fire");

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
	playSound("invert_collected");
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_29_1");
		paddle.setComponent("weapon", new Invert(paddle));
	}
};

class Laser extends PaddleWeapon{
	constructor(paddle, plus=false){
		super(paddle, "laser", plus ? 6 : 4);
		this.isPlus = plus;
	}

	twinClone(twin){
		let copy = new Laser(twin, this.isPlus);
		copy.maxBullets = this.maxBullets;
		return copy;
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
//Laser
f[59] = function(){
	playSound("laser_collected");
	for (let paddle of getPaddles(this)){
		let cmp = paddle.components.weapon;
		if (cmp?.name == "laser")
			cmp.upgrade(false);
		else{
			paddle.clearPowerups();
			paddle.setTexture("paddle_27_1");
			paddle.setComponent("weapon", new Laser(
				paddle, false));
		}
	}
};
//Laser Plus
f[60] = function(){
	playSound("laser_collected");
	for (let paddle of getPaddles(this)){
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
	}
};

//Missile
class Missile extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "missile", 4);
	}

	twinClone(twin){
		return new Missile(twin);
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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_23_1");
		paddle.setComponent("weapon", new Missile(paddle));
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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setComponent("weapon", new Pause(paddle));
	}
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

	twinClone(twin){
		return new RapidFire(twin);
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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_4_1");
		paddle.setComponent("weapon", new RapidFire(paddle));
	}
};

//Shotgun
class Shotgun extends PaddleWeapon{
	constructor(paddle){
		super(paddle, "shotgun", 12);
	}

	twinClone(twin){
		return new Shotgun(twin);
	}

	onClick(mouseVal){
		if (mouseVal != 1 || this.bulletCount >= this.maxBullets)
			return;
		let deg = [-25, -15, -5, 5, 15, 25];
		for (let theta of deg){
			let rad = theta*Math.PI/180;
			let [vx, vy] = Vector.rotate(0, -0.8, rad);
			let p = new Projectile("shotgun_0_1", 0, 0, vx, vy, rad);
			p.scale.set(1);
			p.damage = 5;
			this.fireProjectile(p, 0);
		}
		//create a little muzzle flash
		let paddle = this.paddle;
		let flash = new Particle(null, paddle.x, paddle.y - 18);
		let arr = ["shotgun_1_1", "shotgun_1_0"];
		flash.addAnim("flash", arr, 0.25, false, true);
		game.emplace("projectiles", flash);

		playSound("shotgun_fire");
	}
}
f[99] = function(){
	playSound("shotgun_collected");
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		paddle.setTexture("paddle_26_1");
		paddle.setComponent("weapon", new Shotgun(paddle));
	}
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
	for (let paddle of getPaddles(this)){
		if (paddle.components.weapon?.name != "transform"){
			paddle.clearPowerups();
			paddle.setTexture("paddle_24_1");
			paddle.setComponent("weapon", new Transform(paddle));
		}
	}
}

/*==== Sub-Weapon Subcategory ====*/

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

		let glow = media.shaders.paddleGlow;
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

	//TODO: Give each paddle an individual glow filter
	twinClone(twin){
		return new Javelin(twin);
	}

	fireJavelin(){
		//prevent firing twice due to timeout + click
		if (this.hasFired)
			return;
		this.hasFired = true;
		playSound("javelin_fire");

		let paddle = this.paddle;
		paddle.removeComponent("subweapon");

		let mx = mouse.x;

		//copy this for all twin weapons that require mouse.x
		if (paddle.twinWrapper){
			mx = paddle.twinWrapper.modifyMouseXPos(
				mx, paddle.isTwin, true);
		}

		let [px, py] = paddle.getPos();
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
	for (let paddle of getPaddles(this)){
		if (paddle.components.subweapon?.name == "javelin")
			return;
		paddle.setComponent("subweapon", new Javelin(paddle));
	}
};

//Rocket
class RocketMovement{
	constructor(){
		this.activated = false;
	}
	//temporarily disable manual paddle movement
	updateMovement(){
		return this.activated ? 
			[mouse.x, null] : 
			[mouse.x, Paddle.baseLine];
	}
}
class Rocket{
	constructor(paddle, rocketMovComp){
		this.paddle = paddle;
		this.rocketMovComp = rocketMovComp;

		this.rocketSpeed = 1;
		this.state = "ready";
		this.loop = 0;
	}

	destructor(){
		this.projectile?.kill();
		this.paddle.y = Paddle.baseLine;
		this.paddle.intangible = false;
	}

	onClick(mouseVal){
		if (mouseVal != 1)
			return;
		if (this.state != "ready")
			return;

		this.state = "active";
		this.attachProjectile();
		this.rocketMovComp.activated = true;
		this.paddle.intangible = true;
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
	for (let paddle of getPaddles(this)){
		paddle.clearPowerups();
		let rocketMov = new RocketMovement(paddle);
		paddle.setComponent("weapon", new Rocket(paddle, rocketMov));
		paddle.setComponent("movement", rocketMov);
	}

}

//X-Bomb (Xbomb)
class XBomb{
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
			let time = XBomb.travelTime;
			let val = 1 + 2*Math.sin(this.timer * Math.PI / time);
			this.scale.set(2*val);
			superUpdate.call(this, delta);
		}
	}

	destructor(){
		this.paddle.removeChild(this.xbomb);
		game.top.hud.removeChild(this.crosshair);
	}

	twinClone(twin){
		return new XBomb(twin);
	}

	onClick(mouseVal){
		let paddle = this.paddle;
		let xbomb = this.xbomb;
		let time = XBomb.travelTime;

		if (mouseVal != 1)
			return;
		playSound("xbomb_launch");
		paddle.removeComponent("subweapon");

		xbomb.scale.set(2);
		let [x0, y0] = paddle.getPos();
		xbomb.moveTo(x0, y0);

		let mx = mouse.x;
		let my = mouse.y;
		//copy this for all twin weapons that require mouse.x
		if (paddle.twinWrapper){
			mx = paddle.twinWrapper.modifyMouseXPos(
				mx, paddle.isTwin, true);
		}

		let [i, j] = getGridPos(mx, my);
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
		let paddle = this.paddle;
		let mx = mouse.x;
		let my = mouse.y;

		if (paddle.twinWrapper){
			mx = paddle.twinWrapper.modifyMouseXPos(
				mx, paddle.isTwin, true);
		}

		let [i, j] = getGridPos(mx, my);
		if (!boundCheck(i, j))
			return false;
		let [x, y] = getGridPosInv(i, j);
		this.crosshair.moveTo(x, y);
	}
}
f[127] = function(){
	playSound("xbomb_collected");
	for (let paddle of getPaddles(this)){
		if (paddle.components.subweapon?.name == "xbomb")
			return;

		paddle.setComponent("subweapon", new XBomb(paddle));
	}
};

/****************
* Paddle Modify *
*****************/

/*==== Catch Subcategory ====*/

//Catch
class Catch{
	constructor(paddle){
		this.paddle = paddle;
		this.name = "catch";
	}
	onBallHit(ball){
		this.paddle.attachBall(ball);
		//don't play both paddle hit sounds at the same time
		if (!mouse.m1){
			stopSound(this.paddle.paddleHitSound);
			playSound("paddle_catch");
		}
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
	playSound("glue_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_18_3");
	paddle.setComponent("catch", new Glue(paddle));
	game.createMonitor("Glue", "paddles", "components", "catch", "timer");
};

/**
 * Returns the x position of where the paddle needs to be
 * in order to hit the ball towards the closest brick.
 * Will also cause the paddle to move towards powerups
 * if there is time to spare.
 * @param {Paddle} paddle
 * @param {boolean} ignore_powerups
 * @param {boolean} smart_keyboard
 */
function autopilot(paddle, ignore_powerups, smart_keyboard){
	//find the ball that will reach the paddle's height
	//in the least amount of time (based on speed and distance)
	let base = paddle.y;
	let ball = null;
	let stody = Infinity; //stored dy
	for (let b of game.get("balls")){
		let dy = base - 8 - b.shape.radius - b.y;
		//exclude balls that are moving upwards
		//or are moving too horizontally
		if (b.vy < 0.01)
			continue;
		if (ball == null || (dy / b.vy < stody / ball.vy)){
			ball = b;
			stody = dy;
		}
	}

	if (ball == null)
		return paddle.x;

	//find out the x position of the ball when it reaches
	//the paddle's y position
	let r = ball.shape.radius;
	let dy = stody;
	let dt = dy / ball.vy;
	let dx = ball.vx * dt;
	let bl = DIM.lwallx + r; //left border
	let br = DIM.rwallx - r; //right border
	let db = br - bl;
	let mirror = false;
	//simulate bounces against the walls
	let x = ball.x + dx;
	while (x > br){
		x -= db;
		mirror = !mirror;
	}
	while (x < bl){
		x += db;
		mirror = !mirror;
	}
	if (mirror)
		x = br - (x - bl);

	//find the closest brick that can be damaged by the ball
	//TODO: use raycasting to see if the brick is hiding
	//		behind an indestructible brick;
	let target = null;
	let storedDist = Infinity;
	let vec = null;
	for (let br of game.get("bricks")){
		if (ball.strength < br.armor)
			continue;
		let dx = br.x - x;
		let dy = br.y - (paddle.y - 8 - r);
		if (dy > 0)
			continue;
		let dist = dx*dx + dy*dy;
		if (dist < storedDist){
			target = br;
			storedDist = dist;
			vec = [dx, dy];
		}
	}

	if (target == null)
		return x;

	//calculate the paddle offset needed for the ball to hit
	//the targeted brick
	[dx, dy] = vec;
	let rad = Math.atan2(dy, dx);
	let deg = rad * 180 / Math.PI;
	deg += 90;
	let mag = deg / 60;
	mag = Math.max(-1, Math.min(1, mag));

	let off = mag * paddle.paddleWidth/2;
	return x - off;
}

/*==== Miscellaneous ====*/

//Autopilot
class Autopilot{
	constructor(paddle){
		this.paddle = paddle;
		this.timer = 10000;
		this.isAutopilot = true;
	}

	updateMovement(){
		let mx = autopilot(this.paddle);
		return [mx, Paddle.baseLine];
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0)
			this.paddle.clearPowerups();
	}
}
f[4] = function(){
	let paddle = game.get("paddles")[0];
	let move = paddle.components.movement;
	if (move?.isAutopilot){
		move.timer += 10000;
		return;
	}
	paddle.clearPowerups();
	paddle.setComponent("movement", new Autopilot(paddle));
	game.createMonitor(
		"Autopilot",
		"paddles",
		["components", "movement", "timer"],
		obj => obj.components.movement instanceof Autopilot
	);
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

//Change
class Change{
	constructor(paddle){
		this.paddle = paddle;
		paddle.revertSpeedLimit();
	}

	updateMovement(){
		return [DIM.w - mouse.x, Paddle.baseLine];
	}
}
f[15] = function(){
	playSound("change_collected");
	let paddle = game.get("paddles")[0];
	paddle.setComponent("movement", new Change(paddle));
};

//Extend
f[28] = function(){
	playSound("extend_collected");
	let paddle = game.get("paddles")[0];
	paddle.incrementSize(1);
};

//Freeze
class Freeze{
	constructor(paddle){
		this.paddle = paddle;
		//make use of the mysterious NineSlicePlane
		let ice = new PIXI.NineSlicePlane(
			media.textures["frozen_paddle"],
			24, //left width
			0,  //top height
			24, //right width
			0   //bottom height
		);
		let {width: w, height: h} = ice.getLocalBounds();
		w += (paddle.paddleWidth - paddle.widthInfo.base)/2;
		ice.width = w;
		ice.position.set(-w/2, -h/2);
		ice.alpha = 0.5;
		paddle.addChild(ice);
		this.ice = ice;

		this.paddle.setSpeedLimit(0, 0);

		this.timer = 2000;
	}

	destructor(){
		this.paddle.removeChild(this.ice);
		this.paddle.revertSpeedLimit();
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0)
			this.paddle.removeComponent("freeze");
	}
}
f[30] = function(){
	playSound("freeze_collected");
	let paddle = game.get("paddles")[0];
	paddle.setComponent("freeze", new Freeze(paddle));
};

//Gelato
function chooseRow(gelato=false){
	let grid = game.top.brickGrid;
	let arr = [];
	let maxCount = 0;
	for (let i = 0; i < 32; i++){
		let count = 0;
		for (let j = 0; j < 13; j++){
			let br = grid.getStatic(i, j);
			if (br === null || br.armor >= 2)
				continue;
			if (!gelato || br.brickType != "ice")
				count++;
		}
		arr.push(count);
		maxCount = Math.max(maxCount, count);
	}
	let indices = [];
	for (let [i, v] of arr.entries()){
		if (v == maxCount)
			indices.push(i);
	}
	return indices[randRange(indices.length)];
}
f[34] = function(){
	playSound("gelato_collected");

	let gelato = new Projectile("gelato", 0, 0, 0.5, 0);
	let i = chooseRow(true);
	let [x, y] = getGridPosInv(i, 0);
	x = DIM.lwallx + gelato.w/2;
	gelato.setPos(x, y);

	gelato.damage = 100;
	gelato.strength = 1;
	gelato.pierce = "strong";
	gelato.canHit  = function(obj){
		if (obj instanceof IceBrick)
			return false;
		return Projectile.prototype.canHit.call(this, obj);
	};
	gelato.onSpriteHit = function(obj, norm, mag){
		Projectile.prototype.onSpriteHit.call(this, obj, norm, mag);
		if (obj.gameType == "brick" && obj.isDead())
			freezeBrick(obj);
	};

	game.emplace("projectiles", gelato);
}

//Ghost
class Ghost{
	constructor(paddle){
		this.paddle = paddle;

		this.range = {low: 0, high: 3};

		//maybe I can use a scalar value instead of array
		const bufferSize = 50;
		let buffer = [];
		for (let i = 0; i < bufferSize; i++)
			buffer.push(this.range.high);
		this.buffer = buffer;

		this.prevPaddlePos = {x: paddle.x, y: paddle.y};

		this.timer = 20000;

		// this.text = new PIXI.Text("ghost", {fill: 0xFFFFFF});
		// this.text.position.set(DIM.w/2 - 100, DIM.h/2);
		// game.top.hud.addChild(this.text);
	}

	destructor(){
		this.paddle.alpha = 1;
		this.paddle.intangible = false;
		if (this.text)
			game.top.hud.removeChild(this.text);
	}

	update(delta){
		let paddle = this.paddle;
		let buffer = this.buffer;
		let {low, high} = this.range;

		let prevPos = this.prevPaddlePos;
		let dx = paddle.x - prevPos.x;
		prevPos.x = paddle.x;
		dx = Math.min(5, Math.abs(dx));

		let sum = buffer.reduce((acc, curr) => acc + curr, 0);
		let average = sum / buffer.length;

		buffer.shift();
		buffer.push(Math.max(dx, average - 1));

		let val = (average - low) / (high - low);
		val = clamp(val, 0, 1);

		paddle.alpha = val;
		paddle.intangible = val <= 0.1;

		this.timer -= delta;
		if (this.timer <= 0)
			paddle.clearPowerups();

		if (this.text)
			this.text.text = `ghost ${average.toFixed(3)} ${val.toFixed(3)}`;
	}
}
f[36] = function(){
	playSound("ghost_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setComponent("ghost", new Ghost(paddle));
	game.createMonitor(
		"Ghost", "paddles", "components", "ghost", "timer");
};

//Heaven
class Heaven{
	constructor(paddle){
		this.paddle = paddle;
		let heaven = new Paddle();
		heaven.setTexture("paddle_1_0");
		heaven.paddleHitSound = "heaven_hit";
		heaven.setPos(...paddle.getPos());

		//heaven paddle will fade after main paddle's
		//	powerups are cleared
		heaven.fade = false;
		heaven.fadeTimerMax = 2000;
		heaven.fadeTimer = heaven.fadeTimerMax;
		heaven.update = function(delta){
			if (this.fade){
				this.fadeTimer -= delta;
				if (this.fadeTimer <= 0)
					this.kill();
				this.alpha = Math.max(
					0, this.fadeTimer / this.fadeTimerMax);
			}
			Sprite.prototype.update.call(this, delta);
		}

		//heaven paddle rise
		this.targetHeight = 96;
		this.height = 0;
		this.riseSpeed = 0.1;

		
		game.emplace("specials2", heaven);
		this.heaven = heaven;
	}

	destructor(){
		this.heaven.fade = true;
	}

	update(delta){
		let paddle = this.paddle;
		let heaven = this.heaven;

		if (this.height < this.targetHeight){
			this.height += this.riseSpeed * delta;
			this.height = Math.min(this.targetHeight, this.height);
		}
		let [x, y] = paddle.getPos();
		heaven.setPos(x, y - this.height);

		for (let ball of game.top.activeBalls(true)){
			if (ball.canHit(heaven)){
				let resp = heaven.checkSpriteHit(ball);
				if (resp[0])
					heaven.onSpriteHit(ball, resp[1], resp[2]);
			}
		}
	}
}
f[44] = function(){
	playSound("halo_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setComponent("heaven", new Heaven(paddle));
};

//Illusion
class Illusion{
	constructor(paddle){
		this.paddle = paddle;
		this.marker = paddle.x;
		this.mirages = [];
		this.addIllusionPaddle();
		this.addIllusionPaddle();
		this.updateIllusionPaddles();
	}

	addIllusionPaddle(){
		let mirage = new Paddle();
		mirage._setWidth(this.paddle.paddleWidth);
		mirage.setTexture("paddle_17_1");
		mirage.alpha = 0.5;
		mirage.update = Sprite.prototype.update;
		this.mirages.push(mirage);
		game.emplace("specials2", mirage);
	}

	destructor(){
		for (let mirage of this.mirages)
			mirage.kill();
	}

	onResize(width){
		for (let mirage of this.mirages)
			mirage._setWidth(width);
		this.marker = this.paddle.x;
		this.updateIllusionPaddles();
	}

	update(delta){
		//update the marker's position
		const spd = 0.15;
		const mag = 0.5;

		let paddle = this.paddle;
		let mirages = this.mirages;
		let maxDist = mag * mirages.length * paddle.paddleWidth;

		let dx = this.marker - paddle.x;
		let sign = (dx < 0) ? -1 : 1;
		dx = Math.abs(dx);

		dx = clamp(dx - spd * delta, 0, maxDist);
		this.marker = paddle.x + dx * sign;

		//update illusion paddles based on marker
		this.updateIllusionPaddles();

		//rebound balls that hit the illusion paddles
		for (let ball of game.top.activeBalls(true)){
			if (ball.vy < 0)
				continue;
			for (let mirage of mirages){
				if (circleRectOverlap(
					ball.x, ball.y, ball.r, 
					mirage.x, mirage.y, mirage.w, mirage.h
				))
				{
					playSound("illusion_hit");
					ball.handleCollision(0, -1);
					break;
				}
			}
		}
	}

	updateIllusionPaddles(){
		let mirages = this.mirages;
		let [px, py] = this.paddle.getPos();
		let dx = this.marker - px;
		let n = mirages.length;
		for (let [i, mirage] of mirages.entries()){
			mirage.setPos(px + dx * (n-i)/n, py);
		}
	}
}
f[46] = function(){
	playSound("illusion_collected");
	let paddle = game.get("paddles")[0];
	let comp = paddle.components.illusion;
	if (comp){
		comp.addIllusionPaddle();
		comp.updateIllusionPaddles();
		return;
	}
	paddle.clearPowerups();
	paddle.setTexture("paddle_17_1");
	paddle.setComponent("illusion", new Illusion(paddle));
}

//Normal Ship
f[75] = function(){
	playSound("normal_collected");
	let paddle = game.get("paddles")[0];
	paddle.normal();
};

//Nervous
class Nervous{
	constructor(paddle){
		this.paddle = paddle;
		this.timer = 20000;
		this.timer2 = 0;
		this.isNervous = true;
	}

	updateMovement(){
		const spd = 3;
		const mag = 32;
		let mx = mouse.x;
		mx += Math.sin(spd * this.timer2 / 1000) * mag;
		return [mx, Paddle.baseLine];
	}

	update(delta){
		this.timer2 += delta;
		this.timer -= delta;
		if (this.timer <= 0)
			this.paddle.clearPowerups();
	}
}
f[76] = function(){
	playSound("nervous_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_3_3");
	paddle.setComponent("movement", new Nervous(paddle));
	game.createMonitor(
		"Nervous", 
		"paddles", 
		["components", "movement", "timer"],
		obj => obj.components.movement instanceof Nervous
	);
};

//Orbit
class Orbit{
	constructor(paddle){
		this.paddle = paddle;
		this.radius = 0;
		let ring = new PIXI.Graphics();
		ring.y = 24; //real offset is 48 due to paddle's scale
		ring.scale.set(0.5);
		paddle.addChild(ring);
		this.ring = ring;
		this.onResize(paddle.paddleWidth);

		this.orbitBalls = [];
	}

	destructor(){
		this.paddle.removeChild(this.ring);
	}

	onResize(width){
		this.radius = clamp(width+10, 80, 120);
		let ring = this.ring;
		ring.clear()
			.lineStyle(2, 0xFFFFFF)
			.drawCircle(0, 0, this.radius);
	}

	update(delta){
		let angleBetween = Vector.angleBetween;
		let angleSign = Vector.angleSign;

		let ring = this.ring;
		let orbitBalls = this.orbitBalls;

		if (mouse.m1){
			ring.alpha = 0.5;
			for (let arr of orbitBalls)
				arr[0].stuckToPaddle = false;
			orbitBalls.length = 0;
		}
		else{
			ring.alpha = 1;
			let radius = this.radius;
			let r2 = radius ** 2;
			let [px, py] = this.paddle.getPos();
			let cx = px + 2*ring.x;
			let cy = py + 2*ring.y;
			//any ball that enters the ring will be
			//placed into orbit
			for (let ball of game.top.activeBalls(true)){
				let dx = cx - ball.x;
				let dy = cy - ball.y;
				if (dx ** 2 + dy ** 2 > r2)
					continue;
				let theta = angleBetween(
					ball.vx, ball.vy, dx, dy);
				if (theta < Math.PI/2){
					let sign = angleSign(ball.vx, ball.vy, dx, dy);
					let rad = angleBetween(-1, 0, -dx, dy);
					orbitBalls.push([ball, rad, sign]);
					ball.stuckToPaddle = true;
				}
			}
			//update the positions of orbiting balls
			const rotationSpeed = 0.0015;
			for (let arr of orbitBalls){
				let [ball, rad, sign] = arr;
				rad += rotationSpeed * delta * sign;
				arr[1] = rad;

				let spd = ball.getSpeed();
				let vec = new Vector(-1, 0).rotate(rad);
				let off = vec.scale(radius);
				let vel = vec.scale(spd);
				//if ball reaches the bottom of the screen,
				//teleport it to the other side of the orbit
				if (cy + off.y > DIM.h){
					//manually reposition balls then recalculate
					//its angle
					let dx = off.x;
					let dy = off.y - (cy + off.y - DIM.h);
					rad = angleBetween(-1, 0, -dx, dy);
					arr[1] = rad;
					vec = new Vector(-1, 0).rotate(rad);
					off = vec.scale(radius);
					vel = vec.scale(spd);
				}
				ball.setPos(cx + off.x, cy + off.y);
				ball.setVel(vel.x, vel.y)
			}
		}
	}
}
f[79] = function(){
	playSound("orbit_collected");
	let paddle = game.get("paddles")[0];
	if (paddle.components.orbit)
		return;
	paddle.setComponent("orbit", new Orbit(paddle));
}

//Poison
class Poison{
	constructor(paddle){
		this.paddle = paddle;
		paddle.intangible = true;
		paddle.alpha = 0.5;
		this.timer = 4000;
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0){
			this.paddle.clearPowerups();
		}
	}
}
f[84] = function(){
	playSound("poison_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_3_3");
	paddle.setComponent("poison", new Poison(paddle));
	game.createMonitor(
		"Poison", "paddles", "components", "poison", "timer");
};

//Protect
class Protect{
	constructor(paddle){
		this.paddle = paddle;
		this.hits = 3;
		let outline = new PIXI.NineSlicePlane(
			media.textures["protect_outline"], 4, 0, 4, 0);
		outline.tint = 0xFFFF00;
		paddle.addChild(outline);
		this.outline = outline;
		this.onResize(paddle.paddleWidth);
	}

	destructor(){
		this.paddle.removeChild(this.outline);
	}

	onResize(width){
		let outline = this.outline;
		outline.width = width/2 + 4;
		let {width: w, height: h} = outline.getLocalBounds();
		outline.position.set(-w/2, -h/2);
	}

	updateAppearance(){
		let color;
		switch (this.hits){
			case 1: color = 0xFF6400; break;
			case 2: color = 0xFFB400; break;
			default: color = 0xFFFF00;
		}
		this.outline.tint = color;
	}

	onProjectileHit(proj){
		proj.kill();
		this.hits--;
		if (this.hits == 0)
			this.paddle.removeComponent("protect");
		else
			this.updateAppearance();
	}
}
f[85] = function(){
	playSound("protect_collected");
	let paddle = game.get("paddles")[0];
	let comp = paddle.components.protect;
	if (comp){
		comp.hits++;
		comp.updateAppearance();
		return;
	}
	paddle.setComponent("protect", new Protect(paddle));
}

//Restrict
f[90] = function(){
	playSound("restrict_collected");
	let paddle = game.get("paddles")[0];
	paddle.incrementSize(-1);
};

//Regenerate
class Regenerate{
	constructor(paddle){
		this.paddle = paddle;
		this.maxTimer = 5000;
		this.timer = this.maxTimer;
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0){
			this.timer = this.maxTimer;

			playSound("reserve_collected");
			let ball = new Ball(0, 0, 0.4, 0);
			this.paddle.attachBall(ball, true);
			game.emplace("balls", ball);
		}
	}
}
f[91] = function(){
	playSound("generic_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setComponent("regenerate", new Regenerate(paddle));
	game.createMonitor(
		"Regenerate", "paddles", "components", "regenerate", "timer");
};

//Re-Serve (Reserve)
f[92] = function(){
	playSound("reserve_collected");
	let paddle = game.get("paddles")[0];
	for (let ball of game.get("balls")){
		if (ball.isActive())
			paddle.attachBall(ball, true);
	}
};

//Shadow
class Shadow{
	constructor(paddle){
		this.paddle = paddle;
		this.timer = 20000;
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0){
			this.paddle.clearPowerups();
		}
	}
}
//Blue Menacer will also call this
function activateShadowPaddle(paddle){
	if (paddle.components.shadow){
		paddle.components.shadow.timer = 20000;
		return;
	}
	playSound("shadow_collected");
	paddle.clearPowerups();
	paddle.setTexture("paddle_2_0");
	paddle.alpha = 0.5;
	paddle.setComponent("shadow", new Shadow(paddle));
	game.createMonitor(
		"Shadow", "paddles", "components", "shadow", "timer");
}
f[98] = function(){
	//sound manager will prevent duplicate sounds
	playSound("shadow_collected");
	let paddle = game.get("paddles")[0];
	activateShadowPaddle(paddle);
};

//Vector
//NOTE: Vector is already a another class
class VectorComponent{
	constructor(paddle){
		this.paddle = paddle;
		paddle.setSpeedLimit(Infinity, 0.5);
		this.launching = true;

		this.timer = 10000;

		this.isVector = true;
	}

	destructor(){
		this.paddle.revertSpeedLimit();
	}

	updateMovement(){
		return [mouse.x, mouse.y];
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0){
			this.paddle.clearPowerups();
		}

		if (!this.launching)
			return;

		let dy = Math.abs(this.paddle.y - mouse.y);
		if (dy < 1){
			this.launching = false;
			this.paddle.setSpeedLimit();
		}
	}
}
f[118] = function(){
	playSound("vector_collected");
	let paddle = game.get("paddles")[0];
	if (paddle.components.movement?.isVector){
		paddle.components.movement.timer += 10000;
	}
	else{
		paddle.clearPowerups();
		paddle.setTexture("paddle_31_1");
		paddle.setComponent("movement", new VectorComponent(paddle));
		game.createMonitor(
			"Vector", 
			"paddles", 
			["components", "movement", "timer"],
			obj => obj.components.movement instanceof VectorComponent
		);
	}
};

//Weight
f[124] = function(){
	playSound("weight_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_31_3");
	paddle.setSpeedLimit(0.5, null);
	paddle.setComponent("weight", {
		destructor(){
			paddle.revertSpeedLimit();
		}
	});
};

//Yoga
class Yoga{
	constructor(paddle){
		this.paddle = paddle;
		paddle.revertSpeedLimit();
	}

	updateMovement(){
		const scale = 3;
		const mid = DIM.w/2;
		let mx = mouse.x;
		mx = mid + (mx - mid) * scale;
		return [mx, Paddle.baseLine];
	}
}
f[130] = function(){
	playSound("yoyoga_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_20_3");
	paddle.setComponent("movement", new Yoga(paddle));
};

//Zen Shove
class ZenShove{
	constructor(paddle){
		this.paddle = paddle;
	}

	onBallHit(ball){
		let grid = game.top.brickGrid;
		let zenBricks = new Set();

		function canMove(br){
			return br.armor < 1 && !br.gridDat.move;
		}

		function isBlocking(br){
			return br.armor >= 1 || !zenBricks.has(br);
		}

		for (let j = 0; j < 13; j++){
			for (let i = 32-10; i >= 0; i--){
				for (let top of grid.get(i, j)){
					if (!canMove(top))
						continue;
					let obstacle = false;
					for (let bottom of grid.get(i+1, j)){
						if (isBlocking(bottom)){
							obstacle = true;
							break;
						}
					}
					if (!obstacle){
						let [x, y] = getGridPosInv(i+1, j);
						top.setTravel(x, y, "time", 200);
						zenBricks.add(top);
					}
					break;
				}
			}
		}
	}
}
f[134] = function(){
	playSound("zenshove_collected");
	let paddle = game.get("paddles")[0];
	paddle.clearPowerups();
	paddle.setTexture("paddle_0_1");
	paddle.setComponent("zenshove", new ZenShove(paddle));
};

/****************
* Brick-Related *
*****************/

//Assist
//Turret that only does shooting
class AssistTurret extends Special{
	constructor(){
		super("assist_base");
		let gun = new Sprite("assist_gun");
		gun.scale.set(1);
		this.addChild(gun);
		this.gun = gun;

		this.fireTimer = 0;
		this.fireDelay = 100;
		//queue of targets to shoot at
		this.queue = [];
	}

	update(delta){
		this.fireTimer = Math.max(0, this.fireTimer - delta);
		if (this.queue.length > 0 && this.fireTimer == 0){
			playSound("laser_fire");
			this.fireTimer = this.fireDelay;
			let br = this.queue.shift();

			let p = new Projectile("assist_bullet", this.x, this.y);
			p.damage = 10;
			p.strength = 0;
			p.isLaser = true;

			let vel = new Vector(br.x - this.x, br.y - this.y);
			vel = vel.normalized().scale(0.8);
			p.vx = vel.x;
			p.vy = vel.y;
			let rad = vel.getAngle() + Math.PI/2;
			p.setRotation(rad);

			this.gun.rotation = rad;
			game.emplace("projectiles", p);
		}
		super.update(delta);
	}
}
//Controller is a single object that creates, controls 
//and coordinates both turrets at the same time
let AC; //shorter alias for class name
class AssistController extends Special{
	constructor(){
		super(null);
		let left = new AssistTurret("left");
		let right = new AssistTurret("right");
		const spd = 0.2;
		left.vx = spd;
		right.vx = -spd;
		this.turrets = [left, right];

		let sideGates = game.top.sideGates;
		sideGates[0].emplaceSprite("specials2", left);
		sideGates[1].emplaceSprite("specials2", right);
		this.deploying = true;

		this.burstTimer = 0;
		this.burstInterval = 1000;
		this.burstCount = 3;
	}

	//TODO: Deal with patch.shield
	static isTargetable(br){
		if (br.intangible)
			return false;
		if (br.patch.antilaser)
			return false;
		return br.armor < 1;
	}

	static isObstacle(br){
		if (br.intangible)
			return false;
		if (br instanceof OneWayBrick)
			return false;
		if (br instanceof ForbiddenBrick)
			return false;
		if (br.patch.antilaser)
			return true;
		return br.armor >= 1;
	}

	//checks if turret can shoot at brick without being
	//obstructed by indestructible bricks
	static hasLineOfSight(turret, brick, obstacles){
		const pw = 12; //width of assist bullet
		const off = pw/2 + 1;

		let pos = new Vector(turret.x, turret.y);
		let vec = new Vector(brick.x - turret.x, brick.y - turret.y);
		vec = vec.normalized();
		let perp1 = vec.perpendicular();
		let perp2 = perp1.scale(-1);
		let pos1 = pos.add(perp1.scale(off));
		let pos2 = pos.add(perp2.scale(off));

		//we need to do two raycasts to take in account
		//of the withd of the projectile
		let rayArgs = [
			[pos1.x, pos1.y, vec.x, vec.y],
			[pos2.x, pos2.y, vec.x, vec.y]
		];

		for (let arg of rayArgs){
			let baseMag = brick.raycast(...arg);
			for (let br of obstacles){
				let mag = br.raycast(...arg);
				if (mag === null)
					continue;
				if (mag < baseMag)
					return false;
			}
		}

		return true;
	}
	static dist(obj1, obj2){
		return (obj1.x-obj2.x)**2 + (obj1.y-obj2.y)**2;
	}

	//TODO: add raycasting to prevent turrets from targeting
	//	bricks that are behind indestructible bricks
	fireTurrets(){
		let turrets = this.turrets;
		//obtain list of targetable bricks and potential obstacles
		let bricks = game.get("bricks");
		let targetable = bricks.filter(br => AC.isTargetable(br));
		let obstacles = bricks.filter(br => AC.isObstacle(br));

		for (let turret of turrets){
			let targets = targetable.slice();
			targets.sort((br1, br2) =>
				AC.dist(turret, br1) - AC.dist(turret, br2));

			let queue = turret.queue;
			const burstCount = this.burstCount;

			for (let br of targets){
				if (queue.length >= burstCount)
					break;
				if (AC.hasLineOfSight(turret, br, obstacles))
					queue.push(br);
			}
			//if not enough targets, fill queue with the first target
			if (queue.length > 0){
				while (queue.length < burstCount)
					queue.push(queue[0]);
			}
		}
	}

	update(delta){
		let turrets = this.turrets;
		const off = 40;
		if (this.deploying){
			if (turrets[0].x > DIM.lwallx + off){
				turrets[0].x = DIM.lwallx + off;
				turrets[1].x = DIM.rwallx - off;
				turrets[0].vx = 0;
				turrets[1].vx = 0;
				this.deploying = false;
			}
		}
		else{
			this.burstTimer -= delta;
			if (this.burstTimer <= 0){
				this.burstTimer = this.burstInterval;
				this.fireTurrets();
			}
		}
	}
}
AC = AssistController;
f[2] = function(){
	playSound("assist_collected");
	let obj = checkExistingInstance("specials2", AssistController);
	if (obj){
		obj.burstCount = Math.min(10, obj.burstCount+1);
		return;
	}
	game.emplace("specials2", new AssistController());
}

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
	br.score = 40;

	br.takeDamage = function(damage, strength){
		NormalBrick.prototype.takeDamage.call(this, damage, strength);
		if (this.health <= 10)
			this.setTexture(this.preBulkTex);
	}
}
function bulkMetal(br){
	if (br.level == 5)
		return;
	let level = br.level + 1;
	let tex = `brick_main_6_${1+level}`;
	let anistr = `brick_shine_${4+level}`;
	br.setTexture(tex);
	br.addAnim("shine", anistr, 0.25);
	br.level = level;
	br.health = (2 + level) * 10;
	br.score = 100 + level * 20;
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

//Chaos
f[16] = function(){
	playSound("generic_collected");
	for (let br of game.get("bricks")){
		if (explosiveLookup[br.brickType]){
			br.kill();
		}
	}
}

//Disarm
function getDisarmIndex(br){
	//returns null if br is not disarmable
	switch (br.brickType){
		case "funky":
			switch (br.funkyLevel){
				case 0: return [0, 11];
				case 1: return [0, 9];
				case 2: return [0, 0];
			}
			break;
		case "switch":
		case "trigger":
			switch (br.switchId){
				case 0: return [1, 1];
				case 1: return [1, 8];
				case 2: return [1, 14];
				case 3: return [1, 15];
				case 4: return [1, 2];
			}
			break;
		case "factory":
			return [5, 14];
		case "alien":
			switch (randRange(4)){
				case 0: return [1, 6];
				case 1: return [1, 8];
				case 2: return [1, 13];
				case 3: return [0, 19];
			}
			break;
		case "lasereye":
			return [0, 14];
		case "boulder":
			return [0, 4];
		case "tiki":
			return [5, 4];
		case "jumper":
			return [1, 5];
	}
	return null;
}
f[20] = function(){
	playSound("disarm_collected");
	for (let br of game.get("bricks")){
		let index = getDisarmIndex(br);
		if (index === null)
			continue;

		br.suppress = true;
		br.kill();
		let normal = new NormalBrick(br.x, br.y, ...index);
		game.emplace("bricks", normal);
	}
}

//Drop
f[24] = function(){
	playSound("drop_collected");

	let bricks = Array.from(game.get("bricks"));
	bricks = bricks.filter(br => br.brickType == "normal");
	let count = randRange(3, 6+1);

	for (let n = 0; n < count; n++){
		if (bricks.length == 0)
			break;
		let i = randRange(bricks.length);
		let br = bricks[i];
		bricks.splice(i, 1);

		let id = game.top.powerupSpawner.getId();
		let pow = new Powerup(br.x, br.y, id);
		game.emplace("powerups", pow);
		br.suppress = true;
	}
}

//HaHa
f[43] = function(){
	playSound("haha_collected");
	let [px, py] = this.getPos();
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
			let br2 = br.clone();
			br2.setPos(x0, y0);
			br2.setTravel(x, y, "time", 200);
			game.emplace("bricks", br2);
			grid.reserve(i, j);
		}
	}
};

//Lock
f[62] = function(){
	playSound("lock_collected");
	for (let br of game.get("bricks")){
		if (br.patch.storedMove)
			br.patch.storedMove = null;
		else if (br.patch.move){
			//move brick to its nearest grid pos
			br.patch.move = null;
			let [x, y] = getGridPosInv(...getGridPos(br.x, br.y));
			br.setTravel(x, y, "time", 0.1, "default");
		}
	}
}

//Oldie
class Oldie extends GraphicsSprite{
	static barHeight = 32;

	constructor(){
		super(0, 0);
		//register all valid bricks to a set
		this.record = new Set(game.get("bricks").filter(
			br => br instanceof NormalBrick ||
				  br instanceof MetalBrick
		));
		//create horizontal white bar that moves up
		let bar = new PIXI.Graphics();
		bar.position.set(DIM.lwallx, DIM.h);
		bar.beginFill(0xFFFFFF)
			.drawRect(0, 0, DIM.boardw, Oldie.barHeight);
		bar.vy = 0.8;
		bar.mask = new Mask(
			DIM.lwallx, DIM.ceiling, DIM.boardw, DIM.boardh);
		this.addChild(bar);
		this.bar = bar;
	}

	//kill normal bricks at a 90% chance
	//or reduce metal bricks level by 1
	processBrick(br){
		if (br instanceof NormalBrick){
			if (Math.random() < 0.9)
				br.kill();
		}
		else if (br instanceof MetalBrick){
			let level = br.level;
			if (level > 0){
				game.emplace("bricks", 
					new MetalBrick(br.x, br.y, level-1));
				br.score = 0;
				br.suppress = true;
				br.kill();
			}
		}
	}

	update(delta){
		let bar = this.bar;
		bar.y -= bar.vy * delta;
		if (bar.y + Oldie.barHeight < DIM.ceiling)
			this.kill();
		for (let br of this.record){
			if (br.y - br.h/2 > bar.y){
				this.processBrick(br);
				this.record.delete(br);
			}
		}
	}
}
f[77] = function(){
	if (checkExistingInstance("specials2", Oldie))
		return;
	playSound("oldie_collected");
	game.emplace("specials2", new Oldie());
}

//Open
f[78] = function(){
	//move all non platinum-strength bricks left or right.
	//After moving, make sure to kill any gold-strength bricks
	//	that are touching a wall or platinum-stength bricks
	//	in all eight directions

	//TODO: Deal with Powerups spawning inside of walls

	playSound("open_collected");

	let grid = game.top.brickGrid;

	function canMove(br){
		return br.armor < 2 && !br.gridDat.move;
	}

	function shouldDie(br){
		if (br.armor < 1)
			return false;
		let [i0, j0] = getGridPos(br.x, br.y);
		for (let i = i0-1; i <= i0+1; i++){
			for (let j = j0-1; j <= j0+1; j++){
				if (i == i0 && j == j0)
					continue;
				if (!boundCheck(i, j))
					return true;
				for (let br2 of grid.get(i, j))
					if (br2.armor >= 2)
						return true;
			}
		}
		return false;
	}

	function customComplete(br){
		br.zIndex = 0;
		Brick.travelComplete.default(br);
		if (!br.isDead() && shouldDie(br))
			br.kill();
	}

	for (let i = 0; i < 32; i++){
		for (let j = 0; j < 13; j++){
			for (let br of grid.get(i, j)){
				if (!canMove(br))
					continue;
				let dj;
				if (j == 6)
					dj = (i % 2 == 0) ? -1 : 1;
				else
					dj = (j < 6) ? -1 : 1;
				let [x, y] = getGridPosInv(i, j+dj);
				br.setTravel(x, y, "time", 300, customComplete);
				br.zIndex = -1;
			}
		}
	}
};

//Quake
class Quake extends Special{
	constructor(){
		super(null);
		const scale = 0.25;

		this.shakeTimer = 0;
		this.shakeDelay = 1000 / (60 * scale);

		this.action = 0;
		this.actionTimer = 0;
		this.actionDelay = 250;

		this.name = "quake";
	}

	destructor(){
		game.setPos(0, 0);
	}

	static getScreenShakeOffset(){
		const width = 4;
		const height = 2;
		let dx = randRange(-width, width+1);
		let dy = randRange(-height, height+1);
		return [dx, dy];
	}

	static canMove(br){
		return br.armor < 1;
	}

	//for each row, swap random pairs of adjacent bricks
	//swap will be instant with no travel time
	//version 2: swap brick <-> brick or empty <-> brick
	static shuffleBricks(){
		let grid = game.top.brickGrid;
		for (let i = 0; i < 32; i++){
			//used to look up brick based on column 
			let row_lookup = new Map();
			//each value refers to the left index of an adjacent pair
			let pairs = [];

			let prev = null;
			//gather pairs of adjacent bricks
			for (let j = 0; j < 13; j++){
				let br = grid.getStatic(i, j);
				if (br){
					if (Quake.canMove(br))
						row_lookup.set(j, br);
					else
						br = null;
				}
				//change to (prev && br) if you want to swap
				//	between non-empty spaces only
				if (j != 0 && (prev || br))
					pairs.push(j-1);
				prev = br;
			}
			//shuffle random pairs of bricks
			let limit = 3;
			while (pairs.length > 0){
				let index = randRange(pairs.length);
				let j = pairs[index];
				remove_if(pairs, x => x >= j-1 && x <= j+1);

				let left_pos = getGridPosInv(i, j);
				let right_pos = getGridPosInv(i, j+1);
				row_lookup.get(j)?.setPos(...right_pos);
				row_lookup.get(j+1)?.setPos(...left_pos);

				if (--limit == 0)
					break;
			}
		}
	}

	//move bricks down (similar to Zen Shove)
	//shift will be instant with no travel time
	static shiftBricksDown(){
		let grid = game.top.brickGrid;
		let shiftedBricks = new Set();

		function canMove(br){
			return br.armor < 1;
		}

		function isBlocking(br){
			return br.armor >= 1 || !shiftedBricks.has(br);
		}

		for (let j = 0; j < 13; j++){
			for (let i = 32-10; i >= 0; i--){
				let br = grid.getStatic(i, j);
				if (!br || !canMove(br))
					continue;
				let obstacle = false;
				for (let bottom of grid.get(i+1, j)){
					if (isBlocking(bottom)){
						obstacle = true;
						break;
					}
				}
				if (!obstacle)
					shiftedBricks.add(br);
			}
		}

		for (let br of shiftedBricks){
			let [i, j] = getGridPos(br.x, br.y);
			let [x, y] = getGridPosInv(i+1, j);
			br.setPos(x, y);
		}
	}

	update(delta){
		this.shakeTimer -= delta;
		if (this.shakeTimer <= 0){
			this.shakeTimer += this.shakeDelay;
			let [dx, dy] = Quake.getScreenShakeOffset();
			game.setPos(dx, dy);
		}

		this.actionTimer -= delta;
		if (this.actionTimer <= 0){
			this.actionTimer += this.actionDelay;
			let action = this.action++;
			if (action % 2 == 0)
				Quake.shuffleBricks();
			else
				Quake.shiftBricksDown();
			if (action == 3)
				this.kill();
		}
	}
}

f[86] = function(){
	for (let obj of game.get("specials1")){
		if (obj.name == "quake")
			return;
	}
	playSound("quake_collected");
	let quake = new Quake();
	game.emplace("specials1", quake);
}

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
};

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
	playSound("trail_collected");
	for (let ball of game.get("balls")){
		if (ball.components.trail)
			ball.components.trail.count += 10;
		else
			ball.components.trail = new Trail(ball);
	}
};

//Ultraviolet
class Ultraviolet extends GraphicsSprite{
	static cachedTextures = {};

	constructor(){
		super(0, 0);
		this.overlays = new Map();

		this.count = 10;
		this.fadeTime = 1000;
		this.spawnDelay = 100;
		this.spawnTimer = 0;
	}

	//picks a random normal brick and create a overlay
	//that will grow increasingly transparent before
	//killing the brick
	spawnOverlay(){
		let overlays = this.overlays;
		let bricks = game.get("bricks").filter(
			br => br instanceof NormalBrick && 
			      !overlays.has(br) &&
			      !br.shouldBeRemoved()
		);
		if (bricks.length == 0)
			return false;

		let br = bricks[randRange(bricks.length)];
		let overlay = new PIXI.Graphics();
		overlay.position.set(br.x, br.y);
		let w = br.w;
		let h = br.h;
		overlay.beginFill(0x6600CC)
			.drawRect(-w/2, -h/2, w, h);
		overlay.alpha = 0;
		overlay.timer = 0;

		overlays.set(br, overlay);
		this.addChild(overlay);

		return true;
	}

	//spawn a bunch of brick particles
	//TODO: created textures?
	shatterBrick(br){
		//a brick sprite is 16x8 pixels
		//divide it into 8 4x4 sections
		let basetex = br.texture;
		let x0 = br.x - br.w/2;
		let y0 = br.y - br.h/2;
		for (let x = 0; x < 16; x += 4){
			for (let y = 0; y < 8; y += 4){
				let rect = new PIXI.Rectangle(x, y, 4, 4);
				let tex = new PIXI.Texture(basetex, rect);
				let p = new Particle(tex, x0 + x*2, y0 + y*2);

				let rad = randRangeFloat(2 * Math.PI);
				let mag = randRangeFloat(0.05, 0.20);
				let [vx, vy] = Vector.rotate(0, mag, rad);
				p.setVel(vx, vy);
				p.ay = 0.001;

				game.emplace("particles", p);
			}
		}
	}

	update(delta){
		let overlays = this.overlays;
		const fadeTime = this.fadeTime;
		//remove overlays of dead bricks
		//also update their position
		for (let [br, overlay] of overlays.entries()){
			if (br.shouldBeRemoved()){
				overlays.delete(br);
				this.removeChild(overlay);
			}
			else
				overlay.position.set(...br.getPos());
		}
		//update overlays and kill brick
		//if overlay is fully opaque
		for (let [br, overlay] of overlays.entries()){
			overlay.timer += delta;
			if (overlay.timer >= fadeTime){
				br.kill();
				playSound("ultraviolet_pop");
				this.shatterBrick(br);
				overlays.delete(br);
				this.removeChild(overlay);
			}
			else
				overlay.alpha = overlay.timer / fadeTime;
		}
		//spawn new overlay at a fixed interval
		if (this.count > 0){
			this.spawnTimer -= delta;
			if (this.spawnTimer <= 0){
				this.spawnTimer += this.spawnDelay;
				this.spawnOverlay();
				this.count--;
			}
		}
		else{
			if (overlays.size == 0)
				this.kill();
		}
	}
}
f[112] = function(){
	playSound("ultraviolet_collected");
	let obj = checkExistingInstance("specials2", Ultraviolet)
	if (obj){
		obj.count += 10;
		obj.spawnDelay = 100 * 10 / obj.count;
		return;
	}
	game.emplace("specials2", new Ultraviolet());
}

//Unification
function unifyNormal(br){
	let [i, j] = br.normalInfo;
	let col;
	if (j <= 18)
		col = j;
	else if (j == 19)
		col = 20 + Math.min(3, i);
	else //j == 20
		col = 19;

	br.setTexture(`brick_unification_${col}`);
	br.score = 250;
}
f[113] = function(){
	playSound("unification_collected");
	for (let br of game.get("bricks")){
		if (br.brickType == "normal"){
			unifyNormal(br);
		}
	}
}

//Unlock
f[115] = function(){
	playSound("lock_collected");
	for (let br of game.get("bricks")){
		if (br.isMoving() || br.patch.storedMove)
			continue;
		let [i, j] = getGridPos(br.x, br.y);
		if (i % 2 == 0)
			br.initMovementPatch(7); //medium left
		else
			br.initMovementPatch(10); //medium right
	}
}

//Undestructible
class Undestructible extends Special{
	constructor(){
		super(null, 0, 0);
		this.scale.set(1);
		this.record = new Map();
		this.overlay = new PIXI.Graphics();
		this.addChild(this.overlay);

		this.timer = 4000;
	}

	destructor(){
		for (let [br, oldArmor] of this.record.entries())
			br.armor = oldArmor;
	}

	static isInvisible(br){
		if (br.patch.invisible)
			return true;
		if (br instanceof ForbiddenBrick)
			return true;
		if (br instanceof NullBrick)
			return true;
		return false;
	}

	update(delta){
		let record = this.record;
		let overlay = this.overlay;

		//remove any dead bricks
		for (let br of record.keys()){
			//don't need to revert armor of dead bricks
			if (br.shouldBeRemoved())
				record.delete(br);
		}

		//add new bricks
		for (let br of game.get("bricks")){
			if (record.has(br))
				continue;
			record.set(br, br.armor);
			br.armor = 2;
		}

		//draw overlay over all bricks
		overlay.clear().beginFill(0xFFC800, 0.5);
		for (let br of game.get("bricks")){
			if (!Undestructible.isInvisible(br))
				overlay.drawRect(br.x-16, br.y-8, 32, 16);
		}

		super.update(delta);
	}
}
f[116] = function(){
	playSound("undestructible_collected");
	let obj = checkExistingInstance("specials2", Undestructible);
	if (obj){
		obj.timer += 4000;
		return;
	}
	game.emplace("specials2", new Undestructible());
	game.createMonitor(
		"Undestructible", 
		"specials2", 
		["timer"],
		obj => obj instanceof Undestructible
	);
}

//Vendetta
f[117] = function(){
	let i = chooseRow();
	let [x, y] = getGridPosInv(i, 0);

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

//Venom
f[119] = function(){
	playSound("generic_collected");

	let grid = game.top.brickGrid;
	const off = [[0, -1], [1, 0], [0, 1], [-1, 0]];

	function validExplosive(br){
		return br.brickType == "detonator" || br.brickType == "comet";
	}

	function canSpreadTo(i, j){
		for (let br of grid.get(i, j)){
			if (validExplosive(br))
				return false;
			if (br.armor >= 1)
				return false;
		}
		return true;
	}

	for (let br of game.get("bricks")){
		if (!validExplosive(br))
			continue;
		if (br.isMoving())
			continue;
		let [x0, y0] = br.getPos();
		let [i0, j0] = getGridPos(x0, y0);
		
		for (let [di, dj] of off){
			let [i, j] = [i0 + di, j0 + dj];
			if (i >= 32-8)
				continue;
			if (!boundCheck(i, j))
				continue;
			if (!canSpreadTo(i, j))
				continue;

			let [x, y] = getGridPosInv(i, j);
			let br2 = br.clone();
			br2.setPos(x0, y0);
			br2.setTravel(x, y, "time", 200, "kill");
			game.emplace("bricks", br2);
			grid.reserve(i, j);
		}
	}
}

//Wet Storm
f[125] = function(){
	//old function that chooses the column with the
	//most destructable bricks
	// function chooseColumn(){
	// 	let grid = game.top.brickGrid;
	// 	let arr = [];
	// 	let maxCount = 0;
	// 	for (let j = 0; j < 13; j++){
	// 		let count = 0;
	// 		for (let i = 0; i < 32; i++){
	// 			let br = grid.getStatic(i, j);
	// 			if (br && br.armor < 1)
	// 				count++;
	// 		}
	// 		arr.push(count);
	// 		maxCount = Math.max(maxCount, count);
	// 	}
	// 	let indices = [];
	// 	for (let [i, v] of arr.entries()){
	// 		if (v == maxCount)
	// 			indices.push(i);
	// 	}
	// 	return indices[randRange(indices.length)];
	// }

	//new function that just randomly choose columns
	//that have at least 1 destructable brick
	function chooseColumn(){
		let grid = game.top.brickGrid;
		let indices = [];
		for (let j = 0; j < 13; j++){
			for (let i = 0; i < 32; i++){
				let br = grid.getStatic(i, j);
				if (br && br.armor < 1){
					indices.push(j);
					continue;
				}
			}
		}
		if (indices.length > 0)
			return indices[randRange(indices.length)];

		//if there are no destructable bricks, just
		//choose a random column
		return randRange(0, 13);
	}

	function spawnRainDrop(){
		playSound("wet_storm_collected");
		
		let drop = new Projectile("raindrop", 0, 0, 0, 0.5);
		let w = drop.w;
		let h = drop.h;
		// let x = randRange(DIM.lwallx + w/2, DIM.rwallx - w/2 + 1);
		// let y = DIM.ceiling - h/2 - 16;
		let j = chooseColumn();
		let [x, y] = getGridPosInv(0, j);
		y = DIM.ceiling - h/2 - 16; 
		drop.setPos(x, y);
		drop.damage = 100;
		drop.strength = 0;
		drop.wallCheck = false;
		drop.canHit = function(obj){
			if (Projectile.prototype.canHit.call(this, obj)){
				if (obj.gameType == "brick"){
					return obj.armor < 1;
				}
				return true;
			}
			return false;
		};
		game.emplace("projectiles", drop);
	}

	for (let i = 0; i < 20; i++){
		game.top.emplaceCallback(500 * i, spawnRainDrop);
	}
}

//X-Ray
f[128] = function(){
	playSound("xray_collected");

	let bricks = game.get("bricks").filter(
		br => br instanceof NormalBrick);
	//convert 30% of normal bricks to Powerup Bricks
	const count = Math.ceil(bricks.length * 0.3);
	for (let n = 0; n < count; n++){
		if (bricks.length == 0)
			break;
		let i = randRange(bricks.length);
		let br = bricks[i];
		bricks.splice(i, 1);

		br.suppress = true;
		br.kill();
		let id = game.top.powerupSpawner.getId();
		let pow = new PowerupBrick(br.x, br.y, id);
		game.emplace("bricks", pow);
	}
}

//Buzzer
class Buzzer extends BallProjectile{
	constructor(){
		super("buzzer_0", DIM.w/2, DIM.h + 48, 0, 0);
		this.setBounce(true);
		this.pierce = "strong";
		this.floorCheck = false;
		this.damage = 100;
		this.strength = 1;

		let deg = randRangeFloat(30, 60);
		let [vx, vy] = Vector.rotate(-0.5, 0, deg * Math.PI / 180);
		if (Math.random() < 0.5)
			vx = -vx;
		this.setVel(vx, vy);

		this.spin = true;
		this.spinTimer = 0;
		this.spinTimerMax = 250;

		playSound("buzzer_collected", false, this);
	}

	destructor(){
		stopSound("buzzer_collected", false, this);
	}

	update(delta){
		if (this.vy > 0 && this.y > DIM.h + 48)
			this.kill();
		this.spinTimer += delta;
		if (this.spinTimer >= this.spinTimerMax){
			this.spinTimer -= this.spinTimerMax;
			this.spin = !this.spin;
			this.setTexture(this.spin ? "buzzer_0" : "buzzer_1");
		}
		super.update(delta);
	}
}
f[132] = function(){
	let buzz = new Buzzer();
	game.emplace("projectiles", buzz);
};

/********
* Other *
*********/

function checkExistingInstance(name, checkClass){
	for (let obj of game.get(name, true)){
		if (obj instanceof checkClass){
			return obj;
		}
	}
	return null;
}

/*==== Enemy-Related Subcategory ====*/

//Laceration
f[57] = function(){
	playSound("laceration_collected");

	let flash = new Particle(null, DIM.lwallx, DIM.ceiling);
	flash.scale.set(1);
	flash.addChild(new PIXI.Graphics()
		.beginFill(0x996633)
		.drawRect(0, 0, DIM.boardw, DIM.boardh)
	);
	flash.setFade(0.002);
	game.emplace("specials2", flash);

	//kill all enemies
	for (let enemy of game.get("enemies")){
		if (enemy.gameType == "dropper" && enemy.menacerId == 0)
			continue;
		enemy.kill();
	}
	//kill all menacers (except for red menacers)
	for (let menacer of game.get("menacers")){
		if (menacer.menacerId == 0)
			continue;
		menacer.kill();
	}
	//prevent all enemies except for red droppers from spawning
	let spawner = game.top.spawner;
	if (spawner){
		remove_if(spawner.enemyInfo, arr => {
			return (arr[0] != "dropper_0");
		});
	}
}

//Mobility
class Mobility extends Special{
	constructor(){
		super(null);
		this.record = new Set();
		this.timer = 20000;
	}

	destructor(){
		for (let obj of this.record)
			obj.disabled = false;
	}

	update(delta){
		let record = this.record;
		//remove dead objects
		for (let obj of record){
			//don't need to restore dead objects
			if (obj.shouldBeRemoved())
				record.delete(obj);
		}

		for (let name of ["enemies", "menacers"]){
			for (let obj of game.get(name)){
				if (this.record.has(obj))
					continue;
				if (obj.y - obj.h/2 <= DIM.ceiling)
					continue;
				record.add(obj);
				//Should I give the objects the same treatment
				//as Slug? What would happen if Slug and Mobility overlap?
				obj.disabled = true;
			}
		}
		super.update(delta);
	}
}
f[67] = function(){
	//missing sound
	let obj = checkExistingInstance("specials1", Mobility);
	if (obj){
		obj.timer += 20000;
		return;
	}

	game.emplace("specials1", new Mobility());
	game.createMonitor(
		"Mobility", 
		"specials1", 
		["timer"], 
		obj => obj instanceof Mobility
	);
}

//Slug
class Slug extends Special{
	//Slug permamently slows down all enemies and hostile projectiles

	constructor(){
		super(null);
		this.record = new Set();

		//[name, time multiplier]
		this.containers = [
			["enemies", 0.5],
			["projectiles", 0.33],
			["menacers", 0.5],
		];
	}

	destructor(){
		//TODO: Revert the slowdown effect if Slug destruction
		//	is required
	}

	update(delta){
		let record = this.record;
		//remove dead objects
		for (let obj of record){
			//don't need to restore dead objects
			if (obj.shouldBeRemoved())
				record.delete(obj);
		}

		for (let [name, multiplier] of this.containers){
			for (let obj of game.get(name)){
				if (name == "projectiles" && !obj.hostile)
					continue;
				if (this.record.has(obj))
					continue;
				if (obj.y - obj.h/2 <= DIM.ceiling)
					continue;
				record.add(obj);

				//literally make the object move in slow-motion
				let update = obj.update;
				obj.update = function(delta){
					update.call(this, delta * multiplier);
				};
			}
		}
	}
}
f[103] = function(){
	if (checkExistingInstance("specials1", Slug))
		return;
	game.emplace("specials1", new Slug());
};

/*==== Mystery Subcategory ====*/
function getMysteryPowerup(risky=false){
	//risky means choose from both good and bad powerups

	let weights = DEFAULT_WEIGHTS.slice();
	//disable both Mystery and Risky Mystery powerups
	//to prevent infinite loops
	weights[69] = 0;
	weights[94] = 0;
	//disable inactive/unimplemented powerups
	for (let i = 0; i < weights.length; i++){
		if (!powerupFunc[i])
			weights[i] = 0;
	}
	//disable bad powerups if not risky
	if (!risky){
		for (let i = 0; i < weights.length; i++){
			if (badPowerupsLookup[i])
				weights[i] = 0;
		}
	}
	//generate random id based on weighted chances
	let sum = weights.reduce((a, b) => a + b, 0);
	let n = randRange(sum);
	for (let [i, w] of weights.entries()){
		n -= w;
		if (n <= 0)
			return i;
	}
	//should never happen
	alert("Mystery: all weights are zero!");
	return null;
}
//Mystery
f[69] = function(){
	let id = getMysteryPowerup();
	f[id].call(this);
	// console.log("mystery " + id);
}
//Risky Mystery
f[94] = function(){
	let id = getMysteryPowerup(true);
	f[id].call(this);
	// console.log("risky mystery " + id);
}

/*==== Bypass and Warp Subcategory ====*/
//Bypass
f[12] = function(){
	playSound("bypass_collected");
	game.top.bypass.open(1);
}

//Warp
f[122] = function(){
	playSound("bypass_collected");
	game.top.bypass.open(2);
}

/*==== Miscellaneous ====*/

//Barrier
class Barrier extends Special{
	constructor(){
		super(null, DIM.w/2, DIM.h - 24);
		let tiles = new PIXI.TilingSprite(
			media.textures["barrier_brick"], 
			DIM.boardw/2, 
			16/2
		);
		tiles.anchor.set(0.5);
		this.addChild(tiles);

		this.timer = 10000;

		game.top.pit_blockers++;
	}

	destructor(){
		game.top.pit_blockers--;
	}

	update(delta){
		for (let ball of game.get("balls")){
			if (ball.y + ball.r > this.y - 8)
				ball.handleCollision(0, -1);
		}
		super.update(delta);
	}
}
f[6] = function(){
	playSound("barrier_collected");
	for (let obj of game.get("specials2")){
		if (obj instanceof Barrier){
			obj.timer += 10000;
			return;
		}
	}
	game.emplace("specials2", new Barrier());
	game.createMonitor(
		"Barrier",
		"specials2",
		["timer"],
		obj => obj instanceof Barrier
	);
}

//Blackout
class Blackout extends Special{
	constructor(){
		super(PIXI.Texture.WHITE);
		this.anchor.set(0, 0);
		this.setPos(DIM.lwallx, DIM.ceiling);
		//PIXI.Texture.WHITE has a base size of 16x16
		this.scale.set(DIM.boardw/16, DIM.boardh/16);
		this.tint = 0x000000;
		this.alpha = 0;

		this.timer = 10000;
	}

	update(delta){
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
	}
}

f[7] = function(){
	let black = new Blackout();
	game.emplace("specials2", black);
	playSound("blackout_collected");
};

//Forcefield
class Forcefield extends Special{
	constructor(){
		const height = 16;
		super(null, DIM.lwallx, DIM.h - 104);
		this.scale.set(1);
		this.addChild(new PIXI.Graphics()
			.beginFill(0xE6E68A, 0.5)
			.drawRect(0, -height/2, DIM.boardw, height)
		);
	}

	update(delta){
		let paddle = game.get("paddles")[0];
		for (let ball of game.get("balls")){
			if (
				ball.vy > 0 && 
				ball.y > this.y && 
				ball.y + ball.r < paddle.y
			)
			{
				ball.velOverride = {vx: 0, vy: 0.1};
				//optionally redirect ball's real velocity downward
				let spd = ball.getSpeed();
				ball.setVel(0, spd);
			}
		}
	}
}
f[32] = function(){
	playSound("generic_collected");
	for (let obj of game.get("specials2")){
		if (obj instanceof Forcefield)
			return;
	}
	game.emplace("specials2", new Forcefield());
};

//Intelligent Shadow
class IntelligentShadow extends Paddle{
	constructor(paddle){
		super();
		this.setTexture("paddle_28_3");
		this.setPos(paddle.x, paddle.y+16);
		this.timer = 10000;
		this.isIntelligentShadow = true;
		this.paddleHitSound = "int_shadow_hit";
	}

	update(delta){
		const spd = 1;
		let mx = autopilot(this, false, false);
		let pw = this.paddleWidth;
		let px = clamp(mx, DIM.lwallx + pw/2, DIM.rwallx - pw/2);
		let dx = px - this.x;
		let sign = dx > 0 ? 1 : -1;
		dx = sign * Math.min(spd * delta, Math.abs(dx));
		px = this.x + dx;
		this.setPos(px, this.y);

		for (let ball of game.get("balls")){
			if (ball.vy > 0){
				let resp = this.checkSpriteHit(ball);
				if (resp[0]){
					this.onBallHit(ball);
				}
			}
		}

		Sprite.prototype.update.call(this, delta);
		this.intShadowTimer = this.timer;
	}
}
f[48] = function(){
	playSound("int_shadow_collected");

	//check for existing intelligent shadows first
	for (let obj of game.get("specials2")){
		if (obj.isIntelligentShadow){
			obj.timer += 10000;
			return;
		}
	}

	let paddle = game.get("paddles")[0];
	let shadow = new IntelligentShadow(paddle);

	game.emplace("specials2", shadow);
	game.createMonitor(
		"I. Shadow", 
		"specials2", 
		["timer"],
		obj => obj instanceof IntelligentShadow
	);
};

//Junk
f[52] = function(){
	playSound("junk_collected");
	let mult = game.top.scoreMultiplier;
	game.top.setScoreMultiplier(Math.max(mult-1, -1));
};

//Jewel
f[53] = function(){
	playSound("jewel_collected");
	let mult = game.top.scoreMultiplier;
	game.top.setScoreMultiplier(Math.min(mult+1, 1));
};

//Joker
f[54] = function(){
	playSound("joker_collected");

	for (let pow of game.get("powerups")){
		if (pow.id != 54)
			pow.activate();
	}
};

//Luck
f[63] = function(){
	playSound("luck_collected");

	let spawner = game.top.powerupSpawner;
	if (spawner.luckActivated)
		return;
	spawner.luckActivated = true;

	let weights = spawner.weights;
	for (let i = 0; i < weights.length; i++){
		if (badPowerupsLookup[i])
			weights[i] = 0;
		else
			weights[i] = weights[i] ? 1 : 0;
	}
	spawner.sum = weights.reduce((a, b) => a + b, 0);
	spawner.globalRate *= 1.6;
};

//Magnet
class Magnet extends Special{
	constructor(){
		super(null);
	}

	update(delta){
		let paddle = game.get("paddles")[0];
		for (let pow of game.get("powerups")){
			if (badPowerupsLookup[pow.id])
				continue;
			let dx = paddle.x - pow.x;
			pow.vx = dx / 500;
		}
	}
}
f[64] = function(){
	playSound("attract_collected");
	if (checkExistingInstance("specials1", Magnet))
		return;
	game.emplace("specials1", new Magnet());
}

//Nebula
class Nebula extends GraphicsSprite{
	constructor(){
		super(DIM.w/2, DIM.ceiling + DIM.boardh/2);

		this.timer = 10000;
		this.ringTimer = 0;
		this.ringDelay = 500;
		this.ringRadius = 20 + Vector.dist(
			DIM.lwallx, DIM.ceiling, this.x, this.y);
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0)
			this.kill();
		this.updateRings(delta);
		this.pullBalls();
	}

	updateRings(delta){
		//rings persist after Nebula expires, so it's better
		//to create multiple independent ring particles
		this.ringTimer -= delta;
		if (this.ringTimer > 0)
			return;
		this.ringTimer += this.ringDelay;

		let ring = new GraphicsSprite(this.x, this.y);
		ring.radius = this.ringRadius;
		ring.speed = 0.15;
		ring.update = function(delta){
			this.clear();
			this.lineStyle(4, 0x00FFFF);
			this.drawCircle(0, 0, this.radius);

			this.radius -= this.speed * delta;
			if (this.radius <= 0)
				this.kill();
		};
		ring.update(0);

		game.emplace("particles", ring);
	}

	pullBalls(){
		let cx = this.x;
		let cy = this.y;
		for (let ball of game.get("balls")){
			let vec = new Vector(cx - ball.x, cy - ball.y);
			vec = vec.normalized();
			ball.setSteer(vec.x, vec.y, 0.01);
		}
	}

	/* Old version that makes balls travel in a circle
	pullBalls(){
		let center = new Vector(this.x, this.y);
		for (let ball of game.get("balls")){
			let pos = new Vector(ball.x, ball.y);
			//ball -> center vector
			let normal = center.sub(pos);
			normal = normal.normalized();
			//check if ball should move clockwise or counter-clockwise
			//based on ball's current velocity
			let sign = Vector.angleSign(
				normal.x, normal.y, ball.vx, ball.vy);
			let perp = normal.perpendicular().scale(sign);
			//make the ball gravitate slightly towards the center
			//will 60fps change its behavior?
			let steer = perp.add(normal.scale(0.2));
			ball.setSteer(steer.x, steer.y, 0.025);
		}
	}
	*/
}
f[71] = function(){
	playSound("control_collected");
	let obj = checkExistingInstance("specials1", Nebula);
	if (obj){
		obj.timer += 10000;
		return;
	}
	game.emplace("specials1", new Nebula());
	game.createMonitor(
		"Nebula",
		"specials1",
		["timer"],
		obj => obj instanceof Nebula
	);
};

//Player
f[82] = function(){
	playSound("player_collected");
	let playstate = game.top;
	playstate.lives++;
	playstate.updateLivesDisplay();
};

//Reset
f[93] = function(){
	playSound("normal_collected");
	for (let ball of game.get("balls")){
		ball.normal();
	}
	let paddle = game.get("paddles")[0];
	paddle.normal();
};

//Timewarp
class TimeWarp{
	constructor(playstate){
		this.playstate = playstate;
		this.timerMax = 15000;
		this.timer = this.timerMax;
	}

	update(delta){
		this.timer -= delta;
		if (this.timer <= 0){
			this.playstate.timescale = 1;
			this.playstate.timewarp = null;
			return;
		}

		let sin = Math.sin;
		let PI = Math.PI;

		const period = 12;
		const min = -2.000; //log base 2 of 0.25
		const max =  1.322; //log base 2 of 2.5
		const range = max - min;

		let t = (this.timerMax - this.timer) / 1000;
		let exp = min + range * (1+sin(t*period/(2*PI)))/2;
		// console.log(exp);

		this.playstate.timescale = 2 ** exp;
	}
}
f[105] = function(){
	let playstate = game.top;
	if (playstate.timewarp){
		playstate.timewarp.timer += 15000;
		playstate.timewarp.timerMax += 15000;
		return;
	}

	let timewarp = new TimeWarp(playstate);
	playstate.timewarp = timewarp;

	let monitor = new Monitor("Time Warp", null, null, "time");
	monitor.update = function(delta){
		let value = timewarp.timer;
		if (value < 0)
			this.kill();
		this.setValue(value);
	};
	playstate.monitors.addChild(monitor);
	playstate.repositionMonitors();

}

//Tractor
class Tractor extends Special{
	constructor(){
		super(null, DIM.w/2, DIM.h - 16);
		this.scale.set(1);

		this.health = 3;

		this.shock = new PIXI.Graphics();
		this.addChild(this.shock);
		this.shockTimer = 0;
		this.shockDelay = 1000 / 30;

		game.top.pit_blockers++;
	}

	destructor(){
		game.top.pit_blockers--;
	}

	update(delta){
		for (let ball of game.get("balls")){
			if (ball.vy > 0 && ball.y + ball.r > this.y){
				ball.handleCollision(0, -1);
				this.health--;
				if (this.health <= 0){
					this.kill();
					return;
				}
			}
		}


		const w = DIM.boardw;
		this.shockTimer -= delta;
		if (this.shockTimer <= 0){
			this.shockTimer += this.shockDelay;
			this.shock.clear();
			let colors = [0x00FF00, 0xCCFFCC, 0xFFFF00];
			for (let i = 0; i < this.health; i++){
				let color = colors[i];
				shockify(this.shock, -w/2, 0, w/2, 0, {
					color: color,
					amplitude: 16,
					deviation: 12,
					rectangle: true
				});
			}
		}
	}
}
f[107] = function(){
	playSound("tractor_collected");
	game.emplace("specials2", new Tractor());
};

//Undead
class Undead extends Special{
	constructor(){
		const height = 20;
		const width = DIM.boardw;

		super(null, DIM.lwallx, DIM.h - height);
		this.scale.set(1);

		//create gradient effect
		let rect = new PIXI.Graphics();
		for (let i = 0; i < height; i++){
			rect.beginFill(0xFFFFFF, (i+1)/height);
			rect.drawRect(0, i, width, 1);
		}
		this.addChild(rect);

		this.health = 1;

		game.top.pit_blockers++;
	}

	destructor(){
		game.top.pit_blockers--;
	}

	update(delta){
		for (let ball of game.get("balls")){
			if (ball.y - ball.r > DIM.h){
				let paddle = game.get("paddles")[0];
				paddle.attachBall(ball, true);
				this.health--;
				if (this.health <= 0)
					this.kill();
			}
		}
	}
}
f[114] = function(){
	playSound("undead_collected");
	for (let obj of game.get("specials2")){
		if (obj instanceof Undead){
			obj.health++;
			return;
		}
	}
	game.emplace("specials2", new Undead());
}

/********
 * Twin *
 ********/
//Twin gets its own category due to its complexity
//TODO: Use NineSlicePlane?

/* THE PLAN
	1. Create a new paddle and add it to playstate.paddles
	2. Create a TwinComponent that contains the twin paddle
	3. Set the TwinComponent to the original paddle
	3a. Make sure TwinComponent is set to a separate twin property

	(option B <- best option!)
	modify Powerup.activate() such that it will call
	TwinWrapper.syncComponents()

	(option A)
	4. modify Paddle.setComponent() such that if the paddle
		has a twin component and the new component is
		part of the Twin Whitelist, then set the component
		to the twin paddle as well
	5. modify Paddle.clearComponents() to ignore clearing
		the twin component
	6. give the twin a virtual mouse?
*/

/* NO OFFICIAL WHITELIST
	Only components that have the twinClone() method defined
	will be copied over to the twin paddle
*/

class TwinWrapper{
	constructor(paddle){
		this.gap = 32;

		//paddle.twinWrapper is already set to this
		paddle.isTwin = false;
		this.basePaddle = paddle;

		let twin = new Paddle();
		twin.twinWrapper = this;
		twin.isTwin = true;
		game.emplace("paddles", twin);
		this.twinPaddle = twin;

		twin.resize(paddle.widthIndex);
		this.syncComponents();
	}

	destructor(){
		this.twinPaddle.kill();
	}

	/* 
		Will copy each component of the base paddle that has
		the twinClone() function.
	*/
	syncComponents(){
		let base = this.basePaddle;
		let twin = this.twinPaddle;
		let pairs = [];

		for (let [key, comp] of Object.entries(base.components)){
			if (comp.twinClone)
				pairs.push([key, comp]);
		}

		if (pairs.length > 0){
			twin.clearPowerups();
			twin.setTexture(base.storedTexstr);
			for (let [key, comp] of pairs){
				twin.setComponent(key, comp.twinClone(twin));
			}
		}
	}

	onResize(index, isTwin){
		//resize will terminate early if the paddle is already
		//at the size index
		if (isTwin)
			this.basePaddle.resize(index);
		else
			this.twinPaddle.resize(index);
	}

	//if clampPos is true, then clamp the xpos to
	//within the paddle's bounds
	modifyMouseXPos(mx, isTwin=false, clampPos=false){
		let off = (this.basePaddle.paddleWidth + this.gap)/2;
		let sign = isTwin ? 1 : -1;
		let x = mx + sign * off;
		if (clampPos){
			let paddle = isTwin ? this.twinPaddle : this.basePaddle;
			let px = paddle.x;
			let pw = paddle.paddleWidth;
			let left = px - pw/2;
			let right = px + pw/2;
			x = clamp(x, left, right);
		}
		return x;
	}

	//return left and right boundaries for both paddles
	//	to compensate for the addition of a twin paddle
	getXPosClamp(left, right, isTwin=false){
		let off = this.basePaddle.paddleWidth + this.gap;
		if (isTwin)
			left += off;
		else
			right -= off;
		return [left, right];
	}
}

f[110] = function(){
	//playstate.paddles.children[0] will always be main paddle
	let paddle = game.get("paddles")[0];
	if (paddle.twinWrapper)
		return;
	paddle.twinWrapper = new TwinWrapper(paddle);
}