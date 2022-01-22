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

var levels = {
	//Will be initialized as a FileDatabase during setup(). Will not be modified afterwards.
	default: null,
	//Will be initialized as a FileDatabase during setup(). Can be modified as the user saves levels.
	user: null,
};
var playlists = {
	//Will be initialized as a FileDatabase during setup(). Will not be modified afterwards.
	default: null,
	//SHOULD NOT EXIST. User playlist will be generated during LevelSelectState init.
	user: null, //this should stay null
};

var DEFAULT_VOLUME = 15;

//loaded from localstorage
var campaign_save = null;

var alert_record = {};
function ALERT_ONCE(message, id = 0){
	if (!alert_record[id]){
		alert_record[id] = true;
		alert(message);
	}
}

//base State class for PIXI.TextInputs
//if handling
class State{
	constructor(){
		this.allowRightClick = true;
		this._textInputs = [];
	}

	//called when this state gets popped from the stack
	destructor(){
		for (let input of this._textInputs){
			input.blur();
			input.destroy();
		}
	}

	update(delta){
		if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}
	}

	//called when another state gets pushed on top of this state
	onExit(){
		this.stage.interactiveChildren = false;
		for (let input of this._textInputs){
			input.blur();
			input.substituteText = true; //will prevent text from bleeding between states
		}
	}

	//called when another state gets popped, making this state the top state
	onEnter(){
		this.stage.interactiveChildren = true;
		for (let input of this._textInputs){
			input.substituteText = false;
		}
	}

	//all text inputs must be registered to the state
	createTextInput(width, fontSize, padding=0){
		let input = new PIXI.TextInput({
			input: {
				fontSize: `${fontSize}px`,
				width: `${width}px`,
				padding: `${padding}px`,
				color: 0x000000
			},
			box: {
				fill: 0xFFFFFF,
				stroke: {
					color: 0x000000,
					width: 2
				}
			}
		});

		input.isTextArea = false;
		input.substituteText = true;

		this._textInputs.push(input);
		return input;
	}

	createNumInput(width, fontSize, padding=0){
		let input = this.createTextInput(width, fontSize, padding);
		input.restrict = "0123456789";
		input.range = [-Infinity, Infinity];
		input.onInput = () => {};
		input.on("input", (text) => {
			input.onInput(clamp(Number(text), input.range[0], input.range[1]));
		});
		input.on("blur", () => {
			let num = Number(input.text);
			num = clamp(num, input.range[0], input.range[1]);
			input.text = String(num);
		});
		return input;
	}

	createTextArea(width, height, fontSize){
		let input = new PIXI.TextInput({
			input: {
				fontSize: `${fontSize}px`,
				width: `${width}px`,
				height: `${height}px`,
				color: 0x000000,
				multiline: true,
				wrap: "soft",
			},
			box: {
				fill: 0xFFFFFF,
				stroke: {
					color: 0x000000,
					width: 2
				}
			}
		});
		input.isTextArea = true;
		input.substituteText = false;
	
		this._textInputs.push(input);
		return input;
	}

	//returns true if the mouse is inside a text input
	mouseInInput(){
		let mx = appMouse.global.x;
		let my = appMouse.global.y;
		for (let input of this._textInputs){
			if (input.getBounds().contains(mx, my))
				return true;
		}
		return false;
	}

	//TODO: implement destroyTextInput() if needed

	// registerInput(input){
	// 	this._textInputs.push(input);
	// }

	//always allow right click when mouse is inside a textbox
	//mx and my are global mouse positions
	//As long as there are no text boxes in editorstate or playstate we don't need
	//to check the input boxes as allowRightClick will be true for them
	canRightClick(mx, my){
		// if (ENABLE_RIGHT_CLICK)
		// 	return true;
		
		// if (this.allowRightClick)
		// 	return true;

		// for (let input of this._textInputs){
		// 	if (input.getBounds().contains(mx, my))
		// 		return true;
		// }
		// return false;
		return (ENABLE_RIGHT_CLICK || this.allowRightClick);
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
	
	//supports negative indexing
	getState(i){
		if (i < 0)
			i += this.states.length;
		return this.states[i] ?? null;
	}

	push(newState){
		this.top?.onExit();
		this.top = newState;
		this.states.push(newState);
		this.switchStage();
	}
	pop(){
		let states = this.states;
		let state = states.pop();
		state.destructor();
		if (states.length == 0){
			this.top = null;
		}
		else{
			this.top = states[states.length-1];
			this.top.onEnter();
		}
		this.switchStage();
	}
	//pop the current state and push the new state
	//will not trigger the underlying state's onEnter() or onExit()
	replace(newState){
		let states = this.states;
		let state = states.pop();
		state.destructor();

		this.states.push(newState);
		this.top = newState;
		this.switchStage();
	}
	//switch rendering to the top layer
	//also supports underlay rendering
	switchStage(){
		this.stage.removeChildren();
		if (this.top){
			let top = this.top;
			if (top.showUnderlay){
				let n = top.showUnderlay;
				//show n amount of underlays
				for (let i = 0; i < n; i++){
					let index = -1 - n + i;
					let underlay = this.getState(index);
					this.stage.addChild(underlay.stage);
				}
			}
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

var debugKeyPressedObject = {};
//key commands for debug and cheat stuff
function debugKeyPressed(key){
	let obj = debugKeyPressedObject;

	//ignore key commands when focused on a textinput or textarea
	let element = document.activeElement;
	if (element !== null){
		let name = element.nodeName;
		// console.log(name);
		if (name == "INPUT" || name == "TEXTAREA")
			return;
	}

	//print out the mouse position for debugging purposes
	if (key == keycode.SPACE || key == keycode.M){
		let mx = Math.floor(mouse.x);
		let my = Math.floor(mouse.y);
		let dx = null;
		let dy = null;
		if (obj.old_mx !== undefined)
			dx = mx - obj.old_mx;
		if (obj.old_my !== undefined)
			dy = my - obj.old_my;
		console.log(`mouse = [${mx}, ${my}], delta = [${dx}, ${dy}]`);
		obj.old_mx = mx;
		obj.old_my = my;
	}

	//activate cheats only when the correct cheat phrase has been typed in
	function newCheatCode(){
		const code = "cheat";
		let arr = code.toUpperCase().split("").reverse();
		return arr.map(char => keycode[char]);
	}
	if (!cheats.enabled){
		//detect cheat code
		if (!obj.cheatCode)
		obj.cheatCode = newCheatCode();

		let len = obj.cheatCode.length;
		if (obj.cheatCode.length > 0){
			if (key == obj.cheatCode[len-1]){
				obj.cheatCode.pop();
				if (obj.cheatCode.length == 0)
					cheats.setEnabled(true);
			}
			else
				obj.cheatCode = newCheatCode();
		}
	}
	else{
		if (key == keycode._1)
			beatLevel();
		else if (key == keycode._2)
			beatZone();
		else if (key == keycode._3)
			resetCampaignSave();
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

	//load user volume setting from local storage
	let volume = localStorage.getItem("volume");
	if (volume === null){
		localStorage.setItem("volume", String(DEFAULT_VOLUME));
		volume = DEFAULT_VOLUME;
	}
	else{
		volume = clamp(Number(volume), 0, 100);
	}
	PIXI.sound.volumeAll = volume / 100;

	//load ENABLE_RIGHT_CLICK from local storage
	let enable = localStorage.getItem("enable_right_click");
	if (enable === null){
		localStorage.setItem("enable_right_click", "0");
		enable = "0";
	}
	ENABLE_RIGHT_CLICK = enable === "1";

	//load default levels from the loaded assets
	let default_list = PIXI.Loader.shared.resources.default_levels.data;
	FileDatabase.convert_level_object_to_string(default_list); //Backwards Compatibility
	// FileDatabase.convert_to_seconds(default_list);
	levels.default = new FileDatabase(default_list, false);
	//generate default playlist from the default levels
	playlists.default = new FileDatabase(default_list, true);

	//load user levels from local storage
	let str = localStorage.getItem("user_levels");
	let user_list = (str === null) ? [] : JSON.parse(str);
	FileDatabase.convert_level_object_to_string(user_list); //Backwards Compatibility
	levels.user = new FileDatabase(user_list, false);
	//user playlists will be generated in LevelSelectState

	//load campaign save from localStorage
	campaign_save = new CampaignSave();

	game = new Game();

	let [box, title] = 
		createOuterBorder(DIM.w + DIM.outerx, DIM.h + DIM.outery);
	app.stage.addChild(box);

	//create cheat display
	let cheatText = printText("CHEATS ENABLED", "arcade", 0xFF0000, 1, 0, 8);
	cheatText.x = DIM.w - cheatText.width;
	cheatText.visible = false;
	box.addChild(cheatText);
	game.cheatText = cheatText;

	game.windowTitle = title;
	game.outerBox = box;
	game.setPos(0, 0);
	//create a 800 x 600 mask
	game.stage.mask = new Mask(0, 0, DIM.w, DIM.h);

	game.push(new MainMenuState());
	// game.push(new EditorState());
	// game.top.configPowerupButton.onClick();
	// game.top.enemySpawnButton.onClick();
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

	//debug/cheat keyboard commands
	keyboard.on("pressed", debugKeyPressed);
}

function createOuterBorder(w, h){

	let fr = fillRect;

	let box = new PIXI.Graphics();
	fr(box, 0x000000, 0, 0, w  , h  ); //outer bottom right
	fr(box, 0xC0C0C0, 0, 0, w-2, h-2); //outer upper left
	fr(box, 0x646464, 2, 2, w-4, h-4); //inner bottom right
	fr(box, 0xFFFFFF, 2, 2, w-6, h-6); //inner upper left
	fr(box, "main0", 4, 4, w-8, h-8); //center
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

//DOES NOT WORK
//Error counter will be displayed on the top right corner if there is at least 1 error
function createErrorDisplay(){
	let count = 0;
	let text = printText("Errors: 0", "arcade", 0xFF0000, 1, DIM.w - 160, 8);
	text.visible = true;
	app.stage.addChild(text);

	//some errors will freeze the game 
	window.onerror = function(){
		count++;
		text.text = "Errors: " + count;
		text.visible = true;
		return false;
	};
}

//check if the the player can right-click at the current mouse position
//return true if right click is allowed
function checkRightClick(){
	let mx = appMouse.global.x;
	let my = appMouse.global.y;

	//can right click if mouse is outside of the game window
	if (!(
		mx > DIM.offx &&
		mx < DIM.offx + DIM.w &&
		my > DIM.offy &&
		my < DIM.offy + DIM.h
	))
	{
		return true;
	};

	//check conditions for current state
	return game.top.canRightClick(mx, my);
}

//when cursor is in game window:
//	-disable right click context menu
//	-disable left click (to prevent double click highlighting)
//	-disable scroll wheel (to prevent scrolling the page while scrolling Level Select)
//can be temporarily disabled if ENABLE_RIGHT_CLICK is set to true.
function alterMouseEvents(){
	if (document.addEventListener) {
        document.addEventListener('contextmenu', function (e) {
        	if (!checkRightClick())
            	e.preventDefault();
        }, false);
         document.addEventListener('mousedown', function (e) {
        	if (!checkRightClick())
            	e.preventDefault();
        }, false);
		//doesn't work
		// document.addEventListener(`scroll`, function(e){
		// 	if (!checkRightClick())
		// 		e.preventDefault();
		// });
		document.addEventListener(`wheel`, function(e){
			// console.log("wheel " + e.deltaY);
			mouse.scroll = e.deltaY;
		});
        // console.log("addevent");
    }
    else {
        document.attachEvent('oncontextmenu', function () {
        	if (!checkRightClick())
            	window.event.returnValue = false;
        });
        document.attachEvent('mousedown', function () {
        	if (!checkRightClick())
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
 * Create a lookup table with the array elements as keys and the value as true
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

/**
 * returns true if both arrays have the same length and elements
 */
function arrayEqual(arr1, arr2){
	if (arr1.length != arr2.length)
		return false;
	for (let i = 0; i < arr1.length; i++){
		if (arr1[i] != arr2[i])
			return false;
	}
	return true;
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