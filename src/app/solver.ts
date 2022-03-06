import * as fs from 'fs';

function loadFileAsLines(filepath: string): string[] {
    if (fs.readFileSync) {
        const contents = fs.readFileSync(filepath, 'utf8');
        return contents.split("\n");
    }
    return [];
}

const splitIntoPuzzles = (contents: string[]) => {
    let puzzles: string[][] = [];
    let lineIdx = 0;
    while (lineIdx < contents.length) {
        // console.log(contents[lineIdx]);
        const [rowsCountStr, colsCountStr] = contents[lineIdx].split(' ');
        const rowsCount = parseInt(rowsCountStr, 10);
        const colsCount = parseInt(colsCountStr, 10);

        let currPuzzle = [];
        for (let i = 1; i <= rowsCount; i++) {
            const currPuzzleLine = contents[lineIdx + i];
            if (currPuzzleLine.length != colsCount) {
                throw new Error(`Row has incorrect number of columns, line ${lineIdx + i}: actual = ${currPuzzleLine.length}, expected = ${colsCount}`);
            }

            currPuzzle.push(currPuzzleLine);
        }
        puzzles.push(currPuzzle);

        lineIdx += 1 + rowsCount;
    }

    return puzzles;
}

/*
    '.1.4..3',
    '3.3....',
    '.......',
    '..1....',
    '.......',
    '3..2...',
    '..2...3'
*/
const DOUBLE_CONNECTION_VALUE = '=';

interface PuzzleNode {
    index: number;
    row: number;
    col: number;
    east: number | null;
    west: number | null;
    north: number | null;
    south: number | null;
    connections: number;
}

type StringState = string[];

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

