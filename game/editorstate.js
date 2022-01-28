class EditorState extends State{
	constructor(){
		super();
		this.allowRightClick = false;
		//create more layers if necessary
		let layerNames = [
			"background",
			"game",
			"walls",
			"hud",
		];

		this.windowTitle = "Level Editor";

		let stage = new PIXI.Container();
		this.stage = stage;

		for (let name of layerNames){
			let cont = new PIXI.Container();
			stage.addChild(cont);
			this[name] = cont;
		}

		//init background
		let bg = new PIXI.Graphics();
		this.bg = bg;
		this.setBackground(); //dark blue, no tile
		this.add("background", bg);

		//create walls
		let walls = new PIXI.Graphics();
		walls.beginFill(PALETTE["main0"]);
		walls.drawRect(0, 0, DIM.wallw, DIM.h);
		walls.drawRect(DIM.rwallx, 0, DIM.wallw, DIM.h);
		walls.drawRect(DIM.lwallx, 0, DIM.boardw, DIM.ceiling);
		this.add("walls", walls);

		//put border in wall layer because we don't have to
		//do anything special with it
		let border = new Sprite(
			"border",
			DIM.w/2,
			DIM.ceiling + DIM.boardh/2 - 8
		);
		this.add("walls", border);

		//create grid lines
		let lines = new PIXI.Graphics();
		lines.lineStyle(1, 0xFFFFFF);
		//horizontal
		for (let i = 0; i < 32; i++){
			let x0 = DIM.lwallx;
			let x1 = DIM.rwallx;
			let y = DIM.ceiling + i * 16;
			lines.moveTo(x0, y);
			lines.lineTo(x1, y);
		}
		//vertical
		for (let j = 0; j < 13; j++){
			let y0 = DIM.ceiling;
			let y1 = DIM.h;
			let x = DIM.lwallx + j * 32;
			lines.moveTo(x, y0);
			lines.lineTo(x, y1);
		}
		this.add("game", lines);

		//create grid nodes
		let grid = [];
		let allNodes = []; //easier access
		for (let i = 0; i < 32; i++){
			let row = [];
			grid.push(row);
			for (let j = 0; j < 13; j++){
				let node = new GridNode(this, i, j);
				row.push(node);
				allNodes.push(node);
			}
		}

		this.grid = grid;
		this.allNodes = allNodes;
		this.cycler = new PatchCycler(this);

		//create layer for Laser Gate Block's lasers + turrets
		this.lasers = new PIXI.Container();
		this.add("game", this.lasers);

		//another laser layer for thew link laser tool
		this.newLaser = new PIXI.Container();
		this.add("game", this.newLaser);

		this.laserEdges = [];

		this.initToolButtons();
		this.initRightWidget();
		this.initPowerupButtons();

		this.slotPowerups = [
			[0, 1, 2], //blue
			[0, 1, 2]  //yellow
		];

		//create a table for powerup chances
		this.powerupChances = {
			global: GLOBAL_POWERUP_CHANCE,
			weights: [...DEFAULT_WEIGHTS],
		};

		//enemy spawn
		this.enemySpawn = new Array(9).fill(0); //should only contain 1s and 0s
		this.enemySpawnTimes = [...DEFAULT_SPAWN_TIMES];

		//tooltip display
		this.tooltip = new ToolTipDisplay(this);
		this.tooltip.position.set(DIM.lwallx, 0);
		this.add("hud", this.tooltip);

		//initial selection
		this.selectedTool = null;
		this.selectedBrick = null;
		this.selectedPatch = null;
		this.selectedMode = null;

		//for use with link laser button
		this.previousSelectedTool = null;

		this.toolButtons[0].pointerDown();
		this.widget.tabs[0].pointerDown();
		this.brickButtons[0].pointerDown();
		this.patchButtons[0].pointerDown();

		//draw text
		let text = printText("Edit Mode", "windows", 0x000000, 2, 10, 10);
		

		this.add("hud", text);
	

		let tip1 = printText(
			"Left-Click to place.",
			"windows", 0x000000, 1, 10, 105);
		let tip2 = printText(
			"Right-Click to erase.",
			"windows", 0x000000, 1, 10, 120);
		this.add("hud", tip1);
		this.add("hud", tip2);

		//debug example text
		// let text2 = printText("Normal Brick", "arcade");
		// let text3 = printText("Quasar", "pokemon");
		// text2.x = DIM.lwallx;
		// text2.y = 10;
		// text3.x = DIM.lwallx + 200;
		// text3.y = 10;
		// this.add("hud", text2);
		// this.add("hud", text3);

		//Buttons
		let butt;
		let state = this;

		//Play Button
		butt = new Button(10, 45, 150, 50);
		butt.add(makeSprite("editorbutton_2_0", 3, 5, -2));
		butt.add(printText(
			"Play","arcade", 0x000000, 1.5, 55, 10
		));
		state = this;
		butt.onClick = function(){
			state.startGame();
		}
		this.add("hud", butt);

		let tooltip = this.tooltip;
		function assignTooltip(button, name){
			button.pointerOver = function(e){
				Button.prototype.pointerOver.call(this, e);
				tooltip.set(1, "menu", name, this.stage.children[0].texture);
			};
			button.pointerOut = function(e){
				Button.prototype.pointerOut.call(this, e);
				tooltip.checkAndClear(1, "menu", name);
			};
		}

		//Background Select Button
		butt = new Button(10, 240, 44, 44);
		butt.add(makeSprite("editorbutton_0_0", 2, 5, 5));
		butt.onClick = function(){
			game.push(new BackgroundSelectState(state));
		};
		this.add("hud", butt);
		this.bgSelectButton = butt;
		assignTooltip(butt, "background");

		//Powerup Chances Button
		butt = new Button(60, 240, 44, 44);
		butt.add(makeSprite("editorbutton_0_1", 2, 5, 5));
		butt.onClick = function(){
			game.push(new PowerupChancesState(state));
		};
		this.add("hud", butt);
		this.configPowerupButton = butt;
		assignTooltip(butt, "powerup");

		//Enemy Spawn Button
		butt = new Button(110, 240, 44, 44);
		butt.add(makeSprite("editorbutton_1_2", 2, 5, 5));
		butt.onClick = function(){
			game.push(new EnemySpawnState(state));
		};
		this.add("hud", butt);
		this.enemySpawnButton = butt;
		assignTooltip(butt, "enemy");

		//Import/Export buttons
		butt = new Button(2, 440, 96, 36);
		butt.addCentered(printText("Export", "arcade", 0x000000, 1));
		butt.onClick = function(){
			// state.exportLevel();
			game.push(state.createImportExportDialogue(false));
		};
		this.add("hud", butt);

		butt = new Button(2, 480, 96, 36);
		butt.addCentered(printText("Import", "arcade", 0x000000, 1));
		butt.onClick = function(){
			game.push(state.createImportExportDialogue(true));
		}
		this.add("hud", butt);

		//Save/Load Button
		butt = new Button(102, 440, 70, 36);
		butt.addCentered(printText("Save", "arcade", 0x000000, 1, 7, 8));
		butt.onClick = function(){
			game.push(new LevelSelectState(false, "save"));
		};
		this.add("hud", butt);

		butt = new Button(102, 480, 70, 36);
		butt.addCentered(printText("Load", "arcade", 0x000000, 1, 7, 8));
		butt.onClick = function(){
			game.push(new LevelSelectState(false, "load"));
		};
		this.add("hud", butt);

		//Main Menu Button
		butt = new Button(10, 550, 140, 40);
		butt.add(printText(
			"Main Menu", "arcade", 0x000000, 1, 7, 9));
		butt.onClick = function(){
			game.pop();
		};
		this.add("hud", butt);

		this.stateName = "editorstate";
	}

	setBackground(color=0x000080, tile=null){
		let bg = this.bg;
		bg.color = color;
		bg.tile = tile;
		//set color
		bg.clear()
			.beginFill(color)
			.drawRect(DIM.lwallx, DIM.ceiling, DIM.boardw, DIM.boardh);
		//set tiled sprite if it exists
		bg.removeChildren();
		if (tile){
			let tex = media.textures[tile];
			let sprite = new PIXI.TilingSprite(
				tex, DIM.boardw/2, DIM.boardh/2);
			sprite.scale.set(2);
			sprite.position.set(DIM.lwallx, DIM.ceiling);
			bg.addChild(sprite);
		}
	}

	initRightWidget(){
		//tab width and height
		let tw = 56;
		let th = 54;

		let widget = new PIXI.Container();
		widget.sortableChildren = true;
		widget.x = DIM.rwallx + 8 + 18;
		widget.y = 10;

		//base panel is static
		let [x, y, w, h] = [0, th-6, (tw-4)*3, DIM.h-widget.y-(th-6)-10];
		widget.addChild(new Base(x, y, w, h));

		//initialize panels
		let panels = [
			this.initBrickButtons(),
			this.initBrickButtons2(),
			this.initPatchButtons(),
		]
		for (let panel of panels){
			panel.y += th;
			panel.zIndex = 10;
			panel.visible = false;
			widget.addChild(panel);
		}
		widget.panels = panels;

		//initialize tabs
		let state = this;
		widget.tabs = [];
		let textures = [
			"editorbutton_1_0",
			"editorbutton_1_0",
			"editorbutton_1_1",
		];
		let tooltipNames = [
			"bricktab",
			"bricktab2",
			"patchtab"
		];
		for (let i = 0; i < 3; i++){
			let tab = new TabButton((tw-6)*i, 0, tw, th, widget.tabs, i);
			tab.addCentered(new Sprite(textures[i]));
			tab.on("pointerover", (e) => {
				this.tooltip.set(1, "menu", tooltipNames[i], tab.stage.children[0].texture);
			});
			tab.on("pointerout", (e) => {
				this.tooltip.checkAndClear(1, "menu", tooltipNames[i]);
			});

			widget.addChild(tab);
			widget.tabs.push(tab);

			let panel = panels[i];
			tab.onStateChange = function(value){
				if (value){
					panel.visible = true;
					state.selectMode = (this.tabIndex == 2) ? "patch" : "brick";
				}
				else{
					panel.visible = false;
					panel.onHide?.();
				}
			}
		}

		//start off with first tab selected
		widget.tabs[0].pointerDown(null);

		this.add("hud", widget);
		this.widget = widget;	 
	}

	initBrickButtons(){
		let panel = new PIXI.Container();
		panel.x = 5;
		panel.y = 5;

		this.brickButtons = []; //moved to outside of function
		this.slotButtons = []; //slot machine brick buttons

		//"this" changes when entering a function
		this.brickButtonHighlight1 = new PIXI.Graphics();
		let state = this;
		let placeButtons = function(name, x0, y0, wrap, scale, flip=false){
			let group = brickData.group[name];
			let dx = 16 * scale;
			let dy = 8 * scale;
			for (let [n, dat] of group.entries()){
				let i = Math.floor(n/wrap);
				let j = n % wrap;
				if (flip)
					[i, j] = [j, i];
				let x = x0 + j * dx;
				let y = y0 + i * dy;
				let butt = new BrickButton(state, x, y, scale, dat.id);
				butt.highlightGraphic = state.brickButtonHighlight1;
				panel.addChild(butt);
				state.brickButtons.push(butt);
				if (dat.brickType == "SlotMachineBrick")
					state.slotButtons.push(butt);
				if (dat.brickType == "PowerupBrick")
					state.powerupButton = butt;
			}
		}

		placeButtons("normal", 0, 0, 6, 1.5);
		placeButtons("other", 0, 12*22, 6, 1.5);
		placeButtons("flip", 0, 12*33, 6, 1.5);
		placeButtons("nonbrick", 0, 12*38, 4, 1.5, true);

		//Brick Button Highlight (yellow border)
		panel.addChild(this.brickButtonHighlight1);

		return panel;
	}

	initBrickButtons2(){
		let panel = new PIXI.Container();
		panel.x = 5;
		panel.y = 5;

		/* TEMPORARY BRICK BUTTONS SOLUTION */
		this.brickButtonHighlight2 = new PIXI.Graphics();
		let state = this;
		function placeButtons(name, x0, y0, wrap, scale, flip=false){
			let group = brickData.group[name];
			let dx = 16 * scale;
			let dy = 8 * scale;
			for (let [n, dat] of group.entries()){
				let i = Math.floor(n/wrap);
				let j = n % wrap;
				if (flip)
					[i, j] = [j, i];
				let x = x0 + j * dx;
				let y = y0 + i * dy;
				let butt = new BrickButton(state, x, y, scale, dat.id);
				butt.highlightGraphic = state.brickButtonHighlight2;
				panel.addChild(butt);
				state.brickButtons.push(butt);
				if (dat.brickType == "SlotMachineBrick")
					state.slotButtons.push(butt);
				if (dat.brickType == "PowerupBrick")
					state.powerupButton = butt;
			}
		};

		placeButtons("flip2", 0, 10, 5, 1.5);
		placeButtons("other2", 0, 100, 6, 1.5);

		panel.addChild(this.brickButtonHighlight2);

		let linkButton = new ToolButton(this, 2, 54, "linklaser");
		panel.addChild(linkButton);

		linkButton.pointerDown = function(e){
			let state = this.parentState;

			state.toolButtonHighlight.visible = false;
			let gr = state.linkLaserButtonHighlight;
			gr.visible = true;

			gr.clear();
			gr.lineStyle(2, 0xFFFF00);
			gr.drawRect(this.x-1, this.y-1, this.width, this.height);

			if (!(state.selectedTool instanceof EditorState.tools.linklaser))
				state.previousSelectedTool = state.selectedTool;
			state.selectedTool = new EditorState.tools.linklaser(linkButton);
		};

		this.linkLaserButtonHighlight = new PIXI.Graphics();
		panel.addChild(this.linkLaserButtonHighlight);

		let linkText = printText("Link Lasers\nTool", "windows", 0x000000, 1, 42, 54);
		panel.addChild(linkText);
		
		return panel;
	}

	//these powerup buttons are used for selecting powerups
	//for the slot machine bricks and powerup brick
	initPowerupButtons(){
		PlayState.prototype.initPowerupButtons.call(this);

		let state = this;
		let powerPanel = this.powerPanel;
		let widget = this.widget;
		powerPanel.visible = false;
		powerPanel.mode = "slotmachine";

		//repurpose the powerup buttons
		for (let butt of this.powerButtons){
			butt.highlight = EditorButton.prototype.highlight;
			butt.tooltipLayer = 1;
			butt.pointerDown = function(e){
				if (powerPanel.mode == "slotmachine"){
					let newPows = state.newSlotPowerups;
					let pows = state.slotPowerups;
					for (let p of newPows){
						//no duplicate powerups
						if (p == this.id)
							return;
					}
					newPows.push(this.id);
					if (newPows.length == 3){
						powerPanel.visible = false;
						widget.visible = true;
						state.tooltip.text = "";
						pows[state.newSlotColor] = newPows;
					}
				}
				else{ //mode == "powerup"
					//change the brickId and brickData of the button
					let butt = state.powerupButton;
					let id = 1000 + this.id;
					butt.id = id;
					butt.dat = brickData.lookup.get(id);
					butt.updateAppearance();
					state.selectedBrick = id;

					powerPanel.visible = false;
					widget.visible = true;
					state.tooltip.text = "";
				}
			}
		}
		//modify the slot machine brick buttons
		for (let butt of this.slotButtons){
			let oldFunc = butt.pointerDown;
			butt.pointerDown = function(e){
				if (state.selectedBrick == this.id){
					state.newSlotPowerups = [];
					state.newSlotColor = 
						(this.dat.args[0]) ? 1 : 0;
					powerPanel.mode = "slotmachine";
					powerPanel.visible = true;
					widget.visible = false;
				}
				oldFunc.call(this, e);
			};
		}
		//modify the powerup brick button
		let butt = this.powerupButton;
		let oldFunc = butt.pointerDown;
		butt.pointerDown = function(e){
			let id = state.selectedBrick;
			if (id >= 1000 && id < 2000){
				powerPanel.mode = "powerup";
				powerPanel.visible = true;
				widget.visible = false;
			}
			oldFunc.call(this, e);
		};

		let overlay = new Sprite("brick_main_7_4");
		overlay.scale.set(1);
		overlay.alpha = 0.5;
		overlay.position.set(8, 4);
		butt.addChild(overlay);
		butt.updateAppearance = function(){
			let tex = this.dat.tex;
			butt.texture = media.textures[tex];
		};
		butt.updateAppearance();
	}

	initPatchButtons(){
		let panel = new PIXI.Container();
		panel.x = 10;
		panel.y = 5;

		this.patchButtons = [];

		let create = (x, y, slot, value) => {
			let butt = new PatchButton(this, x, y, slot, value);
			panel.addChild(butt);
			this.patchButtons.push(butt);
		}

		create(0, 0, 5, 0);
		create(32, 0, 6, 0);
		for (let i = 0; i < 4; i++){
			create(i*32, 16*3, i, 0);
		}
		for (let n = 0; n < 24; n++){
			let i = Math.floor(n/3);
			let j = n % 3;
			let x = j*32;
			let y = 16*5 + i*16;
			create(x, y, 4, n);
		}
		create(64, 0, 7, 0);

		this.patchButtonHighlight = new PIXI.Graphics();
		panel.addChild(this.patchButtonHighlight);

		return panel;
	}

	initToolButtons(){
		let toolNames = [
			"free",
			"linerect",
			"fillrect",
		];

		let panel = new PIXI.Container();
		panel.x = 10;
		panel.y = DIM.ceiling + 60;
		this.add("hud", panel);

		this.toolButtons = [];

		for (let [i, name] of toolNames.entries()){
			let butt = new ToolButton(this, 32*i, 0, name);
			panel.addChild(butt);
			this.toolButtons.push(butt);
		}

		//Tool Button Highlight (yellow border)
		this.toolButtonHighlight = new PIXI.Graphics();
		panel.addChild(this.toolButtonHighlight);
	}

	//Remember that "import" and "export" are reserved words
	createImportExportDialogue(isImport){
		let title = isImport ? "Import Level" : "Export Level";
		let width = 400, height = 250;
		let dialogue = new DialogueBox(width, height, title, this);

		let textAreaWidth = dialogue.bodyWidth - 20;

		let textArea = dialogue.createTextArea(textAreaWidth, 120, 12);
		textArea.htmlInput.readOnly = !isImport;
		textArea.position.set(10 - 2, 10);
		dialogue.add(textArea);

		if (isImport){
			let errorText = printText("ERROR: Invalid JSON string",
				"windows", 0xDD0000, 1, 20, height - 80 );
			errorText.maxWidth = 100;
			errorText.visible = false;
			dialogue.add(errorText);

			dialogue.addButton("Cancel", 95, 40, () => {
				game.pop();
			});

			dialogue.addButton("Import", 95, 40, () => {
				let levelStr = textArea.text;
				let level = null;
				try{
					level = JSON.parse(levelStr);
				} catch (err) {
					errorText.visible = true;
				}
				if (level){
					let editorstate = game.states[game.states.length-2];
					editorstate.loadLevel(level);
					game.pop();
				}
			});
		}
		else{
			textArea.text = this.createLevel();
			dialogue.addButton("Close", 80, 40, () => {
				game.pop();
			});
		}

		return dialogue;
	}

	//resets the level to its default state
	reset(){
		this.powerupChances = {
			global: GLOBAL_POWERUP_CHANCE,
			weights: [...DEFAULT_WEIGHTS]
		};

		this.enemySpawn = new Array(9).fill(0);
		this.enemySpawnTimes = [...DEFAULT_SPAWN_TIMES];

		this.clearLaserEdges();
		this.redrawLaserEdges();

		for (let node of this.allNodes)
			node.setBrick(null);
		
		this.cycler.setCurrentSlot(0);
	}

	add(name, obj){
		this[name].addChild(obj);
	}

	remove(name, obj){
		this[name].removeChild(obj);
	}

	update(delta){
		//escape will NOT pop the state; instead it will start the game
		if (keyboard.isPressed(keycode.ESCAPE)){
			this.startGame();
			return;
		}

		//abstraction: let the editorstate simplify inputs
		//	before sending it to tool.update()
		let mx = mouse.x;
		let my = mouse.y;
		let [i, j] = getGridPos(mx, my);
		let flag = (mouse.m1 || mouse.m2);
		let hasChanged = (
			i !== this.old_i ||
			j !== this.old_j ||
			!!flag != !!this.old_flag
		);
		if (hasChanged){
			for (let node of this.allNodes)
				node.setHighlight(false);
			let tool = this.selectedTool;
			if (boundCheck(i, j)){
				let value = null;
				if (mouse.m1){
					if (this.selectMode == "brick")
						value = this.selectedBrick;
					else if (this.selectMode == "patch")
						value = this.selectedPatch;
				}
				let select = {
					mode: this.selectMode,
					value: value,
				}
				tool.update(i, j, flag, select);
			}
			else if (flag == 0){
				tool.cancel();
			}
		}
		this.old_i = i;
		this.old_j = j;
		this.old_flag = flag;

		this.cycler.update(delta);

		for (let node of this.allNodes){
			node.update(delta);
		}
	}

	//don't worry about mutating objects or arrays since this function will
	//return an immutable JSON string
	createLevel(){
		let level = {};

		//level.bricks should always exist
		level.bricks = [];
		let slotCheck = false; //check for slot machine bricks
		for (let node of this.allNodes){
			let id = node.brickId;
			if (id !== null){
				let {i, j, patch} = node;
				let arr = [i, j, id];
				if (patch)
					arr.push(patch);
				level.bricks.push(arr);
				if (node.dat.brickType == "SlotMachineBrick")
					slotCheck = true;
			}
		}

		//background should be converted to an array
		let bg = this.bg;
		level.bg = [bg.color];
		if (bg.tile)
			level.bg.push(bg.tile);

		//level.enemies can be omitted if all enemies
		//are disabled
		if (this.enemySpawn.includes(1)){
			level.enemies = [this.enemySpawn];
			//the spawn times array can be omitted if they are equal to default
			if (!arrayEqual(this.enemySpawnTimes, DEFAULT_SPAWN_TIMES))
				level.enemies.push(this.enemySpawnTimes);
		}

		//Slot Machine Powerups should appear iff
		//this level contains Slot Machine Bricks
		if (slotCheck)
			level.slotPowerups = this.slotPowerups;

		//same for Laser Gate Brick lasers
		if (this.laserEdges.length > 0)
			level.lasers = this.laserEdges;

		//include powerup chances if they are different from the default chances
		let powerupChances = {};
		let isCustom = false;
		if (this.powerupChances.global != GLOBAL_POWERUP_CHANCE){
			powerupChances.global = this.powerupChances.global;
			isCustom = true;
		}
		if (!arrayEqual(this.powerupChances.weights, DEFAULT_WEIGHTS)){
			powerupChances.weights = this.powerupChances.weights;
			isCustom = true;
		}
		if (isCustom)
			level.powerupChances = powerupChances;
		
		return JSON.stringify(level);
	}

	//level can either be a JSON string or object
	//JSON string is preferred as it prevents accidental mutations
	loadLevel(levelStr){
		let level = null;
		if (typeof(levelStr) === "string")
			level = JSON.parse(levelStr);
		else
			level = levelStr;
		//needs to take in account of optional properties

		//reset the level first
		this.reset();

		//apply bricks and patches
		for (let [i, j, id, patch] of level.bricks){
			let node = this.grid[i][j];
			node.setBrick(id);
			if (patch){
				for (let pair of Object.entries(patch))
					node.setPatch(pair);
			}
		}

		//set background
		this.setBackground(...level.bg);

		//set enemy spawning
		if (level.enemies){
			let [values, times] = level.enemies;
			//values should always exists
			this.enemySpawn = values;
			if (times)
				this.enemySpawnTimes = times;
		}
		//slot machine powerups
		if (level.slotPowerups)
			this.slotPowerups = level.slotPowerups;

		//Laser Gate Brick lasers
		if (level.lasers){
			this.laserEdges = level.lasers;
			this.redrawLaserEdges();
		}

		if (level.powerupChances){
			let {global, weights} = level.powerupChances;
			if (global !== undefined)
				this.powerupChances.global = global;
			if (weights !== undefined)
				this.powerupChances.weights = weights;
		}
	}

	startGame(){
		let levelStr = this.createLevel();
		game.push(new PlayState("test", levelStr));
	}

	//return false is this edge is a duplicate
	addLaserEdge(i0, j0, i1, j1){
		//make sure i0 <= i1
		let newEdge = (i0 > i1) ? [i1, j1, i0, j0] : [i0, j0, i1, j1];

		for (let edge of this.laserEdges){
			if (arrayEqual(edge, newEdge))
				return false;
		}

		this.laserEdges.push(newEdge);
		return true;
	}

	redrawLaserEdges(){
		this.lasers.removeChildren();
		for (let [i0, j0, i1, j1] of this.laserEdges){
			//both nodes should have the same brick id
			let switchId = this.grid[i0][j0].getLaserId(); //should always be non-null
			if (switchId === null)
				console.error("Invalid Laser Gate Edge");
			let laser = LaserGateBrick.editorDrawLaser(i0, j0, i1, j1, switchId);
			this.lasers.addChild(laser);
		}
	}

	//remove all edges at a grid position
	//return true if 1 or more edges were removed
	removeLaserEdges(i, j){
		let removed = remove_if(this.laserEdges, (e) => {
			return (e[0] == i && e[1] == j) || (e[2] == i && e[3] == j);
		});
		return removed.length > 0;
	}

	clearLaserEdges(){
		this.laserEdges = [];
	}
}

