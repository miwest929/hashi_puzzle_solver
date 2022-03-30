import { HashiGraph, display, StringState } from './solver';

// const getAllTestMethods = (obj) => {
//     let methods = new Set();
//     while (obj = Reflect.getPrototypeOf(obj)) {
//       let keys = Reflect.ownKeys(obj)
//       keys.forEach((k) => methods.add(k));
//     }

//     return [...methods].filter((f: string) => f.startsWith('test'));
// }

const assertEncodings = (expect: string[], actual: string[]) => {
    if (expect.toString() !== actual.toString()) {
        throw new Error(`Given encodings differs from expected: ${expect}`);
    }
}

const assertState = (expect: StringState, actual: StringState) => {
    if (expect.length !== actual.length) {
        throw new Error(`The two provided states are of different lengths so are different by extension.`);
    }
    
    for (let i = 0; i < expect.length; i++) {
        if (expect[i] !== actual[i]) {
            throw new Error(`
                Line ${i} of state is different that what's expected.
                expect: ${expect[i]}
                actual: ${actual[i]}
            `);
        }
    }
}

class HashiSolverTester {
    testHardPuzzle() {
        // '3.5..5.3....5.2',
        // '....2.....1....',
        // '.2.............',
        // '..4.4..2..2...1',
        // '...............',
        // '.5...7.6....7.1',
        // '........4.4....',
        // '...........1.2.',
        // '........2......',
        // '.2.............',
        // '...............',
        // '...2.4.........',
        // '4......5..4....',
        // '............2..',
        // '1..1.2.4...4.3.',
        const puzzle = [
            '.4.....2..',
            '..1...3..4',
            '.4.....1..',
            '2.........',
            '.3...4...3',
            '......1...',
            '.3.1......',
            '3.....2..2',
            '.2..1.....',
            '2..2.4...2',
        ];
        const g = HashiGraph.fromState(puzzle);
        display(g.state);

        let n = g.nodes[3]; // node
        console.log(n);
        let encodings = g.computeAllLayoutNumbers(n);
        assertEncodings(encodings, ['0012', '0021', '0102', '0111', '0120', '0201', '0210']);
        let e = encodings[3];
        console.log('Applying this layout encoding:', e);
        let success = g.applyLayoutEncoding(n, e); // '0111'
        if (!success) {
            throw new Error(`Applying encoding '${e}' to graph failed.`);
        }
        display(g.computeUpdatedState(false));
        assertState([
            '.4.....2..',
            '..1---3--4',
            '.4....|1..',
            '2.....|...',
            '.3...4|..3',
            '......1...',
            '.3.1......',
            '3.....2..2',
            '.2..1.....',
            '2..2.4...2',
        ], g.computeUpdatedState(false));
        console.log("\n");

        n = g.nodes[5];
        console.log(n);
        encodings = g.computeAllLayoutNumbers(n);
        assertEncodings(encodings, ['0220', '1120', '1210', '2020', '2110', '2200']);

        e = encodings[1];
        console.log('Applying this layout encoding:', e);
        success = g.applyLayoutEncoding(n, e); // '1120'
        if (success) {
            throw new Error(`Applying encoding '${e}' to graph succeeded where it should have failed.`);
        }
        else {
            console.log(`was not successful`);
        }

        e = encodings[3];
        display(g.computeUpdatedState(false));
        console.log(n);

        success = g.applyLayoutEncoding(n, e); // '2020'
        console.log('Applying this layout encoding:', e);
        if (!success) {
            throw new Error(`Applying encoding '${e}' to graph failed.`);
        }
        display(g.computeUpdatedState(false));
        console.log(n);

        // n = g.nodes[1];
        // console.log(n);
        // console.log(g.computeAllLayoutNumbers(n));
    }

    testMediumPuzzle() {

    }

    testLargePuzzle() {
    
    }
}

const testHarness = new HashiSolverTester();
testHarness.testHardPuzzle();
// const testFuncs: string[] = getAllTestMethods(testHarness);
// for (let func of testFuncs) {
//     testHarness[func]();
// }
// console.log(testFuncs);


