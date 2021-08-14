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

class LevelSelectState{
	//mode is one of ["play", "load", "save"]
	constructor(isPlaylist, mode){
		ENABLE_RIGHT_CLICK = true;

		this.isPlaylist = isPlaylist;
		this.mode = mode;
		this.windowTitle = isPlaylist ? "Playlist Select" : "Level Select";

		let stage = new PIXI.Container();
		stage.sortableChildren = true;
		this.stage = stage;

		let bg = new PIXI.Graphics();
		bg.beginFill(0xAAAAAA)
			.drawRect(0, 0, DIM.w, DIM.h);
		bg.zIndex = -2;
		stage.addChild(bg);

		let tab_height = 40;
		let base = new Base(20, 10 + tab_height, DIM.w - 20*2, DIM.h - 10 - 20 - tab_height);
		base.zIndex = 0;
		stage.addChild(base);
		this.base = base;

		//TODO: make multiple panel instances
		this.panels = [];
		for (let i = 0; i < 2; i++){
			let panel = new LSS_Panel(base, !!i);
			base.addChild(panel);
			panel.fileList.initMask(); //called here after everything is attached
			this.panels.push(panel);
		}
		this.panel = null; //will be set when selecting the first tab

		var save_tab_selection = false;

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
						panel.visible = false;
						panel.hideTextInput();
					}
				}
				let panel = panels[index];
				panel.visible = true;
				panel.showTextInput();
				this.parentState.panel = panel;

				if (save_tab_selection && value){
					localStorage.setItem("last_selected_tab", this.tabIndex);
				}
			};
			if (mode == "save" && i == 0){
				text.tint = 0x777777;
				tab.interactive = false;
			}
		}
		if (mode == "save")
			tabs[1].pointerDown();
		else{
			let str = localStorage.getItem("last_selected_tab") ?? "0";
			tabs[Number(str)].pointerDown();
		}

		save_tab_selection = true;

		//create back button
		let bw = 80;
		let bh = 40;
		let backButton = new Button(base.width - bw - 16, base.height - bh - 16, bw, bh, 0xA0);
		backButton.addCentered(printText("Back", "arcade", 0x000000, 1));
		backButton.onClick = () => {
			game.pop();
		};
		base.addChild(backButton);

		//create Play/Load/Save button
		this.initPlayButton(
			base.width - bw*2 - 16*2,
			base.height - bh - 16,
			bw,
			bh
		);

		//draw dividers
		let dividers = new PIXI.Graphics();
		base.addChild(dividers);
		//vertical
		let x = base.width/2 - 20;
		let y = 8;
		let height = base.height - 90 - y*2; //gap from horizontal line
		
		dividers.beginFill(0xFFFFFF)
			.drawRect(x+1, y, 2, height)
			.beginFill(0x909090)
			.drawRect(x-1, y, 2, height);
		//horizontal
		x = 8;
		y = base.height - 90;
		let width = base.width - x*2 - 2;
		dividers.beginFill(0xFFFFFF)
			.drawRect(x, y+1, width, 2)
			.beginFill(0x909090)
			.drawRect(x, y-1, width, 2);
	}

	destructor(){
		ENABLE_RIGHT_CLICK = false;
		for (let panel of this.panels)
			panel.textBox.input.destroy();
	}

	initPlayButton(x, y, w, h){
		let butt = new Button(x, y, w, h, 0xA0);
		butt.hoverGuard = false;
		this.base.addChild(butt);

		if (this.mode == "play"){
			butt.addCentered(printText("Play", "arcade", 0x000000, 1));
			butt.onClick = () => {
				let panel = this.panel;
				let filename = panel.textBox.input.text;
				let arr = panel.database.get(filename);
				if (!arr)
					panel.textBox.setMessage("Level does not exist!", "red");
				else
					game.push(new PlayState("play", arr[1]));
			};
		}
		else if (this.mode == "load"){
			butt.addCentered(printText("Load", "arcade", 0x000000, 1));
			butt.onClick = () => {
				let panel = this.panel;
				let filename = panel.textBox.input.text;
				let arr = panel.database.get(filename);
				if (!arr)
					panel.textBox.setMessage("Level does not exist!", "red");
				else{
					let editorstate = game.getState(-2);
					editorstate.loadLevel(arr[1]);
					game.pop();
				}
			};
		}
		else if (this.mode == "save"){
			butt.addCentered(printText("Save", "arcade", 0x000000, 1));
			butt.onClick = () => {
				/* TODO: change levels.user.lookup to a Map<name, [name, level, ...];
					1. add level to level list (handle override)
					2. add level to level lookup
					3. add level button to FileList
					4. resize both FileList and its ScrollBar
					5. save all levels to localStorage.user_levels
				*/
				let panel = this.panel;
				let db = panel.database;
				let name = panel.textBox.input.text;

				if (name.length == 0){
					panel.textBox.setMessage("Invalid Name!", "red");
					return;
				}


				let editorstate = game.getState(-2);
				let level = editorstate.createLevel();

				let isNew = db.indexOf(name) < 0;
				db.set(name, level);
				//recreate all the buttons in FileList
				if (isNew){
					let fileList = panel.fileList;
					fileList.createListButtons();
					fileList.scrollBar.resize();

					let index = db.indexOf(name);
					fileList.selectButton(index);
					fileList.seek(index);

					panel.selectIndex(index);
				}
				else{
					panel.preview.setLevel(name, level, true);
				}

				db.save("user_levels");

				//cannot call playSound() here because SoundWrappers are not being updated
				PIXI.sound._sounds["board_saved"].play();
				panel.textBox.setMessage("Level Saved!", "green");
			};
		}
	}

	//when a new state gets pushed over
	onExit(){
		for (let panel of this.panels)
			panel.hideTextInput();
	}

	//when this state becomes the top state again
	onEnter(){
		for (let panel of this.panels)
			panel.showTextInput();
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
		this.panel.update(delta);
	}
}