EditorState.tools = {};
let tools = EditorState.tools;

//this is an abstract class (not an actual tool)
tools.base = class{
	//button is the button that selected this tool
	constructor(button){
		this.button = button;
		this.es = button.parentState;
	}
	destructor(){

	}
	update(){}
	cancel(){}
};
tools.free = class extends tools.base{
	// flag (bool) is whether mouse is down or not
	// isPatch (bool) is whether we're in patch mode
	// value (num or arr) is the value to set the nodes
	update(i, j, flag, select){
		let grid = this.es.grid;
		let cycler = this.es.cycler;

		if (flag){
			let node = grid[i][j];
			node.set(select);
			cycler.onToolUpdate(select);
		}
		else
			grid[i][j].setHighlight(true);
	}
	//other tools will need a cancel function
	cancel() {

	}
};

tools.fillrect = class extends tools.base{
	constructor(editorstate){
		super(editorstate);
		this.start = null;
	}

	selectNodes(i0, j0, i1, j1){
		let grid = this.es.grid;

		if (i1 < i0)
			[i0, i1] = [i1, i0];
		if (j1 < j0)
			[j0, j1] = [j1, j0];
		let nodes = [];
		for (let i = i0; i <= i1; i++){
			for (let j = j0; j <= j1; j++)
				nodes.push(grid[i][j]);
		}
		return nodes;
	}

	update(i, j, flag, select){
		let grid = this.es.grid;
		let cycler = this.es.cycler;

		if (flag){
			if (!this.start)
				this.start = {i, j, select};
			let start = this.start;
			let nodes = this.selectNodes(start.i, start.j, i, j);
			for (let node of nodes)
				node.setHighlight(true);
		}
		else{
			if (this.start){
				let start = this.start;
				let nodes = this.selectNodes(start.i, start.j, i, j);
				for (let node of nodes)
					node.set(start.select);
				cycler.onToolUpdate(start.select);
				this.start = null;
			}
			grid[i][j].setHighlight(true);
		}
	}
	//cancel selection if cursor goes out of bounds
	cancel(){
		this.start = null;
	}
};

