function Selfedge(vertex, mouse) {
    this.vertex = vertex;
    this.anchorAngle = 0;
    this.mouseOffsetAngle = 0;
    this.text = '';
    this.direction = 0;//clockwise = -1, none = 0, counter-clockwise = 1

    if(mouse) {
        this.setAnchorPoint(mouse.x, mouse.y);
    }
}

Selfedge.prototype.setMouseStart = function(x, y) {
    this.mouseOffsetAngle = this.anchorAngle - Math.atan2(y - this.vertex.y, x - this.vertex.x);
};

Selfedge.prototype.setAnchorPoint = function(x, y) {
    this.anchorAngle = Math.atan2(y - this.vertex.y, x - this.vertex.x) + this.mouseOffsetAngle;
    // snap to 90 degrees
    var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
    if(Math.abs(this.anchorAngle - snap) < 0.1) this.anchorAngle = snap;
    // keep in the range -pi to pi so our containsPoint() function always works
    if(this.anchorAngle < -Math.PI) this.anchorAngle += 2 * Math.PI;
    if(this.anchorAngle > Math.PI) this.anchorAngle -= 2 * Math.PI;
};

Selfedge.prototype.getEndPointsAndCircle = function() {
    var circleX = this.vertex.x + 1.5 * this.vertex.radius * Math.cos(this.anchorAngle);
    var circleY = this.vertex.y + 1.5 * this.vertex.radius * Math.sin(this.anchorAngle);
    var circleRadius = 0.75 * this.vertex.radius;
    var startAngle = this.anchorAngle - Math.PI * 0.8;
    var endAngle = this.anchorAngle + Math.PI * 0.8;
    var startX = circleX + circleRadius * Math.cos(startAngle);
    var startY = circleY + circleRadius * Math.sin(startAngle);
    var endX = circleX + circleRadius * Math.cos(endAngle);
    var endY = circleY + circleRadius * Math.sin(endAngle);
    return {
        'hasCircle': true,
        'startX': startX,
        'startY': startY,
        'endX': endX,
        'endY': endY,
        'startAngle': startAngle,
        'endAngle': endAngle,
        'circleX': circleX,
        'circleY': circleY,
        'circleRadius': circleRadius
    };
};

Selfedge.prototype.draw = function(c) {
    var stuff = this.getEndPointsAndCircle();
    // draw arc
    c.beginPath();
    c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, false);
    c.stroke();
    // draw the text on the loop farthest from the vertex
    var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
    var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
    drawText(c, this.text, textX, textY, this.anchorAngle, selectedObject == this);

    switch (this.direction) {//direction-dependence switch:
        case -1://vertexA->vertexB
            drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
            break;
        case 0://non-directed edge
            //no arrow-head needed
            break;
        case 1://vertexB->vertexA
            drawArrow(c, stuff.startX, stuff.startY, stuff.endAngle);
            break;
    }//end of direction-dependence switch:
};

Selfedge.prototype.containsPoint = function(x, y) {
    var stuff = this.getEndPointsAndCircle();
    var dx = x - stuff.circleX;
    var dy = y - stuff.circleY;
    var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
    return (Math.abs(distance) < hitTargetPadding);
};
