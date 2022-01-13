//TODO: use localStorage to keep track of cheats configuration?
var cheats = {
	enabled: false, //set manually; will enable cheats in normal play
	enabled2: false, //set by PlayState when testing a level

	flags: {
		disable_pit: true,
		instant_powerups: true,
		fling_existing: false,
		show_forbidden: false,
		disable_powerup_spawning: false,
	},

	setEnabled(value){
		this.enabled = value;
		game.cheatText.visible = value;
	},

	isEnabled(){
		return this.enabled || this.enabled2;
	},

	get(name){
		return this.isEnabled() && this.flags[name];
	},
};

function enableCheats(){
	cheats.setEnabled(true);
}

function disableCheats(){
	cheats.setEnabled(false);
}

function printObjectCounts(){
	let ps = game.top;
	if (!(ps instanceof PlayState)){
		console.log("Currently not in PlayState");
		return;
	}
	for (let name of ps.activeLayers){
		let cont = ps[name];
		console.log(`${name}: ${cont.children.length}`);
	}
}
//works in PlayState and CampaignState only
function beatLevel(allLevels=false){
	let state = game.top;
	if (state instanceof PlayState){
		state.setState("victory");
		if (state.mode == "playlist"){
			if (allLevels)
				state.playlistIndex = state.playlist.length - 1;
		}
		else if (state.mode == "campaign"){
			if (allLevels)
				campaign_save.onVictory(state, 2);
			else
				campaign_save.onVictory(state, 0);
		}
	}
	else if (state instanceof CampaignState){
		campaign_save.updateLevel(allLevels ? 2 : 0);
		state.load();
	}
	else{
		console.log("Cannot be called in this state.");
	}
}

function beatZone(){
	beatLevel(true);
}

//I chose to use a class approach instead of a singleton
//because I want to make sure everything in this instance
//is cleared when the player exits the playstate
class PlayState extends State{
	/*
		mode can be one of ["test", "play", "playlist", "campaign"]
		args will vary based on mode:
			"test": [level object],
			"play": [level object],
			"playlist": [list of level objects, playlist index, previous PlayState instance],
			"campaign": no args needed; global campaign_save will be used instead
	*/
	constructor(mode, ...args){
		super();
		this.mode = mode;

		if (mode == "test")
			cheats.enabled2 = true;

		let titles = {
			test: "Testing",
			play: "Playing",
			playlist: "Playing Playlist",
			campign: "Campaign"
		};
		this.windowTitle = titles[mode];

		//initializing starting values
		let levelStr;
		let lives = 3;
		let score = 0;
		if (mode == "test" || mode == "play")
			levelStr = args[0];
		else if (mode == "playlist"){
			this.playlist = args[0];
			this.playlistIndex = args[1];
			levelStr = this.playlist[this.playlistIndex];
			//get the score and lives from the previous PlayState
			if (args[2]){
				lives = args[2].lives;
				score = args[2].score;
			}
		}
		else if (mode == "campaign"){
			let {data, playlist} = campaign_save;
			levelStr = playlist[1][data.zone_index][1];
			score = data.score;
			lives = data.lives;
		}

		this.timescale = 1;
		this.timewarp = null;

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
		walls.beginFill(PALETTE["main0"]);
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
		this.loadLevel(levelStr);
		this.initBrickGrid();
		this.brickGrid.refresh();

		//create ball
		let ball = new Ball(0, 0, 0.4, 0);
		this.add("balls", ball);
		paddle.attachBall(ball, true);

		this.state = null;
		if (mode == "test"){
			//call each brickClass's static activate function if it exists
			for (let brickClass of Object.values(brickClasses)){
				brickClass.activate?.(this);
			}
			this.setState("playing");
		}
		else
			this.setState("intro");

		this.ballCount = 0;

		//keep track of # of pit blockers
		this.pit_blockers = 0;

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

		//Stop/Exit Button
		let butt = new Button(10, 45, 150, 50);
		if (mode == "test"){
			butt.add(makeSprite("editorbutton_2_1", 3, 5, -2));
			butt.add(printText("Stop", "arcade", 0x000000, 1.5, 56, 10));
		}
		else{
			butt.add(makeSprite("editorbutton_4_2", 2, 12, 7));
			butt.add(printText("Exit", "arcade", 0x000000, 1.5, 60, 10));
		}
		
		butt.onClick = function(){
			game.pop();
		}
		this.add("hud", butt);

		//score display
		this.scoreDisplay = new ScoreDisplay(DIM.lwallx, 10, false);
		this.setScore(score);
		this.setScoreMultiplier(0);
		this.add("hud", this.scoreDisplay);

		//lives display
		//TODO: figure out interface with campaign_save.data.lives
		//lives will decrement at the start of the death state
		//livesDisplay will update after the death state
		this.lives = lives;
		this.livesDisplay = new LivesDisplay(DIM.lwallx, DIM.h - 16);
		this.updateLivesDisplay();
		this.add("hud", this.livesDisplay);

		this.initOtherInfo();

		//testing/cheat stuff
		if (cheats.isEnabled()){
			this.initPowerupButtons();
			this.initEnemyButtons();
			this.initCheckboxes();
			// this.livesDisplay.visible = false;
		}

		this.stateName = "playstate";
	}

