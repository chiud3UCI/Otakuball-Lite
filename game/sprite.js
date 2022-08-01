/**
 * Stores constructor args into object so that object can clone itself
 * using Sprite.clone()
 * @param {Sprite} obj - instance of Sprite or Sprite Subclasses
 * @param {function} currentClass - pass the current class here
 * @param {any[]} args - pass the arguments variable here
 */
function setConstructorInfo(obj, currentClass, args){
	obj._constructorInfo = {
		class: currentClass, 
		args: Array.from(args)
	};
}

class Sprite extends PIXI.Sprite{
	//create a Sprite using keyword args instead
	static fromArgs(args){
		return new Sprite(
			args.texture,
			args.x,
			args.y,
			args.vx,
			args.vy,
			args.angle,
			args.sx,
			args.sy
		);
	}

	//width and height are determined by texture
	//acx and acy is the anchor point
	constructor(
		texture=null, x=0, y=0, vx=0, vy=0, angle=0, sx=2, sy)
	{
		if (texture === null){
			//PIXI.Texture.EMPTY is a clear 1x1 pixel
			texture = PIXI.Texture.EMPTY;
		}
		else if (typeof(texture) === "string"){
			let texStr = texture;
			texture = media.textures[texStr];
			if (!texture)
				alert(`texture "${texStr}" does not exist`);
		}
		super(texture);
		//start at center
		this.anchor.set(0.5, 0.5);
		//almost all sprites are scaled 2x
		if (sy === undefined)
			sy = sx;
		this.scale.set(sx, sy);
		this.position.set(x, y);
		this.rotation = angle; //radians

		//lifespan in milliseconds
		this.timer = null;

		//die if sprite touches the wall/ceiling
		this.wallCheck = false;
		//die if sprite goes completely below the pit
		this.floorCheck = false;

		//intangible means it cant hit or be hit by objects
		this.intangible = false;

		this.anim = {};
		this.isAnimating = false;

		this.vx = vx;
		this.vy = vy;
		this.ax = 0;
		this.ay = 0;

		this.score = null;
		this.dead = false;

		//prevent movement if true
		this.frozen = false;
		//disabled's behavior will be implemented on a
		//class-by-class basis
		this.disabled = false;

		this.showHitbox = false;

		this.gameType = "sprite";
	}

	destructor(){
		
	}

	/**
	 * You must call setConstructorInfo in the constructor of the Subclass
	 * in order to be able to clone the object
	 */
	clone(){
		let info = this._constructorInfo;
		if (!info)
			console.error("you need to call setConstructorInfo() in constructor first!");
		if (this.constructor !== info.class)
			console.error("constructors do not match! Please make sure the actual subclass calls setConstructorInfo()");
		return new this.constructor(...info.args);
	}

	isCloneable(){
		let info = this._constructorInfo;
		if (!info)
			return false;
		return this.constructor === info.class;
	}

	onDeath(){
		if (this.score)
			game.incrementScore(this.score);
	}

	setTexture(texture=null){
		if (texture === null)
			texture = PIXI.Texture.EMPTY;
		else if (typeof(texture) === "string")
			texture = media.textures[texture];
		this.texture = texture;
	}

	//automatically make a rectangle or circle shape based
	//on the size of the sprite's textures
	//will work if this Sprite contains multiple children sprites
	createShape(circle){
		if (circle){
			let r = this.getBounds();
			this.setShape(new CircleShape(
				this.x, this.y, r.width/2));
		}
		else{
			let [x0, y0, x1, y1] = this.getAABB(true);
			let points = [
				x0, y0,
				x1, y0,
				x1, y1,
				x0, y1
			]
			this.setShape(new PolygonShape(points));
		}
	}

	setShape(shape){
		this.removeShape();
		this.shape = shape;
		shape.sprite = this;
		this.shape.moveTo(this.x, this.y);
		this.shape.setRotation(this.rotation);
	}

	removeShape(){
		if (this.shape){
			delete this.shape.sprite;
			delete this.shape;
		}
	}

	updateShape(){
		if (this.shape){
			this.shape.moveTo(this.x, this.y);
		}
	}

	translate(dx, dy){
		this.x += dx;
		this.y += dy;
		this.updateShape();
	}

