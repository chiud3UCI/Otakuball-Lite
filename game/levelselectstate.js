/*
LevelSelectState
	Stage
		Base
			Panels[] (only 1 panel can be visible at a time)
				left widget (file list)
				right widget (preview)
		Tabs[]
		Buttons ()
			Close is universal
			Play
			Save
			Load
*/

//sorts all user levels by level name
function sortLevels(list=null){
	if (!list)
		list = levels.user.list;
	list.sort((a, b) => a[0].localeCompare(b[0]));
}

class LevelSelectState extends State{
	//mode is one of ["play", "load", "save", "manager"]
	constructor(isPlaylist, mode){
		super();

		this.isPlaylist = isPlaylist;
		this.mode = mode;
		let title = "null";
		if (mode == "play"){
			if (isPlaylist)
				title = "Playlist Select";
			else
				title = "Level Select";
		}
		else if (mode == "load")
			title = "Load Level";
		else if (mode == "save")
			title = "Save Level";
		else if (mode == "manager")
			title = "Level Manager";

		this.windowTitle = title;
		
		let stage = new PIXI.Container();
		stage.sortableChildren = true;
		this.stage = stage;

		let bg = new PIXI.Graphics();
		fillRect(bg, "main0", 0, 0, DIM.w, DIM.h);
		bg.zIndex = -2;
		stage.addChild(bg);

		let tab_height = 40;
		let base = new Base(20, 10 + tab_height, DIM.w - 20*2, DIM.h - 10 - 20 - tab_height);
		base.zIndex = 0;
		stage.addChild(base);
		base.parentState = this;
		this.base = base;

		//create one panel per tab
		this.panels = [];
		for (let i = 0; i < 2; i++){
			let panel = new LSS_Panel(base, isPlaylist, !!i);
			base.addChild(panel);
			panel.fileList.initMask(); //called here after everything is attached
			this.panels.push(panel);
		}
		this.panel = null; //will be set when selecting the first tab

		var skip_tab_save = true;

		//create tabs
		let tab_w = 110;
		let tab_h = 40;
		let tabs = [];
		for (let [i, name] of ["Default", "User"].entries()){
			let tab = new TabButton(
				base.x + (tab_w-4)*i, 
				base.y - tab_h + 6, 
				tab_w, tab_h, tabs, i
			);
			let text = printText(name, "arcade", 0x000000, 1)
			tab.addCentered(text);
			stage.addChild(tab);
			tabs.push(tab);
			tab.parentState = this;
			tab.onStateChange = function(value){
				if (!value)
					return;
				let index = this.tabIndex;
				let panels = this.parentState.panels;
				for (let [i, panel] of panels.entries()){
					if (i !== index){
						panel.hideTextInput();
						panel.visible = false;
					}
				}
				let panel = panels[index];
				panel.visible = true;
				panel.showTextInput();
				this.parentState.panel = panel;

				if (!skip_tab_save && value){
					localStorage.setItem("last_selected_tab", this.tabIndex);
				}
			};
			if ((mode == "save" || mode == "manager") && i == 0){
				text.tint = 0x777777;
				tab.interactive = false;
			}
		}
		if (mode == "save" || mode == "manager")
			tabs[1].pointerDown();
		else{
			let str = localStorage.getItem("last_selected_tab") ?? "0";
			tabs[Number(str)].pointerDown();
		}

		skip_tab_save = false;

		//create buttons (back, play, save, etc) based on mode
		let bw = (mode == "manager") ? 90 : 80;
		let bh = 40;
		this.initButtons(
			base.width - bw - 16,
			base.height - bh - 16,
			bw,
			bh
		);

		//create notification message that goes above the buttons
		let message = printText("", "arcade", 0xFF0000, 1, base.width/2, base.height - 80)
		message.visible = false;
		this.message = message;
		this.messageTimer = 0;
		base.addChild(message);

		//draw dividers
		let dividers = new PIXI.Graphics();
		base.addChild(dividers);
		//vertical
		let x = base.width/2;
		let y = 8;
		let height = base.height - 90 - y*2; //gap from horizontal line
		drawDivider(dividers, "vertical", x, y, height);
		//horizontal
		x = 8;
		y = base.height - 90;
		let width = base.width - x*2 - 2;
		drawDivider(dividers, "horizontal", x, y, width);
	}

