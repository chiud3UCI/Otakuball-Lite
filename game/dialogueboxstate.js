/* DialogueBox behaves like a State
Creates a dialogue box that goes over the other states.
*/
class DialogueBox extends State{
	constructor(w=300, h=100, title="Dialogue Box"){
		super();
		this.width = w;
		this.height = h;

		let stage = new PIXI.Container();
		this.stage = stage;

		this.showUnderlay = 1;

		let box = new Base(DIM.w/2 - w/2, DIM.h/2 - h/2, w, h, title);

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
		super.destructor();

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
		if (func)
			button.onClick = func;

		this.body.addChild(button);
		this.buttons.push(button);

		return button;
	}

	//not to be confused with State's createTextArea()
	//textArea will be centered along the y-axis
	//if y_offset is offset from top; if null then it will be same as x-offset
	addTextArea(width, height, fontSize, y_offset=null){
		let input = this.createTextArea(width, height, fontSize);
		let x_offset = (this.bodyWidth - width) / 2 - 2;
		if (y_offset === null)
			y_offset = x_offset;
			
		input.position.set(x_offset, y_offset);
		this.add(input);

		return input;
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
	}
};