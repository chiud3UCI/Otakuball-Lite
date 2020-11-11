
var cheats = {
	instant_powerups: false,
	disable_pit: false,
	fling_existing: false
}

//I chose to use a class approach instead of a singleton
//because I want to make sure everything in this instance
//is cleared when the player exits the playstate
class PlayState{
	constructor(level){
		//initialize object lists based on draw order
		//you can initialize as many arbitrary layers as needed
		let layerNames = [
			"background",
			"game",
			"walls",
			"hud"
		];

		//these layers will be put inside the game layer
		//in order to add shadows
		let gameLayerNames = [
			"borders",
			"bricks",
			"enemies",
			"particles",
			"powerups",
			"paddles",
			"projectiles",
			"menacers",
			"balls",
		]
		this.activeLayers = gameLayerNames;

		let stage = new PIXI.Container();
		this.stage = stage;

		for (let name of layerNames){
			let cont = new PIXI.Container;
			stage.addChild(cont);
			this[name] = cont;
		}

		//also create lists for new objects
		this.newObjects = {};
		for (let name of gameLayerNames){
			let cont = new PIXI.Container;
			this.game.addChild(cont);
			this[name] = cont;
			this.newObjects[name] = [];
		}

		this.bricks.sortableChildren = true;

		//callbacks are special because they're not sprites
		this.callbacks = [];
		this.newCallbacks = [];

		//add a shadow effect to the game layer
		this.game.filters = [new PIXI.filters.DropShadowFilter({
			blur: 0,
			quality: 0,
			alpha: 0.5,
			distance: 8 * Math.SQRT2,
			rotation: 45,
		})];
		
		//create background
		let bg = new PIXI.Graphics();
		bg.beginFill(0x000080);
		bg.drawRect(DIM.lwallx, DIM.ceiling, DIM.boardw, DIM.boardh);
		this.add("background", bg);

		//create walls
		let walls = new PIXI.Graphics();
		walls.beginFill(0xAAAAAA);
		//take in account of borders
		let bw = 16; //border width
		walls.drawRect(0, 0, DIM.wallw-bw, DIM.h);
		walls.drawRect(DIM.rwallx+bw, 0, DIM.wallw-bw, DIM.h);
		walls.drawRect(DIM.lwallx-bw, 0, DIM.boardw+bw*2, DIM.ceiling-bw);

		this.add("walls", walls);

		//create borders
		let border = new Sprite(
			"border",
			DIM.w/2,
			DIM.ceiling + DIM.boardh/2 - 8
		);
		this.add("borders", border);
		this.initGates();

		//create paddle
		let paddle = new Paddle();
		this.add("paddles", paddle);

		//create bricks
		this.loadLevel(level);
		this.initBrickGrid();

		//create ball
		let ball = new Ball(0, 0, 0.4, 0);
		this.add("balls", ball);
		paddle.attachBall(ball, true);

		//testing mode
		this.initPowerupButtons();
		this.initEnemyButtons();
		this.initCheckboxes();

		this.stateName = "playstate";

	}

