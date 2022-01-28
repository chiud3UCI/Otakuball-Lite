var GLOBAL_POWERUP_CHANCE = 12; //is a percentage

var DEFAULT_WEIGHTS = [
	/* Acid */                  8,
	/* AntiGravity */          20,
	/* Assist */                8,
	/* Attract */               8,
	/* Autopilot */             4,
	/* Ball Cannon */           2,
	/* Barrier */               8,
	/* Blackout */              8,
	/* Beam */                 20,
	/* Blossom */               4,
	/* Bomber */                2,
	/* Bulk */                  4,
	/* Bypass */                2,
	/* Cannon */                8,
	/* Catch */                80,
	/* Change */               40,
	/* Chaos */                 8,
	/* Column Bomber */         4,
	/* Combo */                40,
	/* Control */               4,
	/* Disarm */                8,
	/* Disrupt */               4,
	/* Domino */               40,
	/* Drill Missile */         2,
	/* Drop */                  8,
	/* EMP Ball */             20,
	/* Energy */               20,
	/* Erratic Missile */       8,
	/* Extend */               80,
	/* Fast */                 80,
	/* Freeze */                8,
	/* Fireball */              8,
	/* Forcefield */            8,
	/* Frenzy */                1,
	/* Gelato */               20,
	/* Generator Ball */        4,
	/* Ghost */                 8,
	/* Giga */                  1,
	/* Glue */                 40,
	/* Gravity */               4,
	/* Hold Once */            40,
	/* Hacker */                4,
	/* Halo */                  4,
	/* HaHa */                 20,
	/* Heaven */               40,
	/* Ice Ball */             20,
	/* Illusion */             40,
	/* Indigestion */           8,
	/* Intelligent Shadow */    4,
	/* Invert */               40,
	/* Irritate */             20,
	/* Javelin */               4,
	/* Junk */                 20,
	/* Jewel */                20,
	/* Joker */                 8,
	/* Kamikaze */              1,
	/* Knocker */              40,
	/* Laceration */            2,
	/* Large Ball */           20,
	/* Laser */                40,
	/* Laser Plus */            8,
	/* Laser Ball */           40,
	/* Lock */                 40,
	/* Luck */                  2,
	/* Magnet */                4,
	/* Mega */                  4,
	/* Missile */               4,
	/* Mobility */              8,
	/* Multiple */             40,
	/* Mystery */               8,
	/* Nano */                  1,
	/* Nebula */                4,
	/* New Ball */             40,
	/* Node */                 20,
	/* Normal Ball */          20,
	/* Normal Ship */          20,
	/* Nervous */               8,
	/* Oldie */                 1,
	/* Open */                  8,
	/* Orbit */                40,
	/* Particle */             40,
	/* Pause */                20,
	/* Player */                2,
	/* Probe */                 8,
	/* Poison */                2,
	/* Protect */              40,
	/* Quake */                 4,
	/* Quasar */                2,
	/* Quadruple */             8,
	/* Rapidfire */            20,
	/* Restrict */             80,
	/* Regenerate */           20,
	/* Re-Serve */             40,
	/* Reset */                 4,
	/* Risky Mystery */         8,
	/* Rocket */                2,
	/* Row Bomber */            8,
	/* Shrink */               10,
	/* Shadow */                8,
	/* Shotgun */               4,
	/* Sight Laser */          20,
	/* Slow */                 80,
	/* Snapper */               4,
	/* Slug */                  8,
	/* Terraform */             2,
	/* Time Warp */             4,
	/* Trail */                 8,
	/* Tractor */              20,
	/* Transform */             8,
	/* Triple */               40,
	/* Twin */                 20,
	/* Two */                  40,
	/* Ultraviolet */           8,
	/* Unification */           1,
	/* Undead */               20,
	/* Unlock */                4,
	/* Undestructible */        4,
	/* Vendetta */             20,
	/* Vector */                4,
	/* Venom */                 4,
	/* Volt */                 40,
	/* Voodoo */               20,
	/* Warp */                  1,
	/* Weak */                 20,
	/* Weight */                8,
	/* Wet Storm */             4,
	/* Whisky */                8,
	/* X-Bomb */                2,
	/* X-Ray */                 2,
	/* Yoyo */                  8,
	/* Yoga */                  8,
	/* Y-Return */              8,
	/* Buzzer */                4,
	/* Zeal */                  8,
	/* Zen Shove */            20,
];

