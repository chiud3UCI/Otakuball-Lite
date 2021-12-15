//should be called outside of PlayState
let campaigntestthing = 4;

//take in account of the dialoguebox state
function inPlayState(){
    for (let state of game.states){
        if (state instanceof PlayState)
            return true;
    }
    return false;
}

function resetCampaignSave(){
    if (inPlayState()){
        console.log("Cannot do that while playing a level.");
        return;
    }

    campaign_save.reset();
    if (game.top instanceof CampaignState)
        game.top.load();
}

function importCampaignSave(str){
    if (inPlayState()){
        console.log("Cannot do that while playing a level.");
        return;
    }

    campaign_save.load(str);
    if (game.top instanceof CampaignState)
        game.top.load();
}

function exportCampaignSave(){
    if (inPlayState()){
        console.log("Cannot do that while playing a level.");
        return null;
    }

    return JSON.stringify(campaign_save.data);
}

class CampaignState{
    constructor(){
        this.windowTitle = "Campaign";

        let stage = new PIXI.Container();
        this.stage = stage;

        let bg = new PIXI.Graphics();
        bg.beginFill(0xAAAAAA)
            .drawRect(0, 0, DIM.w, DIM.h);
        stage.addChild(bg);

        const pad = 30;
        const board_w = 450;
        const gap = 30;
        const panel_w = DIM.w - gap - board_w - (pad * 2);
        const height = DIM.h - (pad * 2);

        let board = new CampaignBoard(this, pad, pad, board_w, height);
        let panel = new CampaignPanel(this, pad + board_w + gap, pad, panel_w, height);
        this.board = board;
        this.panel = panel;
        stage.addChild(board);
        stage.addChild(panel);

        //state: "ready", "select", "victory"
        this.state = null;
        this.starting = false;
        this.blackout = new PIXI.Graphics()
            .beginFill(0x000000)
            .drawRect(0, 0, DIM.w, DIM.h);
        this.blackout.alpha = 0;
        stage.addChild(this.blackout);

        this.load();
    }

    onReEnter(){
        this.starting = false;
        this.blackout.alpha = 0;
        this.load();
    }

    //load from global campaign_save
    //also sets the state based on campaign_save
    load(nodeClicked=false){
        this.state = "ready";
        if (campaign_save.isZoneComplete()){
            if (campaign_save.data.current_zone == "L")
                this.state = "victory";
            else
                this.state = "select";
        }

        this.board.load(nodeClicked);
        this.panel.load();
    }

    onPlay(){
        if (campaign_save.isZoneComplete()){
            console.log("Zone is complete, cannot start game.");
            return;
        }

        this.starting = true;
        this.board.onPlay();
        this.blackout.alpha = 0;

        this.startTimer = 0;
        this.startTimerMax = 1500;
        this.blackoutDelay = 500;
        this.blackoutInterval = this.startTimerMax - this.blackoutDelay;

        this.panel.playButton.setDisabled(true);
        this.panel.backButton.setDisabled(true);
    }

    update(delta){
        if (keyboard.isPressed(keycode.ESCAPE)){
			game.pop();
			return;
		}

        if (this.starting){
            this.startTimer += delta;
            this.blackout.alpha = clamp(
                (this.startTimer - this.blackoutDelay) / this.blackoutInterval, 0, 1);

            if (mouse.m1 == 1 || this.startTimer >= this.startTimerMax){
                //start the game
                game.push(new PlayState("campaign"));
                return;
            }
        }

        this.board.update(delta);
        // this.panel.update(delta);
    }
}

//Level select for all the zones
class CampaignBoard extends PIXI.Container{
    constructor(parentState, x, y, w, h){
        super();
        this.parentState = parentState;

        this.position.set(x, y);
        this.addChild(new PIXI.Graphics().beginFill(0x000000).drawRect(0, 0, w, h));
        let bg = new PIXI.TilingSprite(media.textures["campaign_bg"], w/2, h/2);
        bg.scale.set(2);
        this.addChild(bg);

        this.initNodes(w, h);

        let text = printText("SELECT ZONE", "arcade", 0xFFFFFF, 2, 0, 0);
        text.anchor.set(0.5, 0);
        text.position.set(w/2, 10);
        text.visible = false;
        this.addChild(text);
        this.text = text;

        this.textBlink = false;
        this.textBlinkTimer = 0;

        this.otakuball = new Otakuball(this);
        this.otakuball.teleportToNode(this.nodes.get("A"));
        this.addChild(this.otakuball);
    }

