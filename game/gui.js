//TOOD: - normalize fillRect for the full color param
//      - if fillRect arg is type string, then retreive the hex from PALETTE


//these 2-digit hex digits will be repeated to get the full color value
var PALETTE_GREY = {
	main0: 0xA0,
	main1: 0xC8,
	main2: 0x90,
	border0: 0x00,
	border_special: 0xC0,
	border1: 0xFF,
	border2: 0x64,
	border3: 0x30, //for over + down
};

var PALETTE = {
	status_red: 0xFF0000,
	status_green: 0x00BB00,
};

for (let [key, value] of Object.entries(PALETTE_GREY))
	PALETTE[key] = value * 0x010101;

function fillRect(graphics, color, x, y, w, h){
	if (typeof(color) == "string")
		color = PALETTE[color];
	graphics.beginFill(color)
		.drawRect(x, y, w, h);
}

function fillRectGrey(graphics, grey, x, y, w, h){
	if (typeof(grey) == "string")
		grey = PALETTE_GREY[grey];
	let color = grey * 0x010101;
	graphics.beginFill(color)
		.drawRect(x, y, w, h);
}

//moves a PIXI.Container so that the center is at the target coordinates
function moveCenterTo(obj, x, y){
	let {width, height} = obj.getLocalBounds();
	obj.position.set(x - width/2, y - height/2);
}

//draw horizontal or veritical dividers
function drawDivider(graphics, mode, x, y, mag, mag2){
	if (mode == "vertical"){
		graphics.beginFill(0x909090)
			.drawRect(x, y, 2, mag)
			.beginFill(0xFFFFFF)
			.drawRect(x+2, y, 2, mag);
	}
	else if (mode == "horizontal"){
		graphics.beginFill(0x909090)
			.drawRect(x, y, mag, 2)
			.beginFill(0xFFFFFF)
			.drawRect(x, y+2, mag, 2);
	}
	else if (mode == "box"){
		// console.log(`box before: ${mag}, ${mag2}`);
		let w = mag - 4;
		let h = mag2 - 4;
		drawDivider(graphics, "vertical"  , x  , y  , h  );
		drawDivider(graphics, "horizontal", x+2  , y  , w-2  );
		drawDivider(graphics, "vertical"  , x+w, y  , h  );
		drawDivider(graphics, "horizontal", x  , y+h, w+4);
		//add a white pixel to the bottom right corner for the finishing touches
		graphics.beginFill(0xFFFFFF).drawRect(x+w+2, y+h, 2, 2);
		// let {width, height} = graphics.getBounds();
		// console.log(`box after: ${width}, ${height}`);
	}
}

//Base is just a regular windows98 box (without title bar);
class Base extends PIXI.Container{
	//if title is a string, then a blue title bar will be created
	constructor(x, y, w, h, title=null){
		super();
		this.position.set(x, y);
		let gr = new PIXI.Graphics();
		let fr = fillRect;
		fr(gr, "border0", 0, 0, w,   h);
		fr(gr, "border1", 0, 0, w-2, h-2);
		fr(gr, "border2", 2, 2, w-4, h-4);
		fr(gr, "main1", 2, 2, w-6, h-6);
		this.addChild(gr);

		if (title === null){
			this.title = null;
			this.titleBar = null;
		}
		else{
			this.titleBar = new PIXI.Graphics();
			fillRect(this.titleBar, 0x000080, 4, 4, w-10, 22);
			this.title = printText(title, "arcade", 0xFFFFFF, 1, 8, 6);
			this.titleBar.addChild(this.title);
			this.addChild(this.titleBar);
		}
	}
}

class Button extends PIXI.Container{
	//TODO: create a global ui palette object to keep ui colors consistent
	static disabledTint = 0x80 * 0x010101;

