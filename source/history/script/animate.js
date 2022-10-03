function animate(obj, target, callback) {
    // console.log("this", target)
    // console.log(callback);  callback = function() {}  调用的时候 callback()
    clearInterval(obj.timer);
    obj.timer = setInterval(function () {
        var step = (target - obj.offsetLeft) / 10; //其实就是每次加这个步数，这样看起来就像动画

        step = step > 0 ? Math.ceil(step) : Math.floor(step);
        if (obj.offsetLeft == target) {
            clearInterval(obj.timer);
            callback && callback();
        }
        obj.style.left = obj.offsetLeft + step + 'px';

    }, 15);
}