tools.linerect = class extends tools.fillrect{
	selectNodes(i0, j0, i1, j1){
		let grid = this.es.grid;

		if (i1 < i0)
			[i0, i1] = [i1, i0];
		if (j1 < j0)
			[j0, j1] = [j1, j0];
		let nodes = [];
		for (let i = i0; i <= i1; i++){
			for (let j = j0; j <= j1; j++){
				if (i == i0 || i == i1 || 
					j == j0 || j == j1)
					nodes.push(grid[i][j]);
			}
		}
		return nodes;
	}
};

tools.linklaser = class extends tools.base{
	constructor(button){
		super(button);
		this.start = null;
		this.down = false;

		//set all the nodes with LaserGateBricks flashing
		for (let node of this.es.allNodes){
			if (this.isLaser(node))
				node.setFlashing(true);
		}
	}

	destructor(){
		super.destructor();
		for (let node of this.es.allNodes){
			node.setFlashing(false);
		}
	}

	isLaser(node){
		return node.dat?.brickType === "LaserGateBrick";
	}

	isMatching(node0, node1){
		if (!this.isLaser(node0) || !this.isLaser(node1))
			return false;
		let args0 = node0.dat.args;
		let args1 = node1.dat.args;
		return args0[0] == args1[0] && args0[1] == args1[1];
	}

	update(i, j, flag, select){
		let grid = this.es.grid;
		
		if (flag){
			//select.mode will always be "brick"
			if (select.value === null){
				if (this.isLaser(grid[i][j])){
					if (this.es.removeLaserEdges(i, j))
						this.es.redrawLaserEdges();
				}
				return;
			}
			//make sure the starting brick is a laser gate brick
			if (!this.start && flag === 1){
				let node0 = grid[i][j];
				if (this.isLaser(node0)){
					this.start = node0;
				}
				for (let node1 of this.es.allNodes){
					if (!this.isMatching(node0, node1))
						node1.setFlashing(false);
				}
			}
			if (this.start){
				let node0 = this.start;
				let newLaser = this.es.newLaser;
				newLaser.removeChildren();
				if (node0 !== grid[i][j]){
					let arr = [node0.i, node0.j, i, j, node0.getLaserId()];
					let sprite = LaserGateBrick.editorDrawLaser(...arr);
					newLaser.addChild(sprite);
				}
			}
			this.down = true;
		}
		else{
			if (this.start){
				let node0 = this.start;
				let node1 = grid[i][j];
				if (node0 !== node1 && this.isMatching(node0, node1)){
					this.es.addLaserEdge(node0.i, node0.j, i, j);
					this.es.redrawLaserEdges();
				}
				this.es.newLaser.removeChildren();
				this.start = null;
			}
			if (this.down){
				this.down = false;
				for (let node of this.es.allNodes){
					if (this.isLaser(node))
						node.setFlashing(true);
				}
			}
		}
	}

};
class GridNode{
	constructor(parent, i, j){
		this.parent = parent;
		this.i = i;
		this.j = j;

		let [x, y] = getGridPosInv(i, j);
		let stage = new PIXI.Container();
		stage.position.set(x, y);
		this.stage = stage;
		parent.add("game", stage);

		//brick sprite
		//use a placeholder sprite?
		let sprite = new Sprite("brick_main_0_0");
		this.sprite = sprite;
		sprite.visible = false;
		stage.addChild(sprite);
		this.brickId = null;
		this.dat = null;

		//currently this overlay is for PowerupBrick only
		let overlay = new Sprite("brick_main_7_4");
		this.overlay = overlay;
		overlay.alpha = 0.5;
		overlay.visible = false;
		stage.addChild(overlay);

		//4 shields, movement, invisible, antilaser
		this.patch = null;
		this.patchSprites = [];
		for (let i = 0; i < 8; i++){
			let sprite = new Sprite(null);
			this.patchSprites.push(sprite);
			stage.addChild(sprite);
		}

		//flashing rect
		let fl = new PIXI.Graphics();
		fl.beginFill(0xFFFFFF, 0.3);
		fl.drawRect(-16, -8, 32, 16);
		fl.visible = false;
		fl.flashTimer = 0;
		this.fl = fl;
		stage.addChild(fl);

		//highlight rect
		let hl = new PIXI.Graphics();
		hl.beginFill(0xFFFFFF, 0.5);
		hl.drawRect(-16, -8, 32, 16);
		hl.visible = false;
		this.hl = hl;
		stage.addChild(hl);
	}

