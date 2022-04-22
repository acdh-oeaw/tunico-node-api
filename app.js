const express = require('express');
const expressJSDocSwagger = require('express-jsdoc-swagger');
const xmlData = require('./xml/xmlData.js')
const xml = require('./xml/xml.js')
const search = require('./search/search.js')
const cors = require('cors')

const {
  PORT
} = process.env

const port = PORT || 3000;

const xmlDataObj = new xmlData()
var xmlObj = new xml(xmlDataObj);
var searchObj = new search(xmlDataObj);
var app = express();

expressJSDocSwagger(app)({
   info: {
    version: "{{semverString}}",
     title: "TUNICO 2.0 backend API",
     description: "Backend API providing XML parsing utterance level XML access as well as search transformation to actual CQL.",
     license: {
       name: 'MIT',
     },
   },
   baseDir: __dirname,
   filesPattern: [
     './app.js',
     './search/search.js',
     './xml/xml.js'
   ],
   swaggerUIPath: '/api-docs',
   exposeSwaggerUI: true,
   apiDocsPath: '/v3/api-docs',
   exposeApiDocs: true,
})

app.use(cors());

/**
 * GET /
 * @summary Get the software version running
 * @return {string} 200 - software version running - application/json
 * @example response - 200 - software version running using git describe and the latest tag
 * {
 *   "apiVersion": "0.9.9+1.g1aa1705",
 *   "api-docs": "https://voice-api.acdh.oeaw.ac.at/api-docs",
 *   "openapi.json": "https://voice-api.acdh.oeaw.ac.at/v3/api-docs",
 *   "apiDependencyAndLicense": "https://voice-api.acdh.oeaw.ac.at/dependency-license-report.html"
 * }
 */
app.get('/', function(req, res) {
  const baseUrl = `${req.protocol}://${req.hostname}${req.hostname == 'localhost'?':'+port:''}`
  const gitlabEnvName = process.env.GITLAB_ENVIRONMENT_NAME != 'production' ? `,"environment": "${process.env.GITLAB_ENVIRONMENT_NAME}"` : ''
  res.json(JSON.parse(`{
    "apiVersion": "{{semverString}}",
    "api-docs": "${baseUrl}/api-docs",
    "openapi.json": "${baseUrl}/v3/api-docs",
    "apiDependencyAndLicense": "${baseUrl}/dependency-license-report.html"
    ${gitlabEnvName}
  }`));
});

/**
 * GET /xml
 * @tags XML Documents - XML documents and parts of XML documents
 * @summary Get all available document ids
 * @return {object} 200 - List of all document ids and status - application/json
 * @example response - 200 - All document ids and status
 * {
 *   "query": {},
 *   "params": {},
 *   "xmlStatus": {
 *     "ok": true,
 *     "errors": []
 *   },
 *   "allXmlIds": [
 *     "EDcon250",
 *     "EDcon4",
 *     "...",
 *     "PRqas495",
 *     "PRwgd537"
 *   ]
 * }
 */
app.get('/xml/', function(req, res) {
  xmlObj.request('overview', req, res);
});
/**
 * GET /xml/{documentId}/{getType}
 * @tags XML Documents - XML documents and parts of XML documents
 * @summary Gets a part or the whole document
 * @param {string}documentId.path Id of the document to get a part of
 * @param {string} getType.path What part of the document to get: header, body or file
 * @return {object} 200 - The XML of the requested part and status - application/json
 * @example response - 200 - Succesful result
 * {
 *   "query": {},
 *   "params": {
 *     "documentId": "LEint554",
 *     "getType": "file"
 *   },
 *   "xmlStatus": {
 *     "ok": true,
 *     "errors": []
 *   },
 *   "xmlId": "LEint554",
 *   "xml": "<?xml version=\"1.0\" encoding=\"US-ASCII\"?>\r\n<?xml-model href=\"../voice.rng\"?><TEI xmlns=\"http://www.tei-c.org/ns/1.0\" xmlns:voice=\"http://www.univie.ac.at/voice/ns/1.0\" xmlns:xi=\"http://www.w3.org/2001/XInclude\" version=\"5\" xml:id=\"LEint554\" xml:lang=\"eng\">\r\n    <teiHeader>[...]</teiHeader>\r\n    <text>\r\n        <body>[...]</body>\r\n    </text>\r\n</TEI>",
 *   "xmlType": "file"
 * }
 * @example response - 200 - Not found result
 * {
 *  "query": {},
 *   "params": {
 *     "documentId": "xxx",
 *     "getType": "xcxx"
 *   },
 *   "xmlStatus": {
 *     "ok": true,
 *     "errors": []
 *   },
 *   "xmlId": "xxx"
 * }
 */
app.get('/xml/:documentId/:getType', function(req, res) {
  xmlObj.request('get', req, res);
});
/**
 * GET /xml/{documentId}/uid/{uId}
 * @tags XML Documents - XML documents and parts of XML documents
 * @summary Get a particular utterance by id from a specified document
 * @param {string} documentId.path Id of the document to get a part of
 * @param {string} uId.path Id of the utterance to get
 * @return {object} 200 - result - application/json
 */
