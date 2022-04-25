var greekLetterNames = [
    'Alpha', 'Beta', 'Gamma', 'Delta',
    'Epsilon', 'Zeta', 'Eta', 'Theta',
    'Iota', 'Kappa', 'Lambda', 'Mu',
    'Nu', 'Xi', 'Omicron', 'Pi',
    'Rho', 'Sigma', 'Tau', 'Upsilon',
    'Phi', 'Chi', 'Psi', 'Omega' ];

var caretTimer;
var caretVisible = true;
var graph = document.getElementById('graph');
var radiusDisp = document.getElementById('radiusDisp');
var radiusCtx = radiusDisp.getContext('2d');
var radiAdjSlide = document.getElementById('radiadjst');
var radiNumBox = document.getElementById('radinum');
var defaultRadius = 30;
var lastRadius = defaultRadius;
var tempRadius = lastRadius;
var vertices = [];
var edges = [];
var minRadius = 5;
var maxRadius = 100;
var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a edge or a Vertex
var currentedge = null; // a edge
var movingObject = false;
var originalClick;
var mouseDown = false;

function convertLatexShortcuts(text) {
    // html greek characters
    for(var i = 0; i < greekLetterNames.length; i++) {
        var name = greekLetterNames[i];
        text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
        text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
    }
    // subscripts
    for(var i = 0; i < 10; i++) {
        text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
    }
    return text;
}//end of convertLatexShortcuts()

function textToXML(text) {
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var result = '';
    for(var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if(c >= 0x20 && c <= 0x7E) {
            result += text[i];
        } else {
            result += '&#' + c + ';';
        }
    }
    return result;
}//end of textToXML()

function drawArrow(c, x, y, angle) {
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
    c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
    c.fill();
}//end of drawArrow()

function canvasHasFocus() {
    return (document.activeElement || document.body) == document.body;
}//end of canvasHasFocus()

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
    text = convertLatexShortcuts(originalText);
    c.font = '20px "Times New Roman", serif';
    var width = c.measureText(text).width;

    // center the text
    x -= width / 2;

    // position the text intelligently if given an angle
    if(angleOrNull != null) {
        var cos = Math.cos(angleOrNull);
        var sin = Math.sin(angleOrNull);
        var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
        var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
        var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
        x += cornerPointX - sin * slide;
        y += cornerPointY + cos * slide;
    }

    // draw text and caret (round the coordinates so the caret falls on a pixel)
    if('advancedFillText' in c) {
        c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
    } else {
        x = Math.round(x);
        y = Math.round(y);
        c.fillText(text, x, y + 6);
        if(isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
            x += width;
            c.beginPath();
            c.moveTo(x, y - 10);
            c.lineTo(x, y + 10);
            c.stroke();
        }
    }
}//end of drawText()

function resetCaret() {
    clearInterval(caretTimer);
    caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
    caretVisible = true;
}//end of resetCaret()

function drawUsing(c) {//c === exporter
    c.clearRect(0, 0, graph.width, graph.height);
    c.save();
    c.translate(0.5, 0.5);

    for(var i = 0; i < vertices.length; i++) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = (vertices[i] == selectedObject) ? 'blue' : 'black';
        vertices[i].draw(c);
    }
    for(var i = 0; i < edges.length; i++) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = (edges[i] == selectedObject) ? 'blue' : 'black';
        edges[i].draw(c);
    }
    if(currentedge != null) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = 'black';
        currentedge.draw(c);
    }

    c.restore();
}//end of drawUsing()

function draw() {
    drawUsing(graph.getContext('2d'));
    saveBackup();
}//end of draw()

function selectObject(x, y) {
    for(var i = 0; i < vertices.length; i++) {
        if(vertices[i].containsPoint(x, y)) {
            return vertices[i];
        }
    }
    for(var i = 0; i < edges.length; i++) {
        if(edges[i].containsPoint(x, y)) {
            return edges[i];
        }
    }
    return null;
}//end of selectObject()

function snapVertex(vertex) {
    for(var i = 0; i < vertices.length; i++) {
        if(vertices[i] == vertex) continue;
        if(Math.abs(vertex.x - vertices[i].x) < snapToPadding) {
            vertex.x = vertices[i].x;
        }
        if(Math.abs(vertex.y - vertices[i].y) < snapToPadding) {
            vertex.y = vertices[i].y;
        }
    }
}//end of snapVertex()