	setHighlight(value){
		this.hl.visible = value;
	}

	setFlashing(value){
		let fl = this.fl;
		if (value){
			fl.visible = true;
			fl.flashTimer = 0;
			fl.alpha = 0;
		}
		else{
			fl.visible = false;
		}
	}

	//set either brick or patch based on select
	//select is {mode, value}
	set(select){
		if (select.mode == "brick")
			this.setBrick(select.value);
		else if (select.mode == "patch")
			this.setPatch(select.value);
	}

	//no args to clear the brick
	setBrick(id){
		//remove all edges when the brick is replaced
		if (this.dat?.brickType == "LaserGateBrick"){
			if (this.parent.removeLaserEdges(this.i, this.j))
				this.parent.redrawLaserEdges();
		}
		
		if (id === undefined || id === null){
			//Erase Brick
			this.brickId = null;
			this.dat = null;
			this.sprite.visible = false;
			this.overlay.visible = false;
			this.clearPatch();
		}
		else{
			this.brickId = id;
			this.dat = brickData.lookup.get(id);
			this.sprite.setTexture(this.dat.tex);
			this.sprite.visible = true;
			this.overlay.visible = false;
			//Powerup Brick
			if (id >= 1000 && id < 2000)
				this.overlay.visible = true;
		}
	}

