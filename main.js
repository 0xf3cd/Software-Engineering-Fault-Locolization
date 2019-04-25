const child_process = require('child_process');
const spawnSync = child_process.spawnSync;
const execSync = child_process.execSync;
const fs = require('fs');

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

const analyzeResult = function(result) {
    result = result.split('\n');
    result = result.map(element => { return element.split(':'); });

    rec = []
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
            T.push(rec);
        } else {
            F.push(rec);
        }
    }

    return {
        T: T,
        F: F
    };
}

// console.log(process.argv);
// const r = analyzeResult(getResult('./A', 'a.c', '1 9 8\n'));
// console.log(r)
const {T, F} = analyzeCases('./A', 'a.c', 'cases');
console.log(T);