class EditorState{
	constructor(){
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
		walls.beginFill(0xAAAAAA);
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

		this.initTools();
		this.initToolButtons();
		this.initRightWidget();
		this.initPowerupButtons();

		this.slotPowerups = [
			[0, 1, 2], //blue
			[0, 1, 2]  //yellow
		];

		//initial selection
		this.selectedTool = null;
		this.selectedBrick = null;
		this.selectedPatch = null;
		this.selectedMode = null;

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

		//Background Select Button
		butt = new Button(10, 240, 44, 44);
		butt.add(makeSprite("editorbutton_0_0", 2, 5, 5));
		butt.onClick = function(){
			game.push(new BackgroundSelectState(state));
		};
		this.add("hud", butt);

		//Load Button
		butt = new Button(10, 290, 100, 35);
		butt.add(printText(
			"Load", "arcade", 0x000000, 1, 7, 8
		));
		butt.onClick = function(){
			game.push(new LevelSelectState("load"));
		}
		this.add("hud", butt);

		//Import/Export buttons
		butt = new Button(10, 400, 100, 35);
		butt.add(printText(
			"Import", "arcade", 0x000000, 1, 7, 8
		));
		butt.onClick = function(){
			game.push(state.createImportExportDialogue(true));
		}
		this.add("hud", butt);

		butt = new Button(10, 445, 100, 35);
		butt.add(printText(
			"Export", "arcade", 0x000000, 1, 7, 8
		));
		butt.onClick = function(){
			// state.exportLevel();
			game.push(state.createImportExportDialogue(false));
		}
		this.add("hud", butt);

		//Main Menu Button
		butt = new Button(10, 550, 140, 40);
		butt.add(printText(
			"Main Menu", "arcade", 0x000000, 1, 7, 9));
		butt.onClick = function(){
			game.pop();
		}
		this.add("hud", butt);

		this.stateName = "editorstate";
	}

