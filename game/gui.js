class Button extends PIXI.Container{
	constructor(x, y, w, h){
		super();
		this.position.set(x, y);

		//fill rect shortcut
		let fr = function(graphics, grey, x, y, w, h){
			let color = grey * 0x010101;
			graphics.beginFill(color);
			graphics.drawRect(x, y, w, h);
		}
		//give it a Windows 95 feel
		let up = new PIXI.Graphics();
		fr(up, 0x00, 0, 0, w,   h);
		fr(up, 0xFF, 0, 0, w-2, h-2);
		fr(up, 0x64, 2, 2, w-4, h-4);
		fr(up, 0x90, 2, 2, w-6, h-6);

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
	}

	add(drawable){
		this.stage.addChild(drawable);
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