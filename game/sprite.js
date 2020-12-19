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
		texture=null, x=0, y=0, vx=0, vy=0, angle=0, sx=2, sy=2)
	{
		//if texture is null then PIXI.Sprite will use
		//PIXI.Texture.EMPTY which is a clear 1x1 pixel
		if (typeof(texture) === "string"){
			texture = media.textures[texture];
		}
		super(texture);
		//start at center
		this.anchor.set(0.5, 0.5);
		//almost all sprites are scaled 2x
		this.scale.set(sx, sy);
		this.position.set(x, y);
		this.rotation = angle; //radians

		//die if sprite goes out of bounds
		this.boundCheck = false;

		this.anim = {};
		this.isAnimating = false;

		this.vx = vx;
		this.vy = vy;
		this.ax = 0;
		this.ay = 0;

		this.dead = false;

		this.gameType = "sprite";
	}

	destructor(){
		
	}

	onDeath(){
		
	}

	setTexture(texture){
		if (typeof(texture) === "string"){
			texture = media.textures[texture];
		}
		this.texture = texture;
	}

	//automatically make a rectangle or circle shape based
	//on the size of the sprite's textures
	//will work if this Sprite contains mujltiple sprites
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
	}

	removeShape(){
		if (this.shape){
			this.shape.sprite = undefined;
			this.shape = undefined;
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
		let ani = new PIXI.AnimatedSprite(textures2);
		ani.animationSpeed = spd;
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

		if (playNow)
			this.playAnim(name);

		return ani;
	}

	removeAnim(name){
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
		let [x0, y0, x1, y1] = this.getAABB();
		hb.clear();
		hb.lineStyle(1, 0x00FFFF);
		hb.drawRect(x0, y0, x1-x0, y1-y0);
	}

	//returns Axis Aligned Bounding Box of the
	//sprite's shape or the sprite itself is shape is missing
	getAABB(spriteOnly){
		if (!spriteOnly && this.shape)
			return this.shape.getAABB();

		let r = this.getBounds();
		let rx = r.x;
		let ry = r.y;
		let rw = r.width;
		let rh = r.height;

		return [rx, ry, rx+rw, ry+rh];
	}

	//check if 2 sprites' AABB overlap
	checkOverlap(other){
		let [ax0, ay0, ax1, ay1] = this.getAABB();
		let [bx0, by0, bx1, by1] = other.getAABB();
		return !(
			ax0 > bx1 ||
			ax1 < bx0 ||
			ay0 > by1 ||
			ay1 < by0
		);
	}

	//check if 2 sprites' shapes collide using SAT
	//more expensive than checkOverlap
	//returns [bool, norm, mag]
	checkCollision(other){
		if (!this.shape || !other.shape)
			throw new Error("One of the sprites doesn't have a shape!");
		return this.shape.collide(other.shape);
	}

	//used for projectile sprites onto recieveing sprite
	canHit(sprite){
		return true;
	}

	//returns [bool, norm, mag]
	checkSpriteHit(obj){
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

	isDead(){
		return this.dead;
	}

	kill(){
		this.dead = true;
	}

	//val from 0 to 1
	//set to 0 to turn off completely
	// setGlow(val=0){
	// 	if (val == 0){
	// 		if (this.glowRect){
	// 			this.removeChild(this.glowRect);
	// 			this.glowRect = null;
	// 		}
	// 	}
	// 	else{
	// 		// if (!this.glowRect){
	// 		// 	let [x0, y0, x1, y1] = this.getAABB();
	// 		// 	let w = (x1 - x0)/2;
	// 		// 	let h = (y1 - y0)/2;
	// 		// 	let glow = new PIXI.Graphics()
	// 		// 		.beginFill(0xFFFFFF)
	// 		// 		.drawRect(-w/2, -h/2, w, h);
	// 		// 	// glow.mask = new PIXI.Sprite(this.texture);
	// 		// 	this.glowRect = glow;
	// 		// 	// this.addChildAt(this.glowRect, 1);
	// 		// 	this.addChild(glow);
	// 		// }
	// 		if (!this.glowRect){
	// 			let [x0, y0, x1, y1] = this.getAABB();
	// 			let w = (x1 - x0)/2;
	// 			let h = (y1 - y0)/2;
	// 			let glow = new PIXI.Graphics()
	// 				.beginFill(0xFFFFFF)
	// 				.drawRect(0, 0, DIM.w, DIM.h);
	// 			// glow.mask = new PIXI.Sprite(this.texture);
	// 			// let mask = new PIXI.Graphics()
	// 			// 	.beginFill(0xFFFFFF)
	// 			// 	.drawRect(0, 0, 100, 100);

	// 			//Maybe create the sprite first
	// 			//then set it to the mask?
	// 			//also draw the mask as well?
	// 			//Also mask transparency is determined by RED value only
	// 			let mask = new PIXI.Sprite(this.texture);
	// 			mask.position.set(50, 50);
	// 			this.glowRect = glow;
	// 			glow.mask = mask;
	// 			// this.glowRect.addChild(mask);
	// 			// this.addChild(glow);
	// 			game.top.add("hud", glow);
	// 		}
	// 	}	
	// }

	// updateGlow(){
	// 	if (!this.glowRect)
	// 		return;
	// 	if (!this.glowRect.mask)
	// 		return;
	// 	// let mask = this.glowRect.mask;
	// 	// mask.scale.set(1);
	// 	// let p = this.getGlobalPosition();
	// 	// // mask.position.set(p.x, p.y);
	// 	// mask.position.set(100, 100);
	// }


	//WARNING: Some PIXI classes have the function update() in them
	//so this method might unintentially override the old update() method.
	//Currently, PIXI.Sprite and all parents do not have an update() method.
	//However, PIXI.AnimatedSprite does has an update() method.
	update(delta){
		if (this.boundCheck){
			let [x0, y0, x1, y1] = this.getAABB();
			if (x0 < DIM.lwallx || 
				x1 > DIM.rwallx ||
				y0 < DIM.ceiling ||
				y0 > DIM.h)
				this.kill();
		}

		//don't update movement if velocity/acceleration is 0
		//might be more efficent?
		if (this.vx || this.vy || this.ax || this.ay){
			this.x += (this.vx * delta) + (0.5 * this.ax * delta * delta);
			this.y += (this.vy * delta) + (0.5 * this.ay * delta * delta);
			this.vx += (this.ax * delta);
			this.vy += (this.ay * delta);

			this.updateShape();
		}

		// this.drawHitbox();

		// this.updateGlow();
	}
}