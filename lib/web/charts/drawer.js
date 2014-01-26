/**
 * Created with IntelliJ IDEA.
 * User: Johannes
 * Date: 12.11.13
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */

var Drawer = {
drawGeometry: function(geometry, scale, data, point){
    var triangles = 16384*2;

    geometry.addAttribute( 'index', Uint16Array, triangles * 3, 1 );
    geometry.addAttribute( 'position', Float32Array, triangles * 3, 3 );
    geometry.addAttribute( 'normal', Float32Array, triangles * 3, 3 );
    geometry.addAttribute( 'color', Float32Array, triangles * 3, 3 );

    var indices = geometry.attributes.index.array;

    var sInd = [0, 4, 4+1, 0, 4+1, 1, 2, 4+2, 4+3, 2, 4+3, 3];
    var iOffset = 0;

    for ( var i = 0; i < indices.length; i += 12 ) {
        indices[i + 0] = sInd[0] + iOffset;
        indices[i + 1] = sInd[1] + iOffset;
        indices[i + 2] = sInd[2] + iOffset;
        indices[i + 3] = sInd[3] + iOffset;
        indices[i + 4] = sInd[4] + iOffset;
        indices[i + 5] = sInd[5] + iOffset;
        indices[i + 6] = sInd[6] + iOffset;
        indices[i + 7] = sInd[7] + iOffset;
        indices[i + 8] = sInd[8] + iOffset;
        indices[i + 9] = sInd[9] + iOffset;
        indices[i + 10] = sInd[10] + iOffset;
        indices[i + 11] = sInd[11] + iOffset;

        iOffset += 4;
    }

    var positions = geometry.attributes.position.array;
    var normals = geometry.attributes.normal.array;
    var colors = geometry.attributes.color.array;

    var b = 1.05;

    var nothingDone = 0;
    for ( var i = 0; i < positions.length; i += 12 ) {
        var id = Math.floor(i / 12);

        if(!point.prev) {
            point.prev = new THREE.Vector2(0,0);
            point.cur = new THREE.Vector2(0,0);
            point.next = new THREE.Vector2(0,0);
        }

        point.prev.copy(point.cur);
        point.cur.copy(point.next);

        if(data.timestamps.length <= id || data.values.length <= id){
            b = 0;
            point.next.set(point.cur.x,0);
            nothingDone++;
        } else {
            b = 0.25;
            point.next.set(data.timestamps[id], data.values[id] * scale);
            nothingDone = 0;
        }

        if(nothingDone > 2){
            this.setPoint(positions, i, 0,0,0, 4);
        } else {
            this.setPosition(positions, i, id == 0 ? point.next : point.prev, id == 0 ? point.next : point.cur, point.next,  b);
        }


        normals[ i ]     = 0;
        normals[ i + 1 ] = 0;
        normals[ i + 2 ] = 1;

        normals[ i + 3 ] = 0;
        normals[ i + 4 ] = 0;
        normals[ i + 5 ] = 1;

        normals[ i + 6 ] = 0;
        normals[ i + 7 ] = -1;
        normals[ i + 8 ] = 0;

        normals[ i + 9 ] = 0;
        normals[ i + 10 ] = -1;
        normals[ i + 11 ] = 0;

        var color = data.color;

        colors[ i ]     = color.r;
        colors[ i + 1 ] = color.g;
        colors[ i + 2 ] = color.b;

        colors[ i + 3 ] = color.r;
        colors[ i + 4 ] = color.g;
        colors[ i + 5 ] = color.b;

        colors[ i + 6 ] = color.r;
        colors[ i + 7 ] = color.g;
        colors[ i + 8 ] = color.b;

        colors[ i + 9 ] = color.r;
        colors[ i + 10 ] = color.g;
        colors[ i + 11 ] = color.b;
    }
    var max = data.timestamps.length-1;
    point.next.set(data.timestamps[max], data.values[max]*scale);
    point.cur.set(data.timestamps[max-1], data.values[max-1]*scale);

    geometry.offsets = [{
        start: 0,
        index: 0,
        count: triangles
    }];
},

numLineTriangles: 16384*2*6 - 900,
drawLineGeometry: function(geometry, scale, scaleX, data, old){

    geometry.addAttribute( 'index', Uint16Array, this.numLineTriangles * 3, 1 );
    geometry.addAttribute( 'position', Float32Array, this.numLineTriangles * 3, 3 );
    geometry.addAttribute( 'normal', Float32Array, this.numLineTriangles * 3, 3 );
    geometry.addAttribute( 'color', Float32Array, this.numLineTriangles * 3, 3 );

    var indices = geometry.attributes.index.array;

    var iOffset = 0;

    var numLines = data.length;

    var sInd = [0, numLines*2, numLines*2 + 1,0,numLines*2 + 1,1];

    for ( var i = 0; i < indices.length; i += 6 ) {
        indices[i + 0] = sInd[0] + iOffset;
        indices[i + 1] = sInd[1] + iOffset;
        indices[i + 2] = sInd[2] + iOffset;
        indices[i + 3] = sInd[3] + iOffset;
        indices[i + 4] = sInd[4] + iOffset;
        indices[i + 5] = sInd[5] + iOffset;

        iOffset += 2;
    }

    this.drawLineVertices(geometry.attributes.position.array, geometry.attributes.normal.array, geometry.attributes.color.array,
        scale, scaleX, data, old);

    geometry.offsets = [{
        start: 0,
        index: 0,
        count: this.numLineTriangles
    }];

    geometry.boundingSphere = new THREE.Box3(); // make sure chart doesnt disappear
},

drawLineVertices: function(positions, normals, colors, scale, scaleX, data, old){
    var numLines = data.length;

    var b = 1.05;

    for ( var i = 0; i < positions.length; i += 6 ) {
        var lineId = (i/6) % numLines;
        var id = Math.floor(i / 6 / numLines);

        if(!old[lineId]) old[lineId] = {
            prev: new THREE.Vector2(0,0),
            cur: new THREE.Vector2(0,0),
            next: new THREE.Vector2(0,0)
        };
        var point = old[lineId];

        if(data[lineId].timestamps.length < id || data[lineId].values.length < id){
            b = 0;
        } else {
            b = 0.25;
            point.prev.copy(point.cur);
            point.cur.copy(point.next);

            if(data[lineId].timestamps.length == id)
                point.next.set(point.cur.x+0.1, point.cur.y);
            else
                point.next.set(data[lineId].timestamps[id] * scaleX, data[lineId].values[id] * scale);
        }

        this.setLinePosition(positions, i, id == 0 ? point.next : point.prev, id == 0 ? point.next : point.cur, point.next,  b, 0);

        if(normals){
            normals[ i ]     = 0;
            normals[ i + 1 ] = -1;
            normals[ i + 2 ] = 0;

            normals[ i + 3 ] = 0;
            normals[ i + 4 ] = -1;
            normals[ i + 5 ] = 0;
        }
        if(colors){
            var color = data[lineId].color;

            colors[ i]  = color.r;
            colors[ i + 1 ] = color.g;
            colors[ i + 2 ] = color.b;

            colors[ i + 3 ] = color.r;
            colors[ i + 4 ] = color.g;
            colors[ i + 5 ] = color.b;
        }
    }

    //set the last "next" and "cur" value to the correct values again
    data.forEach(function(item, index){
        var max = item.timestamps.length-1;
        old[index].next.set(item.timestamps[max]*scaleX, item.values[max]*scale);
        old[index].cur.set(item.timestamps[max]*scaleX || 0, item.values[max]*scale || 0);
        old[index].prev.set(item.timestamps[max-1]*scaleX || 0, item.values[max-1]*scale || 0);
    });
    return i+5;
},

setLinePosition: (function(){

    var eps = 0.001;
    var maxLength = 1.5;
    var d = new THREE.Vector2(),
        back = new THREE.Vector2(),
        forward = new THREE.Vector2(),
        back3 = new THREE.Vector3(),
        forward3 = new THREE.Vector3();

    return function(target, offset, prev, point, next, b, scaleY){
        back.subVectors(prev, point);
        forward.subVectors(next, point);

        if(back.length() <= eps || forward.length() <= eps || b <= eps){
            d.set(0,0);
        } else {
            var alpha = Math.acos(back.dot(forward) / (back.length() * forward.length()));

            var c = b / Math.sin(alpha / 2);
            var beta = Math.acos(forward.x / forward.length());

            var gamma;
            var mX = 1, mY = 1;

            if(back3.set(back.x, back.y, 0).cross(forward3.set(forward.x, forward.y, 0)).z <= 0){
                gamma = alpha / 2 + Math.sgn(forward.y) * beta;
            } else {
                gamma = alpha / 2 - Math.sgn(forward.y) * beta;
                mY = -1;
            }

            if(gamma > Math.PI/2) {
                gamma = Math.PI - gamma;
                mX = -1;
            }

            d.set(Math.cos(gamma) * c * mX, Math.sin(gamma) * c * mY);

            if(d.y < 0){
                d.multiplyScalar(-1);
            }
            if(d.length() > maxLength) d.setLength(maxLength);
        }

        target[ offset ] = point.x + d.x;
        target[ offset + 1 ] = point.y * scaleY;
        target[ offset + 2 ] = point.y + d.y;

        target[ offset + 3 ] = point.x - d.x;
        target[ offset + 4 ] = point.y * scaleY;
        target[ offset + 5 ] = point.y - d.y;
    }
})(),


setPosition: function(target, offset, prev, point, next, b){
    target[ offset ]     = point.x;
    target[ offset + 1 ] = 0;
    target[ offset + 2 ] = point.y;

    target[ offset + 3 ] = point.x;
    target[ offset + 4 ] = point.y / 2.1;
    target[ offset + 5 ] = point.y;

    this.setLinePosition(target, offset+6, prev, point, next, b, 1/2.1);
},

setPoint: function(target, offset, x,y,z, n){
    for(var i = offset; i<offset+n*3; i+=3){
        target[i] = x;
        target[i+1] = y;
        target[i+2] = z;
    }
},

drawAnimGeometry: function(animGeometry, animMaterial, height){

    for ( var i = 0; i < 2; i ++ ) {

        var vertices = [];

        for ( var v = 0; v < animGeometry.vertices.length; v ++ ) {

            vertices.push( animGeometry.vertices[ v ].clone() );

            vertices[ vertices.length - 1 ].y += height/2;
            vertices[ vertices.length - 1 ].y *= i;
        }

        animGeometry.morphTargets.push( { name: "target" + i, vertices: vertices } );
    }

    var animMesh = new THREE.Mesh( animGeometry, animMaterial );
    animMesh.morphTargetInfluencesTarget = [1,0];
    animMesh.position.x = -100+100+2;

    return animMesh;
}
};