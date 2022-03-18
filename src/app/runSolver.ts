import * as fs from 'fs';
import { HashiSolver } from './solver';

// Below functions don't require any context
// It's completely separated from the other entities presented in this file
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

const main = () => {
    const easyContents = loadFileAsLines('puzzles/easy');
    const mediumContents = loadFileAsLines('puzzles/medium');
    const hardContents = loadFileAsLines('puzzles/hard');

    const puzzles = splitIntoPuzzles(hardContents);

    const solver = new HashiSolver(puzzles[4]);
    solver.solve();

    // const solver2 = new HashiSolver([
    //     '3.....1',
    //     '...0-0|',
    //     '2.5.4||',
    //     '|....||',
    //     '|...2||',
    //     '0.5..2|',
    //     '.0----0'
    // ]);
    //solver.solveExperimental();
};

main();