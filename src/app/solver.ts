interface PuzzleNode {
    index: number;
    row: number;
    col: number;
    east: number | null;
    west: number | null;
    north: number | null;
    south: number | null;
    originalConnections: number;
    connections: number;
}

export type StringState = string[];
export function display(state: StringState) {
    console.log('');
    for (let i = 0; i < state.length; i++) {
        console.log(`"${state[i]}"`);
    }
    console.log('');
}

function arrayRepeat<T>(value: T, times: number): T[] {
	let arr = [];
	for (let i = 0; i < times; i++) {
  	  arr.push(value);
    }

    return arr;
}

function multiDimRepeat<T>(value: T, rowCount: number, colCount: number): T[][] {
    let arr = [];
    for (let iy = 0; iy < rowCount; iy++) {
        arr.push( arrayRepeat<T>(value, colCount) );
    }

    return arr;
}

const EMPTY_CELL_VALUE = '.';
const VERTICAL_SINGLE_BRIDGE_CHAR = '|';
const VERTICAL_DOUBLE_BRIDGE_CHAR = "\u2016";
const HORIZONTAL_SINGLE_BRIDGE_CHAR = '-';
const HORIZONTAL_DOUBLE_BRIDGE_CHAR = '=';

const GRAPH_NO_CONNECTION = 0;
const GRAPH_CONNECTION_NO_BRIDGE = 1;
const MAX_BRIDGES_BETWEEN_NODES = 2;

// Usage of this type won't work when the values won't be resolved until run-time
// TypeScript only performs static type checking at compile time. When it's compiled
// into vanilla-Javascript ALL type information is discarded. This type which tries to
// restrict an edge to a specific range of values does NOTHING!
// type number = 0 | 1 | 2 | 3;

export class HashiGraph {
    state: StringState;
    nodes: PuzzleNode[];

    adjMatrix: number[][];

    // node cache
    private nodeCache: { [key: string]: number; } = {};

    constructor(state: StringState) {
        this.state = state;
        this.nodes = [];
        this.adjMatrix = [];
    }

    clone(): HashiGraph {
        const g = new HashiGraph( this.computeUpdatedState() );

        g.adjMatrix = this.cloneAdjMatrix();
        this.cloneNodes(g);
        return g;
    }

    isSolved(): boolean {
        return this.nodes.every((n) => n.connections === 0) // && this.isConnected();
    }

    showSolutionState(): StringState | null {
        if (!this.isSolved()) {
            return null;
        }

        return this.computeUpdatedState(false);
    }

    computeUpdatedState(showConnectionsRemaining: boolean = true): StringState {
        const width = this.state[0].length;
        let updatedState = multiDimRepeat<string>(EMPTY_CELL_VALUE, this.state.length, width);
        for (let n of this.nodes) {
            updatedState[`${n.row}`][`${n.col}`] = showConnectionsRemaining ? n.connections : n.originalConnections;
        }

        // add bridges
        for (let n of this.nodes) {
            if ((n.north || n.north === 0) && this.adjMatrix[n.index][n.north] > GRAPH_CONNECTION_NO_BRIDGE) {
                const bridgeCount = this.adjMatrix[n.index][n.north] - 1;
                const northNode = this.nodes[n.north];
                for (let r = n.row - 1; r > northNode.row ; r--) {
                    updatedState[r][n.col] = bridgeCount === GRAPH_CONNECTION_NO_BRIDGE ? VERTICAL_SINGLE_BRIDGE_CHAR : VERTICAL_DOUBLE_BRIDGE_CHAR;
                }
            }

            if ((n.west || n.west === 0) && this.adjMatrix[n.index][n.west] > GRAPH_CONNECTION_NO_BRIDGE) {
                const bridgeCount = this.adjMatrix[n.index][n.west] - 1;
                const westNode = this.nodes[n.west];
                for (let c = n.col - 1; c > westNode.col ; c--) {
                    updatedState[n.row][c] = bridgeCount === 1 ? HORIZONTAL_SINGLE_BRIDGE_CHAR : HORIZONTAL_DOUBLE_BRIDGE_CHAR;
                }
            }
        }

        return updatedState.map((r) => r.join(""));
    }