//LSS is short for LevelSelectState
class LSS_Panel extends PIXI.Container{
	constructor(base, isUser){
		super();
		this.base = base;
		this.isUser = isUser;
		//debug graphic
		// let gr = new PIXI.Graphics()
		// 	.beginFill(0xFF0000)
		// 	.drawRect(0, 0, base.width, base.height);
		// this.addChild(gr);

		this.selectedIndex = null;

		let database = isUser ? levels.user : levels.default;
		// this.file_list = data.list;
		// this.file_lookup = data.lookup;
		this.database = database;

		//left widget
		this.fileList = new LSS_FileList(this);
		this.addChild(this.fileList);
		//right widget
		this.preview = new LSS_LevelPreview(this);
		this.addChild(this.preview);
		//bottom left textbox
		this.textBox = new LSS_TextBox(this);
		this.addChild(this.textBox);
	}

	destructor(){
		this.textBox.destructor();
	}

	selectIndex(index){
		this.selectedIndex = index;
		if (index === null)
			this.preview.clear();
		else{
			let [name, level] = this.database.at(index);
			this.preview.setLevel(name, level);
		}
	}

	hideTextInput(){
		let input = this.textBox.input;
		input.blur();
		input.substituteText = true;
	}

	showTextInput(){
		let input = this.textBox.input;
		input.substituteText = false;
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

		let fr = fillRect;
		let text_w = 300;
		let text_h = 400;
		let box_w = text_w + 4;
		let box_h = text_h + 4;
		let whiteBox = new PIXI.Graphics(); //300 400
		// fr(whiteBox, 0xF0, 0, 0, box_w, box_h); //bottom right
		fr(whiteBox, 0x64, 0, 0, box_w-0, box_h-0); //top left
		fr(whiteBox, 0xC0, 2, 2, box_w-2, box_h-2); //inner bottom right
		fr(whiteBox, 0xFF, 2, 2, box_w-4, box_h-4); //middle white box
		this.addChild(whiteBox);
		this.whiteBox = whiteBox;

		let textdim = {
			x: 4, y: 2, w: text_w, h: text_h
		};
		this.textdim = textdim;

		//how many pixels high each button is
		let lh = 16;
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
		this.index = index;
		this.fileList = fileList;

		let highlight = new PIXI.Graphics()
			.beginFill(0xFFFF00)
			.drawRect(x, y, w, h);
		//setting highlight.visible = false
		//will make the button unselectable
		highlight.alpha = 0;
		this.addChild(highlight);
		this.highlight = highlight;

		let text = new PIXI.Text(str, {
			fontSize: 18,
			fill: 0x000000
		});
		text.position.set(x, y);
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
		let base = new PIXI.Graphics()
			.beginFill(0xC0C0C0)
			.drawRect(0, 0, w, h);
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
		let fr = fillRect;
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
	constructor(panel){
		super();
		this.position.set(400, 16);
		this.addChild(makeSprite("border"));
		let levelSprite = new PIXI.Sprite().setTransform(8, 8);
		this.addChild(levelSprite);
		this.levelSprite = levelSprite;

		this.initEnemyDisplay(260, 0);

		this.cache = new Map();

		this.preview = null;
	}

	initEnemyDisplay(x, y){
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
				let seconds = arr[1].map(x => x/1000);
				this.timerText.text = seconds.join("\n");
			}
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
		this.enemyDisplay.reset();
	}