	destructor(){
		for (let input of this.enemySpawnInputs)
			input.destroy();
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

	initTools(){
		let grid = this.grid;
		let cycler = this.cycler;

		let tools = {};
		this.tools = tools;

		//will make custom tools for copy/paste later
		tools.free = {
			// flag (bool) is whether mouse is down or not
			// isPatch (bool) is whether we're in patch mode
			// value (num or arr) is the value to set the nodes
			update(i, j, flag, isPatch, value){
				if (flag){
					let node = grid[i][j];
					node.set(value);
					cycler.onToolUpdate(value);
				}
				else
					grid[i][j].setHighlight(true);
			},
			//other tools will need a cancel function
			cancel() {},
		};

		tools.fillRect = {
			start: null,

			selectNodes(i0, j0, i1, j1){
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
			},
			update(i, j, flag, isPatch, value){
				if (flag){
					if (!this.start)
						this.start = {i, j, value};
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
							node.set(start.value);
						cycler.onToolUpdate(start.value);
						this.start = null;
					}
					grid[i][j].setHighlight(true);
				}
			},
			//cancel selection if cursor goes out of bounds
			cancel(){
				this.start = null;
			}
		}

		tools.lineRect = {
			__proto__: tools.fillRect,

			selectNodes(i0, j0, i1, j1){
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
		//bottom panel is static
		let [x, y, w, h] = [0, th-6, (tw-4)*3, DIM.h-widget.y-(th-6)-10];
		let b = new PIXI.Graphics();
		b.zIndex = 5;
		b.beginFill(0x000000);
		b.drawRect(x, y, w, h);
		b.beginFill(0xFFFFFF);
		b.drawRect(x, y, w-2, h-2);
		b.beginFill(0x646464);
		b.drawRect(x+2, y+2, w-4, h-4);
		b.beginFill(0xDCDCDC);
		b.drawRect(x+2, y+2, w-6, h-6);
		widget.addChild(b);
		
		widget.tabs = [];

		let textures = [
			"editorbutton_1_0",
			"editorbutton_1_2",
			"editorbutton_1_1",
		]
		for (let i = 0; i < 3; i++){
			let tab = new TabButton(
				this, textures[i],
				(tw-6)*i, 0, tw, th, i
			);
			widget.addChild(tab);
			widget.tabs.push(tab);
		}

		this.brickButtons = [];

		let panels = [
			this.initBrickButtons(),
			this.initEnemyButtons(),
			this.initPatchButtons(),
		]
		for (let panel of panels){
			panel.y += th;
			panel.zIndex = 6;
			widget.addChild(panel);
		}
		widget.panels = panels;

		this.add("hud", widget);
		this.widget = widget;
		 
	}


	initBrickButtons(){
		let panel = new PIXI.Container();
		panel.x = 5;
		panel.y = 5;

		// this.brickButtons = []; //moved to outside of function
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

	//these powerup buttons are used for selecting powerups
	//for the slot machine bricks and powerup brick
	initPowerupButtons(){
		let proto = PlayState.prototype;
		proto.initPowerupButtons.call(this);

		let state = this;
		let powerPanel = this.powerPanel;
		let widget = this.widget;
		powerPanel.visible = false;
		powerPanel.mode = "slotmachine";

		//repurpose the powerup buttons
		for (let butt of this.powerButtons){
			butt.highlight = EditorButton.prototype.highlight;
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
					butt.dat = brickData.lookup[id];
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

	initEnemyButtons(){
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

		placeButtons("other2", 0, 10, 6, 1.5);


		panel.addChild(this.brickButtonHighlight2);


		/* TODO: Move all enemy stuff to a new window + button */
		let yoff = 220;
		
		this.enemyButtons = [];
		for (let i = 0; i < 9; i++){		
			let x = Math.floor(i/5) * 60;
			let y = (i % 5) * 24 + yoff;
			let butt = new EnemyCheckbox(this, x, y, i);
			panel.addChild(butt);
			this.enemyButtons.push(butt);
		}

		this.defaultSpawn = [2000, 2000, 8000];
		this.enemySpawn = this.defaultSpawn.slice();
		let positions = [
			[0, 320],
			[35, 395],
			[95, 395]
		];

		//Enemy Spawn Timer Config
		let strings = [
			[0, 300, "Initial Spawn Delay :"],
			[50, 325, "seconds"],
			[0, 360, "Subsequent Spawn Delay :", true],
			[0, 400, "From"],
			[78, 400, "to"],
			[0, 420, "seconds"]
		];

		yoff = 60;

		for (let [x, y, string, wrap] of strings){
			y += yoff;

			let text = printText(
				string, "windows", 0x000000, 1, x, y);
			if (wrap)
				text.maxWidth = 120;
			panel.addChild(text);
		}

		this.enemySpawnInputs = [];
		for (let [i, [x, y]] of positions.entries()){
			y += yoff;

			let input = new PIXI.TextInput({
				input: {
					fontSize: "14px",
					width: "36px",
					padding: "2px",
					color: 0x000000,
				},
				box: {
					fill: 0xFFFFFF,
					stroke: {
						color: 0x000000,
						width: 2
					}
				}
			});
			input.restrict = ".0123456789";
			input.text = this.defaultSpawn[i]/1000;
			input.on("input", (text) => {
				let last = text[text.length-1];
				if (last == "."){
					let period = text.indexOf(".");
					//revert input if user entered a second period
					if (period >= 0 && period < text.length-1){
						input.text = text.slice(0, -1);
						return;
					}
				}
				if (text.length == 0)
					text = "0";
				if (last == ".")
					text += "0";
				let val = Number(text);
				this.enemySpawn[i] = Math.floor(val*1000);
			});
			input.focusOnce = false;
			input.on("focus", () => {
				mouse.m1 = 0;
			});
			input.position.set(x, y);
			panel.addChild(input);
			this.enemySpawnInputs.push(input);
		}

		panel.onOutOfFocus = () => {
			for (let input of this.enemySpawnInputs)
				input.blur();
		};
		
		return panel;
	}

	initToolButtons(){
		let arr = [
			["free", 0],
			["lineRect", 2],
			["fillRect", 3]
		]

		let panel = new PIXI.Container();
		panel.x = 10;
		panel.y = DIM.ceiling + 60;
		this.add("hud", panel);

		this.toolButtons = [];

		for (let [i, [name, index]] of arr.entries()){
			let butt = new ToolButton(this, 32*i, 0, index, name);
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

		let textArea = new PIXI.TextInput({
			input: {
				fontSize: "12px",
				width: "350px",
				height: "120px",
				color: 0x000000,
				multiline: true,
			},
			box: {
				fill: 0xFFFFFF,
				stroke: {
					color: 0x000000,
					width: 2
				}
			}
		});
		textArea.substituteText = false;
		textArea.isTextInput = true;
		let rect = textArea.getBounds();
		// textArea.text = `width: ${rect.width}, height: ${rect.height}`;
		//center the text area within the dialogue box
		let dx = width - rect.width;
		textArea.position.set(dx/2 - 4, 20);
		dialogue.add(textArea);

		if (isImport){
			let errorText = printText("ERROR: Invalid JSON string",
				"windows", 0xDD0000, 1, 20, height - 80 );
			errorText.maxWidth = 100;
			errorText.visible = false;
			dialogue.add(errorText);

			let cancelButton = new Button(
				width - 115, height - 80, 95, 40
			);
			cancelButton.add(printText(
				"Cancel", "arcade", 0x000000, 1, 7, 10
			));
			cancelButton.onClick = function(){
				game.pop();
			}
			dialogue.add(cancelButton);

			let importButton = new Button(
				width - 220, height - 80, 95, 40
			);
			importButton.add(printText(
				"Import", "arcade", 0x000000, 1, 5, 10
			));
			importButton.onClick = function(){
				let str = textArea.text;
				let level = null;
				try{
					level = JSON.parse(str);
				} catch (err) {
					errorText.visible = true;
				}
				if (level){
					let editorstate = game.states[game.states.length-2];
					editorstate.loadLevel(level);
					game.pop();
				}
			}
			dialogue.add(importButton);
		}
		else{
			let level = this.createLevel();
			textArea.text = JSON.stringify(level);
			let closeButton = new Button(
				width - 100, height - 80, 80, 40
			);
			closeButton.add(printText(
				"Close", "arcade", 0x000000, 1, 5, 10
			));
			closeButton.onClick = function(){
				game.pop();
			}
			dialogue.add(closeButton);
		}

		return dialogue;
	}

	//resets the level to its default state
	reset(){
		for (let node of this.allNodes)
			node.setBrick(null);
		for (let butt of this.enemyButtons)
			butt.setState(false);

		this.cycler.setCurrentSlot(0);
	}

	add(name, obj){
		this[name].addChild(obj);
	}

	remove(name, obj){
		this[name].removeChild(obj);
	}

	update(delta){
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
			flag != this.old_flag
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
					value: value
				}
				//if flag is false, then isPatch and value shouldn't matter
				tool.update(i, j, flag, false, select);
			}
			else if (flag == 0){
				tool.cancel();
			}
		}
		this.old_i = i;
		this.old_j = j;
		this.old_flag = flag;

		this.cycler.update(delta);
	}

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
		let enemyCheck = false;
		let enemyArr = [];
		for (let butt of this.enemyButtons){
			if (butt.checkState){
				enemyArr.push(1);
				enemyCheck = true;
			}
			else
				enemyArr.push(0);
		}
		if (enemyCheck){
			let enemies = [];
			enemies.push(enemyArr);
			//the second array can be omitted if the
			//spawn times are default
			let times = this.enemySpawn;
			let isDefault = true;
			for (let [i, t] of times.entries()){
				if (t != this.defaultSpawn[i])
					isDefault = false;
			}
			if (!isDefault)
				enemies.push(times.slice());
			level.enemies = enemies;
		}

		//Slot Machine Powerups should appear iff
		//this level contains Slot Machine Bricks
		if (slotCheck)
			level.slotPowerups = this.slotPowerups;

		return level;
	}

	loadLevel(level){
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
			let butts = this.enemyButtons;
			let [values, times] = level.enemies;
			for (let [i, val] of values.entries())
				butts[i].setState(val); //implicit cast to boolean

			times = times ?? this.defaultSpawn;
			for (let i = 0; i < 3; i++){
				this.enemySpawnInputs[i].text = times[i]/1000;
				this.enemySpawn[i] = times[i];
			}
		}
		//slot machine powerups
		if (level.slotPowerups)
			this.slotPowerups = level.slotPowerups;
	}

	startGame(){
		let level = this.createLevel();
		game.push(new PlayState("test", level));
	}
}

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
		if (id === undefined || id === null){
			//Erase Brick
			this.brickId = null;
			this.dat = null;
			this.sprite.visible = false;
			this.overlay.visible = false;
			this.clearPatch();
		}
		else{
			//Powerup Brick
			this.brickId = id;
			this.dat = brickData.lookup[id];
			this.sprite.setTexture(this.dat.tex);
			this.sprite.visible = true;
			this.overlay.visible = false;
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
}

class EditorButton extends PIXI.Sprite{
	constructor(parentState, texstr, x, y, scale){
		super(media.textures[texstr]);
		this.position.set(x, y);
		this.scale.set(scale);
		this.parentState = parentState;

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
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
}

class BrickButton extends EditorButton{
	constructor(parentState, x, y, scale, id){
		let dat = brickData.lookup[id];
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
		state.selectedBrick = this.id;
	}
}

class ToolButton extends EditorButton{
	constructor(parentState, x, y, index, toolstr){
		let tex = "tool_" + index;
		super(parentState, tex, x, y, 2);
		this.toolstr = toolstr;
	}