    addNode(node: PuzzleNode) {
        this.nodes.push(node);
        this.updateNodeCache(node, this.nodes.length - 1);
    }

    getNodeAt(row: number, col: number): PuzzleNode {
        return this.nodes[ this.getNodeIndexAt(row, col) ];
    }

    getNodeIndexAt(row: number, col: number): number {
        return this.nodeCache[ this.keyByRowCol(row, col) ];
    }

    getNodeWithLowestBridges() {
        return this.nodes.filter((n) => n.connections >= 1).sort((n1, n2) => {
            return n1.connections - n2.connections;
        })[0];
    }

    findWestNode(n: PuzzleNode) {
        for (let col = n.col - 1; col >= 0; col--) {
            if (this.isBridgeChar(this.state[n.row][col])) {
                return null;
            }

            if (this.state[n.row][col] >= '1' && this.state[n.row][col] <= '6') {
                return this.getNodeAt(n.row, col);
            }
        }

        return null;
    }

    findEastNode(n: PuzzleNode) {
        for (let col = n.col + 1; col < this.state[0].length; col++) {
            if (this.isBridgeChar(this.state[n.row][col])) {
                return null;
            }

            if (this.state[n.row][col] >= '1' && this.state[n.row][col] <= '6') {
                return this.getNodeAt(n.row, col);
            }
        }
        
        return null;
    }

    findNorthNode(n: PuzzleNode) {
        for (let row = n.row - 1; row >= 0; row--) {
            if (this.isBridgeChar(this.state[row][n.col])) {
                return null;
            }

            if (this.state[row][n.col] >= '1' && this.state[row][n.col] <= '6') {
                return this.getNodeAt(row, n.col);
            }
        }
        
        return null;
    }

    findSouthNode(n: PuzzleNode) {
        for (let row = n.row + 1; row < this.state.length; row++) {
            if (this.isBridgeChar(this.state[row][n.col])) {
                return null;
            }

            if (this.state[row][n.col] >= '1' && this.state[row][n.col] <= '6') {
                return this.getNodeAt(row, n.col);
            }
        }
        
        return null;
    }

    static fromState(state: StringState) {
        const g: HashiGraph = new HashiGraph(state);

        // create nodes
        state.map((s: string, row: number) => {
            const nodes = [];
            for (let col = 0; col < s.length; col++) {
                if (g.isNodeCell(s[col])) {
                    g.addNode({
                        index: g.nodes.length,
                        row: row,
                        col: col,
                        connections: parseInt(s[col], 10),
                        originalConnections: parseInt(s[col], 10),
                        east: null,
                        west: null,
                        north: null,
                        south: null,
                    });
                }
            };

            return nodes;
        });

        g.adjMatrix = multiDimRepeat(GRAPH_NO_CONNECTION, g.nodes.length, g.nodes.length);

        // create edges (up to 4, one for each cardinal direction)
        // => 0 means no connection between the nodes
        // => 1 means two nodes are adjacent but no bridges
        // => 2 means two nodes are adjacent and exactly 1 bridge exists between them
        // => 3 means two nodes are adjacent and exactly 2 bridges exists between them
        g.nodes.forEach((n, idx) => {
            const east = g.findEastNode(n);
            if (east) {
                const eastIdx = g.getNodeIndexAt(east.row, east.col);
                g.adjMatrix[idx][eastIdx] = GRAPH_CONNECTION_NO_BRIDGE;
                g.adjMatrix[eastIdx][idx] = GRAPH_CONNECTION_NO_BRIDGE;
                n.east = eastIdx;
            }

            const west = g.findWestNode(n);
            if (west) {
                const westIdx = g.getNodeIndexAt(west.row, west.col);
                g.adjMatrix[idx][westIdx] = GRAPH_CONNECTION_NO_BRIDGE;
                g.adjMatrix[westIdx][idx] = GRAPH_CONNECTION_NO_BRIDGE;
                n.west = westIdx;
            }

            const north = g.findNorthNode(n);
            if (north) {
                const northIdx = g.getNodeIndexAt(north.row, north.col);
                g.adjMatrix[idx][northIdx] = GRAPH_CONNECTION_NO_BRIDGE;
                g.adjMatrix[northIdx][idx] = GRAPH_CONNECTION_NO_BRIDGE;
                n.north = northIdx;
            }

            const south = g.findSouthNode(n);
            if (south) {
                const southIdx = g.getNodeIndexAt(south.row, south.col);
                g.adjMatrix[idx][southIdx] = GRAPH_CONNECTION_NO_BRIDGE;
                g.adjMatrix[southIdx][idx] = GRAPH_CONNECTION_NO_BRIDGE;
                n.south = southIdx;
            }
        });

        return g;
    }

