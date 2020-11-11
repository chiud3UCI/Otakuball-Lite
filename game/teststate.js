//temporary
//for testing collision related stuff

class TestState{
	constructor(){
		this.mode = "DIAMOND";

		this.graphics = new PIXI.Graphics();
		game.addObject("etc", this.graphics);

		let points = [200,200, 400,200, 400,300, 200,300];
		this.brick = {
			shape: new PolygonShape(points),
			points: points
		};

		if (this.mode == "CIRCLE"){
			this.cursor = {
				shape: new CircleShape(100, 100, 60),
				update(){
					let mx = mouse.global.x;
					let my = mouse.global.y;
					this.shape.moveTo(mx, my);
				},
				draw(graphics){
					let c = this.shape;
					graphics.drawCircle(c.center.x, c.center.y, c.radius);
				}
			};

			this.text = new PIXI.Text("Testing", {fill: 0xFFFFFF});
			this.text.x = 100;
			this.text.y = 100;
			game.addObject("etc", this.text);
		}
		else{
			let points2 = [50,0, 100,50, 50,100, 0,50];
			this.cursor = {
				shape: new PolygonShape(points2),
				update(){
					let mx = mouse.global.x;
					let my = mouse.global.y;
					this.shape.moveTo(mx, my);
				},
				draw(graphics){
					let points = this.shape.polygon.getPoints();
					graphics.drawPolygon(new PIXI.Polygon(points));
				}
			}
		}
	}

	update(delta){
		this.cursor.update();

		let result = this.cursor.shape.collide(this.brick.shape);
		let [check, norm, mag] = result;

		this.graphics.clear();
		this.graphics.lineStyle(2, 0xFFFFFF);

		this.graphics.drawPolygon(new PIXI.Polygon(this.brick.points));

		this.graphics.lineStyle(2, (check) ? 0x00FF00 : 0xFFFFFF);

		this.cursor.draw(this.graphics);

		if (check){
			let c = this.cursor.shape.polygon.center;
			norm = norm.scale(mag);
			this.graphics.lineStyle(2, 0x00FFFF);
			this.graphics
				.moveTo(c.x, c.y)
				.lineTo(c.x + norm.x, c.y + norm.y);
		}

		if (this.mode == "CIRCLE"){
			this.text.text = "Vornoi Region: " + SAT.last_vr;
		}
	}
}