/* ADDED VARS */
let container;
let editor;
let options;


let in_panel = false;
let in_canvas = false;

let body_saved;


/* MODIFIED FUNCTIONS */
function drawUsing(c) {
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.translate(0.5, 0.5);
    let mode;

    for (let i = 0; i < nodes.length; i++) {
        c.lineWidth = 1;
        mode = (nodes[i] === selectedObject) ? 'focus' : 'normal';
        nodes[i].draw(c, mode);
    }
    for (let i = 0; i < links.length; i++) {
        c.lineWidth = 1;
        mode = (links[i] === selectedObject) ? 'focus' : 'normal';
        links[i].draw(c, mode);
    }
    if (currentLink != null) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = 'black';
        currentLink.draw(c, mode);
    }

    c.restore();
}


function stroke_theme_based(c, mode) {
    if (theme === "dark") {
        if (mode === "normal") {
            c.strokeStyle = "white"
            c.fillStyle = "white"
        } else {
            c.strokeStyle = "#e59c24"
            c.fillStyle = "#e59c24"
        }
    } else {
        if (mode === "normal") {
            c.strokeStyle = "black"
            c.fillStyle = "black"
        } else {
            c.strokeStyle = "#1fc493"
            c.fillStyle = "#1fc493"
        }
    }
    c.stroke();
}


/*EDITOR PROPS*/

function create_json_editor() {
    // create the editor
    container = document.getElementById("jsoneditor")
    options = {
        mode: "tree", mainMenuBar: false, statusBar: false, enableSort: false, enableTransform: false
    }

    editor = new JSONEditor(container, options)
    container.setAttribute("style", `width:${400 * screenRatio}px`)

    // set json
    const initialJson = {
        "name": "exampleName",
        "outputs": {
            "output1": "string_val1",
            "output2": 2
        },
        "isAcceptState": false,

    }
    editor.set(initialJson)

// get json
    editor.expandAll()
}


function set_editor_content(json_content) {
    editor.set(json_content)
    editor.expandAll()
}


function get_editor_content() {
    return editor.get()
}

/* NEW FUNCTIONS */
function check_if_mobile_small() {
    if (screen.width <= 1200) {

        const styleTag = document.createElement('style');
        styleTag.textContent = "\n" +
            "/*======================\n" +
            "    404 page\n" +
            "=======================*/\n" +
            "\n" +
            "\n" +
            ".page_404{ padding:40px 0; background:#fff; font-family: 'Arvo', serif;\n" +
            "}\n" +
            "\n" +
            ".page_404  img{ width:100%;}\n" +
            "\n" +
            ".four_zero_four_bg{\n" +
            " \n" +
            " background-image: url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif);\n" +
            "    height: 400px;\n" +
            "    background-position: center;\n" +
            " }\n" +
            " \n" +
            " \n" +
            " .four_zero_four_bg h1{\n" +
            " font-size:80px;\n" +
            " }\n" +
            " \n" +
            "  .four_zero_four_bg h3{\n" +
            "\t\t\t font-size:80px;\n" +
            "\t\t\t }\n" +
            "\t\t\t \n" +
            "\t\t\t .link_404{\t\t\t \n" +
            "\tcolor: #fff!important;\n" +
            "    padding: 10px 20px;\n" +
            "    background: #39ac31;\n" +
            "    margin: 20px 0;\n" +
            "    display: inline-block;}\n" +
            "\t.contant_box_404{ margin-top:-50px;}";

        document.head.appendChild(styleTag);

        if (body_saved === undefined)
            body_saved = document.body.innerHTML


        document.body.innerHTML = "<section class=\"page_404\">\n" +
            "\t<div class=\"container\">\n" +
            "\t\t<div class=\"row\">\t\n" +
            "\t\t<div class=\"col-sm-12 \">\n" +
            "\t\t<div class=\"col-sm-10 col-sm-offset-1  text-center\">\n" +
            "\t\t<div class=\"four_zero_four_bg\">\n" +
            "\t\t\t<h1 class=\"text-center \"></h1>\n" +
            "\t\t\n" +
            "\t\t\n" +
            "\t\t</div>\n" +
            "\t\t\n" +
            "\t\t<div class=\"contant_box_404\">\n" +
            "\t\t<h3 class=\"h2\">\n" +
            "\t\tYour Device Is To Small For displaying Contets\n" +
            "\t\t</h3>\n" +
            "\t\t\n" +
            "\t\t\n" +
            "\t</div>\n" +
            "\t\t</div>\n" +
            "\t\t</div>\n" +
            "\t\t</div>\n" +
            "\t</div>\n" +
            "</section>"

        return true
    } else {
        if (body_saved !== undefined) {
            document.body.innerHTML = body_saved;
            body_saved = undefined;
        }
        return false
    }
    return false
}

window.addEventListener("resize", check_if_mobile_small);


/*-------------------------------------------------------------*/


let greekLetterNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];

function convertLatexShortcuts(text) {
    // html greek characters
    for (let i = 0; i < greekLetterNames.length; i++) {
        let name = greekLetterNames[i];
        text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
        text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
    }

    // subscripts
    for (let i = 0; i < 10; i++) {
        text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
    }

    return text;
}

