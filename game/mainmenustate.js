var title_layout = [

"brs reg bls ___ brb reg reg ___ ___ brb bls ___ reg brs tlb brs ___ bls ___ ___ ___ ___ ___ ___ brb reg ___ ___ ___ brb bls ___ brs ___ ___ brs ___ ___",
"brb reg blb brs reg reg reg ___ brs reg blb ___ reg brb tls brb ___ blb ___ ___ ___ ___ ___ brs reg reg ___ ___ brs reg blb ___ brb ___ ___ brb ___ ___",
"reg ___ reg ___ ___ reg ___ ___ brb tlb reg ___ reg tlb ___ reg ___ reg ___ ___ ___ ___ ___ brb ___ tlb ___ ___ brb tlb reg ___ reg ___ ___ reg ___ ___",
"reg ___ reg ___ ___ reg ___ brs reg tls reg ___ reg tls ___ reg ___ reg ___ trb reg bls ___ reg ___ tls ___ brs reg tls reg ___ reg ___ ___ reg ___ ___",
"trb ___ reg ___ ___ reg ___ brb tlb brb reg ___ reg blb ___ trb ___ reg ___ trs reg blb ___ reg trb bls ___ brb tlb brb reg ___ reg ___ ___ reg ___ ___",
"trs ___ reg ___ ___ reg ___ reg tls reg reg ___ reg trb bls trs ___ reg ___ ___ ___ ___ ___ reg trs blb ___ reg tls reg reg ___ reg ___ ___ reg ___ ___",
"___ trb reg ___ ___ trb ___ tlb ___ ___ reg ___ tlb trs blb ___ trb reg ___ ___ ___ ___ ___ reg reg reg ___ tlb ___ ___ reg ___ reg reg tls reg reg tls",
"___ trs reg ___ ___ trs ___ tls ___ ___ reg ___ tls ___ trb ___ trs reg ___ ___ ___ ___ ___ reg reg tlb ___ tls ___ ___ reg ___ reg tlb ___ reg tlb ___",

];

class MainMenuState{
	constructor(){
		let layerNames = [
			"background",
			"bricks",
			"balls",
			"hud"
		];

		let stage = new PIXI.Container();
		this.stage = stage;

		for (let name of layerNames){
			let cont = new PIXI.Container();
			stage.addChild(cont);
			this[name] = cont;
		}

		this.add("background", makeSprite("title_bg", 2));
		for (let i = 0; i < 2; i++){
			let gate = makeSprite("gate_slice");
			gate.scale.set(800, 2);
			gate.angle = 90;
			let x = (i == 0) ? 16 : DIM.w;
			gate.position.set(x, 0);
			this.add("background", gate);
		}

		//create title bricks
		let x0 = 100;
		let y0 = 100;
		for (let [i, line] of title_layout.entries()){
			let arr = line.split(" ");
			for (let [j, str] of arr.entries()){
				if (str == "___")
					continue;
				let x = x0 + j * 16;
				let y = y0 + i * 8;
				let br = new TitleBrick(x, y, str);
				this.add("bricks", br);
			}
		}

		//create balls
		for (let i = 0; i < 5; i++){
			let rad = Math.random() * Math.PI / 2;
			rad -= Math.PI / 4;
			let [vx, vy] = Vector.rotate(0, -0.5, rad);
			let ball = new Ball(DIM.w/2, DIM.h, vx, vy);
			ball.disableBounce = true;
			this.add("balls", ball);
		}

		//add title subtext
		this.add("hud", makeSprite(
			"title_subtext_0", 1, (DIM.w-270)/2, 75));
		this.add("hud", makeSprite(
			"title_subtext_1", 1, 550, 165));
		this.add("hud", makeSprite(
			"title_subtext_2", 1, 20, DIM.h-15));

		//menu buttons
		let positions = [];
		for (let i = 0; i < 6; i++){
			let x = 150 + ((i < 3) ? 0 : 300);
			let y = 300 + (i % 3) * 70;
			positions.push([x, y]);
		}
		let posIndex = 0;
		let makeButton = (tex, name, callback, notReady=false) => {
			let [x, y] = positions[posIndex++];
			let butt = new Button(x, y, 50, 50);
			butt.add(makeSprite(tex, 2, 4, 4));
			butt.onClick = callback;
			this.add("hud", butt);
			let text = printText(
				name, "arcade", 0x000000, 1, x+60, y+15);
			this.add("hud", text);

			if (notReady){
				text.y -= 10;
				let text2 = printText("(Under Construction)", 
					"windows", 0xFF0000, 1, x+60, y+30);
				this.add("hud", text2);
			}
		}

		makeButton("menu_button_0", "Play Campaign", function(){
			console.log("Campaign not implemented yet");
		}, true);
		makeButton("menu_button_1", "Play Playlist", function(){
			console.log("Playlist Select not implemented yet");
		}, true);
		makeButton("menu_button_2", "Play Level", function(){
			game.push(new LevelSelectState("play"));
		});
		makeButton("menu_button_3", "Options", function(){
			console.log("Options not implemented yet");
		}, true);
		makeButton("menu_button_4", "Playlist Editor", function(){
			console.log("Playlist Editor not implemented yet");
		}, true);
		makeButton("menu_button_5", "Level Editor", function(){
			game.push(new EditorState());
		});
	}

