function barrage(ele) {
    this.root = ele;
}

var defalutConfig = {
    bulletHeight: 30,
    fireInterval: 200,
    v: 50,
    max: 50,
    isDebug: false
}

function log(isDebug, ...para) {
    if (isDebug) {
        console.info(para);
    }
}

function initTrack(config, tracks, height) {
    var trackAmount = parseInt(height / config.bulletHeight);
    for (var i = 0; i < trackAmount; i++) {
        tracks.push({
            id: i,
            top: i * config.bulletHeight,
            isBusy: false
        });
    }

    log(config.isDebug, `初始化弹道数量: ${trackAmount}`);
}

function createBullet(config, bulletInfo, trackInfo, rootWidth) {
    var bullet = document.createElement('div');
    bullet.innerText = bulletInfo.msg;
    bullet.style.position = 'absolute';
    bullet.style.left = `${rootWidth}px`;
    bullet.style.top = `${trackInfo.top}px`;
    bullet.id = bulletInfo.id;
    bullet.style.display = 'inline-block';
    bullet.style['white-space'] = 'nowrap';
    return bullet;
}

function mountBullet(ele, bullet) {
    ele.appendChild(bullet);
}

function loadBullet(config, domBullet, trackInfo, group, width, tweenPool) {
    tweenPool.set(domBullet.id, {
        domBullet: domBullet,
        trackInfo: trackInfo,
        width: width,
        steps: { left: 0 }
    });
    var step1 = createStep1(config, domBullet, trackInfo, group, width, tweenPool, tweenPool.get(domBullet.id).steps);
    step1.start();
    tweenPool.get(domBullet.id).step = step1;
}

function resumeBullet(config, domBullet, trackInfo, group, width, tweenPool, steps) {
    if (steps.left <= domBullet.offsetWidth) {
        var step1 = createStep1(config, domBullet, trackInfo, group, width, tweenPool, steps);
        step1.start();
        tweenPool.get(domBullet.id).step = step1;
    } else {
        var step2 = createStep2(config, domBullet, trackInfo, group, width, tweenPool, steps);
        step2.start();
        tweenPool.get(domBullet.id).step = step2;
    }
}

function createStep1(config, domBullet, trackInfo, group, width, tweenPool, steps) {
    var bulletWidth = domBullet.offsetWidth;
    var step1 = new TWEEN.Tween(steps, group)
        .to({ left: bulletWidth }, parseInt((bulletWidth - steps.left) / config.v * 1000))
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function () {
            $(domBullet).css('transform', `translateX(-${steps.left}px) translateZ(0px)`);
        })
        .onComplete(function () {
            log(config.isDebug, '弹道进入空闲状态');
            trackInfo.isBusy = false;
            var step2 = createStep2(config, domBullet, trackInfo, group, width, tweenPool, steps);
            step2.start();
            tweenPool.get(domBullet.id).step = step2;
        })
   return step1;
}

function createStep2(config, domBullet, trackInfo, group, width, tweenPool, steps) {
    var bulletWidth = domBullet.offsetWidth;
    var step2 = new TWEEN.Tween(steps, group)
        .to({ left: bulletWidth + width }, parseInt((bulletWidth + width - steps.left) / config.v * 1000))
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function () {
            $(domBullet).css('transform', `translateX(-${steps.left}px) translateZ(0px)`);
        })
        .onComplete(function () {
            log(config.isDebug, 'step2 is Complete');
            $(domBullet).remove();
            tweenPool.delete(domBullet.id);
            if (tweenPool.length === 0) {
                this.isRunning = false;
            }
        })
    return step2;
}

barrage.prototype.animate = function (time) {
    if (this.isRunning) {
        requestAnimationFrame(this.animate.bind(this));
    }
    this.tweenGroup.update(time);
}

barrage.prototype.init = function (config) {

    this.config = Object.assign(defalutConfig, config || {});
    log(this.config.isDebug, '弹幕初始化');

    this.bulletId = 0;
    this.bulletPool = [];
    this.tracks = [];
    this.fireTimer = null;
    this.tweenGroup = new TWEEN.Group();
    this.tweenPool = new Map();
    this.isRunning = false;
    this.status = 'init';

    initTrack(this.config, this.tracks, this.root.offsetHeight);
}

barrage.prototype.fire = function () {
    if (this.bulletPool.length === 0) {
        log(this.config.isDebug, '没有可用子弹，停止发射');
        clearInterval(this.fireTimer);
        this.status = 'idle';
        return;
    }

    if (this.tweenPool.length >= this.config.max) {
        log(this.config.isDebug, '弹幕数量达到上限');
        return;
    }

    var idleTracks = $.grep(this.tracks, function (item) {
        return item.isBusy === false;
    })
    if (idleTracks.length === 0) {
        log(this.config.isDebug, '没有可用的弹道');
        return;
    }
    var targetTrack = idleTracks[Math.floor(Math.random() * idleTracks.length)];
    targetTrack.isBusy = true;

    log(this.config.isDebug, `找到空闲弹道 id: ${targetTrack.id}`);

    var bullet = this.bulletPool.shift();
    var domBullet = createBullet(this.config, bullet, targetTrack, this.root.offsetWidth);
    mountBullet(this.root, domBullet);
    loadBullet(
        this.config,
        domBullet,
        targetTrack,
        this.tweenGroup,
        this.root.offsetWidth,
        this.tweenPool
    );
    log(this.config.isDebug, `fire bullet msg: ${bullet.msg}`);
}

barrage.prototype.start = function () {
    if (this.status && this.status === 'init') {
        this.isRunning = true;
        this.status = 'running';
        this.fireTimer = setInterval(function () {
            this.fire();
        }.bind(this), this.config.fireInterval);
        this.animate();
    }
}

barrage.prototype.load = function (bullets) {
    $.each(bullets, function (index, item) {
        item.id = this.bulletId;
        this.bulletId++;
    }.bind(this));
    this.bulletPool = this.bulletPool.concat(bullets);
    log(this.config.isDebug, `装载子弹，子弹数量：${this.bulletPool.length}`);
    if (this.status && this.status === 'idle') {
        this.isRunning = true;
        this.status = 'running';
        this.fireTimer = setInterval(function () {
            this.fire();
        }.bind(this), this.config.fireInterval);
        this.animate();
    }
}

barrage.prototype.pause = function (bullets) {
    if (this.status && this.status !== 'paused') {
        this.status = 'paused';
        clearInterval(this.fireTimer);
        this.tweenPool.forEach(function (element) {
            element.step.stop();
        });
        this.isRunning = false;
        log(this.config.isDebug, '暂定弹幕滚动');
    }
}

barrage.prototype.play = function (bullets) {
    if (this.status && this.status !== 'running') {
        this.status = 'running';
        this.tweenPool.forEach(function (element) {
            resumeBullet(
                this.config,
                element.domBullet,
                element.trackInfo,
                this.tweenGroup,
                this.root.offsetWidth,
                this.tweenPool,
                element.steps
            )
        }, this);
        
        this.isRunning = true;
        this.fireTimer = setInterval(function () {
            this.fire();
        }.bind(this), this.config.fireInterval);
        this.animate();

        log(this.config.isDebug, '恢复弹幕滚动');
    }
}