function textToXML(text) {
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let result = '';
    for (let i = 0; i < text.length; i++) {
        let c = text.charCodeAt(i);
        if (c >= 0x20 && c <= 0x7E) {
            result += text[i];
        } else {
            result += '&#' + c + ';';
        }
    }
    return result;
}

function drawArrow(c, x, y, angle) {
    let dx = Math.cos(angle);
    let dy = Math.sin(angle);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
    c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
    c.fill();
}


function canvasHasFocus() {
    return in_canvas;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
    let text = convertLatexShortcuts(originalText);
    c.font = '20px "Times New Roman", serif';
    let width = c.measureText(text).width;

    // center the text
    x -= width / 2;

    // position the text intelligently if given an angle
    if (angleOrNull != null) {
        let cos = Math.cos(angleOrNull);
        let sin = Math.sin(angleOrNull);
        let cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
        let cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
        let slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
        x += cornerPointX - sin * slide;
        y += cornerPointY + cos * slide;
    }

    // draw text and caret (round the coordinates so the caret falls on a pixel)
    if ('advancedFillText' in c) {
        c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
    } else {
        x = Math.round(x);
        y = Math.round(y);
        c.fillText(text, x, y + 6);
        if (isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
            x += width;
            c.beginPath();
            c.moveTo(x, y - 10);
            c.lineTo(x, y + 10);
            c.stroke();
        }
    }
}

let caretTimer;
let caretVisible = true;

function resetCaret() {
    clearInterval(caretTimer);
    caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
    caretVisible = true;
}

let theme = "light"
let canvas;
let panel;
let nodeRadius = 45;
let nodes = [];
let links = [];
let snapToPadding = 6; // pixels
let hitTargetPadding = 6; // pixels
let selectedObject = null; // either a Link or a Node
let currentLink = null; // a Link
let movingObject = false;
let originalClick;
const screenRatio = screen.width / 2000

function draw() {


    if (in_canvas && (selectedObject instanceof Node || selectedObject instanceof Link))
        set_editor_content(selectedObject.getJson())


    drawUsing(canvas.getContext('2d'));
    saveBackup();
}

function selectObject(x, y) {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].containsPoint(x, y)) {
            return nodes[i];
        }
    }
    for (let i = 0; i < links.length; i++) {
        if (links[i].containsPoint(x, y)) {
            return links[i];
        }
    }
    return null;
}

function snapNode(node) {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] === node) continue;

        if (Math.abs(node.x - nodes[i].x) < snapToPadding) {
            node.x = nodes[i].x;
        }

        if (Math.abs(node.y - nodes[i].y) < snapToPadding) {
            node.y = nodes[i].y;
        }
    }
}

window.onload = function () {

    if (check_if_mobile_small()) return;

    canvas = document.getElementById('canvas');
    panel = document.getElementById('panel');
    canvas.setAttribute("width", `${1200 * screen.width / 2000}px`);
    canvas.setAttribute("height", `${700}px`);
    panel.setAttribute("width" ,`${400 * screen.width / 2000}px`)

    create_json_editor();
    // restoreBackup();
    // draw();

    canvas.onmousedown = function (e) {

        const mouse = crossBrowserRelativeMousePos(e);
        in_canvas = true;

        // if selectedObject is not null than save the json of the editor into the node
        const json = get_editor_content()
        if (selectedObject != null && selectedObject instanceof Node) {
            selectedObject.setJsonModel(json)
        }


        movingObject = false;
        originalClick = mouse;

        selectedObject = selectObject(mouse.x, mouse.y);
        if (selectedObject != null) {

            if (shift && selectedObject instanceof Node) {
                currentLink = new SelfLink(selectedObject, mouse);
            } else {
                movingObject = true;
                deltaMouseX = deltaMouseY = 0;
                if (selectedObject.setMouseStart) {
                    selectedObject.setMouseStart(mouse.x, mouse.y);
                }
            }
            resetCaret();
        } else if (shift) {
            currentLink = new TemporaryLink(mouse, mouse);
        }

        draw();

        if (canvasHasFocus()) {
            // disable drag-and-drop only if the canvas is already focused
            return false;
        } else {
            // otherwise, let the browser switch the focus away from wherever it was
            resetCaret();
            return true;
        }
    };

    canvas.ondblclick = function (e) {

        const mouse = crossBrowserRelativeMousePos(e);
        selectedObject = selectObject(mouse.x, mouse.y);

        if (selectedObject == null) {
            selectedObject = new Node(mouse.x, mouse.y);
            nodes.push(selectedObject);
            resetCaret();
            draw();
        } else if (selectedObject instanceof Node) {
            selectedObject.isAcceptState = !selectedObject.isAcceptState;
            if (selectedObject.isAcceptState)
                draw();
        }
    };

    canvas.onmousemove = function (e) {
        const mouse = crossBrowserRelativeMousePos(e);

        if (currentLink != null) {
            let targetNode = selectObject(mouse.x, mouse.y);
            if (!(targetNode instanceof Node)) {
                targetNode = null;
            }

            if (selectedObject == null) {
                if (targetNode != null) {
                    currentLink = new StartLink(targetNode, originalClick);
                } else {
                    currentLink = new TemporaryLink(originalClick, mouse);
                }
            } else {
                if (targetNode === selectedObject) {
                    currentLink = new SelfLink(selectedObject, mouse);
                } else if (targetNode != null) {
                    currentLink = new Link(selectedObject, targetNode);
                } else {
                    currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
                }
            }
            draw();
        }

        if (movingObject) {
            selectedObject.setAnchorPoint(mouse.x, mouse.y);
            if (selectedObject instanceof Node) {
                snapNode(selectedObject);
            }
            draw();
        }
    };

    canvas.onmouseup = function (e) {
        movingObject = false;

        if (currentLink != null) {
            if (!(currentLink instanceof TemporaryLink)) {
                selectedObject = currentLink;
                links.push(currentLink);
                resetCaret();
            }
            currentLink = null;
            draw();
        }
    };

    panel.onmousedown = function (e) {
        in_canvas = false;
        in_panel = true;
    }
}