    initNodes(board_w, board_h){
        //this is a directed acyclic graph (dag)
        let graph = {
            A: ["B", "C"],
            B: ["D", "E"],
            C: ["E", "F"],
            D: ["G"],
            E: ["G", "H"],
            F: ["H"],
            G: ["I", "J"],
            H: ["J", "K"],
            I: ["L"],
            J: ["L"],
            K: ["L"],
            L: [],
        };

        //initialize all the nodes
        let nodes = new Map();
        this.nodes = nodes;
        for (let letter of Object.keys(graph)){
            nodes.set(letter, new CampaignNode(this, letter));
        }
        //link all the nodes
        for (let [letter, arr] of Object.entries(graph)){
            let node = nodes.get(letter);
            for (let letter2 of arr){
                node.addChild(nodes.get(letter2));
            }
        }
        //recursively set the height of each node in the dag
        let root = nodes.get("A");
        //will return the height of the root, which is the height of the dag
        root.calculateHeight();
        let root_height = root.height;
        //order nodes based on height
        let layers = [];
        for (let i = 0; i <= root_height; i++){
            layers.push([]);
        }
        for (let node of nodes.values()){
            layers[node.height].push(node);
        }
        //make sure each layer is sorted alphabetically
        for (let layer of layers){
            layer.sort((a, b) => a.letter < b.letter);
        }
        //arrange the nodes on the board based on the layer structure
        //the nodes also have to be center-aligned
        //Node A will be at the bottom
        let y0 = 90;
        let x0 = board_w/2;
        let dx = 165;
        let dy = dx/2; //will make most of the edges 45 degrees
        for (let [i, layer] of layers.entries()){
            let y = y0 + i*dy;
            let mid = (layer.length-1)/2;
            for (let [j, node] of layer.entries()){
                let x = x0 + dx*(j-mid);
                node.setPos(x, y);
            }
        }

        //all edges must be drawn underneath the nodes
        let edges = new PIXI.Container();
        this.addChild(edges);
        
        //add each node to the board and draw the edges
        for (let node of nodes.values()){
            this.addChild(node.stage);
            for (let edge of node.createEdges()){
                edges.addChild(edge);
            }
        }
    }

    load(nodeClicked=false){
        let state = this.parentState.state;
        let data = campaign_save.data;

        //reset all nodes first
        for (let node of this.nodes.values())
            node.setState("orange");

        let current_node = this.nodes.get(data.current_zone);
        current_node.setState("blinking");

        for (let node of this.nodes.values())
            node.stage.interactive = false;

        if (state == "ready"){
            this.text.visible = false;
            // this.textBlink = false;
            
            if (nodeClicked)
                this.otakuball.travelToNode(current_node);
            else
                this.otakuball.teleportToNode(current_node);
        }
        else if (state == "select"){
            this.text.text = "Select Zone";
            this.text.visible = true;
            // this.textBlink = true;
            // this.textBlinkTimer = 0;
            for (let child of current_node.children)
                child.stage.interactive = true;
            
            this.otakuball.teleportToNode(current_node);
        }
        else if (state == "victory"){
            this.text.visible = true;
            this.text.text = "You Win!";

            this.otakuball.teleportToNode(current_node);
        }

        //set all completed nodes to "beaten", even the current node
        for (let letter of data.completed_zones)
            this.nodes.get(letter).setState("beaten");
    }

    onPlay(){
        this.otakuball.fistPump();
    }

    update(delta){
        if (this.textBlink){
            this.textBlinkTimer += delta;
            if (this.textBlinkTimer >= 2000)
                this.textBlinkTimer = 0;
            this.text.visible = (this.textBlinkTimer < 1000);
        }

        this.otakuball.update(delta);

        for (let node of this.nodes.values())
            node.update(delta);
    }
}

