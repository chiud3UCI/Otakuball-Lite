var tooltips = {};

tooltips.brick = {
    NormalBrick          : ["Normal Brick"            , "Has a chance to drop a Powerup when destroyed."],
    Rainbow              : ["Rainbow Normal Brick"    , "Not really a brick. When placed, it will transform into a random-colored Normal Brick. The color will change for each individual brick."],
    Rainbow2             : ["Rainbow Normal Brick"    , "Not really a brick. When placed, it will transform into a random-colored Normal Brick. The color will change for each group of bricks."],
    MetalBrick           : ["{0} Metal Brick"         , "Can withstand {1} hits before dying."],
    GoldBrick            : ["{0}Gold Brick"           , "{1}"],
    PlatinumBrick        : ["Platinum Brick"          , "A super indestructible brick that is immune to all damage except for the Giga Ball."],
    CopperBrick          : ["Copper Brick"            , "A Gold-strength brick that causes the ball to bounce at an unpredictable angle when hit."],
    OneWayBrick          : ["One Way Panel"           , "A panel that forces the ball to travel in one direction."],
    SpeedBrick           : ["{0}Speed Brick"          , "A {1} brick that alters the speed of the ball when hit."],
    FunkyBrick           : ["{0} Funky Brick"         , "A brick that takes {1} hits to die and regenerates back to full strength in {2} seconds."],
    GlassBrick           : ["Glass Brick"             , "An especially weak brick that even normal balls can pierce through."],
    DetonatorBrick       : ["{0}Detonator Brick"      , "{1}}"],
    ShooterBrick         : ["{0} Shooter Brick"       , "A Platinum-strength brick that shoots a laser upwards when hit. {1}"],
    AlienBrick           : ["Alien Brick"             , "Wanders around the board spawning Normal Bricks in its path. Takes 5 hits to destroy."],
    ShoveBrick           : ["Shove Brick"             , "Shoves Normal-strength bricks to the left or right. Bricks that are pushed into Gold-strength bricks or the wall will die."],
    FactoryBrick         : ["Factory Brick"           , "When hit by a ball, it will eject a Normal Brick from the opposite side it was hit. Dies in 7 hits"],
    CometBrick           : ["Comet Brick"             , "When destroyed, it fires one or two comets that can pierce through bricks. This variant fires {0}."],
    OnixBrick            : ["Onix Brick"              , "A Gold-strength slanted brick that can deflect balls at an angle."],
    TikiBrick            : ["Tiki Brick"              , "A Gold-stength brick. Every 3 hits, it will get mad and shrink the paddle."],
    LaserEyeBrick        : ["Laser Eye Brick"         , "Dies in 2 hits. After getting hit once, it will shoot lasers that will stun the paddle."],
    BoulderBrick         : ["Boulder Brick"           , "Dies in 2 hits. When destroyed, it will drop boulders that will stun the paddle."],
    TwinLauncherBrick    : ["Twin Launcher Brick"     , "Hitting it will switch the brick on or off. When two bricks on the board are activated, they will either attract or repel based on their colors."],
    TriggerDetonatorBrick: ["Trigger Detonator Brick" , "Hitting it will switch the brick on or off. It will only explode when two of them are activated."],
    JumperBrick          : ["Jumper Brick"            , "Hitting it will cause it to teleport to a random spot on the board. Can teleport three times before giving up."],
    RainbowBrick         : ["Rainbow Brick"           , "Releases a bunch of Normal Bricks into adjacent spaces when destroyed."],
    SlotMachineBrick     : ["Slot Machine Brick"      , "Cycles through its Powerups when hit. Will disappear and drop the Powerup when all bricks of the same color match. DOUBLE CLICK TO SELECT POWERUP"],
    ParachuteBrick       : ["Parachute Brick"         , "When destroyed by a ball, it supplies the ball with a parachute that allows it to gently descend onto the paddle."],
    ShoveDetonatorBrick  : ["Shove Detonator Brick"   , "Shoves all adjacent bricks outwards when destroyed."],
    ForbiddenBrick       : ["Forbidden Brick"         , "Invisible and intagible, but can be placed to prevent other bricks from moving or spawning into a space."],
    SwitchBrick          : ["Switch Brick"            , "An indestructible brick that will flip the states of Flip Bricks of the same color."],
    TriggerBrick         : ["Trigger Brick"           , "Functions the same as the Switch Brick, but dies after one hit."],
    FlipBrick            : ["Flip Brick"              , "A Normal-strength brick that switches between tangible and intangible when flipped. This variant starts out in {0} state."],
    StrongFlipBrick      : ["Strong Flip Brick"       , "An indestructible Flip Brick. This variant starts out in {0} state."],
    SequenceBrick        : ["Sequence Brick"          , "A brick that can't be destroyed until all other lower numbered Sequence Bricks are gone."],
    PowerupBrick         : ["Powerup Brick"           , "A brick that contains a garunteed powerup. DOUBLE CLICK TO SELECT POWERUP."],
    GateBrick            : ["{0}Gate Brick"           , "{1}"],
    ConveyorBrick        : ["Conveyor Brick"          , "A panel that gradually steers the ball in a certain direction. Comes in 3 different strengths."],
    LauncherBrick        : ["Launcher Brick"          , "Has an rotating arrow. When hit, the brick will launch itself in the arrow's direction. This variant rotates {0} and starts facing {1}."],
    SplitBrick           : ["Split Brick"             , "Splits into two lesser bricks when hit."],
    GhostBrick           : ["Ghost Brick"             , "An invisible Platinum-strength brick."],
    FuseBrick            : ["Fuse Brick"              , "When killed, it will destroy adjacent Fuse Bricks or explosive bricks."],
    ResetBrick           : ["Reset Brick"             , "Similar to a Trigger Brick but it will turn on all destructible bricks and turn off all indestructible bricks of the same color."],
    SlimeBrick           : ["Slime Brick"             , "Will replicate and spread to adjacent spaces. Upon touching a compatible brick it will assimilate into that brick."],
    ScatterBombBrick     : ["Scatter Bomb Brick"      , "When hit, it will destroy bricks in a 3x3 area and fill the area with blue bricks."],
    LaserGateBrick       : ["Laser Gate Brick"        , "Creates a laser that can deflect balls.{0} Use the Link Lasers Tool to create the lasers."],

};