	initButtons(x, y, w, h){
		let index = 0;
		let makeButton = (name, func) => {
			let butt = new Button(x - (index * (w + 10)), y, w, h, "light");
			index++;
			butt.hoverGuard = false;
			butt.addCentered(printText(name, "arcade", 0x000000, 1));
			butt.onClick = func;
			this.base.addChild(butt);
		};

		makeButton("Back", () => {game.pop();});
		if (this.mode == "play"){
			makeButton("Play", () => {this.panel.onPlay();});
		}
		else if (this.mode == "load"){
			makeButton("Load", () => {this.panel.onLoad();});
		}
		else if (this.mode == "save"){
			makeButton("Save", () => {this.panel.onSave();});
		}
		else if (this.mode == "manager"){
			makeButton("Delete", () => {this.panel.onDelete();});
			makeButton("Copy", () => {this.panel.onCopy();});
			makeButton("Move", () => {this.panel.onMove();});
		}
	}

	//can also use "red" and "green" for shortcuts
	setMessage(message, color=0x000000, timer=3000){
		// console.log(`set message="${message}", color=${color}, timer=${timer}"`);
		if (color === "red")
			color = PALETTE["status_red"];
		else if (color === "green")
			color = PALETTE["status_green"];
		this.message.text = message;
		this.message.tint = color;
		this.message.visible = true;
		this.messageTimer = timer;
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}

		if (this.message.visible){
			this.messageTimer -= delta;
			if (this.messageTimer <= 0)
				this.message.visible = false;
		}
		this.panel.update(delta);
	}
}

//LSS is short for LevelSelectState
class LSS_Panel extends PIXI.Container{
	constructor(base, isPlaylist, isUser){
		super();
		this.base = base;
		this.isPlaylist = isPlaylist;
		this.isUser = isUser;

		this.selectedIndex = null;

		if (isPlaylist){
			//the default playlist should be static
			//but the user playlist should be generated every time we enter PlaylistSelect
			if (isUser)
				this.database = new FileDatabase(levels.user.list, true);
			else
				this.database = playlists.default;
		}
		else
			this.database = isUser ? levels.user : levels.default;

		//left widget
		this.fileList = new LSS_FileList(this);
		this.addChild(this.fileList);
		//right widget
		if (isPlaylist)
			this.preview = new LSS_PlaylistPreview(this);
		else{
			let mode = base.parentState.mode;
			this.preview = new LSS_LevelPreview(this, (mode == "play") ? "default" : "detailed");
		}
		this.addChild(this.preview);
		//bottom left textbox
		if (base.parentState.mode == "manager"){
			this.textBox = new LSS_TextBox(this, "src");
			this.textBox2 = new LSS_TextBox(this, "dest");
			this.addChild(this.textBox);
			this.addChild(this.textBox2);
		}
		else{
			this.textBox = new LSS_TextBox(this);
			this.addChild(this.textBox);
		}
	}

	destructor(){
		this.textBox.destructor();
		this.textBox2?.destructor();
	}

	selectIndex(index){
		this.selectedIndex = index;
		if (index === null)
			this.preview.clear();
		else{
			let [name, object] = this.database.at(index);
			if (this.isPlaylist)
				this.preview.setPlaylist(object);
			else
				this.preview.setLevel(name, object);
		}
	}

	setMessage(message, color, timer){
		this.base.parentState.setMessage(message, color, timer);
	}

	onPlay(){
		let filename = this.textBox.input.text;
		let arr = this.database.get(filename);
		if (!arr)
			this.textBox.setMessage("Level does not exist!", "red");
		else{
			if (this.isPlaylist){
				let list = arr[1].map(x => x[1]);
				game.push(new PlayState("playlist", list, 0));
			}
			else
				game.push(new PlayState("play", arr[1]));
		}
	}

	onLoad(){
		let filename = this.textBox.input.text;
		let arr = this.database.get(filename);
		if (!arr)
			this.textBox.setMessage("Level does not exist!", "red");
		else{
			let editorstate = game.getState(-2);
			editorstate.loadLevel(arr[1]);
			game.pop();
		}
	}