	destructor(){
		super.destructor();

		if (this.mode == "test")
			cheats.enabled2 = false;
		stopAllSounds();
		game.setPos(0, 0);

		//call destructors of all objects
		for (let name of this.activeLayers){
			for (let obj of this[name].children){
				obj.destructor?.();
			}
		}
	}

	//Either pops itself or replace itself with a new
	//PlayState with the next level
	nextLevel(){
		let mode = this.mode;
		if (mode == "test" || mode == "play"){
			game.pop();
			return;
		}
		if (mode == "playlist"){
			let playlist = this.playlist;
			let index = this.playlistIndex;
			if (index < playlist.length - 1){
				game.replace(new PlayState("playlist", playlist, index+1, this));
			}
			else
				game.pop();
			return;
		}
		if (mode == "campaign"){
			let level = campaign_save.getNextLevel();
			if (level === null){
				game.pop();
			}
			else{
				game.replace(new PlayState("campaign"));
			}
		}
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

			/**
			 * Returns a single non-moving brick at the grid position
			 * or null if no bricks are found.
			 * There should realisticly be at most one non-moving brick
			 * occupying the grid position.
			 */
			getStatic(i, j){
				for (let br of this.grid[i][j]){
					if (!br.gridDat.move)
						return br;
				}
				return null;
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
		};
	}

