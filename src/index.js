function barrage(ele) {
    this.root = ele;
}

var defalutConfig = {
    bulletHeight: 30,
    fireInterval: 500,
    v: 50,
    max: 50
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
    console.info('初始化弹道数量: ', trackAmount);
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

function fireBullet(config, domBullet, trackInfo, bulletRunningAmount, group, width, tweenPool) {
    var bulletWidth = domBullet.offsetWidth;
    bulletRunningAmount.amount++;
    var step = { left: 0 };
    var step1 = new TWEEN.Tween(step, group)
        .to({ left: bulletWidth }, parseInt(bulletWidth / config.v * 1000))
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function () {
            $(domBullet).css('transform', `translateX(-${step.left}px) translateZ(0px)`);
        })
        .onComplete(function () {
            console.info('弹道进入空闲状态：', trackInfo);
            trackInfo.isBusy = false;
        })
    var step2 = new TWEEN.Tween(step, group)
        .to({ left: bulletWidth + width }, parseInt(bulletWidth + width / config.v * 1000))
        .onStart(function() {
            tweenPool.set(domBullet.id, {
                step: step2
            })
        })
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function () {
            $(domBullet).css('transform', `translateX(-${step.left}px) translateZ(0px)`);
        })
        .onComplete(function () {
            console.info('step2 is Complete');
            var deleteIndex;
            bulletRunningAmount.amount--;
            $(domBullet).remove();
            tweenPool.delete(domBullet.id);
            if (bulletRunningAmount.amount === 0) {
                this.isRunning = false;
            }
        })
    step1.chain(step2);
    step1.start();
    tweenPool.set(domBullet.id, {
        step: step1
    });
}

barrage.prototype.animate = function (time) {
    if (this.isRunning) {
        requestAnimationFrame(this.animate.bind(this));
    }
    this.tweenGroup.update(time);
}

barrage.prototype.init = function (config) {

    this.config = Object.assign(defalutConfig, config || {});
    console.info('初始化参数: ', this.config);

    this.bulletId = 0;
    this.bulletPool = [];
    this.bulletRunningAmount = { amount: 0 };
    this.tracks = [];
    this.fireTimer = null;
    this.tweenGroup = new TWEEN.Group();
    this.tweenPool = new Map();
    this.isRunning = false;

    initTrack(this.config, this.tracks, this.root.offsetHeight);
}

barrage.prototype.fire = function () {
    if (this.bulletPool.length === 0) {
        console.info('没有可用子弹，停止发射');
        clearInterval(this.fireTimer);
        return;
    }

    if (this.bulletRunningAmount.amount >= this.config.max) {
        console.info('弹幕数量达到上限');
        return;
    }

    var idleTracks = $.grep(this.tracks, function (item) {
        return item.isBusy === false;
    })
    if (idleTracks.length === 0) {
        console.info('没有可用的弹道');
        return;
    }
    var targetTrack = idleTracks[Math.floor(Math.random() * idleTracks.length)];
    targetTrack.isBusy = true;

    console.info('找到空闲弹道: ', targetTrack);

    var bullet = this.bulletPool.shift();
    var domBullet = createBullet(this.config, bullet, targetTrack, this.root.offsetWidth);
    mountBullet(this.root, domBullet);
    fireBullet(
        this.config,
        domBullet,
        targetTrack,
        this.bulletRunningAmount,
        this.tweenGroup,
        this.root.offsetWidth,
        this.tweenPool
    );
    console.info('fire bullet: ', bullet);
}

barrage.prototype.start = function () {
    this.isRunning = true;
    this.fireTimer = setInterval(function () {
        this.fire();
    }.bind(this), this.config.fireInterval);
    this.animate();
}

barrage.prototype.load = function (bullets) {
    $.each(bullets, function (index, item) {
        item.id = this.bulletId;
        this.bulletId++;
    }.bind(this));
    this.bulletPool = this.bulletPool.concat(bullets);
    console.info('装载子弹：', this.bulletPool);
}

barrage.prototype.pause = function (bullets) {
    clearInterval(this.fireTimer);
    this.tweenPool.forEach(function (element) {
        element.step.stop();
    });
    this.isRunning = false;
    console.info('暂定弹幕滚动');
}

barrage.prototype.resume = function (bullets) {
    this.tweenPool.forEach(function (element) {
        element.step.start();
    });
    this.start();
    console.info('恢复弹幕滚动');
}