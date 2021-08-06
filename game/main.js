//all sprites are scaled 2x
//a single brick is 32 pixels wide and 16 pixels high
//a powerup is the same size as a brick
//a regular ball has a radius of 7 pixels
//the game board is 13 bricks wide and 32 bricks high

//DIM stands for dimensions
//window would have been a better var name, but it was already taken
var DIM = {w: 800, h: 600};
DIM.width = DIM.w;
DIM.height = DIM.h;
DIM.lwallx = 192;
DIM.rwallx = DIM.w - DIM.lwallx;
DIM.ceiling = 88;
DIM.wallw = DIM.lwallx;
DIM.boardw = DIM.rwallx - DIM.lwallx;
DIM.boardh = DIM.h - DIM.ceiling;
//offset due to outer border
DIM.outerx = 12;
DIM.outery = 36;
DIM.offx = 6;
DIM.offy = 30;

var app;
var renderer;
var appMouse;
var mouse = {};
var keyboard;
var keycode;
var game;
var ENABLE_RIGHT_CLICK = false;

//default levels and playlists are loaded from PIXI loader assets
//user levels and playlists are loaded from localstorage
var levels = {
	default: {list: null, lookup: {}},
	user: {list: null, lookup: {}},
};
var playlists = {
	default: {list: null, lookup: {}},
	user: {list: null, lookup: {}},
};
//loaded form localstorage
var options = {

};

var alert_record = {};
function ALERT_ONCE(message, id = 0){
	if (!alert_record[id]){
		alert_record[id] = true;
		alert(message);
	}
}

class Game {
	constructor(){
		this.states = [];
		this.top = null;
		this.stage = new PIXI.Container();
	}

	//takes in account of border offset
	//used for screen shake effect
	setPos(x=0, y=0){
		this.stage.position.set(DIM.offx + x, DIM.offy + y);
	}
	
	getState(i){
		if (i < 0)
			i += this.states.length;
		return this.states[i];
	}

	push(state){
		this.top = state;
		this.states.push(state);
		this.switchStage();
	}
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
	}
	//switch rendering to the top layer
	switchStage(){
		this.stage.removeChildren();
		if (this.top){
			let top = this.top;
			this.stage.addChild(top.stage);
			if (top.windowTitle){
				let text = `Otaku-Ball - ${top.windowTitle}`;
				this.windowTitle.text = text;
			}
		}
		//also clear mouse buttons
		mouse.m1 = 0;
		mouse.m2 = 0;
	}

	update(delta){
		mouse.updatePos();
		this.top.update(delta);
		mouse.updateButton();
		keyboard.update();
	}

	//expose frequently used methods from the underlying states
	add(name, obj){
		this.top.add(name, obj);
	}

	emplace(name, obj){
		this.top.emplace(name, obj);
	}

	incrementScore(score){
		this.top.incrementScore?.(score);
	}

	createMonitor(...args){
		return this.top.createMonitor(...args);
	}

	get(name, includeNew){
		return this.top.get(name, includeNew);
	}
	
}

//custom mask class that takes in account of the window offset
class Mask extends PIXI.Graphics{
	constructor(x, y, w, h){
		super();
		this.beginFill(0xFFFFFF);
		this.drawRect(x + DIM.offx, y + DIM.offy, w, h);
	}

	resize(x, y, w, h){
		this.clear();
		this.beginFill(0xFFFFFF);
		this.drawRect(x + DIM.offx, y + DIM.offy, w, h);
	}
}

//need to put everything in a function
//so it can be called after the document
//is created
function init(){
	PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
	PIXI.settings.ROUND_PIXELS = true;
	
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
		width: DIM.w + DIM.outerx,
		height: DIM.h + DIM.outery,
		antialias: false,
		backgroundAlpha: false,
		resolution: 1
	});

	renderer = app.renderer;

	appMouse = app.renderer.plugins.interaction.mouse;

	//use this for all mouse related actions
	mouse = {
		x: 0,
		y: 0,
		m1: 0,
		m2: 0,
		scroll: 0, //can be positive or negative value
		updatePos(){
			this.x = appMouse.global.x - DIM.offx;
			this.y = appMouse.global.y - DIM.offy;
		},
		updateButton(){
			//m1 = 1 for first frame left mouse button is down
			//m1 = 2 for subsequent frames until button is released
			if (this.m1 == 1)
				this.m1 = 2;
			if (this.m2 == 1)
				this.m2 = 2;
			this.scroll = 0;
		},
		inBoard(){
			return (
				this.x > DIM.lwallx && this.x < DIM.rwallx &&
				this.y > DIM.ceiling && this.y < DIM.h
			);
		}
	}

	let stage = app.stage;
	stage.interactive = true;
	stage.on("pointerdown", function(e){
		//InteractionData is stored in e.data
		// console.log("pointer down " + e.data.button);
		let butt = e.data.button;
		if (butt == 0){
			mouse.m1 = 1;
			// mouse.m2 = 0; //why was this needed?
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
	});
	
	alterMouseEvents();

	app.renderer.backgroundColor = 0x000000;

	document.body.appendChild(app.view);

	media.load(setup); //calls setup() once loading is done
}