	initGates(){
		//top gates
		let gates = [];
		let offsets = [48, 144, 272, 368];
		for (let off of offsets){1
			let x = DIM.lwallx + off;
			let y = DIM.ceiling;
			let gate = new Gate(x, y);
			gates.push(gate);
			this.add("borders", gate);
		}
		this.gates = gates;

		//side gates
		let left = new Gate(DIM.lwallx, DIM.h - 80, "left");
		let right = new Gate(DIM.rwallx, DIM.h - 80, "right");
		this.add("borders", left);
		this.add("borders", right);
		this.sideGates = [left, right];

		//bypass gate
		let bypass = new Bypass(this);
		this.add("borders", bypass);
		this.bypass = bypass;
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
				58, 61, 65, 73, 74, 80, 83, 96, 97, 101, 100,
				102, 120, 121, 123, 126, 129, 131, 133, 
			]],
			["Paddle Weapon", [
				5, 8, 19, 23, 27, 41, 49, 51, 59,  
				60, 66, 81, 89, 95, 99, 108, 127,
			]],
			["Paddle Modify", [
				4, 13, 14, 15, 28, 30, 36, 38, 40,
				44, 46, 75, 76, 79, 84,
				85, 90, 91, 98, 110, 118, 124, 130, 134
			]],
			["Brick-Related", [
				2, 11, 16, 20, 24, 34, 43, 47, 62, 77, 78,
				86, 87, 104, 106, 112, 113, 115, 116, 117, 119, 
				125, 128, 132,
			]],
			["Other", [
				6, 7, 12, 32, 48, 52, 53, 54, 57, 63, 64,  
				67, 69, 71, 82, 92, 93, 94, 103, 105, 
				107, 114, 122
			]],
		];

		//verify that all powerups are covered
		let set = new Set();
		for (let i = 0; i < 135; i++)
			set.add(i);
		for (let [name, arr] of buttonOrder){
			for (let id of arr){
				if (!set.has(id))
					ALERT_ONCE("init powerup button: duplicate id " + id, "duplicate_id");
				set.delete(id);
			}
		}
		if (set.size > 0)
			ALERT_ONCE("init powerup button: missing " + Array.from(set), "missing_id");

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
		function create(dy, flag_name, text, font_size=16, func=null){
			let curr_val = cheats.flags[flag_name];
			let func2 = function(val){
				cheats.flags[flag_name] = val;
				func?.();
			};
			let cb = new Checkbox(x, y, curr_val, func2);
			cb.addLabel(
				new PIXI.Text(text, {fontSize: font_size, fill: 0x000000})
			);
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
		this.scoreDisplay.setScore(score);
	}

	incrementScore(deltaScore){
		deltaScore = Math.floor(deltaScore * (2 ** this.scoreMultiplier));
		this.setScore(this.score + deltaScore);
	}

	//scoreMultiplier is actually the exponent of 2^x
	setScoreMultiplier(mult=0){
		this.scoreMultiplier = mult;
		this.scoreDisplay.setMultiplier(mult);
	}

	updateLivesDisplay(){
		this.livesDisplay.setLives(this.lives);
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
				gates[gateIndex].emplaceSprite("enemies", enemy);
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
		choices[i].emplaceSprite("enemies", enemy);
	}


	loadLevel(levelStr){
		let level = JSON.parse(levelStr);
		this.level = level;
		this.levelStr = levelStr;

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
			let br = new brickClass(...args2);
			br.initialParams = {i, j, id};
			if (patch)
				br.initPatches(patch);
			this.add("bricks", br);
		}
		//after creating all the bricks, call each
		//brick class's static initialize() function if it exists
		//activate() will be called right before the start of the game
		for (let brickClass of Object.values(brickClasses)){
			brickClass.initialize?.(this);
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
			if (cheats.get("fling_existing")){
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

				// if (mouse.m1 == 1){
				// 	let ball2 = ball.clone();
				// 	ball2.setVel(vel.x, vel.y);
				// 	this.add("balls", ball2);
				// 	console.log("launch?");
				// }
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
		this.state.name = name;
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

		//update TimeWarp object if it exists
		this.timewarp?.update(delta);
		//then scale delta with timescale
		delta *= this.timescale;

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
			if (this.mode != "test"){
				this.lives--;
				this.setState("death");
				if (this.mode == "campaign")
					campaign_save.onDeath(this);
			}
		}

		//count remaining essential bricks
		let remaining = 0;
		for (let br of this.get("bricks")){
			if (br.essential)
				remaining++;
		}

		//win the level if there are no more bricks
		if (this.mode != "test" && remaining == 0){
			this.setState("victory");
			if (this.mode == "campaign")
				campaign_save.onVictory(this);
		}

		//update other info
		this.updateOtherInfo(remaining);

		if (cheats.isEnabled())
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
			let paddle = ps.paddles.children[0];
			//make sure paddle's position is synced with mouse
			//position before starting the game
			paddle.update(0);
			paddle.isRespawning = false;
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
			for (let gate of ps.sideGates)
				gate.visible = false;

			let paddle = ps.paddles.children[0];
			paddle.isRespawning = true;
		}
		destructor(){
			let ps = this.ps;
			ps.paddles.visible = true;
			ps.balls.visible = true;
			ps.border.visible = true;
			for (let gate of ps.gates)
				gate.visible = true;
			for (let gate of ps.sideGates)
				gate.visible = true;
			ps.borders.removeChild(...this.introBorders);
			ps.walls.removeChild(this.sweeper);
			ps.bricks.mask = this.oldBrickMask;

			//call each brickClass's static activate function if it exists
			for (let brickClass of Object.values(brickClasses)){
				brickClass.activate?.(ps);
			}
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

			let round = 1;
			if (ps.mode == "playlist")
				round = ps.playlistIndex + 1;
			else if (ps.mode == "campaign"){
				let index = campaign_save.data.zone_index;
				let name = campaign_save.playlist[1][index][0];
				let level_name = name.split("/")[1];
				round = Number(level_name.substring(5));
			}

			let text = printText(`ROUND ${round}\nREADY`,
				"arcade", 0xFFFFFF, 2, DIM.w/2, DIM.h*3/4);
			text.align = "center";
			text.anchor.set(0.5, 0.5);
			ps.hud.addChild(text);
			this.text = text;

			paddle.isRespawning = true;
		}
		destructor(){
			let ps = this.ps;
			let paddle = ps.paddles.children[0];
			paddle.setPos(paddle.x, Paddle.baseLine);
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

			paddle.update(0);

			//manually sync paddle's position to mouse
			//because calling paddle.update() causes issues
			// const mx = mouse.x;
			// const pw = paddle.paddleWidth;
			// const ph = 16;
			// paddle.x = clamp(mx, DIM.lwallx + pw/2, DIM.rwallx - pw/2);

			// for (let [ball, offset] of paddle.stuckBalls){
			// 	let x = paddle.x + offset;
			// 	let y = paddle.y - ph/2 - ball.r;
			// 	ball.moveTo(x, y);
			// }

			return false;
		}
	},

	death: class{
		constructor(ps){
			this.ps = ps;
			// ps.lives--;

			this.timer = 2000;

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
				shakeTimerMax: 250,
				shakeMag: 3,
				shakeDelayMax: 30,
				shakeDelay: 0
			});

			let glow = media.shaders.paddleGlow;
			deathPaddle.filters = [glow];
			glow.uniforms.color = [1, 1, 1];
			glow.uniforms.mag = 0;
			this.glowShader = glow;

			let deathHalves = [];
			this.deathHalves = deathHalves;

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
			let dh = this.deathHalves;

			if (!this.paddleExplode){
				//paddle shrink
				let w = dp.paddleWidth;
				if (w > 40){
					w += delta*dp.growVel + delta*delta*dp.growAccel;
					dp.growVel += delta*dp.growAccel;
					w = Math.max(40, w);
					dp._setWidth(w);
				}
				//paddle shake
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
						//create death particles and add them directly to ps.particles
						let [x0, y0] = dp.origin;
						for (let i = 0; i < 2; i++){
							let sign = (i == 0) ? -1 : 1;
							let half = new Particle("paddle_3_0_left", x0 + sign * 10, y0);
							if (i == 1)
								half.rotation = Math.PI;
							half.vx = sign * 1;
							half.timer = 100; //particle will not die until state becomes "play"
							ps.particles.addChild(half);
							dh.push(half);
						}
					}
				}
				
				//gradually turn white while shrinking/shaking
				let u = this.glowShader.uniforms;
				u.mag = Math.min(1, u.mag + delta/600);
			}
			//update death particles
			for (let half of dh)
				half.update(delta);

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

	// death: class{
	// 	constructor(ps){
	// 		this.ps = ps;
	// 		ps.lives--;

	// 		this.timer = 3000;

	// 		this.paddleExplode = false;

	// 		ps.paddles.visible = false;
	// 		ps.balls.visible = false;

	// 		let paddle = ps.paddles.children[0];
	// 		let deathPaddle = new Paddle();
	// 		deathPaddle.setPos(paddle.x, paddle.y);
	// 		ps.particles.addChild(deathPaddle);
	// 		this.deathPaddle = deathPaddle;
	// 		Object.assign(deathPaddle, {
	// 			origin: [paddle.x, paddle.y],
	// 			growAccel: -0.00075,
	// 			growVel: 0.25,
	// 			shakeTimer: 0,
	// 			shakeTimerMax: 500,
	// 			shakeMag: 3,
	// 			shakeDelayMax: 30,
	// 			shakeDelay: 0
	// 		});

	// 		let glow = media.shaders.paddleGlow;
	// 		deathPaddle.filters = [glow];
	// 		glow.uniforms.color = [1, 1, 1];
	// 		glow.uniforms.mag = 0;
	// 		this.glowShader = glow;

	// 		let deathCircles = new PIXI.Graphics();
	// 		deathCircles.position.set(paddle.x, paddle.y);
	// 		deathCircles.time = 0;
	// 		ps.particles.addChild(deathCircles);
	// 		this.deathCircles = deathCircles;

	// 		playSound("paddle_death_1");
	// 	}
	// 	destructor(){
	// 		let ps = this.ps;

	// 		ps.paddles.visible = true;
	// 		ps.balls.visible = true;
	// 		ps.particles.removeChild(this.deathPaddle);
	// 		ps.particles.removeChild(this.deathCircles);
	// 	}
	// 	update(delta){
	// 		let ps = this.ps;

	// 		let dp = this.deathPaddle;
	// 		let dc = this.deathCircles;

	// 		if (!this.paddleExplode){
	// 			let w = dp.paddleWidth;
	// 			if (w > 40){
	// 				w += delta*dp.growVel + delta*delta*dp.growAccel;
	// 				dp.growVel += delta*dp.growAccel;
	// 				w = Math.max(40, w);
	// 				dp._setWidth(w);
	// 			}
	// 			else{
	// 				dp.shakeTimer += delta;
	// 				dp.shakeDelay -= delta;
	// 				if (dp.shakeDelay <= 0){
	// 					dp.shakeDelay = dp.shakeDelayMax;
	// 					let [x0, y0] = dp.origin;
	// 					let ratio = dp.shakeTimer / dp.shakeTimerMax;
	// 					let mag = ratio * dp.shakeMag;
	// 					let rad = Math.random() * 2 * Math.PI;
	// 					let [dx, dy] = Vector.rotate(mag, 0, rad);
	// 					dp.setPos(x0+dx, y0+dy);
	// 				}

	// 				if (dp.shakeTimer >= dp.shakeTimerMax){
	// 					this.paddleExplode = true;
	// 					dp.visible = false;
	// 					playSound("paddle_death_2");
	// 				}
	// 			}
	// 			let u = this.glowShader.uniforms;
	// 			u.mag = Math.min(1, u.mag + delta/600);
	// 		}
	// 		else{
	// 			let dc = this.deathCircles;
	// 			dc.clear().beginFill(0xFFFFFF);
	// 			dc.time += delta;
	// 			let t = dc.time;
	// 			//fast straight circles
	// 			let mag1 = t*0.2 + t*t*0.001;
	// 			for (let i = 0; i < 8; i++){
	// 				let rad = 2*Math.PI * i/8;
	// 				let [x, y] = Vector.rotate(mag1, 0, rad);
	// 				dc.drawCircle(x, y, 8);
	// 			}
	// 			//slow spiral glowing circles
	// 			let mag2 = t*0.6;
	// 			for (let i = 0; i < 8; i++){
	// 				let rad = 2*Math.PI * i/8;
	// 				rad += (0.5/8) + t * 0.001;
	// 				let r = 8 + t*0.03;
	// 				let [x, y] = Vector.rotate(mag2, 0, rad);
	// 				dc.drawCircle(x, y, r);
	// 			}
	// 		}

	// 		this.timer -= delta;
	// 		if (this.timer <= 0){
	// 			if (ps.lives < 0)
	// 				ps.setState("gameover");
	// 			else{
	// 				ps.updateLivesDisplay(ps.lives);
	// 				ps.setState("respawn");
	// 			}
	// 		}

	// 		return false;
	// 	}
	// },

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
			if (mouse.m1 == 1){
				this.ps.nextLevel();
				return false;
			}

			if (this.ps.bypass.exitTriggered){
				let paddle = this.ps.get("paddles")[0];
				paddle.x += 0.1 * delta;
				paddle.updateStuckBalls();
			}

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
	constructor(x, y, side="up"){
		super(null, x, y);
		this.scale.set(1);

		if (side == "left" || side == "right"){
			this.scale.set(-1, 1);
			this.rotation = -Math.PI/2;
		}
		if (side == "right")
			this.x += 16;
		this.side = side;

		let left = makeSprite("gate_left");
		left.anchor.set(1, 1);
		left.scale.set(2);
		left.x = 0;
		let right = makeSprite("gate_right");
		right.anchor.set(0, 1);
		right.scale.set(2);
		right.x = 0;
		//middle is the "hole" that appears when
		//the gates open
		let middle = makeSprite("gate_slice");
		middle.anchor.set(0.5, 1);
		middle.scale.set(0, 2);
		middle.x = 0;
		middle.tint = 0x000000;

		this.addChild(middle);
		this.addChild(left);
		this.addChild(right);
		this.left = left;
		this.right = right;
		this.middle = middle;

		this.gateSpd = 0.05;
		//open, closed, opening, closing
		this.state = "closed";
		this.object = null;
		this.containerName = null;
	}

	isVacant(){
		return this.state == "closed";
	}

	emplaceSprite(containerName, obj){
		let side = this.side;
		this.object = obj;
		this.containerName = containerName;
		if (this.side == "up"){
			obj.x = this.x;
			obj.y = DIM.ceiling - 16 - obj.h/2;
			this.open(obj.w);
		}
		else{
			obj.x = (side == "left") ?
				DIM.lwallx - 16 - obj.w/2 :
				DIM.rwallx + 16 + obj.w/2;
			obj.y = this.y;
			this.open(obj.h);
		}
	}

	//make the enemy descend from the hole
	deploySprite(){
		game.emplace(this.containerName, this.object);
	}

	canClose(){
		let side = this.side;
		let obj = this.object;

		if (!obj)
			return false;
		if (obj.isDead())
			return true;

		if (side == "up")
			return obj.y - obj.h/2 > DIM.ceiling + 2;
		else if (side == "left")
			return obj.x - obj.w/2 > DIM.lwallx + 2;
		else //side == "right"
			return obj.x + obj.w/2 < DIM.rwallx - 2;
	}

	open(width){
		this.state = "opening";
		this.openWidth = width/2 + 2;
	}

	close(){
		this.state = "closing";
		this.object = null;
		this.containerName = null;
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
				if (this.object)
					this.deploySprite();
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
			if (this.canClose())
				this.close();
		}


		left.x = -right.x;
		middle.scale.x = right.x*2;
	}
}