tooltips.brickFormat = {
    MetalBrick: [
        ["Bronze", "2"],
        ["Silver", "3"],
        ["Blue", "4"],
        ["Pink", "5"],
        ["Purple", "6"],
        ["Green", "7"]
    ],
    GoldBrick:[
        ["", "An indestructible brick that only be damaged by certain powerups or bricks."],
        ["Plated ", "A Gold Brick with a metal plate that must be destroyed for level completion."]
    ],
    SpeedBrick:[
        ["", "standard"],
        ["Gold ", "Gold-strength"]
    ],
    FunkyBrick:[
        ["Blue", "2", "4"],
        ["Green", "3", "4"],
        ["Red", "4", "4"],
    ],
    DetonatorBrick:[
        ["", "Creates an explosion on death, destroying bricks in a 3x3 area."],
        ["Neo ", "Same as a Detonator Brick, but creates a larger 5x5 explosion instead."],
        ["Freeze ", "Same as a Detonator Brick, but the explosion freezes nearby bricks."]
    ],
    ShooterBrick:[
        ["Red", "The red variant can destroy regular bricks."],
        ["Green", "The green laser can destroy multi-hit bricks in a single shot."],
        ["Blue", "The blue laser can destroy Gold-strength bricks in a single shot."],
    ],
    CometBrick:[
        ["a comet to the left"],
        ["a comet to the right"],
        ["one comet left and one comet right"],
        ["one comet up and one comet down"],
        ["a comet upwards"],
        ["a comet donwards"]
    ],
    FlipBrick:[
        ["an intangible"],
        ["a tangible"],
    ],
    //Strong Flip Brick will be a copy of FlipBrick's format
    GateBrick:[ //each entry will be repeated 3 more times
        ["", "Transport balls to another Gate Brick of the same color."],
        ["Exit ", "Balls can only exit through this brick. When placed, regular Gate Bricks will always send their balls to an Exit Gate Brick."],
    ],
    LauncherBrick:[
        ["clockwise", "right"],
        ["clockwise", "left"],
        ["counter-clockwise", "right"],
        ["counter-clockwise", "left"],
    ],
    LaserGateBrick:[
        [""],
        [" This variant starts with with the lasers turned off."]
    ],
};