function setup(){
	console.log("LOAD COMPLETE");

	media.processTextures();
	media.processSounds();
	media.createAnimations();

	//load levels + playlists
	levels.default.list = PIXI.Loader.shared.resources.default_levels.data;
	for (let [name, level] of levels.default.list){
		levels.default.lookup[name] = level;
	}

	playlists.default.list = PIXI.Loader.shared.resources.default_playlists.data;
	for (let [name, playlist] of playlists.default.list){
		playlists.default.lookup[name] = playlist;
	}

	//load options


	game = new Game();

	let [box, title] = 
		createOuterBorder(DIM.w + DIM.outerx, DIM.h + DIM.outery);
	app.stage.addChild(box);
	game.windowTitle = title;
	game.setPos(0, 0);
	//create a 800 x 600 mask
	game.stage.mask = new Mask(0, 0, DIM.w, DIM.h);

	game.push(new MainMenuState());
	// game.push(new EditorState());
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

function createOuterBorder(w, h){
	let fr = function(graphics, color, x, y, w, h){
		graphics.beginFill(color);
		graphics.drawRect(x, y, w, h);
	}

	let box = new PIXI.Graphics();
	fr(box, 0x000000, 0, 0, w  , h  );
	fr(box, 0xC0C0C0, 0, 0, w-2, h-2);
	fr(box, 0x646464, 2, 2, w-4, h-4);
	fr(box, 0xFFFFFF, 2, 2, w-6, h-6);
	fr(box, 0xAAAAAA, 4, 4, w-8, h-8);
	//blue title bar
	fr(box, 0x000080, 6, 6, w-12, 22);

	let title = printText("Otaku-Ball", 
		"arcade", 0xFFFFFF, 1, 8, 8
	);
	box.addChild(title);

	return [box, title];
}

//takes in account of outer border offset
function getTrueGlobalPosition(obj){
	let p = obj.getGlobalPosition();
	return new PIXI.Point(p.x-DIM.offx, p.y-DIM.offy);
}

//when cursor is in game window:
//	-disable right click context menu
//	-disable left click (to prevent double click highlighting)
//	-disable scroll wheel (to prevent scrolling the page while scrolling Level Select)
//can be temporarily disabled if ENABLE_RIGHT_CLICK is set to true.
function alterMouseEvents(){
	function mouseInWindow(){
		if (ENABLE_RIGHT_CLICK)
			return false;
		let mx = appMouse.global.x;
		let my = appMouse.global.y;
		return (
			mx > DIM.offx &&
			mx < DIM.offx + DIM.w &&
			my > DIM.offy &&
			my < DIM.offy + DIM.h
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
		// document.addEventListener(`scroll`, function(e){
		// 	if (mouseInWindow())
		// 		e.preventDefault();
		// 	console.log("scroll");
		// });
		document.addEventListener(`wheel`, function(e){
			// console.log("wheel " + e.deltaY);
			mouse.scroll = e.deltaY;
		});
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

//Other important utility functions that I don't know
//where else to put

function getGridPos(x, y){
	if (x instanceof Object){
		y = x.y;
		x = x.x;
	}
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

function clamp(value, min, max){
	return Math.max(min, Math.min(max, value));
}

function clampGridPos(i, j){
	let i2 = clamp(i, 0, 32-1);
	let j2 = clamp(j, 0, 13-1);
	return [i2, j2];
}

/**
 * Create a lookup table with arr elements as keys
 */
function generateLookup(arr){
	let lookup = {};
	for (let key of arr)
		lookup[key] = true;
	return lookup;
}

/**
 * Removes all elements from array that satisfies condition.<br>
 * Will modify arr and return an Array of removed elements.
 */
function remove_if(arr, func){
	let removed = [];
	let index = 0;
	while (index != arr.length){
		if (func(arr[index]))
			removed.push(...arr.splice(index, 1));
		else
			index++;
	}
	return removed;
}

/**
 * returns an integer from [a to b-1] inclusive
 */
function randRange(a, b){
	if (b === undefined){
		b = a;
		a = 0;
	}
	return a + Math.floor(Math.random() * (b-a));
}

/**
 * returns an float from [a to b) not including b
 */
function randRangeFloat(a, b){
	if (b === undefined){
		b = a;
		a = 0;
	}
	return a + Math.random() * (b-a);
}

function deltaEqual(a, b, epsilon=0.001){
	return (Math.abs(a-b) < epsilon);
}

//Remove all dead Sprites from a PIXI.Container
function updateAndRemove(container, delta){
	let dead = [];
	for (let obj of container.children){
		obj.update(delta);
		if (obj.isDead())
			dead.push(obj);
	}
	for (let obj of dead)
		container.removeChild(obj);
}

function circleRectOverlap(ccx, ccy, cr, rcx, rcy, rw, rh){
	let circleDistX = Math.abs(ccx - rcx);
	let circleDistY = Math.abs(ccy - rcy);
	if (circleDistX > rw/2 + cr) return false;
	if (circleDistY > rh/2 + cr) return false;
	if (circleDistX <= rw/2) return true;
	if (circleDistY <= rh/2) return true;
	let cornerDist = 
		(circleDistX - rw/2) ** 2 + 
		(circleDistY - rh/2) ** 2;
	return (cornerDist < cr ** 2);
}

function AABBOverlap(box1, box2){
	return !(
		box1[0] >= box2[2] ||
		box1[2] <= box2[0] ||
		box1[1] >= box2[3] ||
		box1[3] <= box2[1]
	);
}