//Bypass is just a black rectangle that slowly
//expands from the bottom of the right side border
class Bypass extends Sprite{
	constructor(playstate){
		super(null, DIM.rwallx, DIM.h);
		this.playstate = playstate;
		this.scale.set(1);
		this.rect = new PIXI.Graphics();
		this.addChild(this.rect);
		//height is already a property of PIXI.Sprite
		this.openHeightMax = 60;
		this.openHeight = 0;
		this.openSpeed = 0.1;
		this.mode = 1; //1 = bypass, 2 = warp
		this.state = "closed"; //"closed", "opening", "open"

		this.exitTimer = 0;
		this.exitTimerMax = 1000;
		let text = printText(String(this.exitTimerMax), 
			"windows", 0xFFFFFF, 2, DIM.w/2, DIM.h/2);
		text.visible = false;
		text.anchor.set(0.5);
		playstate.hud.addChild(text);
		this.text = text;

		this.exitTriggered = false;

		// this.open(2);
	}

	redraw(){
		this.rect.clear()
			.beginFill(0x000000)
			.drawRect(0, 0, 16, -this.openHeight);
	}

	//Bypass and Warp Powerup will call this
	//Currently theres no close()
	open(mode=1){
		this.mode = Math.max(this.mode, mode);
		if (this.state == "closed")
			this.state = "opening";
	}