	static validName(name){
		if (name.length == 0)
			return false;
		//cannot have slash at beginning or end of string
		if (name[0] === "/" || name[name.length-1] === "/")
			return false;
		//cannot have more than 1 slash
		let slashFound = false;
		for (let char of name){
			if (char === "/"){
				if (slashFound)
					return false;
				slashFound = true;
			}
		}
		return true;
	}

	onSave(){
		let db = this.database;
		let name = this.textBox.input.text;

		if (!LSS_Panel.validName(name)){
			this.setMessage("Invalid name!", "red");
			return;
		}

		let editorstate = game.getState(-2);
		let level = editorstate.createLevel();

		if (db.has(name)){
			let dialogue = new DialogueBox(400, 200, "Confirm Override");
			dialogue.setMessage(`"${name}" already exists. Are you sure you want to override it?`);
			dialogue.addButton("Cancel", 90, 40, () => {
				game.pop();
			});
			dialogue.addButton("Yes", 90, 40, () => {
				db.set(name, level);
				this.preview.setLevel(name, level, true);
				this.setMessage("Level saved!", "green");
				playSound2("board_saved");
				db.save("user_levels");
				game.pop();
			});
			game.push(dialogue);
		}
		else{
			db.set(name, level);
			let fileList = this.fileList;
			fileList.createListButtons();
			fileList.scrollBar.resize();

			let index = db.indexOf(name);
			fileList.selectButton(index);
			fileList.seek(index);

			this.selectIndex(index);
			playSound2("board_saved");

			db.save("user_levels");
		}
	}

	onDelete(){
		let db = this.database;
		let name = this.textBox.input.text;

		if (!db.has(name)){
			this.setMessage("Level does not exist!", "red");
			return;
		}

		let dialogue = new DialogueBox(400, 200, "Confirm Delete");
		dialogue.setMessage(`Are you sure you want to delete "${name}"?`);
		dialogue.addButton("Cancel", 90, 40, () => {
			game.pop();
		});
		dialogue.addButton("Yes", 90, 40, () => {
			db.delete(name);

			let fileList = this.fileList;
			fileList.createListButtons();
			fileList.scrollBar.resize();

			this.selectIndex(null);
			fileList.selectButton(null);

			this.setMessage("Level Deleted!", "green");
			playSound2("board_saved");

			db.save("user_levels");

			game.pop();
		});
		game.push(dialogue);
	}

	onMove(){
		let db = this.database;
		let src = this.textBox.input.text;
		let dest = this.textBox2.input.text;

		if (!db.has(src)){
			this.setMessage("Level does not exist!", "red");
			return;
		}
		if (!LSS_Panel.validName(dest)){
			this.setMessage("Invalid Destination name!", "red");
			return;
		}
		if (src == dest){
			this.setMessage("Source and Destination cannot be the same!", "red");
			return;
		}

		let move = () => {
			db.set(dest, db.get(src)[1]);
			db.delete(src);

			let fileList = this.fileList;
			fileList.createListButtons();
			fileList.scrollBar.resize();

			let index = db.indexOf(dest);
			this.selectIndex(index);
			fileList.selectButton(index);

			this.setMessage("Move Successful!", "green");
			playSound2("board_saved");

			db.save("user_levels");
		};

		if (db.has(dest)){
			let dialogue = new DialogueBox(400, 200, "Confirm Override");
			dialogue.setMessage(`"${dest}" already exists. Are you sure you want to override it?`);
			dialogue.addButton("Cancel", 90, 40, () => {
				game.pop();
			});
			dialogue.addButton("Yes", 90, 40, () => {
				move();
				game.pop();
			});
			game.push(dialogue);
		}
		else{
			move();
		}
	}

