function restoreBackup() {
    if(!localStorage || !JSON) {
        return;
    }

    try {
        var backup = JSON.parse(localStorage['graph']);//custom format generator here

        lastRadius = radiusClamp(backup.lastRadius);//we try to keep track of what the last vertex radius used was
        updateRadAdj();//update radius adjustment canvas


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
