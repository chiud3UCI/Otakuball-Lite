//code is inspired by Matthias Ritcher's Hardoncollider for LOVE2D


class Vector{
	static rotate(x, y, rad){
		let cos = Math.cos(rad);
		let sin = Math.sin(rad);
		let x2 = x*cos - y*sin;
		let y2 = x*sin + y*cos;
		return [x2, y2];
	}

	static dist(x0, y0, x1=0, y1=0){
		let dx = x1-x0;
		let dy = y1-y0;
		return Math.sqrt(dx*dx + dy*dy);
	}

	static normalize(x, y){
		if (x == 0 && y == 0)
			return 0;
		let dist = Vector.dist(x, y);
		return [x/dist, y/dist];
	}

	static angleBetween(x0, y0, x1, y1){
		let d0 = Vector.dist(x0, y0);
		let d1 = Vector.dist(x1, y1);
		let dot = (x0*x1 + y0*y1);
		return Math.acos(dot / (d0*d1));
	}

	//returns 1 if vector1 is clockwise to vector0
	//and -1 otherwise
	//source:
	//	https://gamedev.stackexchange.com/questions/45412/
	static angleSign(x0, y0, x1, y1){
		return (y0*x1 > x0*y1) ? -1 : 1;
	}


	constructor(x=0, y=0){
		this.x = x;
		this.y = y;
	}

	set(x=null, y=null){
		if (x !== null)
			this.x = x;
		if (y !== null)
			this.y = y;
	}

	copy(){
		return new Vector(this.x, this.y);
	}

	len(){
		return Math.sqrt((this.x * this.x) + (this.y * this.y));
	}

	len2(){
		return (this.x * this.x) + (this.y * this.y);
	}

	//don't call it normal because that means perpendicular
	normalized(){
		let len = this.len();
		return new Vector(
			this.x / len, this.y / len);
	}

	perpendicular(){
		return new Vector(-this.y, this.x);
	}

	add(other){
		return new Vector(
			this.x + other.x, this.y + other.y);
	}

	sub(other){
		return new Vector(
			this.x - other.x, this.y - other.y);
	}

	scale(n){
		return new Vector(
			this.x * n, this.y * n);
	}

	dot(other){
		return (this.x * other.x) + (this.y * other.y);
	}

	rotate(rad){
		let x = this.x;
		let y = this.y;
		[x, y] = Vector.rotate(x, y, rad);
		return new Vector(x, y);
	}
}

class Polygon{
	//points is a 1d array in this format:
	//[x0,y0,x1,y1,x2,y2,...]
	//Please make sure the points are clockwise
	//and convex or else things will break
	constructor(points){
		this.vertices = [];
		let n = Math.floor(points.length / 2);
		for (let i = 0; i < n; i++){
			let vertex = new Vector(points[i*2], points[i*2+1]);
			this.vertices.push(vertex);
		}

		//center is based off the AABB of the polygon
		let v = this.getAABB();
		let [x0, y0, x1, y1] = v;
		let cx = (x0 + x1) / 2;
		let cy = (y0 + y1) / 2;
		this.center = new Vector(cx, cy);
	}

	//return a 1d array of points just like
	//the constructor argument
	getPoints(){
		let points = [];
		for (let v of this.vertices){
			points.push(v.x);
			points.push(v.y);
		}
		return points;
	}

	//get the upper left and bottom right corners
	//of the Axis Aligned Bounding Box
	getAABB(){
		let min_x = Infinity;
		let min_y = Infinity;
		let max_x = -Infinity;
		let max_y = -Infinity;
		for (let v of this.vertices){
			min_x = Math.min(min_x, v.x);
			min_y = Math.min(min_y, v.y);
			max_x = Math.max(max_x, v.x);
			max_y = Math.max(max_y, v.y);
		}
		return [min_x, min_y, max_x, max_y];
	}

	translate(dx, dy){
		for (let v of this.vertices){
			v.x += dx;
			v.y += dy;
		}
		let c = this.center;
		c.x += dx;
		c.y += dy;
	}

	moveTo(x, y){
		let c = this.center;
		let dx = x - c.x;
		let dy = y - c.y;
		this.translate(dx, dy);
	}
}

class PolygonShape{
	constructor(points){
		this.polygon = new Polygon(points);
		this.shapeType = "polygon";
	}

	getAABB(){
		return this.polygon.getAABB();
	}

	translate(dx, dy){
		this.polygon.translate(dx, dy);
	}

	moveTo(x, y){
		this.polygon.moveTo(x, y);
	}

	collide(other){
		if (other.shapeType == "circle"){
			let arr = SAT.collideCircle(other, this);
			//invert the normal vector
			if (arr[0]){
				arr[1].x *= -1;
				arr[1].y *= -1;
			}
			return arr;
		}
		return SAT.collide(this, other);
	}
}

class CircleShape{
	constructor(x, y, r){
		this.center = new Vector(x, y);
		this.radius = r;
		this.shapeType = "circle";
	}

	getAABB(){
		let c = this.center;
		// let r = this.radius / 2; //don't divide by 2 idiot
		let r = this.radius;

		return [c.x-r, c.y-r, c.x+r, c.y+r];
	}

	translate(dx, dy){
		let c = this.center;
		c.x += dx;
		c.y += dy;
	}

	moveTo(x, y){
		let c = this.center;
		c.x = x;
		c.y = y;
	}

	collide(other){
		if (other.shapeType == "circle"){
			let r1 = this.radius;
			let r2 = other.radius;
			let vec = this.center.sub(other.center);
			let dist = vec.len();
			let diff = r1 + r2 - dist;
			if (diff <= 0)
				return [false, null, null];
			return [true, vec.scale(1/dist), diff];
		}
		return SAT.collideCircle(this, other);
	}
}