	onCopy(){
		let db = this.database;
		let src = this.textBox.input.text;
		let dest = this.textBox2.input.text;

		if (!db.has(src)){
			this.setMessage("Level does not exist!", "red");
			return;
		}
		if (!LSS_Panel.validName(dest)){
			this.setMessage("Invalid Destination name!", "red");
			return;
		}
		if (src == dest){
			this.setMessage("Source and Destination cannot be the same!", "red");
			return;
		}

		let copy = () => {
			db.set(dest, db.get(src)[1]);

			let fileList = this.fileList;
			fileList.createListButtons();
			fileList.scrollBar.resize();

			let index = db.indexOf(dest);
			this.selectIndex(index);
			fileList.selectButton(index);

			this.setMessage("Copy Successful!", "green");
			playSound2("board_saved");

			db.save("user_levels");
		};

		if (db.has(dest)){
			let dialogue = new DialogueBox(400, 200, "Confirm Override");
			dialogue.setMessage(`"${dest}" already exists. Are you sure you want to override it?`);
			dialogue.addButton("Cancel", 90, 40, () => {
				game.pop();
			});
			dialogue.addButton("Yes", 90, 40, () => {
				copy();
				game.pop();
			});
			game.push(dialogue);
		}
		else{
			copy();
		}
	}

	hideTextInput(){
		this.textBox.hide();
		this.textBox2?.hide();
	}

	showTextInput(){
		this.textBox.unhide();
		this.textBox2?.unhide();
	}

	updateTextBoxText(){
		let name = this.database.at(this.selectedIndex)[0];
		this.textBox.input.text = name;
	}

	updateFileListButton(){
		let index = this.selectedIndex;
		let fileList = this.fileList;
		fileList.selectButton(index);
	}

	update(delta){
		this.fileList.update(delta);
		this.textBox.update(delta);
	}
}

class LSS_FileList extends PIXI.Container{
	constructor(panel){
		super();
		this.panel = panel;
		this.position.set(16, 16);

		let fr = fillRectGrey;
		let text_w = 300;
		let text_h = 400;
		let box_w = text_w + 4;
		let box_h = text_h + 4;
		let whiteBox = new PIXI.Graphics(); //300 400
		// fr(whiteBox, 0xF0, 0, 0, box_w, box_h); //bottom right
		fr(whiteBox, 0x64, 0, 0, box_w-0, box_h-0); //top left
		// fr(whiteBox, 0xC0, 2, 2, box_w-2, box_h-2); //inner bottom right
		fr(whiteBox, 0xFF, 2, 2, box_w-4, box_h-4); //middle white box
		this.addChild(whiteBox);
		this.whiteBox = whiteBox;

		let textdim = {
			x: 4, y: 2, w: text_w, h: text_h
		};
		this.textdim = textdim;

		//how many pixels high each button is
		let lh = 18;
		this.lineHeight = lh; 
		//how many lines can fit in the textbox
		this.rowHeight = Math.floor(text_h / lh);

		let fileList = new PIXI.Container();
		this.addChild(fileList);
		this.fileList = fileList;
		
		this.allListButtons = [];
		for (let [i, [name, level]] of panel.database.list.entries()){
			let y = i * lh;
			let butt = new LSS_FileButton(
				this, name, textdim.x, textdim.y + y, textdim.w, lh, i);
			fileList.addChild(butt);
			this.allListButtons.push(butt);
		}

		let listHeight = this.allListButtons.length * lh;
		this.scrollHeight = Math.max(0, 4 + listHeight - textdim.h);

		let scrollBar = new LSS_ScrollBar(
			this, box_w + 4, 0, 18, box_h, 100
		);
		this.addChild(scrollBar);
		this.scrollBar = scrollBar;
	}

	clearListButtons(){
		for (let butt of this.allListButtons){
			this.fileList.removeChild(butt);
		}
	}

	createListButtons(){
		let lh = this.lineHeight;
		let textdim = this.textdim;

		//clear any previous list buttons
		for (let butt of this.allListButtons)
			this.fileList.removeChild(butt);

		this.allListButtons = [];
		for (let [i, [name]] of this.panel.database.list.entries()){
			let y = i * lh;
			let butt = new LSS_FileButton(
				this, name, textdim.x, textdim.y + y, textdim.w, lh, i);
			this.fileList.addChild(butt);
			this.allListButtons.push(butt);
		}

		let listHeight = this.allListButtons.length * lh;
		this.scrollHeight = Math.max(0, 4 + listHeight - textdim.h);
	}

