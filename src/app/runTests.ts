import { HashiGraph, display } from './solver';

// const getAllTestMethods = (obj) => {
//     let methods = new Set();
//     while (obj = Reflect.getPrototypeOf(obj)) {
//       let keys = Reflect.ownKeys(obj)
//       keys.forEach((k) => methods.add(k));
//     }

//     return [...methods].filter((f: string) => f.startsWith('test'));
// }

class HashiSolverTester {
    testHardPuzzle() {
        const puzzle = [
            '3.5..5.3....5.2',
            '....2.....1....',
            '.2.............',
            '..4.4..2..2...1',
            '...............',
            '.5...7.6....7.1',
            '........4.4....',
            '...........1.2.',
            '........2......',
            '.2.............',
            '...............',
            '...2.4.........',
            '4......5..4....',
            '............2..',
            '1..1.2.4...4.3.',
        ];

        const g = HashiGraph.fromState(puzzle);
        display(g.state);
        const n = g.nodes[11]; // node
        console.log(n);

        let encodings = g.computeAllLayoutNumbers(n);
        console.log(encodings);

        console.log('Applying this layout encoding:', encodings[0]);
        g.applyLayoutEncoding(n, encodings[0]);
        display(g.state);
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