function updateRadAdj() {
    radiNumBox.value = lastRadius;//update numerical rep of radius
    radiusDisp.getContext('2d').clearRect(0, 0, maxRadius * 2, maxRadius * 2);//clear canvas

    radiusCtx.beginPath();
    radiusCtx.arc(maxRadius, maxRadius, lastRadius, 0, 2 * Math.PI, false);
    radiusCtx.stroke();

    //TODO: update slider position
    radiAdjSlide.value = lastRadius;

    if (selectedObject instanceof Vertex) {//if a vertex is already selected
        selectedObject.radius = lastRadius;//also adjust it's radius
    }

    graph.focus();//give focus back to primary canvas element
}//end of updateRadAdj()

function radiusClamp(proposed) {
    return Math.max(Math.min(proposed, maxRadius), minRadius);
}//end of radiusClamp()

function radiusCheckNChange(r) {
    if (!isNaN(r)){//if r is Not-Not-a-Number, aka: a number
        lastRadius = radiusClamp(r);//update lastRadius
        updateRadAdj();//re-plot Radius Adjustment element
        draw();//re-draw both canvas elements
    }
}//end of radiusCheckNChange()

function radAdjBoxUpdate() {//called when user presses enter inside of the radius numerical box
    radiusCheckNChange(radiNumBox.value);
}//end of radAdjBoxUpdate()