//Weight and Default values are right justified
//If Weight != Default, put an left-alighted asterisk in Default
let POWERUP_TEMPLATE = `
---------------------------------------------------
| Powerup Name       | Weight | Chance  | Default |
---------------------------------------------------
| Intelligent Shadow |    999 | 3.1415% | *    42 |
| Risky Mystery      |      8 | 3.1415% |       8 |
---------------------------------------------------
`.trim();

let instructions = `
-Modify ONLY the values within the "Weight" column.
-Click on the "Apply" button to register the weights.
-The "Chance" column will automatically be updated to reflect the weights.
-Any invalid weights will be reverted back to the default value.
-Custom chances will be saved for this level only.
`.trim();

class PowerupChancesState extends State{
	static sortNames = [
		"Powerup Name,  Ascending",
		"Powerup Name,  Descending",
		"Weight,  Ascending",
		"Weight,  Descending",
	];

	static sortFunctions = [
		//powerup names will never be the same
		function(a, b){
			return a[0].localeCompare(b[0]);
		},
		function(a, b){
			return -(a[0].localeCompare(b[0]));
		},
		function(a, b){
			let val = a[1] - b[1];
			if (val != 0)
				return val;
			return a[0].localeCompare(b[0]);
		},
		function(a, b){
			let val = b[1] - a[1];
			if (val != 0)
				return val;
			return a[0].localeCompare(b[0]);
		},
	];