	initBrickGrid(){
		let _grid = [];
		for (let i = 0; i < 32; i++){
			let row = [];
			_grid.push(row);
			for (let j = 0; j < 13; j++){
				row.push([]);
			}
		}

		let bricks = this.bricks;

		this.brickGrid = {
			grid: _grid,

			//clears grid and re-add all bricks to it
			refresh(){
				for (let i = 0; i < 32; i++){
					for (let j = 0; j < 13; j++)
						this.grid[i][j] = [];
				}

				let curr_id = 0;
				for (let br of bricks.children){
					br.gridDat = {id: curr_id++};
					let [i, j] = getGridPos(br.x, br.y);
					if (boundCheck(i, j)){
						if (!br.isMoving())
							this.grid[i][j].push(br);
						else{
							//moving bricks can occupy multiple
							//grid cells at one time
							br.gridDat.move = true;

							let [xc, yc] = getGridPosInv(i, j);
							let i0 = i, i1 = i;
							let j0 = j, j1 = j;
							if 		(br.x < xc) j0--;
							else if (br.x > xc) j1++;
							if 		(br.y < yc) i0--;
							else if (br.y > yc) i1++;
							[i0, j0] = clampGridPos(i0, j0);
							[i1, j1] = clampGridPos(i1, j1);

							for (let ii = i0; ii <= i1; ii++){
								for (let jj = j0; jj <= j1; jj++){
									this.grid[ii][jj].push(br);
								}
							}

							//for use in manageBrickMovement()
							br.gridDat.range = [i0, j0, i1, j1];
						}
					}
				}
			},

			getBucket(sprite){
				let [ic, jc] = getGridPos(sprite.x, sprite.y);
				if (!boundCheck(ic, jc))
					return [];

				let [x0, y0, x1, y1] = sprite.getAABB();
				let [i0, j0] = getGridPos(x0, y0);
				let [i1, j1] = getGridPos(x1, y1);
				[i0, j0] = clampGridPos(i0, j0);
				[i1, j1] = clampGridPos(i1, j1);

				//priority ordering
				let arr0 = []; //brick right at the sprite's center
				let arr1 = []; //bricks in a cross shape from the center
				let arr2 = []; //all other static bricks
				let arrMov = []; //moving bricks have lowest priority
				let movSet = new Set(); //keeps track of duplicates

				for (let i = i0; i <= i1; i++){
					for (let j = j0; j <= j1; j++){
						for (let br of this.grid[i][j]){
							if (br.gridDat.move){
								let id = br.gridDat.id;
								if (!movSet.has(id)){
									movSet.add(id);
									arrMov.push(br);
								}
							}
							else if (i == ic && j == jc)
								arr0.push(br);
							else if (i == ic || j == jc)
								arr1.push(br);
							else
								arr2.push(br);
						}
					}
				}

				return arr0.concat(arr1).concat(arr2).concat(arrMov);
			},

			//checks if grid cell is empty
			//if includeMoving if false, then it will
			//ignore moving bricks
			isEmpty(i, j, includeMoving=false){
				if (includeMoving && this.grid[i][j].length > 0)
					return false;
				for (let br of this.grid[i][j]){
					if (!br.gridDat.move)
						return false;
				}
				return true;
			},

			//adds a Null Brick that disappears by the next frame
			reserve(i, j){
				let [x, y] = getGridPosInv(i, j);
				let br = new NullBrick(x, y);
				br.gridDat = {};
				this.grid[i][j].push(br);
			}
		}
	}

	initGates(){
		let gates = [];
		let offsets = [48, 144, 272, 368];
		for (let off of offsets){
			let x = DIM.lwallx + off;
			let y = DIM.ceiling;
			let gate = new Gate(x, y);
			gates.push(gate);
			this.add("borders", gate);
		}
		this.gates = gates;

	}