window.onload = function() {
    radiAdjSlide.min=minRadius;
    radiAdjSlide.max=maxRadius;

    updateRadAdj();
    graph = document.getElementById('graph');
    graph.focus();
    if (localStorage.getItem("hasCodeRunBefore") === null) {//check if this is first time function has been called
        localStorage.setItem("hasCodeRunBefore", true);
    } else {
        restoreBackup();
    }
    draw();

    radiAdjSlide.addEventListener('input', (e)=>{//create an event listener for user-adjustable slider
        lastRadius = radiusClamp(e.target.value);
        updateRadAdj();
        draw();//re-draw both canvas elements
    });//end of radiAdjSlide.input()

    graph.onmousedown = function(e) {
        var mouse = crossBrowserRelativeMousePos(e);
        mouseDown = true;
        selectedObject = selectObject(mouse.x, mouse.y);
        if (!e.altKey) {//if alt isn't held when mouse is clicked
            movingObject = false;
            originalClick = mouse;
            if (selectedObject instanceof Vertex) {
                if (lastRadius != selectedObject.radius) {
                    lastRadius = radiusClamp(selectedObject.radius);
                    updateRadAdj();
                    draw();
                }//end of lastRadius conditional block
            }//end of if selectedObject is Vertex block
        }//end of if !e.altKey block

        if (selectedObject != null) {//if mouse click selects an element:
            if (selectedObject instanceof Vertex) {//vertices
                movingObject = false;
                if (e.shiftKey){//shift select a vertex
                    currentedge = new Selfedge(selectedObject, mouse);
                } else if (e.altKey) {//alt-select a vertex
                    if (selectedObject.radius != lastRadius) {
                        selectedObject.radius = lastRadius;//snap vertex radius to lastRadius
                        updateRadAdj();
                    }
                } else {
                    movingObject = true;
                }
            } else {//non-vertices, aka: edges
                movingObject = true;
                deltaMouseX = deltaMouseY = 0;
                if(selectedObject.setMouseStart) {
                    selectedObject.setMouseStart(mouse.x, mouse.y);
                }
            }
            resetCaret();//??make lable editable-mode
        } else if (e.shiftKey) {//no element selected, shift key held
            currentedge = new Temporaryedge(mouse, mouse);//draW new "start" edge
        } else if (e.altKey) {//no element selected, alt key held
            //nothing to do for selectedObject === null + alt key pressed
        }

        draw();

        if(canvasHasFocus()) {
            // disable drag-and-drop only if the canvas is already focused
            return false;
        } else {
            // otherwise, let the browser switch the focus away from wherever it was
            resetCaret();
            return true;
        }
    };//end of graph.onmousedown()

    graph.onmousemove = function(e) {
        var mouse = crossBrowserRelativeMousePos(e);

        if(currentedge != null) {
            var targetVertex = selectObject(mouse.x, mouse.y);
            if (!(targetVertex instanceof Vertex)) {
                targetVertex = null;
            }

            if (selectedObject == null) {
                    if (targetVertex != null) {
                        currentedge = new Startedge(targetVertex, originalClick);
                    } else {
                        currentedge = new Temporaryedge(originalClick, mouse);
                    }
            } else {//if selectedObject has an object:
                if (targetVertex == selectedObject) {
                    currentedge = new Selfedge(selectedObject, mouse);
                } else if (targetVertex != null) {
                    currentedge = new Edge(selectedObject, targetVertex);
                } else {
                    currentedge = new Temporaryedge(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
                }
            }
            draw();
        }//end of edge section

        /*if (e.altKey && mouseDown) {
            //TODO: bulk-select -> change radii
        }//end of alt key block*/

        if(movingObject) {
            selectedObject.setAnchorPoint(mouse.x, mouse.y);
            if(selectedObject instanceof Vertex) {
                snapVertex(selectedObject);
            }
            draw();
        }
    };//end of graph.onmousemove()

    graph.onmouseup = function(e) {
        movingObject = false;
        mouseDown = false;
        if(currentedge != null) {
            if(!(currentedge instanceof Temporaryedge)) {
                selectedObject = currentedge;
                edges.push(currentedge);
                resetCaret();
            }
            currentedge = null;
            draw();
        }
        if (e.altKey) {
            //TODO: bulk-select -> change radii
        }
    };//end of graph.onmouseup()

    graph.ondblclick = function(e) {
        var mouse = crossBrowserRelativeMousePos(e);
        selectedObject = selectObject(mouse.x, mouse.y);

        if(selectedObject == null) {
            selectedObject = new Vertex(mouse.x, mouse.y);
            if (lastRadius != null) {
                selectedObject.radius = lastRadius;
            } else {
                selectedObject.radius = defaultRadius;
            }

            vertices.push(selectedObject);
            resetCaret();
            draw();
        } else if(selectedObject instanceof Vertex) {
            selectedObject.isAcceptState = !selectedObject.isAcceptState;//toggle vertex.isAcceptState boolean value
            draw();
        } else {
            if(selectedObject instanceof Edge) {//regular edges
                selectedObject.direction = selectedObject.direction === -1 ? 1 : selectedObject.direction - 1;
            } else if (selectedObject instanceof Selfedge) {//loop-back edges
                selectedObject.direction = selectedObject.direction === -1 ? 1 : selectedObject.direction - 1;
            } else if (selectedObject instanceof Startedge) {//start state indicators
                selectedObject.direction = selectedObject.direction === -1 ? 1 : selectedObject.direction - 1;
            }

            draw();
        }//end of selectedObject handling blocks
    };//end of graph.ondblclick()
}//end of window.onload()

document.onkeydown = function(e) {
    var key = crossBrowserKey(e);

    if(!canvasHasFocus()) {
        // don't read keystrokes when other things have focus
        return true;
    } else if(key == 8) { // backspace key
        if(selectedObject != null && 'text' in selectedObject) {
            selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
            resetCaret();
            draw();
        }
        // backspace is a shortcut for the back button, but do NOT want to change pages
        return false;
    } else if(key == 46) { // delete key
        if(selectedObject != null) {
            for(var i = 0; i < vertices.length; i++) {
                if(vertices[i] == selectedObject) {
                    vertices.splice(i--, 1);
                }
            }
            for(var i = 0; i < edges.length; i++) {
                if(edges[i] == selectedObject || edges[i].vertex == selectedObject || edges[i].vertexA == selectedObject || edges[i].vertexB == selectedObject) {
                    edges.splice(i--, 1);
                }
            }
            selectedObject = null;
            draw();
        }//end of non-null selectedObject handling
    //} else if () {
    //    console.log("just key press");
    }//end of graph-focused key-press handling
};//end of document.onkeydown()

document.onkeyup = function(e) {
    var key = crossBrowserKey(e);

    if(key == null) {
        //do something
    }
};//end of document.onkeyup()

document.onkeypress = function(e) {
    // don't read keystrokes when other things have focus
    var key = crossBrowserKey(e);
    if(!canvasHasFocus()) {
        // don't read keystrokes when other things have focus
        return true;
    } else if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.altKey && selectedObject != null && 'text' in selectedObject) {
        selectedObject.text += String.fromCharCode(key);
        resetCaret();
        draw();

        // don't let keys do their actions (like space scrolls down the page)
        return false;
    } else if(key == 8) {
        // backspace is a shortcut for the back button, but do NOT want to change pages
        return false;
    }
};//end of document.onkeypress()