    keyByNode(n: PuzzleNode) {
        return this.keyByRowCol(n.row, n.col);
    }

    keyByRowCol(row: number, col: number) {
        return `[${row},${col}]`;
    }

    atBridgeCapacity(nodeIndex: number, otherNodeIndex: number, additionalBridges: number): boolean {
        const node = this.nodes[nodeIndex];
        const otherNode = this.nodes[otherNodeIndex];
        return node.connections - additionalBridges < 0 || otherNode.connections - additionalBridges < 0;
    }

    // This call is a no-op if the desired number of bridges couldn't be added between the two nodes
    // @return [successful]
    addBridgesBetween(srcNodeIndex: number, destNodeIndex: number, bridgeCount: number): boolean {
        if (bridgeCount === 0) {
            return false;
        }

        // if the two nodes are not connected
        if (this.adjMatrix[srcNodeIndex][destNodeIndex] === 0 && this.adjMatrix[destNodeIndex][srcNodeIndex] === 0) {
            return false;
        }

        const srcBridgeCountAfter = this.adjMatrix[srcNodeIndex][destNodeIndex] - 1 + bridgeCount;
        const destBridgeCountAfter = this.adjMatrix[destNodeIndex][srcNodeIndex] - 1 + bridgeCount;
        if (srcBridgeCountAfter > MAX_BRIDGES_BETWEEN_NODES || destBridgeCountAfter > MAX_BRIDGES_BETWEEN_NODES) {
            return false;
        }

        this.adjMatrix[srcNodeIndex][destNodeIndex] += bridgeCount;
        this.nodes[srcNodeIndex].connections -= bridgeCount;

        this.adjMatrix[destNodeIndex][srcNodeIndex] += bridgeCount;
        this.nodes[destNodeIndex].connections -= bridgeCount;

        return true;
    }

    canEncodingBeApplied(node: PuzzleNode, encoding: string): boolean {
        const bridges = encoding.split('').map((n) => parseInt(n, 10));
        let canApplyToNorth = (!node.north && node.north !== 0 || bridges[0] === 0) ||
            !this.atBridgeCapacity(node.index, node.north, bridges[0]) && !this.anyObstructionsBetween(node, this.nodes[node.north]);
    
        let canApplyToEast = (!node.east && node.east !== 0 || bridges[1] === 0) ||
            !this.atBridgeCapacity(node.index, node.east, bridges[1]) && !this.anyObstructionsBetween(node, this.nodes[node.east]);

        let canApplyToSouth = (!node.south && node.south !== 0 || bridges[2] === 0) ||
            !this.atBridgeCapacity(node.index, node.south, bridges[2]) && !this.anyObstructionsBetween(node, this.nodes[node.south]);

        let canApplyToWest = (!node.west && node.west !== 0 || bridges[3] === 0) ||
            !this.atBridgeCapacity(node.index, node.west, bridges[3]) && !this.anyObstructionsBetween(node, this.nodes[node.west]);

        return canApplyToNorth && canApplyToEast && canApplyToSouth && canApplyToWest;
    }

