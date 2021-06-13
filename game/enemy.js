var ENEMY_LOG_ENABLED = false;

function enemy_log(message){
	if (ENEMY_LOG_ENABLED)
		console.log(message);
}

class Enemy extends Sprite{
	constructor(texture, x, y, vx, vy){
		super(texture, x, y, vx, vy);
		this.createShape();
		this.setState("emerging", 0.05);

		this.gameType = "enemy";
		this.enemyType = "enemy";
	}

	onDeath(){
		super.onDeath();
		playSound("enemy_death");
		let effect = new Particle(null, this.x, this.y);
		effect.addAnim("death", "enemy_death", 0.33, false, true);
		effect.dieOnAniFinish = true;
		effect.alpha = 0.5;
		game.emplace("particles", effect);
	}

	setState(name, ...args){
		let state = Enemy.states[name];
		this.state = {
			name: name,
			init: state.init.bind(this),
			update: state.update.bind(this)
		};
		this.state.init(...args);
		enemy_log("Advance State: " + name + " " + args);
	}

	advanceState(args={}){
		this.state = null;
	}

	onSpriteHit(obj, norm, mag){
		this.kill();
		obj.onSpriteHit(this, norm, mag);
	}

	update(delta){
		if (this.y - this.shapeHeight/2 > DIM.h)
			this.kill();

		if (this.state){
			this.state.update(delta);
		}
		super.update(delta);
	}

	//Protected Translate
	//will move the enemy and check for brick collision
	//if there is a collision, the enemy will move back to its
	//old position
	pTranslate(dx, dy, checkOnly=false, wallCheck=false){
		this.translate(dx, dy);
		let [x0, y0, x1, y1] = this.getAABB();
		let resp = this.scanBrickHit();

		let wall = (
			x0 <= DIM.lwallx ||
			x1 >= DIM.rwallx ||
			y0 <= DIM.ceiling
		);
		if (resp[0] || (wallCheck && wall)){
			this.translate(-dx, -dy);
			return false;
		}
		if (checkOnly)
			this.translate(-dx, -dy);
		return true;
	}

	//check if enemy collides with nearby bricks
	//returns [brick, norm, mag] if there is a collision
	//returns [null] if there is no collision
	//filter causes this method to ignore bricks before/after
	//	a certain row/column
	//filter must be in format {cmp= ("lt" or "gt"), (i or j)=x}
	scanBrickHit(filter=null){
		let filterFunc = null;
		if (filter){
			let {cmp, i, j} = filter;
			if (cmp == "lt"){
				if (i !== undefined)
					filterFunc = br => br.gridDat.i < i;
				else
					filterFunc = br => br.gridDat.j < j;
			}
			else{
				if (i !== undefined)
					filterFunc = br => br.gridDat.i > i;
				else
					filterFunc = br => br.gridDat.j > j;
			}
		}
		let grid = game.top.brickGrid;
		for (let br of grid.getBucket(this)){
			if (filter && !filterFunc(br)){
				enemy_log("filtered " + br.gridDat.i + " " + br.gridDat.j);
				continue;
			}
			//Remember to disable overlap check
			let [check, norm, mag] = br.checkSpriteHit(this, false);
			if (check)
				return [br, norm, mag];
		}
		return [null];
	}
}

//red green blue bronze silver pewter
class Dropper extends Enemy{
	//position will be set by the Gates
	constructor(id){
		let i = Math.floor(id/3);
		let j = id % 3;
		super(`dropper_${i}_${j}`);
		this.menacerId = id;

		let yoff = 7;
		if (id == 0 || id == 4)
			yoff = 6;
		let deg = randRange(-60, 60);
		let rad = deg * Math.PI / 180;
		let [vx, vy] = Vector.rotate(0, 0.4, rad);
		let menacer = new Menacer(
			this.x, this.y + yoff, vx, vy, id
		);
		menacer.scale.set(1);
		this.addChild(menacer);
		this.menacer = menacer;
		this.hasDropped = false;

		this.enemyType = "dropper";
	}

	onDeath(){
		super.onDeath();
		if (this.menacerId == 0 && !this.hasDropped)
			this.dropMenacer();
	}

	advanceState(args={}){
		this.state = null;
		let deg = 90 - randRange(10, 30);
		deg *= (Math.random() > 0.5) ? 1 : -1;
		let rad = deg * Math.PI / 180;
		let [vx, vy] = Vector.rotate(0, 0.1, rad);
		this.vx = vx;
		this.vy = vy;
	}

