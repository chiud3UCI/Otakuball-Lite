function fillRect(graphics, grey, x, y, w, h){
	let color = grey * 0x010101;
	graphics.beginFill(color)
		.drawRect(x, y, w, h);
}

//Base is just a regular windows98 box (without title bar);
class Base extends PIXI.Container{
	constructor(x, y, w, h){
		super();
		this.position.set(x, y);
		let gr = new PIXI.Graphics();
		let fr = fillRect;
		fr(gr, 0x00, 0, 0, w,   h);
		fr(gr, 0xFF, 0, 0, w-2, h-2);
		fr(gr, 0x64, 2, 2, w-4, h-4);
		fr(gr, 0xDC, 2, 2, w-6, h-6);
		this.addChild(gr); 
	}
}

class Button extends PIXI.Container{
	constructor(x, y, w, h, color=null){
		super();
		this.position.set(x, y);

		let topColor = color ?? 0x90;

		let fr = fillRect;
		//give it a Windows 95 feel
		let up = new PIXI.Graphics();
		fr(up, 0x00, 0, 0, w,   h);
		fr(up, 0xFF, 0, 0, w-2, h-2);
		fr(up, 0x64, 2, 2, w-4, h-4);
		fr(up, topColor, 2, 2, w-6, h-6);

		let over = new PIXI.Graphics();
		fr(over, 0x20, 0, 0, w,    h);
		fr(over, 0xFF, 2, 2, w-6,  h-6);
		fr(over, 0x40, 4, 4, w-8,  h-8);
		fr(over, 0xA0, 4, 4, w-10, h-10);

		let down = new PIXI.Graphics();
		fr(down, 0xFF, 0, 0, w,   h);
		fr(down, 0x20, 0, 0, w-2, h-2);
		fr(down, 0x64, 2, 2, w-4, h-4);
		fr(down, 0xDC, 4, 4, w-6, h-6);

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