	//pair is array containing [slot, value];
	setPatch(pair){
		if (this.brickId === null)
			return;
		if (pair === undefined || pair === null){
			this.clearPatch();
			return;
		}

		if (this.patch === null)
			this.patch = {};
		let [slot, value] = pair;
		this.patch[slot] = value;
		let sprite = this.patchSprites[slot];
		sprite.setTexture(patchData.get(slot, value));
	}

	clearPatch(){
		this.patch = null;
		for (let sprite of this.patchSprites)
			sprite.texture = null;
	}

	//return the switchId if the contained brick is a LaserGateBrick
	//return null otherwise
	getLaserId(){
		if (this.brickId === null)
			return null;
		if (this.dat.brickType != "LaserGateBrick")
			return null;
		return this.dat.args[0];
	}

	update(delta){
		let fl = this.fl;
		if (fl.visible){
			fl.flashTimer += delta;
			fl.alpha = (Math.sin(fl.flashTimer/200) + 1) * 0.5;
		}
	}
}

class EditorButton extends PIXI.Sprite{
	constructor(parentState, texstr, x, y, scale=1){
		let tex = (texstr === null) ? null : media.textures[texstr];
		super(tex);
		this.position.set(x, y);
		this.scale.set(scale);
		this.parentState = parentState;

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
		this.on("pointerover", (e) => {this.pointerOver(e);});
		this.on("pointerout", (e) => {this.pointerOut(e);});
	}

