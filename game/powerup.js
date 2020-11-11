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

class Powerup extends Sprite{
	constructor(x, y, id){
		let tex = "powerup_default_" + id;
		super(tex, x, y, 0, 0.1);

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

	 /*****************
	 * Paddle Weapons *
	 ******************/

	 //laser
	 59: function(){
	 	let paddle = game.get("paddles")[0];
	 	let cmp = paddle.component;
	 	if (cmp?.name == "laser" || cmp?.name == "laserplus")
	 		cmp.maxBullets += 2;
	 	else{
		 	let weapon = new PaddleWeapon(paddle, "laser", 4);
		 	weapon.onClick = function(){
		 		if (mouse.m1 != 1 || this.bulletCount > this.maxBullets)
		 			return;
		 		let paddle = this.paddle;
		 		let off = paddle.paddleWidth/2 - 17;
		 		for (let dx of [-off, off]){
		 			let proj = new Projectile("laser_0", 0, 0, 0, -1);
		 			proj.isLaser = true;
		 			this.fireProjectile(proj, dx); 
		 		}
		 	}
		 	paddle.component = weapon;
		 	paddle.setTexture("paddle_27_1");
		}
	 },

	 //Laser Plus
	 60: function(){
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
		 		let paddle = this.paddle;
		 		let off = paddle.paddleWidth/2 - 17;
		 		for (let dx of [-off, off]){
		 			let proj = new Projectile("laser_1", 0, 0, 0, -1);
		 			proj.damage = 100;
		 			proj.isLaser = true;
		 			this.fireProjectile(proj, dx); 
		 		}
		 	}
		 	paddle.component = weapon;
		 	paddle.setTexture("paddle_27_2");
		}
	 },
}