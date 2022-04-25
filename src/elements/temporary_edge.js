function Temporaryedge(from, to) {
    this.from = from;
    this.to = to;
}

Temporaryedge.prototype.draw = function(c) {
    // draw the line
    c.beginPath();
    c.moveTo(this.to.x, this.to.y);
    c.lineTo(this.from.x, this.from.y);
    c.stroke();

    // draw the head of the arrow when a new edge is being drawn
    //drawArrow(c, this.to.x, this.to.y, Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x));
};