function crossBrowserKey(e) {
    e = e || window.event;
    return e.which || e.keyCode;
}//end of crossBrowserKey()

function crossBrowserElementPos(e) {
    e = e || window.event;
    var obj = e.target || e.srcElement;
    var x = 0, y = 0;
    while(obj.offsetParent) {
        x += obj.offsetLeft;
        y += obj.offsetTop;
        obj = obj.offsetParent;
    }
    return { 'x': x, 'y': y };
}//end of crossBrowserElementPos()

function crossBrowserMousePos(e) {
    e = e || window.event;
    return {
        'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
        'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
    };
}//end of crossBrowserMousePos()

function crossBrowserRelativeMousePos(e) {
    var element = crossBrowserElementPos(e);
    var mouse = crossBrowserMousePos(e);
    return {
        'x': mouse.x - element.x,
        'y': mouse.y - element.y
    };
}//end of crossBrowserRelativeMousePos()

function output(text) {
    var element = document.getElementById('output');
    element.style.display = 'block';
    element.value = text;
}//end of output()

function writeToFile() {
    var filename = "";

    while (filename === "") {//don't accept empty file-name
        filename = prompt("Please provide a filename\nfor saving your graph:", "");
    }
    if (filename != null) {//as long as user hasn't clicked cancel
        filename += ".grph"//expected file extension for graphs
        var downloadedge = document.createElement('a');//as in <a href=...>
        downloadedge.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(localStorage['graph']));
        downloadedge.setAttribute('download', filename);//make a download event

        if (document.createEvent) {
            var event = new MouseEvent('click', {/* current way of clicking a programatically generated link: */
                view: window,
                bubbles: true,
                cancelable: true
            });

            downloadedge.dispatchEvent(event);//dispatch mouse event
        } else {
            downloadedge.click();//activate downloadedge
        }
    }//end of 'save not cancled' block
}//end of writeToFile()

function clearGraph() {
    localStorage['graph'] = '{"lastRadius":' + lastRadius + ',"vertices":[],"edges":[]}';//reset our graph object
    vertices = [];//brand new lists
    edges = [];
    graph.getContext('2d').clearRect(0, 0, graph.width, graph.height);//clear graph
}//end of clearGraph()

function loadFile() {
    var file;
    var reader = new FileReader();
    var input = document.createElement('input');

    input.type = 'file';
    input.accept=".grph";
    input.onchange = e => {
        file = e.target.files[0];

        reader.readAsText(file, 'UTF-8');
        reader.onload = readerEvent => {
            vertices = []//brand new lists
            edges = []
            localStorage['graph'] = readerEvent.target.result;//load graph into virtual local storage
            restoreBackup();//fill vertices and edges lists
            drawUsing(graph.getContext('2d'));//redraw graph
        }//end of reader.onload()
    }//end of input.onchange function assignment
    input.click();//activates input.onchange event
}//end of loadFile()

function saveAsPNG() {
    var oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(graph.getContext('2d'));
    selectedObject = oldSelectedObject;
    var pngData = graph.toDataURL('image/png');
    document.location.href = pngData;
}//end of saveAsPNG()

function saveAsSVG() {
    var exporter = new ExportAsSVG();
    var oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(exporter);
    selectedObject = oldSelectedObject;
    var svgData = exporter.toSVG();
    output(svgData);
}//end of saveAsSVG()

function saveAsLaTeX() {
    var exporter = new ExportAsLaTeX();
    var oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(exporter);
    selectedObject = oldSelectedObject;
    var texData = exporter.toLaTeX();
    output(texData);
}//end of saveAsLaTeX()

