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
//	Ball Split
//	Ball Modifier
//  Paddle Modifier
//  Brick Modifier
var powerupFunc = {

	/*****************
	 * Ball Addition *
	 *****************/
	 
	//Disrupt
	21: function(){
		Ball.split(8);
	},
	//Frenzy
	33: function(){
		Ball.split(24);
	},
	//Multiple
	68: function(){
		Ball.split(3, true);
	},
	//New Ball
	72: function(){
		let paddle = game.get("paddles")[0];
		let ball = new Ball(0, 0, 0.4, 0);
		game.emplace("balls", ball);
		paddle.attachBall(ball, true);
	},
	//Quadruple
	88: function(){
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
	},
	//Triple
	109: function(){
		Ball.split(3);
	},
	//Two
	111: function(){
		Ball.split(2, true);
	},


	/***************
	 * Ball Modify *
	 ***************/

	 //Acid
	 0: function(){
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
	 },

	 //Antigravity
	 1: function(){
	 	playSound("generic_collected");
	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.components.antigravity = {
	 			update(ball, delta){
	 				ball.setSteer(0, -1, 0.005);
	 			}
	 		};
	 	}
	 },

	 //Attract
	 3: function(){
	 	playSound("generic_collected");
	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.components.attract = {
	 			update(ball, delta){
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
	 	}
	 },

	 //Blossom
	 9: function(){
	 	const n = 24; //# of pellets
	 	
	 	playSound("generic_collected");
	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.setTexture("ball_main_2_0");
	 		//create orbiting blossom sprites
	 		let ring = new PIXI.Container();
	 		for (let i = 0; i < 6; i++){
	 			let rad = i * 2 * Math.PI / 6;
	 			let [dx, dy] = Vector.rotate(0, 10, rad);
	 			let p = new Particle("blossom",
	 				dx, dy, 0, 0, rad, 1, 1);
	 			ring.addChild(p);
	 		}
	 		ball.addChild(ring);
	 		ball.components.blossom = {
	 			armed: true,
	 			destructor(ball){
	 				ball.removeChild(ring);
	 			},
	 			onPaddleHit(ball, paddle){
	 				this.armed = true;
	 				ring.visible = true;
	 			},
	 			update(ball, delta){
	 				if (mouse.m1 == 1 && this.armed){
	 					playSound("blossom_fire");
	 					this.armed = false;
	 					ring.visible = false;
	 					let [x, y] = ball.getPos();
	 					for (let i = 0; i < 3; i++){
	 						game.top.emplaceCallback(i*100, () => {
	 							this.fireRing(x, y, i);
	 						});
	 					}
	 				}
	 			},
	 			preUpdate(ball, delta){
	 				if (!this.armed)
	 					return;
	 				ring.rotation += delta * 0.001;
	 			},
	 			fireRing(x, y, off){
	 				for (let i = 0; i < n; i++){
	 					let rad = (i + off*1/3) * 2 * Math.PI / n;
	 					let [vx, vy] = Vector.rotate(0, 0.25, rad);
	 					let p = new Projectile("blossom",
	 						x, y, vx, vy, rad);
	 					game.emplace("projectiles", p);
	 				}
	 			}
	 		};
	 	};
	 },

	 //general Bomber function
	 bomber: function(explosionFunc){
	 	playSound("bomber_collected");

	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.setTexture("ball_main_1_0");
	 		playSound("bomber_fuse", true);
	 		let fuse = new PIXI.Container();
	 		ball.addChild(fuse);
	 		ball.components.bomber = {
	 			timer: 0,
	 			destructor(ball){
	 				ball.removeChild(fuse);
	 				stopSound("bomber_fuse");
	 			},
	 			preUpdate(ball, delta){
	 				let dead = [];
	 				for (let spark of fuse.children){
	 					spark.update(delta);
	 					if (spark.isDead())
	 						dead.push(spark);
	 				}
	 				for (let spark of dead)
	 					fuse.removeChild(spark);

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
	 					-ball.shape.radius/2,
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
	 			},
	 			onSpriteHit(ball, obj, norm, mag){
	 				if (obj.gameType != "brick")
	 					return;
	 				ball.normal(); //will call destructor
	 				let [i0, j0] = getGridPos(...obj.getPos());
	 				if (!boundCheck(i0, j0))
	 					return;
	 				playSound("bomber_explode");
	 				explosionFunc(i0, j0);
	 			}
	 		};
	 	}
	 },

	 //Bomber
	 10: function(){
	 	//create custom explosion here
	 	powerupFunc.bomber((i0, j0) => {
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
	 	});
	 },

	 //Column Bomber
	 17: function(){
	 	powerupFunc.bomber((i0, j0) => {
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
	 	});
	 },
	 
	 //Row Bomber
	 96: function(){
	 	powerupFunc.bomber((i0, j0) => {
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
	 	});
	 },

	 //Combo
	 18: function(){
	 	const combo_speed = 1.5;
	 	playSound("combo_collected");

	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.components.combo = {
	 			active: false,
	 			count: 10,
	 			delay: 0,
	 			timeout: 0,
	 			oldSpeed: null,

	 			searchTarget(ball){
	 				let [x, y] = ball.getPos();
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
	 			},

	 			destructor(ball){
	 				this.comboEnd(ball);
	 			},

	 			//reverts ball speed if previously active
	 			comboEnd(ball){
	 				if (this.active)
	 					ball.setSpeed(this.oldSpeed);
	 				this.active = false;
	 			},

	 			onSpriteHit(ball, obj, norm, mag){
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
	 				this.timeout = dist / combo_speed;
	 				if (!prevActive)
	 					this.oldSpeed = ball.getSpeed();

	 				let v = new Vector(br.x - ball.x, br.y - ball.y);
	 				v = v.normalized().scale(combo_speed);
	 				ball.setVel(v.x, v.y);

	 				playSound("combo");
	 			},

	 			onPaddleHit(ball, paddle){
	 				this.comboEnd(ball);
	 			},

	 			preUpdate(ball, delta){
	 				if (!this.active)
	 					return;

	 				if (this.delay > 0){
	 					this.delay -= delta;
	 					ball.velOverride = {vx:0, vy:0};
	 					return;
	 				}

	 				this.timeout -= delta;
	 				if (this.timeout <= 0)
	 					this.comboEnd(ball);

	 			}
	 		}
	 	}
	 },

	 //Domino
	 22: function(){
	 	playSound("domino_collected");
	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.components.domino = {
	 			ready: true,
	 			active: false,
	 			timer: 0,
	 			oldVel: null,
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
	 			},
	 			stopDomino(ball){
	 				if (!this.active)
	 					return;
	 				this.active = false;
	 				ball.setVel(...this.oldVel);
	 				ball.pierce = false;
	 			},
	 			destructor(ball){
	 				this.stopDomino(ball);
	 			},
	 			onSpriteHit(ball, obj, norm, mag){
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
	 			},
	 			handleCollision(ball, xn, yn){
	 				this.stopDomino(ball);
	 			},
	 			update(ball, delta){
	 				if (!this.active)
	 					return;
	 				this.timer -= delta;
	 				if (this.timer <= 0)
	 					this.stopDomino(ball);
	 			},
	 			onPaddleHit(ball, paddle){
	 				if (this.active)
	 					console.error("active domino hits paddle");
	 				this.ready = true;
	 			}
	 		};
	 	}
	 },

	 //Large Ball
	 58: function(){
	 	playSound("large_ball_collected");
	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.setTexture("ball_large");
	 		ball.createShape(true);
	 		ball.damage = 40;
	 		ball.strength = 1;
	 	}
	 },

	 //Mega Ball
	 65: function(){
	 	playSound("mega_collected");
	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.setTexture("ball_main_2_5");
	 		ball.strength = 1;
	 		ball.pierce = true;
	 		ball.components.mega = {
	 			timer: 0,
	 			update(ball, delta){
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
	 			},
	 		};
	 	}
	 },

	 //Snapper
	 102: function(){
	 	playSound("generic_collected");
	 	for (let ball of game.get("balls")){
	 		ball.normal();
	 		ball.setTexture("ball_main_1_2");
	 		ball.damage = 0;
	 		ball.components.snapper = {
	 			onSpriteHit(ball, obj, norm, mag){
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
	 	}
	 },

	 /*****************
	 * Paddle Weapons *
	 ******************/

	 //laser
	 59: function(){
	 	playSound("laser_collected");
	 	let paddle = game.get("paddles")[0];
	 	let cmp = paddle.component;
	 	if (cmp?.name == "laser" || cmp?.name == "laserplus")
	 		cmp.maxBullets += 2;
	 	else{
		 	let weapon = new PaddleWeapon(paddle, "laser", 4);
		 	weapon.onClick = function(){
		 		if (mouse.m1 != 1 || this.bulletCount > this.maxBullets)
		 			return;
		 		playSound("laser_fire");
		 		let paddle = this.paddle;
		 		let off = paddle.paddleWidth/2 - 17;
		 		for (let dx of [-off, off]){
		 			let proj = new Projectile("laser_0", 0, 0, 0, -1);
		 			proj.isLaser = true;
		 			this.fireProjectile(proj, dx); 
		 		}
		 	}
		 	paddle.components.weapon = weapon;
		 	paddle.setTexture("paddle_27_1");
		}
	 },

	 //Laser Plus
	 60: function(){
	 	playSound("laser_collected");
	 	let paddle = game.get("paddles")[0];
	 	let extraBullets = 0;
	 	let cmp = paddle.component;
	 	if (cmp?.name == "laserplus")
	 		cmp.maxBullets += 2;
	 	else{
	 		let n = 6;
	 		if (cmp?.name == "laser")
	 			n += 4;
		 	let weapon = new PaddleWeapon(paddle, "laserplus", n);
		 	weapon.onClick = function(){
		 		if (mouse.m1 != 1 || this.bulletCount > this.maxBullets)
		 			return;
		 		playSound("laserplus_fire");
		 		let paddle = this.paddle;
		 		let off = paddle.paddleWidth/2 - 17;
		 		for (let dx of [-off, off]){
		 			let proj = new Projectile("laser_1", 0, 0, 0, -1);
		 			proj.damage = 100;
		 			proj.isLaser = true;
		 			this.fireProjectile(proj, dx); 
		 		}
		 	}
		 	paddle.components.weapon = weapon;
		 	paddle.setTexture("paddle_27_2");
		}
	 },

	 //X-Bomb (Xbomb)
	 127: function(){
	 	//xbomb will always hit the target in the
	 	//same amount of time
	 	const time = 1000;

	 	playSound("xbomb_collected");

	 	let paddle = game.get("paddles")[0];
	 	if (paddle.components.xbomb)
	 		return;

	 	let xbomb = new Particle("powerup_default_127");
	 	xbomb.scale.set(1); //set it to 2 when released
	 	paddle.addChild(xbomb);

	 	let crosshair = new Sprite(PIXI.Texture.WHITE);
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
 							game.emplace("projectiles", 
 								new Explosion(this.x, this.y, 32-1, 16-1)
 							);
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
	 		let val = 1 + 2*Math.sin(this.timer * Math.PI / time);
	 		this.scale.set(2*val);
	 		superUpdate.call(this, delta);
	 	}

	 	paddle.components.xbomb = {
	 		clickPriority: -1,
	 		destructor(paddle){
	 			paddle.removeChild(xbomb);
	 			game.top.hud.removeChild(crosshair);
	 		},
	 		onClick(paddle, mouseVal){
	 			if (mouseVal != 1)
	 				return;
	 			playSound("xbomb_launch");
	 			this.destructor(paddle);
	 			delete paddle.components.xbomb;
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
	 		},
	 		update(paddle, delta){
	 			let [i, j] = getGridPos(mouse.x, mouse.y);
	 			if (!boundCheck(i, j))
	 				return false;
	 			let [x, y] = getGridPosInv(i, j);
	 			crosshair.moveTo(x, y);
	 		}
	 	}
	 },
}