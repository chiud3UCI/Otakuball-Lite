var cheats = {
	enabled: false, //will enable cheats in Play Mode
	_disable_pit: true,
	_instant_powerups: true,
	_fling_existing: false,
	_show_forbidden: false,
	_disable_powerup_spawning: false,

	get disable_pit(){
		return this.enabled && this._disable_pit;
	},
	get instant_powerups(){
		return this.enabled && this._instant_powerups;
	},
	get fling_existing(){
		return this.enabled && this._fling_existing;
	},
	get show_forbidden(){
		return this.enabled && this._show_forbidden;
	},
	get disable_powerup_spawning(){
		return this.enabled && this._disable_powerup_spawning;
	},
}

//I chose to use a class approach instead of a singleton
//because I want to make sure everything in this instance
//is cleared when the player exits the playstate
class PlayState{
	//mode is ["test", "play", "playlist", "campaign"]
	//arg is based on mode and is either a Level, list of Levels,
	//   or a campaign object
	constructor(mode, arg){
		this.mode = mode;

		if (mode == "test"){
			this.prevCheatEnabled = cheats.enabled;
			cheats.enabled = true;
		}

		this.windowTitle = "Playing";

		let level;
		if (mode == "test" || mode == "play")
			level = arg;

		//initialize object lists based on draw order
		//you can initialize as many arbitrary layers as needed
		let layerNames = [
			"background",
			"game",
			"walls",
			"monitors",
			"hud",
		];

		//these layers will be put inside the game layer
		//in order to add shadows
		let gameLayerNames = [
			"borders",
			"specials1",
			"bricks",
			"specials2",
			"paddles",
			"projectiles",
			"particles",
			"powerups",
			"enemies",
			"menacers",
			"ball_underlay",
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
		//apply mask to bricks only?
		//TODO: Make sure this mask stays on after
		//The INTRO SWEEPER disappears
		this.bricks.mask =
			new Mask(DIM.lwallx, DIM.ceiling, DIM.boardw, DIM.boardh);

		//callbacks are special because they're not sprites
		this.callbacks = [];
		this.newCallbacks = [];

		//add a shadow effect to the game layer
		let dropShadow = new PIXI.filters.DropShadowFilter({
			blur: 0,
			quality: 0,
			alpha: 0.5,
			distance: 8 * Math.SQRT2,
			rotation: 45,
		});
		//replace blur filter with a filter that does nothing
		//in order to stop it from blurring the shadow
		dropShadow._blurFilter = new PIXI.Filter();
		this.game.filters = [dropShadow];
		
		//create background
		// let bg = new PIXI.Graphics();
		// bg.beginFill(0x000080);
		// bg.drawRect(DIM.lwallx, DIM.ceiling, DIM.boardw, DIM.boardh);
		// this.add("background", bg);

		//create walls
		let walls = new PIXI.Graphics();
		walls.beginFill(0xAAAAAA);
		//take in account of borders
		let bw = 16; //border width
		walls.drawRect(0, 0, DIM.wallw-bw, DIM.h);
		walls.drawRect(DIM.rwallx+bw, 0, DIM.wallw-bw, DIM.h);
		walls.drawRect(DIM.lwallx-bw, 0, DIM.boardw+bw*2, DIM.ceiling-bw);

		this.add("walls", walls);

		//create border and gates
		let border = new Sprite(
			"border",
			DIM.w/2,
			DIM.ceiling + DIM.boardh/2 - 8
		);
		this.add("borders", border);
		this.border = border;
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

		this.state = null;
		if (mode == "test")
			this.setState("playing");
		else
			this.setState("intro");

		this.ballCount = 0;

		//create powerup spawner
		this.powerupSpawner = new PowerupSpawner(
			GLOBAL_POWERUP_CHANCE,
			DEFAULT_WEIGHTS,
		);

		//Text
		let text = "";
		if (mode == "test")
			text = "Test Mode";
		else
			text = "Otaku-Ball";
		this.add("hud", printText(
			text, "windows", 0x000000, 2, 10, 10
		));

		//Stop Button
		let butt = new Button(10, 45, 150, 50);
		butt.add(makeSprite("editorbutton_2_1", 3, 5, -2));
		butt.add(printText(
			"Stop","arcade", 0x000000, 1.5, 55, 10
		));
		butt.onClick = function(){
			game.pop();
		}
		this.add("hud", butt);

		//score display
		let scoreDisplay = new PIXI.Container();
		scoreDisplay.position.set(DIM.lwallx, 10);
		let digits = new PIXI.Container();
		digits.position.set(0, 30);
		//draw each digit individually to make it monospaced
		for (let i = 0; i < 8; i++){
			digits.addChild(printText(
				"0", "arcade", 0x000000, 1.5, i*24, 0
			));
		}
		scoreDisplay.addChild(digits);
		scoreDisplay.digits = digits;
		scoreDisplay.addChild(printText(
			"Score", "arcade", 0x000000, 1.5, 0, 0
		));
		this.add("hud", scoreDisplay);
		this.scoreDisplay = scoreDisplay;
		this.setScore(0);

		//lives display
		//lives will decrement at the start of the death state
		//livesDisplay will update after the death state
		this.lives = 3;
		let livesDisplay = new PIXI.Container();
		livesDisplay.position.set(DIM.lwallx, DIM.h - 16);
		this.add("hud", livesDisplay);
		this.livesDisplay = livesDisplay;
		this.updateLivesDisplay();
		this.initOtherInfo();

		//testing/cheat stuff
		if (cheats.enabled){
			this.initPowerupButtons();
			this.initEnemyButtons();
			this.initCheckboxes();
			this.livesDisplay.visible = false;
		}

		this.stateName = "playstate";
	}

	destructor(){
		if (this.mode == "test"){
			cheats.enabled = this.prevCheatEnabled;
		}
		stopAllSounds();
	}

	//Either pops itself or replace itself with a new
	//PlayState with the next level
	nextLevel(){
		game.pop();
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
						br.gridDat.i = i;
						br.gridDat.j = j;
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


			get(i, j){
				return this.grid[i][j];
			},

			//checks if grid cell is empty
			//if includeMoving if false, then it will
			//ignore moving bricks
			isEmpty(i, j, includeMoving=false){
				if (!boundCheck(i, j))
					return false;
				if (includeMoving && this.grid[i][j].length > 0)
					return false;
				for (let br of this.grid[i][j]){
					if (!br.gridDat.move)
						return false;
				}
				return true;
			},

			//inserts a Null Brick that disappears by the next frame
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
		powerPanel.x = DIM.rwallx + 10;
		powerPanel.y = 0;
		this.add("hud", powerPanel);
		this.powerPanel = powerPanel;

		let title = new PIXI.Text("Powerup Spawner", {
			fontSize: 16,
			fill: 0x000000,
			fontWeight: "bold",
			// wordWrap: true,
			// wordWrapWidth: 100,
		});
		title.position.set(20, 45);
		powerPanel.addChild(title);

		let buttonOrder = [
			["Ball Addition", [
				21, 33, 68, 70, 72, 88, 109, 111,  
			]],
			["Ball Modify", [
				0, 1, 3, 9, 10, 17, 18, 22, 25, 26,
				29, 31, 35, 37, 39, 42, 45, 50, 55, 56, 
				58, 61, 65, 73, 74, 80, 83, 96, 97, 101, 
				102, 120, 121, 123, 126, 129, 131, 133, 
			]],
			["Paddle Weapon", [
				5, 8, 19, 23, 27, 41, 49, 51, 59,  
				60, 66, 81, 89, 95, 99, 108, 127,
			]],
			["Paddle Modify", [
				4, 13, 14, 15, 28, 30, 36, 38, 40,
				44, 46, 48, 64, 75, 76, 79, 84,
				85, 90, 91, 92, 98, 110, 118, 124, 130, 134
			]],
			["Brick-Related", [
				2, 11, 16, 20, 24, 34, 43, 47, 62, 77, 78,
				87, 86, 104, 106, 112, 113, 115, 116, 117, 119, 
				125, 128, 132,
			]],
			["Other", [
				6, 7, 12, 32, 48, 52, 53, 54, 57, 63,  
				67, 69, 71, 82, 93, 94, 100, 103, 105, 
				107, 114, 122
			]],
		];

		let wrap = 5;
		let scale = 1.5;
		let dx = 16 * scale;
		let dy = 8 * scale;
		let x0 = 20;
		let y0 = DIM.ceiling - 20;
		let yoff = 0;
		this.powerButtons = [];
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
				this.powerButtons.push(butt);
			}
			yoff += 5 + (Math.floor((arr.length-1)/wrap) + 1) * dy;
		}

