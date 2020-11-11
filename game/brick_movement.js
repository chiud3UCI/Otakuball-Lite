//NOTE: Do not move the bricks w/ movement patches
//      outside of this function

function manageBrickMovement(delta){
	//define some helper functions here
	function compare_x(a, b){
		return (a.x > b.x) ? 1 : -1;
	}

	function compare_y(a, b){
		return (a.y > b.y) ? 1 : -1;
	}

	function deltaEqual(a, b, epsilon=0.001){
		return (Math.abs(a-b) < epsilon);
	}

	//Step 1: Sort all the bricks based on row or column
	let bricks = game.get("bricks");
	let rows = [];
	let cols = [];
	for (let i = 0; i < 32; i++)
		rows.push([]);
	for (let i = 0; i < 13; i++)
		cols.push([]);

	for (let br of bricks){
		let mv = br.patch.move;
		//br.gridDat is set in brickGrid.refresh()
		let gridDat = br.gridDat;

		//by keeping all the properties in dat constant,
		//all the bricks will bounce at the same time (cascade);
		let dat = {
			br: br,
			vx: mv ? mv.vx : 0, 
			vy: mv ? mv.vy : 0,
			x: br.x,
			y: br.y,
			bounce_x(){
				this.br.patch.move.vx *= -1;
			},
			bounce_y(){
				this.br.patch.move.vy *= -1;
			},
			move_x(x){
				let br = this.br;
				br.moveTo(x, br.y);
			},
			move_y(y){
				let br = this.br;
				br.moveTo(br.x, y);
			}
		};

		//remember that gridDat.move is also true if
		//the brick is moving on its own (no movement patch)
		if (!gridDat.move){
			let [i, j] = getGridPos(br.x, br.y);
			rows[i].push(dat);
			cols[j].push(dat);
		}
		else{
			let [i0, j0, i1, j1] = gridDat.range;
			for (let i = i0; i <= i1; i++)
				rows[i].push(dat);
			for (let j = j0; j <= j1; j++)
				cols[j].push(dat);
		}
	}

	//Step 2: For each row of bricks, resolve the movement
	//	and collision of horizontal moving bricks.
	//It is important to not move the bricks if there is
	//	a collision in order to make them look static
	//	when it is stuck between static bricks.
	for (let row of rows){
		//sort row first by horizontal position
		row.sort(compare_x);
		let len = row.length;
		//left to right sweep for left-moving bricks
		for (let i = 0; i < len; i++){
			if (row[i].vx < 0){
				if (i == 0){
					let dat = row[i];
					let {vx,vy,x,y} = dat;
					let new_x = x + vx * delta;
					if (new_x <= DIM.lwallx + 16){
						dat.bounce_x();
						dat.cascade_right = true;
					}
					else{
						dat.move_x(new_x);
					}
					continue;
				}
				let dat0 = row[i-1];
				let dat1 = row[i];
				let {vx:vx0, vy:vy0, x:x0, y:y0} = dat0;
				let {vx:vx1, vy:vy1, x:x1, y:y1} = dat1;
				let new_x = x1 + vx1 * delta;

				let collide = (new_x - x0 <= 32);
				let near = (new_x - x0 <= 34);
				let same = (deltaEqual(vx0, vx1));

				if (same){
					if (near && dat0.cascade_right){
						dat1.bounce_x();
						dat1.cascade_right = true;
						continue;
					}
				}
				else if (collide){
					dat1.bounce_x();
					dat1.cascade_right = true;
					continue;
				}
				dat1.move_x(new_x);
			}
		}

		//right to left sweep for right-moving bricks
		//bricks that have been bounced in the previous sweep
		//	won't be detected here due to dat.vx staying constant
		for (let i = len-1; i >= 0; i--){
			if (row[i].vx > 0){
				if (i == len-1){
					let dat = row[i];
					let {vx,vy,x,y} = dat;
					let new_x = x + vx * delta;
					if (new_x >= DIM.rwallx - 16){
						dat.bounce_x();
						dat.cascade_left = true;
					}
					else{
						dat.move_x(new_x);
					}
					continue;
				}
				let dat0 = row[i+1];
				let dat1 = row[i];
				let {vx:vx0, vy:vy0, x:x0, y:y0} = dat0;
				let {vx:vx1, vy:vy1, x:x1, y:y1} = dat1;
				let new_x = x1 + vx1 * delta;

				let collide = (x0 - new_x <= 32);
				let near = (x0 - new_x <= 34);
				let same = (deltaEqual(vx0, vx1));

				if (same){
					if (near && dat0.cascade_left){
						dat1.bounce_x();
						dat1.cascade_left = true;
						// console.log("cascade left " + x1);
						continue;
					}
				}
				else if (collide){
					dat1.bounce_x();
					dat1.cascade_left = true;
					continue;
				}
				dat1.move_x(new_x);
			}
		}
	}

	//Step 2: Vertical Moving Bricks!
	for (let col of cols){
		//sort col first by vertical position
		col.sort(compare_y);
		let len = col.length;
		//up to down sweep for up-moving bricks
		for (let j = 0; j < len; j++){
			if (col[j].vy < 0){
				if (j == 0){
					let dat = col[j];
					let {vx,vy,x,y} = dat;
					let new_y = y + vy * delta;
					if (new_y <= DIM.ceiling + 8){
						dat.bounce_y();
						dat.cascade_down = true;
					}
					else{
						dat.move_y(new_y);
					}
					continue;
				}
				let dat0 = col[j-1];
				let dat1 = col[j];
				let {vx:vx0, vy:vy0, x:x0, y:y0} = dat0;
				let {vx:vx1, vy:vy1, x:x1, y:y1} = dat1;
				let new_y = y1 + vy1 * delta;

				let collide = (new_y - y0 <= 16);
				let near = (new_y - y0 <= 18);
				let same = (deltaEqual(vy0, vy1));

				if (same){
					if (near && dat0.cascade_down){
						dat1.bounce_y();
						dat1.cascade_down = true;
						continue;
					}
				}
				else if (collide){
					dat1.bounce_y();
					dat1.cascade_down = true;
					continue;
				}
				dat1.move_y(new_y);
			}
		}

		//down to up sweep for down-moving bricks
		for (let j = len-1; j >= 0; j--){
			if (col[j].vy > 0){
				if (j == len-1){
					let dat = col[j];
					let {vx,vy,x,y} = dat;
					let new_y = y + vy * delta;
					if (new_y >= DIM.h - 8){
						dat.bounce_y();
						dat.cascade_up = true;
					}
					else{
						dat.move_y(new_y);
					}
					continue;
				}
				let dat0 = col[j+1];
				let dat1 = col[j];
				let {vx:vx0, vy:vy0, x:x0, y:y0} = dat0;
				let {vx:vx1, vy:vy1, x:x1, y:y1} = dat1;
				let new_y = y1 + vy1 * delta;

				let collide = (y0 - new_y <= 16);
				let near = (y0 - new_y <= 18);
				let same = (deltaEqual(vy0, vy1));

				if (same){
					if (near && dat0.cascade_up){
						dat1.bounce_y();
						dat1.cascade_up = true;
						// console.log("cascade left " + x1);
						continue;
					}
				}
				else if (collide){
					dat1.bounce_y();
					dat1.cascade_up = true;
					continue;
				}
				dat1.move_y(new_y);
			}
		}
	}
}