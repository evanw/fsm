function Node(x, y) {
    this.x = x;
    this.y = y;
    this.mouseOffsetX = 0;
    this.mouseOffsetY = 0;
    this.isAcceptState = false;
    this.text = '';
    this.outputs = {}

    this.json_model = {};

}

Node.prototype.getJson = function () {
    if (!this.isAcceptState)
        return {...this.json_model, "name": this.text, "outputs": this.outputs, "isAcceptState": false,}
    else
        return {...this.json_model, "name": this.text, "outputs": this.outputs, "isAcceptState": true}
}


Node.prototype.setJsonModel = function (json) {
    if (json.hasOwnProperty('outputs')) {
        this.outputs = json.outputs;
    }
    if (json.hasOwnProperty('name')) {
        this.text = json.name
    }
    if (json.hasOwnProperty('acceptState')) {
        this.isAcceptState = json.acceptState
    }

    this.json_model = json
}


Node.prototype.setMouseStart = function (x, y) {
    this.mouseOffsetX = this.x - x;
    this.mouseOffsetY = this.y - y;
};

Node.prototype.setAnchorPoint = function (x, y) {
    this.x = x + this.mouseOffsetX;
    this.y = y + this.mouseOffsetY;
};

Node.prototype.draw = function (c, mode) {
    // draw the circle
    c.beginPath();
    c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
    stroke_theme_based(c, mode)

    // draw the text
    drawText(c, this.text, this.x, this.y, null, selectedObject === this);

    // draw a double circle for an accept state
    if (this.isAcceptState) {
        c.beginPath();
        c.arc(this.x, this.y, nodeRadius - 6, 0, 2 * Math.PI, false);
        stroke_theme_based(c, mode)
    }
};

Node.prototype.closestPointOnCircle = function (x, y) {
    var dx = x - this.x;
    var dy = y - this.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    return {
        'x': this.x + dx * nodeRadius / scale,
        'y': this.y + dy * nodeRadius / scale,
    };
};

Node.prototype.containsPoint = function (x, y) {
    return (x - this.x) * (x - this.x) + (y - this.y) * (y - this.y) < nodeRadius * nodeRadius;
};
