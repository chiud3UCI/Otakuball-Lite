class Particle extends Sprite{
	constructor(texture, x, y, vx, vy, angle, sx, sy){
		super(texture, x, y, vx, vy, angle, sx, sy);

		this.timer = null;
		this.dieOnFade = false;
		this.dieOnAniFinish = false;
	}

	isDead(){
		if (this.dead)
			return true;
		if (this.timer !== null && this.timer <= 0)
			return true;
		if (this.dieOnFade && this.alpha <= 0)
			return true;
		if (this.dieOnAniFinish && !this.isAnimating)
			return true;
		return false;
	}

	setGrowth(rate, accel=0, delay=0){
		this.growth = {
			base: {
				sx: this.scale.x,
				sy: this.scale.y
			},
			value: 1,
			rate,
			accel,
			delay,
		};
	}

	updateGrowth(delta){
		let gr = this.growth;
		if (!gr)
			return;
		if (gr.delay > 0){
			gr.delay -= delta;
			return;
		}
		gr.value += (gr.rate*delta) + (0.5*gr.accel*delta*delta);
		gr.rate += (gr.accel*delta);
		this.scale.set(gr.base.sx * gr.value, gr.base.sy * gr.value);
	}

	setFade(rate, accel=0, delay=0, die=true){
		this.fade = {
			rate,
			accel,
			delay
		};
		this.dieOnFade = die;
	}

	updateFade(delta){
		let fd = this.fade;
		if (!fd)
			return;
		if (fd.delay > 0){
			fd.delay -= delta;
			return;
		}
		let da = (fd.rate*delta) + (0.5*fd.accel*delta*delta);
		fd.rate += (fd.accel*delta);
		this.alpha = Math.max(0, this.alpha - da);
	}

	update(delta){
		if (this.timer !== null)
			this.timer -= delta;

		this.updateFade(delta);
		this.updateGrowth(delta);

		super.update(delta);
	}
}