	initPowerupButtons(){
		let powerPanel = new PIXI.Container();
		powerPanel.x = DIM.rwallx + 30;
		powerPanel.y = DIM.ceiling + 10;
		this.add("hud", powerPanel);

		let buttonOrder = [
			["Ball Addition", [
				 21,  33,  68,  72,  88, 109, 111,  
			]],
			["Ball Modify", [
				  0,   1,   3,   9,  10,  17,  18,  22,  25,  26,
				 29,  31,  35,  37,  39,  42,  45,  50,  55,  56, 
				 58,  61,  65,  73,  74,  80,  83,  96,  97, 101, 
				102,  120, 121, 123, 126, 129, 131, 133, 
			]],
			["Paddle Weapon", [
				  5,   8,  23,  27,  51,  59,  60,  66,  81,  89,
				 99, 108, 127, 134,
			]],
			["Paddle Modify", [
				  4,  13,  14,  15,  19,  28,  30,  36,  38,  40,
				 41,  44,  46,  48,  49,  64,  75,  76,  79,  84,
				 85,  90,  91,  92,  95,  98, 110, 118, 124, 130,
			]],
			["Brick-Related", [
				 11,  16,  20,  24,  43,  47,  62,  63,  77,  78,
				 86, 104, 106, 112, 113, 115, 116, 119, 128, 
			]],
			["Environment", [
				  2,   6,   7,  12,  32,  34,  52,  53,  54,  57,
				 67,  69,  70,  71,  82,  87,  93,  94, 100, 103,
				105, 107, 114, 117, 122, 125, 132,
			]],
		]

		let wrap = 5;
		let scale = 1.5;
		let dx = 16 * scale;
		let dy = 8 * scale;
		let x0 = 0;
		let y0 = 0;
		let yoff = 0;
		for (let [name, arr] of buttonOrder){
			let text = new PIXI.Text(name, {
				fontSize: 16,
				fill: 0x000000
			});
			text.position.set(x0, y0 + yoff);
			powerPanel.addChild(text);
			yoff += 18;
			for (let [n, id] of arr.entries()){
				let i = Math.floor(n/wrap);
				let j = n % wrap;
				let x = x0 + j * dx;
				let y = y0 + yoff + i * dy;
				let butt = new PowerupButton(this, x, y, scale, id);
				powerPanel.addChild(butt);
			}
			yoff += 5 + (Math.floor((arr.length-1)/wrap) + 1) * dy;
		}

		//create tooltip
		//TOODO: turn tooltip into a class
		let tooltip = new PIXI.Text("Tooltip", {
			fontSize: 24,
			fill: 0x000000
		});
		tooltip.x = DIM.lwallx + 150;
		tooltip.y = 20;
		tooltip.powId = null;
		this.add("hud", tooltip);
		this.tooltip = tooltip;
	}

	initEnemyButtons(){
		let panel = new PIXI.Container();
		panel.x = 10;
		panel.y = 10;
		for (let i = 0; i < 10; i++){
			let x = (i % 6) * 24;
			let y = Math.floor(i/6) * 24;
			let butt = new EnemyButton(this, x, y, i);
			panel.addChild(butt);
		}
		this.add("hud", panel);
	}

	initCheckboxes(){
		let x = 20;
		let y = DIM.ceiling;
		let text = "Disable Pit";
		let val = cheats.disable_pit;
		let func = function(state){
			cheats.disable_pit = state;
		};
		let cb = new Checkbox(x, y, text, val, func);
		this.add("hud", cb);

		x = 20;
		y += 25;
		text = "Instant Powerups";
		val = cheats.instant_powerups;
		func = function(state){
			cheats.instant_powerups = state;
		};
		cb = new Checkbox(x, y, text, val, func);
		this.add("hud", cb);

		x = 20;
		y += 25;
		text = "ON: Fling Existing Ball";
		text += "\nOFF: Fling New Ball";
		text += "\n(Right Click to Fling)";
		val = cheats.fling_existing;
		func = function(state){
			cheats.fling_existing = state;
		};
		cb = new Checkbox(x, y, text, val, func);
		cb.label.style.fontSize = 12;
		this.add("hud", cb);
	}

	
	//adds objects at the bottom of the update loop
	//so it doesn't cause any problems with iteration
	emplace(name, obj){
		let arr = this.newObjects[name];
		if (arr === undefined){
			console.err("invalid name");
			return;
		}
		arr.push(obj);
	}

	//retrieves the list of objects based on layer name
	get(name){
		return this[name].children;
	}

	//callbacks have a special add method
	//because they are not sprites
	emplaceCallback(timer, func, name){
		let cb = new Callback(timer, func, name);
		this.newCallbacks.push(cb);
	}

	addCallback(timer, func, name){
		this.emplaceCallback(timer, func, name);
	}

	//adds object immediately to the game
	add(name, obj){
		let cont = this[name];
		cont.addChild(obj);
	}

	//spawns the enemy through a random vacant gate
	//will fail if all gates are full
	spawnEnemy(enemy){
		let gates = this.gates;
		let choices = [];
		for (let g of gates){
			if (g.isVacant()){
				choices.push(g);
			}
		}
		if (choices.length == 0)
			return;
		let i = randRange(choices.length);
		choices[i].addEnemy(enemy);
	}