function restoreBackup() {
    if(!localStorage || !JSON) {
        return;
    }

    try {
        var backup = JSON.parse(localStorage['graph']);//custom format generator here

        lastRadius = radiusClamp(backup.lastRadius);//we try to keep track of what the last vertex radius used was
        updateRadAdj();//update radius adjustment canvas
        //TODO: may need next line, test
        //draw();//redraw both canvases

        localStorage.setItem("hasCodeRunBefore", true);

        for(var i = 0; i < backup.vertices.length; i++) {
            var backupVertex = backup.vertices[i];
            var vertex = new Vertex(backupVertex.x, backupVertex.y);
            vertex.isAcceptState = backupVertex.isAcceptState;
            vertex.text = backupVertex.text;
            vertex.radius = Number(backupVertex.radius);
            vertices.push(vertex);
        }
        for(var i = 0; i < backup.edges.length; i++) {
            var backupedge = backup.edges[i];
            var edge = null;
            if(backupedge.type == 'Selfedge') {
                edge = new Selfedge(vertices[backupedge.vertex]);
                edge.anchorAngle = backupedge.anchorAngle;
                edge.text = backupedge.text;
                edge.direction = backupedge.direction
            } else if(backupedge.type == 'Startedge') {
                edge = new Startedge(vertices[backupedge.vertex]);
                edge.deltaX = backupedge.deltaX;
                edge.deltaY = backupedge.deltaY;
                edge.text = backupedge.text;
                edge.direction = backupedge.direction
            } else if(backupedge.type == 'Edge') {
                edge = new Edge(vertices[backupedge.vertexA], vertices[backupedge.vertexB]);
                edge.parallelPart = backupedge.parallelPart;
                edge.perpendicularPart = backupedge.perpendicularPart;
                edge.text = backupedge.text;
                edge.direction = backupedge.direction
                edge.lineAngleAdjust = backupedge.lineAngleAdjust;
            }
            if(edge != null) {
                edges.push(edge);
            }
        }
    } catch(e) {
        localStorage['graph'] = '';
    }
}//end of restoreBackup()

function saveBackup() {
    if(!localStorage || !JSON) {
        return;
    }

    var backup = {
        'lastRadius': lastRadius,
        'vertices': [],
        'edges': [],
    };
    //backup.lastRadius = lastRadius

    for(var i = 0; i < vertices.length; i++) {
        var vertex = vertices[i];
        var backupVertex = {
            'x': vertex.x,
            'y': vertex.y,
            'text': vertex.text,
            'radius': Number(vertex.radius),
            'isAcceptState': vertex.isAcceptState,
        };//end of backupVertex object
        backup.vertices.push(backupVertex);
    }//end of for vertices loop
    for(var i = 0; i < edges.length; i++) {
        var edge = edges[i];
        var backupedge = null;
        if(edge instanceof Selfedge) {//loop-back transition
            backupedge = {
                'type': 'Selfedge',
                'vertex': vertices.indexOf(edge.vertex),
                'text': edge.text,
                'direction': edge.direction,
                'anchorAngle': edge.anchorAngle,
            };
        } else if(edge instanceof Startedge) {//points to start-state
            backupedge = {
                'type': 'Startedge',
                'vertex': vertices.indexOf(edge.vertex),
                'text': edge.text,
                'direction': edge.direction,
                'deltaX': edge.deltaX,
                'deltaY': edge.deltaY,
            };//TODO: next line triggering "Uncaught TypeError: edge is not a function"
        } else if(edge instanceof Edge) {//points from one state to another
            backupedge = {
                'type': 'Edge',
                'vertexA': vertices.indexOf(edge.vertexA),
                'vertexB': vertices.indexOf(edge.vertexB),
                'text': edge.text,
                'direction': edge.direction,
                'lineAngleAdjust': edge.lineAngleAdjust,
                'parallelPart': edge.parallelPart,
                'perpendicularPart': edge.perpendicularPart,
            };
        }//end of edge-type conditional blocks
        if(backupedge != null) {
            backup.edges.push(backupedge);
        }
    }//end of for edges loop

    //TODO: custom format-loading here
    localStorage['graph'] = JSON.stringify(backup, null, 4);
}//end of saveBackup()

function det(a, b, c, d, e, f, g, h, i) {
    return a*e*i + b*f*g + c*d*h - a*f*h - b*d*i - c*e*g;
}//end of det()