	update(delta){
		if (this.state == "opening"){
			this.openHeight += this.openSpeed * delta;
			if (this.openHeight > this.openHeightMax){
				this.openHeight = this.openHeightMax;
				this.state = "open";
				this.exitTimer = this.exitTimerMax;
			}
			this.redraw();
		}
		else if (this.state == "open"){
			let paddle = game.get("paddles")[0];
			let text = this.text;
			if (paddle.x + paddle.paddleWidth/2 >= DIM.rwallx){
				this.exitTimer = Math.max(0, this.exitTimer - delta);
				text.visible = true;
				text.position.set(paddle.x, paddle.y - 32);
			}
			else{
				this.exitTimer = this.exitTimerMax;
				text.visible = false;
			}
			this.text.text = String(Math.floor(this.exitTimer));
			if (this.exitTimer == 0){
				this.exitTriggered = true;
				playSound("bypass_exit");
				text.visible = false;
				this.playstate.setState("victory");
				if (this.playstate.mode == "campaign")
					campaign_save.onVictory(this.playstate, this.mode-1);
			}
		}
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
	 * Alternate properties param: [string[], function, format]
	 * If function is not null, Monitor will only check objects
	 * that satisfy the function
	 * 
	 * Possible formats: "time"(default), "health"
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
			this.format = properties[2] ?? "time";
		}
		else{
			this.properties = properties.slice();
			this.filterFunc = null;
			this.format = "time";
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
		this.setValue(value);
	}