class CampaignNode{
    static blinkTime = 500;
    
    constructor(board, letter){
        this.board = board;
        this.letter = letter;
        this.children = [];
        this.height = null; //will be set by calculateHeight()

        //this is better than extending PIXI.Container because
        //I don't have to worry about overriding members like "height" and "children"
        this.index = CampaignNode.letterLookup[letter];
        this.stage = new PIXI.Container();

        let orange = new Sprite(`campaign_letter_0_${this.index}`, 0, 0, 0, 0);
        let blue = new Sprite(`campaign_letter_1_${this.index}`, 0, 0, 0, 0);
        let beaten = new Sprite(`campaign_letter_2_0`, 0, 0, 0, 0);
        this.stage.addChild(beaten);
        this.stage.addChild(orange);
        this.stage.addChild(blue);
        this.circleSprites = {orange, blue, beaten};

        this.stage.interactive = false; //enable during zone select
        this.stage.on("pointerdown", (e) => {this.pointerDown(e);});
		this.stage.on("pointerup", (e) => {this.pointerUp(e);});
		this.stage.on("pointerover", (e) => {this.pointerOver(e);});
		this.stage.on("pointerout", (e) => {this.pointerOut(e);});
		this.down = false;
		this.over = false;

        this.blinkTimer = 0;
        this.blinkState = false;

        //edges need to be drawn behind EVERY node so they can't be part of this.stage
        this.edges = [];

        //states: "orange", "blue", "blinking", "beaten"
        this.setState("orange");
    }

    //recursively calculate's this node's height, assign it to member variable, and return it.
    calculateHeight(){
        if (this.children.length == 0){
            this.height = 0;
            return this.height;
        }
        let children_heights = this.children.map(child => child.calculateHeight());
        this.height = 1 + Math.max(...children_heights);
        return this.height;
    }

    addChild(child){
        this.children.push(child);
    }

    setPos(x, y){
        this.stage.position.set(x, y);
    }

    getPos(){
        return [this.stage.x, this.stage.y];
    }

    createEdges(){
        this.edges = [];
        let x0 = this.stage.x;
        let y0 = this.stage.y;

        for (let child of this.children){
            let x1 = child.stage.x;
            let y1 = child.stage.y;
            let dx = x1 - x0;
            let dy = y1 - y0;
            let length = Vector.dist(x0, y0, x1, y1);
            let angle = Vector.angleBetween(-1, 0, dx, dy);
            
            let edge = new Sprite("campaign_edge", x0 + dx/2, y0 + dy/2, 0, 0, angle, length, 2);

            this.edges.push(edge);
        }

        return this.edges;
    }

    setState(name){
        this.state = name;
        let sprites = this.circleSprites;
        for (let sprite of Object.values(sprites))
            sprite.visible = false;

        if (name == "blinking"){
            this.blinkTimer = 0;
            this.blinkState = true;
            sprites["orange"].visible = true;
            sprites["blue"].visible = true;
        }
        else{
            sprites[name].visible = true;
        }
    }

    update(delta){
        if (this.state == "blinking"){
            this.blinkTimer += delta;
            if (this.blinkTimer >= CampaignNode.blinkTime){
                this.blinkTimer = 0;
                this.blinkState = !this.blinkState;
                this.circleSprites["blue"].visible = this.blinkState;
            }
        }
    }

	onClick(){
		campaign_save.updateZone(this.letter);
        this.board.parentState.load(true);
	}

    //These methods are borrowed from the Button class
	pointerDown(e){
		this.down = true;
	}

	pointerUp(e){
		if (this.down){
			if (this.hoverGuard)
				this.over = false;
			this.onClick();
		}
		this.down = false;
	}

	pointerOver(e){
		this.over = true;
	}

	pointerOut(e){
		this.over = false;
		this.down = false;
	}
}

//gets the sprite index based on letter
CampaignNode.letterLookup = {};
for (let [i, letter] of Object.entries("ABCDEFGHIJKLMNOPQRSTUVWXYZ")){
    CampaignNode.letterLookup[letter] = i;
}

class Otakuball extends Sprite{
    static speed = 0.1;

