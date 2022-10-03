window.addEventListener('load', function () {

    //这是侧边栏的定义
    var cebian = document.querySelector('.slider-bar');

    var banner = document.querySelector('.banner');
    var main = document.querySelector('.main');
    var culture = document.querySelector('.culture');

    var temp = cebian.offsetTop - banner.offsetTop;
    var temp2 = cebian.offsetTop;
    var maintop = main.offsetTop;
    document.addEventListener('scroll', function () {
        culture.style.position = "fixed"
        // console.log(document.documentElement.scrollTop);//用来看结果的
        if (window.pageYOffset >= banner.offsetTop) {
            cebian.style.position = 'fixed';
            cebian.style.top = temp + 'px';
        }
        else {
            cebian.style.position = 'absolute';
            cebian.style.top = temp2 + 'px';
        }


    })
    // 倒计时
    var day = document.querySelector('.day');
    var hour = document.querySelector('.hour');
    var minute = document.querySelector('.minute');
    var second = document.querySelector('.second');
    var inputTime = +new Date('2020-8-29 00:00:00');
    countDown();
    setInterval(countDown, 1000);//定时器1秒一次
    function countDown() {
        var nowTime = +new Date();
        var times = (inputTime - nowTime) / 1000;
        var d = parseInt(times / 60 / 60 / 24)
        day.innerHTML = d + '天';
        var h = parseInt(times / 60 / 60 % 24);
        h = h < 10 ? '0' + h : h;
        hour.innerHTML = h + '时';
        var m = parseInt(times / 60 % 60);
        m = m < 10 ? '0' + m : m;
        minute.innerHTML = m + '分';
        var s = parseInt(times % 60);
        s = s < 10 ? '0' + s : s;
        second.innerHTML = s + '秒';
    }
    //换皮肤部分
    var imgs = document.querySelector('.pifu').querySelectorAll('img')
    for (var i = 0; i < imgs.length; i++) {
        imgs[i].onclick = function () {
            console.log(this.src);
            document.body.style.backgroundImage = 'url(' + this.src + ')';
        }
    }
    // 广告位部分
    var btn = document.querySelector('.close-btn');
    var box = document.querySelector('.guanggao');

    btn.onclick = function () {
        box.style.display = 'none';
    }
    //轮播图部分

    var imagebox = this.document.querySelector('.imagebox')
    var focusWidth = imagebox.offsetWidth;
    var images = this.document.querySelector('.images');
    var ol = imagebox.querySelector('.circle');
    console.log(images.children.length);
    for (var i = 0; i < imagebox.children.length; i++) {

        var li = document.createElement('li');
        // 自定义属性
        li.setAttribute('index', i);
        // 插到最后
        ol.appendChild(li);
        //
        li.addEventListener('click', function () {
            for (var i = 0; i < ol.children.length; i++) {
                ol.children[i].className = '';
            }
            this.className = 'current';
            var index = this.getAttribute('index');
            // 当我们点击了某个小li 就要把这个li 的索引号给 num  
            num = index;
            // 当我们点击了某个小li 就要把这个li 的索引号给 circle  
            circle = index;
            // num = circle = index;
            console.log(focusWidth);
            console.log(index);

            animate(images, -index * focusWidth, function () {
                flag = true;
            });
        })
    }
    console.log(ol)
    ol.children[0].className = 'current';

    // 把ol里面的第一个小li设置类名为 current

    // 克隆第一张图片放到ul 最后
    var first = images.children[0].cloneNode(true);

    images.appendChild(first);
    console.log(images)
    var num = 0;
    var circle = 0;
    var flag = true;
    var zuo = this.document.querySelector('.zuo')
    var you = this.document.querySelector('.you')
    zuo.addEventListener('click', function () {
        console.log('点了左')
        if (flag) {
            flag = false;
            if (num == 0) {
                num = images.children.length - 1;  //这里就是直接回到最后
                images.style.left = -num * focusWidth + 'px';

            }
            num--;
            animate(images, -num * focusWidth, function () {
                flag = true;
            });
            circle--;
            circle = circle < 0 ? ol.children.length - 1 : circle;
            circleChange();
        }
    });

    you.addEventListener('click', function () {
        if (flag) {
            flag = false;
            if (num == images.children.length - 1) {
                images.style.left = 0;
                num = 0;
            }
            num++;
            animate(images, -num * focusWidth, function () {
                flag = true; // 打开节流阀
            });
            circle++;
            if (circle == ol.children.length) {
                circle = 0;
            }
            // 调用函数
            circleChange();
        }
    });

    //这个就是比较正常的改变样式，只是谢了个函数，比较好
    function circleChange() {
        // 先清除其余小圆圈的current类名
        for (var i = 0; i < ol.children.length; i++) {
            ol.children[i].className = '';
        }
        // 留下当前的小圆圈的current类名
        ol.children[circle].className = 'current';
    }
    //  自动播放轮播图
    var timer = setInterval(function () {
        //手动调用点击事件
        you.click();
    }, 2000);

    //滚动新闻
    var content = this.document.querySelector('.newbox');
    var msg1 = this.document.querySelector('.msg1')
    var firstnewli = msg1.children[0].cloneNode(true);

    msg1.appendChild(firstnewli);
    var timerr = 100;
    content.scrollTop = 0;

    upScroll = setInterval(function () {
        if (content.scrollTop >= 150) {
            content.scrollTop = 0 + 'px';
            console.log('ww')
        } else {
            content.scrollTop++;
        }

    }, timerr);
    content.onmouseover = function () {
        clearInterval(upScroll);
    };
    content.onmouseout = function () {
        upScroll = setInterval(function () {
            if (content.scrollTop >= 150) {
                content.scrollTop = 0 + 'px';
                console.log('ww')
            } else {
                content.scrollTop++;
            }

        }, timerr);
    };
})