	constructor(editorstate){
		super();
		this.editorstate = editorstate;
		let powerupChances = editorstate.powerupChances;
		this.powerupChances = powerupChances;

		this.windowTitle = "Edit Powerup Chances";

		let sortStr = localStorage.getItem("powerup_sort");
		if (sortStr === null){
			localStorage.setItem("powerup_sort", "0");
			sortStr = "0";
		}
		this.sortMode = Number(sortStr);

		let stage = new PIXI.Container();
		this.stage = stage;

		stage.addChild(new PIXI.Graphics()
			.beginFill(PALETTE["main0"])
			.drawRect(0, 0, DIM.w, DIM.h)
		);

		//Global Text + Input
		stage.addChild(printText("Global Spawn Rate: ", "arcade", 0x000000, 1, 20, 20));
		stage.addChild(printText("-Chance a Normal Brick drops a Powerup on death.", "windows", 0x000000, 1, 20, 40));
		stage.addChild(printText(`%, Default: ${GLOBAL_POWERUP_CHANCE}%`, "arcade", 0x000000, 1, 315, 20));
		let globalTextBox = this.createNumInput(40, 18, 2);
		this.globalTextBox = globalTextBox;
		globalTextBox.position.set(264, 14);
		globalTextBox.maxLength = 3;
		globalTextBox.range = [0, 100];
		globalTextBox.onInput = (num) => {
			powerupChances.global = (num == GLOBAL_POWERUP_CHANCE) ? null : num;
		};
		globalTextBox.text = String(powerupChances.global);
		stage.addChild(globalTextBox);

		//Powerup Weights + intructions
		stage.addChild(printText("Powerup Spawn Weights", "arcade", 0x000000, 1, 20, 70));
		stage.addChild(printText(instructions, "windows", 0x000000, 1, 20, 90));

		//text area
		let textArea = this.createTextArea(500, 400, 14);
		this.textArea = textArea;
		textArea.position.set(20, 180);
		stage.addChild(textArea);
		//Updating in real time is a bad idea since sort-by-weight mode
		//will cause the values to be rearranged in the middle of typing
		// textArea.on("input", (text) => {
		// 	console.log("update");
		// });

		// this.textArea.text = POWERUP_TEMPLATE;
		textArea.text = this.generateTable();

		let right = new PIXI.Container();
		right.position.set(540, 0);
		stage.addChild(right);

		function placeButton(name, x, y, w, h, scale=1){
			let butt = new Button(x, y, w, h);
			butt.addCentered(printText(name, "arcade", 0x000000, scale));
			butt.hoverGuard = false;
			right.addChild(butt);
			return butt;
		}

		//Apply Button
		let apply = placeButton("Apply", 0, 20, 240, 100, 2);
		apply.onClick = () => {
			this.parseTable(textArea.text);
			textArea.text = this.generateTable();
		};

		//Rest of the buttons
		let config = [
			["Reset To Default", 0],
			["Set All", 30],
			["Replace", 30],
			["Sort Order", 0],
		];
		let buttons = [];
		let gap = 70;
		let totalOffset = 0;
		for (let [name, offset] of config){
			buttons.push(placeButton(name, 0, 180 + totalOffset, 240, 40));
			totalOffset += gap + offset;
		}
		
		let butt;
		//Reset Button
		butt = buttons[0];
		butt.onClick = () => {
			powerupChances.global = GLOBAL_POWERUP_CHANCE;
			powerupChances.weights = [...DEFAULT_WEIGHTS];
			
			globalTextBox.text = String(GLOBAL_POWERUP_CHANCE);
			textArea.text = this.generateTable();
		};

		function setSanitize(input){
			input.maxLength = 10;
		}

		//Set All Button
		butt = buttons[1];
		let setAllBox = this.createNumInput(80, 14, 2);
		setAllBox.position.set(butt.x, butt.y + butt.height + 10);
		setAllBox.text = "0";
		setSanitize(setAllBox);
		right.addChild(setAllBox);
		butt.onClick = () => {
			let value = Number(setAllBox.text);
			//replace all weights
			let weights = powerupChances.weights;
			for (let i = 0; i < weights.length; i++){
				weights[i] = value;
			}
			//update output
			textArea.text = this.generateTable();
		};

		//Replace Button
		butt = buttons[2];
		let replace1 = this.createNumInput(80, 14, 2);
		let replace2 = this.createNumInput(80, 14, 2);
		replace1.text = "0";
		replace2.text = "0";
		replace1.position.set(butt.x, butt.y + butt.height + 10);
		replace2.position.set(butt.x + 120, butt.y + butt.height + 10);
		setSanitize(replace1);
		setSanitize(replace2);
		right.addChild(replace1);
		right.addChild(replace2);
		right.addChild(printText("->", "arcade", 0x000000, 1, butt.x + 92, butt.y + butt.height + 10));
		butt.onClick = () => {
			let value1 = Number(replace1.text);
			let value2 = Number(replace2.text);
			//replace weights that match value1
			let weights = powerupChances.weights;
			for (let i = 0; i < weights.length; i++){
				if (weights[i] == value1)
					weights[i] = value2;
			}
			//update output
			textArea.text = this.generateTable();
		};

		//Sort Button
		butt = buttons[3];
		let sortNames = PowerupChancesState.sortNames;
		let sortText = printText(sortNames[this.sortMode], 
			"windows", 0x000000, 1, butt.x, butt.y + butt.height + 10);
		right.addChild(sortText);
		butt.onClick = () => {
			this.sortMode = (this.sortMode + 1) % 4;
			localStorage.setItem("powerup_sort", String(this.sortMode));
			sortText.text = sortNames[this.sortMode];
			textArea.text = this.generateTable();
		};

		//Back Button
		let back = new Button(DIM.w - 10 - 100, DIM.h - 10 - 40, 100, 40);
		back.addCentered(printText("Back", "arcade", 0x000000, 1));
		back.onClick = function() {
			game.pop();
		};
		stage.addChild(back);
	}

	calculateChances(weights){
		let sum = weights.reduce((a, b) => a + b);
		if (sum == 0)
			return new Array(weights.length).fill(0);
		return weights.map(x => (x / sum));
	}

	//pad is the template string such as "      " or "00000"
	//str is what goes over the pad
	pad(pad, str, right=false){
		if (right)
			return (pad + str).slice(-pad.length);
		else
			return (str + pad).substring(0, pad.length);
	}

	// calculateDiff(arr1, arr2){
	// 	let diff = 0;
	// 	for (let i = 0; i < arr1.length; i++){
	// 		if (arr1[i] != arr2[i])
	// 			diff++;
	// 	}
	// }