	constructor(x, y, w, h, color="light"){
		super();
		this.position.set(x, y);

		let face = (color == "dark") ? "main0" : "main1";

		let fr = fillRect;
		//give it a Windows 95 feel
		let up = new PIXI.Graphics();
		fr(up, "border0", 0, 0, w,   h);
		fr(up, "border1", 0, 0, w-2, h-2);
		fr(up, "border2", 2, 2, w-4, h-4);
		fr(up, face, 2, 2, w-6, h-6);

		let over = new PIXI.Graphics();
		fr(over, "border0", 0, 0, w,    h);
		fr(over, "border1", 2, 2, w-6,  h-6);
		fr(over, "border2", 4, 4, w-8,  h-8);
		fr(over, face, 4, 4, w-10, h-10);

		let down = new PIXI.Graphics();
		fr(down, "border1", 0, 0, w,   h);
		fr(down, "border0", 0, 0, w-2, h-2);
		fr(down, "border2", 2, 2, w-4, h-4);
		fr(down, face, 4, 4, w-6, h-6);

		this.addChild(up);
		this.addChild(over);
		this.addChild(down);
		up.visible = true;
		over.visible = false;
		down.visible = false;
		this.bases = [up, over, down];

		//add Sprites and Texts here
		this.stage = new PIXI.Container();
		this.addChild(this.stage);

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
		this.on("pointerup", (e) => {this.pointerUp(e);});
		this.on("pointerover", (e) => {this.pointerOver(e);});
		this.on("pointerout", (e) => {this.pointerOut(e);});

		this.down = false;
		this.over = false;

		this.disabled = false;

		//if true, the button will revert to un-hovered state
		//after being clicked to prevent it from appearing hovered
		//when a new state is pushed
		this.hoverGuard = true;
	}

	add(drawable, center=false){
		this.stage.addChild(drawable);
		if (center){
			let width = this.width;
			let height = this.height;
			drawable.anchor.set(0.5);
			drawable.position.set(width/2, height/2);
		}
	}
	addCentered(drawable){
		this.add(drawable, true);
	}

	setDisabled(value=true){
		this.disabled = value;
		this.interactive = !value;
		if (value){
			this.setState(0);
			this.down = false;
			this.over = false;
			for (let obj of this.stage.children){
				if (obj instanceof PIXI.BitmapText)
					obj.tint = Button.disabledTint;
			}
		}
		else{
			for (let obj of this.stage.children){
				if (obj instanceof PIXI.BitmapText)
					obj.tint = 0x000000;
			}
		}
	}

	//0: up, 1: over, 2: down
	setState(value){
		for (let base of this.bases)
			base.visible = false;
		this.bases[value].visible = true;

		if (value == 2)
			this.stage.position.set(2, 2);
		else
			this.stage.position.set(0, 0);
	}

	updateState(){
		let value = 0;
		if (this.over)
			value = (this.down) ? 2 : 1;
		this.setState(value);
	}

	onClick(){
		console.log("Button Clicked! (Override this method)");
	}

	pointerDown(e){
		this.down = true;
		this.updateState(); 
	}

	pointerUp(e){
		if (this.down){
			if (this.hoverGuard)
				this.over = false;
			this.onClick();
		}
		this.down = false;
		this.updateState();
	}

	pointerOver(e){
		this.over = true;
		this.updateState(); 
	}

	pointerOut(e){
		this.over = false;
		this.down = false;
		this.updateState(); 
	}
}

class TabButton extends PIXI.Container{
	constructor(x, y, w, h, tabList, tabIndex){
		super();
		this.position.set(x, y);

		let fr = fillRectGrey;

		let on = new PIXI.Graphics();
		fr(on, "border0", 0, 0, w  , h-6);
		fr(on, "border1", 0, 0, w-2, h-4);
		fr(on, "border2", 2, 2, w-4, h-6);
		fr(on, "main1", 2, 2, w-6, h-6);

		let off = new PIXI.Graphics();
		fr(off, "border0", 2, 2, w-4, h-4);
		fr(off, "border1", 2, 2, w-6, h-6);
		fr(off, "border2", 4, 4, w-8, h-8);
		fr(off, "main0", 4, 4, w-10, h-10);

		this.addChild(on);
		this.addChild(off);
		this.onGraphic = on;
		this.offGraphic = off;
		this.buttonBounds = this.getBounds();

		let stage = new PIXI.Container();
		this.addChild(stage);
		this.stage = stage;

		this.state = false;
		on.visible = false;

		this.tabList = tabList;
		this.tabIndex = tabIndex;

		this.interactive = true;
		this.on("pointerdown", (e) => {this.pointerDown(e);});
	}