	add(name, obj){
		this[name].addChild(obj);
	}

	update(delta){
		for (let br of this.bricks.children){
			for (let ball of this.balls.children){
				let resp = br.checkSpriteHit(ball);
				if (resp[0])
					br.onSpriteHit(ball, resp[1], resp[2]);
			}
		}

		for (let br of this.bricks.children)
			br.update(delta);
		for (let ball of this.balls.children)
			ball.update(delta);


		//custom ball-wall bounce
		for (let ball of this.balls.children){
			let [x0, y0, x1, y1] = ball.shape.getAABB();
			if (x0 < 16)
				ball.handleCollision(1, 0);
			else if (x1 > DIM.w-16)
				ball.handleCollision(-1, 0);
			else if (y0 < 0)
				ball.handleCollision(0, 1);
			else if (y1 > DIM.h)
				ball.handleCollision(0, -1);
		}
	}
}

//title bricks are half the size of a regular brick
class TitleBrick extends Brick{
	static data = {
		//str: [i, j, points]
		reg: [0, 0, [0,0, 16,0, 16,8, 0,8]],
		trb: [1, 0, [0,0, 16,0, 16,8, 8,8]],
		trs: [2, 0, [8,0, 16,0, 16,8]],
		tlb: [1, 1, [0,0, 16,0, 8,8, 0,8]],
		tls: [2, 1, [0,0, 8,0, 0,8]],
		brs: [1, 2, [16,0, 16,8, 8,8]],
		brb: [2, 2, [8,0, 16,0, 16,8, 0,8]],
		bls: [1, 3, [0,0, 8,8, 0,8]],
		blb: [2, 3, [0,0, 8,0, 16,8, 0,8]],
	};

	constructor(x, y, str){
		let arr = TitleBrick.data[str];
		let [i0, j0, points] = arr;
		let tex = `brick_title_${i0}_${j0}`;
		super(tex, x, y);
		this.setShape(new PolygonShape(points));
		this.health = 1000;
		this.armor = 10;
		this.hitSound = null;
		this.deathSound = null;

		//animations can be made by shifting j four spaces
		let ani = [];
		for (let j = 0; j < 4; j++)
			ani.push(`brick_title_${i0}_${j0+j*4}`);
		for (let i = 2; i >= 1; i--)
			ani.push(ani[i]);
		this.addAnim("shine", ani, 0.25);
	}

	takeDamage(damage, strength){
		super.takeDamage(damage, strength);
		this.playAnim("shine");
	}
}