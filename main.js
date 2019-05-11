const child_process = require('child_process');
const spawnSync = child_process.spawnSync;
const execSync = child_process.execSync;
const fs = require('fs');
const {writeCSV} = require('./outputCSV');

// use gcc to get the coverage of a case
const getResult = function(path, srcFile, input) {
    const [name, fileType] = srcFile.split('.');
    const tempName = `${name}_t`;

    spawnSync('cp', [`${path}/${srcFile}`, `./${tempName}.${fileType}`], {});

    // compile the copied source file
    const clang = spawnSync('clang', ['-fprofile-arcs', '-ftest-coverage', `${tempName}.${fileType}` , '-o', tempName], {});

    // let fileIn = fs.openSync('in', 'r');
    // let fileOut = fs.openSync('out', 'w');
    const execute = spawnSync(`./${tempName}`, [], {
        detached: true,
        input: input,
        // stdio: ['pipe', 'pipe', 'ignore']
    });
    // console.log(execute.stdout.toString());

    spawnSync('gcov', [`${tempName}.c`], {});
    const result = spawnSync('cat', [`${tempName}.c.gcov`], {});
    // console.log(result.stdout.toString().split('\n'));

    execSync(`rm ${tempName}*`);

    return result.stdout.toString();
};

// analyze the coverage info from gcc
// transform the coverage info
const analyzeResult = function(result) {
    result = result.split('\n');
    result = result.map(element => { return element.split(':'); });

    let rec = new Array();
    result.forEach(element => {
        if(parseInt(element[1]) > 0) {
            let useInfo = element[0].trim();
            let rowNum = parseInt(element[1]);
            element[2] = element[2].trim();
            let isCurly = element[2] === '{' || element[2] === '}';
            rec.push([useInfo, rowNum, isCurly]);
        }
    });

    rec = rec.map(element => {
        return [element[1], (element[0]!=='#####' || element[2])];
    });
    
    return rec;
};

// split the source file into rows into a Map
// Map[theNumberOfRow] = the code of the row
const splitCode = function(result) {
    result = result.split('\n');
    result = result.map(element => { return element.split(':'); });

    const code = new Map();
    result.forEach(element => {
        if(!parseInt(element[1])) {
            return;
        }

        const rowNum = parseInt(element[1]);

        let codeOfRow = '';
        for(let i = 2; i < element.length; i++) {
            if(i >= 3) {
                codeOfRow += ':';
            }
            codeOfRow += element[i];
        }

        code.set(rowNum, codeOfRow);
    });

    return code;
};

// get coverage info of each case
const analyzeCases = function(path, srcFile, caseFile) {
    const T = new Array();
    const F = new Array();

    const cases = fs.readFileSync(`${path}/${caseFile}`).toString().split('\n');
    for(let i = 1; i <= parseInt(cases[0]); i++) {
        const input = cases[i].slice(0, -1) + '\n';
        const TorF = cases[i].slice(-1);
        const result = getResult(path, srcFile, input);
        const rec = analyzeResult(result);
        
        if(TorF === 'T') {
            T.push([input, rec]);
        } else {
            F.push([input, rec]);
        }
    }

    const codeMap = splitCode(getResult(path, srcFile, cases[1].slice(0, -1)));
    
    return {
        T: T,
        F: F,
        codeMap: codeMap
    };
};

// count the amount of passed case and failed cases of each statement
const sumUp = function(T, F) {
    const lineNum = T[0][1].length;
    const TNum = T.length;
    const FNum = F.length;
    const list = new Map();

    for(let i = 1; i <= lineNum; i++) {
        list.set(i, new Array());

        let countPass = 0;
        let countFail = 0;
        for(let j = 0; j < TNum; j++) {
            if(T[j][1][i-1][1]) {
                countPass += 1;
            }
        }

        for(let j = 0; j < FNum; j++) {
            if(F[j][1][i-1][1]) {
                countFail += 1;
            }
        }

        list.get(i)[0] = countPass;
        list.get(i)[1] = countFail;
    }
    
    return list;
};

const Tarantula = function(TNum, FNum, list) {
    const suspiciousness = new Map();
    for(let i = 1; i <= list.size; i++) {
        let countPass = list.get(i)[0];
        let countFail = list.get(i)[1];
        if(countPass + countFail === 0){
            suspiciousness.set(i, 0);
        } else {
            let temp = (countFail/FNum) / ((countPass/TNum) + (countFail/FNum));
            suspiciousness.set(i, temp);
        }
    }

    return suspiciousness;
};

const Jaccard = function(TNum, FNum, list) {
    const suspiciousness = new Map();
    for(let i = 1; i <= list.size; i++) {
        let countPass = list.get(i)[0];
        let countFail = list.get(i)[1];
        let temp = countFail / (countPass + FNum);
        suspiciousness.set(i, temp);
    }

    return suspiciousness;
};

