
//node ids are in order in which nodes come in existence
var nodes = [{ id: 1 }, { id: 2 }, { id: 3 }];

var links = [
  { source: 0, target: 1 },
  { source: 0, target: 2 },
  { source: 1, target: 2 }
];

//dynamic width and height based on container
var lastNodeId = nodes.length;
var w, h;
var rad = 10;

// Get container dimensions
function updateDimensions() {
  const container = document.getElementById("svg-wrap");
  w = container.clientWidth;
  h = container.clientHeight;

  if (svg) {
    svg.attr("width", w).attr("height", h);
  }

  // Update force simulation center
  if (force) {
    force.force("x", d3.forceX(w / 2));
    force.force("y", d3.forceY(h / 2));
  }
}

var svg = d3
  .select("#svg-wrap")
  .append("svg");

// Initialize dimensions
updateDimensions();

var dragLine = svg
  .append("path")
  .attr("class", "dragLine hidden")
  .attr("d", "M0,0L0,0");

var edges = svg.append("g").selectAll(".edge");
var vertices = svg.append("g").selectAll(".vertex");

var force = d3
  .forceSimulation()
  .force(
    "charge",
    d3
      .forceManyBody()
      .strength(-300)
      .distanceMax(Math.min(w, h) / 2)
  )
  .force("link", d3.forceLink().distance(60))
  .force("x", d3.forceX(w / 2).strength(0.05))
  .force("y", d3.forceY(h / 2).strength(0.05))
  .force("collision", d3.forceCollide().radius(rad + 2))
  .on("tick", tick);

force.nodes(nodes);
force.force("link").links(links);

var colors = d3.schemeCategory10;
var mousedownNode = null;
var selectedSourceNode = null;

// Boundary constraint function
function boundNodes() {
  nodes.forEach(function (d) {
    d.x = Math.max(rad, Math.min(w - rad, d.x));
    d.y = Math.max(rad, Math.min(h - rad, d.y));
  });
}

//empties the graph
function clearGraph() {
  nodes.splice(0);
  links.splice(0);
  lastNodeId = 0;
  selectedSourceNode = null;
  const sourceSelect = document.getElementById("source-select");
  if (sourceSelect) sourceSelect.value = "";
  restart();
  showGraphLatex();
  updateSourceSelector();
}

//update the simulation
function tick() {
  // Apply boundary constraints
  boundNodes();

  edges
    .attr("x1", function (d) { return d.source.x; })
    .attr("y1", function (d) { return d.source.y; })
    .attr("x2", function (d) { return d.target.x; })
    .attr("y2", function (d) { return d.target.y; });

  vertices
    .attr("cx", function (d) { return d.x; })
    .attr("cy", function (d) { return d.y; });
}

function addNode() {
  var e = d3.event;
  if (e.button == 0) {
    var coords = d3.mouse(e.currentTarget);
    createNodeAt(coords[0], coords[1]);
  }
}

function createNodeAt(x, y) {
  // Ensure new node is within bounds
  var newX = Math.max(rad, Math.min(w - rad, x));
  var newY = Math.max(rad, Math.min(h - rad, y));
  var newNode = { x: newX, y: newY, id: ++lastNodeId };
  nodes.push(newNode);
  restart();
  showGraphLatex();
  updateSourceSelector();
  return newNode;
}

function removeNode(d, i) {
  //to make ctrl-drag works for mac/osx users
  if (d3.event.ctrlKey) return;
  
  // Clear selection if we're deleting the selected source node
  if (selectedSourceNode == d.id) {
    selectedSourceNode = null;
    const sourceSelect = document.getElementById("source-select");
    if (sourceSelect) sourceSelect.value = "";
  }
  
  nodes.splice(nodes.indexOf(d), 1);
  var linksToRemove = links.filter(function (l) {
    return l.source === d || l.target === d;
  });
  linksToRemove.map(function (l) {
    links.splice(links.indexOf(l), 1);
  });
  
  if (nodes.length != 0)
    lastNodeId = Math.max(...nodes.map(node => node.id));
  else lastNodeId = 0;
  
  d3.event.preventDefault();
  restart();
  showGraphLatex();
  updateSourceSelector();
}