	//generate a table based on editorstate's powerup chances
	//returns a string
	generateTable(){
		let weights = this.powerupChances.weights;
		let chances = this.calculateChances(weights);

		//create a table of raw values containing strings + numbers
		let table = [];
		for (let [id, name] of POWERUP_NAMES.entries()){
			let weight = weights[id];
			let default_weight = DEFAULT_WEIGHTS[id];
			let chance = chances[id];
			table.push([name, weight, chance, default_weight]);
		}

		//sort the table based on sort mode
		let func = PowerupChancesState.sortFunctions[this.sortMode];
		table.sort(func);

		//convert each value in the table to a string
		let table2 = [];
		for (let [name, weight, chance, default_weight] of table){
			weight = String(weight);
			default_weight = String(default_weight);
			chance = (chance*100).toFixed(4) + "%";
			table2.push([name, weight, chance, default_weight]);
		}

		let titles = [
			"Powerup Name",
			"Weight",
			"Chance",
			"Default",
		];
		//for each column, get max character length
		let columnLength = [];
		let rowLength = 3*3 + 2*2; //three " | " + "| " + " |";
		for (let j = 0; j < 4; j++){
			let len = 0;
			for (let i = 0; i < table2.length; i++){
				len = Math.max(len, table2[i][j].length);
			}
			//for default weight, have to take in account the extra asterisk "* "
			if (j == 3)
				len = Math.max(titles[3].length, len + 2);
			else
				len = Math.max(titles[j].length, len);
			columnLength.push(len);
			rowLength += len;
		}

		//reusable padding
		let pads = columnLength.map(n => " ".repeat(n));
		pads.push(" ".repeat(columnLength[3] - 2));

		//begin string construction
		let lines = [];
		lines.push("-".repeat(rowLength));
		//each title is left aligned based on columnLength
		let titles2 = titles.map((title, index) => this.pad(pads[index], title));
		lines.push("| " + titles2.join(" | ") + " |");
		lines.push(lines[0]);
		//assemble each powerup row
		for (let [name, weight, chance, default_weight] of table2){
			name = this.pad(pads[0], name, false);
			weight = this.pad(pads[1], weight, true);
			chance = this.pad(pads[2], chance, true);
			let diff = Number(weight) !== Number(default_weight);
			if (diff)
				default_weight = "* " + this.pad(pads[4], default_weight, true);
			else
				default_weight = this.pad(pads[3], default_weight, true);

			lines.push("| " + [name, weight, chance, default_weight].join(" | ") + " |");
		}
		lines.push(lines[0]);
		
		return lines.join("\n");
	}

	//parses the names + weights from the string and stores them in editorstate
	parseTable(text){
		//reset the weights
		let powerupChances = this.powerupChances;
		powerupChances.weights = [...DEFAULT_WEIGHTS];
		let weights = powerupChances.weights;

		let lines = text.split("\n");
		for (let line of lines){
			let tokens = line.split("|");
			if (tokens.length < 3)
				continue;
			//tokens[0] should be empty space
			//tokens[1] and tokens[2] should be name and weight
			let name = tokens[1].trim();
			let weight = tokens[2].trim();
			//verify that name is a valid powerup name
			let id = POWERUP_ID_LOOKUP[name];
			if (id === undefined)
				continue;
			//verify that weight is a valid number
			//"" will be converted to 0
			if (weight == "")
				weight = 0;
			else{
				//if there are multiple numbers separated by spaces, then process the 1st one
				weight = Number(weight.split(" ")[0]);
				if (Number.isNaN(weight))
					continue;
			}
			//no negative weights allowed
			weight = Math.max(0, weight);
			//no floats allowed
			weight = Math.floor(weight);
			//store the weight
			weights[id] = weight;
		}
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}

		//for some reason, the textboxes do not automatically lose focus once
		//you click outside of them, so I have to manually implement them for
		//this state only
		if (mouse.m1 == 1){
			if (!this.mouseInInput()){
				for (let input of this._textInputs)
					input.blur();
			}
		}
	}
}