app.get('/xml/:documentId/uid/:uId', function(req, res) {
  xmlObj.request('uId', req, res);
});
/**
 * GET /search
 * @tags Search - VOICE query language parsing and retrieval of XML parts found
 * @summary Transforms a search request to CQL, passes it to NoSkE and gets the correct XML snipptes using NoSkE's result
 * @param {string} q.query.required - The query string in either the VOICE query language or CQL understood by NoSkE
 * @return {object} 200 - Search result - application/json
 * @return {object} 500 - Query could not be parsed by the VOICE query parser or NoSkE - application/json
 * @example response - 200 - Search result
 * {
 *  "query": {
 *    "q": "i am"
 *  },
 *  "xmlStatus": {
 *    "ok": true,
 *    "errors": []
 *  },
 *  "u": [
 *    "[...]",
 *    {
 *      "xmlId": "EDwsd499",
 *      "uId": "EDwsd499_u_802",
 *      "xml": null,
 *      "highlight": [
 *        "xTok_EDwsd499_026127",
 *        "xTok_EDwsd499_026130"
 *      ],
 *      "hits": [
 *        [
 *          "xTok_EDwsd499_026127",
 *          "xTok_EDwsd499_026130"
 *        ]
 *      ]
 *    },
 *    {
 *      "xmlId": "EDwsd9",
 *      "uId": "EDwsd9_u_127",
 *      "xml": "<u who=\"#EDwsd9_S8\" xml:id=\"EDwsd9_u_127\">\r\n                    <seg n=\"4\" synch=\"#EDwsd9_ol_92\" type=\"overlap\" xml:id=\"EDwsd9_ol_94\">\r\n                        <w xml:id=\"xTok_EDwsd9_002703\" ana=\"#NNfNN\" lemma=\"number\">number</w>\r\n                    </seg>\r\n                    <seg n=\"5\" synch=\"#EDwsd9_ol_93\" type=\"overlap\" xml:id=\"EDwsd9_ol_95\">\r\n                        <w xml:id=\"xTok_EDwsd9_002706\" ana=\"#CDfCD\" lemma=\"three\">three</w>\r\n                        <w xml:id=\"xTok_EDwsd9_002708\" ana=\"#PPfPP\" lemma=\"i\">i</w>\r\n                    </seg>\r\n                    <seg n=\"6\" type=\"overlap\" xml:id=\"EDwsd9_ol_96\">\r\n                        <w xml:id=\"xTok_EDwsd9_002711\" ana=\"#VBPfVBP\" lemma=\"be\">am</w>\r\n                    </seg>\r\n                </u>",
 *      "highlight": [
 *        "xTok_EDwsd9_002708",
 *        "EDwsd9_ol_96",
 *        "xTok_EDwsd9_002711"
 *      ],
 *      "hits": [
 *        [
 *          "xTok_EDwsd9_002708",
 *          "EDwsd9_ol_96",
 *          "xTok_EDwsd9_002711"
 *        ]
 *      ]
 *    },
 *    "[...]"
 *  ],
 *  "cql": "[word=\"i\"] [word=\"_.*\"]* [word=\"am\"]",
 *  "hits": [
 *    "xTok_EDcon250_001256",
 *    "xTok_EDcon250_001258",
 *    "[...]",
 *    "xTok_PRqas407_006479"
 *  ]
 * }
 * @example response - 500 - Error response
 * {
 *   "query": {
 *     "q": "$$$"
 *   },
 *   "xmlStatus": {
 *     "ok": true,
 *     "errors": []
 *   },
 *   "error": "unexpected character: ->$<- at offset: 0, skipped 3 characters."
 * }
 * @example response - 500 - Error response from NoSkE
 * {
 *   "query": {
 *     "q": "(i am )"
 *   },
 *   "xmlStatus": {
 *     "ok": true,
 *     "errors": []
 *   },
 *   "NoSkEError": {
 *     "request": {
 *       "pagesize": "100000",
 *       "cql": "[word=\"(i\"] [word=\"_.*\"]* [word=\"am\"] )",
 *       "refs": "u.id,doc.id",
 *       "default_attr": "word",
 *       "kwicrightctx": "0",
 *       "attrs": "wid",
 *       "queryselector": "cqlrow",
 *       "corpname": "voice",
 *       "kwicleftctx": "-1"
 *     },
 *     "api_version": "open-4.24.6",
 *     "error": "regexopt: at position 2: syntax error, unexpected $end, expecting OR or RPAREN"
 *   }
 * }
 */
app.get('/search', function(req, res) {
  searchObj.request(req, res);
});
/**
 * GET /api-docs
 * @tags → API Documentation
 * @summary Swagger UI for viewing the documentation and using API
 * @return {string} 200 - The UI - text/html
 */

/**
 * GET /v3/api-docs
 * @tags → API Documentation
 * @summary The openapi 3.0 json for automatic API doc processing
 * @return {object} 200 - OAS3 conformant JSON documentation of the API - application/json
 */

/**
 * GET /dependency-license-report.html
 * @tags → API Documentation
 * @summary Returns all dependencies and their licenses
 * @return {object} 200 - Report table - text/html
 */
app.get('/dependency-license-report.html', function(req, res) {
  res.sendFile(__dirname + '/dependency-license-report.html');
});
 
app.get('/NoSkE_logo.png', function(req, res) {
  res.sendFile(__dirname + '/NoSkE_logo.png');
});

console.log(`Started on port ${port}`);
app.listen(port);
