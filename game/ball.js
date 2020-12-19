class Ball extends Sprite{
	//splits one ball into n balls
	//can also split all balls
	static split(n, all){
		let balls = game.top.balls.children;
		if (n < 2 || balls.length == 0)
			return;

		let input;
		if (all)
			input = balls;
		else{
			let highest = balls[0];
			for (let ball of balls){
				if (ball.y < highest.y)
					highest = ball;
			}
			input = [highest];
		}

		let dr = 2 * Math.PI / n;
		for (let ball of input){
			for (let i = 1; i < n; i++){
				let newBall = ball.clone();
				newBall.rotateVel(dr * i);
				game.emplace("balls", newBall);
			}
		}
	}

	constructor(x, y, vx, vy){
		super("ball_main_0_0", x, y, vx, vy);
		this.damage = 10;
		this.strength = 0;

		this.createShape(true);
		this.steer = null;

		//will override the ball's velocity for 1 frame
		this.velOverride = null;

		//can also be a custom function
		this.pierce = false;
		//lets the ball pierce only one time
		this.pierceOverride = false;

		this.stuckBounceTimer = 0;
		this.storedAngle = 0;

		this.disableBounce = false;

		//each component should be a shallow object
		this.components = {};

		this.gameType = "ball";
	}

	destructor(){
		super.destructor();
		for (let [key, comp] of Object.entries(this.components))
			comp.destructor?.();
	}

	clone(){
		let ball = new Ball(this.x, this.y, this.vx, this.vy);
		ball.setTexture(this.texture);
		ball.createShape(true);
		ball.damage = this.damage;
		ball.strength = this.strength;
		ball.pierce = this.pierce;

		//create a new instance of the component via its class constructor
		//TODO: Add onCopy() for certain components (Combo, Domino)
		for (let [key, comp] of Object.entries(this.components)){
			let args = comp.getArgs?.() ?? [];
			ball.components[key] = new comp.constructor(ball, ...args);
			comp.onCopy?.(ball);
		}

		return ball;
	}

	//check to see if ball should freely move and collide with
	//the other game objects
	isActive(){
		if (this.justReleased){
			this.justReleased = false;
			return false;
		}
		return !(
			this.stuckToPaddle ||
			this.parachuting ||
			this.teleporting
		)
	}

	//revert ball back to its old self
	normal(){
		this.setTexture("ball_main_0_0");
		this.tint = 0xFFFFFF;
		this.createShape(true);

		this.damage = 10;
		this.strength = 0;

		this.pierce = false;

		for (let [key, comp] of Object.entries(this.components))
			comp.destructor?.();
		this.components = {};
	}

	//due to the ball bouncing off of corners,
	//the ball might travel at a near-horizontal path,
	//bouncing between walls hundreds of times before reaching the paddle
	//This will force the ball to go at a 45 degree angle
	//if it bounces at a low enough angle for a long enough time
	preventLowAngleBounce(xn, yn){
		let rad = Math.abs(Math.atan2(this.vy, this.vx));
		let angle = rad * 180 / Math.PI;
		// let isVertical = Math.floor((angle+45)/90) % 2 == 1;
		angle = Math.min(angle, 180 - angle);
		angle = Math.min(angle, 90 - angle);

		if (angle > 10 || !deltaEqual(angle, this.storedAngle))
			this.stuckBounceTimer = 0;
		this.storedAngle = angle;

		if (this.stuckBounceTimer >= 5000){
			let vx = this.vx;
			let vy = this.vy;
			let sign_x = (vx > 0) ? 1 : -1;
			let sign_y = (vy > 0) ? 1 : -1;
			let sign_vert = (Math.abs(vy) > Math.abs(vx)) 
				? -1 : 1;
			let rot = 15 * Math.PI / 180;
			rot *= sign_x * sign_y * sign_vert;
			[vx, vy] = Vector.rotate(vx, vy, rot);
			this.vx = vx;
			this.vy = vy;
			// console.log(rot);
		}
	}

	handleCollision(xn, yn){
		if (!this.validCollision(xn, yn))
			return;
		for (let [key, comp] of Object.entries(this.components))
			comp.handleCollision?.(xn, yn);
		let dot = (this.vx*xn) + (this.vy*yn);
		this.vx -= (2*dot*xn);
		this.vy -= (2*dot*yn);
		this.preventLowAngleBounce(xn, yn);
	}

	//check whether the normal vector and the ball's velocity
	//vector is greater than 90 degrees
	validCollision(xn, yn){
		if (xn == 0 && yn == 0)
			return false;
		let theta = Vector.angleBetween(xn, yn, this.vx, this.vy);
		return (theta > Math.PI/2);
	}

	onSpriteHit(obj, norm, mag){
		if (this.pierceOverride){
			this.pierceOverride = false;
			if (obj.isDead())
				return;
		}
		if (this.pierce){
			let pierce = this.pierce;
			if (typeof(pierce) == "function"){
				if (pierce(this, obj))
					return;
			}
			else if (obj.isDead())
				return;
		}

		let norm2 = norm.scale(mag);
		this.translate(norm2.x, norm2.y);
		this.handleCollision(norm.x, norm.y);

		for (let [key, comp] of Object.entries(this.components))
			comp.onSpriteHit?.(obj, norm, mag);
	}

	//Paddle will call this directly instead of onSpriteHit
	//due to ball-paddle collision behavior being radically different
	onPaddleHit(paddle){
		this.stuckBounceTimer = 0;

		for (let [key, comp] of Object.entries(this.components))
			comp.onPaddleHit?.(paddle);
	}

	//steer will only affect the ball for 1 frame
	//before getting deleted
	//epsilon causes the ball to slightly undershot the
	//targeted vector so that it will keep its momentum after bounce
	setSteer(tx, ty, mag, epsilon=0.01){
		this.steer = [tx, ty, mag, epsilon];
	}

	update(delta){
		//preUpdate will update the components regardless if
		//the ball is stuck to the paddle
		for (let [key, comp] of Object.entries(this.components))
			comp.preUpdate?.(delta);

		if (!this.isActive())
			return;

		for (let [key, comp] of Object.entries(this.components))
			comp.update?.(delta);

		if (this.steer){
			let [tx, ty, mag, epsilon] = this.steer;
			let vx = this.vx;
			let vy = this.vy;
			let spd = this.getSpeed();
			let sign = Vector.angleSign(vx, vy, tx, ty);
			let maxTheta = Vector.angleBetween(vx, vy, tx, ty);
			maxTheta = Math.max(0, maxTheta - epsilon);
			let theta = mag * delta * spd;
			theta = Math.min(maxTheta, theta);
			this.rotateVel(sign * theta);

			this.steer = null;
		}

		let storedVel;
		if (this.velOverride){
			storedVel = {vx: this.vx, vy: this.vy};
			let {vx, vy} = this.velOverride;
			this.vx = vx ?? this.vx;
			this.vy = vy ?? this.vy;
		}

		if (!this.disableBounce){
			if (this.y - this.shape.radius > DIM.h && !cheats.disable_pit)
				this.dead = true;

			let [x0, y0, x1, y1] = this.shape.getAABB();
			if (x0 < DIM.lwallx)
				this.handleCollision(1, 0);
			else if (x1 > DIM.rwallx)
				this.handleCollision(-1, 0);
			else if (y0 < DIM.ceiling)
				this.handleCollision(0, 1);
			else if (cheats.disable_pit && y1 > DIM.h)
				this.handleCollision(0, -1);

			this.stuckBounceTimer += delta;
		}

		super.update(delta);

		if (this.velOverride){
			let {vx, vy} = storedVel;
			this.vx = vx;
			this.vy = vy;
			this.velOverride = null;
		}
	}
}