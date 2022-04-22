const https = require('https');
const http = require('http');
const { toCQL } = require("./voice-to-cql")
const { performance } = require('perf_hooks');
const {
  NOSKE_BONITO,
  CORPNAME
} = process.env
const noske_bonito = NOSKE_BONITO || 'http://localhost:4000/bonito/run.cgi'
const corpname = CORPNAME || 'tunico'

class search {
  constructor(xmlData) {
    this.xmlData = xmlData;
  }
  request (req, res) {
    let send = {
      query: req.query,
      xmlStatus: this.xmlData.getStatus(),
    }
    // console.log(req.url, req.query, this);
    // var t1 = performance.now()
    try {
    var q = (req.query.q || ''),
        cql = q.match(/^["]/) ? q : this.toCQLifVoice(q),
        queryString = `${cql.replace(/\+/g, '%2B').replace(/&/g, '%26').replace(/ /g, '+')}`,
        backendRequest = `${noske_bonito}/first?corpname=${corpname}&` +
        `queryselector=cqlrow&cql=${queryString}&default_attr=word` +
    `&attrs=wid&kwicleftctx=-1&kwicrightctx=0&refs=u.id,doc.id&pagesize=100000`
    console.log(`NoSkE request: ${backendRequest}`)
    this.getJson(backendRequest,
    (json) => {
        let docsUandIDs = {},
            docsUHits = {}
        // console.log(json)
        if (!json.Lines) {
            send.NoSkEError = json;
            res.status(500).json(send)            
            return
          }
        let consecutiveIDs
        json.Lines.map((line) => {
          const key = line.Refs.map((ref) => {return ref.split('=')[1]}).join();
          consecutiveIDs = consecutiveIDs || []
          docsUandIDs[key] = docsUandIDs[key] || [];
          docsUHits[key] = docsUHits[key] || [];
          if (!line.Kwic[0]) {line.Kwic = line.Left}
          if (!line.Kwic[0]) {line.Kwic = line.Right}
          const ids = line.Kwic[0].str.split(" ").filter(str => str != "")
          const found = docsUandIDs[key].findIndex((id) => id === ids[0])
          if (line.Kwic[0]) {
            if (ids[0] === '' || found === -1) {
              consecutiveIDs = consecutiveIDs.concat(ids)
              docsUHits[key].push(Array.from(consecutiveIDs))
              docsUandIDs[key] = docsUandIDs[key].concat(consecutiveIDs)
              consecutiveIDs = []
            } else {
              const newIds = ids.filter(id => docsUandIDs[key].indexOf(id) === -1)
              if (newIds.length > 1) {
                consecutiveIDs = consecutiveIDs.concat(newIds)
              }
            }
          }
        })
        if (!this.xmlData.loaded) {
          send.error = "not all XML loaded";
          res.status(500).json(send);             
             return
          }
        send.u = [];
        // var t2 = performance.now()
        let hits = []
        for (let uDoc of Object.keys(docsUandIDs)) {
          const uDocVals = uDoc.split(',')
          const docNum = this.xmlData.filesById[uDocVals[1]]
          const uNum = this.xmlData.files[docNum] ? this.xmlData.files[docNum].uById[uDocVals[0]] : 0
          send.u.push({
            xmlId: uDocVals[1],
            uId: uDocVals[0],
            xml: send.u.length < 101 && this.xmlData.files[docNum] && this.xmlData.files[docNum].u[uNum] ? this.xmlData.files[docNum].xml.substr(this.xmlData.files[docNum].u[uNum].start, this.xmlData.files[docNum].u[uNum].len) : null,
            highlight:  Array.from(new Set([...docsUandIDs[uDoc]])),
            hits: docsUHits[uDoc]
          })
          hits = hits.concat(Array.from(new Set([...docsUandIDs[uDoc]])))
        }
        send.cql = json.Desc[0].arg
        send.hits = hits
        // console.log('search - noske:', t2 - t1, 'xml', performance.now() - t2)
        res.json(send);
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      send.error = e.message;
      res.status(500).json(send);
    });    
  } catch (e) {
    console.error(`Got internal error: ${e.message}`);
    send.error = e.message;
    res.status(500).json(send);      
  }
  }
  toCQLifVoice(q) {
    try {
      return toCQL(q)
    } catch (e) {
      if (e.message.match(/unexpected character: ->[=("]<-/)||e.message.match(/found: [(]/)) { return q }
      throw e
    }
  }
  getJson(url, cb) {
    const client = noske_bonito.startsWith('https') ? https : http
    const clientOptions = noske_bonito.startsWith('https') ? {rejectUnauthorized: false} : {}
    // pretty much the boiler plate code from nodejs.org docs.
    return client.get(url, clientOptions, function(res) {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];
    
      let error;
      // Any 2xx status code signals a successful response but
      // here we're only checking for 200.
      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' +
                          `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
                          `Expected application/json but received ${contentType}`);
      }
      if (error) {
        // Consume response data to free up memory
        res.resume();
        this.emit('error', error)
        return
      }
    
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        const parsedData = JSON.parse(rawData);
        cb(parsedData)
      });
    })
  }
}

module.exports = search;