	canDrop(){
		if (this.hasDropped || this.state)
			return false;

		let paddle = game.get("paddles")[0];
		let w = paddle.paddleWidth/2;
		let px0 = paddle.x - w;
		let px1 = paddle.x + w;

		return (this.x > px0 && this.x < px1);

	}

	dropMenacer(){
		//keep a reference to this.menacer
		//for collision checks
		let m = this.menacer;
		this.removeChild(m);
		m.scale.set(2);
		//need to multiply offset by 2
		m.moveTo(this.x, 2*m.y + this.y);
		game.emplace("menacers", m);
		this.hasDropped = true;
	}

	update(delta){
		let [x0, y0, x1, y1] = this.shape.getAABB();
		if (x0 < DIM.lwallx)
			this.vx = Math.abs(this.vx);
		else if (x1 > DIM.rwallx)
			this.vx = -Math.abs(this.vx);

		if (this.canDrop())
			this.dropMenacer();

		super.update(delta);
	}
}

//red green blue bronze silver pewter
class Menacer extends Ball{
	constructor(x, y, vx, vy, id){
		super(x, y, vx, vy);
		this.setTexture(`ball_main_0_${3+id}`);
		this.menacerId = id;

		this.gameType = "menacer";
	}

	canHit(obj){
		if (obj.enemyType == "dropper"){
			if (obj.menacer == this)
				return false;
		}
		return true;
	}

	onSpriteHit(obj, norm, mag){
		super.onSpriteHit(obj, norm, mag);
		if (obj.gameType == "brick")
			this.onBrickHit(obj);
		else if (obj.gameType == "enemy")
			this.onEnemyHit(obj);
	}

	//Used exclusively for menacer brick coating
	onBrickHit(brick){
		let id = this.menacerId;
		let type = brick.brickType;
		let level = brick.level;
		let valid = ["normal", "metal", "greenmenacer"];
		if (!valid.includes(type))
			return;

		//determine if brick should be excluded from coating
		if (id == 0){
			//Red menacers should destroy the green brick
			if (type == "greenmenacer")
				brick.kill();
			return;
		}
		if (id == 1 && type == "greenmenacer"){
			//Green menacers should refresh the green brick
			brick.health = 80;
			brick.updateAppearance();
			return;
		}
		if (id == 2)
			return;
		if (id == 3 && type == "metal" && level == 1)
			return;
		if (id == 4 && type == "metal" && level == 2)
			return;
		if (id == 5)
			return;

		let newBrick;
		let [x, y] = [brick.x, brick.y];
		if (id == 1)
			newBrick = new GreenMenacerBrick(x, y);
		else if (id == 3)
			newBrick = new MetalBrick(x, y, 1);
		else if (id == 4)
			newBrick = new MetalBrick(x, y, 2);
		MetalBrick.setCoating(newBrick, brick);
		brick.kill();
		game.emplace("bricks", newBrick);
	}

	onEnemyHit(enemy){
		//Red menacers should stay alive
		if (this.menacerId != 0)
			this.kill();
	}

	onPaddleHit(paddle){
		if (this.menacerId == 2){
			paddle.setTexture("paddle_2_0");
			paddle.alpha = 0.5;
		}
	}
}

class Dizzy extends Enemy{
	constructor(){
		super("enemy_main_0_0");
		this.setShape(new RectangleShape(20, 30));
		this.addAnim("spin", "enemy_dizzy", 0.125, true, true);
		this.phase = "tracing";
		this.enemyType = "dizzy";
	}

	setRandomDir(){
		if (!this.storedDir){
			this.storedDir = (Math.random() < 0.5) ? "left" : "right";
			return this.storedDir;
		}
		let prob = (this.storedDir == "left") ? 0.75 : 0.25;
		this.storedDir = (Math.random() < prob) ? "left" : "right";
		return this.storedDir;
	}

	advanceState(args={}){
		if (this.phase == "tracing")
			this.tracingPhase(args);
		else if (this.phase == "floating")
			this.floatingPhase(args);
	}

