"use strict";
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

// Make force simulation settle faster

force.nodes(nodes);
force.force("link").links(links);

var colors = d3.schemeCategory10;

var mousedownNode = null;

var clrBtn = d3.select("#clear-graph");
clrBtn.on("click", clearGraph);

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
  restart();
  showGraphLatex();
}

//update the simulation
function tick() {
  // Apply boundary constraints
  boundNodes();

  edges
    .attr("x1", function (d) {
      return d.source.x;
    })
    .attr("y1", function (d) {
      return d.source.y;
    })
    .attr("x2", function (d) {
      return d.target.x;
    })
    .attr("y2", function (d) {
      return d.target.y;
    });

  vertices
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    });
}

function addNode() {
  var e = d3.event;
  if (e.button == 0) {
    var coords = d3.mouse(e.currentTarget);
    // Ensure new node is within bounds
    var x = Math.max(rad, Math.min(w - rad, coords[0]));
    var y = Math.max(rad, Math.min(h - rad, coords[1]));
    var newNode = { x: x, y: y, id: ++lastNodeId };
    nodes.push(newNode);
    restart();
    showGraphLatex();
  }
  updateSourceSelector();
}

function removeNode(d, i) {
  //to make ctrl-drag works for mac/osx users
  if (d3.event.ctrlKey) return;
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
  if (d3.event.ctrlKey || d3.event.button != 0) return;
  mousedownNode = d;
  dragLine
    .classed("hidden", false)
    .attr(
      "d",
      "M" +
      mousedownNode.x +
      "," +
      mousedownNode.y +
      "L" +
      mousedownNode.x +
      "," +
      mousedownNode.y
    );
}

function updateDragLine() {
  var coords = d3.mouse(d3.event.currentTarget);
  if (!mousedownNode) return;
  dragLine.attr(
    "d",
    "M" +
    mousedownNode.x +
    "," +
    mousedownNode.y +
    "L" +
    coords[0] +
    "," +
    coords[1]
  );
}

function hideDragLine() {
  dragLine.classed("hidden", true);
  mousedownNode = null;
  restart();
}

//no need to call hideDragLine() and restart() in endDragLine
//mouseup on vertices propagates to svg which calls hideDragLine
function endDragLine(d) {
  if (!mousedownNode || mousedownNode === d) return;
  //return if link already exists
  for (let i = 0; i < links.length; i++) {
    var l = links[i];
    if (
      (l.source === mousedownNode && l.target === d) ||
      (l.source === d && l.target === mousedownNode)
    ) {
      return;
    }
  }
  var newLink = { source: mousedownNode, target: d };
  links.push(newLink);
  showGraphLatex();
}

//one response per ctrl keydown
var lastKeyDown = -1;

function keydown() {
  d3.event.preventDefault();
  if (lastKeyDown !== -1) return;
  lastKeyDown = d3.event.key;

  if (lastKeyDown === "Control") {
    vertices.call(
      d3
        .drag()
        .on("start", function dragstarted(d) {
          if (!d3.event.active) force.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", function (d) {
          // Apply boundary constraints during dragging
          d.fx = Math.max(rad, Math.min(w - rad, d3.event.x));
          d.fy = Math.max(rad, Math.min(h - rad, d3.event.y));
        })
        .on("end", function (d) {
          if (!d3.event.active) force.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );
  }
}

function keyup() {
  lastKeyDown = -1;
  if (d3.event.key === "Control") {
    vertices.on("mousedown.drag", null);
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
    .on("mousedown", beginDragLine)
    .on("mouseup", endDragLine)
    .on("contextmenu", removeNode);

  ve.append("title").text(function (d) {
    return "v" + d.id;
  });

  vertices = ve.merge(vertices);

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

restart();
showGraphLatex();

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
// --------------------------------Additional UI logic-------------------------

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

var selectedSourceNode = null;
// Update visual indication of source node
function updateSourceNodeVisual() {
  if (typeof vertices !== 'undefined') {
    vertices.classed("source-node", function (d) {
      return selectedSourceNode && d.id == selectedSourceNode;
    });
  }
}

// Source node selector event listener
document.getElementById("source-select").addEventListener("change", function (e) {
  selectedSourceNode = e.target.value ? parseInt(e.target.value) : null;
  updateSourceNodeVisual();
});

document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  const outputBox = document.getElementById("output-box");
  const algoSelect = document.getElementById("algo-select");
  const computeBtn = document.getElementById("compute-btn");

  // Dark mode toggle
  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", themeToggle.checked);
  });

  // Compute button click
  computeBtn.addEventListener("click", () => {
    const selectedAlgo = algoSelect.value;
    if (!selectedAlgo || !selectedSourceNode) {
      outputBox.innerHTML = "Please select an algorithm and source node first.";
      return;
    }
    // Placeholder output (replace with actual algorithm results)
    outputBox.innerHTML = `Running <b>${selectedAlgo}</b> on the drawn graph...`;
  });

  // Clear all
  document.getElementById("clear-graph").addEventListener("click", () => {
    outputBox.innerHTML = "Graph cleared.";
  });
});


// Theme toggle functionality
document.getElementById('theme-toggle').addEventListener('change', function (e) {
  document.body.classList.toggle('dark', e.target.checked);
  localStorage.setItem('darkMode', e.target.checked);
});

// Load saved theme
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
  document.getElementById('theme-toggle').checked = true;
}

document.getElementById("info-btn").addEventListener("click", function () {
  alert("Left click: Add node\nDrag between nodes: Add edge\nRight click node/edge: Remove\nCtrl + drag: Move nodes");
});

// Mode indicator functionality
const themeToggle = document.getElementById("theme-toggle");
const modeIcon = document.getElementById("mode-icon");
const modeText = document.getElementById("mode-text");

function updateModeIndicator(isDark) {
  if (isDark) {
    modeIcon.textContent = "🌑";
    modeText.textContent = "Dark";
  } else {
    modeIcon.textContent = "☀️";
    modeText.textContent = "Light";
  }
}

// Enhanced theme toggle that also updates mode indicator
themeToggle.addEventListener("change", function (e) {
  const isDark = e.target.checked;
  document.body.classList.toggle("dark", isDark);
  updateModeIndicator(isDark);
});

// Initialize mode indicator
updateModeIndicator(themeToggle.checked);

// Initialize source selector when page loads
setTimeout(function () {
  updateSourceSelector();
}, 100);