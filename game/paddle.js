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
		this.addChild(this.left, this.mid, this.right);

		this.resize(80);
		this.x = DIM.w/2;
		this.y = Paddle.baseLine;

		this.speedLimit = {x: Infinity, y: 0};
		//stun will temporarily reduce speed limit
		this.stun = null;

		this.stuckBalls = [];

		this.component = null;

		this.gameType = "paddle";
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

	attachBall(ball, random){
		let offset;
		let w = this.paddleWidth;
		if (random)
			offset = Math.floor(Math.random() * w/2 + 1) - w/4;
		else
			offset = Math.max(-w/2, Math.min(w/2, ball.x - this.x));
		this.stuckBalls.push([ball, offset]);
		ball.moveTo(this.x + offset, this.y - 8 - ball.radius);
		ball.stuckToPaddle = true;
		this.reboundBall(ball);
	}

	releaseBalls(){
		if (!this.stuckBalls)
			return;

		for (let [ball, offset] of this.stuckBalls)
			ball.stuckToPaddle = false;

		this.stuckBalls = [];
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
			case "menacer":
				this.onBallHit(obj);
				break;
			case "projectile":
				this.onProjectileHit(obj);
				break
		}
	}

	onBallHit(ball){
		this.reboundBall(ball);
		playSound("paddle_hit");
		ball.onPaddleHit(this);
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

	update(delta){
		let mx = mouse.x;
		let my = mouse.y;

		if (this.stun){
			this.stun.timer -= delta;
			if (this.stun.timer <= 0)
				this.stun = null;
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
			let y = this.y - 8 - ball.radius;
			ball.moveTo(x, y);
		}

		let mouseInBoard = (
			mx > DIM.lwallx &&
			mx < DIM.rwallx &&
			my > DIM.ceiling &&
			my < DIM.h
		);
		if (mouse.m1 && mouseInBoard){
			this.releaseBalls();
			this?.component?.onClick();
		}

		this?.component?.update?.(delta);

		//calling super.update() is unecessary
	}
}

class PaddleWeapon{
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