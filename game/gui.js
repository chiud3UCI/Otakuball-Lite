function fillRect(graphics, grey, x, y, w, h){
	let color = grey * 0x010101;
	graphics.beginFill(color)
		.drawRect(x, y, w, h);
}

function fillRect2(graphics, color, x, y, w, h){
	graphics.beginFill(color)
		.drawRect(x, y, w, h);
}

//Base is just a regular windows98 box (without title bar);
class Base extends PIXI.Container{
	//if title is a string, then a blue title bar will be created
	constructor(x, y, w, h, title=null){
		super();
		this.position.set(x, y);
		let gr = new PIXI.Graphics();
		let fr = fillRect;
		fr(gr, 0x00, 0, 0, w,   h);
		fr(gr, 0xFF, 0, 0, w-2, h-2);
		fr(gr, 0x64, 2, 2, w-4, h-4);
		fr(gr, 0xDC, 2, 2, w-6, h-6);
		this.addChild(gr);

		if (title === null){
			this.title = null;
			this.titleBar = null;
		}
		else{
			this.titleBar = new PIXI.Graphics();
			fillRect2(this.titleBar, 0x000080, 4, 4, w-10, 22);
			this.title = printText(title, "arcade", 0xFFFFFF, 1, 8, 6);
			this.titleBar.addChild(this.title);
			this.addChild(this.titleBar);
		}
	}
}

class Button extends PIXI.Container{
	//TODO: create a global ui palette object to keep ui colors consistent
	static colors = {
		dark: [0x90, 0xA0, 0xDC],
		light: [0xDC, 0xDC, 0xDC],
		disabled: 0x80,
	}

	constructor(x, y, w, h, color="dark"){
		super();
		this.position.set(x, y);

		let arr = Button.colors[color];

		let fr = fillRect;
		//give it a Windows 95 feel
		let up = new PIXI.Graphics();
		fr(up, 0x00, 0, 0, w,   h);
		fr(up, 0xFF, 0, 0, w-2, h-2);
		fr(up, 0x64, 2, 2, w-4, h-4);
		fr(up, arr[0], 2, 2, w-6, h-6);

		let over = new PIXI.Graphics();
		fr(over, 0x20, 0, 0, w,    h);
		fr(over, 0xFF, 2, 2, w-6,  h-6);
		fr(over, 0x40, 4, 4, w-8,  h-8);
		fr(over, arr[1], 4, 4, w-10, h-10);

		let down = new PIXI.Graphics();
		fr(down, 0xFF, 0, 0, w,   h);
		fr(down, 0x20, 0, 0, w-2, h-2);
		fr(down, 0x64, 2, 2, w-4, h-4);
		fr(down, arr[2], 4, 4, w-6, h-6);

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
					obj.tint = Button.colors["disabled"] * 0x010101;
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

		let fr = fillRect;

		let on = new PIXI.Graphics();
		fr(on, 0x00, 0, 0, w  , h-6);
		fr(on, 0xFF, 0, 0, w-2, h-4);
		fr(on, 0x64, 2, 2, w-4, h-6);
		fr(on, 0xDC, 2, 2, w-6, h-6);

		let off = new PIXI.Graphics();
		fr(off, 0x00, 2, 2, w-4, h-4);
		fr(off, 0xFF, 2, 2, w-6, h-6);
		fr(off, 0x64, 4, 4, w-8, h-8);
		fr(off, 0xBB, 4, 4, w-10, h-10);

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

// class DialogueBox{
// 	constructor(w, h, title=null, message=null){
// 		this.showUnderlay = true;

// 		this.boxWidth = w;
// 		this.boxHeight = h;

// 		let stage = new PIXI.Container();
// 		this.stage = stage;
// 		stage.addChild(underlayState.stage);

// 		let box = new PIXI.Graphics();
// 		this.box = box;
// 		box.position.set(DIM.w/2 - w/2, DIM.h/2 - h/2);
// 		let fr = fillRect;
// 		fr(box, 0x00, 0, 0, w  , h  );
// 		fr(box, 0xC0, 0, 0, w-2, h-2);
// 		fr(box, 0x64, 2, 2, w-4, h-4);
// 		fr(box, 0xFF, 2, 2, w-6, h-6);
// 		fr(box, 0xAA, 4, 4, w-8, h-8);
// 		//blue title bar
// 		fillRect2(box, 0x000080, 6, 6, w-12, 22);
// 		stage.addChild(box);

// 		this.title = printText(title ?? "Title", "arcade", 0xFFFFFF, 1, 8, 8);
// 		this.message = printText(message ?? "Message", "arcade", 0x000000, 1, 8, 32);
// 		this.message.maxWidth = w;

// 	}

// 	setTitle(title="Title"){
// 		this.title.text = title;
// 	}

// 	setMessage(message="Message"){
// 		this.message.text = message;
// 	}

// 	//places buttons starting from bottom right to left
// 	addButton(name, callback){

// 	}
// }