	//clear graphics and draw a yellow box around button
	highlight(gr){
		gr.clear();
		gr.lineStyle(2, 0xFFFF00);
		gr.drawRect(this.x-1, this.y-1, this.width, this.height);
	}

	pointerDown(e){
		console.log("override this method");
	}

	pointerOver(e){

	}

	pointerOut(e){
		
	}
}

class BrickButton extends EditorButton{
	constructor(parentState, x, y, scale, id){
		let dat = brickData.lookup.get(id);
		super(parentState, dat.tex, x, y, scale);
		this.id = id;
		this.dat = dat;
		this.highlightGraphic = null;
	}

	pointerDown(e){
		let state = this.parentState;
		state.brickButtonHighlight1.visible = false;
		state.brickButtonHighlight2.visible = false;
		this.highlightGraphic.visible = true;
		this.highlight(this.highlightGraphic);
		let id = this.id;
		state.selectedBrick = id;
		state.tooltip.set(0, "brick", id, this.texture);

		//also deselect the linklaser tool if it's currently selected
		if (state.selectedTool instanceof EditorState.tools.linklaser)
			state.previousSelectedTool.button.pointerDown();
	}

	pointerOver(e){
		let tooltip = this.parentState.tooltip;
		tooltip.set(1, "brick", this.id, this.texture);
	}

