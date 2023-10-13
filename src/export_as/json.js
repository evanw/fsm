function ExportAsJson() {


    const obj = {"nodes": [], "links": []}

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        obj.nodes.push({
            name: node.text,
            outputs: node.outputs,
            isAcceptState: node.isAcceptState,
            ...node.json_model
        })
    }


    for (let i = 0; i < links.length; i++) {
        const link = links[i]

        if (link.node !== undefined) {
            obj.links.push({
                    name: link.text,
                    source: link.node.text,
                    dest: link.node.text,
                    ...link.json_model
                }
            )
        } else {
            obj.links.push({
                name: link.text,
                source: link.nodeA.text,
                dest: link.nodeB.text,
                ...link.json_model
            })
        }
    }

    return JSON.stringify(obj)
}