	addCentered(drawable){
		let bounds = this.buttonBounds;
		this.stage.addChild(drawable);
		drawable.anchor.set(0.5);
		drawable.position.set(bounds.width/2, bounds.height/2);
	}

	//this method should not change the state of other tabs
	setState(value){
		//update appearance
		//unselected tabs should be drawn behind the base widget
		//selected tabs should be drawn over the base widget
		let on = this.onGraphic;
		let off = this.offGraphic;
		let stage = this.stage;
		if (value){
			on.visible = true;
			off.visible = false;
			stage.y = -2;
			this.zIndex = 1;
		}
		else{
			on.visible = false;
			off.visible = true;
			stage.y = 0;
			this.zIndex = this.tabIndex - this.tabList.length;
		}

		let oldState = this.state;
		this.state = value;

		//call external function upon state trigger
		if (oldState != value)
			this.onStateChange?.(value);
	}

	pointerDown(e){
		//set all other tab's state to off
		for (let [i, tab] of this.tabList.entries()){
			if (i != this.tabIndex)
				tab.setState(false);
		}
		this.setState(true);
	}
}

class Checkbox extends PIXI.Container{
	constructor(x, y, initialValue, func=null){
		super();
		this.x = x;
		this.y = y;
		this.checkState = initialValue;

		//create checkbox graphic
		let side = 16;
		this.sideLength = 16;
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
		this.activateFunc?.(this.checkState);
	}

	//textObject should be a PIXI.Text or PIXI.BitmapText
	addLabel(textObject, xoff=4, yoff=0){
		textObject.x = this.sideLength + xoff;
		textObject.y = yoff;
		this.addChild(textObject);
		this.label = textObject;
	}
}

class Slider extends PIXI.Container{
	//"r", "g", "b"
	constructor(parentState, x, y, sw, sh, maxVal, initialVal=0){
		super();
		this.position.set(x, y);
		this.parentState = parentState;
		this.maxVal = maxVal; //minVal will always be 0 (for now)

		this.onSliderChange = null; //put a custom function here

		//slider width and height
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
		const bw = 16;
		const bh = sh;
		let fr = fillRect;
		let bar = new PIXI.Graphics();
		fr(bar, "border0", 0-bw/2, 0, bw,   bh);
		fr(bar, "border1", 0-bw/2, 0, bw-2, bh-2);
		fr(bar, "border2", 2-bw/2, 2, bw-4, bh-4);
		fr(bar, "main1"  , 2-bw/2, 2, bw-6, bh-6);
		this.bar = bar;
		this.bw = bw;
		this.addChild(bar);

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
			let val = Math.floor(ratio * this.maxVal);
			this.setValue(val);

			this.onSliderChange?.();
		};
		this.addChild(hitbox);

		//text input
		let input = parentState.createTextInput(40, 14, 2);
		input.position.set(sw + 20, 0);
		input.restrict = "0123456789";
		input.text = 0;
		input.on("input", (text) => {
			this.setValue(Number(text));
			this.onSliderChange?.();
		});
		this.addChild(input);
		this.input = input;

		//set both slider and input at the same time
		this.setValue(initialVal);
	}

	destructor(){
		this.input.destroy();
	}

	//set color value from 0 to maxVal
	//and adjusts both the slider and textinput
	setValue(val){
		let maxVal = this.maxVal;
		val = Math.max(0, Math.min(maxVal, val));
		this.value = val;
		let ratio = val/maxVal;
		let dx = ratio * this.sw;
		this.bar.x = dx;

		this.input.text = val;
	}

	update(delta){

	}
}