function removeEdge(d, i) {
  links.splice(links.indexOf(d), 1);
  d3.event.preventDefault();
  restart();
  showGraphLatex();
}

function beginDragLine(d) {
  //to prevent call of addNode through svg
  d3.event.stopPropagation();
  //to prevent dragging of svg in firefox
  d3.event.preventDefault();
  
  // If Ctrl is pressed, handle node dragging instead
  if (isCtrlPressed) {
    console.log("Starting node drag for node", d.id);
    
    // Start dragging this specific node
    d.isDragging = true;
    d.fx = d.x;
    d.fy = d.y;
    force.alphaTarget(0.3).restart();
    
    // Store the dragging node globally
    mousedownNode = d;
    return;
  }
  
  if (d3.event.button != 0) return;
  mousedownNode = d;
  dragLine
    .classed("hidden", false)
    .attr(
      "d",
      "M" + mousedownNode.x + "," + mousedownNode.y + "L" + mousedownNode.x + "," + mousedownNode.y
    );
}

function updateDragLine() {
  var coords = d3.mouse(d3.event.currentTarget);
  
  // If we're dragging a node (Ctrl mode)
  if (isCtrlPressed && mousedownNode && mousedownNode.isDragging) {
    console.log("Dragging node", mousedownNode.id, "to", coords);
    mousedownNode.fx = Math.max(rad, Math.min(w - rad, coords[0]));
    mousedownNode.fy = Math.max(rad, Math.min(h - rad, coords[1]));
    return;
  }
  
  // Normal edge drag line
  if (!mousedownNode) return;
  dragLine.attr(
    "d",
    "M" + mousedownNode.x + "," + mousedownNode.y + "L" + coords[0] + "," + coords[1]
  );
}

function hideDragLine() {
  // If we were dragging a node, stop dragging
  if (mousedownNode && mousedownNode.isDragging) {
    console.log("Ending node drag for node", mousedownNode.id);
    mousedownNode.fx = null;
    mousedownNode.fy = null;
    mousedownNode.isDragging = false;
    force.alphaTarget(0);
  }
  
  dragLine.classed("hidden", true);
  mousedownNode = null;
  restart();
}

//no need to call hideDragLine() and restart() in endDragLine
//mouseup on vertices propagates to svg which calls hideDragLine
function endDragLine(d) {
  if (!mousedownNode || mousedownNode === d) return;
  createEdgeBetweenNodes(mousedownNode, d);
}

function createEdgeBetweenNodes(sourceNode, targetNode) {
  //return if link already exists
  for (let i = 0; i < links.length; i++) {
    var l = links[i];
    if (
      (l.source === sourceNode && l.target === targetNode) ||
      (l.source === targetNode && l.target === sourceNode)
    ) {
      return false;
    }
  }
  var newLink = { source: sourceNode, target: targetNode };
  links.push(newLink);
  restart();
  showGraphLatex();
  return true;
}

//one response per ctrl keydown
var lastKeyDown = -1;
var isDragMode = false;
var isCtrlPressed = false;

