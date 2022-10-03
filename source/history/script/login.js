window.addEventListener('load', function () {
    var account = this.document.querySelector('.account');
    var password = this.document.querySelector('.password');
    this.console.log(account.innerHTML);
    this.console.log(password)
    var out = this.document.querySelector('.out');
    var body = this.document.querySelector('body');
    var modal = this.document.querySelector('.modal');
    var logined = this.document.querySelector('.logined');
    var clear = this.document.querySelector('.clear');
    var eye = this.document.querySelector('.eye')
    logined.addEventListener('click', function (e) {
        if (account.value === "111" && password.value === "222") {
            window.location.href = "./index.html"
        }
        else {
            alert("请输入正确的账号密码")
        }


    })

    clear.addEventListener('click', function (e) {
        account.value = '';
        password.value = "";

    })
    var flag = 0;
    eye.onclick = function () {
        if (flag == 0) {
            password.type = 'text';
            eye.src = './resource/close.png';
            flag = 1;
        } else {
            password.type = 'password';
            eye.src = './resource/open.png';
            flag = 0;
        }
    }
    var title = document.querySelector('.login-box');
    function animate2(obj, target) {
        var alpha = 110;
        var speed = 20;
        console.log(obj.style.opacity)
        var timer = setInterval(function () {
            if (obj.offsetTop <= target) {
                clearInterval(timer);
            }
            alpha -= speed;
            obj.style.top = obj.offsetTop - 15 + 'px';
            obj.style.opacity = alpha / 100;
            console.log(obj.offsetTop)
        }, 60);
    }
    function animate3(obj, target) {
        var alpha = 0;
        var speed = 30;
        console.log(obj.style.opacity)
        var timer = setInterval(function () {
            if (obj.offsetTop >= target) {
                clearInterval(timer);
            }
            alpha += speed;
            obj.style.top = obj.offsetTop + 15 + 'px';
            obj.style.opacity = alpha / 100;
            console.log(obj.offsetTop)
        }, 60);
    }
    animate3(title, 110);
    out.addEventListener('click', function () {
        if (title.offsetTop <= 0) {
            return
        }
        animate2(title, 0);
        animate3(modal, 100)
    })
    modal.addEventListener('click', function () {
        animate3(title, 110);
        animate2(modal, 0)
    })
})