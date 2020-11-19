//temporary
//for testing collision related stuff

class TestState{
	constructor(){
		this.stage = new PIXI.Container();
		this.mode = "CIRCLE";

		this.graphics = new PIXI.Graphics();
		this.stage.addChild(this.graphics);

		let points = [200,200, 232,200, 232,216, 200,216];
		this.brick = {
			shape: new PolygonShape(points),
			points: points
		};

		if (this.mode == "CIRCLE"){
			this.cursor = {
				shape: new CircleShape(100, 100, 7),
				update(){
					let mx = mouse.x;
					let my = mouse.y - 100;
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
			this.stage.addChild(this.text);
		}
		else{
			let points2 = [50,0, 100,50, 50,100, 0,50];
			this.cursor = {
				shape: new PolygonShape(points2),
				update(){
					let mx = mouse.x;
					let my = mouse.y;
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
		this.graphics.lineStyle(1, 0xFFFFFF);

		this.graphics.drawPolygon(new PIXI.Polygon(this.brick.points));

		this.graphics.lineStyle(1, (check) ? 0x00FF00 : 0xFFFFFF);

		this.cursor.draw(this.graphics);

		if (check){
			let c;
			if (this.mode == "CIRCLE")
				c = this.cursor.shape.center;
			else
				c = this.cursor.shape.polygon.center;
			norm = norm.scale(mag);
			this.graphics.lineStyle(1, 0x00FFFF);
			this.graphics
				.moveTo(c.x, c.y)
				.lineTo(c.x + norm.x, c.y + norm.y);
		}

		if (this.mode == "CIRCLE"){
			let text = this.text;
			text.text = "Vornoi Region: " + SAT.last_vr;
			text.text += "\n Mag: " + mag;
		}
	}
}