//alters brick format tooltips by duplicating array elements
//Example: [a, b, c] + [0, 0, 0, 1, 2, 2] = [a, a, a, b, c, c]
let dup = function(name, indices){
    let oldArr = tooltips.brickFormat[name];
    let newArr = indices.map(index => oldArr[index]);
    tooltips.brickFormat[name] = newArr;
};

dup("SpeedBrick", [0, 0, 1, 1]);
dup("FlipBrick", [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
dup("GateBrick", [0, 0, 0, 0, 1, 1, 1, 1]);
dup("LaserGateBrick", [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);

tooltips.brickFormat.StrongFlipBrick = tooltips.brickFormat.FlipBrick;

//index = powerup id
tooltips.powerup = [
    ["Acid"               , "Turns the ball into an Acid Ball that can destroy indestructible bricks and pierce through Normal Bricks."],
	["AntiGravity"        , "Makes the ball curve upwards for a short duration."],
	["Assist"             , "Summons two turrets that automatically shoot bricks."],
	["Attract"            , "Makes the ball curve slightly towards nearby bricks."],
	["Autopilot"          , "Makes the paddle move on its own, accurately rebounding balls to the nearest brick."],
	["Ball Cannon"        , "Gives the paddle the ability to shoot a spread of bouncy balls."],
	["Barrier"            , "Creates a barrier at the bottom of the board that can rebound balls for 10 seconds."],
	["Blackout"           , "Prevents the player from seeing anything besides the paddle and balls."],
	["Beam"               , "Gives the paddle the ability to create a traction beam that can pull balls towards the center."],
	["Blossom"            , "Makes the ball scatter plasma pellets on command. After firing, the ball must recharge by hitting the paddle."],
	["Bomber"             , "Arms the ball with a powerful bomb that can destroy a 7x7 circle of bricks."],
	["Bulk"               , "Increases the strength of all Normal Bricks by one hit."],
	["Bypass"             , "Opens up an exit door at the bottom right of the board that allows the player to skip the current level."],
	["Cannon"             , "Transforms the next ball to hit the paddle into a Cannonball that can travel directly upwards, destroying all bricks in its path."],
	["Catch"              , "Enables the paddle to catch balls and release them on command."],
	["Change"             , "Inverts paddle controls."],
	["Chaos"              , "Detonates all explosive bricks."],
	["Column Bomber"      , "Arms the ball with a powerful bomb that can destroy an entire column of bricks."],
	["Combo"              , "Makes the ball automatically zoom towards the nearest brick after destroying a brick."],
	["Control"            , "Gives the paddle the ability to create a gravity well that can trap the ball in a single location for a few seconds."],
	["Disarm"             , "Converts Funky Bricks, Switch Bricks, and Generator Bricks into normal bricks."],
	["Disrupt"            , "Splits a ball into 8 balls."],
	["Domino"             , "Gives the ball the ability to drill through an unbroken row of bricks whenever it hits a brick."],
	["Drill Missile"      , "Gives the paddle the ability to fire a Drill Missile that can clear entire columns of bricks."],
	["Drop"               , "Causes a random selection of Normal Bricks to drop their powerups."],
	["EMP Ball"           , "Arms the ball with a bomb that can destroy a 3x3 square of bricks. Can be recharged by hitting the paddle."],
	["Energy"             , "Creates 3 energy balls that trails the ball. When the ball hits a brick, the energy balls are released. Can be recharged by hitting the paddle."],
	["Erratic Missile"    , "Gives the paddle the ability to shoot homing missiles."],
	["Extend"             , "Increases the size of the paddle."],
	["Fast"               , "Increases the speed of the ball."],
	["Freeze"             , "Freezes the paddle in place for 2 seconds."],
	["Fireball"           , "Turns the ball into a Fire Ball that can destroy a 3x3 square of bricks with every hit."],
	["Forcefield"         , "Creates a forcefield that's positioned slightly above the paddle. It will cause all returning balls to drop downwards at a reduced speed."],
	["Frenzy"             , "Splits a ball into 24 balls."],
	["Gelato"             , "Freezes a random row of bricks."],
	["Generator Ball"     , "Turns the ball into a Generator Ball that can generate a ball after killing a brick. The balls need to be activated by the paddle first."],
	["Ghost"              , "Makes the paddle more transparent whenever it stands still. The paddle won't be able to rebound balls if it's completely invisible."],
	["Giga"               , "Turns the ball into a Giga Ball that can destroy every brick, including Platinum Bricks."],
	["Glue"               , "Similar to Catch, but prevents the paddle from releasing balls until the end of its duration."],
	["Gravity"            , "Makes the ball curve downwards for a short duration."],
	["Hold Once"          , "Similar to Catch, but the paddle can only catch a ball once before turning back to normal."],
	["Hacker"             , "Gives the paddle the ability to hack certain bricks, triggering their special abilities."],
	["Halo"               , "Gives the ball the ability to become intangible whenever it hits the paddle and reform when it hits the top of the board."],
	["HaHa"               , "Scatters 15 random Normal Bricks across the board."],
	["Heaven"             , "Spawns a Heaven Paddle that floats above the paddle and can rebound balls."],
	["Ice Ball"           , "Turns the ball into an Ice Ball that can freeze bricks, turning them into ice bricks. Can freeze indestructibles too."],
	["Illusion"           , "Spawns two Illusion Paddles that slowly trail the paddle and can rebound balls."],
	["Indigestion"        , "Causes every Normal Brick to spawn another Normal Brick in each direction."],
	["Intelligent Shadow" , "Summons a Shadow Paddle that can automatically rebound balls."],
	["Invert"             , "Gives the paddle the ability to invert the vertical velocity of the ball every few seconds."],
	["Irritate"           , "Causes the ball to bounce off of surfaces at an unpredictable angle."],
	["Javelin"            , "Arms the paddle with an Energy Javelin that can clear an entire column of bricks."],
	["Junk"               , "Halves the amount of points gained."],
	["Jewel"              , "Doubles the amount of points gained."],
	["Joker"              , "When collected, it will instantly collect all other good powerups and destroy the bad ones."],
	["Kamikaze"           , "Makes the ball aggressively home in on nearby bricks."],
	["Knocker"            , "Gives the ball a sawblade that can piece through three bricks. It can be recharged by hitting the paddle."],
	["Laceration"         , "Destroys all enemies and prevents any more of them from spawning for the rest of the stage."],
	["Large Ball"         , "Increases the size of the ball, triples its damage, and allows for the ball to damage indestructible bricks."],
	["Laser"              , "Gives the paddle the ability to shoot red lasers that can destroy regular bricks."],
	["Laser Plus"         , "Gives the paddle the ability to shoot pink lasers that can destroy multi-hit bricks in one hit."],
	["Laser Ball"         , "Makes the ball periodically fire lasers from itself."],
	["Lock"               , "Stops all moving bricks."],
	["Luck"               , "Makes only good powerups spawn for the remainder of the stage."],
	["Magnet"             , "Makes the paddle attract good powerups towards it for the remainder of the stage."],
	["Mega"               , "Turns the ball into a Mega Ball that can pierce through indestructible bricks."],
	["Missile"            , "Gives the paddle the ability to shoot explosive missiles that can destroy indestructibles."],
	["Mobility"           , "Temporarily freezes all enemies in place for 20 seconds."],
	["Multiple"           , "Splits ALL balls on screen into three balls."],
	["Mystery"            , "Activates a random good powerup."],
	["Nano"               , "Spawn three fast-traveling Nano Balls that turn into Mega Balls if they touch the paddle."],
	["Nebula"             , "Spawns a large gravity well that slowly pulls in all balls towards the center."],
	["New Ball"           , "Spawns a new ball directly on the paddle."],
	["Node"               , "Splits a ball into 3 balls. Whenever there are less than 3 balls in play, one of them will split to recover the missing balls."],
	["Normal Ball"        , "Resets all effects on the ball."],
	["Normal Ship"        , "Resets all effects on the paddle."],
	["Nervous"            , "Makes the paddle shuffle sideways for a few seconds."],
	["Oldie"              , "Instantly destroy 90% of the Normal Bricks on collection."],
	["Open"               , "Opens a gap in the center of the board, shoving aside all bricks."],
	["Orbit"              , "Surrounds the paddle with a large bubble that can rebound balls."],
	["Particle"           , "Surrounds the ball with two particles that can bounce around and destroy bricks."],
	["Pause"              , "Gives the paddle the ability to drastically slow down the ball for a few seconds."],
	["Player"             , "Gives a new life."],
	["Probe"              , "Attaches a Probe to the ball that can be recalled back to the paddle, destroying all bricks in its path."],
	["Poison"             , "Makes the paddle unable to hit back balls for 4 seconds. Extremely dangerous."],
	["Protect"            , "Gives the paddle a shield that can protect it from hostile projectiles."],
	["Quake"              , "Shuffles the bricks slightly and shifts them down two rows."],
	["Quasar"             , "Summons a singularity that sucks in all bricks in the center of the screen."],
	["Quadruple"          , "Immediately launches four new balls from the paddle."],
	["Rapidfire"          , "Gives the paddle the ability to rapidly shoot out bullets that do half-damage to regular bricks."],
	["Restrict"           , "Decreases the size of the paddle."],
	["Regenerate"         , "Gives the paddle the ability to spawn a new ball every five seconds."],
	["Re-Serve"           , "Warps all active balls back to the paddle to be re-served again."],
	["Reset"              , "Resets the paddle and all balls back to normal."],
	["Risky Mystery"      , "Activates a random powerup, good or bad."],
	["Rocket"             , "Gives the paddle the one-time ability to launch in the air destroying all bricks it touches."],
	["Row Bomber"         , "Arms the ball with a powerful bomb that can destroy an entire row of bricks."],
	["Shrink"             , "Shrinks the size of the ball and make it deal only half as much damage."],
	["Shadow"             , "Turns the paddle black and almost invisible."],
	["Shotgun"            , "Gives the paddle the ability to shoot out a spread of 6 pellets that do half damage to bricks."],
	["Sight Laser"        , "Reveals the path of the ball in advance as well as its trajectory when it hits the paddle."],
	["Slow"               , "Decreases the speed of the ball."],
	["Snapper"            , "Turns the ball into a Snapper Ball that can lay Snapper Mines on bricks. The mined bricks have to be hit again in order for it to detonate."],
	["Slug"               , "Slows down all enemy projectiles for the rest of the stage."],
	["Terraform"          , "Transforms select specialty bricks into Normal Bricks."],
	["Time Warp"          , "Causes the flow of time to warp between slow and fast every few seconds."],
	["Trail"              , "Causes the ball spawn 5 bricks in its path."],
	["Tractor"            , "Creates a shield at the bottom of the board that can deflect a ball 3 times."],
	["Transform"          , "Gives the paddle the ability to transform specialty bricks into Normal Bricks."],
	["Triple"             , "Splits a ball into 3 balls."],
	["Twin"               , "Adds another paddle besides the paddle that mimics some functions of the the original paddle."],
	["Two"                , "Splits ALL balls on screen into 2 balls."],
	["Ultraviolet"        , "Destroys 10 random bricks on screen."],
	["Unification"        , "Transforms Normal Bricks into special Gemstone Bricks that provide 2.5 times the points of the original brick."],
	["Undead"             , "Creates a shield at the bottom of the board that can catch a single ball and warp it back to the paddle."],
	["Unlock"             , "Causes all bricks on screen to start moving sidways."],
	["Undestructible"     , "For four seconds, all bricks become indestructible."],
	["Vendetta"           , "Summons a drill that can destroy a random row of bricks."],
	["Vector"             , "Allows the paddle to move in all directions for 10 seconds."],
	["Venom"              , "Causes all explosive bricks to spread to the nearest space in all directions."],
	["Volt"               , "Turns the ball into a Volt Ball that is capable of shocking nearby bricks, dealing damage over time."],
	["Voodoo"             , "Turns the ball into a Voodoo ball that randomly damages two other bricks every time it hits a brick."],
	["Warp"               , "Opens up an exit door at the bottom right of the board that allows the player to skip two levels."],
	["Weak"               , "Makes the ball occasionally unable to damage bricks for 20 seconds."],
	["Weight"             , "Makes the paddle move slower."],
	["Wet Storm"          , "Causes rain projectiles to fall from the top of the board, destroying any brick it hit."],
	["Whisky"             , "Causes the ball to become drunk and swerve around."],
	["X-Bomb"             , "Arms the paddle with a X-Bomb that can be fired onto any space and destroy the row, column, and diagonals for that space."],
	["X-Ray"              , "Turns a random number of Normal Bricks into Powerup Bricks that are garunteed to drop a powerup."],
	["Yoyo"               , "Drastically speeds up the ball the farther it is from the paddle."],
	["Yoga"               , "Increases the sensitivity of the paddle, causing it to move farther than expected."],
	["Y-Return"           , "Causes the ball to home in on the paddle whenever it is traveling downwards."],
	["Buzzer"             , "Launches a giant sawblade that bounces around the board, destroying all bricks in its path, before exiting from the bottom of the screen."],
	["Zeal"               , "Drastically increases the speed of the ball."],
	["Zen Shove"          , "Causes all bricks to shift down by one row every time a ball hits the paddle."]
];

//redgreen, cyan, bronze, silver, pewter, dizzy, cubic, walkblock  
//TODO: add individual red and green menacer entries
tooltips.enemy = [
    ["Red and Green Menacer" , "Green Menacers turn bricks into indestructible green bricks. Red Menacers destroy those green bricks."],
    ["Red Menacer"           , "Destroys green bricks created by Green Menacers."],
    ["Green Menacer"         , "Transforms Normal and Metallic bricks into Green bricks."],
    ["Cyan Menacer"          , "Turns your paddle invisible."],
    ["Bronze Menacer"        , "Transforms Normal and Metallic bricks into Bronze bricks."],
    ["Silver Menacer"        , "Transforms Normal and Metallic bricks into Silver bricks."],
    ["Pewter Menacer"        , "Does nothing."],
    ["Dizzy"                 , "Traces along the bricks and then floats around once there is enough space."],
    ["Cubic"                 , "Traces along the bricks and then floats around once there is enough space."],
    ["Gumball Trio"          , "Splits into 3 balls when hit."],
    ["Walk Block"            , "Walks around until it exits through the bottom."]
];

tooltips.patch = {
    shield   : ["Shield Patch"        , "Makes the brick indestructible on one side. Can be stacked."],
    invisible: ["Invisible Patch"     , "Makes the brick invisible. It will reveal itself after being hit once."],
    movement : ["Mobile Patch"        , "Makes the brick move in one direction at a constant speed and bounce off of walls and other bricks."],
    movement2: ["Static Mobile Patch" , "Same as Mobile Patch, but will only activate once the brick gets hit."],
    antilaser: ["Anti-Laser Patch"    , "Makes the brick immune to lasers."],
    regen    : ["Regen Patch"         , "Gives the brick the ability to regenerate itself after dying. DO NOT PLACE THIS ON A FUNKY BRICK."]
};

tooltips.tool = {
    free     : ["Free Tool"           , "Freely place bricks at the cursor."],
    line     : ["Line Tool"           , "Place bricks in a line."],
    linerect : ["Rectangle Tool"      , "Place bricks in a rectangle outline."],
    fillrect : ["Fill Rectangle Tool" , "Place bricks in a filled rectangle."],
    fill     : ["Fill"                , "Replaces same adjacent bricks with another brick."],
    replace  : ["Replace"             , "Replaces all same bricks with another brick."],
    cut      : ["Cut"                 , "Copies a selection of bricks and removes them from the board."],
    copy     : ["Copy"                , "Copies a selection of bricks to be pasted later."],
    paste    : ["Paste"               , "Pastes a previously copied selection of bricks."],
    eyedrop  : ["Eyedropper"          , "Determines which brick button is used to place the selected brick."],
    linklaser: ["Link Laser Tool"     , "Links two Laser Gate Bricks together by creating a laser."]
};

tooltips.menu = {
    background: ["Background Select Menu" , "Choose the background color and pattern."],
    powerup   : ["Powerup Chances Menu"   , "Edit the drop rates of each powerup for this level."],
    enemy     : ["Enemy Spawn Menu"       , "Select which enemies will spawn for this level as well as their spawning frequency."],
    bricktab  : ["Brick Tab"              , "Also known as Blocks."],
    bricktab2 : ["Block Tab"              , "Also known as Bricks."],
    patchtab  : ["Patch Tab"              , "Patches can be placed on top of bricks to give them additional effects."],
};

//types of tooltips: brick, patch, powerup, tool, menu, enemy
class ToolTipDisplay extends PIXI.Container{
    constructor(parentState){
        super();
        this.parentState = parentState;
        //there are 3 layers
        //only the top non-null layer will be visible
        const numLayers = 3;
        this.layers = [];
        for (let i = 0; i < numLayers; i++){
            this.layers.push(null);
            this.addChild(new PIXI.Container());
        }
        this.updateAppearance();
    }

    //make sure only the top layer is visible
    updateAppearance(){
        //only PlayState will have scoreDisplay
        let score = this.parentState.scoreDisplay;

        for (let children of this.children){
            children.visible = false;
        }

        let allEmpty = true;
        let layers = this.layers;
        for (let i = layers.length-1; i >= 0; i--){
            let layer = layers[i];
            if (layer !== null){
                this.children[i].visible = true;
                allEmpty = false;
                break;
            }
        }

        if (score)
            score.visible = allEmpty;
    }

    set(layer, type, value, texture){
        this.layers[layer] = [type, value];
        let cont = this.children[layer];
        cont.removeChildren();

        let nameText = "TOOLTIP MISSING";
        let descText = "description"; //desc is description

        let iconPos = {x: 0, y: 16};
        let namePos = {x: 42, y: 2};
        let descPos = {x: 0, y: 34};

        if (type == "brick" || type == "powerup")
            descPos.y -= 6;

        //brick tooltips are special due to having format strings
        if (type == "brick"){
            let brickType = brickData.lookup.get(value).brickType;
            let arr = tooltips.brick[brickType];
            if (arr){
                [nameText, descText] = arr;
                let format = tooltips.brickFormat[brickType];
                if (format){
                    let index = brickData.tooltip.get(value);
                    let args = format[index];
                    nameText = stringFormat(nameText, ...args);
                    descText = stringFormat(descText, ...args);
                }
            }
        }
        else{
            let arr = tooltips[type][value];
            if (arr)
                [nameText, descText] = arr;
        }

        let icon = new PIXI.Sprite(texture);
        icon.scale.set(2);
        icon.anchor.set(0, 0.5);
        icon.position.set(iconPos.x, iconPos.y);
        cont.addChild(icon);
        
        let name = printText(nameText, "windows", 0x000000, 2, namePos.x, namePos.y);
        let desc = printText(descText, "windows", 0x000000, 1, descPos.x, descPos.y);
        desc.maxWidth = DIM.boardw;
        cont.addChild(name, desc);

        this.updateAppearance();
    }

    //returns true if type and value match with the layer array
    check(layer, type, value){
        let arr = this.layers[layer];
        if (arr === null)
            return false;
        return arr[0] == type && arr[1] == value;
    }

    clear(layer){
        this.layers[layer] = null;
        this.updateAppearance();
    }

    //clear only if the layer matches
    checkAndClear(layer, type, value){
        if (this.check(layer, type, value))
            this.clear(layer);
    }
}