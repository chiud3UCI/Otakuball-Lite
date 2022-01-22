var DEFAULT_SPAWN_TIMES = [2, 2, 8];

class EnemySpawnState extends DialogueBox{
    constructor(editorstate){
        super(600, 300, "Enemy Spawn Configuration");
        this.editorstate = editorstate;
		let spawn = editorstate.enemySpawn;
		let times = editorstate.enemySpawnTimes;

		//Enemy Buttons
		let bx = 20;
		let by = 20;

		this.add(printText("Enemy Toggle", "windows", 0x000000, 2, bx, by));

		for (let i = 0; i < 9; i++){
			let x = Math.floor(i/5) * 60 + bx + 24;
			let y = (i % 5) * 24 + by + 36;
			let butt = new EnemyCheckbox(editorstate, x, y, i);
			butt.setState(spawn[i]);
			this.add(butt);
		}

		function modifyTextInput(input){
			input.maxLength = 7;
			//there used to be more stuff here
		}

		let divider = new PIXI.Graphics();
		drawDivider(divider, "vertical", bx + 186, 10, this.bodyHeight - 10*2);
		this.add(divider);

		//Initial Spawn Delay
		let tx = 230;
		let ty = by;
		let text = "Initial Spawn Delay:\n";
		text += "                seconds";
		this.add(printText(text, "windows", 0x000000, 2, tx, ty));

		let init = this.createNumInput(80, 20, 2);
		modifyTextInput(init);
		init.position.set(tx, ty + 28);
		init.text = String(times[0]);
		init.onInput = (num) => {
			times[0] = num;
		};
		this.add(init);

		//Subsequent Spawn Delay
		ty += 90;
		text = "Subsequent Spawn Delay:\nrandom interval from\n";
		text += "               to                 seconds";
		this.add(printText(text, "windows", 0x000000, 2, tx, ty));

		let sub1 = this.createNumInput(80, 20, 2);
		modifyTextInput(sub1);
		sub1.position.set(tx, ty + 56);
		sub1.text = String(times[1]);
		sub1.onInput = (num) => {
			times[1] = num;
		};
		this.add(sub1);

		let sub2 = this.createNumInput(80, 20, 2);
		modifyTextInput(sub2);
		sub2.position.set(tx + 126, ty + 56);
		sub2.text = String(times[2]);
		sub2.onInput = (num) => {
			times[2] = num;
		};
		this.add(sub2);

		//Back Button
		let bw = 100;
		let bh = 40;
		let body_w = this.bodyWidth;
		let body_h = this.bodyHeight;
		let butt = new Button(body_w - bw - 6, body_h - bh - 6, bw, bh);
		butt.addCentered(printText("Back", "arcade", 0x000000, 1));
		this.add(butt);
		butt.onClick = () => {
			game.pop();
		};
    }
}

class EnemyCheckbox extends PIXI.Sprite{
	constructor(editorstate, x, y, id){
		let i = 2;
		let j = 2;
		if (id > 0){
			i = Math.floor((id+1)/6);
			j = (id+1) % 6;
		}
		let texstr = `editorenemy_${i}_${j}`;
        super(media.textures[texstr]);
        
        this.position.set(x, y);
        this.scale.set(2);
        this.editorstate = editorstate;
        this.interactive = true;
        this.on("pointerdown", (e) => {this.pointerDown(e);});
        
		this.enemyId = id;

		let cross = makeSprite("editorenemy_2_0");
		cross.x = 12;
		cross.visible = true;
		this.addChild(cross);
		this.cross = cross;

		let check = makeSprite("editorenemy_2_1");
		check.x = 12;
		check.visible = false;
		this.addChild(check);
		this.check = check;

		this.checkState = false;
	}

	setState(value){
		if (value){
			this.cross.visible = false;
			this.check.visible = true;
		}
		else{
			this.cross.visible = true;
			this.check.visible = false;
		}
		this.checkState = value;
	}

	pointerDown(e){
		this.setState(!this.checkState);
		let arr = this.editorstate.enemySpawn;
		arr[this.enemyId] = Number(this.checkState);
	}
}