let shift = false;

document.onkeydown = function (e) {
    let key = crossBrowserKey(e);

    if (key === 16) {
        shift = true;
    } else if (!canvasHasFocus()) {
        // don't read keystrokes when other things have focus
        return true;
    } else if (key === 8) { // backspace key
        if (selectedObject != null && 'text' in selectedObject) {
            selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
            resetCaret();
            draw();
        }

        // backspace is a shortcut for the back button, but do NOT want to change pages
        return false;
    } else if (key === 46) { // delete key
        if (selectedObject != null) {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i] === selectedObject) {
                    nodes.splice(i--, 1);
                }
            }
            for (let i = 0; i < links.length; i++) {
                if (links[i] === selectedObject || links[i].node === selectedObject || links[i].nodeA === selectedObject || links[i].nodeB === selectedObject) {
                    links.splice(i--, 1);
                }
            }
            selectedObject = null;
            draw();
        }
    }
};

document.onkeyup = function (e) {
    let key = crossBrowserKey(e);

    if (key === 16) {
        shift = false;
    }
};

document.onkeypress = function (e) {
    // don't read keystrokes when other things have focus
    const key = crossBrowserKey(e);
    if (!canvasHasFocus()) {
        // don't read keystrokes when other things have focus
        return true;
    } else if (key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null) {
        selectedObject.text += String.fromCharCode(key);
        resetCaret();
        draw();

        // don't let keys do their actions (like space scrolls down the page)
        return false;
    } else if (key === 8) {
        // backspace is a shortcut for the back button, but do NOT want to change pages
        return false;
    }
};

function crossBrowserKey(e) {
    return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
    let obj = e.target || e.srcElement;
    let x = 0, y = 0;
    while (obj.offsetParent) {
        x += obj.offsetLeft;
        y += obj.offsetTop;
        obj = obj.offsetParent;
    }
    return {'x': x, 'y': y};
}

function crossBrowserMousePos(e) {
    return {
        'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
        'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
    };
}

function crossBrowserRelativeMousePos(e) {
    const element = crossBrowserElementPos(e);
    const mouse = crossBrowserMousePos(e);
    return {
        'x': mouse.x - element.x,
        'y': mouse.y - element.y
    };
}

function output(text) {
    const element = document.getElementById('output');
    element.style.display = 'block';
    element.value = text;
}

function saveAsPNG() {
    canvas.toBlob(blob => {
        navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
    })

    successToast()
}

function saveAsSVG() {
    let exporter = new ExportAsSVG();
    let oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(exporter);
    selectedObject = oldSelectedObject;
    let svgData = exporter.toSVG();
    output(svgData);
    // Chrome isn't ready for this yet, the 'Save As' menu item is disabled
    // document.location.href = 'data:image/svg+xml;base64,' + btoa(svgData);
}

function saveAsLaTeX() {
    let exporter = new ExportAsLaTeX();
    let oldSelectedObject = selectedObject;
    selectedObject = null;
    drawUsing(exporter);
    selectedObject = oldSelectedObject;
    let texData = exporter.toLaTeX();
    copyToClipboard(texData);
}

function saveAsJson() {
    return copyToClipboard(ExportAsJson())
}


function successToast() {
    Toastify({
        text: "Copied to clipboard  \t\t🤪",
        classname: "info",
        duration: 3000,
        offset: 50,
        gravity: "top", // `top` or `bottom`
        position: "left", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
            height: "45px",
            width: "240px"
        },
        onClick: function () {
        } // Callback after click
    }).showToast();
}


async function copyToClipboard(textToCopy) {


    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
            successToast()

        } else {
            // Use the 'out of viewport hidden text area' trick
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;

            // Move textarea out of the viewport so it's not visible
            textArea.style.position = "absolute";
            textArea.style.left = "-999999px";

            document.body.appendChild(textArea);
            textArea.select();

            // Execute the copy command
            document.execCommand('copy');

            // Clean up
            document.body.removeChild(textArea);
        }
    } catch (error) {
        console.error(error);
    }
}