	pointerDown(e){
		let state = this.parentState;
		this.highlight(state.toolButtonHighlight);
		// console.log("select " + this.toolstr);
		state.selectedTool = state.tools[this.toolstr];
	}
}

class PatchButton extends EditorButton{
	constructor(parentState, x, y, slot, value){
		let tex = patchData.get(slot, value);
		super(parentState, tex, x, y, 2);
		this.slot = slot;
		this.value = value;
	}

	pointerDown(e){
		let state = this.parentState;
		this.highlight(state.patchButtonHighlight);
		state.selectedPatch = [this.slot, this.value];
	}
}

//similar to a Checkbox but with differnt sprites
class EnemyCheckbox extends EditorButton{
	constructor(parentState, x, y, id){
		let i = 2;
		let j = 2;
		if (id > 0){
			i = Math.floor((id+1)/6);
			j = (id+1) % 6;
		}
		let tex = `editorenemy_${i}_${j}`;
		super(parentState, tex, x, y, 2);
		this.enemyId = id;

		let cross = makeSprite("editorenemy_2_0");
		cross.x = 12;
		cross.visible = true;
		this.addChild(cross);
		this.cross = cross;

		let check = makeSprite("editorenemy_2_1");
		check.x = 12;
		check.visible = false;
		this.addChild(check);
		this.check = check;

		this.checkState = false;

		// let check = new Sprite("editorenemy_2_1");
	}