class HashiGraph {
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
        return this.nodes.every((n) => n.connections === 0);
    }

    computeUpdatedState(): StringState {
        const width = this.state[0].length;
        let updatedState = multiDimRepeat<string>(EMPTY_CELL_VALUE, this.state.length, width);
        for (let n of this.nodes) {
            updatedState[`${n.row}`][`${n.col}`] = n.connections;
        }

        // add bridges
        for (let n of this.nodes) {
            if (n.north && this.adjMatrix[n.index][n.north] > 1) {
                // '|' or \u20166
                const bridgeCount = this.adjMatrix[n.index][n.north] - 1;
                const northNode = this.nodes[n.north];
                for (let r = n.row - 1; r > northNode.row ; r--) {
                    updatedState[r][n.col] = bridgeCount === 1 ? VERTICAL_SINGLE_BRIDGE_CHAR : VERTICAL_DOUBLE_BRIDGE_CHAR; 
                }
            }

            if (n.west && this.adjMatrix[n.index][n.west] > 1) {
                // '=' or '-'
                const bridgeCount = this.adjMatrix[n.index][n.west] - 1;
                const westNode = this.nodes[n.west];
                for (let c = n.col - 1; c > westNode.col ; c--) {
                    updatedState[n.row][c] = bridgeCount === 1 ? HORIZONTAL_SINGLE_BRIDGE_CHAR : HORIZONTAL_DOUBLE_BRIDGE_CHAR; 
                }
            }
        }

        return updatedState.map((r) => r.join(''));
    }

    addNode(node: PuzzleNode) {
        this.nodes.push(node);
        this.updateNodeCache(node, this.nodes.length - 1);
    }

    updateNodeCache(node: PuzzleNode, idx: number) {
        this.nodeCache[ this.keyByNode(node) ] = idx;
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

    heuristicValue() {
        return this.nodes.reduce((acc, n) => acc + n.connections, 0);
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
                        east: null,
                        west: null,
                        north: null,
                        south: null,
                    });
                }
            };

            return nodes;
        });

        g.adjMatrix = multiDimRepeat(0, g.nodes.length, g.nodes.length);

        // create edges (up to 4, one for each cardinal direction)
        // => 0 means no connection between the nodes
        // => 1 means two nodes are adjacent but no bridges
        // => 2 means two nodes are adjacent and exactly 1 bridge exists between them
        // => 3 means two nodes are adjacent and exactly 2 bridges exists between them
        g.nodes.forEach((n, idx) => {
            const east = g.findEastNode(n);
            if (east) {
                const eastIdx = g.getNodeIndexAt(east.row, east.col);
                g.adjMatrix[idx][eastIdx] = 1;
                g.adjMatrix[eastIdx][idx] = 1;
                n.east = eastIdx;
            }

            const west = g.findWestNode(n);
            if (west) {
                const westIdx = g.getNodeIndexAt(west.row, west.col);
                g.adjMatrix[idx][westIdx] = 1;
                g.adjMatrix[westIdx][idx] = 1;
                n.west = westIdx;
            }

            const north = g.findNorthNode(n);
            if (north) {
                const northIdx = g.getNodeIndexAt(north.row, north.col);
                g.adjMatrix[idx][northIdx] = 1;
                g.adjMatrix[northIdx][idx] = 1;
                n.north = northIdx;
            }

            const south = g.findSouthNode(n);
            if (south) {
                const southIdx = g.getNodeIndexAt(south.row, south.col);
                g.adjMatrix[idx][southIdx] = 1;
                g.adjMatrix[southIdx][idx] = 1;
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

    createBridgeBetween(srcNodeIndex: number, destNodeIndex: number, bridgeCount: number) {
        // if the two nodes are not actuallly connected
        if (this.adjMatrix[srcNodeIndex][destNodeIndex] === 0 && this.adjMatrix[destNodeIndex][srcNodeIndex] === 0) {
            return;
        }

        console.log(`srcNodeIndex = ${srcNodeIndex}, destNodeIndex = ${destNodeIndex}, bridgeCount = ${bridgeCount}`);
        this.adjMatrix[srcNodeIndex][destNodeIndex] = bridgeCount + 1;
        this.nodes[srcNodeIndex].connections -= bridgeCount;

        this.adjMatrix[destNodeIndex][srcNodeIndex] = bridgeCount + 1;
        this.nodes[destNodeIndex].connections -= bridgeCount; 
    }

    applyLayoutEncoding(node: PuzzleNode, encoding: string) {
        const srcNodeIndex = node.index;

        if (node.north && encoding[0] != '0') {
            const bridgeCount = parseInt(encoding[0], 10);
            this.createBridgeBetween(srcNodeIndex, node.north, bridgeCount);
        }

        if (node.east && encoding[1] != '0') {
            const bridgeCount = parseInt(encoding[1], 10);
            this.createBridgeBetween(srcNodeIndex, node.east, bridgeCount);
        }

        if (node.south && encoding[2] != '0') {
            const bridgeCount = parseInt(encoding[2], 10);
            this.createBridgeBetween(srcNodeIndex, node.south, bridgeCount);
        }

        if (node.west && encoding[3] != '0') {
            const bridgeCount = parseInt(encoding[3], 10);
            this.createBridgeBetween(srcNodeIndex, node.west, bridgeCount);
        }
    }

    computeAllLayoutNumbers(node: PuzzleNode): string[] {
        /*
            adjCount = 2
            connections = 3
            [12, 21]

            adjCount = 3
            connections = 5
            [122, 212, 221]

            adjCount = 3
            connections = 4
            [112, 121, 211, 022, 202, 220]

            adjCount = 2
            connections = 5
            [] // impossible to satisfy
        */
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

    private isNodeCell(c: string): boolean {
        return c >= '1' && c <= '6';
        // return c != EMPTY_CELL_VALUE && c != HORIZONTAL_SINGLE_BRIDGE_CHAR && c != HORIZONTAL_DOUBLE_BRIDGE_CHAR;
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
}

// N E S W (clockwise)

class HashiSolver {
    initialState: StringState;

    constructor(initialState: StringState) {
        this.initialState = initialState;
    }

    solve() {
        console.log(this.initialState);

        const g: HashiGraph = HashiGraph.fromState(this.initialState);
        let node = g.nodes[5]; // g.getNodeWithLowestBridges();
        console.log(node);
        const layoutEncodings = g.computeAllLayoutNumbers(node);
        console.log(layoutEncodings);

        console.log('Applying this layout encoding:', layoutEncodings[0]);
        // for (let encoding of layoutEncodings) {
        //     g.applyLayoutEncoding(node, encoding);
        // }
        g.applyLayoutEncoding(node, layoutEncodings[0])
        console.log(g.computeUpdatedState());

        console.log('----------------------------------');

        const clonedGraph = g.clone();
        console.log(clonedGraph.state);
        node = clonedGraph.nodes[6];
        //console.log(clonedGraph.adjMatrix);
        console.log(node);
        const e = g.computeAllLayoutNumbers(node);
        console.log(e);
        console.log('Applying this layout encoding:', e[0]);
        clonedGraph.applyLayoutEncoding(node, e[0])
        console.log(g.computeUpdatedState());

        // g.applyLayoutEncoding(node, layoutEncodes[0]);

        // console.log(g.computeAllLayoutNumbers(g.nodes[2]));

        // console.log(g.computeCombos_recur(5, 3, 3, ''));
        // four digit numbers where each digit is between 0 and 4 inclusively
        // N E S W
        // x y z w
        // ex: 1010 implies that 1 bridge exists to its northern neighbor AND
        //                       1 bridge exists to its southern neighbor
        // summing every digit MUST equal the current node's connection count.

        // g.createSingleConnection(lowestNode, lowestNode.east );

        // const state = new PuzzleState(this.initialState);
    }
}

const main = () => {
    const contents = loadFileAsLines('data/easy_puzzles.txt');
    const puzzles = splitIntoPuzzles(contents);
    // const state = new PuzzleState(puzzles[0]);
    // state.solve();
    const solver = new HashiSolver(puzzles[0]);
    solver.solve();
};

main();