function circleFromThreePoints(x1, y1, x2, y2, x3, y3) {
    var a = det(x1, y1, 1, x2, y2, 1, x3, y3, 1);
    var bx = -det(x1*x1 + y1*y1, y1, 1, x2*x2 + y2*y2, y2, 1, x3*x3 + y3*y3, y3, 1);
    var by = det(x1*x1 + y1*y1, x1, 1, x2*x2 + y2*y2, x2, 1, x3*x3 + y3*y3, x3, 1);
    var c = -det(x1*x1 + y1*y1, x1, y1, x2*x2 + y2*y2, x2, y2, x3*x3 + y3*y3, x3, y3);
    return {
        'x': -bx / (2*a),
        'y': -by / (2*a),
        'radius': Math.sqrt(bx*bx + by*by - 4*a*c) / (2*Math.abs(a))
    };
}//end of circleFromThreePoints()

function fixed(number, digits) {
    return number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}//end of fixed()

// draw using this instead of a canvas and call toLaTeX() afterward
function ExportAsLaTeX() {
    this._points = [];
    this._texData = '';
    this._scale = 0.1; // to convert pixels to document space (TikZ breaks if the numbers get too big, above 500?)

    this.toLaTeX = function() {
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

    this.beginPath = function() {
        this._points = [];
    };
    this.arc = function(x, y, radius, startAngle, endAngle, isReversed) {
        x *= this._scale;
        y *= this._scale;
        radius *= this._scale;
        if(endAngle - startAngle == Math.PI * 2) {
            this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x, 3) + ',' + fixed(-y, 3) + ') circle (' + fixed(radius, 3) + ');\n';
        } else {
            if(isReversed) {
                var temp = startAngle;
                startAngle = endAngle;
                endAngle = temp;
            }
            if(endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            // TikZ needs the angles to be in between -2pi and 2pi or it breaks
            if(Math.min(startAngle, endAngle) < -2*Math.PI) {
                startAngle += 2*Math.PI;
                endAngle += 2*Math.PI;
            } else if(Math.max(startAngle, endAngle) > 2*Math.PI) {
                startAngle -= 2*Math.PI;
                endAngle -= 2*Math.PI;
            }
            startAngle = -startAngle;
            endAngle = -endAngle;
            this._texData += '\\draw [' + this.strokeStyle + '] (' + fixed(x + radius * Math.cos(startAngle), 3) + ',' + fixed(-y + radius * Math.sin(startAngle), 3) + ') arc (' + fixed(startAngle * 180 / Math.PI, 5) + ':' + fixed(endAngle * 180 / Math.PI, 5) + ':' + fixed(radius, 3) + ');\n';
        }
    };
    this.moveTo = this.lineTo = function(x, y) {
        x *= this._scale;
        y *= this._scale;
        this._points.push({ 'x': x, 'y': y });
    };
    this.stroke = function() {
        if(this._points.length == 0) return;
        this._texData += '\\draw [' + this.strokeStyle + ']';
        for(var i = 0; i < this._points.length; i++) {
            var p = this._points[i];
            this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
        }
        this._texData += ';\n';
    };
    this.fill = function() {
        if(this._points.length == 0) return;
        this._texData += '\\fill [' + this.strokeStyle + ']';
        for(var i = 0; i < this._points.length; i++) {
            var p = this._points[i];
            this._texData += (i > 0 ? ' --' : '') + ' (' + fixed(p.x, 2) + ',' + fixed(-p.y, 2) + ')';
        }
        this._texData += ';\n';
    };
    this.measureText = function(text) {
        var c = graph.getContext('2d');
        c.font = '20px "Times New Romain", serif';
        return c.measureText(text);
    };
    this.advancedFillText = function(text, originalText, x, y, angleOrNull) {
        if(text.replace(' ', '').length > 0) {
            var vertexParams = '';
            // x and y start off as the center of the text, but will be moved to one side of the box when angleOrNull != null
            if(angleOrNull != null) {
                var width = this.measureText(text).width;
                var dx = Math.cos(angleOrNull);
                var dy = Math.sin(angleOrNull);
                if(Math.abs(dx) > Math.abs(dy)) {
                    if(dx > 0) vertexParams = '[right] ', x -= width / 2;
                    else vertexParams = '[left] ', x += width / 2;
                } else {
                    if(dy > 0) vertexParams = '[below] ', y -= 10;
                    else vertexParams = '[above] ', y += 10;
                }
            }
            x *= this._scale;
            y *= this._scale;
            this._texData += '\\draw (' + fixed(x, 2) + ',' + fixed(-y, 2) + ') node ' + vertexParams + '{$' + originalText.replace(/ /g, '\\mbox{ }') + '$};\n';
        }
    };

    this.translate = this.save = this.restore = this.clearRect = function(){};
}

// draw using this instead of a canvas and call toSVG() afterward
function ExportAsSVG() {
    this.fillStyle = 'black';
    this.strokeStyle = 'black';
    this.lineWidth = 1;
    this.font = '12px Arial, sans-serif';
    this._points = [];
    this._svgData = '';
    this._transX = 0;
    this._transY = 0;

    this.toSVG = function() {
        return '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n\n<svg width="800" height="600" version="1.1" xmlns="http://www.w3.org/2000/svg">\n' + this._svgData + '</svg>\n';
    };

    this.beginPath = function() {
        this._points = [];
    };
    this.arc = function(x, y, radius, startAngle, endAngle, isReversed) {
        x += this._transX;
        y += this._transY;
        var style = 'stroke="' + this.strokeStyle + '" stroke-width="' + this.lineWidth + '" fill="none"';

        if(endAngle - startAngle == Math.PI * 2) {
            this._svgData += '\t<ellipse ' + style + ' cx="' + fixed(x, 3) + '" cy="' + fixed(y, 3) + '" rx="' + fixed(radius, 3) + '" ry="' + fixed(radius, 3) + '"/>\n';
        } else {
            if(isReversed) {
                var temp = startAngle;
                startAngle = endAngle;
                endAngle = temp;
            }

            if(endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }

            var startX = x + radius * Math.cos(startAngle);
            var startY = y + radius * Math.sin(startAngle);
            var endX = x + radius * Math.cos(endAngle);
            var endY = y + radius * Math.sin(endAngle);
            var useGreaterThan180 = (Math.abs(endAngle - startAngle) > Math.PI);
            var goInPositiveDirection = 1;

            this._svgData += '\t<path ' + style + ' d="';
            this._svgData += 'M ' + fixed(startX, 3) + ',' + fixed(startY, 3) + ' '; // startPoint(startX, startY)
            this._svgData += 'A ' + fixed(radius, 3) + ',' + fixed(radius, 3) + ' '; // radii(radius, radius)
            this._svgData += '0 '; // value of 0 means perfect circle, others mean ellipse
            this._svgData += +useGreaterThan180 + ' ';
            this._svgData += +goInPositiveDirection + ' ';
            this._svgData += fixed(endX, 3) + ',' + fixed(endY, 3); // endPoint(endX, endY)
            this._svgData += '"/>\n';
        }
    };

    this.moveTo = this.lineTo = function(x, y) {
        x += this._transX;
        y += this._transY;
        this._points.push({ 'x': x, 'y': y });
    };//end of this.moveTo()

    this.stroke = function() {
        if(this._points.length == 0) return;
        this._svgData += '\t<polygon stroke="' + this.strokeStyle + '" stroke-width="' + this.lineWidth + '" points="';
        for(var i = 0; i < this._points.length; i++) {
            this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
        }
        this._svgData += '"/>\n';
    };
    this.fill = function() {
        if(this._points.length == 0) return;
        this._svgData += '\t<polygon fill="' + this.fillStyle + '" stroke-width="' + this.lineWidth + '" points="';
        for(var i = 0; i < this._points.length; i++) {
            this._svgData += (i > 0 ? ' ' : '') + fixed(this._points[i].x, 3) + ',' + fixed(this._points[i].y, 3);
        }
        this._svgData += '"/>\n';
    };
    this.measureText = function(text) {
        var c = graph.getContext('2d');
        c.font = '20px "Times New Romain", serif';
        return c.measureText(text);
    };
    this.fillText = function(text, x, y) {
        x += this._transX;
        y += this._transY;
        if(text.replace(' ', '').length > 0) {
            this._svgData += '\t<text x="' + fixed(x, 3) + '" y="' + fixed(y, 3) + '" font-family="Times New Roman" font-size="20">' + textToXML(text) + '</text>\n';
        }
    };
    this.translate = function(x, y) {
        this._transX = x;
        this._transY = y;
    };//end of this.translate()

    this.save = this.restore = this.clearRect = function(){};
}//end of ExportAsSVG()

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
    //TODO: figure out how to get correct radii for next 2 linex      this.vertexA
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