    constructor(board){
        super(null, 0, 0, 0, 0, 0, 2, 2);
        this.board = board;

        this.addAnim("idle", "otakuball_idle", 3/32, true, true);
        this.addAnim("walk_up", "otakuball_walk_up", 1/16, true);

        let ani = this.addAnim("fist_pump" ,"otakuball_fist_pump", 1/8, false);
        //side effect: this will be called if interrupted with playAnim()
        ani.onCompleteCustom = () => {this.setTexture("otakuball_1_2");};

        this.state = "idle"; //"idle", "walking",
        this.node = null;
        this.arrived = true;
        this.moveTimer = 0;
    }

    //move to node instantly
    teleportToNode(node){
        this.state = "idle";
        this.playAnim("idle");
        this.setTexture(null);

        this.setVel(0, 0);

        this.node = node;
        this.arrived = true;

        this.setPos(...node.getPos());
    }

    //begin walking to a node
    travelToNode(node){
        if (node.letter == this.node.letter)
            return;

        //make sure it has arrived to his prev node first
        this.setPos(...this.node.getPos());

        this.state = "walking";
        this.playAnim("walk_up");
        this.setTexture(null);

        let p0 = new Vector(...this.node.getPos());
        let p1  = new Vector(...node.getPos());
        let dp = p1.sub(p0);
        let dist = dp.len();
        let vel = dp.normalized().scale(Otakuball.speed);

        this.setVel(vel.x, vel.y);
        this.moveTimer = dist / Otakuball.speed;

        this.node = node;
        this.arrived = false;
    }

    //performed before starting a level
    fistPump(){
        this.teleportToNode(this.node);
        this.setTexture(null);
        this.playAnim("fist_pump");
    }

    update(delta){
        if (this.state == "walking"){
            this.moveTimer -= delta;
            if (this.moveTimer <= 0){
                this.teleportToNode(this.node); //make sure he is aligned
            }
        }
        super.update(delta);
    }
}

//Displays campaign progress, and play/exit buttons
class CampaignPanel extends Base{
    constructor(parentState, x, y, w, h){
        super(x, y, w, h, "RoundA1");
        this.parentState = parentState;

        this.preview = new LSS_LevelPreview(this, "minimal");
        let pw = this.preview.width;
        this.preview.position.set((w-pw)/2, 40);
        this.addChild(this.preview);

        let zoneHeader = printText("Zone    Progress", "arcade", 0x000000, 1, 14, 320);
        this.addChild(zoneHeader);

        this.zoneText = printText("A", "arcade", 0x000000, 1, 34, 340);
        this.addChild(this.zoneText);

        this.progressText = printText("0/0", "arcade", 0x000000, 1, 160, 340);
        this.addChild(this.progressText);

        let scoreHeader = printText("Score", "arcade", 0x000000, 1, 14, 364);
        this.addChild(scoreHeader);
        this.scoreDisplay = new ScoreDisplay(30, 386, true);
        this.addChild(this.scoreDisplay);

        let livesHeader = printText("Lives", "arcade", 0x000000, 1, 14, 420);
        this.addChild(livesHeader);
        this.livesDisplay = new LivesDisplay(30, 444, 0x000000);
        this.addChild(this.livesDisplay);

        let pad = 15;
        let bh = 50;
        //play button
        this.playButton = new Button(pad, h-pad-bh, w/2 - pad*3/2, bh, "light");
        this.playButton.hoverGuard = false;
        this.playButton.addCentered(printText("Play", "arcade", 0x000000, 1.5));
        this.playButton.onClick = () => {this.parentState.onPlay();};
        this.addChild(this.playButton);
        //back button
        this.backButton = new Button(w/2 + pad/2, h-pad-bh, w/2 - pad*3/2, bh, "light");
        this.backButton.hoverGuard = false;
        this.backButton.addCentered(printText("Back", "arcade", 0x000000, 1.5));
        this.backButton.onClick = () => {game.pop();};
        this.addChild(this.backButton);
    }

