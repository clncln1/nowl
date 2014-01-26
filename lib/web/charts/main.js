(function(){

var Horizon3D = function(options){
    this._options = {
        target: document.body
    };
    setOptions(this._options, options);
    this._options.target = $(this._options.target);

    this.charts = [];
    this.initialized = false;
    this.lastTime = 0;

    this.mouse = {
        startX: 0,
        startY: 0
    };

    this.initialize();
    return this;
};

Horizon3D.prototype = {
    constructor: Horizon3D
};

var start = Date.now();


Horizon3D.prototype.initialize =  function() {
    this.camera = new Camera();

    this.scene    = new THREE.Scene();
    this.sceneCSS = new THREE.Scene();

    this.scene.add( new THREE.AmbientLight( 0xcccccc ) );

    /*var light1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    light1.position.set( 1, 1, 1 );
    scene.add( light1 );  */

    this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    this.renderer.setClearColor( 0xffffff, 1 );
    var width =  this._options.target.width(),      //somehow this doesn't work with CSS context
        height = this._options.target.height();

    width = window.innerWidth;
    height = window.innerHeight;

    this.renderer.setSize(width, height);

    this.renderer.domElement.style.opacity = 0;

    this.rendererCSS	= new THREE.CSS3DRenderer();
    this.rendererCSS.setSize( width, height);
    this.rendererCSS.domElement.style.position	= 'absolute';
    this.rendererCSS.domElement.style.top	= 0;
    this.rendererCSS.domElement.style.margin	= 0;
    this.rendererCSS.domElement.style.padding	= 0;
    this.rendererCSS.domElement.style.opacity = 0;

    this._options.target.append( this.rendererCSS.domElement );
    this._options.target.append( this.renderer.domElement );

    this.stats = new Stats();
    //stats.setMode(1); // 0: fps, 1: ms

    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.left = '0px';
    this.stats.domElement.style.bottom = '0px';

    this._options.target.append( this.stats.domElement );

    console.log(Date.now()-start);

    this._options.target.mousedown(this.mouseDownHandler.bind(this));
    this._options.target.mouseup(this.mouseUpHandler.bind(this));
    this._options.target.mousemove(this.mouseMoveHandler.bind(this));

    $(window).keydown(this.keyDownHandler.bind(this));
    $(window).keyup(this.keyUpHandler.bind(this));

    var wheelHandler = wheel.bind(this);

    if (window.addEventListener)
        window.addEventListener('DOMMouseScroll', wheelHandler, false);
    window.onmousewheel = document.onmousewheel = wheelHandler;

    this.animateFunction = this.animate.bind(this);
    this.lastTime = Date.now();

    requestAnimationFrame(this.animateFunction);
};

Horizon3D.prototype.animate = function() {
    var that = this;
    this.stats.begin();
    this.camera.run();

    var time = Date.now();
    var dif = time-this.lastTime;
    this.lastTime = time;

    this.charts.forEach(function(chart){
        chart.render(dif);
    });

    /*if(move){
        moveSpeed = Math.pow(moveSpeed, 0.95);
        this.charts.forEach(function(item){
            item.mesh.position.x += move * moveSpeed * 5;
        })
    } */

    this.renderer.render( this.scene, this.camera.getCam() );
    this.rendererCSS.render( this.sceneCSS, this.camera.getCam() );

    this.stats.end();

    if(!this.initialized){
        this.initialized = true;

        setTimeout(function(){
            that.camera.moveTo(-50,250,1);
            that.renderer.domElement.style.opacity = 1;
            that.rendererCSS.domElement.style.opacity = 1;
        }, 300);
    }
    requestAnimationFrame( this.animateFunction );
};

Horizon3D.prototype.keyDownHandler = function(key){
    if(key.which == 37){
        move = -1;
    } else if(key.which == 39){
        move = 1;
    }
};

Horizon3D.prototype.keyUpHandler = function(key){
    move = 0;
    //moveSpeed = 0.01;
};

Horizon3D.prototype.mouseDownHandler = function(ev){
    this.mouse.startX = ev.pageX;
    this.mouse.startY = ev.pageY;
    this.mouse.down = true;
    this.camera.spin(false);
    this.camera.move(30, 0, 0, true, true);  //awesome metro effect
};

Horizon3D.prototype.mouseUpHandler = function(ev){
    this.mouse.down = false;
    this.camera.spin(true);
    this.camera.move(-30, 0, 0, true, true);
};
Horizon3D.prototype.mouseMoveHandler = function(ev){
    if(this.mouse.down){
        this.camera.move(0, 0, (this.mouse.startY - ev.pageY) / 4);
        this.mouse.startX = ev.pageX;
        this.mouse.startY = ev.pageY;
    }
};

Horizon3D.prototype.mouseWheelHandler = function(delta){
     console.log(delta, this.charts);

    this.charts.forEach(function(chart){
        chart.scaleX(delta);
    });
};

function wheel(event){
    var delta = 0;
    if (!event)
        event = window.event;
    if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta/120;
    } else if (event.detail) {
        delta = -event.detail/3;
    }
    if (delta)
        this.mouseWheelHandler(delta);
    if (event.preventDefault)
        event.preventDefault();
    event.returnValue = false;
}

window.Horizon3D = Horizon3D;

})();