	initMask(){
		let p = this.whiteBox.getGlobalPosition();
		let {x, y, w, h} = this.textdim;
		this.fileList.mask = new Mask(p.x, p.y+2, w, h);
	}

	selectButton(index){
		for (let [i, button] of this.allListButtons.entries()){
			button.setHighlight(i === index);
		}
	}

	//will make sure selected file button is in view (and scroll list if not)
	seek(index){
		let lh = this.lineHeight;
		let fileList = this.fileList;
		let levelIndex = clamp(-fileList.y / lh, index - 25 + 1, index);
		fileList.y = -levelIndex * lh;
		this.updateScrollBar();
	}

	onScroll(ratio){
		this.fileList.y = -this.scrollHeight * ratio;
	}

	updateScrollBar(){
		const y = this.fileList.y;
		const ratio = -y / this.scrollHeight;
		let bar = this.scrollBar;
		bar.bar.y = ratio * bar.barMaxY;
	}

	keyboardScroll(delta){
		function isPressed(str){
			return keyboard.isPressed(keycode[str]);
		}
		let focused = this.panel.textBox.input._hasFocus();
		let up = isPressed("UP") || (isPressed("W") && !focused);
		let down = isPressed("DOWN") || (isPressed("S") && !focused);
		if (!(up || down))
			return;
		//select next level that's below or up
		let buttons = this.allListButtons;
		let index = 0;
		if (this.selectedIndex !== null)
			index = this.panel.selectedIndex + (down ? 1 : -1);
		if (index < 0 || index >= buttons.length)
			return;
		buttons[index].pointerDown();
		this.seek(index);
	}

	update(delta){
		//scrolling with keyboard
		this.keyboardScroll(delta);
		
		//scrolling with mouse wheel
		if (mouse.scroll != 0){
			let sign = mouse.scroll > 0 ? -1 : 1;
			let y = this.fileList.y;
			y = clamp(y + 4 * sign * this.lineHeight, -this.scrollHeight, 0);
			this.fileList.y = y;
			this.updateScrollBar();
		}
	}
}

class LSS_FileButton extends PIXI.Container{
	constructor(fileList, str, x, y, w, h, index){
		super();
		this.position.set(x, y);

		this.index = index;
		this.fileList = fileList;

		let highlight = new PIXI.Graphics()
			.beginFill(0xFFFF00)
			.drawRect(0, 0, w, h);
		//setting highlight.visible = false
		//will make the button unselectable
		highlight.alpha = 0;
		this.addChild(highlight);
		this.highlight = highlight;

		let text = new PIXI.Text(str, {
			fontFamily: "Courier New",
			fontWeight: "bold",
			fontSize: 18,
			fill: 0x000000
		});
		text.position.set(0, -2);
		this.addChild(text);

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
	}

	setHighlight(value){
		let hl = this.highlight;
		if (value === undefined)
			value = !hl.alpha;
		hl.alpha = value ? 1 : 0;
	}

	pointerDown(e){
		let fileList = this.fileList;
		fileList.selectButton(this.index);
		fileList.panel.selectIndex(this.index, "textbox");
		fileList.panel.updateTextBoxText();
	}
}

class LSS_ScrollBar extends PIXI.Container{
	constructor(fileList, x, y, w, h){
		super();
		this.fileList = fileList;
		this.position.set(x, y);

		this.baseWidth = w;
		this.baseHeight = h;

		//the long grey space the scroll bar can move in
		// let base = new PIXI.Graphics()
		// 	.beginFill(0xC0C0C0)
		// 	.drawRect(0, 0, w, h);
		let base = new PIXI.Graphics();
		fillRectGrey(base, 0xDC, 0, 0, w, h);
		this.addChild(base);

		//the actual scroll bar
		this.bar = new PIXI.Graphics();
		this.addChild(this.bar);
		this.disabled = false;
		this.resize();

		this.down = null;

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
		this.on("pointerup", (e) => {this.pointerUp(e);});
		this.on("pointermove", (e) => {this.pointerMove(e);});
	}

