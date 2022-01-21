var fs = require("fs");
var sax = require("sax")

const xmlFilesDirectory = './xmlfiles'

const { performance } = require('perf_hooks');

class XMLData {
    constructor() {
      this.files = [];
      this.filesById = {};
      this.loaded = false;
      this.loadTimerStart = 0;
      this.errors = [];
      this.init();
    }
    init () {
      console.log('Init XML');
      console.log('Read "xmlfiles"-Directory');
      this.loadTimerStart = performance.now();
      fs.readdir(xmlFilesDirectory, (err, files) => {
        this.files = files.filter(f => typeof f === 'string' && f.toLowerCase().split('.').pop() === 'xml').map( fn => {
          return {
            filename: fn,
            id: null,
            xml: '',
            headerStart: 0,
            headerLen: 1,
            bodyStart: 0,
            bodyLen: 1,
            u: [],
            uById: {},
            loaded: false
          }
        });
        this.loadFile();
      });
    }
    getStatus () {
      if (this.loaded) {
        return {
          ok: this.errors.length < 1,
          errors: this.errors
        }
      } else {
        return {
          ok: false,
          errors: this.errors,
          status: this.files.length < 1 ?
            'Loading Directory' :
            parseInt(String(100 / this.files.length * this.files.filter(f => f.loaded).length)) + ' %'
        }
      }
    }
    unleak (string) {
      return (' ' + string).substr(1)
    }
    loadFile () {
      let unloadedFiles = this.files.filter(f => !f.loaded)
      if (unloadedFiles.length > 0) {
        let aTimerStart = performance.now()
        let aFileObj = unloadedFiles[0]
        console.log('Load File - ' + aFileObj.filename)
        fs.readFile(xmlFilesDirectory + '/' + aFileObj.filename, {encoding: 'utf8'}, (err, data) => {
          if (err) {
            this.errors.push({ func: 'loadFile', err: String(err) });
            console.log(String(err));
          } else {
            let aTimerFile = performance.now()
            console.log('file loaded', parseInt(aTimerFile - aTimerStart), 'ms')
            aFileObj.xml = data
            var parser = sax.parser(true, {
              lowercase: true,
              position: true
            })
            let uDeepStart = []
            parser.onopentag = function (node) {
              if (node.name === 'TEI' && node.attributes && node.attributes['xml:id']) {
                aFileObj.id = node.attributes['xml:id']
                // console.log(node, node.attributes)
              }
              if (node.name === 'teiHeader') {
                // console.log(node, parser.startTagPosition - 1, data.substr(parser.startTagPosition - 1, 20))
                aFileObj.headerStart = parser.startTagPosition - 1
              }
              if (node.name === 'body') {
                // console.log(node, parser.startTagPosition - 1, data.substr(parser.startTagPosition - 1, 20))
                aFileObj.bodyStart = parser.startTagPosition - 1
                if (node.attributes && node.attributes['cr:resource-pid']) {
                  aFileObj.id = node.attributes['cr:resource-pid']
                }
              }
              if (node.name === 'u' && node.attributes && node.attributes['xml:id']) {
                // console.log(node, parser.startTagPosition, data.substr(parser.startTagPosition - 1, 20))
                if (node.isSelfClosing) {
                  aFileObj.u.push({
                    id: node.attributes['xml:id'],
                    start: parser.startTagPosition - 1,
                    len: parser.position - (parser.startTagPosition - 1)
                  })
                } else {
                  uDeepStart.push({
                    id: node.attributes['xml:id'],
                    start: parser.startTagPosition - 1,
                    len: 0
                  })
                }
              }
            }
            parser.onclosetag = function (tag) {
              if (tag === 'teiHeader' && aFileObj.headerStart >= 0) {
                aFileObj.headerLen = parser.position - aFileObj.headerStart
                // console.log(tag, aFileObj.headerStart, aFileObj.headerLen, data.substr(aFileObj.headerStart, aFileObj.headerLen))
              }
              if (tag === 'body' && aFileObj.bodyStart >= 0) {
                aFileObj.bodyLen = parser.position - aFileObj.bodyStart
                // console.log(tag, aFileObj.bodyStart, aFileObj.bodyLen, data.substr(aFileObj.bodyStart, aFileObj.bodyLen))
              }
              if (tag === 'u' && uDeepStart.length > 0) {
                let aU = uDeepStart.pop()
                aU.len = parser.position - aU.start
                // console.log(tag, aU, data.substr(aU.start, aU.len))
                aFileObj.u.push(aU)
              }
            }
            parser.write(data).close();
            aFileObj.u.forEach((uObj, idx) => {
              aFileObj.uById[uObj.id] = idx
            });
            this.filesById[aFileObj.id] = this.files.indexOf(aFileObj)
            aFileObj.loaded = true;
            let aTimerSax = performance.now()
            console.log('xml sax parsed', parseInt(aTimerSax - aTimerFile), 'ms')
            // console.log(xmlFilesDirectory + '/' + aFileObj.filename, err, data.length);
            this.loadFile();
          }
        })
      } else {
      this.filesById = {}
        this.files.forEach((uObj, idx) => {
          this.filesById[uObj.id] = idx
        });
        console.log('Load File - All Files loaded ...', parseInt(performance.now() - this.loadTimerStart), 'ms')
        this.loaded = true
      }
    }
}

module.exports = XMLData;