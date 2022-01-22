var BG_COLOR_PRESETS = [
	0x000080, 0x800000, 0x008000, 0x808000, 0x008080, 0x800080,
	0x808080, 0x404040, 0x804000, 0x400080, 0x800040, 0x008040,
	0x0000FF, 0xFF0000, 0x00FF00, 0xFFFF00, 0x00FFFF, 0xFF00FF,
	0xC8C8C8, 0xFFFFFF, 0xFF8000, 0x8000FF, 0xFF0080, 0x00FF80,
	0xFF3F00, 0xFFC100, 0x87FF00, 0x00A99C, 0x0080FF, 0xC100FF,
	0xBAAF71, 0xFCC58E, 0x744C28, 0xA57C55, 0x726258, 0xC7B29B
];

class BackgroundSelectState extends State{
	constructor(editorstate){
		super();
		this.editorstate = editorstate;
		this.windowTitle = "Background Select";
		//import bg from editorstate
		let editbg = editorstate.bg;
		this.bg = {
			color: editbg.color,
			tile: editbg.tile
		};

		let stage = new PIXI.Container();
		this.stage = stage;

		stage.addChild(new PIXI.Graphics()
			.beginFill(PALETTE["main0"])
			.drawRect(0, 0, DIM.w, DIM.h)
		);

		//Back Button
		let bw = 100;
		let bh = 40;
		let bgap = 10;
		let backButton = new Button(DIM.w - bw - bgap, DIM.h - bh - bgap, bw, bh);
		backButton.addCentered(printText("Back", "arcade", 0x000000, 1));
		backButton.onClick = () => {
			game.pop();
		}
		stage.addChild(backButton);

		//Apply Button
		let applyButton = new Button(backButton.x - bw - bgap, backButton.y, bw, bh);
		applyButton.addCentered(printText("Apply", "arcade", 0x000000, 1));
		applyButton.onClick = () => {
			editorstate.setBackground(this.bg.color, this.bg.tile);
			game.pop();
		}
		stage.addChild(applyButton);

		//Preview
		this.preview = new PIXI.Graphics();
		this.preview.position.set(50, 50);
		stage.addChild(this.preview);
		this.updatePreview();
		stage.addChild(printText("Preview", "arcade", 0x000000, 1, this.preview.x, this.preview.y - 22));

		//Sliders
		let [r, g, b] = splitColor(this.bg.color);
		this.sliders = [
			new ColorSlider(this, "r", r),
			new ColorSlider(this, "g", g),
			new ColorSlider(this, "b", b)
		];
		for (let [i, slider] of this.sliders.entries()){
			slider.position.set(300, 50 + i*25);
			stage.addChild(slider);
		}
		stage.addChild(printText("RGB Sliders", "arcade", 0x000000, 1, this.sliders[0].x, this.sliders[0].y - 22));

		//Color Presets
		let presets = new PIXI.Container();
		presets.position.set(300, 160);
		for (let [n, color] of BG_COLOR_PRESETS.entries()){
			let i = Math.floor(n/12);
			let j = n % 12;
			presets.addChild(new ColorPresetButton(
				this, i, j, color));
		}
		presets.addChild(printText("Color Presets", "arcade", 0x000000, 1, 0, -22));
		stage.addChild(presets);

		//Patterns
		let patterns = new PIXI.Container();
		let n = 5 * 13 - 0; //columns * rows - missing
		let wrap = 22;
		let gap = 32*4.5; //offset between opaque and transparent
		for (let type of ["opaque", "transparent"]){
			for (let index = 0; index < n; index++){
				let i = Math.floor(index/5);
				let j = index % 5;
				let base = (type == "opaque") ? "bg" : "bg2";
				let tile = `${base}_${i}_${j}`;
				let x = ((index + 1) % wrap) * 32;
				let y = Math.floor((index + 1) / wrap) * 32;
				if (type == "transparent"){
					y += gap;
					let rect = new PIXI.Graphics()
						.beginFill(0xFFFFFF)
						.drawRect(x, y, 32, 32);
					patterns.addChild(rect);
				}
				let pattern = makeSprite(tile, 1, x, y);
				pattern.interactive = true;
				pattern.on("pointerdown", (e) => {
					this.bg.tile = tile;
					this.updatePreview();
				});
				patterns.addChild(pattern);
			}
		}
		for (let i = 0; i < 2; i++){
			let nullPattern = makeSprite("no_bg", 1, 0, i*gap);
			//add transparent hitbox
			nullPattern.addChild(new PIXI.Graphics()
				.beginFill(0xFFFFFF)
				.drawRect(0, 0, 32, 32)
			);
			nullPattern.children[0].alpha = 0;
			nullPattern.interactive = true;
			nullPattern.on("pointerdown", (e) => {
				this.bg.tile = null;
				this.updatePreview();
			});
			patterns.addChild(nullPattern);
		}
		patterns.position.set((DIM.w - patterns.width)/2, 290);
		stage.addChild(patterns);
		stage.addChild(printText(
			"Opaque Color Patterns", "arcade", 0x000000, 1, patterns.x, patterns.y - 22));
		stage.addChild(printText(
			"Transparent Black Patterns", "arcade", 0x000000, 1, patterns.x, patterns.y + gap - 22));
	}