	loadLevel(level){
		for (let [i, j, id, patch] of level.bricks){
			let {brickType, args} = brickData.lookup[id];
			let brickClass = brickClasses[brickType];
			let pos = getGridPosInv(i, j);
			let args2 = pos.concat(args);
			let br = new brickClass(...args2);
			if (patch)
				br.initPatches(patch);
			this.add("bricks", br);
		}
	}

	//special debug method that summons a ball and
	//flings it towards the direction of the cursor
	ballFling(){
		let scale = 0.005;
		let mx = mouse.x;
		let my = mouse.y;

		let boardCheck = (
			mx > DIM.lwallx && mx < DIM.rwallx &&
			my > DIM.ceiling && my < DIM.h);

		if (mouse.m2 == 1 && boardCheck && !this.flingBall){
			let ball;
			if (cheats.fling_existing){
				this.paddles.children[0].releaseBalls();
				let storedDist = Infinity;
				ball = this.balls.children[0];
				for (let b of this.balls.children){
					let dist = Vector.dist(
						mx, my, b.x, b.y
					);
					if (dist < storedDist){
						ball = b;
						storedDist = dist;
					}
				}
				ball.moveTo(mx, my);
				ball.vx = 0;
				ball.vy = 0;
			}
			else{
				ball = new Ball(mx, my, 0, 0);
			}
			this.flingBall = ball;
			this.flingVel = new Vector(0, 0);
			this.add("balls", ball);

			this.flingArrow = new PIXI.Graphics();
			this.hud.addChild(this.flingArrow);

			this.flingText = new PIXI.Text("test", {
				fontSize: 16,
				fill: 0xFFFFFF,
			});
			this.flingText.anchor.set(0.5, 0.5);
			this.flingArrow.addChild(this.flingText);
			
		}
		if (this.flingBall){
			let ball = this.flingBall;
			let vel = this.flingVel;
			let arrow = this.flingArrow;
			let txt = this.flingText;

			let inWindow = (
				mx >= 0 && mx <= DIM.w &&
				my >= 0 && my <= DIM.h
			);

			if (mouse.m2 && inWindow){
				let dx = mx - ball.x;
				let dy = my - ball.y;
				let vx = dx * scale;
				let vy = dy * scale;
				vel.set(vx, vy);

				arrow.clear();
				arrow.lineStyle(2, 0xFFFFFF);
				arrow.moveTo(ball.x, ball.y);
				arrow.lineTo(mx, my);

				let spd = vel.len();
				let norm = vel.normalized();
				txt.text = String(spd.toFixed(3));
				txt.x = ball.x + norm.x * -30;
				txt.y = ball.y + norm.y * -30;
			}
			else{
				ball.vx = vel.x;
				ball.vy = vel.y;
				// console.log("release drag ball " + [vel.x, vel.y]);
				this.flingBall = null;

				this.hud.removeChild(arrow);
			}
		}
	}

	//generator
	*activeBalls(){
		for (let ball of this.balls.children){
			if (ball.active)
				yield ball;
		}
	}

	//collision with bricks are special
	//due to spatial partitioning
	collideBrick(objType){
		let arr = (objType == "balls") ?
			this.activeBalls() : this[objType].children;

		let brickGrid = this.brickGrid;
		for (let obj of arr){
			let bucket = brickGrid.getBucket(obj);
			for (let br of bucket){
				let resp = br.checkSpriteHit(obj)
				if (resp[0])
					br.onSpriteHit(obj, resp[1], resp[2]);
			}
		}
	}

	collide(projType, recieveType){
		let arr1 = (projType == "balls") ?
			this.activeBalls() : this[projType].children;

		let arr2 = this[recieveType].children;

		for (let obj1 of arr1){
			for (let obj2 of arr2){
				let resp = obj2.checkSpriteHit(obj1);
				if (resp[0])
					obj2.onSpriteHit(obj1, resp[1], resp[2]);
			}
		}
	}