	resize(){
		let fr = fillRectGrey;
		let bar = this.bar;
		let bw = this.baseWidth;
		let bh = this.baseHeight;
		//calculate the size of scroll bar based on how many items
		//are on the file list
		let fileList = this.fileList;
		let n = fileList.allListButtons.length;
		let rh = fileList.rowHeight;
		let ratio = rh / Math.max(1, n);
		if (ratio >= 1){
			this.barHeight = bh;
			bar.visible = false;
			this.disabled = true;
		}
		else{
			this.barHeight = bh * ratio;
			bar.visible = true;
			this.disabled = false;
		}
		this.barMaxY = bh - this.barHeight;

		// console.log("ratio: " + ratio);
		// console.log(`row height: ${rh} / num buttons: ${n}`);

		//redraw the actual scroll bar
		let bar_h = this.barHeight;
		bar.clear();
		fr(bar, 0x00, 0, 0, bw,   bar_h);
		fr(bar, 0xFF, 0, 0, bw-2, bar_h-2);
		fr(bar, 0x50, 2, 2, bw-4, bar_h-4);
		fr(bar, 0x90, 2, 2, bw-6, bar_h-6);
	}

	pointerDown(e){
		if (this.disabled)
			return;
		let by = this.bar.y
		let my = e.data.global.y;
		this.down = [by, my];
	}

	pointerUp(e){
		this.down = null;
	}

	pointerMove(e){
		if (this.disabled)
			return;
		if (!this.down)
			return;
		if (!mouse.m1 && !mouse.m2){
			this.down = null;
			return;
		}

		let [by, my0] = this.down;
		let my1 = e.data.global.y;
		let off = my1 - my0;
		let y_max = this.barMaxY;
		let new_y = Math.max(0, Math.min(y_max, by + off));
		this.bar.y = new_y;
		this.fileList.onScroll(new_y / y_max);
	}
}

class LSS_LevelPreview extends PIXI.Container{
	//modes:
	//	default: show level + enemies
	//	minimal: show level
	//	detailed: show level + enemies + enemy spawn timers
	constructor(panel, mode="default"){
		super();
		this.position.set(400, 16);
		this.addChild(makeSprite("border"));
		let levelSprite = new PIXI.Sprite().setTransform(8, 8);
		this.addChild(levelSprite);
		this.levelSprite = levelSprite;

		if (mode != "minimal")
			this.initEnemyDisplay(260, 0, (mode=="detailed"));

		this.cache = new Map();

		this.preview = null;
	}

	initEnemyDisplay(x, y, showTimers=false){
		let display = new PIXI.Container();
		display.position.set(x, y);
		//create enemy sprite indicators
		display.sprites = [];
		let index = 0;
		function add(i, j){
			let sprite = new Sprite(
				`editorenemy_${i}_${j}`,
				Math.floor(index / 5) * 24,
				(index %5 ) * 24
			);
			sprite.anchor.set(0);
			display.addChild(sprite);
			display.sprites.push(sprite);
			index++;
		}
		add(2, 2);
		for (let i = 0; i < 4; i++)
			add(0, 2+i);
		for (let i = 0; i < 4; i++)
			add(1, i);
		//enemy spawn timers
		let text = new PIXI.Text("", {
			fontFamily: "Courier New",
			fontSize: 18,
			fontWeight: "bold",
		});
		text.position.set(0, 130);
		if (showTimers)
			display.addChild(text);
		display.timerText = text;

		display.reset = function(){
			const val = 0.33;
			for (let sprite of this.sprites)
				sprite.tint = Math.floor(0xFF * val) * 0x010101;
			this.timerText.text = "2\n2\n8";
		};

		display.setLevel = function(level){
			this.reset();
			let arr = level.enemies;
			if (!arr)
				return;
			for (let [i, v] of arr[0].entries()){
				if (v)
					this.sprites[i].tint = 0xFFFFFF;
			}
			if (arr[1]){
				this.timerText.text = arr[1].join("\n");
			}
			console.log(this.timerText.text);
		};

		display.reset();
		this.addChild(display);
		this.enemyDisplay = display;
	}

