class Paddle extends Sprite{
	static baseLine = DIM.height - 16*2;
	static defaultSpeedLimit = {x: 4, y: 4};

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

		this.stuckBalls = [];

		//paddle width info
		this.widthInfo = {
			base: 80,
			increment: 16, 
			minIndex: -3,
			maxIndex: 4
		};
		this._setWidth(this.widthInfo.base);
		this.widthIndex = 0;
		
		this.x = DIM.w/2;
		this.y = Paddle.baseLine;

		this.speedLimit = Object.assign({}, Paddle.defaultSpeedLimit);

		this.paddleHitSound = "paddle_hit";

		//stun will temporarily reduce speed limit
		this.stun = null;

		this.components = {};

		//used to prevent automatic weapons from immedately firing
		//the frame after the player clicks and release the balls
		//from the paddle
		this.timeSinceRelease = 0;

		this.isRespawning = false;

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

	//Ignore any other sprites that may be added to the paddle
	createShape(){
		let rects = this.paddleRects;
		let {x, y, width: w, height: h} = rects.getBounds();
		this.setShape(new PolygonShape([
			x  , y  ,
			x+w, y  ,
			x+w, y+h,
			x  , y+h
		]));

	}

	setComponent(key, component){
		this.components[key]?.destructor?.();
		this.components[key] = component;
	}

	removeComponent(key){
		let components = this.components;
		let comp = components[key];
		if (!comp)
			return;
		comp.destructor?.();
		game.top.killMonitor("paddles", key);
		delete components[key];
	}

	clearComponents(){
		for (let [key, comp] of Object.entries(this.components)){
			comp.destructor?.();
			game.top.killMonitor("paddles", key);
		}
		this.components = {};
	}

	//Resize both the shape and sprites to a certain width (in pixels)
	//Does not update widthIndex
	_setWidth(width){
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
		let prevWidth = this.paddleWidth;
		this.paddleWidth = width;

		//reposition balls
		for (let pair of this.stuckBalls)
			pair[1] *= width / prevWidth;
	}

	//resize paddle using fixed increments
	//also updates the widthIndex
	resize(index){
		let info = this.widthInfo;
		index = Math.max(info.minIndex, Math.min(info.maxIndex, index));
		let width = info.base + info.increment * index;
		this._setWidth(width);
		this.widthIndex = index;
		return index;
	}

	incrementSize(deltaIndex){
		return this.resize(this.widthIndex + deltaIndex);
	}

	setSpeedLimit(vx=null, vy=null){
		let defaultLimit = Paddle.defaultSpeedLimit;
		this.speedLimit.x = vx ?? defaultLimit.x;
		this.speedLimit.y = vy ?? defaultLimit.y;
	}

	normal(){
		this.resize(0);
		this.clearPowerups();
	}

	//does not revert size
	clearPowerups(){
		this.clearComponents();
		this.setTexture("paddle_0_0");
		this.setSpeedLimit();
		this.alpha = 1;
		this.intangible = false;
	}

	attachBall(ball, isRandom){
		let offset;
		let w = this.paddleWidth;
		if (isRandom)
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
		playSound(this.paddleHitSound);
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
		playSound(this.paddleHitSound);

		for (let [key, comp] of Object.entries(this.components))
			comp.onBallHit?.(ball);
	}

	onMenacerHit(menacer){
		this.reboundBall(menacer);
		playSound(this.paddleHitSound);
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
		//null means paddle's coordinate will not change
		let mx = mouse.x;
		let my = Paddle.baseLine;

		if (this.isRespawning)
			my = null;

		if (this.components.movement){
			[mx, my] = this.components.movement.updateMovement();
		}

		if (this.stun){
			this.stun.timer -= delta;
			if (this.stun.timer <= 0)
				this.stun = null;
		}

		//apply speed limit
		let {x: spd_x, y: spd_y} = this.speedLimit;
		if (this.stun){
			spd_x = this.stun.x ?? spd_x;
			spd_y = this.stun.y ?? spd_y;
		}

		const pw = this.paddleWidth;
		const ph = 16;

		if (mx !== null){
			let dx = mx - this.x;
			if (isFinite(spd_x)){
				let sign_x = (dx >= 0) ? 1 : -1;
				dx = Math.min(Math.abs(dx), spd_x * delta) * sign_x;
			}
			//clamp paddle position 
			let px = this.x + dx;
			px = clamp(px, DIM.lwallx + pw/2, DIM.rwallx - pw/2);
			this.x = px;
		}
		if (my !== null){
			let dy = my - this.y;
			if (isFinite(spd_y)){
				let sign_y = (dy >= 0) ? 1 : -1;
				dy = Math.min(Math.abs(dy), spd_y * delta) * sign_y;
			}
			//clamp paddle position
			let py = this.y + dy;
			py = clamp(py, DIM.ceiling + ph/2, DIM.h - ph/2);
			this.y = py;
		}
		this.updateShape();

		//update stuck balls
		for (let [ball, offset] of this.stuckBalls){
			let x = this.x + offset;
			let y = this.y - ph/2 - ball.r;
			ball.moveTo(x, y);
		}
		
		if (!this.isRespawning && mouse.m1 && mouse.inBoard()){
			//don't activate component click
			//if there are balls to be released
			let hasReleased = this.releaseBalls();

			if (hasReleased)
				this.timeSinceRelease = 0;
			else
				this.componentClick();
		}
		this.timeSinceRelease += delta;

		for (let comp of Object.values(this.components))
			comp.update?.(delta);

		//calling super.update() is unecessary
	}
}
