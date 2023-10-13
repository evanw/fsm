// draw using this instead of a canvas and call toLaTeX() afterward
function ExportAsLaTeX() {
    this._points = [];
    this._texData = '';
    this._scale = 0.1; // to convert pixels to document space (TikZ breaks if the numbers get too big, above 500?)

    this.toLaTeX = function () {
        return '\\documentclass[12pt]{article}\n' +
            '\\usepackage{tikz}\n' +
            '\n' +
            '\\begin{document}\n' +
            '\n' +
            '\\begin{center}\n' +
            '\\begin{tikzpicture}[scale=0.2]\n' +
            '\\tikzstyle{every node}+=[inner sep=0pt]\n' +
            this._texData +
            '\\end{tikzpicture}\n' +
            '\\end{center}\n' +
            '\n' +
            '\\end{document}\n';
    };

    this.beginPath = function () {
        this._points = [];
    };
    this.arc = function (x, y, radius, startAngle, endAngle, isReversed) {
        x *= this._scale;
        y *= this._scale;
        radius *= this._scale;
        if (endAngle - startAngle == Math.PI * 2) {
            this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x, 3) + ',' + fixed(-y, 3) + ') circle (' + fixed(radius, 3) + ');\n';
        } else {
            if (isReversed) {
                var temp = startAngle;
                startAngle = endAngle;
                endAngle = temp;
            }
            if (endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            // TikZ needs the angles to be in between -2pi and 2pi or it breaks
            if (Math.min(startAngle, endAngle) < -2 * Math.PI) {
                startAngle += 2 * Math.PI;
                endAngle += 2 * Math.PI;
            } else if (Math.max(startAngle, endAngle) > 2 * Math.PI) {
                startAngle -= 2 * Math.PI;
                endAngle -= 2 * Math.PI;
            }
            startAngle = -startAngle;
            endAngle = -endAngle;
            this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x + radius * Math.cos(startAngle), 3) + ',' + fixed(-y + radius * Math.sin(startAngle), 3) + ') arc (' + fixed(startAngle * 180 / Math.PI, 5) + ':' + fixed(endAngle * 180 / Math.PI, 5) + ':' + fixed(radius, 3) + ');\n';
        }
    };
    this.moveTo = this.lineTo = function (x, y) {
        x *= this._scale;
        y *= this._scale;
        this._points.push({'x': x, 'y': y});
    };
    this.stroke = function () {
        if (this._points.length == 0) return;
        this._texData += '\\draw [' + this.strokeStyle + ']';
        for (var i = 0; i < this._points.length; i++) {
            var p = this._points[i];
            this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
        }
        this._texData += ';\n';
    };
    this.fill = function () {
        if (this._points.length == 0) return;
        this._texData += '\\fill [' + this.strokeStyle + ']';
        for (var i = 0; i < this._points.length; i++) {
            var p = this._points[i];
            this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
        }
        this._texData += ';\n';
    };
    this.measureText = function (text) {
        var c = canvas.getContext('2d');
        c.font = '20px "Times New Romain", serif';
        return c.measureText(text);
    };
    this.advancedFillText = function (text, originalText, x, y, angleOrNull) {
        if (text.replace(' ', '').length > 0) {
            var nodeParams = '';
            // x and y start off as the center of the text, but will be moved to one side of the box when angleOrNull != null
            if (angleOrNull != null) {
                var width = this.measureText(text).width;
                var dx = Math.cos(angleOrNull);
                var dy = Math.sin(angleOrNull);
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0) nodeParams = '[right] ', x -= width / 2;
                    else nodeParams = '[left] ', x += width / 2;
                } else {
                    if (dy > 0) nodeParams = '[below] ', y -= 10;
                    else nodeParams = '[above] ', y += 10;
                }
            }
            x *= this._scale;
            y *= this._scale;
            this._texData += '\\draw (' + fixed(x, 2) + ',' + fixed(-y, 2) + ') node ' + nodeParams + '{$' + originalText.replace(/ /g, '\\mbox{ }') + '$};\n';
        }
    };

    this.translate = this.save = this.restore = this.clearRect = function () {
    };
}