	setLevel(name, level, replace=false){
		if (replace || !this.cache.has(name)){
			this.cache.set(name, LSS_LevelPreview.generate(level));
		}
		let preview = this.cache.get(name);
		this.enemyDisplay.setLevel(level);
		this.levelSprite.texture = preview;
	}

}

class LSS_PlaylistPreview{

}

class LSS_TextBox extends PIXI.Container{
	//keeps track of filename textbox and status message
	constructor(panel){
		super();
		this.panel = panel;
		this.position.set(16, 460);

		let input = new PIXI.TextInput({
			input: {
				fontSize: "18px",
				width: "322px",
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
		input.substituteText = false;
		input.position.set(0, 0);
		this.addChild(input);
		this.input = input;

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

		//message
		let message = printText("Test message please ignore", "arcade", 0x000000, 1, 0, 30);
		// let message = new PIXI.Text("test message", {
		// 	fontFamily: "Verdanda",
		// 	fontSize: 22,
		// 	fill: 0xFFFFFF
		// });
		// message.position.set(0, 30);
		message.visible = false;
		this.addChild(message);
		this.message = message;
		this.messageTimer = null;
	}

	destructor(){
		this.input.destroy();
	}

	static colors = {
		red: "0xFF0000",
		green: "0x33CC33"
	};

	setMessage(text, color, time=3000){
		if (typeof(color) == "string")
			color = LSS_TextBox.colors[color];
		let message = this.message;
		message.visible = true;
		message.text = text;
		message.tint = color;
		this.messageTimer = time;
	}

	update(delta){
		if (this.message.visible){
			this.messageTimer -= delta;
			if (this.messageTimer <= 0)
				this.message.visible = false;
		}
	}
}

//keeps track of stuff
class FileDatabase{
	constructor(list){
		this.list = list;
		this.map = new Map();
		for (let arr of list)
			this.map.set(arr[0], arr);
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
	
	set(name, object){
		let list = this.list;
		let map = this.map;
		let newArr = [name, object];
		if (map.has(name)){
			list[this.indexOf(name)] = newArr;
		}
		else{
			list.push(newArr);
			this.sort();
		}
		map.set(name, newArr);
	}

	at(index){
		return this.list[index];
	}

	get(name){
		return this.map.get(name);
	}

	save(key){
		let string = JSON.stringify(this.list);
		localStorage.setItem(key, string);
	}
}

/*
class LevelSelectState2{
	//modes: ["play", "save", "load"]
	constructor(isPlaylist, mode){
		this.isPlaylist = isPlaylist;
		this.mode = mode;
		this.windowTitle = isPlaylist ? "Playlist Select" : "Level Select";

		//do we need multiple layers?
		let stage = new PIXI.Container();
		this.stage = stage;

		let bg = new PIXI.Graphics();
		bg.beginFill(0xAAAAAA)
			.drawRect(0, 0, DIM.w, DIM.h);
		stage.addChild(bg);

		this.selectedIndex = null;

		let butt;
		//back button is universal
		butt = new Button(DIM.w - 100, DIM.h - 50, 80, 35);
		butt.addCentered(printText("Back", "arcade", 0x000000, 1));
		butt.onClick = () => {
			game.pop();
		};
		this.add(butt);

		this.initLeftWidget();

		if (isPlaylist){
			this.createPlaylistSelectButtons();
			this.initPlaylistPreview();
		}
		else{
			this.createLevelSelectButtons();
			this.initLevelPreview();
		}
	}

	createPlaylistSelectButtons(){
		let butt = new Button(DIM.w - 200, DIM.h - 50, 80, 35);
		butt.addCentered(printText("Play", "arcade", 0x000000, 1));
		butt.onClick = () => {
			let index = this.selectedIndex;
			if (index === null)
				return;
			let playlist = this.default_list[index][1];
			playlist = PlayState.convertPlaylist(false, playlist);
			game.push(new PlayState("playlist", playlist, 0));
		};
		this.add(butt);
	}

	createLevelSelectButtons(){
		if (this.mode == "load"){
			//load button
			let butt = new Button(DIM.w - 200, DIM.h - 50, 80, 35);
			butt.addCentered(printText("Load", "arcade", 0x000000, 1));
			butt.onClick = () => {
				let index = this.selectedIndex;
				if (index === null)
					return;
				let level = this.default_list[index][1];
				let editorstate = game.getState(-2);
				editorstate.loadLevel(level);
				game.pop();
			};
			this.add(butt);
		}
		else if (this.mode == "play"){
			//play button
			let butt = new Button(DIM.w - 200, DIM.h - 50, 80, 35);
			butt.addCentered(printText("Play", "arcade", 0x000000, 1));
			butt.onClick = () => {
				let index = this.selectedIndex;
				if (index === null)
					return;
				let level = this.default_list[index][1];
				game.push(new PlayState("play", level));
			};
			this.add(butt);
		}
	}

	add(obj){
		this.stage.addChild(obj);
	}

	//text area causes a bunch of problems
	initPlaylistPreviewOld(){
		let textArea = new PIXI.TextInput({
			input: {
				fontSize: "16px",
				width: "250px",
				height: "400px",
				color: 0x000000,
				multiline: true,
			},
			box: {
				fill: 0xFFFFFF,
				stroke: {
					color: 0x000000,
					width: 2,
				}
			}
		});
		textArea.x = DIM.w/2 + 50;
		textArea.y = 100;
		textArea.substituteText = false;
		textArea.text = "hello world";
		textArea.htmlInput.readOnly = true;
		//Note: ENABLE_RIGHT_CLICK is false in this state
		this.playlistPreview = textArea;
		this.add(textArea);
	}

	initPlaylistPreview(){
		let cont = new PIXI.Container();
		cont.position.set(DIM.w/2 + 50, 100);
		cont.addChild(new PIXI.Graphics()
			.beginFill(0xFFFFFF)
			.drawRect(0, 0, 250, 400)
		);
		let text = new PIXI.Text("Select a Playlist", {
			fontFamily: "Courier New",
			fontSize: 16,
			fontWeight: "bold",
		});
		text.position.set(5, 5);
		cont.addChild(text);
		this.playlistPreview = text;
		this.add(cont);
	}

	setPlaylistPreview(index){
		let preview = this.playlistPreview;
		let playlist = this.default_list[index][1];
		let str = playlist.join("\n");
		preview.text = str;
	}

	initLevelPreview(){
		this.preview = new PIXI.Container();
		this.preview.position.set(500, 150);
		this.preview.addChild(makeSprite("border"));
		this.preview.addChild(new PIXI.Sprite()
			.setTransform(8, 8));
		this.add(this.preview);

		this.previewCache = {};
	}

	generatePreview(level){
		//board width and height
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

	//cache generated previews
	setPreview(index){
		let preview = this.previewCache[index];
		if (!preview){
			let level = this.default_list[index][1];
			preview = this.generatePreview(level);
			this.previewCache[index] = preview;
		}
		this.preview.children[1].texture = preview;
	}

	selectIndex(index){
		this.selectedIndex = index;
		if (this.isPlaylist){
			this.setPlaylistPreview(index);
		}
		else{
			this.setPreview(index);
		}
	}

	initLeftWidget(){
		let widget = new PIXI.Container();
		widget.position.set(100, 100);

		let whiteBox = new PIXI.Graphics()
			.beginFill(0xFFFFFF)
			.drawRect(0, 0, 300, 400);
		widget.addChild(whiteBox);

		let leftList = new PIXI.Container();
		widget.addChild(leftList);
		let p = whiteBox.getGlobalPosition();
		leftList.mask = new Mask(p.x, p.y, 300, 400);
		this.leftList = leftList;

		let default_list = this.isPlaylist ? playlists.default.list : levels.default.list;
		this.default_list = default_list;
		
		this.allListButtons = [];
		for (let [i, [name, level]] of default_list.entries()){
			let y = i * 16;
			let butt = new LevelButton(this, name, 0, y, 300, 16, i);
			leftList.addChild(butt);
			this.allListButtons.push(butt);
		}

		let listHeight = this.allListButtons.length * 16;
		this.scrollHeight = Math.max(0, listHeight - 400);

		let {x, y, width:w, height:h} = whiteBox.getLocalBounds();
		let scrollBar = new ScrollBar(this, x+w+4, y, 18, h, h/4);
		this.scrollBar = scrollBar;
		widget.addChild(scrollBar);

		this.add(widget);
	}

	//ratio is a value between [0, 1]
	onScroll(ratio){
		this.leftList.y = -this.scrollHeight * ratio;
	}

	//update scrollbar if leftList moved without touching the scrollbar
	updateScrollBar(){
		const y = this.leftList.y;
		const ratio = -y / this.scrollHeight;
		let bar = this.scrollBar;
		bar.bar.y = ratio * bar.barMaxY;
	}

	//scrolling with keyboard buttons
	keyboardScroll(delta){
		function isPressed(str){
			return keyboard.isPressed(keycode[str]);
		}
		let up = isPressed("UP") || isPressed("W");
		let down = isPressed("DOWN") || isPressed("S");
		if (!(up || down))
			return;
		//select next level that's below or up
		let buttons = this.allListButtons;
		let index = 0;
		if (this.selectedIndex !== null)
			index = this.selectedIndex + (down ? 1 : -1);
		if (index < 0 || index >= buttons.length)
			return;
		buttons[index].pointerDown();
		let leftList = this.leftList;
		//make sure selected level is in view
		let levelIndex = clamp(-leftList.y / 16, index - 25 + 1, index);
		leftList.y = -levelIndex * 16;
		this.updateScrollBar();
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
		//scrolling with keyboard
		this.keyboardScroll(delta);
		
		//scrolling with mouse wheel
		if (mouse.scroll != 0){
			let sign = mouse.scroll > 0 ? -1 : 1;
			let y = this.leftList.y;
			y = clamp(y + 4 * sign * 16, -this.scrollHeight, 0);
			this.leftList.y = y;
			this.updateScrollBar();
		}
	}
}
*/