function Edge(a, b) {
    this.vertexA = a;
    this.vertexB = b;
    this.text = '';
    this.direction = 0;//vertexA->vertexB -1, 0, 1 vertexB->vertexA
    this.lineAngleAdjust = 0; // value to add to textAngle when edge is straight line

    // make anchor point relative to the locations of vertexA and vertexB
    this.parallelPart = 0.5; // percentage from vertexA to vertexB
    this.perpendicularPart = 0; // pixels from line between vertexA and vertexB
}

Edge.prototype.getAnchorPoint = function() {
    var dx = this.vertexB.x - this.vertexA.x;
    var dy = this.vertexB.y - this.vertexA.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    return {
        'x': this.vertexA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
        'y': this.vertexA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
    };
};

Edge.prototype.setAnchorPoint = function(x, y) {
    var dx = this.vertexB.x - this.vertexA.x;
    var dy = this.vertexB.y - this.vertexA.y;
    var scale = Math.sqrt(dx * dx + dy * dy);
    this.parallelPart = (dx * (x - this.vertexA.x) + dy * (y - this.vertexA.y)) / (scale * scale);
    this.perpendicularPart = (dx * (y - this.vertexA.y) - dy * (x - this.vertexA.x)) / scale;
    // snap to a straight line
    if(this.parallelPart > 0 && this.parallelPart < 1 && Math.abs(this.perpendicularPart) < snapToPadding) {
        this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
        this.perpendicularPart = 0;
    }
};

Edge.prototype.getEndPointsAndCircle = function() {
    if(this.perpendicularPart == 0) {
        var midX = (this.vertexA.x + this.vertexB.x) / 2;
        var midY = (this.vertexA.y + this.vertexB.y) / 2;
        var start = this.vertexA.closestPointOnCircle(midX, midY);
        var end = this.vertexB.closestPointOnCircle(midX, midY);
        return {
            'hasCircle': false,
            'startX': start.x,
            'startY': start.y,
            'endX': end.x,
            'endY': end.y,
        };
    }
    var anchor = this.getAnchorPoint();
    var circle = circleFromThreePoints(this.vertexA.x, this.vertexA.y, this.vertexB.x, this.vertexB.y, anchor.x, anchor.y);
    var isReversed = (this.perpendicularPart > 0);
    var reverseScale = isReversed ? 1 : -1;

    var radiusA = this.vertexA.radius;
    var radiusB = this.vertexB.radius;
    var startAngle = Math.atan2(this.vertexA.y - circle.y, this.vertexA.x - circle.x) - reverseScale * radiusA / circle.radius;
    var endAngle = Math.atan2(this.vertexB.y - circle.y, this.vertexB.x - circle.x) + reverseScale * radiusB / circle.radius;
    var startX = circle.x + circle.radius * Math.cos(startAngle);
    var startY = circle.y + circle.radius * Math.sin(startAngle);
    var endX = circle.x + circle.radius * Math.cos(endAngle);
    var endY = circle.y + circle.radius * Math.sin(endAngle);
    return {
        'hasCircle': true,
        'startX': startX,
        'startY': startY,
        'endX': endX,
        'endY': endY,
        'startAngle': startAngle,
        'endAngle': endAngle,
        'circleX': circle.x,
        'circleY': circle.y,
        'circleRadius': circle.radius,
        'reverseScale': reverseScale,
        'isReversed': isReversed,
    };
};

Edge.prototype.draw = function(c) {
    var stuff = this.getEndPointsAndCircle();

    // draw arc
    c.beginPath();
    if(stuff.hasCircle) {
        c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, stuff.isReversed);
    } else {
        c.moveTo(stuff.startX, stuff.startY);
        c.lineTo(stuff.endX, stuff.endY);
    }
    c.stroke();

    // draw the head of the arrow
    if(stuff.hasCircle) {//not exactly sure where this has an effect in the image
        drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
    } else {//draw regular edges:
        switch (this.direction) {//direction-dependence switch:
            case -1://vertexA->vertexB
                drawArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
                break;
            case 0://non-directed edge
                //no arrow-head needed
                break;
            case 1://vertexB->vertexA
                drawArrow(c, stuff.startX, stuff.startY, Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX));
                break;
        }//end of direction-dependence switch:
    }//end of arrowhead drawing conditional blocks

    // draw the text
    if(stuff.hasCircle) {
        var startAngle = stuff.startAngle;
        var endAngle = stuff.endAngle;
        if(endAngle < startAngle) {
            endAngle += Math.PI * 2;
        }
        var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
        var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
        var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
        drawText(c, this.text, textX, textY, textAngle, selectedObject == this);
    } else {
        var textX = (stuff.startX + stuff.endX) / 2;
        var textY = (stuff.startY + stuff.endY) / 2;
        var textAngle = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY);
        drawText(c, this.text, textX, textY, textAngle + this.lineAngleAdjust, selectedObject == this);
    }
};

Edge.prototype.containsPoint = function(x, y) {
    var stuff = this.getEndPointsAndCircle();
    if(stuff.hasCircle) {
        var dx = x - stuff.circleX;
        var dy = y - stuff.circleY;
        var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
        if(Math.abs(distance) < hitTargetPadding) {
            var angle = Math.atan2(dy, dx);
            var startAngle = stuff.startAngle;
            var endAngle = stuff.endAngle;
            if(stuff.isReversed) {
                var temp = startAngle;
                startAngle = endAngle;
                endAngle = temp;
            }
            if(endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            if(angle < startAngle) {
                angle += Math.PI * 2;
            } else if(angle > endAngle) {
                angle -= Math.PI * 2;
            }
            return (angle > startAngle && angle < endAngle);
        }
    } else {
        var dx = stuff.endX - stuff.startX;
        var dy = stuff.endY - stuff.startY;
        var length = Math.sqrt(dx*dx + dy*dy);
        var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
        var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
        return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
    }
    return false;
};
