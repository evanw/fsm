function Startedge(vertex, start) {
    this.vertex = vertex;
    this.deltaX = 0;
    this.deltaY = 0;
    this.text = '';
    this.direction = 0;//in = -1, none = 0, out =  1

    if(start) {
        this.setAnchorPoint(start.x, start.y);
    }
}

Startedge.prototype.setAnchorPoint = function(x, y) {
    this.deltaX = x - this.vertex.x;
    this.deltaY = y - this.vertex.y;

    if(Math.abs(this.deltaX) < snapToPadding) {
        this.deltaX = 0;
    }

    if(Math.abs(this.deltaY) < snapToPadding) {
        this.deltaY = 0;
    }
};

Startedge.prototype.getEndPoints = function() {
    var startX = this.vertex.x + this.deltaX;
    var startY = this.vertex.y + this.deltaY;
    var end = this.vertex.closestPointOnCircle(startX, startY);
    return {
        'startX': startX,
        'startY': startY,
        'endX': end.x,
        'endY': end.y,
    };
};

Startedge.prototype.draw = function(c) {
    var stuff = this.getEndPoints();

    // draw the line
    c.beginPath();
    c.moveTo(stuff.startX, stuff.startY);
    c.lineTo(stuff.endX, stuff.endY);
    c.stroke();

    // draw the text at the end without the arrow
    var textAngle = Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX);
    drawText(c, this.text, stuff.startX, stuff.startY, textAngle, selectedObject == this);

    switch (this.direction) {//direction-dependence switch:
        case -1://point toward the vertex, aka: in
            drawArrow(c, stuff.endX, stuff.endY, Math.atan2(-this.deltaY, -this.deltaX));
            break;
        case 0://non-directed edge
            //no arrow-head needed
            break;
        case 1://point away from the vertex, aka: out
            drawArrow(c, stuff.startX, stuff.startY, Math.atan2(this.deltaY, this.deltaX));
            break;
    }//end of direction-dependence switch:
};

Startedge.prototype.containsPoint = function(x, y) {
    var stuff = this.getEndPoints();
    var dx = stuff.endX - stuff.startX;
    var dy = stuff.endY - stuff.startY;
    var length = Math.sqrt(dx*dx + dy*dy);
    var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
    var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
    return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
};