    // @return [boolean] -> if layout encoding was successfully applied or not
    applyLayoutEncoding(node: PuzzleNode, encoding: string): boolean {
        // consider an empty encoding as unsuccessfully applied
        if (encoding === '0000') {
            return false;
        }

        if (!this.canEncodingBeApplied(node, encoding)) {
            return false;
        }

        if ((node.north || node.north === 0) && encoding[0] != '0') {
            const bridgeCount = parseInt(encoding[0], 10);
            this.addBridgesBetween(node.index, node.north, bridgeCount);
        }

        if ((node.east || node.east === 0) && encoding[1] != '0') {
            const bridgeCount = parseInt(encoding[1], 10);
            this.addBridgesBetween(node.index, node.east, bridgeCount);
        }

        if ((node.south || node.south === 0) && encoding[2] != '0') {
            const bridgeCount = parseInt(encoding[2], 10);
            this.addBridgesBetween(node.index, node.south, bridgeCount);
        }

        if ((node.west || node.west === 0) && encoding[3] != '0') {
            const bridgeCount = parseInt(encoding[3], 10);
            this.addBridgesBetween(node.index, node.west, bridgeCount);
        }

        this.state = this.computeUpdatedState();
        return true;
    }

    // N E S W (clockwise)
    computeAllLayoutNumbers(node: PuzzleNode): string[] {
        const adjCount = +!!(node.east || node.east === 0) + 
                         +!!(node.west || node.west === 0) +
                         +!!(node.north || node.north === 0) +
                         +!!(node.south || node.south === 0);


        const encodings = this.computeCombos_recur(node.connections, adjCount, adjCount, '');
        return encodings.map((e) => {
            const chars = e.split('');
            let normalized: string[] = ['0', '0', '0', '0'];
            let chIdx = 0;
            if (node.north || node.north === 0) {
                normalized[0] = chars[chIdx];
                chIdx++;
            }

            if (node.east || node.east === 0) {
                normalized[1] = chars[chIdx];
                chIdx++;
            }

            if (node.south || node.south === 0) {
                normalized[2] = chars[chIdx];
                chIdx++;
            }

            if (node.west || node.west === 0) {
                normalized[3] = chars[chIdx];
            }

            return normalized.join('');
        });
    }

    computeCombos_recur(target: number, neighborsLeft: number, numsCount: number, currEncoding: string): string[] {
        if (target < 0 || target > neighborsLeft * 2) {
            return [];
        }

        if (target === 0 && currEncoding.length === numsCount) {
            return [currEncoding];
        }

        const encodings = [];
        for (let i = 0; i < 3; i++) {
            const moreEncodings = this.computeCombos_recur(target - i, neighborsLeft - 1, numsCount, `${currEncoding}${i}`);
            if (moreEncodings.length > 0) {
                encodings.push(...moreEncodings);
            }
        }

        return encodings;
    }

    isConnected() {
        const visited = this.dfs_iter(this.nodes[0]); // start from the first node
        const allIndices = this.nodes.map(n => n.index);
        const stillRemaining = allIndices.filter(x => !visited.includes(x));
        return stillRemaining.length === 0;
    }

    // @return number[] : index of all nodes visited when performed a DFS starting from 'startNode'
    private dfs_iter(startNode: PuzzleNode): number[] {
        let s = [startNode.index];
        let visited = [startNode.index];
        while (s.length > 0) {
            let nIdx = s.pop();
            let v = this.nodes[nIdx];
            if (!visited.includes(v.index)) {
                visited.push(v.index);
                if (v.north || v.north === 0) {
                    s.push(v.north);
                }

                if (v.east || v.east === 0) {
                    s.push(v.east);
                }

                if (v.south || v.south === 0) {
                    s.push(v.south);
                }

                if (v.west || v.west === 0) {
                    s.push(v.west);
                }
            }
        }

        return visited;
    }

