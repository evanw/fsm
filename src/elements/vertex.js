function Vertex(x, y) {
    this.x = x;
    this.y = y;
    this.mouseOffsetX = 0;
    this.mouseOffsetY = 0;
    this.isAcceptState = false;
    this.radius = defaultRadius;//
    this.text = '';
}

Vertex.prototype.setMouseStart = function(x, y) {
    this.mouseOffsetX = this.x - x;
    this.mouseOffsetY = this.y - y;
};

Vertex.prototype.setAnchorPoint = function(x, y) {
    this.x = x + this.mouseOffsetX;
    this.y = y + this.mouseOffsetY;
};

Vertex.prototype.draw = function(c) {
    // draw the circle
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    c.stroke();

    // draw the text
    drawText(c, this.text, this.x, this.y, null, selectedObject == this);

    // draw a double circle for an accept state
    if(this.isAcceptState) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius - 6, 0, 2 * Math.PI, false);
        c.stroke();
    }
};

Vertex.prototype.closestPointOnCircle = function(x, y) {
    var dx = x - this.x;
    var dy = y - this.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    return {
        'x': this.x + dx * this.radius / scale,
        'y': this.y + dy * this.radius / scale,
    };
};

Vertex.prototype.containsPoint = function(x, y) {
    return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < this.radius*this.radius;
};

Node.prototype.containsPoint = function(x, y) {
	return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
};
