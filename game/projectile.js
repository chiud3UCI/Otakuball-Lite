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
		//lifespan in milliseconds
		this.timer = null;
		this.boundCheck = true;

		this.gameType = "projectile";
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

	update(delta){
		if (this.timer !== null){
			this.timer -= delta;
			if (this.timer <= 0)
				this.kill();
		}

		super.update(delta);
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
			if (deathSound.indexOf("detonator") != -1)
				stopSound(deathSound);
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
		this.radius = this.shape.radius;
	}
}