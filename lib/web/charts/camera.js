/**
 * Created with IntelliJ IDEA.
 * User: Johannes
 * Date: 26.11.13
 * Time: 22:08
 * To change this template use File | Settings | File Templates.
 */


function Camera(){
    var camera;

    var aimX, aimY, aimZ;
    var vX = 0, vY = 0, vZ = 0;
    var aimCX, aimCY, aimCZ;
    var center = new THREE.Vector3(0,0,0);
    var startTime, lastTime;
    var distance = 250;
    var animationRunning = false;

    var spin = true;

    this.run = function(){
        var time = Date.now();
        if(spin) spinOut(time);

        if(!animationRunning){
            if(spin)
                camera.lookAt(center);
            return;
        }

        var fact;
        if(time - startTime > 2000){
            fact = 1;
            animationRunning = false;
        } else {
            fact = 1 - 1/Math.pow(1.01, (time - lastTime) / 3);
        }

        lastTime = time;

        camera.position.x = camera.position.x + (aimX - camera.position.x) * fact;
        camera.position.y = camera.position.y + (aimY - camera.position.y) * fact;
        camera.position.z = camera.position.z + (aimZ - camera.position.z) * fact;

        center.x = center.x + (aimCX - center.x) * fact;
        center.y = center.y + (aimCY - center.y) * fact;
        center.z = center.z + (aimCZ - center.z) * fact;

        camera.lookAt(center);
    };


    var lastSpinTime = Date.now();
    function spinOut(time){
        if(Math.abs(vX) + Math.abs(vY) + Math.abs(vZ) > 0.00001){
            aimX += vX;
            aimY += vY;
            aimZ += vZ;

            aimCX += vX;
            aimCY += vY;
            aimCZ += vZ;

            camera.position.x += vX;
            camera.position.y += vY;
            camera.position.z += vZ;

            center.x += vX;
            center.y += vY;
            center.z += vZ;

            var f = Math.pow(0.96, (time-lastSpinTime) / 16);
            vX *= f;
            vY *= f;
            vZ *= f;

            lastSpinTime = time;
        }
    }

    function startAnimation(){
        startTime = Date.now();
        lastTime = startTime;
        animationRunning = true;
    }
    this.moveTo = function(x, y, z){
        aimX = x;
        aimY = y;
        aimZ = z;

        aimCX = x;
        aimCY = y - distance;
        aimCZ = z;

        startAnimation();
    };

    this.spin = function(dospin){
        spin = dospin;
    };

    this.move = function(dX, dY, dZ, animate, keepCenter){
        aimX += dX;
        aimY += dY;
        aimZ += dZ;

        if(!keepCenter){
            aimCX += dX;
            aimCY += dY;
            aimCZ += dZ;
        }

        if(animate){
            startAnimation();
        } else {
            vX = (vX + dX) / 2;
            vY = (vY + dY) / 2;
            vZ = (vZ + dZ) / 2;

            camera.position.x += dX;
            camera.position.y += dY;
            camera.position.z += dZ;

            if(!keepCenter){
                center.x += dX;
                center.y += dY;
                center.z += dZ;
            }
        }
    };

    this.getCam = function(){
        return camera;
    };

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.x = -50;
    camera.position.y = 50;
    camera.position.z = 100;
    camera.up.set(0,0,-1);
    camera.lookAt(new THREE.Vector3(-50,0,0));
}