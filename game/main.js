//all sprites are scaled 2x
//a single brick is 32 pixels wide and 16 pixels high
//a powerup is the same size as a brick
//a regular ball has a radius of 7 pixels
//the game board is 13 bricks wide and 32 bricks high

//DIM stands for dimensions
//window was already taken
var DIM = {w: 800, h: 600};
DIM.width = DIM.w;
DIM.height = DIM.h;
DIM.lwallx = 192;
DIM.rwallx = DIM.w - DIM.lwallx;
DIM.ceiling = 88;
DIM.wallw = DIM.lwallx;
DIM.boardw = DIM.rwallx - DIM.lwallx;
DIM.boardh = DIM.h - DIM.ceiling;

var app;
var appMouse;
var mouse;
var keyboard;
var keycode;
var game;

var ALERT_FLAG = false;
function ALERT_ONCE(message){
	if (!ALERT_FLAG){
		ALERT_FLAG = true;
		alert(message);
	}
}

//need to put everything in a function
//so it can be called after the document
//is created
function init(){
	PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
	// PIXI.settings.ROUND_PIXELS = true;
	
	//check for webgl support
	let type = "WebGL";
	if(!PIXI.utils.isWebGLSupported()){
	  type = "canvas";
	}
	PIXI.utils.sayHello(type);

	console.log("Don't forget to hard refresh!");

	keyboard = PIXI.keyboardManager;
	keycode = PIXI.keyboard.Key;

	app = new PIXI.Application({
		width: 800,
		height: 600,
		antialias: false,
		transparent: false,
		resolution: 1
	});

	appMouse = app.renderer.plugins.interaction.mouse;

	//use this for all mouse related actions
	mouse = {
		x: 0,
		y: 0,
		m1: 0,
		m2: 0,
		updatePos(){
			this.x = appMouse.global.x;
			this.y = appMouse.global.y;
		},
		//differentiate between mouse click and hold
		updateButton(){
			if (this.m1 == 1)
				this.m1 = 2;
			if (this.m2 == 1)
				this.m2 = 2;
			//release all mice if mouse is outside of the game
			// let check = (
			// 	this.x > 0 &&
			// 	this.x < DIM.w &&
			// 	this.y > 0 &&
			// 	this.y < DIM.h
			// );
			// if (!check){
			// 	this.m1 = 0;
			// 	this.m2 = 0;
			// }
		}
	}

	let stage = app.stage;
	stage.interactive = true;
	stage.on("pointerdown", function(e){
		//InteractionData is stored in e.data
		// console.log("pointer down " + e.data.button);
		let butt = e.data.button;
		if (butt == 0){
			//its better to make m1 and m2 mutually exclusive
			mouse.m1 = 1;
			mouse.m2 = 0;
		}
		else if (butt == 2)
			mouse.m2 = 1;
	});
	stage.on("pointerup", function(e){
		// console.log("pointer up " + e.data.button);
		let butt = e.data.button;
		if (butt == 0)
			mouse.m1 = 0;
		else if (butt == 2)
			mouse.m2 = 0;
	})


	alterMouseEvents();

	app.renderer.backgroundColor = 0x000000;

	document.body.appendChild(app.view);

	media.load(setup);

}

function setup(){
	console.log("LOAD COMPLETE");

	media.processTextures();
	media.createAnimations();

	game = {
		states: [],
		top: null,
		stage: new PIXI.Container(),

		push(state){
			this.top = state;
			this.states.push(state);
			this.switchStage();
		},
		pop(){
			let states = this.states;
			let state = states.pop();
			if (state.destructor)
				state.destructor();
			if (states.length == 0)
				this.top = null;
			else
				this.top = states[states.length-1];
			this.switchStage();
		},
		//switch rendering to the top layer
		switchStage(){
			this.stage.removeChildren();
			if (this.top)
				this.stage.addChild(this.top.stage);
			//also clear mouse buttons
			mouse.m1 = 0;
			mouse.m2 = 0;
		},

		//add and emplace will be used frequently
		add(name, obj){
			this.top.add(name, obj);
		},

		emplace(name, obj){
			this.top.emplace(name, obj);
		},

		get(name){
			return this.top.get(name);
		},

		update(delta){
			mouse.updatePos();
			this.top.update(delta);
			mouse.updateButton();
			keyboard.update();
		}
	}

	game.push(new EditorState());
	// game.push(new TestState());

	app.stage.addChild(game.stage);

	//old ticker updates by delta frame
	// app.ticker.add(delta => game.update(delta));

	//new ticker updates by delta ms
	let ticker = app.ticker;
	let update = function(){
		game.update(ticker.deltaMS);
	}
	ticker.add(update);
}



//Other important utility functions that I don't know
//where else to put

//disable right click contex menu and
//disable mouse click while cursor is in game
function alterMouseEvents(){
	let mouseInWindow = function(){
		let mx = appMouse.global.x;
		let my = appMouse.global.y;
		return (
			mx > 0 &&
			mx < DIM.w &&
			my > 0 &&
			my < DIM.h
		);
	}

	if (document.addEventListener) {
        document.addEventListener('contextmenu', function (e) {
        	if (mouseInWindow())
            	e.preventDefault();
        }, false);
         document.addEventListener('mousedown', function (e) {
        	if (mouseInWindow())
            	e.preventDefault();
        }, false);
        // console.log("addevent");
    }
    else {
        document.attachEvent('oncontextmenu', function () {
        	if (mouseInWindow())
            	window.event.returnValue = false;
        });
        document.attachEvent('mousedown', function () {
        	if (mouseInWindow())
            	window.event.returnValue = false;
        });
        // console.log("attachevent");
    }
}

function getGridPos(x, y){
	let i = Math.floor((y - DIM.ceiling) / 16);
	let j = Math.floor((x - DIM.lwallx) / 32);
	return [i, j];
}

function getGridPosInv(i, j){
	let x = DIM.lwallx + 16 + (32 * j);
	let y = DIM.ceiling + 8 + (16 * i);
	return [x, y];
}

function boundCheck(i, j){
	//make sure there are parentheses
	//around the boolean statements
	return (
		i >= 0 &&
		i < 32 &&
		j >= 0 &&
		j < 13
	);
}

function clampGridPos(i, j){
	let i2 = Math.max(0, Math.min(32-1, i));
	let j2 = Math.max(0, Math.min(13-1, j));
	return [i2, j2];
}

function randRange(a, b){
	if (b === undefined){
		b = a;
		a = 0;
	}
	return a + Math.floor(Math.random() * (b-a));
}