function keydown() {
  if (lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  if (lastKeyDown === 17) { // Ctrl key
    d3.event.preventDefault();
    isCtrlPressed = true;
    isDragMode = true;
    svg.style("cursor", "default");
    console.log("Ctrl pressed - drag mode ON");
  }
}

function keyup() {
  lastKeyDown = -1;
  if (d3.event.keyCode === 17) { // Ctrl key
    isCtrlPressed = false;
    isDragMode = false;
    svg.style("cursor", "crosshair");
    console.log("Ctrl released - drag mode OFF");
  }
}

// Update source node visual indication
function updateSourceNodeVisual() {
  if (typeof vertices !== 'undefined') {
    vertices.classed("source-node", function (d) {
      return selectedSourceNode && d.id == selectedSourceNode;
    });
  }
}

//updates the graph by updating links, nodes and binding them with DOM
//interface is defined through several events
function restart() {
  edges = edges.data(links, function (d) {
    return "v" + d.source.id + "-v" + d.target.id;
  });
  edges.exit().remove();

  var ed = edges
    .enter()
    .append("line")
    .attr("class", "edge")
    .on("mousedown", function () {
      d3.event.stopPropagation();
    })
    .on("contextmenu", removeEdge);

  ed.append("title").text(function (d) {
    return "v" + d.source.id + "-v" + d.target.id;
  });

  edges = ed.merge(edges);

  //vertices are known by id
  vertices = vertices.data(nodes, function (d) {
    return d.id;
  });
  vertices.exit().remove();

  var ve = vertices
    .enter()
    .append("circle")
    .attr("r", rad)
    .attr("class", "vertex")
    .style("fill", function (d, i) {
      return colors[d.id % 10];
    })
    .style("cursor", "pointer")
    .on("mousedown", beginDragLine)
    .on("mouseup", endDragLine)
    .on("contextmenu", removeNode);

  ve.append("title").text(function (d) {
    return "v" + d.id;
  });

  vertices = ve.merge(vertices);
  
  // Update source node visual
  updateSourceNodeVisual();

  force.nodes(nodes);
  force.force("link").links(links);
  force.alpha(0.3).restart();
}

//further interface
svg
  .on("mousedown", addNode)
  .on("mousemove", updateDragLine)
  .on("mouseup", hideDragLine)
  .on("contextmenu", function () {
    d3.event.preventDefault();
  })
  .on("mouseleave", hideDragLine);

d3.select(window)
  .on("keydown", keydown)
  .on("keyup", keyup)
  .on("resize", function () {
    updateDimensions();
    // Reposition nodes to stay within new bounds
    nodes.forEach(function (d) {
      d.x = Math.max(rad, Math.min(w - rad, d.x));
      d.y = Math.max(rad, Math.min(h - rad, d.y));
    });
    restart();
  });

//handling output area
function showGraphLatex() {
  var v = "\\[V=\\{";
  for (let i = 0; i < nodes.length; i++) {
    if (i == 0) v += "v_{" + nodes[i].id + "}";
    else v += "," + "v_{" + nodes[i].id + "}";
    //add line break
    if ((i + 1) % 15 == 0) v += "\\\\";
  }
  v += "\\}\\]";

  var e = "\\[E=\\{";
  for (let i = 0; i < links.length; i++) {
    if (i == links.length - 1)
      e += "v_{" + links[i].source.id + "}" + "v_{" + links[i].target.id + "}";
    else
      e +=
        "v_{" +
        links[i].source.id +
        "}" +
        "v_{" +
        links[i].target.id +
        "}" +
        ",";
    //add line break
    if ((i + 1) % 10 == 0) e += "\\\\";
  }
  e += "\\}\\]";

  document.getElementById("svg-output").textContent = v + e;
  //recall mathjax
  MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
}

// Update source node selector
function updateSourceSelector() {
  const sourceSelect = document.getElementById("source-select");
  sourceSelect.innerHTML = "";

  if (nodes.length === 0) {
    sourceSelect.innerHTML = '<option value="">-- No nodes available --</option>';
    sourceSelect.disabled = true;
  } else {
    sourceSelect.innerHTML = '<option value="">-- Select source node --</option>';
    const sortedNodes = [...nodes].sort((a, b) => a.id - b.id);
    sortedNodes.forEach(node => {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `Node ${node.id}`;
      sourceSelect.appendChild(option);
    });
    sourceSelect.disabled = false;
  }
}

// Source node selector event listener
document.getElementById("source-select").addEventListener("change", function (e) {
  selectedSourceNode = e.target.value ? parseInt(e.target.value) : null;
  updateSourceNodeVisual();
});

// Single DOMContentLoaded event listener combining all initialization
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  const outputBox = document.getElementById("output-box");
  const algoSelect = document.getElementById("algo-select");
  const computeBtn = document.getElementById("compute-btn");
  const clrBtn = document.getElementById("clear-graph");
  const infoBtn = document.getElementById("info-btn");
  const modeIcon = document.getElementById("mode-icon");
  const modeText = document.getElementById("mode-text");

  // Theme toggle and mode indicator update
  function updateModeIndicator(isDark) {
    if (isDark) {
      modeIcon.textContent = "🌑";
      modeText.textContent = "Dark";
    } else {
      modeIcon.textContent = "☀️";
      modeText.textContent = "Light";
    }
  }

  // Load saved theme
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    themeToggle.checked = true;
  }

  // Initialize mode indicator
  updateModeIndicator(themeToggle.checked);

  // Theme toggle event listener
  themeToggle.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem('darkMode', isDark);
    updateModeIndicator(isDark);
  });

  // Compute button click
  computeBtn.addEventListener("click", () => {
    const selectedAlgo = algoSelect.value;
    if (!selectedAlgo || !selectedSourceNode) {
      outputBox.innerHTML = "Please select an algorithm and source node first.";
      return;
    }
    outputBox.innerHTML = `Running <b>${selectedAlgo}</b> on the drawn graph...`;
  });

  // Clear all
  clrBtn.addEventListener("click", () => {
    clearGraph();
    outputBox.innerHTML = "Graph cleared.";
  });

  // Info button
  infoBtn.addEventListener("click", function () {
    alert(`Controls:
Desktop:
• Left click: Add node
• Drag between nodes: Add edge  
• Right click node/edge: Remove
• Ctrl + drag: Move nodes

Touch:
• Tap empty space: Add node
• Double-tap node: Delete node
• Drag node to node: Create edge
• Long press + drag node: Move node`);
  });

  // Initialize source selector
  setTimeout(updateSourceSelector, 100);
});