	//collision -> update objects -> add new objects
	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
		
		//update Brick Grid
		this.brickGrid.refresh();

		//collision stuff
		this.collide("balls", "paddles");
		this.collide("menacers", "paddles");

		this.collideBrick("balls");
		this.collideBrick("menacers");
		this.collideBrick("projectiles");

		this.collide("balls", "enemies");
		this.collide("menacers", "enemies");
		this.collide("projectiles", "enemies");

		this.collide("powerups", "paddles");

		//update all layers in the game layer
		for (let name of this.activeLayers){
			for (let obj of this[name].children){
				obj.update(delta);
			}
		}

		//update brick movement patches
		manageBrickMovement(delta);

		//update, remove, and add new callbacks
		let active = [];
		for (let cb of this.callbacks){
			cb.update(delta);
			if (cb.isDead())
				cb.activate();
			else
				active.push(cb);
		}
		this.callbacks = active.concat(this.newCallbacks);
		this.newCallbacks = [];

		//remove all dead objects
		//is this too slow?
		for (let name of this.activeLayers){
			let cont = this[name];
			let dead = [];
			for (let obj of cont.children){
				if (obj.isDead())
					dead.push(obj);
			}
			for (let obj of dead){
				cont.removeChild(obj);
				obj.onDeath();
				obj.destructor();
			}
		}

		//add the new objects
		for (let name of this.activeLayers){
			let arr = this.newObjects[name];
			if (arr.length != 0){
				let cont = this[name];
				for (let obj of arr)
					cont.addChild(obj);
				arr.length = 0; //clear the array?
			}
		}

		//count balls
		let numBalls = this.balls.children.length;
		if (numBalls == 0){
			let ball = new Ball(0, 0, 0.4, 0);
			this.add("balls", ball);
			let paddle = this.paddles.children[0];
			paddle.attachBall(ball, true);
		}

		this.ballFling();
	}
}

class Gate extends Sprite{
	constructor(x, y){
		super(null, x, y);
		this.scale.set(1);

		let y_anchor = 1;

		let left = makeSprite("gate_left");
		left.anchor.set(1, y_anchor);
		left.scale.set(2);
		left.x = 0;
		let right = makeSprite("gate_right");
		right.anchor.set(0, y_anchor);
		right.scale.set(2);
		right.x = 0;
		//middle is the "hole" that appears when
		//the gates open
		let middle = makeSprite("gate_slice");
		middle.anchor.set(0.5, y_anchor);
		middle.scale.set(0, 2);
		middle.x = 0;
		middle.tint = 0x000000;

		this.gateSpd = 0.05;
		this.openTimer = null;
		//open, closed, opening, closing
		this.state = "closed";
		this.enemy = null;

		this.addChild(middle);
		this.addChild(left);
		this.addChild(right);
		this.left = left;
		this.right = right;
		this.middle = middle;
	}

	isVacant(){
		return (this.state == "closed");
	}

	addEnemy(enemy){
		this.enemy = enemy;
		enemy.x = this.x;
		enemy.y = this.y - 16 - enemy.height/2;
		this.open(enemy.width);
	}

	//make the enemy descend from the hole
	deployEnemy(){
		let enemy = this.enemy;
		//start closing roughly 0.5 secs after the
		//enemy exits the gate
		this.openTimer = enemy.height / enemy.vy + 500;

		game.emplace("enemies", enemy);
		this.enemy = null;
	}

	open(width){
		this.state = "opening";
		this.openWidth = width/2 + 2;
	}

	close(){
		this.state = "closing";
	}