	//move along the edges of the bricks
	tracingPhase(args){
		const spd = 0.05;
		const timeout = 3000;
		if (args.skip){
			//transition phase
			this.phase = "floating";
			this.floatingPhase(args);
			return;
		}
		let dir = this.storedDir;
		switch(this.state.name){
			case "emerging":
				this.setState("tracingdown", spd, timeout);
				return;
			case "tracingdown":
				if (args.status == "collide"){
					let filter = null;
					if (args.br){
						let br = args.br;
						let [i, j] = getGridPos(br.x, br.y);
						filter = {cmp:"lt", i};
					}
					//randomly choose "left" or "right" with a higher
					//chance of choosing the previous direction
					dir = this.setRandomDir();
					this.setState("tracingside", spd, dir, filter);
					return; 
				}
			case "tracingside":
				if(args.status == "collide"){
					let filter = null;
					if (args.br){
						let br = args.br;
						let [i, j] = getGridPos(br.x, br.y);
						filter = {cmp:"gt", j};
					}
					this.setState("tracingup", spd, dir, filter);
					return;
				}
				if (args.status == "opening"){
					this.setState("tracingdown", spd, timeout);
					return;
				}
			case "tracingup":
				if (args.status == "collide"){
					this.storedDir = (this.storedDir == "left")
						? "right" : "left";
					this.setState("tracingdown", spd, timeout);
					return;
				}
				if (args.status == "opening"){
					this.setState("tracingside", spd, dir);
					return;
				}
		}
		this.state = null;
	}

	//alternate between moving horizontally and making
	//180 degree circle turns
	floatingPhase(args){
		const spd = 0.05;
		const PI = Math.PI;

		let name = this.state.name;
		let x = this.x;
		let y = this.y;
		let {lwallx, rwallx} = DIM;
		let mid = DIM.width/2;
		//special circle turn from tracingdown
		if (name == "tracingdown" || name == "emerging"){
			let sign;
			if (x < mid){
				sign = 1;
				this.storedDir = "right";
				this.cw = true;
			}
			else{
				sign = -1;
				this.storedDir = "left";
				this.cw = false;
			}
			let r = randRange(16, 64);
			let dx = r * sign;
			this.bigCircle = false;
			this.setState("circleturn", x+dx, y, sign*spd, PI/2);
		}
		//horizontal travel
		//direction can be determined based on whether the enemy
		//is to the right or left of center
		else if (name == "circleturn"){
			this.state = null;
			let cx;
			if (this.storedDir == "left")
				cx = randRange(lwallx+64, x-8);
			else
				cx = randRange(x+8, rwallx - 64);
			this.setState("targetmove", cx, y, spd);
		}
		//180 degree circle turn
		//the circleturn that goes down should be bigger
		else if (name == "targetmove"){
			let sign;
			if (this.storedDir == "left"){
				this.storedDir = "right";
				sign = 1;
			}
			else{
				this.storedDir = "left";
				sign = -1;
			}
			let cw = this.cw ? 1 : -1;
			let r = randRange(16, 32);
			if (this.bigCircle)
				r = randRange(32, 64);
			let dy = r * sign * cw;
			this.setState("circleturn", x, y+dy, cw*spd, PI);
			this.bigCircle = !this.bigCircle;
			// this.circleFlag = !this.circleFlag;
		}

	}
}

//exact same behavior as dizzy
class Cubic extends Dizzy{
	constructor(){
		super();
		this.setTexture("enemy_main_1_0");
		this.setShape(new RectangleShape(30, 30));
		this.setTexture(null); //hide texture for animation
		this.removeAnim("spin");
		this.addAnim("spin", "enemy_cubic", 0.125, true, true);
		this.enemyType = "cubic";
	}
}

//splits into gumball projectiles
//same behavior as Dizzy for tracing phase,
//but will move in a sine wave in the floating phase

class GumballTrio extends Dizzy{
	constructor(){
		super();
		this.scale.set(1);
		this.removeAnim("spin");
		this.setTexture(null);
		let r = 14;
		this.setShape(new CircleShape(0, 0, r));
		this.altShape = new PolygonShape([
			0,0, r*2,0, r*2,r*2, 0,r*2
		]);

		this.balls = new PIXI.Container();
		for (let i = 0; i < 3; i++){
			let ball = new BallProjectile(`enemy_gumball_${i}_0`);
			ball.setBounce(true);
			ball.colFlag.paddle = true;
			ball.onPaddleHit = function(){
				this.kill();
			};
			ball.onDeath = function(){
				Projectile.prototype.onDeath.call(this);
				playSound("enemy_death");
				let effect = new Particle(null, this.x, this.y);
				effect.addAnim(
					"death", "enemy_death_small", 0.33, false, true);
				effect.dieOnAniFinish = true;
				effect.alpha = 0.5;
				game.emplace("particles", effect);
			};
			ball.addAnim("blink", "gumball_blink_"+i, 1/32, true, true);
			ball.addAnim("panic", "gumball_panic_"+i, 1/8, true);
			this.balls.addChild(ball);
		}
		this.addChild(this.balls);
		this.ballAngle = 0;
		this.updateBalls(0);

		this.enemyType = "gumballtrio";
	}

