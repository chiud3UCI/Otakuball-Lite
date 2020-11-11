class Enemy extends Sprite{
	constructor(texture, x, y, vx, vy){
		super(texture, x, y, vx, vy);
		this.createShape();
		this.setState("emerging");

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
		}
		this.state.init(...args);
	}

	advanceState(){
		this.state = null;
	}

	onSpriteHit(obj, norm, mag){
		this.kill();
		obj.onSpriteHit(this, norm, mag);
	}

	update(delta){
		if (this.y - this.height/2 > DIM.w)
			this.kill();

		if (this.state){
			this.state.update(delta);
		}
		super.update(delta);
	}

}

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

	advanceState(){
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

Enemy.states = {
	emerging: {
		//I'm going to try to use function binding
		init(spd=0.05){
			this.vx = 0;
			this.vy = spd;
		},
		update(delta){
			if (this.y - this.height/2 > DIM.ceiling){
				this.advanceState();
			}
		}
	}
}