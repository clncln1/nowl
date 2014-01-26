
var buffers = [];
var buffersUsed = [];
var buffersType = [];

THREE.WebGLAttribute = function(type, numItems, itemSize){

    var buffer,
        bufferIndex = -1,
        size = numItems * itemSize;

    for(var i = 0; i<buffers.length; i++){
        if(buffersUsed[i] == 0 && buffersType[i] == type && buffers[i].length >= size){
            bufferIndex = i;

            if(buffers[bufferIndex].length > size){
                buffer = new type(buffers[bufferIndex], 0, size);
            } else {
                buffer = buffers[bufferIndex];
            }

            break;
        }
    }
    if(bufferIndex < 0){
        buffer = new type( size );
        bufferIndex = buffers.length;
        buffers.push(buffer);
    }
    buffersUsed[bufferIndex] = true;
    buffersType[bufferIndex] = type;

    this.array = buffer;

    this.itemSize = itemSize;

    this.update = function(start, buffer){
        this.array = buffer;

        this.updateStart = start * type.BYTES_PER_ELEMENT;

        this.needsUpdate = true;
    };

    this.delete = function(){
        buffersUsed[bufferIndex] = 0;
    };
};