//The Separating Axis Theorem allows for balls to accurately
//bounce off of any polygon shape
var SAT = {
	//determines how much the two shapes must
	//overlap before registering a collision
	epsilon: 0.01,
	//determines the overlap between two projections
	//each projection "vector" contains the min dot product and max dot product
	overlap(v1, v2){
		if (v2.y > v1.x)
			return v1.y - v2.x;
		else
			return v2.y - v1.x;
	},

	//determines whether or not a given point is left(-1), right(1), or in the middle(0) of
	//a given line segment
	getVornoiRegion(point, p1, p2){
		let vec = point.sub(p1);
		let base = p2.sub(p1);
		let dot = vec.dot(base);
		if (dot < 0) 
			return -1;
		if (dot > base.len2())
			return 1;
		return 0;
	},

	//determines whether or not a given point is to the left of a line
	isLeft(point, p1, p2){
		return (p2.x-p1.x)*(point.y-p1.y)-(p2.y-p1.y)*(point.x-p1.x) >= 0;
	},

	//for a convex polygon, return a vector containing the min and max dot products
	//NOTE: In order to be accurate, the axis must be normalized
	getProjection(points, axis){
		let min_dot = points[0].dot(axis);
		let max_dot = min_dot;
		for (let v of points){
			let dot = v.dot(axis);
			if (dot < min_dot)
				min_dot = dot;
			if (dot > max_dot)
				max_dot = dot;
		}
		return new Vector(min_dot, max_dot);
	},

	//get the projection of the circle onto an axis
	getProjectionCircle(center, radius, axis){
		let dot = center.dot(axis);
		return new Vector(dot - radius, dot + radius);
	},

	//used for collision between two polygons
	//return a list of all normal vectors for each edge in each polygon
	getAxes(points1, points2){
		let axes = [];
		let p1, p2, edge, norm;

		let len = points1.length;
		for (let i = 0; i < len; i++){
			let p1 = points1[i];
			let p2 = points1[(i+1)%len];
			edge = p1.sub(p2);
			norm = edge.normalized().perpendicular();
			axes.push(norm);
		}
		
		len = points2.length;
		for (let i = 0; i < len; i++){
			let p1 = points2[i];
			let p2 = points2[(i+1)%len];
			edge = p1.sub(p2);
			norm = edge.normalized().perpendicular();
			axes.push(norm);
		}

		return axes;
	},

	//used for collision between circle and polygon
	//returns the vornoi region the center is located in
	//as well as a list of axes for each vornoi region
	getAxesCircle(points, center){
		let axes = [];
		let region = -1;
		let len = points.length;
		for (let i = 0; i < len; i++){
			//the indices should wrap around
			let i1 = (i-1+len)%len;
			let i2 = i;
			let i3 = (i+1)%len;
			let p1 = points[i1];
			let p2 = points[i2];
			let p3 = points[i3];
			
			let vr = SAT.getVornoiRegion(center, p2, p3);
			if (vr == -1){
				//point is to the left of segment(p2, p3)
				if (SAT.getVornoiRegion(center, p1, p2) == 1){
					//point is in a corner region
					region = i*2;
				}
			}
			else if (vr == 0){
				//point is in the middle of segment(p2, p3)
				if (!SAT.isLeft(center, p2, p3)){
					//point is on the right side of segment(p2, p3)
					region = i*2+1;
				}
			}

			//corner axis
			let edge = center.sub(p2);
			let norm = edge.normalized();
			axes.push(norm);

			//edge axis
			edge = p2.sub(p3);
			norm = edge.perpendicular().normalized();
			axes.push(norm);
		}
		return [region, axes];
	},

	collide(shape1, shape2){
		let points1 = shape1.polygon.vertices;
		let points2 = shape2.polygon.vertices;

		let axes = SAT.getAxes(points1, points2);
		let storedOverlap = Infinity;
		let tempOverlap;
		let norm;

		for (let i = 0; i < axes.length; i++){
			let axis = axes[i];
			let p1 = SAT.getProjection(points1, axis);
			let p2 = SAT.getProjection(points2, axis);
			tempOverlap = SAT.overlap(p1, p2);
			if (tempOverlap < 0)
				return [false, null, null];
			if (tempOverlap < storedOverlap){
				storedOverlap = tempOverlap;
				norm = axis;
			}
		}

		return [true, norm.scale(-1), storedOverlap];
	},

	collideCircle(circle, shape){
		let storedOverlap = Infinity;
		let tempOverlap;
		let norm;
		let mag;
		let points = shape.polygon.vertices;
		let center = circle.center;
		let radius = circle.radius;

		let [region, axes] = SAT.getAxesCircle(points, center);

		//for debugging purposes
		SAT.last_vr = region;

		if (region == -1){
			//the center of the circle is inside the polygon
			//which means it is definitely colliding with the polygon
			for (let i = 0; i < axes.length; i++){
				let axis = axes[i];
				//check only the edge axes
				if (i % 2 == 1){
					tempOverlap = SAT.overlap(
						SAT.getProjection(points, axis),
						SAT.getProjectionCircle(center, radius, axis)
					);
					if (tempOverlap < storedOverlap){
						storedOverlap = tempOverlap;
						norm = axis;
					}
				}
			}
			return [true, norm, storedOverlap];
		}
		else{
			//the center of the circle is outside of the polygon
			norm = axes[region];
			tempOverlap = SAT.overlap(
				SAT.getProjection(points, norm),
				SAT.getProjectionCircle(center, radius, norm)
			);
			if (tempOverlap < 0)
				return [false, null, null];
			return [true, norm, tempOverlap];
		}
	},

}