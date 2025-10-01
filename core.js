// core.js - Graph Algorithm Implementations

/**
 * Helper class for Union-Find (Disjoint Set Union)
 * Used in Kruskal's algorithm
 */
class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return false;

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    return true;
  }
}

/**
 * Priority Queue implementation for Dijkstra's and Prim's algorithms
 */
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(item, priority) {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min.item;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && this.heap[leftChild].priority < this.heap[minIndex].priority) {
        minIndex = leftChild;
      }
      if (rightChild < this.heap.length && this.heap[rightChild].priority < this.heap[minIndex].priority) {
        minIndex = rightChild;
      }
      if (minIndex === index) break;

      [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
      index = minIndex;
    }
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

/**
 * Build adjacency list from nodes and links
 */
function buildAdjacencyList(nodes, links) {
  const adjList = {};
  nodes.forEach(node => {
    adjList[node.id] = [];
  });

  links.forEach(link => {
    const sourceId = link.source.id || link.source;
    const targetId = link.target.id || link.target;
    const weight = link.weight || 1;

    adjList[sourceId].push({ node: targetId, weight });
    adjList[targetId].push({ node: sourceId, weight });
  });

  return adjList;
}

/**
 * Dijkstra's Algorithm
 * Finds shortest paths from source to all other nodes
 */
function dijkstra(nodes, links, sourceId) {
  const adjList = buildAdjacencyList(nodes, links);
  const distances = {};
  const previous = {};
  const visited = new Set();
  const pq = new PriorityQueue();

  // Initialize distances
  nodes.forEach(node => {
    distances[node.id] = node.id === sourceId ? 0 : Infinity;
    previous[node.id] = null;
  });

  pq.push(sourceId, 0);

  const steps = [];
  steps.push(`Starting Dijkstra's algorithm from node ${sourceId}`);
  steps.push(`Initial distances: ${JSON.stringify(distances)}`);

  while (!pq.isEmpty()) {
    const currentId = pq.pop();

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    steps.push(`\nVisiting node ${currentId} (distance: ${distances[currentId]})`);

    if (!adjList[currentId]) continue;

    for (const { node: neighborId, weight } of adjList[currentId]) {
      if (visited.has(neighborId)) continue;

      const newDist = distances[currentId] + weight;
      if (newDist < distances[neighborId]) {
        distances[neighborId] = newDist;
        previous[neighborId] = currentId;
        pq.push(neighborId, newDist);
        steps.push(`  Updated distance to node ${neighborId}: ${newDist} (via node ${currentId})`);
      }
    }
  }

  // Build result paths
  steps.push(`\n--- Final Shortest Paths ---`);
  nodes.forEach(node => {
    if (node.id === sourceId) {
      steps.push(`Node ${node.id}: 0 (source)`);
    } else if (distances[node.id] === Infinity) {
      steps.push(`Node ${node.id}: unreachable`);
    } else {
      const path = reconstructPath(previous, sourceId, node.id);
      steps.push(`Node ${node.id}: ${distances[node.id]} [Path: ${path.join(' → ')}]`);
    }
  });

  return {
    distances,
    previous,
    steps: steps.join('\n'),
    visitedEdges: buildVisitedEdges(previous, nodes)
  };
}

/**
 * Breadth-First Search (BFS)
 */
function bfs(nodes, links, sourceId) {
  const adjList = buildAdjacencyList(nodes, links);
  const visited = new Set();
  const queue = [sourceId];
  const parent = {};
  const distance = {};
  const steps = [];

  nodes.forEach(node => {
    distance[node.id] = node.id === sourceId ? 0 : Infinity;
    parent[node.id] = null;
  });

  visited.add(sourceId);
  steps.push(`Starting BFS from node ${sourceId}`);
  steps.push(`Queue: [${sourceId}]`);

  while (queue.length > 0) {
    const currentId = queue.shift();
    steps.push(`\nVisiting node ${currentId} (distance: ${distance[currentId]})`);

    if (!adjList[currentId]) continue;

    const neighbors = adjList[currentId].map(n => n.node);
    steps.push(`  Neighbors: [${neighbors.join(', ')}]`);

    for (const { node: neighborId } of adjList[currentId]) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
        parent[neighborId] = currentId;
        distance[neighborId] = distance[currentId] + 1;
        steps.push(`  Added node ${neighborId} to queue (distance: ${distance[neighborId]})`);
      }
    }
  }

  steps.push(`\n--- BFS Traversal Complete ---`);
  steps.push(`Visited ${visited.size} nodes`);
  
  // Show distances
  steps.push(`\nDistances from source:`);
  nodes.forEach(node => {
    if (distance[node.id] === Infinity) {
      steps.push(`Node ${node.id}: unreachable`);
    } else {
      const path = reconstructPath(parent, sourceId, node.id);
      steps.push(`Node ${node.id}: ${distance[node.id]} hops [Path: ${path.join(' → ')}]`);
    }
  });

  return {
    visited: Array.from(visited),
    parent,
    distance,
    steps: steps.join('\n'),
    visitedEdges: buildVisitedEdges(parent, nodes)
  };
}

