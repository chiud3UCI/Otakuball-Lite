class LevelSelectState{
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
			this.initPreview();
		}
	}

	// destructor(){
	// 	if (this.isPlaylist)
	// 		this.playlistPreview.destroy();
	// }

	createPlaylistSelectButtons(){
		let butt = new Button(DIM.w - 200, DIM.h - 50, 80, 35);
		butt.addCentered(printText("Play", "arcade", 0x000000, 1));
		butt.onClick = () => {
			let index = this.selectedIndex;
			if (index === null)
				return;
			let playlist = this.default_list[index][1];
			playlist = PlayState.convertPlaylist(false, playlist);
			game.push(new PlayState("playlist", playlist));
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

	initPreview(){
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

//consists of the level name and the yellow highlight box
//the highlight box can be set visible or invisible
class LevelButton extends PIXI.Container{
	constructor(parentState, str, x, y, w, h, index){
		super();
		this.index = index;
		this.parentState = parentState;

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
		let state = this.parentState;
		for (let butt of state.allListButtons)
			butt.setHighlight(false);
		this.setHighlight(true);
		this.parentState.selectIndex(this.index);
	}
}

//consists of both long base and the smaller moving bar
class ScrollBar extends PIXI.Container{
	constructor(parentState, x, y, w, h, barHeight){
		super();
		this.parentState = parentState;
		this.position.set(x, y);

		let base = new PIXI.Graphics()
			.beginFill(0xDDDDDD)
			.drawRect(0, 0, w, h);
		this.addChild(base);

		// let bar = new PIXI.Graphics()
		// 	.beginFill(0x000000)
		// 	.drawRect(0, 0, w, barHeight);

		//fill rect shortcut
		let fr = function(graphics, grey, x, y, w, h){
			let color = grey * 0x010101;
			graphics.beginFill(color);
			graphics.drawRect(x, y, w, h);
		}
		let bar = new PIXI.Graphics();
		let bh = barHeight;
		fr(bar, 0x00, 0, 0, w,   bh);
		fr(bar, 0xFF, 0, 0, w-2, bh-2);
		fr(bar, 0x50, 2, 2, w-4, bh-4);
		fr(bar, 0x90, 2, 2, w-6, bh-6);
		this.addChild(bar);
		this.bar = bar;

		this.barMaxY = h - barHeight;

		this.down = null;

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
		this.on("pointerup", (e) => {this.pointerUp(e);});
		this.on("pointermove", (e) => {this.pointerMove(e);});
	}

	pointerDown(e){
		let by = this.bar.y
		let my = e.data.global.y;
		this.down = [by, my];
	}

	pointerUp(e){
		this.down = null;
	}

	pointerMove(e){
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
		this.parentState.onScroll(new_y / y_max);
	}
}