	moveTo(x, y){
		this.x = x;
		this.y = y;
		this.updateShape();
	}

	setPos(x, y){
		this.moveTo(x, y);
	}

	getPos(){
		return [this.x, this.y];
	}

	getSpeed(){
		return Vector.dist(this.vx, this.vy);
	}

	setSpeed(spd){
		let [nvx, nvy] = Vector.normalize(this.vx, this.vy);
		this.vx = nvx * spd;
		this.vy = nvy * spd;
	}

	getVel(){
		return [this.vx, this.vy];
	}

	setVel(vx, vy){
		this.vx = vx;
		this.vy = vy;
	}

	rotateVel(rad){
		let vx = this.vx;
		let vy = this.vy;
		[vx, vy] = Vector.rotate(vx, vy, rad);
		this.vx = vx;
		this.vy = vy;
	}

	setRotation(rad){
		this.rotation = rad;
		if (this.shape)
			this.shape.setRotation(rad);
	}

	//remember that the default animation speed is 60 fps
	//textures can be a string, arr of textures, or arr of strings
	addAnim(name, textures, spd=1, loop=false, playNow=false){
		if (typeof(textures) === "string")
			textures = media.animations[textures];
		let textures2 = [];
		for (let tex of textures){
			if (typeof(tex) === "string")
				textures2.push(media.textures[tex]);
			else
				textures2.push(tex);
		}
		let ani = new PIXI.AnimatedSprite(textures2, false);
		// ani.autoUpdate = false;
		// ani.animationSpeed = spd;
		ani.deltaScale = 1/15 * spd; //why is it 1/15?
		ani.anchor.set(0.5, 0.5);
		ani.visible = false;
		ani.loop = loop;
		this.addChild(ani);
		this.anim[name] = ani;

		//make sure to modify onCompleteCustom instead of onComplete
		ani.onComplete = () => {
			ani.visible = false;
			this.isAnimating = false;
			if (ani.onCompleteCustom)
				ani.onCompleteCustom();
		}

		ani.onFrameChange = function(){
			if (ani.onFrameChangeCustom)
				ani.onFrameChangeCustom(ani.currentFrame);
		}

		if (playNow)
			this.playAnim(name);

		return ani;
	}

	removeAnim(name){
		this.stopAnim();
		delete this.anim[name];
	}


	playAnim(name){
		this.stopAnim();
		let ani = this.anim[name];
		ani.visible = true;
		ani.gotoAndPlay(0);
		this.isAnimating = true;
		return ani;
	}

	stopAnim(){
		for (let key in this.anim){
			let ani = this.anim[key];
			if (ani.playing){
				ani.stop();
				//have to manually call onComplete too
				ani.onComplete();
			}
		}
		this.isAnimating = false;
	}

	//debugging
	drawHitbox(){
		if (this.isDead() && this.debugHitbox){
			game.top.hud.removeChild(this.debugHitbox);
			return;
		}
		if (!this.debugHitbox){
			this.debugHitbox = new PIXI.Graphics();
			game.top.add("hud", this.debugHitbox);		
		}
		let hb = this.debugHitbox;
		if (this.shape.shapeType == "circle"){
			let circle = this.shape;
			hb.clear();
			hb.lineStyle(1, 0x00FFFF);
			hb.drawCircle(circle.center.x, circle.center.y, circle.radius);
		}
		else{
			let [x0, y0, x1, y1] = this.getAABB();
			hb.clear();
			hb.lineStyle(1, 0x00FFFF);
			hb.drawRect(x0, y0, x1-x0, y1-y0);
		}
	}

	//returns Axis Aligned Bounding Box of the
	//sprite's shape or the sprite itself is shape is missing
	getAABB(spriteOnly){
		if (!spriteOnly && this.shape)
			return this.shape.getAABB();

		let {x, y, width, height} = this.getBounds();
		//don't forget to take in account of the global offset
		x -= DIM.offx;
		y -= DIM.offy;
		return [x, y, x+width, y+height];
	}