/**
 * Depth-First Search (DFS)
 */
function dfs(nodes, links, sourceId) {
  const adjList = buildAdjacencyList(nodes, links);
  const visited = new Set();
  const parent = {};
  const discoveryTime = {};
  const finishTime = {};
  let time = 0;
  const steps = [];

  nodes.forEach(node => {
    parent[node.id] = null;
  });

  steps.push(`Starting DFS from node ${sourceId}`);

  function dfsVisit(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    visited.add(nodeId);
    time++;
    discoveryTime[nodeId] = time;
    steps.push(`${indent}Discovered node ${nodeId} at time ${time}`);

    if (adjList[nodeId]) {
      for (const { node: neighborId } of adjList[nodeId]) {
        if (!visited.has(neighborId)) {
          parent[neighborId] = nodeId;
          steps.push(`${indent}  Exploring edge ${nodeId} → ${neighborId}`);
          dfsVisit(neighborId, depth + 1);
        } else {
          steps.push(`${indent}  Node ${neighborId} already visited (back edge)`);
        }
      }
    }

    time++;
    finishTime[nodeId] = time;
    steps.push(`${indent}Finished node ${nodeId} at time ${time}`);
  }

  dfsVisit(sourceId);

  // Check for unreachable nodes
  const unvisited = nodes.filter(n => !visited.has(n.id));
  if (unvisited.length > 0) {
    steps.push(`\nUnreachable nodes: [${unvisited.map(n => n.id).join(', ')}]`);
  }

  steps.push(`\n--- DFS Traversal Complete ---`);
  steps.push(`Visited ${visited.size} nodes`);
  steps.push(`\nDiscovery/Finish times:`);
  nodes.forEach(node => {
    if (visited.has(node.id)) {
      steps.push(`Node ${node.id}: discovered at ${discoveryTime[node.id]}, finished at ${finishTime[node.id]}`);
    }
  });

  return {
    visited: Array.from(visited),
    parent,
    discoveryTime,
    finishTime,
    steps: steps.join('\n'),
    visitedEdges: buildVisitedEdges(parent, nodes)
  };
}

/**
 * Prim's Algorithm for Minimum Spanning Tree
 */
function prim(nodes, links, sourceId) {
  if (nodes.length === 0) {
    return {
      mstEdges: [],
      totalWeight: 0,
      steps: 'No nodes in the graph',
      visitedEdges: []
    };
  }

  const adjList = buildAdjacencyList(nodes, links);
  const inMST = new Set();
  const parent = {};
  const key = {};
  const pq = new PriorityQueue();
  const mstEdges = [];
  const steps = [];

  // Initialize
  nodes.forEach(node => {
    key[node.id] = Infinity;
    parent[node.id] = null;
  });

  key[sourceId] = 0;
  pq.push(sourceId, 0);

  steps.push(`Starting Prim's algorithm from node ${sourceId}`);
  steps.push(`Building Minimum Spanning Tree...`);

  let totalWeight = 0;

  while (!pq.isEmpty()) {
    const currentId = pq.pop();

    if (inMST.has(currentId)) continue;
    inMST.add(currentId);

    if (parent[currentId] !== null) {
      mstEdges.push({
        from: parent[currentId],
        to: currentId,
        weight: key[currentId]
      });
      totalWeight += key[currentId];
      steps.push(`Added edge: ${parent[currentId]} → ${currentId} (weight: ${key[currentId]})`);
    }

    if (!adjList[currentId]) continue;

    for (const { node: neighborId, weight } of adjList[currentId]) {
      if (!inMST.has(neighborId) && weight < key[neighborId]) {
        key[neighborId] = weight;
        parent[neighborId] = currentId;
        pq.push(neighborId, weight);
      }
    }
  }

  steps.push(`\n--- Minimum Spanning Tree Complete ---`);
  steps.push(`Total edges in MST: ${mstEdges.length}`);
  steps.push(`Total weight: ${totalWeight}`);
  
  if (inMST.size < nodes.length) {
    steps.push(`\nWarning: Graph is disconnected. MST includes ${inMST.size} of ${nodes.length} nodes.`);
  }

  steps.push(`\nMST Edges:`);
  mstEdges.forEach(edge => {
    steps.push(`  ${edge.from} ↔ ${edge.to} (weight: ${edge.weight})`);
  });

  return {
    mstEdges,
    totalWeight,
    steps: steps.join('\n'),
    visitedEdges: mstEdges.map(e => ({ source: e.from, target: e.to }))
  };
}