    private anyObstructionsBetween(n1: PuzzleNode, n2: PuzzleNode): boolean {
        if ( (n1.row !== n2.row) && (n1.col !== n2.col) ) {
            return true;
        }

        let pathBetween = '';
        if (n1.row === n2.row) {
            pathBetween = this.state[n1.row].slice(n1.col + 1, n2.col);
        }

        if (n1.col === n2.col) {
            const startRow = Math.min(n1.row, n2.row);
            const endRow = Math.max(n1.row, n2.row);
            for (let i = startRow + 1; i < endRow; i++) {
                pathBetween += this.state[i][n1.col];
            }
        }

        return pathBetween.split('').some((ch) => this.isBridgeChar(ch));
    }

    private isNodeCell(c: string): boolean {
        return c >= '1' && c <= '6';
    }

    private isBridgeChar(ch: string): boolean {
        return [VERTICAL_SINGLE_BRIDGE_CHAR, VERTICAL_DOUBLE_BRIDGE_CHAR, HORIZONTAL_SINGLE_BRIDGE_CHAR, HORIZONTAL_DOUBLE_BRIDGE_CHAR].includes(ch);
    }

    private cloneAdjMatrix(): number[][] {
        const cloned = [];
        for (let row of this.adjMatrix) {
            cloned.push( row.slice() );
        }
        return cloned;
    }

    private cloneNodes(g: HashiGraph) {
        for (let n of this.nodes) {
            g.addNode({ ...n }); // shallow clone
        }
    }

    private  updateNodeCache(node: PuzzleNode, idx: number) {
        this.nodeCache[ this.keyByNode(node) ] = idx;
    }

}

export class HashiSolver {
    initialState: StringState;

    constructor(initialState: StringState) {
        this.initialState = initialState;
    }

    private displaySolution(g: HashiGraph) {
        const solution = g.showSolutionState();
        display(solution);
    }

    solve() {
        let iterations = 0;
        display(this.initialState);
        const states = [ HashiGraph.fromState(this.initialState) ];

        let puzzleIsSolved = false;
        while (!puzzleIsSolved && states.length > 0) {
            const nextGraph = states.pop();

            if (nextGraph.isSolved()) {
                console.log("The puzzle was solved after processing", iterations, "states.");
                this.displaySolution(nextGraph);
                return;
            }
            iterations++;
            
            const nextNode = nextGraph.getNodeWithLowestBridges();
            if (!nextNode) {
                console.log(`next node is null. Processed ${iterations} states. Aborting!`);
                return;
            }
            // console.log(nextNode);
            const encodings = nextGraph.computeAllLayoutNumbers(nextNode);
            // console.log(encodings);
            // console.log('-------------------------');
            for(let e of encodings) {
                let newGraph = nextGraph.clone();
                const success = newGraph.applyLayoutEncoding(nextNode, e);
                if (success) {
                    puzzleIsSolved = nextGraph.isSolved();
                    if (puzzleIsSolved) {
                        console.log('Found solution after processing', iterations, ' states.');
                    }
                    states.push(newGraph);
                }
            }
        }

        console.log(`Ran out of states to process. Processed ${iterations} states.`);
    }

    solveExperimental() {
        const g = HashiGraph.fromState(this.initialState);
        console.log(g.state);
        let node = g.nodes[1];
        console.log(node);
        let layoutEncodings = g.computeAllLayoutNumbers(node);
        console.log(layoutEncodings);

        console.log('Applying this layout encoding:', layoutEncodings[0]);
        let success = g.applyLayoutEncoding(node, layoutEncodings[0])
        console.log('Application', success ? 'successful.' : 'failed.');
        display(g.computeUpdatedState());
        // console.log(g.computeUpdatedState());

        console.log('----------------------------------');
        console.log('----------------------------------');
        // console.log(g.state);
        display(g.state);
        node = g.nodes[4];
        console.log(node);
        layoutEncodings = g.computeAllLayoutNumbers(g.nodes[4]);
        console.log(layoutEncodings);
        console.log('Applying this layout encoding:', layoutEncodings[0]);
        success = g.applyLayoutEncoding(node, layoutEncodings[0])
        console.log('Application', success ? 'successful.' : 'failed.');
        display(g.computeUpdatedState());
    }
}