		//create tooltip
		//TOODO: turn tooltip into a class
		// let tooltip = new PIXI.Text("Tooltip", {
		// 	fontSize: 24,
		// 	fill: 0x000000
		// });
		let tooltip = printText(
			"",
			"arcade",
			0x000000,
			1,
			DIM.w/2,
			10
		);
		// tooltip.x = DIM.lwallx + 150;
		// tooltip.y = 20;
		tooltip.powId = null;
		this.add("hud", tooltip);
		this.tooltip = tooltip;
	}

	initEnemyButtons(){
		let panel = new PIXI.Container();
		panel.position.set(10, 150);

		let title = new PIXI.Text("Enemy Spawner", {
			fontSize: 16,
			fill: 0x000000,
			fontWeight: "bold"
		});
		title.position.set(0, 0);
		panel.addChild(title);

		for (let i = 0; i < 10; i++){
			let x = (i % 6) * 24;
			let y = 25 + (Math.floor(i/6) * 24);
			let butt = new EnemyButton(this, x, y, i);
			panel.addChild(butt);
		}
		this.add("hud", panel);
	}

	initCheckboxes(){
		let ps = this;
		let x = 20;
		let y = DIM.ceiling + 150;
		function create(dy, var_name, text, font_size=16, func=null){
			var_name = "_" + var_name;
			let curr_val = cheats[var_name];
			let func2 = function(val){
				cheats[var_name] = val;
				func?.();
			};
			let cb = new Checkbox(x, y, text, curr_val, func2);
			cb.label.style.fontSize = font_size;
			ps.add("hud", cb);
			y += dy;
		}

		let text = "Disable Pit";
		create(25, "disable_pit", text);

		text = "Instant Powerups";
		create(25, "instant_powerups", text);

		text = "ON: Fling Existing Ball";
		text += "\nOFF: Fling New Ball";
		text += "\n(Right Click to Fling)";
		create(50, "fling_existing", text, 12);

		text = "Show Forbidden Bricks";
		create(25, "show_forbidden", text, 12, () => {
			if (game.top.stateName == "playstate"){
				for (let br of game.get("bricks")){
					if (br.brickType == "forbidden")
						br.updateAppearance();
				}
			}
		});

		text = "Disable Normal Brick";
		text += "\nPowerup Drops";
		create(50, "disable_powerup_spawning", text, 12);
	}

	//score has 8 digits
	setScore(score){
		score = Math.max(0, Math.min(99999999, score));
		this.score = score;

		let digits = this.scoreDisplay.digits.children;
		let str = String(score);
		let n = str.length;
		for (let i = 0; i < n; i++){
			let digit = digits[8-n+i];
			digit.text = str[i];
			digit.tint = 0x000000;
		}
		for (let i = 0; i < 8-n; i++){
			let digit = digits[i];
			digit.text = "0";
			digit.tint = 0x666666;
		}
	}

	addScore(score){
		this.setScore(this.score + score);
	}
	
	incrementScore(score){
		this.addScore(score);
	}

	updateLivesDisplay(){
		let lives = this.lives;
		let display = this.livesDisplay;
		display.removeChildren();
		let count = lives;
		if (count >= 6)
			count = 1;
		for (let i = 0; i < count; i++){
			let life = makeSprite("paddlelife", 2, i*36, 0);
			display.addChild(life);
		}
		if (lives >= 6){
			let text = printText(
				String(lives),
				"arcade",
				0xFFFFFF,
				1, 34, -2
			);
			display.addChild(text);
		}
	}

	initOtherInfo(){
		let info = new PIXI.Container();
		info.position.set(10, 105);
		this.info = info;
		this.add("hud", info);
		info.add = function(name, obj){
			this[name] = obj;
			this.addChild(obj);
		};
		let create = (x, y) => 
			printText("", "windows", 0x000000, 1, x, y);

		info.add("ball_count", create(0, 0));
		info.add("ball_speed", create(0, 15));
		info.add("bricks", create(0, 30));

		this.updateOtherInfo();
	}

	//remaining bricks will be calculated before-hand
	updateOtherInfo(remaining=0){
		let info = this.info;

		let balls = this.get("balls");

		let count = balls.length;
		let speed = 0;
		for (let ball of balls)
			speed = Math.max(speed, ball.getSpeed());
		speed = Math.floor(speed * 1000);

		info.ball_count.text = "# balls:  " + count;
		info.ball_speed.text = "ball speed:  " + speed;
		info.bricks.text = "remaining bricks:  " + remaining;
	}

	//adds objects at the bottom of the update loop
	//so it doesn't cause any problems with iteration
	emplace(name, obj){
		let arr = this.newObjects[name];
		if (arr === undefined){
			console.error("invalid name");
			return;
		}
		//limit the number of balls
		if (name == "balls" && this.ballCount + arr.length >= 100)
			return;
		arr.push(obj);
	}

	//retrieves the list of objects based on layer name
	//if includeNew is true, also go through new objects
	get(name, includeNew=false){
		let objects = this[name].children;
		if (!includeNew)
			return objects;

		//create an generator that iterates through
		//objects and newObjects sequentially
		let newObjects = this.newObjects[name];
		let generator = function*(){
			for (let obj of objects)
				yield obj;
			for (let obj of newObjects)
				yield obj;
		};
		return generator();

	}

	//See Monitor class for info on parameters
	createMonitor(name, containerName, ...properties){
		//prevent duplicate monitors
		if (this.searchMonitor(name))
			return null;

		let monitor = new Monitor(...arguments);

		//its recommended to create the monitors after
		//setting the powerup components so the monitor
		//will start with the correct value
		monitor.update();

		this.monitors.addChild(monitor);
		this.repositionMonitors();

		return monitor;
	}

	repositionMonitors(monitor){
		for (let [i, m] of this.monitors.children.entries())
			m.position.set(20, 400 + i*20);
	}

	searchMonitor(name){
		for (let m of this.monitors.children){
			if (m.name == name)
				return m;
		}
		return null;
	}

	//delete monitors that matches all arguments
	killMonitor(contName, compName){
		for (let m of this.monitors.children){
			if (m.contName == contName && m.compName == compName)
				m.kill();
		}
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

	//spawns an enemy through a random vacant gate
	//will do nothing if all gates are occupied by enemies
	//if gateIndex is provided, spawn enemy in targeted gate only
	spawnEnemy(enemy, gateIndex=null){
		let gates = this.gates;

		if (gateIndex !== null){
			if (gates[gateIndex].isVacant())
				gates[gateIndex].addEnemy(enemy);
			return;
		}

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
		let x = DIM.lwallx;
		let y = DIM.ceiling;
		let w = DIM.boardw;
		let h = DIM.boardh;

		//make background extend past the background
		//to fill in the intro sequence
		let [color, tile] = level.bg;
		let bg = new PIXI.Graphics()
			.beginFill(color)
			.drawRect(x-16, y-16, w+32, h+32);
		if (tile){
			let tex = media.textures[tile];
			let sprite = new PIXI.TilingSprite(
				tex, w/2 + 64, h/2 + 64);
			sprite.scale.set(2);
			sprite.position.set(x-64, y-64);
			bg.addChild(sprite);
		}
		this.add("background", bg);
		
		for (let [i, j, id, patch] of level.bricks){
			let {brickType, args} = brickData.lookup[id];
			let brickClass = brickClasses[brickType];
			let pos = getGridPosInv(i, j);
			let args2 = pos.concat(args);
			if (brickType == "SlotMachineBrick")
				args2.push(level.slotPowerups);
			let br = new brickClass(...args2);
			if (patch)
				br.initPatches(patch);
			this.add("bricks", br);
		}

		let enemy = level.enemies;
		if (!enemy)
			this.spawner = null;
		else
			this.spawner = new EnemySpawner(this, enemy[0], enemy[1]);
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
	*activeBalls(including_parachute=false){
		for (let ball of this.balls.children){
			if (ball.isActive() || (including_parachute && ball.parachute))
				yield ball;
		}
	}

	//collision with bricks are special
	//due to spatial partitioning
	collideBrick(objType){
		let arr = (objType == "balls") ?
			this.activeBalls() : 
			this[objType].children;

		let brickGrid = this.brickGrid;
		for (let obj of arr){
			let bucket = brickGrid.getBucket(obj);
			for (let br of bucket){
				if (obj.canHit(br)){
					let resp = br.checkSpriteHit(obj)
					if (resp[0])
						br.onSpriteHit(obj, resp[1], resp[2]);
				}
			}
		}
	}

	collide(projType, recieveType){
		let arr1 = (projType == "balls") ?
			this.activeBalls(recieveType == "paddles") : 
			this[projType].children;

		let arr2 = this[recieveType].children;

		for (let obj1 of arr1){
			for (let obj2 of arr2){
				if (obj1.canHit(obj2)){
					let resp = obj2.checkSpriteHit(obj1);
					if (resp[0])
						obj2.onSpriteHit(obj1, resp[1], resp[2]);
				}
			}
		}
	}

	setState(name){
		if (this.state && this.state.destructor)
			this.state.destructor();

		this.state = new PlayState.states[name](this);
	}

	updateState(delta){
		if (!this.state)
			return true;
		return this.state.update(delta);
	}

	//collision -> update objects -> add new objects
	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}

		if (!this.updateState(delta)){
			playQueuedSounds();
			return;
		}
		
		//update Brick Grid
		this.brickGrid.refresh();

		//collision stuff
		this.collide("balls", "paddles");
		this.collide("menacers", "paddles");
		this.collide("projectiles", "paddles");

		this.collideBrick("balls");
		this.collideBrick("menacers");
		this.collideBrick("projectiles");

		this.collide("balls", "enemies");
		this.collide("menacers", "enemies");
		this.collide("projectiles", "enemies");

		this.collide("powerups", "paddles");

		//update all objects in the game layer
		for (let name of this.activeLayers){
			for (let obj of this[name].children){
				obj.update(delta);
			}
		}

		//update brick movement patches
		manageBrickMovement(delta);

		//update enemy spawner
		this.spawner?.update(delta);

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
				if (obj.shouldBeRemoved())
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

		//update and remove monitors
		let deadMonitors = [];
		for (let m of this.monitors.children){
			m.update();
			if (m.isDead())
				deadMonitors.push(m);
		}
		if (deadMonitors.length > 0){
			this.monitors.removeChild(...deadMonitors);
			this.repositionMonitors();
		}

		//count balls
		let ballCount = this.balls.children.length;
		this.ballCount = ballCount;
		if (ballCount == 0){
			let paddle = this.paddles.children[0];
			paddle.normal();

			let ball = new Ball(0, 0, 0.4, 0);
			this.add("balls", ball);
			paddle.attachBall(ball, true);
			if (this.mode != "test")
				this.setState("death");
		}

		//count remaining essential bricks
		let remaining = 0;
		for (let br of this.get("bricks")){
			if (br.essential)
				remaining++;
		}

		if (this.mode == "play" && remaining == 0)
			this.setState("victory");

		//update other info
		this.updateOtherInfo(remaining);

		if (cheats.enabled)
			this.ballFling();

		//activate queued sounds
		playQueuedSounds();

		// this.shockifyTest(delta);
	}

	shockifyTest(delta){
		if (!this.shock){
			this.shock = new PIXI.Graphics();
			this.stage.addChild(this.shock);
			this.shockTimer = 0;
			this.maxShockTimer = 1/30 * 1000;
		}
		this.shockTimer -= delta;
		if (this.shockTimer <= 0){
			this.shockTimer += this.maxShockTimer;
			this.shock.clear();
			let colors = [0xFFFFFF, 0xFFFF00, 0x00FFFF];
			for (let color of colors){
				shockify(this.shock,
					DIM.lwallx + 20, DIM.h/2 + 100,
					DIM.rwallx - 20, DIM.h/2,
					{
						color: color,
					}
				);
			}
		}
	}
}