    load(){
        let state = this.parentState.state;

        let data = campaign_save.data;
        this.zoneText.text = data.current_zone;
        this.progressText.text = `${data.zone_index}/${data.zone_length}`;
        this.scoreDisplay.setScore(data.score);
        this.livesDisplay.setLives(data.lives);
        this.playButton.setDisabled(false);
        this.backButton.setDisabled(false);

        if (state == "ready"){
            let playlist = campaign_save.playlist;
            let index = Math.min(data.zone_index);
            let [name, level] = playlist[1][index];
            this.preview.setLevel(name, level);

            let [zone, round] = name.split("/");
            this.title.text = "Round" + zone[4] + round[5] + round[6];
        }
        else if (state == "select"){
            this.preview.clear();
            this.title.text = `Zone ${data.current_zone} Complete`;
            this.playButton.setDisabled(true);
        }
        else if (state == "victory"){
            this.preview.clear();
            this.title.text = "Congratulations";
            this.playButton.setDisabled(true);
        }
    }
}

class CampaignSave{
    constructor(){
        //will be set to [name, Array[level_object]]
        this.initializing = true;
        this.playlist = null;
        this.reset();
        this.load(localStorage.getItem("campaign"));
        this.initializing = false;
    }

    //set progress to Zone A
    reset(){
        //This will be converted to a JSON object
        this.data = {
            //zones will be capital letters only
            current_zone: null,
            zone_index: 0, //the current level
            zone_length: 0, //how many levels in the zone
            completed_zones: [], //previous completed zones
            score: 0,
            lives: 3,
            gameovers: 0,
            //extra stats (not implemented yet)
            // bricks_destroyed: 0,
            // enemies_killed: 0,
            // powerups_collected: 0,
        };

        this.updateZone("A");
    }

    load(str){
        if (str === null)
            return;
        let obj = JSON.parse(str);
        Object.assign(this.data, obj);

        this.playlist = playlists.default.get("Zone"+this.data.current_zone);
    }

    /*
        Update Rules:
            Zone: updated when player selects campaign
            Level: updated when player has won in PlayState
            Score: updated when player has won in PlayState
            Lives: updated when player has died
                1-UP: will also be recorded but saving will still be on death

        When to Save: When player wins, dies, or selects the next zone
    */

    //change current_zone and set zone_index to the first level
    updateZone(letter){
        let data = this.data;

        data.current_zone = letter;

        data.zone_index = 0;
        let playlist = playlists.default.get("Zone"+letter);
        data.zone_length = playlist[1].length;

        this.playlist = playlist;

        this.save();
    }

    //skip=0: go to next level
    //skip=1: skip 1 level (Warp Powerup)
    //skip=2: beat the rest of the zone (cheats)
    //will return the next level or null if there are no more levels in the zone
    updateLevel(skip=0){
        let data = this.data;

        if (skip == 2)
            data.zone_index = data.zone_length;
        else
            data.zone_index = Math.min(data.zone_index + skip + 1, data.zone_length);

        if (this.isZoneComplete() && !data.completed_zones.includes(data.current_zone))
            data.completed_zones.push(data.current_zone);

        this.save();
    }

    //returns null if zone has been completed
    getNextLevel(){
        if (this.isZoneComplete())
            return null;
        
        let data = this.data;
        return this.playlist[1][data.zone_index][1];
    }

    isZoneComplete(){
        return this.data.zone_index == this.data.zone_length;
    }

    //update lives, score
    onDeath(playstate){
        let data = this.data;
        data.lives = playstate.lives;
        data.score = playstate.score;

        //rollback to 1st or 5th level if gameover
        if (data.lives < 0){
            data.zone_index = data.zone_index >= 4 ? 4 : 0;
            data.score = 0;
            data.lives = 3;
            data.gameovers++;
        }

        this.save();
    }

    //check updateLevel for skip values
    //update level, lives, score
    onVictory(playstate, skip=0){
        let data = this.data;
        data.lives = playstate.lives;
        data.score = playstate.score;
        this.updateLevel(skip);
    }

    //save to localStorage
    save(){
        if (this.initializing)
            return;
        let str = JSON.stringify(this.data);
        localStorage.setItem("campaign", str);
        // console.log("Saving: " + str);
    }
}