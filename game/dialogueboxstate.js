/* DialogueBox behaves like a State
Creates a dialogue box that goes over the other states.
*/
class DialogueBox{
	constructor(w=300, h=100, title="Dialogue Box", underlay=null){
		let stage = new PIXI.Container();
		this.stage = stage;

		if (underlay){
			this.underlayStage = underlay.stage;
			stage.addChild(this.underlayStage);
			this.underlayStage.interactiveChildren = false;
		}

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
			title, "arcade", 0xFFFFFF, 1, 8, 6);
		box.addChild(this.title);

		//the space underneath the title bar
		let body = new PIXI.Container();
		this.body = body;
		body.position.set(6, 22 + 6);
		box.addChild(body);

		stage.addChild(box);

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

	add(object){
		this.body.addChild(object);
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
	}
};