	static generate(level){
		let bw = 16*13;
		let bh = 8*32;
		let preview = PIXI.RenderTexture.create(
			{width: bw, height: bh});

		let cont = new PIXI.Container();

		let [color, tile] = level.bg;

		let bg = new PIXI.Graphics()
			.beginFill(color)
			.drawRect(0, 0, bw, bh);
		if (tile){
			let sprite = new PIXI.TilingSprite(
				media.textures[tile], DIM.boardw/2, DIM.boardh/2);
			bg.addChild(sprite);
		}
		cont.addChild(bg);

		for (let [i, j, id, patch] of level.bricks){
			let x = j * 16;
			let y = i * 8;
			let tex = brickData.lookup[id].tex;
			let sprite = makeSprite(tex, 1, x, y);
			// renderer.render(sprite, preview);
			cont.addChild(sprite);
		}

		renderer.render(cont, {renderTexture: preview});
		return preview;
	}

	clear(){
		this.levelSprite.texture = null;
		this.enemyDisplay?.reset();
	}

	setLevel(name, levelStr, replace=false){
		let level = JSON.parse(levelStr);
		if (replace || !this.cache.has(name)){
			this.cache.set(name, LSS_LevelPreview.generate(level));
		}
		let preview = this.cache.get(name);
		this.enemyDisplay?.setLevel(level);
		this.levelSprite.texture = preview;
	}

}

class LSS_PlaylistPreview extends PIXI.Container{
	constructor(panel){
		super();
		this.panel = panel;
		let base = panel.base;
		this.position.set(base.width/2 + 20, 20);
		this.addChild(new PIXI.Graphics()
			.beginFill(0xFFFFFF)
			.drawRect(0, 0, 320, 400)
		);
		let text = new PIXI.Text("Select a Playlist", {
			fontFamily: "Courier New",
			fontSize: 18,
			fontWeight: "bold",
		});
		text.position.set(5, 5);
		this.addChild(text);
		this.playlistPreview = text;
	}

	clear(){
		this.playlistPreview.text = "Select a Playlist";
	}

	setPlaylist(playlist){
		let names = playlist[1].map(arr => arr[0]);
		names = names.map(str => str.substring(str.indexOf("/")+1));
		this.playlistPreview.text = names.join("\n");
	}
}

class LSS_TextBox extends PIXI.Container{
	//keeps track of filename textbox and status message
	//mode can be either null, "src", or "dest"
	constructor(panel, mode=null){
		super();

		let x0 = 16;
		let y0 = 470;
		let dx = 0;
		let dy = 0;
		let w = 322; //will be converted to px string
		if (mode !== null){
			dx = 50;
			w -= 50;
		}
		if (mode == "src")
			dy = -10;
		else if (mode == "dest")
			dy = 20;
		this.mode = mode;

		this.panel = panel;
		this.position.set(x0 + dx, y0 + dy);

		let parentState = panel.base.parentState;
		let input = parentState.createTextInput(w, 18, 2);
		input.substituteText = false;
		input.position.set(0, 0);
		this.addChild(input);
		this.input = input;

		if (mode !== null){
			let str = (mode == "src") ? "Source" : "Dest";
			let text = printText(str, "windows", 0x000000, 1, -dx, 4);
			this.addChild(text);
		}

		if (mode != "dest"){
			let db = panel.database;
			input.on("input", name => {
				let index = db.indexOf(name);
				if (index < 0){
					panel.selectIndex(null);
					panel.fileList.selectButton(null);
				}
				else{
					panel.selectIndex(index);
					panel.fileList.selectButton(index);
					panel.fileList.seek(index);
				}
			});
		}

		//message
		// let message = printText("Test message please ignore", "arcade", 0x000000, 1, 0, 30);
		// let message = new PIXI.Text("test message", {
		// 	fontFamily: "Verdanda",
		// 	fontSize: 22,
		// 	fill: 0xFFFFFF
		// });
		// message.position.set(0, 30);
		// message.visible = false;
		// this.addChild(message);
		// this.message = message;
		// this.messageTimer = null;
	}

	destructor(){
		this.input.destroy();
	}

	hide(){
		this.input.blur();
		this.input.substituteText = true;
	}

