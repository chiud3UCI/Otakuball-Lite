//create a data structure that allows for efficient access of brick
//data via ids

var brickData = {
	//contains all brick data
	lookup: [],
	//contains same brick data but divided
	//into named groups
	group: {},

	init(){
		//All textures for the brick buttons are assumed
		//to come from the same texture "brick_main"

		let normal = [];

		//format: [i, j, class name, [args]]
		//the i, j will be appended to "brick_main_"

		for (let j = 0; j < 20; j++){
			for (let i = 0; i < 6; i++){
				normal.push([i, j, "NormalBrick", [i, j]]);
			}
		}
		for (let i = 0; i < 3; i++)
			normal.push([i, 20, "NormalBrick", [i, 20]]);

		let other = [
			[6, 1, "MetalBrick", [1]],
			[6, 2, "MetalBrick", [2]],
			[6, 3, "MetalBrick", [3]],
			[6, 4, "MetalBrick", [4]],
			[6, 5, "MetalBrick", [5]],
			[6, 6, "MetalBrick", [6]],
			[6, 0, "GoldBrick", [false]],
			[6, 7, "GoldBrick", [true]],
			[6, 10, "PlatinumBrick", []],
			[8, 12, "SpeedBrick", [false, true]],
			[8, 13, "SpeedBrick", [false, false]],
			[6, 8, "SpeedBrick", [true, true]],
			[6, 9, "SpeedBrick", [true, false]],
			[6, 11, "CopperBrick", []],
			[6, 12, "JumperBrick", []],
			[12, 7, "OneWayBrick", ["up"]],
			[12, 8, "OneWayBrick", ["down"]],
			[12, 9, "OneWayBrick", ["left"]],
			[12, 10, "OneWayBrick", ["right"]],
			[7, 3, "DetonatorBrick", ["normal"]],
			[7, 0, "FunkyBrick", [0]],
			[7, 1, "FunkyBrick", [1]],
			[7, 2, "FunkyBrick", [2]],
			[8, 16, "ShooterBrick", [0]],
			[8, 17, "ShooterBrick", [1]],
			[8, 18, "ShooterBrick", [2]],
			[7, 4, "GlassBrick", []],
			[7, 5, "AlienBrick", []],
		]

		let conveyor = [];
		let dirs = ["up", "down", "left", "right"];
		for (let i = 0; i < 4; i++){
			for (let j = 0; j < 3; j++){
				let arr = [i, 21+j, "ConveyorBrick"];
				arr.push([dirs[i], j]);
				conveyor.push(arr);
			}
		}


		let rawGroup = [
			["normal", normal],
			["other", other],
			["conveyor", conveyor],
		]

		let index = 0;
		for (let [name, arr] of rawGroup){
			let group = [];
			this.group[name] = group;
			for (let arr2 of arr){
				let [i, j, brickType, args] = arr2;
				let tex = "brick_main_" + i + "_" + j;
				//using "property value shorthand" technique
				let data = {
					tex, brickType, args, id: index
				}
				this.lookup.push(data);
				group.push(data);
				index++;
			}
		}
	}
};

brickData.init();

//slot order:
//	0: shield up,
//	1: shield down,
//	2: shield left,
//	3: shield right,
//  4: movement,
//  5: invisible,
//  6: anti-laser

var patchData = {
	textures: {},

	get(i, j){
		return this.textures[i+"_"+j];
	},
	init(){
		for (let i = 0; i < 4; i++){
			let key = `${i}_0`;
			let tex = `patch_0_${4+i}`;
			this.textures[key] = tex;
		}

		//there are alot of movement patches
		//but there is only one slot for them
		for (let n = 0; n < 24; n++){
			let i = Math.floor(n/3);
			let j = n % 3;
			let key = `4_${n}`;
			this.textures[key] = `patch_${i}_${j+1}`;
		}

		//invisible
		this.textures["5_0"] = "patch_0_0";
		//antilaser
		this.textures["6_0"] = "patch_1_0";
	}
}

patchData.init();



