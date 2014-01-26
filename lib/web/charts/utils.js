/**
 * Created with IntelliJ IDEA.
 * User: Johannes
 * Date: 05.01.14
 * Time: 13:29
 * To change this template use File | Settings | File Templates.
 */
function Animation(duration, start, end){
    var startTime = Date.now();
    var done = false;
    var onCompleteFunction;

    this.get = function(currentTime){ //currentTime is optional
        if(done) return end;
        var time = ((currentTime || Date.now()) - startTime);
        if(time > duration) {
            done = true;
            setTimeout(function(){
                onCompleteFunction && onCompleteFunction();
            }, 1);
            return end;
        }
        return easeInOutSine(0, time, start, end-start, duration);
    };
    this.isRunning = function(){
        return !done;
    };
    this.onComplete = function(fn){
        if(done) setTimeout(fn, 0);
        else onCompleteFunction = fn;
    };
    this.cancel = function(){
        done = true;
        onCompleteFunction = false;
    };

    var easeInOutCubic = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    };

    var easeInOutQuad = function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t + b;
        return -c/2 * ((--t)*(t-2) - 1) + b;
    };

    var easeInOutSine = function (x, t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    };
}

Math.sgn = function(x){
    if(x == 0) return 0;
    return x > 0 ? 1 : -1;
};

Math.round2 = function(x, n){
    var y = Math.pow(10, n);
    return Math.round(x * y) / y;
};

function setOptions(target, options){
    if(!options) return;
    for(var prop in options){
        if(options.hasOwnProperty(prop)){
            target[prop] = options[prop];
        }
    }
}