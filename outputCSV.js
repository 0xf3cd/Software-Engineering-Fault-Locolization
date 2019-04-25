const xlsx = require("node-xlsx");
const fs = require("fs")
 
const write = function(fineName, data) {
    const buffer = xlsx.build([
        {'name': 'Groups', 'data': data}
    ]);
    fs.writeFileSync(fineName, buffer, 'binary');
}
 
module.exports = {
    writeCSV: write
};