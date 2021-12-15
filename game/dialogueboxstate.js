/* DialogueBox behaves like a State
Creates a dialogue box that goes over the other states.
*/
class DialogueBox{
	constructor(w=300, h=100, title="Dialogue Box"){
		this.width = w;
		this.height = h;

		let stage = new PIXI.Container();
		this.stage = stage;

		this.showUnderlay = true;

		let box = new PIXI.Graphics();
		this.box = box;
		box.position.set(DIM.w/2 - w/2, DIM.h/2 - h/2);
		let fr = function(graphics, color, x, y, w, h){
			graphics.beginFill(color);
			graphics.drawRect(x, y, w, h);
		}
		//base grey box
		fr(box, 0x000000, 0, 0, w  , h  );
		fr(box, 0xC0C0C0, 0, 0, w-2, h-2);
		fr(box, 0x646464, 2, 2, w-4, h-4);
		fr(box, 0xFFFFFF, 2, 2, w-6, h-6);
		fr(box, 0x909090, 4, 4, w-8, h-8);
		//blue title bar + title
		fr(box, 0x000080, 6, 6, w-12, 22);
		this.title = printText(
			title, "arcade", 0xFFFFFF, 1, 8, 8);
		box.addChild(this.title);

		//the space underneath the title bar
		let body = new PIXI.Container();
		this.body = body;
		let border = 10;
		this.bodyWidth = this.width - border * 2;
		this.bodyHeight = this.height - 22 - border * 2;
		body.position.set(border, border + 22);
		box.addChild(body);

		stage.addChild(box);

		//stored button variables for addButton()
		this.defaultButtonHeight = 40;
		this.defaultButtonGap = 10;
		this.buttons = [];

		ENABLE_RIGHT_CLICK = true;
	}

	destructor(){
		for (let obj of this.body.children)
			if (obj.isTextInput)
				obj.destroy();
		if (this.underlayStage)
			this.underlayStage.interactiveChildren = true;

		ENABLE_RIGHT_CLICK = false;
	}

	setMessage(message){
		if (!this.message){
			this.message = printText(message, "arcade", 0x000000, 1, 4, 4);
			this.message.maxWidth = this.width - 12;
			this.body.addChild(this.message);
		}
		else
			this.message.text = message;
	}

	add(object){
		this.body.addChild(object);
	}

	addButton(name, bw, bh, func){
		//place buttons from the bottom-right to bottom-left
		let x;
		let n = this.buttons.length;
		if (n == 0)
			x = this.bodyWidth - bw;
		else
			x = this.buttons[n-1].x - this.defaultButtonGap - bw;
		
		let y = this.bodyHeight - bh;
		let button = new Button(x, y, bw, bh);

		let text = printText(name, "arcade", 0x000000, 1);
		text.anchor.set(0.5);
		text.position.set(bw/2, bh/2);
		button.add(text);
		button.onClick = func;

		this.body.addChild(button);
		this.buttons.push(button);

		return button;
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
	}
};