// Touch handling variables
let touchStartTime = 0;
let touchStartNode = null;
let touchStartPos = { x: 0, y: 0 };
let isDragging = false;
let longPressTimer = null;
let lastTapTime = 0;
let lastTappedNode = null;

// Add touch event listeners to the SVG
svg
  .on("touchstart", handleTouchStart)
  .on("touchmove", handleTouchMove)
  .on("touchend", handleTouchEnd);

function handleTouchStart() {
  d3.event.preventDefault();

  const touch = d3.event.touches[0];
  const rect = svg.node().getBoundingClientRect();
  const coords = [touch.clientX - rect.left, touch.clientY - rect.top];

  touchStartTime = Date.now();
  touchStartPos = { x: coords[0], y: coords[1] };
  touchStartNode = getNodeAtPosition(coords[0], coords[1]);
  isDragging = false;

  // Start long press timer (500ms)
  longPressTimer = setTimeout(() => {
    handleLongPress();
  }, 500);

  // If touching a node, prepare for potential edge creation
  if (touchStartNode) {
    mousedownNode = touchStartNode;
    dragLine
      .classed("hidden", false)
      .attr("d", `M${touchStartNode.x},${touchStartNode.y}L${touchStartNode.x},${touchStartNode.y}`);
  }
}

function handleTouchMove() {
  d3.event.preventDefault();

  const touch = d3.event.touches[0];
  const rect = svg.node().getBoundingClientRect();
  const coords = [touch.clientX - rect.left, touch.clientY - rect.top];
  const dx = coords[0] - touchStartPos.x;
  const dy = coords[1] - touchStartPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Clear long press timer if user moves too much
  if (distance > 15 && longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  // If we have a starting node and we're moving, show drag line
  if (touchStartNode && distance > 15) {
    isDragging = true;
    dragLine.attr("d", `M${touchStartNode.x},${touchStartNode.y}L${coords[0]},${coords[1]}`);
  }

  // If dragging a node (long press + move)
  if (touchStartNode && touchStartNode.isDragMode) {
    touchStartNode.fx = Math.max(rad, Math.min(w - rad, coords[0]));
    touchStartNode.fy = Math.max(rad, Math.min(h - rad, coords[1]));
    force.alphaTarget(0.3).restart();
  }
}

function handleTouchEnd() {
  d3.event.preventDefault();

  // Clear timers
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  const touch = d3.event.changedTouches[0];
  const rect = svg.node().getBoundingClientRect();
  const coords = [touch.clientX - rect.left, touch.clientY - rect.top];
  const endNode = getNodeAtPosition(coords[0], coords[1]);
  const touchDuration = Date.now() - touchStartTime;
  const dx = coords[0] - touchStartPos.x;
  const dy = coords[1] - touchStartPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Release dragged node
  if (touchStartNode && touchStartNode.isDragMode) {
    touchStartNode.fx = null;
    touchStartNode.fy = null;
    touchStartNode.isDragMode = false;
    force.alphaTarget(0);
  }

  // Hide drag line
  dragLine.classed("hidden", true);

  // Double-tap detection and action determination
  const currentTime = Date.now();
  const timeSinceLastTap = currentTime - lastTapTime;

  if (distance < 15 && touchDuration < 400) {
    // Quick tap
    if (touchStartNode) {
      // Check for double-tap on node
      if (lastTappedNode === touchStartNode && timeSinceLastTap < 500) {
        // Double-tap detected - delete node
        deleteNodeWithAnimation(touchStartNode);
        lastTappedNode = null;
        lastTapTime = 0;
      } else {
        // Single tap on node - just select/highlight
        highlightNode(touchStartNode);
        lastTappedNode = touchStartNode;
        lastTapTime = currentTime;
      }
    } else {
      // Tapped on empty space - add node
      const newNode = createNodeAt(coords[0], coords[1]);
      addNodeAnimation(newNode);
      lastTappedNode = null;
      lastTapTime = 0;
    }
  } else if (touchStartNode && endNode && touchStartNode !== endNode && isDragging) {
    // Dragged from one node to another - create edge
    if (createEdgeBetweenNodes(touchStartNode, endNode)) {
      animateEdgeCreation(touchStartNode, endNode);
    }
    lastTappedNode = null;
    lastTapTime = 0;
  }

  // Reset
  touchStartNode = null;
  mousedownNode = null;
  isDragging = false;
}

function handleLongPress() {
  if (touchStartNode) {
    // Long press on node - enter drag mode
    touchStartNode.isDragMode = true;

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Visual feedback - pulse animation
    vertices.filter(d => d.id === touchStartNode.id)
      .transition()
      .duration(150)
      .attr("r", rad * 1.4)
      .transition()
      .duration(150)
      .attr("r", rad);
  }
  longPressTimer = null;
}

// Helper functions
function getNodeAtPosition(x, y) {
  return nodes.find(node => {
    const dx = node.x - x;
    const dy = node.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= rad + 15; // Larger touch target for mobile
  });
}

function addNodeAnimation(node) {
  // Visual feedback - growth animation
  setTimeout(() => {
    vertices.filter(d => d.id === node.id)
      .attr("r", 0)
      .transition()
      .duration(300)
      .attr("r", rad)
      .style("fill", colors[node.id % 10]);
  }, 10);
}

function animateEdgeCreation(sourceNode, targetNode) {
  // Brief highlight of connected nodes
  vertices.filter(d => d.id === sourceNode.id || d.id === targetNode.id)
    .transition()
    .duration(200)
    .style("stroke", "var(--success)")
    .style("stroke-width", "4px")
    .transition()
    .duration(300)
    .style("stroke", null)
    .style("stroke-width", null);
}

function highlightNode(node) {
  // Remove previous highlights
  vertices.classed("highlighted", false);

  // Highlight selected node
  vertices.filter(d => d.id === node.id)
    .classed("highlighted", true)
    .transition()
    .duration(200)
    .attr("r", rad * 1.2)
    .transition()
    .duration(200)
    .attr("r", rad);
}

function deleteNodeWithAnimation(nodeToDelete) {
  // Visual feedback before deletion
  const nodeElement = vertices.filter(d => d.id === nodeToDelete.id);

  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate([50, 50, 50]);
  }

  nodeElement
    .transition()
    .duration(150)
    .attr("r", rad * 1.5)
    .style("fill", "var(--danger)")
    .transition()
    .duration(200)
    .attr("r", 0)
    .style("opacity", 0)
    .on("end", () => {
      // Find and remove the actual node
      const nodeIndex = nodes.findIndex(n => n.id === nodeToDelete.id);
      if (nodeIndex !== -1) {
        removeNode(nodes[nodeIndex], nodeIndex);
      }
    });
}

// Initialize everything
restart();
showGraphLatex();