	unhide(){
		this.input.substituteText = false;
	}

	static colors = {
		red: "0xFF0000",
		green: "0x33CC33"
	};

	setMessage(text, color, time=3000){
		// if (typeof(color) == "string")
		// 	color = LSS_TextBox.colors[color];
		// let message = this.message;
		// message.visible = true;
		// message.text = text;
		// message.tint = color;
		// this.messageTimer = time;
	}

	update(delta){
		// if (this.message.visible){
		// 	this.messageTimer -= delta;
		// 	if (this.messageTimer <= 0)
		// 		this.message.visible = false;
		// }
	}
}

//keeps track of stuff
class FileDatabase{
	//Backwards Compatibility: Convert each level object back to JSON string
	//	if not already done.
	//Remove this function before release
	static convert_level_object_to_string(list){
		for (let pair of list){
			let level = pair[1];
			if (typeof(level) === "string")
				return;
			pair[1] = JSON.stringify(level);
		}
	}

	static convert_to_seconds(list){
		for (let pair of list){
			let level_str = pair[1];
			let level = JSON.parse(level_str);
			if (!level.enemies)
				continue;
			let times = level.enemies[1];
			if (!times)
				continue;
			for (let i = 0; i < 3; i++)
				times[i] = Math.floor(times[i] / 1000);
			pair[1] = JSON.stringify(level);
		}
	}

	constructor(list, isPlaylist=false){
		if (isPlaylist){
			//group levels in playlists based on presence of "/" in name
			//map format: Map(playlist_name -> [playlist_name, Array of [full_level_name, level_JSON_string]])
			let map = new Map();
			this.map = map;
			for (let pair of list){
				let full_name = pair[0];
				let tokens = full_name.split("/");
				if (tokens.length == 1)
					continue;
				let playlist_name = tokens[0];
				if (!map.has(playlist_name))
					map.set(playlist_name, [playlist_name, []]);
				map.get(playlist_name)[1].push(pair);
			}
			this.list = Array.from(map.entries());
		}
		else{
			//map format: Map(name -> [name, level_JSON_string])
			//yes, name is redundant, but it makes life easier
			this.list = list;
			this.map = new Map();
			for (let pair of list){
				this.map.set(pair[0], pair);
			}
		}
	}

	has(name){
		return this.map.has(name);
	}

	indexOf(name){
		return this.list.findIndex(arr => arr[0] === name);
	}

	sort(){
		this.list.sort((a, b) => a[0].localeCompare(b[0]));
	}
	
	set(name, value){
		let list = this.list;
		let map = this.map;
		let newArr = [name, value];
		if (map.has(name)){
			list[this.indexOf(name)] = newArr;
		}
		else{
			list.push(newArr);
			this.sort();
		}
		map.set(name, newArr);
	}

	delete(name){
		if (!this.map.has(name))
			return false;
		this.list.splice(this.list.findIndex(arr => arr[0] == name), 1);
		this.map.delete(name);
		return true;
	}

	clear(){
		this.list = [];
		this.map = new Map();
	}

	at(index){
		return this.list[index];
	}

	get(name){
		return this.map.get(name);
	}

	//if prettyPrint is true, separate each list element by a newline
	toString(prettyPrint=false){
		if (!prettyPrint)
			return JSON.stringify(this.list);
		
		let buffer = "[\n";
		let lines = this.list.map((x) => JSON.stringify(x));
		buffer += lines.join(",\n");
		buffer += "\n]";

		return buffer;
	}

	save(key){
		// console.log("saving: " + this.toString());
		localStorage.setItem(key, this.toString());
	}

	//for OptionsState level import
	//check for conflicts
	mergeConflicts(newList){
		let conflicts = [];
		for (let [name, object] of newList){
			if (this.map.has(name))
				conflicts.push(name);
		}
		return conflicts;
	}

	merge(newList){
		//update the map first
		for (let [name, object] of newList)
			this.map.set(name, [name, object]);
		//reconstruct the internal list
		this.list = [];
		for (let [name, [name2, object]] of this.map.entries())
			this.list.push([name, object]);
		this.sort();
	}
}