	setValue(value){
		let text = `${this.name}: `;
		if (this.format == "time"){
			value = (value/1000).toFixed(2);
			text += `${value} s`;
		}
		else if (this.format == "health"){
			text += `${value} hp`;
		}
		this.text.text = text;
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
		// let y = DIM.ceiling + 100;
		if (cheats.get("instant_powerups"))
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

//GridSet is a Set that reserves pairs of ints
//Might be deprecated since I can just use a string.
//TODO: find a use for this or delete this
class GridSet{
	//increase this if the board size somehow becomes larger
	//than 1000 x 1000 bricks
	static max = 1000;

	static hash(i, j){
		return i * GridSet.max + j;
	}

	static unhash(n){
		return [Math.floor(n / GridSet.max), n % GridSet.max];
	}

	constructor(){
		this.set = new Set();
	}

	get size(){
		return this.set.size;
	}

	add(i, j){
		this.set.add(GridSet.hash(i, j));
	}

	has(i, j){
		return this.set.has(GridSet.hash(i, j));
	}

	delete(i, j){
		this.set.delete(GridSet.hash(i, j));
	}

	*values(){
		for (let n of this.set)
			yield GridSet.unhash(n);
	}
}

//will be used in PlayState and CampaignState
class ScoreDisplay extends PIXI.Container{
	constructor(x, y, digitsOnly=false){
		super();
		this.position.set(x, y);
		this.digitsOnly = digitsOnly;

		//draw each digit individually to make it monospaced
		let digits = new PIXI.Container();
		let scale = 1.5;
		if (!digitsOnly){
			digits.position.set(0, 30);
			scale = 1.5;
		}
		for (let i = 0; i < 8; i++){
			digits.addChild(printText(
				"0", "arcade", 0x000000, scale, i*16*scale, 0
			));
		}
		this.addChild(digits);
		this.digits = digits;
		this.setScore(0);

		if (!digitsOnly){
			//"Score" label
			this.addChild(printText(
				"Score", "arcade", 0x000000, 1.5, 0, 0
			));
			//score multiplier
			let mult = printText(
				"", "arcade", 0x000000, 1, 124, 8);
			this.addChild(mult);
			this.mult = mult;
			this.setMultiplier(0);
		}
	}

	setScore(score){
		//score should be checked by Playstate beforehand
		let digits = this.digits.children;
		let str = String(score);
		let n = str.length;
		//significant digits should be black
		for (let i = 0; i < n; i++){
			let digit = digits[8-n+i];
			digit.text = str[i];
			digit.tint = 0x000000;
		}
		//leading zeroes should be grey
		for (let i = 0; i < 8-n; i++){
			let digit = digits[i];
			digit.text = "0";
			digit.tint = 0x666666;
		}
	}

	setMultiplier(multiplier){
		if (multiplier == 1)
			this.mult.text = "x2";
		else if (multiplier == -1)
			this.mult.text = "x0.5";
		else
			this.mult.text = "";

	}
}

class LivesDisplay extends PIXI.Container{
	constructor(x, y, fontColor=0xFFFFFF){
		super();
		this.position.set(x, y);
		this.fontColor = fontColor;
	}

	setLives(lives){
		this.removeChildren();
		let count = lives;
		if (count >= 6)
			count = 1;
		for (let i = 0; i < count; i++){
			let life = makeSprite("paddlelife", 2, i*36, 0);
			this.addChild(life);
		}
		if (lives >= 6){
			let text = printText(
				"x" + String(lives),
				"arcade",
				this.fontColor,
				1, 34, -2
			);
			this.addChild(text);
		}
	}
}