/**
 * Kruskal's Algorithm for Minimum Spanning Tree
 */
function kruskal(nodes, links) {
  if (nodes.length === 0) {
    return {
      mstEdges: [],
      totalWeight: 0,
      steps: 'No nodes in the graph',
      visitedEdges: []
    };
  }

  const steps = [];
  const mstEdges = [];
  
  // Create node ID to index mapping
  const nodeIdToIndex = {};
  nodes.forEach((node, index) => {
    nodeIdToIndex[node.id] = index;
  });

  // Convert links to edge format and sort by weight
  const edges = links.map(link => ({
    from: link.source.id || link.source,
    to: link.target.id || link.target,
    weight: link.weight || 1
  })).sort((a, b) => a.weight - b.weight);

  steps.push(`Starting Kruskal's algorithm`);
  steps.push(`Total edges: ${edges.length}`);
  steps.push(`Sorted edges by weight:`);
  edges.forEach(edge => {
    steps.push(`  ${edge.from} ↔ ${edge.to} (weight: ${edge.weight})`);
  });

  const uf = new UnionFind(nodes.length);
  let totalWeight = 0;

  steps.push(`\nBuilding MST by adding edges...`);

  for (const edge of edges) {
    const uIndex = nodeIdToIndex[edge.from];
    const vIndex = nodeIdToIndex[edge.to];

    if (uf.find(uIndex) !== uf.find(vIndex)) {
      uf.union(uIndex, vIndex);
      mstEdges.push(edge);
      totalWeight += edge.weight;
      steps.push(`✓ Added edge: ${edge.from} ↔ ${edge.to} (weight: ${edge.weight})`);
    } else {
      steps.push(`✗ Skipped edge: ${edge.from} ↔ ${edge.to} (would create cycle)`);
    }

    if (mstEdges.length === nodes.length - 1) {
      steps.push(`\nMST complete (${nodes.length - 1} edges for ${nodes.length} nodes)`);
      break;
    }
  }

  steps.push(`\n--- Minimum Spanning Tree Complete ---`);
  steps.push(`Total edges in MST: ${mstEdges.length}`);
  steps.push(`Total weight: ${totalWeight}`);

  if (mstEdges.length < nodes.length - 1) {
    steps.push(`\nWarning: Graph is disconnected. MST has ${mstEdges.length} edges (expected ${nodes.length - 1}).`);
  }

  steps.push(`\nMST Edges:`);
  mstEdges.forEach(edge => {
    steps.push(`  ${edge.from} ↔ ${edge.to} (weight: ${edge.weight})`);
  });

  return {
    mstEdges,
    totalWeight,
    steps: steps.join('\n'),
    visitedEdges: mstEdges.map(e => ({ source: e.from, target: e.to }))
  };
}

/**
 * Helper function to reconstruct path from parent array
 */
function reconstructPath(parent, source, target) {
  const path = [];
  let current = target;

  while (current !== null) {
    path.unshift(current);
    current = parent[current];
  }

  return path[0] === source ? path : [];
}

/**
 * Helper function to build list of visited edges for visualization
 */
function buildVisitedEdges(parent, nodes) {
  const edges = [];
  nodes.forEach(node => {
    if (parent[node.id] !== null) {
      edges.push({
        source: parent[node.id],
        target: node.id
      });
    }
  });
  return edges;
}

/**
 * Main function to run selected algorithm
 */
function runAlgorithm(algorithmName, nodes, links, sourceId) {
  if (nodes.length === 0) {
    return {
      success: false,
      message: 'Graph is empty. Please add some nodes first.'
    };
  }

  try {
    let result;
    
    switch (algorithmName) {
      case 'dijkstra':
        if (!sourceId) {
          return { success: false, message: 'Please select a source node for Dijkstra\'s algorithm.' };
        }
        result = dijkstra(nodes, links, sourceId);
        break;
        
      case 'bfs':
        if (!sourceId) {
          return { success: false, message: 'Please select a source node for BFS.' };
        }
        result = bfs(nodes, links, sourceId);
        break;
        
      case 'dfs':
        if (!sourceId) {
          return { success: false, message: 'Please select a source node for DFS.' };
        }
        result = dfs(nodes, links, sourceId);
        break;
        
      case 'prim':
        if (!sourceId) {
          return { success: false, message: 'Please select a source node for Prim\'s algorithm.' };
        }
        result = prim(nodes, links, sourceId);
        break;
        
      case 'kruskal':
        result = kruskal(nodes, links);
        break;
        
      default:
        return { success: false, message: 'Unknown algorithm selected.' };
    }

    return {
      success: true,
      result: result
    };
  } catch (error) {
    return {
      success: false,
      message: `Error running algorithm: ${error.message}`
    };
  }
}