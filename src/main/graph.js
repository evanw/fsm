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