	onDeath(){
		super.onDeath();
		for (let ball of this.balls.children){
			ball.setPos(this.x + ball.x, this.y + ball.y);
			ball.playAnim("panic");
			game.emplace("projectiles", ball);
		}
	}

	updateBalls(delta){
		const r = 9;
		const v = 0.5;
		this.ballAngle += 0.002 * delta;
		for (let [i, ball] of this.balls.children.entries()){
			let rad = this.ballAngle + i*Math.PI*2/3;
			let [nx, ny] = Vector.rotate(0, -1, rad);
			ball.setPos(nx*r, ny*r);
			ball.setVel(nx*v, ny*v);
		}
	}

	update(delta){
		this.updateBalls(delta);
		super.update(delta);
	}

	floatingPhase(args){
		const spd = 0.05;
		const PI = Math.PI;

		let name = this.state.name;
		let x = this.x;
		let y = this.y;
		let {lwallx, rwallx} = DIM;
		let mid = DIM.width/2;
		//special circle turn from tracingdown
		if (name == "tracingdown" || name == "emerging"){
			let sign;
			if (x < mid){
				sign = 1;
				this.storedDir = "right";
				this.cw = true;
			}
			else{
				sign = -1;
				this.storedDir = "left";
				this.cw = false;
			}
			let r = randRange(16, 64);
			let dx = r * sign;
			this.bigCircle = false;
			this.setState("circleturn", x+dx, y, sign*spd, PI/2);
		}
		else if (name == "circleturn"){
			this.setState("sinemove", this.storedDir);
		}
	}

	//temporarily change gumballtrio's shape into a square
	//in order to make it trace along bricks properly
	scanBrickHit(filter){
		let circleShape = this.shape;
		this.setShape(this.altShape);
		let result = super.scanBrickHit(filter);
		this.setShape(circleShape);
		return result;
	}
}

class WalkBlock extends Enemy{
	static moveInfo = [
		[0, -1, 0],
		[1, -1, 1],
		[2,  0, 1],
		[3,  1, 1],
		[4,  1, 0]
	];

	static transition = [
		[1, 2], 	  //0
		[0, 2, 3],	  //1
		[0, 1, 3, 4], //2
		[1, 2, 4],	  //3
		[2, 3],	   	  //4
	];

	constructor(){
		super(null);
		this.setShape(new PolygonShape([0,0,30,0,30,30,0,30]));
		this.addAnim("walk_0", "walkblock_2", 1/16, true);
		this.addAnim("walk_1", "walkblock_1", 1/16, true);
		this.addAnim("walk_2", "walkblock_0", 1/16, true, true);
		this.currentWalk = WalkBlock.moveInfo[2];
		this.walkTimer = 3000;
		this.jumpTimer = 5000;
		this.jump = null;
		this.enemyType = "walkblock";
	}

	advanceState(){
		this.state = null;
		this.vx = 0;
		this.vy = 0;
	}

	update(delta){
		if (!this.state){
			if (this.jump)
				this.updateJump(delta)
			else
				this.updateWalk(delta);
		}
		super.update(delta);
	}

	//randomly change direction and change animation
	changeDir(){
		let i_old = this.currentWalk[0];
		let arr = WalkBlock.transition[i_old];
		let i = arr[randRange(arr.length)];

		this.currentWalk = WalkBlock.moveInfo[i];
		if (i == 3){
			this.playAnim("walk_1");
			this.scale.x = -2;
		}
		else if (i == 4){
			this.playAnim("walk_0");
			this.scale.x = -2;
		}
		else{
			this.playAnim(`walk_${i}`);
			this.scale.x = 2;
		}
	}

	//resets jump timer if walkblock successfully moves downwards
	pTranslate2(dx, dy){
		let check = this.pTranslate(dx, dy, false, true);
		if (check && dy > 0)
			this.jumpTimer = 5000;
		return check;
	}

