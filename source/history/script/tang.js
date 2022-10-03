window.addEventListener('load', function () {

    //放大镜部分



    var small = document.querySelector('.small');
    var mask = document.querySelector('.mask');
    var big = document.querySelector('.big');
    var fangda = this.document.querySelector('.fangda')
    var fleft = fangda.offsetLeft;
    var ftop = fangda.offsetTop;
    small.addEventListener('mousemove', function (e) {
        var x = e.pageX - this.offsetLeft - fleft;
        var y = e.pageY - this.offsetTop - ftop;
        console.log("鼠标", e.pageX, e.pageY)
        console.log("大盒子", fleft, ftop)
        console.log("小盒子", this.offsetLeft, this.offsetTop)
        console.log(x, y)
        var maskx = x - mask.offsetWidth / 2;
        var masky = y - mask.offsetHeight / 2;
        console.log("zuox", maskx, masky);       //mask左上角
        if (maskx <= 0) {
            maskx = 0;
        }
        else if (maskx >= small.offsetWidth - mask.offsetWidth) {
            maskx = small.offsetWidth - mask.offsetWidth;
        }
        if (masky <= 0) {
            masky = 0;
        }
        else if (masky >= small.offsetHeight - mask.offsetHeight) {
            masky = small.offsetHeight - mask.offsetHeight;
        }
        mask.style.left = maskx + 'px';
        mask.style.top = masky + 'px';

        var maskxmax = small.offsetWidth - mask.offsetWidth;
        var maskymax = small.offsetHeight - mask.offsetHeight;
        // console.log(maskxmax, maskymax);
        //先求距离，为了之后的移动比例做基础
        var bigimg = document.querySelector('.bigimg');
        var bigmax = bigimg.offsetHeight - big.offsetHeight;
        var bigx = (x) * bigmax / maskxmax;
        var bigy = (y) * bigmax / maskymax;
        // console.log(bigx, bigy);
        bigimg.style.left = -bigx + 'px';
        bigimg.style.top = -bigy + 'px';
    })
    small.addEventListener('mouseover', function () {
        mask.style.display = 'block';
        big.style.display = 'block';
    });
    small.addEventListener('mouseout', function () {
        mask.style.display = 'none';
        big.style.display = 'none';
    });
})