PlayState.states = {
	playing: class{
		constructor(ps){
			this.ps = ps;
		}
		//handled in PlayState.update()
		update(delta){
			return true;
		}
	},

	intro: class{
		//ps is playstate
		constructor(ps){
			this.ps = ps;

			this.sweeperActivated = false;

			ps.paddles.visible = false;
			ps.balls.visible = false;

			let cx = DIM.width/2;
			let cy = DIM.ceiling + DIM.boardh/2 - 8;
			let left = new Sprite(
				"border_left", DIM.rwallx + 8, cy);
			let right = new Sprite(
				"border_left", DIM.lwallx - 8, cy);
			let up = new Sprite(
				"border_up", cx, DIM.height - 8);
			let spd = 0.4;
			left.vx = -spd;
			right.vx = spd;
			up.vy = -spd * (DIM.boardh+8)/(DIM.boardw+24);
			ps.borders.addChild(left, right, up);
			this.introBorders = [left, right, up];

			let sweeper = new PIXI.Graphics()
				.beginFill(0x888888)
				.drawRect(0, 0, DIM.boardw, 32);
			sweeper.position.set(DIM.lwallx, DIM.height);
			sweeper.vy = -.8;
			ps.walls.addChild(sweeper);
			this.sweeper = sweeper;

			this.oldBrickMask = ps.bricks.mask;
			this.sweeperMask = new Mask(
				DIM.lwallx, DIM.ceiling, DIM.boardw, 0);
			ps.bricks.mask = this.sweeperMask;

			ps.border.visible = false;
			for (let gate of ps.gates)
				gate.visible = false;
		}
		destructor(){
			let ps = this.ps;
			ps.paddles.visible = true;
			ps.balls.visible = true;
			ps.border.visible = true;
			for (let gate of ps.gates)
				gate.visible = true;
			ps.borders.removeChild(...this.introBorders);
			ps.walls.removeChild(this.sweeper);
			ps.bricks.mask = this.oldBrickMask;
		}
		update(delta){
			let ps = this.ps;

			if (mouse.m1 == 1){
				ps.setState("playing");
				mouse.m1 = 0;
				return true;
			}
			if (!this.sweeperActivated){
				let intro = this.introBorders;
				for (let border of intro)
					border.update(delta);
				let left = intro[0];
				if (left.x < DIM.lwallx - 8){
					this.sweeperActivated = true;
					for (let border of intro)
						border.visible = false;
					ps.border.visible = true;
					for (let gate of ps.gates)
						gate.visible = true;
				}
			}
			else{
				let sweeper = this.sweeper;
				sweeper.y += sweeper.vy * delta;
				if (sweeper.y <= DIM.ceiling){
					sweeper.y = DIM.ceiling;
					sweeper.vy *= -1;
				}

				if (sweeper.vy > 0){
					this.sweeperMask.resize(
						DIM.lwallx,
						DIM.ceiling,
						DIM.boardw,
						sweeper.y - DIM.ceiling
					);
					if (sweeper.y > DIM.height)
						ps.setState("respawn");
				}
			}
			return false;
		}
	},

	respawn: class{
		constructor(ps){
			this.ps = ps;

			this.ballRespawn = false;
			ps.balls.visible = false;
			let paddle = ps.paddles.children[0];
			paddle.y = DIM.height + 8;
			let wave = {
				A: paddle.y - Paddle.baseLine, //Amplitude
				C: Paddle.baseLine, //Constant
				F: 2 * Math.PI, //frequency (1/period)
				t: 0, //time elapsed (in seconds not ms)
			};
			//time limit for stopping paddle
			wave.T = 1.25 * 2*Math.PI / wave.F;
			this.wave = wave;

			this.spawnCircles = new PIXI.Graphics();
			this.spawnCircles.dist = Paddle.baseLine - DIM.ceiling;
			ps.particles.addChild(this.spawnCircles);

			let text = printText("ROUND 1\nREADY",
				"arcade", 0xFFFFFF, 2, DIM.w/2, DIM.h*3/4);
			text.align = "center";
			text.anchor.set(0.5, 0.5);
			ps.hud.addChild(text);
			this.text = text;
		}
		destructor(){
			let ps = this.ps;
			let paddle = ps.paddles.children[0];
			paddle.setPos(paddle.x, Paddle.baseLine);
			//update stuck balls so they don't "teleport"
			for (let [ball, offset] of paddle.stuckBalls){
				let x = paddle.x + offset;
				let y = paddle.y - 8 - ball.shape.radius;
				ball.moveTo(x, y);
			}
			ps.balls.visible = true;
			ps.particles.removeChild(this.spawnCircles);
			ps.hud.removeChild(this.text);
		}
		update(delta){
			let ps = this.ps;

			if (mouse.m1 == 1){
				ps.setState("playing");
				mouse.m1 = 0;
				return true;
			}
			let paddle = ps.paddles.children[0];
			if (!this.ballRespawn){
				let cos = Math.cos;
				let exp = Math.exp;
				let PI = Math.PI;

				let {A, C, F, T, t} = this.wave;
				t += delta/1000;
				let dy = A*exp(-t)*cos(PI+(F*t));
				paddle.y = Paddle.baseLine - dy;
				paddle.update(delta);
				this.wave.t = t;

				if (t >= T){
					paddle.setPos(paddle.x, Paddle.baseLine);
					this.ballRespawn = true;
				}
			}
			else{
				let ball = ps.balls.children[0];
				let circles = this.spawnCircles;
				circles.position.set(ball.x, ball.y);
				let d = circles.dist;
				d -= delta * 0.8;
				d = Math.max(0, d);
				circles.dist = d;

				let r = 7;
				circles.clear()
					.beginFill(0xFFFFFF)
					.drawCircle(-d, 0, r)
					.drawCircle(d, 0, r)
					.drawCircle(0, -d, r);

				if (d <= 0)
					ps.setState("playing");
			}

			return false;
		}
	},

	death: class{
		constructor(ps){
			this.ps = ps;
			ps.lives--;

			this.timer = 3000;

			this.paddleExplode = false;

			ps.paddles.visible = false;
			ps.balls.visible = false;

			let paddle = ps.paddles.children[0];
			let deathPaddle = new Paddle();
			deathPaddle.setPos(paddle.x, paddle.y);
			ps.particles.addChild(deathPaddle);
			this.deathPaddle = deathPaddle;
			Object.assign(deathPaddle, {
				origin: [paddle.x, paddle.y],
				growAccel: -0.00075,
				growVel: 0.25,
				shakeTimer: 0,
				shakeTimerMax: 500,
				shakeMag: 3,
				shakeDelayMax: 30,
				shakeDelay: 0
			});

			let glow = media.shaders.glow;
			deathPaddle.filters = [glow];
			glow.uniforms.color = [1, 1, 1];
			glow.uniforms.mag = 0;
			this.glowShader = glow;

			let deathCircles = new PIXI.Graphics();
			deathCircles.position.set(paddle.x, paddle.y);
			deathCircles.time = 0;
			ps.particles.addChild(deathCircles);
			this.deathCircles = deathCircles;

			playSound("paddle_death_1");
		}
		destructor(){
			let ps = this.ps;

			ps.paddles.visible = true;
			ps.balls.visible = true;
			ps.particles.removeChild(this.deathPaddle);
			ps.particles.removeChild(this.deathCircles);
		}
		update(delta){
			let ps = this.ps;

			let dp = this.deathPaddle;
			let dc = this.deathCircles;

			if (!this.paddleExplode){
				let w = dp.paddleWidth;
				if (w > 40){
					w += delta*dp.growVel + delta*delta*dp.growAccel;
					dp.growVel += delta*dp.growAccel;
					w = Math.max(40, w);
					dp._setWidth(w);
				}
				else{
					dp.shakeTimer += delta;
					dp.shakeDelay -= delta;
					if (dp.shakeDelay <= 0){
						dp.shakeDelay = dp.shakeDelayMax;
						let [x0, y0] = dp.origin;
						let ratio = dp.shakeTimer / dp.shakeTimerMax;
						let mag = ratio * dp.shakeMag;
						let rad = Math.random() * 2 * Math.PI;
						let [dx, dy] = Vector.rotate(mag, 0, rad);
						dp.setPos(x0+dx, y0+dy);
					}

					if (dp.shakeTimer >= dp.shakeTimerMax){
						this.paddleExplode = true;
						dp.visible = false;
						playSound("paddle_death_2");
					}
				}
				let u = this.glowShader.uniforms;
				u.mag = Math.min(1, u.mag + delta/600);
			}
			else{
				let dc = this.deathCircles;
				dc.clear().beginFill(0xFFFFFF);
				dc.time += delta;
				let t = dc.time;
				//fast straight circles
				let mag1 = t*0.2 + t*t*0.001;
				for (let i = 0; i < 8; i++){
					let rad = 2*Math.PI * i/8;
					let [x, y] = Vector.rotate(mag1, 0, rad);
					dc.drawCircle(x, y, 8);
				}
				//slow spiral glowing circles
				let mag2 = t*0.6;
				for (let i = 0; i < 8; i++){
					let rad = 2*Math.PI * i/8;
					rad += (0.5/8) + t * 0.001;
					let r = 8 + t*0.03;
					let [x, y] = Vector.rotate(mag2, 0, rad);
					dc.drawCircle(x, y, r);
				}
			}

			this.timer -= delta;
			if (this.timer <= 0){
				if (ps.lives < 0)
					ps.setState("gameover");
				else{
					ps.updateLivesDisplay(ps.lives);
					ps.setState("respawn");
				}
			}

			return false;
		}
	},

	gameover: class{
		constructor(ps){
			this.ps = ps;

			ps.paddles.visible = false;
			ps.balls.visible = false;

			let text = printText("GAME OVER",
				"arcade", 0xFFFFFF, 2, DIM.w/2, DIM.h*3/4);
			text.anchor.set(0.5, 0.5);
			ps.hud.addChild(text);
			this.text = text;
		}
		destructor(){
			let ps = this.ps;
			ps.paddles.visible = true;
			ps.balls.visible = true;
			ps.hud.removeChild(this.text);
		}
		update(delta){
			return false;
		}
	},

	victory: class{
		constructor(ps){
			this.ps = ps;

			this.blackoutDelay = 2000;
			this.blackoutTimerMax = 1000;
			this.blackoutTimer = this.blackoutTimerMax;

			let text = printText("ROUND CLEAR",
				"arcade", 0xFFFFFF, 2, DIM.w/2, DIM.h*3/4);
			text.anchor.set(0.5, 0.5);
			ps.hud.addChild(text);
			this.text = text;

			let black = new PIXI.Graphics();
			black.beginFill(0x000000);
			black.drawRect(0, 0, DIM.w, DIM.h);
			black.alpha = 0;
			ps.add("hud", black);
			this.blackout = black;
		}
		destructor(){
			let ps = this.ps;
			ps.hud.removeChild(this.text);
		}

		update(delta){
			if (this.blackoutDelay > 0){
				this.blackoutDelay -= delta;
				return false;
			}

			if (this.blackoutTimer > 0){
				this.blackoutTimer -= delta;
				let alpha = this.blackoutTimer/this.blackoutTimerMax;
				alpha = Math.max(0, Math.min(1, 1-alpha));
				this.blackout.alpha = alpha;
				return false;
			}

			this.ps.nextLevel();

			return false;
		}
	}
};

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
		enemy.y = this.y - 16 - enemy.shapeHeight/2;
		this.open(enemy.shapeWidth);
	}

	//make the enemy descend from the hole
	deployEnemy(){
		let enemy = this.enemy;
		//start closing roughly 0.5 secs after the
		//enemy exits the gate
		this.openTimer = enemy.shapeHeight / enemy.vy + 500;

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

class Monitor extends PIXI.Container{
	//returns the value from property chaining
	//	will return null if one of the properties is missing
	static getPropertyChain(obj, properties){
		let val = obj;
		for (let prop of properties){
			val = val[prop];
			if (val === null || val === undefined)
				return null;
		}
		return val;
	}

	/**
	 * Alternate properties param: [string[], class]
	 * in order to include an optional class checking. <br>
	 * If doing class checking, make sure the penultimate property
	 * is the object you want to do the class check on
	 * TODO: Use generic functions instead of class checking?
	 * 
	 * @param {string} name - Name of monitor to be displayed
	 * @param {string} containerName - Name of object group such as "balls" or "paddles"
	 * @param {...string} properties - Property chain (example: ["x", "y", "z"] = obj.x.y.z)
	 */
	constructor(name, containerName, ...properties){
		super();

		this.name = name;
		this.containerName = containerName;
		if (Array.isArray(properties[0])){
			this.properties = properties[0].slice();
			this.filterFunc = properties[1];
		}
		else{
			this.properties = properties.slice();
			this.filterFunc = null;
		}

		this.dead = false;

		this.text = printText("", "windows", 0x000000, 1, 0, 0);
		this.addChild(this.text);
	}

	isDead(){
		return this.dead;
	}

	kill(){
		this.dead = true;
	}

	update(){
		let values = [];
		for (let obj of game.get(this.containerName, true)){
			let val = Monitor.getPropertyChain(obj, this.properties);

			if (val === null)
				continue;

			if (this.filterFunc && !this.filterFunc(obj))
				continue;

			values.push(val);
		}
		if (values.length == 0){
			this.kill();
			return;
		}
		let value = Math.max(...values);
		// if (value <= 0){
		// 	this.kill();
		// 	return;
		// }
		this.setValue(value);
	}

	setValue(value){
		value = (value/1000).toFixed(2);
		this.text.text = `${this.name}: ${value}`;
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

class EnemySpawner{
	//there should be at least 1 enemy enabled in enemyArgs
	//otherwise, just set playstate.spawner to null
	constructor(playstate, enemyArgs, timeArgs=[2000, 2000, 8000]){
		this.playstate = playstate;

		this.timer = timeArgs[0];
		this.minDelay = timeArgs[1];
		this.maxDelay = timeArgs[2];

		const map = [
			["dropper_0", [Dropper, 0]],
			["dropper_1", [Dropper, 1]],
			["dropper_2", [Dropper, 2]],
			["dropper_3", [Dropper, 3]],
			["dropper_4", [Dropper, 4]],
			["dropper_5", [Dropper, 5]],
			["dizzy", [Dizzy]],
			["cubic", [Cubic]],
			["gumballtrio", [GumballTrio]],
			["walkblock", [WalkBlock]],
		];

		this.enemyInfo = [];
		//the first enemy arg represents both red and green droppers
		for (let [i, v] of enemyArgs.entries()){
			if (v){
				if (i == 0)
					this.enemyInfo.push(map[0], map[1]);
				else
					this.enemyInfo.push(map[i+1]);
			}
		}
	}

	update(delta){
		this.timer -= delta;
		if (this.timer > 0)
			return;

		this.timer = randRange(this.minDelay, this.maxDelay+1);

		//count the number of each type of enemy
		let count = {
			get(key){
				return this[key] ?? 0;
			},
			inc(key){
				if (this[key] === undefined)
					this[key] = 0;
				this[key]++;
			}
		};
		for (let e of game.get("enemies")){
			let key = e.enemyType;
			if (key == "dropper"){
				key += "_" + e.menacerId;
				if (e.hasDropped)
					continue;
			}
			count.inc(key);
		}
		for (let m of game.get("menacers")){
			let key = "dropper_" + m.menacerId;
			count.inc(key);
		}
		let greenBrick = false;
		for (let br of game.get("bricks")){
			if (br.brickType == "greenmenacer"){
				greenBrick = true;
				break;
			}
		}
		let paddle = game.get("paddles")[0];
		let shadow = paddle.components.shadow !== undefined;

		let choices = [];
		for (let arr of this.enemyInfo){
			let [key, build] = arr;
			//disable certain droppers if they have no effect
			if (key == "dropper_0" && !greenBrick)
				continue;
			else if (key == "dropper_2" && shadow)
				continue;
			//add to pool if there are less than 3 enemies
			//of that type
			if (count.get(key) < 3){
				//push red droppers twice to increase spawn chance
				if (key == "dropper_0")
					choices.push(build, build);
				else
					choices.push(build);
			}
		}

		if (choices.length > 0){
			let build = choices[randRange(choices.length)];
			//TODO: e_class needs dropper argument
			this.playstate.spawnEnemy(new build[0](build[1]));
		}
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
		// let y = DIM.ceiling + 100;
		if (cheats.instant_powerups)
			y = paddle.y;
		state.emplace("powerups", new Powerup(x, y, this.id));
	}

	pointerOver(e){
		let tooltip = this.parentState.tooltip;
		if (tooltip.powId === null){
			tooltip.text = `${this.id} ${powerupNames[this.id]}`;
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

var alt = 1;

class EnemyButton extends PlayButton{
	static data = [
		[Dropper, 0],
		[Dropper, 1],
		[Dropper, 2],
		[Dropper, 3],
		[Dropper, 4],
		[Dropper, 5],
		[Dizzy],
		[Cubic],
		[GumballTrio],
		[WalkBlock],
	];

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
		let build = EnemyButton.data[id];
		state.spawnEnemy(new build[0](build[1]));
		// state.spawnEnemy(new build[0](build[1]), alt);
		// alt = (alt==1)?2:1;
	}
	
}

//TODO: move this to gui.js
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