	updateWalk(delta){
		//all movement will be done via pTranslate
		const spd = 0.05;
		const SQRT1_2 = Math.SQRT1_2;

		let [i, vx, vy] = this.currentWalk;
		let dx = vx * spd * delta;
		let dy = vy * spd * delta;
		if (i == 1 || i == 3){
			dx *= SQRT1_2;
			dy *= SQRT1_2;
			if (!this.pTranslate2(dx, dy)){
				if (!this.pTranslate2(0, dy))
					this.pTranslate2(dx, 0);
			}
		}
		else
			this.pTranslate2(dx, dy);

		this.walkTimer -= delta;
		if (this.walkTimer <= 0){
			this.walkTimer = 3000;
			this.changeDir();
		}

		this.jumpTimer -= delta;
		if (this.jumpTimer <= 0){
			this.jumpTimer = 5000;
			this.walkTimer = 3000;
			this.initJump();
		}
	}

	findJumpTarget(){
		//TODO: Expand cols to increase search range?
		const cols = [0, -1, 1];
		let grid = game.top.brickGrid;
		let [i0, j0] = getGridPos(this);
		for (let i = i0+1; i < 32; i++){
			for (let dj of cols){
				let j = j0+dj;
				if (!boundCheck(i, j) || !grid.isEmpty(i, j))
					continue;
				if (!boundCheck(i+1, j) || !grid.isEmpty(i+1, j))
					continue;
				return [i, j];
			}
		}
		return [34, j0];
	}

	initJump(){
		//search for an open 32x32 area
		let [i, j] = this.findJumpTarget();
		let [x, y] = getGridPosInv(i, j);
		y += 8;

		const time = 5000;
		const vy = -0.2;
		const ay = 0.001;
		let dx = x - this.x;
		let dy = y - this.y;
		//solve displacement formula for time
		//quadratic formula ftw
		let t = (-vy + Math.sqrt(vy*vy+2*ay*dy))/ay;

		this.jump = {x, y, t};
		this.vx = dx / t;
		this.vy = vy;
		this.ay = ay;
	}

	updateJump(delta){
		let jump = this.jump;
		jump.t -= delta;
		if (jump.t <= 0){
			let {x, y} = jump;
			this.setPos(x, y);
			this.setVel(0, 0);
			this.ay = 0;

			this.jump = null;
		}
	}
}