	pointerOut(e){
		let tooltip = this.parentState.tooltip;
		tooltip.checkAndClear(1, "brick", this.id);
	}
}

class ToolButton extends EditorButton{
	constructor(parentState, x, y, toolstr){
		let tex = "tool_" + toolstr;
		super(parentState, tex, x, y, 2);
		this.toolstr = toolstr;
	}

	pointerDown(e){
		let state = this.parentState;
		//have to take in account of the special Link Laser tool button
		state.linkLaserButtonHighlight.visible = false;
		state.toolButtonHighlight.visible = true;

		this.highlight(state.toolButtonHighlight);
		state.selectedTool?.destructor();
		state.selectedTool = new EditorState.tools[this.toolstr](this);
	}

	pointerOver(e){
		let tooltip = this.parentState.tooltip;
		tooltip.set(1, "tool", this.toolstr, this.texture);
	}

	pointerOut(e){
		let tooltip = this.parentState.tooltip;
		tooltip.checkAndClear(1, "tool", this.toolstr);
	}
}

class PatchButton extends EditorButton{
	constructor(parentState, x, y, slot, value){
		let tex = patchData.get(slot, value);
		super(parentState, tex, x, y, 2);
		this.slot = slot;
		this.value = value;
	}

	static tooltipNames = [
		"shield",
		"shield",
		"shield",
		"shield",
		"movement",
		"invisible",
		"antilaser",
		"regen",
	];
	getToolTipName(){
		let name = PatchButton.tooltipNames[this.slot];
		if (name == "movement" && this.value >= 12)
			name = "movement2";
		return name;
	}

