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
    if (!selectedAlgo) {
      outputBox.innerHTML = "Please select an algorithm first.";
      return;
    }
    // Placeholder output (replace with actual algorithm results)
    outputBox.innerHTML = `Running <b>${selectedAlgo}</b> on the drawn graph...`;
  });

  // Clear all
  document.getElementById("clear-graph").addEventListener("click", () => {
    // This should call your app.js graph clearing logic
    outputBox.innerHTML = "Graph cleared.";
  });
});
document.getElementById("compute-btn").addEventListener("click", function () {
  const algo = document.getElementById("algo-select").value;
  const graphData = {
    nodes: nodes.map(n => ({ id: n.id })),
    edges: links.map(l => ({ source: l.source.id, target: l.target.id }))
  };
  document.getElementById("output-box").innerText =
    `Selected Algorithm: ${algo}\nGraph Data: ${JSON.stringify(graphData, null, 2)}`;
});

// Theme toggle functionality
document.getElementById('theme-toggle').addEventListener('change', function(e) {
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