	setColor(color){
		this.bg.color = color;
		let arr = splitColor(color);
		for (let [i, slider] of this.sliders.entries())
			slider.setValue(arr[i]);
		this.updatePreview();
	}

	onSliderChange(){
		let arr = [];
		for (let slider of this.sliders)
			arr.push(slider.value);
		this.bg.color = combineColor(...arr);
		this.updatePreview();
	}

	updatePreview(){
		let bg = this.bg;
		let pr = this.preview;
		pr.clear()
			.beginFill(bg.color)
			.drawRect(0, 0,  64*3, 64*3);
		pr.removeChildren();
		if (bg.tile){
			let tex = media.textures[bg.tile];
			let sprite = new PIXI.TilingSprite(tex, 32*3, 32*3);
			sprite.scale.set(2);;
			pr.addChild(sprite);
		}
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
		for (let slider of this.sliders)
			slider.update(delta);
	}
}

//TODO: make this class extend from the new Slider class in gui.js
class ColorSlider extends PIXI.Container{
	//"r", "g", "b"
	constructor(parentState, colorStr, initialVal){
		super();
		this.parentState = parentState;
		this.colorStr = colorStr;

		//slider width and height
		const sw = 256;
		const sh = 16;
		let markings = new PIXI.Graphics()
			.lineStyle(2, 0)
			.lineTo(0, sh)
			.moveTo(0, sh/2)
			.lineTo(sw, sh/2)
			.moveTo(sw, 0)
			.lineTo(sw, sh);
		this.addChild(markings);
		this.sw = sw;

		//"draggable" bar
		let lookup = {r: 0xFF0000, g: 0x00FF00, b: 0x0000FF};
		let color = lookup[colorStr];
		const bw = 10;
		const bh = sh;
		this.bar = new PIXI.Graphics()
			.beginFill(color)
			.drawRect(-bw/2, 0, bw, bh);
		this.bw = bw;
		this.addChild(this.bar);

		//invisible slider hitbox
		//the color value can be set by clicking
		//anyhwhere in the hitbox
		//Make the hitbox slightly wider than the slider
		//to make setting 0 and 255 easier
		let hitbox = new PIXI.Graphics()
			.beginFill(0xFFFFFF)
			.drawRect(-bw/2, 0, sw+bw, sh)
		hitbox.alpha = 0;
		hitbox.interactive = true;
		hitbox.on("pointerdown", (e) => {
			hitbox.down = true;
			hitbox.updateBar();
		});
		hitbox.on("pointerup", (e) => {hitbox.down = false;});
		hitbox.on("pointerupoutside", (e) => {hitbox.down = false;});
		hitbox.on("pointermove", (e) => {
			if (hitbox.down)
				hitbox.updateBar();
		});
		hitbox.updateBar = () => {
			let mx = mouse.x;
			let x = getTrueGlobalPosition(hitbox).x;
			let dx = mx - x;
			let ratio = dx / sw;
			ratio = Math.max(0, Math.min(1, ratio));
			let val = Math.floor(ratio * 255);
			this.setValue(val);
			parentState.onSliderChange();
		}
		this.addChild(hitbox);

		//text input
		let input = parentState.createTextInput(40, 14, 2);
		input.position.set(sw + 20, 0);
		input.restrict = "0123456789";
		input.text = 0;
		input.on("input", (text) => {
			this.setValue(Number(text));
			parentState.onSliderChange();
		})
		this.addChild(input);
		this.input = input;

		//set both slider and input at the same time
		this.setValue(initialVal);
	}

	destructor(){
		this.input.destroy();
	}

	//set color value from 0 to 255
	//and adjusts both the slider and textinput
	setValue(val){
		val = Math.max(0, Math.min(255, val));
		this.value = val;
		let ratio = val/255;
		let dx = ratio * this.sw;
		this.bar.x = dx;

		this.input.text = val;
	}

	update(delta){

	}
}

class ColorPresetButton extends PIXI.Graphics{
	constructor(parentState, i, j, color){
		super();

		const w = 16;
		let x = j * w;
		let y = i * w;
		this.beginFill(color);
		this.drawRect(x, y, w, w);

		this.interactive = true;
		this.on("pointerdown", (e) => {
			parentState.setColor(color);
		});
	}
}

function splitColor(color){
	let arr = [0, 0, 0];
	for (let i = 0; i < 3; i++){
		arr[2-i] = color % 256;
		color = Math.floor(color/256);
	}
	return arr;
}

function combineColor(r, g, b){
	return r*0x010000 + g*0x000100 + b*0x000001;
}