//NOTE: Enemy instance will be bound to this due to 
//		function binding in Eneny.setState()
Enemy.states = {
	//emerging from the gate
	emerging: {
		init(spd=0.05){
			this.vx = 0;
			this.vy = spd;
		},
		update(delta){
			if (this.y - this.shapeHeight/2 > DIM.ceiling){
				if (this.scanBrickHit()[0])
					this.advanceState({skip: true});
				else
					this.advanceState();
			}
		}
	},
	//move to targeted position
	targetmove: {
		init(x, y, spd){
			let dx = x - this.x;
			let dy = y - this.y;
			let dist = Vector.dist(dx, dy);
			this.moveTimer = dist / spd;

			[dx, dy] = Vector.normalize(dx, dy);
			this.vx = dx * spd;
			this.vy = dy * spd;
		},
		update(delta){
			this.moveTimer -= delta;
			if (this.moveTimer <= 0)
				this.advanceState();
		}
	},
	//move down until collision with brick
	//if there are no bricks below the enemy,
	//	then stop after timer reaches 0
	tracingdown: {
		init(spd, time=null, filter=null){
			this.traceTimer = time;
			this.vx = 0;
			this.vy = spd;
			this.scanFilter = filter;
		},
		update(delta){
			let grid = game.top.brickGrid;

			//advance state on collision with brick
			let [br, norm, mag] = this.scanBrickHit(this.scanFilter);
			if (br){
				//skip to "going through bricks" phase
				//if enemy still is overlapping bricks
				let arg = {status: "collide", br: br};
				norm = norm.scale(mag+0.5);
				if (!this.pTranslate(norm.x, norm.y))
					arg.skip = true;
				this.advanceState(arg);
				return;
			}

			//advance state if there are no bricks below
			//the enemy for a certain amount of time
			let [x0, y0, x1, y1] = this.getAABB();
			let [i0, j0] = getGridPos(x0, y0);
			let [i1, j1] = getGridPos(x0, y0);

			let clear = true;
			for (let j = j0; j <= j1; j++){
				for (let i = i0; i < 32; i++){
					if (!boundCheck(i, j))
						continue;
					for (let br of grid.grid[i][j]){
						if (!br.gridDat.move)
							clear = false;
					}
				}
			}

			if (clear && this.traceTimer){
				this.traceTimer -= delta;
				if (this.traceTimer <= 0){
					let arg = {status: "timeout", skip: true};
					this.advanceState(arg);
					return;
				}
			}
		}
	},
	//move horizontally until there is an open space below
	//or it hits a brick or wall
	tracingside: {
		init(spd, dir="left", filter=null){
			this.vx = (dir == "left") ? -spd : spd;
			this.vy = 0;
			this.scanFilter = filter;
		},
		update(delta){
			//check brick collision
			let [br, norm, mag] = this.scanBrickHit(this.scanFilter);
			if (br){
				enemy_log("collide side");
				//skip to "going through bricks" phase
				//if enemy still is overlapping bricks
				let arg = {status: "collide", br: br};
				norm = norm.scale(mag+0.5);
				if (!this.pTranslate(norm.x, norm.y))
					arg.skip = true;
				this.advanceState(arg);
				return;
			}

			//check wall collision
			let [x0, y0, x1, y1] = this.getAABB();
			if (x0 <= DIM.lwallx){
				this.advanceState({status: "collide"});
				return;
			}
			if (x1 >= DIM.rwallx){
				this.advanceState({status: "collide"});
				return;
			}
			// check for opening below
			if (this.pTranslate(0, 1)){
				this.advanceState({status: "opening"});
			}
		}
	},
	//climb up a column of bricks until it finds an opening
	//to the left or right
	tracingup: {
		//specify which direction to check for opening
		init(spd, dir="left", filter=null){
			this.vx = 0;
			this.vy = -spd;
			this.checkDir = dir;
			this.scanFilter = null;
		},
		update(delta){
			//check brick and ceiling collision
			//advance state on collision with brick
			let [br, norm, mag] = this.scanBrickHit(this.scanFilter);
			if (br){
				//skip to "going through bricks" phase
				//if enemy still is overlapping bricks
				let arg = {status: "collide", br: br};
				norm = norm.scale(mag+0.5);
				if (!this.pTranslate(norm.x, norm.y))
					arg.skip = true;
				this.advanceState(arg);
				return;
			}
			let [x0, y0, x1, y1] = this.getAABB();
			if (y0 <= DIM.ceiling){
				this.advanceState({status: "collide"});
			}

			//check for opening on either left or right
			let dx = (this.checkDir == "left") ? -1 : 1;
			if (this.pTranslate(dx, 0, false, true))
				this.advanceState({status: "opening"});
		}
	},
	//move in the path of an arc(circle) at a certain speed
	circleturn: {
		init(cx, cy, spd, rad){
			this.vx = 0;
			this.vy = 0;
			let dx = cx - this.x;
			let dy = cy - this.y;
			this.cx = cx;
			this.cy = cy;
			this.cr = Vector.dist(dx, dy);
			this.vtheta = -spd / this.cr;
			this.theta = Math.atan2(dy, dx);
			this.dtheta = rad;
		},

		update(delta){
			let dth = this.vtheta*delta;
			this.theta += dth;
			let [dx, dy] = Vector.rotate(-this.cr, 0, this.theta);
			this.setPos(this.cx + dx, this.cy + dy);
			this.dtheta -= Math.abs(dth);
			if (this.dtheta <= 0)
				this.advanceState();
		}
	},
	//move in a horizontal sine wave while bouncing between walls
	//also decend slowly (for GumballTrio only)
	sinemove: {
		init(dir){
			this.x0 = this.x;
			this.y0 = this.y;
			this.vx = 0.05 * ((dir == "left") ? -1 : 1);
			this.vy = 0.025;
			this.amp = 50;
			this.freq = 0.05;
		},

		update(delta){
			let {x0, y0, amp, freq} = this;
			let dx = this.x - x0;
			let dy = amp * (Math.cos(freq*dx)-1);
			this.y = y0 + dy;
			this.y0 += this.vy * delta;

			if (this.x - this.shapeWidth/2 < DIM.lwallx)
				this.vx = Math.abs(this.vx);
			else if (this.x + this.shapeWidth/2 > DIM.rwallx)
				this.vx = -Math.abs(this.vx);
		}
	}

}