	//returns [width, height] of the sprite
	//DEPRECIATED: Use this.w and this.h instead
	getDim(spriteOnly){
		if (!spriteOnly && this.shape){
			let [x0, y0, x1, y1] = this.shape.getAABB();
			return [x1-x0, y1-y0];
		}
		let r = this.getBounds();
		return [r.width, r.height];
	}

	//If sprite does not have shape, then get the bound width
	get w(){
		return this.shape?.w ?? this.width;
	}

	get h(){
		return this.shape?.h ?? this.height;
	}

	//check if 2 sprites' AABBs overlap
	checkOverlap(other){
		return AABBOverlap(this.getAABB(), other.getAABB());
	}
	// checkOverlap(other){
	// 	let [ax0, ay0, ax1, ay1] = this.getAABB();
	// 	let [bx0, by0, bx1, by1] = other.getAABB();
	// 	return !(
	// 		ax0 > bx1 ||
	// 		ax1 < bx0 ||
	// 		ay0 > by1 ||
	// 		ay1 < by0
	// 	);
	// }

	//check if 2 sprites' shapes collide using SAT
	//more expensive than checkOverlap
	//returns [bool, norm, mag]
	checkCollision(other){
		if (!this.shape || !other.shape)
			throw new Error("One of the sprites doesn't have a shape!");
		return this.shape.collide(other.shape);
	}

	raycast(x0, y0, dx, dy){
		return this.shape.raycast(x0, y0, dx, dy);
	}

	//used for projectile sprites onto receiving sprite
	canHit(sprite){
		return true;
	}

	//returns [bool, norm, mag]
	checkSpriteHit(obj){
		//intangible objects cannot collide
		if (this.intangible || obj.intangible)
			return [false];
		//check if bounding boxes overlap
		if (!this.checkOverlap(obj))
			return [false];
		//if either objects have no shape, then just return true
		if (!this.shape || !obj.shape)
			return [true];
		//then use SAT collision check
		return obj.checkCollision(this);
	}

	//override this method
	onSpriteHit(obj, norm, mag){}

	//playstate will call this to check if object should
	//be removed from the game
	shouldBeRemoved(){
		return this.isDead();
	}

	isDead(){
		return this.dead;
	}

	kill(){
		this.dead = true;
	}

	//WARNING: Some PIXI classes have the function update() in them
	//so this method might unintentially override the old update() method.
	//Currently, PIXI.Sprite and all parents do not have an update() method.
	//However, PIXI.AnimatedSprite does has an update() method.
	update(delta){
		for (let ani of Object.values(this.anim)){
			//why do I have to divide delta by 15?
			ani.update(delta * ani.deltaScale);
		}

		if (this.timer !== null){
			this.timer -= delta;
			if (this.timer <= 0)
				this.kill();
		}

		if (this.wallCheck || this.floorCheck){
			let [x0, y0, x1, y1] = this.getAABB();
			if (this.wallCheck && (
					x0 < DIM.lwallx || 
					x1 > DIM.rwallx ||
					y0 < DIM.ceiling
				))
				this.kill();
			if (this.floorCheck && y0 > DIM.h)
				this.kill();
		}

		//don't update movement if velocity/acceleration is 0
		//might be more efficent?
		if (!this.frozen && (this.vx || this.vy || this.ax || this.ay)){
			this.x += (this.vx * delta) + (0.5 * this.ax * delta * delta);
			this.y += (this.vy * delta) + (0.5 * this.ay * delta * delta);
			this.vx += (this.ax * delta);
			this.vy += (this.ay * delta);

			this.updateShape();
		}

		if (this.showHitbox)
			this.drawHitbox();

		// this.updateGlow();
	}
}

//Specials are game objects that do not fit in any other categories
class Special extends Sprite{
	constructor(...args){
		super(...args);
		this.gameType = "special";
	}
}

//A PIXI.Graphics object that pretends to be a Sprite
class GraphicsSprite extends PIXI.Graphics{
	constructor(x=0, y=0){
		super();
		this.position.set(x, y);
		this.dead = false;
		this.gameType = "graphics";
	}

	destructor(){

	}

	onDeath(){
		
	}

	shouldBeRemoved(){
		return this.isDead();
	}

	isDead(){
		return this.dead;
	}

	kill(){
		this.dead = true;
	}

	update(delta){

	}
}