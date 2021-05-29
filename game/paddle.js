class Paddle extends Sprite{
	static baseLine = DIM.height - 16*2;

	constructor(){
		//paddle is made out of 3 sections
		super(null);
		this.left = Sprite.fromArgs({
			texture: "paddle_0_0_left",
			x: -5, y: 0, sx: 1, sy: 1,
		});
		this.mid = Sprite.fromArgs({
			texture: "paddle_0_0_mid",
			x: 0, y: 0, sx: 1, sy: 1,
		});
		this.right = Sprite.fromArgs({
			texture: "paddle_0_0_left",
			x: 5, y: 0, sx: -1, sy: 1,
		});
		let paddleRects = new PIXI.Container();
		paddleRects.addChild(this.left, this.mid, this.right);
		this.paddleRects = paddleRects;
		this.addChild(paddleRects);

		//paddle width info
		this.widthInfo = {
			base: 80,
			increment: 16, 
			minIndex: -3,
			maxIndex: 4
		};
		this.resize(this.widthInfo.base);
		this.widthIndex = 0;
		
		this.x = DIM.w/2;
		this.y = Paddle.baseLine;

		this.speedLimit = {x: Infinity, y: 0};
		//stun will temporarily reduce speed limit
		this.stun = null;

		this.stuckBalls = [];

		this.components = {};

		//shader test
		// let glow = media.shaders.glow;
		// glow.uniforms.color = [1, 1, 1];
		// glow.uniforms.mag = 0.5;
		// this.filters = [glow];

		this.gameType = "paddle";
	}

	destructor(){
		super.destructor();
		for (let [key, comp] of Object.entries(this.components))
			comp.destructor?.(this);
	}

	//set the texture for the 3 sections
	//input is a base string
	setTexture(texstr){
		let left = media.textures[texstr + "_left"];
		let mid = media.textures[texstr + "_mid"];
		this.left.texture = left;
		this.right.texture = left;
		this.mid.texture  = mid;
	}

	//paddle needs to call setGlow on each section
	// setGlow(val){
	// 	for (let sprite of this.paddleRects.children)
	// 		sprite.setGlow(val);
	// }

	// updateGlow(){
	// 	for (let sprite of this.paddleRects.children)
	// 		sprite.updateGlow();
	// }

	setComponent(name, component){
		let components = this.components;
		this.components[name]?.destructor?.();

		this.components[name] = component;
	}

	removeComponent(name){
		let components = this.components;
		let comp = components[name];
		if (!comp)
			return;
		comp.destructor?.();
		delete components[name];
	}

	clearComponents(){
		for (let comp of Object.values(this.components))
			comp.destructor?.();
		this.components = {};
	}

	//resize both the shape as well as the sprite sections
	//min width is 40;
	resize(width){
		width = Math.max(40, width);
		//remember that these sprites are 1x scale not 2x
		//length of each outer section is 10 pixels
		let mw = width/2 - 20;
		this.mid.scale.x = mw;
		this.left.x = -mw/2 - 5;
		this.right.x = mw/2 + 5;

		//replace shape
		let r = this.getBounds();
		this.createShape();

		//width is already defined in PIXI.Sprite
		this.paddleWidth = width;
	}

	//resize paddle using fixed increments
	resize2(index){
		let info = this.widthInfo;
		index = Math.max(info.minIndex, Math.min(info.maxIndex, index));
		let width = info.base + info.increment * index;
		this.resize(width);
		this.widthIndex = index;
		return index;
	}

	incrementSize(deltaIndex){
		return this.resize2(this.widthIndex + deltaIndex);
	}

	normal(){
		this.resize(80);
		this.clearPowerups();
	}

	//does not revert size
	clearPowerups(){
		this.setTexture("paddle_0_0");
		this.clearComponents();
	}

	attachBall(ball, random){
		let offset;
		let w = this.paddleWidth;
		if (random)
			offset = Math.floor(Math.random() * w/2 + 1) - w/4;
		else
			offset = Math.max(-w/2, Math.min(w/2, ball.x - this.x));
		this.stuckBalls.push([ball, offset]);
		ball.moveTo(this.x + offset, this.y - 8 - ball.shape.radius);
		ball.stuckToPaddle = true;
		this.reboundBall(ball);
	}

	releaseBalls(){
		if (this.stuckBalls.length == 0)
			return false;
		//Only GLue does this
		if (this.components.catch?.name == "glue")
			return false;

		for (let [ball, offset] of this.stuckBalls){
			ball.stuckToPaddle = false;
			ball.justReleased = true;
		}

		this.stuckBalls = [];
		playSound("paddle_hit");
		return true;
	}

	checkSpriteHit(obj){
		if (obj.gameType == "ball" && obj.vy < 0)
			return [false];
		return super.checkSpriteHit(obj);
	}

	onSpriteHit(obj, norm, mag){
		switch (obj.gameType){
			case "powerup":
				obj.activate();
				break;
			case "ball":
				this.onBallHit(obj);
				break;
			case "menacer":
				this.onMenacerHit(obj);
				break;
			case "projectile":
				this.onProjectileHit(obj);
				break
		}
	}

	onBallHit(ball){
		this.reboundBall(ball);
		ball.onPaddleHit(this);
		playSound("paddle_hit");

		for (let [key, comp] of Object.entries(this.components))
			comp.onBallHit?.(ball);
	}

	onMenacerHit(menacer){
		this.reboundBall(menacer);
		playSound("paddle_hit");
		menacer.onPaddleHit(this);
	}

	onProjectileHit(proj){
		proj.onPaddleHit(this);
	}

	//redirect the ball based on where exactly
	//it hit the paddle
	reboundBall(ball){
		let dx = ball.x - this.x;
		let mag = dx / (this.paddleWidth/2);
		mag = Math.max(-1, Math.min(1, mag));
		let rad = 60 * mag * Math.PI / 180; //radians
		let spd = ball.getSpeed();
		let [vx, vy] = Vector.rotate(0, -spd, rad);
		ball.vx = vx;
		ball.vy = vy;
	}

	//fire the subweapon first if it exists
	//then fire the weapon if it exists
	componentClick(){
		let {weapon, subweapon} = this.components;

		if (subweapon)
			subweapon.onClick(mouse.m1);
		else if (weapon)
			weapon.onClick(mouse.m1);
	}

	update(delta){
		let mx = mouse.x;
		let my = mouse.y;

		if (this.stun){
			this.stun.timer -= delta;
			if (this.stun.timer <= 0)
				this.stun = null;
		}

		//autopilot component gets special treatment
		if (this.components.autopilot){
			mx = this.autopilot();
		}

		//apply speed limit
		//TODO: add vertical movement
		let {x: spd_x, y: spd_y} = this.speedLimit;
		if (this.stun){
			spd_x = this.stun.x ?? spd_x;
			spd_y = this.stun.y ?? spd_y;
		}
		let dx = mx - this.x;
		let sign_x = (dx >= 0) ? 1 : -1;
		dx = Math.min(Math.abs(dx), spd_x * delta) * sign_x;
		
		//clamp paddle position
		let px = this.x + dx;
		let pw = this.paddleWidth;
		px = Math.max(DIM.lwallx + pw/2, px);
		px = Math.min(DIM.rwallx - pw/2, px);
		this.x = px;
		this.updateShape();

		//update stuck balls
		for (let [ball, offset] of this.stuckBalls){
			let x = this.x + offset;
			let y = this.y - 8 - ball.shape.radius;
			ball.moveTo(x, y);
		}

		let mouseInBoard = (
			mx > DIM.lwallx &&
			mx < DIM.rwallx &&
			my > DIM.ceiling &&
			my < DIM.h
		);
		if (mouse.m1 && mouseInBoard){
			//don't activate component click
			//if there are balls to be released
			if (!this.releaseBalls())
				this.componentClick();
		}

		for (let comp of Object.values(this.components))
			comp.update?.(delta);

		//calling super.update() is unecessary
	}

	//Returns the x position of where the paddle needs to be
	//in order to hit the ball towards the closest brick.
	//Will also cause the paddle to move towards powerups
	//if there is time to spare.
	autopilot(ignore_powerups, smart_keyboard){
		//find the ball that will reach the paddle's height
		//in the least amount of time (based on speed and distance)
		let base = this.y;
		let ball = null;
		let stody = Infinity; //stored dy
		for (let b of game.get("balls")){
			let dy = base - 8 - b.shape.radius - b.y;
			//exclude balls that are not moving downward
			//or are moving too horizontally
			if (b.vy < 0.01)
				continue;
			if (ball == null || (dy / b.vy < stody / ball.vy)){
				ball = b;
				stody = dy;
			}
		}

		if (ball == null)
			return this.x;

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
			let dy = br.y - (this.y - 8 - r);
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

		let off = mag * this.paddleWidth/2;
		return x - off;
	}
}
