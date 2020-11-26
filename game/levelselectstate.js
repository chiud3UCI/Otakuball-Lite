class LevelSelectState{
	constructor(){
		//do we need multiple layers?
		let stage = new PIXI.Container();
		this.stage = stage;

		let bg = new PIXI.Graphics();
		bg.beginFill(0x888888)
			.drawRect(0, 0, DIM.w, DIM.h);
		stage.addChild(bg);

		this.selectedIndex = null;

		//back button
		let butt = new Button(DIM.w - 100, DIM.h - 50, 80, 35);
		butt.add(printText(
			"Back", "arcade", 0x000000, 1, 7, 8
		));
		butt.onClick = () => {
			game.pop();
		};
		this.add(butt);
		//load button
		butt = new Button(DIM.w - 200, DIM.h - 50, 80, 35);
		butt.add(printText(
			"Load", "arcade", 0x000000, 1, 7, 8
		));
		butt.onClick = () => {
			let index = this.selectedIndex;
			if (index === null)
				return;
			let level = default_levels[index][1];
			let editorstate = game.getState(-2);
			editorstate.loadLevel(level);
			game.pop();
		};
		this.add(butt);


		this.initLeftWidget();

		this.preview = new PIXI.Container();
		this.preview.position.set(500, 150);
		this.preview.addChild(makeSprite("border"));
		this.preview.addChild(new PIXI.Sprite()
			.setTransform(8, 8));
		this.add(this.preview);

		this.previewCache = {};
	}

	add(obj){
		this.stage.addChild(obj);
	}

	generatePreview(level){
		//board width and height
		let bw = 16*13;
		let bh = 8*32;
		let preview = PIXI.RenderTexture.create(
			{width: bw, height: bh});

		let cont = new PIXI.Container();

		let bg = new PIXI.Graphics()
			.beginFill(0x000088)
			.drawRect(0, 0, bw, bh);
		cont.addChild(bg);

		for (let [i, j, id, patch] of level.bricks){
			let x = j * 16;
			let y = i * 8;
			let tex = brickData.lookup[id].tex;
			let sprite = makeSprite(tex, 1, x, y);
			// renderer.render(sprite, preview);
			cont.addChild(sprite);
		}

		renderer.render(cont, preview);
		return preview;
	}

	//cache generated previews
	setPreview(index){
		let preview = this.previewCache[index];
		if (!preview){
			let level = default_levels[index][1];
			preview = this.generatePreview(level);
			this.previewCache[index] = preview;
		}
		this.preview.children[1].texture = preview;
	}

	selectLevel(index){
		this.selectedIndex = index;
		this.setPreview(index);
	}

	initLeftWidget(){
		let widget = new PIXI.Container();
		widget.position.set(100, 100);

		let whiteBox = new PIXI.Graphics()
			.beginFill(0xFFFFFF)
			.drawRect(0, 0, 300, 400);
		widget.addChild(whiteBox);

		let levelList = new PIXI.Container();
		widget.addChild(levelList);
		//mask coordinates are global
		let p = whiteBox.getGlobalPosition();
		let mask = new PIXI.Graphics()
			.beginFill(0x000000)
			.drawRect(p.x, p.y, 300, 400);
		levelList.mask = mask;
		this.levelList = levelList;
		
		this.allLevelButtons = [];
		for (let [i, [name, level]] of default_levels.entries()){
			let y = i * 16;
			let butt = new LevelButton(this, name, 0, y, 300, 16, i);
			levelList.addChild(butt);
			this.allLevelButtons.push(butt);
		}

		let listHeight = this.allLevelButtons.length * 16;
		this.scrollHeight = Math.max(0, listHeight - 400);

		let {x, y, width:w, height:h} = whiteBox.getLocalBounds();
		let scrollBar = new ScrollBar(this, x+w+4, y, 18, h, h/4);
		widget.addChild(scrollBar);

		this.add(widget);
	}

	//ratio is a value between [0, 1]
	onScroll(ratio){
		this.levelList.y = -this.scrollHeight * ratio;
	}

	update(delta){

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
		for (let butt of state.allLevelButtons)
			butt.setHighlight(false);
		this.setHighlight(true);
		this.parentState.selectLevel(this.index);
	}
}

//consists of both long base and the smaller moving bar
class ScrollBar extends PIXI.Container{
	constructor(parentState, x, y, w, h, barHeight){
		super();
		this.parentState = parentState;
		this.position.set(x, y);

		let base = new PIXI.Graphics()
			.beginFill(0xBBBBBB)
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