class Projectile extends Sprite{
	constructor(texture, x, y, vx, vy, angle, sx, sy){
		super(texture, x, y, vx, vy, angle, sx, sy);
		//default shape is a rectangle
		this.createShape();
		//some powerups can clear hostile projectiles
		this.hostile = false;
		this.health = 1;
		this.damage = 10;
		this.strength = 0;
		//determines which sprites it can collide with
		this.colFlag = {
			brick: true,
			enemy: true,
			paddle: false
		}
		//pierce can be false, true, or "strong"
		this.pierce = false;
		//used for antilaser patch
		this.isLaser = false;

		this.wallCheck = true;
		this.floorCheck = true;

		this.gameType = "projectile";
		this.projectileType = "projectile";
	}

	destructor(){
		super.destructor();
		if (this.parentWeapon)
			this.parentWeapon.onProjectileDeath(this);
	}

	kill(){
		this.health = 0;
	}

	isDead(){
		return (this.health <= 0);
	}

	onDeath(){}

	canHit(obj){
		return this.colFlag[obj.gameType];
	}

	onSpriteHit(obj, norm, mag){
		if (this.pierce == "strong")
			return;
		else if (this.pierce && obj.isDead())
			return;
		this.kill();
	}

	onPaddleHit(paddle){
		this.kill();
	}
}

function freezeBrick(brick){
	if (!brick.isDead())
		return;
	let type = brick.brickType;
	if (type == "ice" || type == "detonator")
		return;

	let ice = new IceBrick(brick.x, brick.y, brick.texture);
	game.emplace("bricks", ice);

}

//explosions are invisible hitboxes that last for 1 frame
class Explosion extends Projectile{
	constructor(x, y, w, h, freeze=false){
		super(null, x, y, 0, 0, 0, w, h);
		this.damage = 100;
		this.strength = 1;
		this.freeze = freeze;
		this.projectileType = "explosion";
	}

	isDead(){
		return true;
	}

	onSpriteHit(obj, norm, mag){
		//suppress the sounds of non-explosive bricks
		if (obj.gameType != "brick")
			return;
		let brick = obj;
		if (brick.isDead()){
			let deathSound = brick.deathSound;
			stopSound(brick.deathSound);
			if (this.freeze)
				freezeBrick(brick);
		}
		else{
			let hitSound = brick.hitSound;
			if (hitSound.indexOf("detonator") != -1)
				stopSound(hitSound);
		}
	}
}

class BallProjectile extends Projectile{
	constructor(texture, x, y, vx, vy){
		super(texture, x, y, vx, vy);
		this.createShape(true);
		//"weak" bounce dies after doing damage
		this.bounce = false; //false, true, "weak"
		this.wallCheck = false;
		this.floorCheck = true;
		this.radius = this.shape.radius;
		this.projectileType = "ballprojectile";
	}

	//false, "weak", true(strong)
	setBounce(value){
		this.bounce = value;
		if (value)
			this.wallCheck = false;
		else
			this.wallCheck = true;
	}

	onSpriteHit(obj, norm, mag){
		//TODO: differentiate between strong and weak pierce
		if (this.pierce)
			return;
		if (this.bounce === false){
			this.kill();
			return;
		}
		if (this.bounce == "weak" && obj.damaged){
			this.kill();
			return;
		}
		let norm2 = norm.scale(mag);
		this.translate(norm2.x, norm2.y);
		this.handleCollision(norm.x, norm.y);
	}

	onPaddleHit(paddle){
		if (this.bounce === false){
			this.kill();
			return;
		}
		this.vy = -Math.abs(this.vy);
	}

	handleCollision(xn, yn){
		if (!this.validCollision(xn, yn))
			return;
		let dot = (this.vx*xn) + (this.vy*yn);
		this.vx -= (2*dot*xn);
		this.vy -= (2*dot*yn);
	}

	validCollision(xn, yn){
		let proto = Ball.prototype;
		return proto.validCollision.call(this, xn, yn);
	}

	update(delta){
		if (this.bounce){
			let [x0, y0, x1, y1] = this.shape.getAABB();
			if (x0 < DIM.lwallx)
				this.handleCollision(1, 0);
			else if (x1 > DIM.rwallx)
				this.handleCollision(-1, 0);
			else if (y0 < DIM.ceiling)
				this.handleCollision(0, 1);
		}

		super.update(delta);
	}
}