	update(delta){
		let spd = this.gateSpd;
		let right = this.right;
		let left = this.left;
		let middle = this.middle;
		if (this.state == "opening"){
			right.x += delta * spd;
			if (right.x >= this.openWidth){
				right.x = this.openWidth;
				this.state = "open";
				if (this.enemy)
					this.deployEnemy();
			}
		}
		else if (this.state == "closing"){
			right.x -= delta * spd;
			if (right.x <= 0){
				right.x = 0;
				this.state = "closed";
			}
		}
		else if (this.state == "open"){
			if (this.openTimer !== null){
				this.openTimer -= delta;
				if (this.openTimer <= 0){
					this.openTimer = null;
					this.close();
				}
			}
		}


		left.x = -right.x;
		middle.scale.x = right.x*2;
	}
}

class Callback{
	constructor(time, func, name=""){
		this.timer = time;
		this.func = func;
		this.name = name;
	}

	isDead(){
		return (this.timer <= 0);
	}

	activate(){
		this.func();
	}

	update(delta){
		this.timer -= delta;
	}
}

//TODO: Combine PlayButton and Editorbutton into same class
class PlayButton extends PIXI.Sprite{
	constructor(parentState, texstr, x, y, scale){
		super(media.textures[texstr]);
		this.position.set(x, y);
		this.scale.set(scale);
		this.parentState = parentState;

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
		this.on("pointerover", (e) => {this.pointerOver(e);});
		this.on("pointerout", (e) => {this.pointerOut(e);});
	}

	pointerDown(e){}

	pointerOver(e){}

	pointerOut(e){}
}

class PowerupButton extends PlayButton{
	constructor(parentState, x, y, scale, id){
		let tex = "powerup_default_" + id;
		super(parentState, tex, x, y, scale);
		this.id = id;

		if (!powerupFunc[id])
			this.tint = 0x777777;
	}

	pointerDown(e){
		let state = this.parentState;
		let paddle = state.paddles.children[0];
		let x = paddle.x;
		let y = paddle.y - 100;
		if (cheats.instant_powerups)
			y = paddle.y;
		state.emplace("powerups", new Powerup(x, y, this.id));
	}

	pointerOver(e){
		let tooltip = this.parentState.tooltip;
		if (tooltip.powId === null){
			tooltip.text = powerupNames[this.id];
			tooltip.powId = this.id;
		}
	}

	pointerOut(e){
		let tooltip = this.parentState.tooltip;
		if (tooltip.powId === this.id){
			tooltip.text = "";
			tooltip.powId = null;
		}
	}
}

class EnemyButton extends PlayButton{
	constructor(parentState, x, y, id){
		let i = Math.floor(id/6);
		let j = (id % 6);
		let tex = `editorenemy_${i}_${j}`;
		super(parentState, tex, x, y, 2);
		this.enemyId = id;
	}

	pointerDown(e){
		let state = this.parentState;
		let id = this.enemyId;
		if (id < 6){
			let dropper = new Dropper(id);
			state.spawnEnemy(dropper);
		}
	}
	
}

//TODO: move this to a separate file
class Checkbox extends PIXI.Container{
	constructor(x, y, text, initialValue, func){
		super();
		this.x = x;
		this.y = y;
		this.checkState = initialValue;

		//create checkbox graphic
		let side = 16;
		let pad = 4;
		let side2 = side - pad*2;
		let outer = new PIXI.Graphics();
		let inner = new PIXI.Graphics();
		outer.beginFill(0xFFFFFF);
		outer.drawRect(0, 0, side, side);
		inner.beginFill(0x000000);
		inner.drawRect(pad, pad, side2, side2);
		inner.visible = this.checkState;
		this.addChild(outer, inner);
		this.outer = outer;
		this.inner = inner;

		//create label
		let label = new PIXI.Text(text, {
			fontSize: 16,
			fill: 0x000000
		});
		label.x = side + 4;
		label.y = 0;
		this.addChild(label);
		this.label = label;

		this.activateFunc = func;

		//hitbox should be based on outer box
		outer.interactive = true;
		outer.on("pointerdown", (e) => {this.pointerDown(e);});
	}

	pointerDown(e){
		if (this.checkState){
			this.checkState = false;
			this.inner.visible = false;
		}
		else{
			this.checkState = true;
			this.inner.visible = true;
		}
		this.activateFunc(this.checkState);
	}
}