const Ochiai = function(TNum, FNum, list) {
    const suspiciousness = new Map();
    for(let i = 1; i <= list.size; i++) {
        let countPass = list.get(i)[0];
        let countFail = list.get(i)[1];
        let temp = countFail / Math.sqrt(countFail*(countPass+countFail));
        suspiciousness.set(i, temp);
    }

    return suspiciousness;
};

const SetUnion = function(T, F) {
    let passUnion = new Set();
    let failUnion = new Set();
    const passSet = new Array();
    const failSet = new Array();
    const lineNum = T[0][1].length;
    const TNum = T.length;
    const FNum = F.length;

    for(let i = 0; i < TNum; i++) {
        passSet[i] = new Set();
        for(let j = 0; j < lineNum; j++) {
            if(T[i][1][j][1]) {
                passSet[i].add(j+1);
            }
        }
    }

    for(let i = 0; i < FNum; i++) {
        failSet[i] = new Set();
        for(let j = 0; j < lineNum; j++) {
            if(F[i][1][j][1]) {
                failSet[i].add(j+1);
            }
        }
    }

    for(let i = 0; i < TNum; i++) {
        passUnion = new Set([...passUnion, ...passSet[i]]);
    }

    for(let i = 0; i < FNum; i++) {
        failUnion = new Set([...failUnion, ...failSet[i]]);
    }

    let diff = new Set([...failUnion].filter(element => !passUnion.has(element)));

    const suspiciousness = new Map();
    for(let i = 1; i <= lineNum; i++) {
        if(diff.has(i)) {
            suspiciousness.set(i, 1);
        } else {
            suspiciousness.set(i, 0);
        }
    }

    return suspiciousness;
};

const SetIntersection = function(T, F) {
    let passIntsctn = new Set();
    let failUnion = new Set();
    const passSet = new Array();
    const failSet = new Array();
    const lineNum = T[0][1].length;
    const TNum = T.length;
    const FNum = F.length;

    for(let i = 0; i < TNum; i++) {
        passSet[i] = new Set();
        for(let j = 0; j < lineNum; j++) {
            if(T[i][1][j][1]) {
                passSet[i].add(j+1);
            }
        }
    }

    for(let i = 0; i < FNum; i++) {
        failSet[i] = new Set();
        for(let j = 0; j < lineNum; j++) {
            if(F[i][1][j][1]) {
                failSet[i].add(j+1);
            }
        }
    }

    for(let i = 1; i <= lineNum; i++) {
        passIntsctn.add(i);
    }

    for(let i = 0; i < TNum; i++) {
        passIntsctn = new Set([...passIntsctn].filter(element => passSet[i].has(element)));
    }

    for(let i = 0; i < FNum; i++) {
        failUnion = new Set([...failUnion, ...failSet[i]]);
    }

    let diff = new Set([...passIntsctn].filter(element => !failUnion.has(element)));
    const suspiciousness = new Map();
    for(let i = 1; i <= lineNum; i++) {
        if(diff.has(i)) {
            suspiciousness.set(i, 1);
        } else {
            suspiciousness.set(i, 0);
        }
    }

    return suspiciousness;
};

// output the coverage info to file
const output2File = function(T, F, outFile) {
    const lineNum = T[0][1].length;
    const TNum = T.length;
    const FNum = F.length;
    let data = '';
    data += lineNum+'\n';
    data += TNum+'\n';

    for(let i = 0; i < TNum; i++) {
        for(let j = 0; j < lineNum; j++) {
            if(T[i][1][j][1]) {
                data += '1 '
            } else {
                data += '0 '
            }
        }
        data += '\n';
    }

    data += FNum+'\n';
    for(let i = 0; i < FNum; i++) {
        for(let j = 0; j < lineNum; j++) {
            if(F[i][1][j][1]) {
                data += '1 '
            } else {
                data += '0 '
            }
        }
        data += '\n';
    }

    fs.writeFileSync(outFile, data);
};

// console.log(process.argv);
const path = process.argv[2];
const src = process.argv[3];
const cases = process.argv[4];

const {T, F, codeMap} = analyzeCases(path, src, cases);
const lineNum = T[0][1].length;
const list = sumUp(T, F);
const Tar = Tarantula(T.length, F.length, list);
const Jac = Jaccard(T.length, F.length, list);
const Och = Ochiai(T.length, F.length, list);
const SU = SetUnion(T, F);
const SI = SetIntersection(T, F);
output2File(T, F, './coverage-info');

console.log(SU);

const data = new Array();
const title = ['line', 'code', 'Tarantula', 'Jaccard', 'Ochiai', 'SetUnion', 'SetIntersection'];
data.push(title);
for(let i = 1; i <= lineNum; i++) {
    const line = new Array();
    line[0] = i;
    line[1] = codeMap.get(i).trim();
    line[2] = Tar.get(i);
    line[3] = Jac.get(i);
    line[4] = Och.get(i);
    line[5] = SU.get(i);
    line[6] = SI.get(i);
    data.push(line);
}

writeCSV('./js.csv', data);
// now the info has been saved in js.csv
// run python NN.py to use Neural Network to localize the faults