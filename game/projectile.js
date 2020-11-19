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

//explosions are invisible hitboxes that last for 1 frame
class Explosion extends Projectile{
	constructor(x, y, w, h){
		super(null, x, y, 0, 0, 0, w, h);
		this.damage = 100;
		this.strength = 1;
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
			if (deathSound != "detonator_explode")
				stopSound(deathSound);
		}
		else{
			let hitSound = brick.hitSound;
			if (hitSound != "detonator_explode")
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