	pointerDown(e){
		let state = this.parentState;
		this.highlight(state.patchButtonHighlight);
		state.selectedPatch = [this.slot, this.value];

		//also deselect the linklaser tool if it's currently selected
		if (state.selectedTool instanceof EditorState.tools.linklaser)
			state.previousSelectedTool.button.pointerDown();
	}

	pointerOver(e){
		let tooltip = this.parentState.tooltip;
		tooltip.set(1, "patch", this.getToolTipName(), this.texture);
	}

	pointerOut(e){
		let tooltip = this.parentState.tooltip;
		tooltip.checkAndClear(1, "patch", this.getToolTipName());
	}
}
class PatchCycler{
	constructor(parentState){
		this.parentState = parentState;

		let groups = [
			[0, 1, 2, 3],
			[4],
			[5],
			[6],
			[7]
		];

		let lookup = {};
		for (let [i, arr] of groups.entries()){
			for (let j of arr)
				lookup[j] = i;
		}
		this.groups = groups;
		this.groupLookup = lookup;

		this.maxCycleTimer = 800;
		this.cycleTimer = this.maxCycleTimer;
		this.currentIndex = 0;
	}

	onToolUpdate(select){
		if (select.mode != "patch")
			return;
		if (!select.value)
			return;
		this.setCurrentSlot(select.value[0]);
	}

	//set it to 0 if loading a new level
	setCurrentSlot(slot){
		let oldIndex = this.currentIndex;
		if (slot < 4)
			this.currentIndex = 0;
		else
			this.currentIndex = slot - 3;
		this.cycleTimer = this.maxCycleTimer;
		this.cyclePatches();
	}

	//causes the brick to display only
	//the selected patches
	cyclePatches(){
		// console.log("cycle " + this.currentIndex);

		//check if the node has the current slots occupied
		function checkPatch(patch, slots){
			for (let key in patch){
				if (slots.has(Number(key)))
					return true;
			}
			return false;
		}

		let slots = this.groups[this.currentIndex];
		slots = new Set(slots);
		for (let node of this.parentState.allNodes){
			let patch = node.patch;
			if (patch && checkPatch(patch, slots)){
				for (let [i, sprite] of node.patchSprites.entries()){
					if (slots.has(i)){
						sprite.visible = true;
					}
					else{
						sprite.visible = false;
					}
				}
			}
		}
	}

	update(delta){
		this.cycleTimer -= delta;
		if (this.cycleTimer > 0)
			return;
		this.cycleTimer += this.maxCycleTimer;

		let activeGroups = new Set();
		for (let node of this.parentState.allNodes){
			let patch = node.patch;
			if (patch){
				for (let key in patch){
					let index = this.groupLookup[key];
					activeGroups.add(index);
				}
			}
		}

		// console.log("# of active groups: " + activeGroups.size);

		if (activeGroups.size == 0)
			return;

		do {
			this.currentIndex++;
			this.currentIndex %= this.groups.length;
		} while (!activeGroups.has(this.currentIndex));

		this.cyclePatches();
	}
}