	setState(value){
		if (value){
			this.cross.visible = false;
			this.check.visible = true;
		}
		else{
			this.cross.visible = true;
			this.check.visible = false;
		}
		this.checkState = value;
	}

	pointerDown(e){
		this.setState(!this.checkState);
	}

}

class TabButton extends PIXI.Sprite{
	constructor(parentState, texture, x, y, w, h, tabIndex){
		super(null);
		this.parentState = parentState;

		let on = new PIXI.Graphics();
		on.beginFill(0x000000);
		on.drawRect(x, y, w, h-6);
		on.beginFill(0xFFFFFF);
		on.drawRect(x, y, w-2, h-4);
		on.beginFill(0x646464);
		on.drawRect(x+2, y+2, w-4, h-6);
		on.beginFill(0xDCDCDC);
		on.drawRect(x+2, y+2, w-6, h-6);

		let off = new PIXI.Graphics();
		off.beginFill(0x000000);
		off.drawRect(x+2, y+2, w-4, h-4);
		off.beginFill(0xFFFFFF);
		off.drawRect(x+2, y+2, w-6, h-6);
		off.beginFill(0x646464);
		off.drawRect(x+4, y+4, w-8, h-8);
		off.beginFill(0xBBBBBB);
		off.drawRect(x+4, y+4, w-10, h-10);

		let icon = new Sprite(texture);
		this.iconPos = [x, y, 26];

		this.addChild(on);
		this.addChild(off);
		this.addChild(icon);

		this.onGraphic = on;
		this.offGraphic = off;
		this.icon = icon;

		this.setState(true);

		this.tabIndex = tabIndex;

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
	}

	setState(value){
		let on = this.onGraphic;
		let off = this.offGraphic;
		let icon = this.icon;
		let [x, y, offset] = this.iconPos;
		if (value){
			on.visible = true;
			off.visible = false;
			icon.x = x + offset;
			icon.y = y + offset - 2;
		}
		else{
			on.visible = false;
			off.visible = true;
			icon.x = x + offset;
			icon.y = y + offset;
		}
	}

	pointerDown(e){
		let state = this.parentState;
		let widget = state.widget;
		for (let [i, tab] of widget.tabs.entries()){
			if (i != this.tabIndex){
				tab.setState(false);
				tab.zIndex = i;
				let panel = widget.panels[i];
				if (panel.visible){
					panel.visible = false;
					panel.onOutOfFocus?.();
				}
			}
		}
		this.setState(true);
		this.zIndex = 6;
		widget.panels[this.tabIndex].visible = true;

		if (this.tabIndex == 2)
			state.selectMode = "patch";
		else
			state.selectMode = "brick";
		// if (this.tabIndex == 0)
		// 	state.selectMode = "brick";
		// else if (this.tabIndex == 1)
		// 	state.selectMode = "patch";
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