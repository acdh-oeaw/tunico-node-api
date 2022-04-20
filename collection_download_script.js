const path = require("path")
const { access, mkdir, open } = require("fs/promises")
const { URL, URLSearchParams, urlToHttpOptions } = require("url"),
    http = require("http"),
    https = require("https")

/* There is one other dependency: https-proxy-agent. The script will tell you when you need it. */

const argsDefs = {
    '--user': { nargs: '?', help: 'User name (for downloading restricted-access resources)' },
    '--pswd': { nargs: '?', help: 'User password (for downloading restricted-access resources)' },
    '--recursive': { nargs: 0, help: 'Enable recursive download of child resources' },
    '--maxDepth': { nargs: '?', default: -1, help: 'Maximum recursion depth (-1 means do not limit the recursion depth)' },
    '--flat': { nargs: 0, help: 'Do not create directory structure (download all resources to the `tagetDir`)' },
    '--batch': { nargs: 0, help: 'Do not ask for user input (e.g. for the user name and password)' },
    '--targetDir': { nargs: '?', default: '.', help: 'Directory to store downloaded resources' },
    '--matchUrl': { nargs: '*', default: [], help: 'Explicit list of allowed resource URLs' },
    '--skipUrl': { nargs: '*', default: [], help: 'List of allowed resource URLs to skip' },
    '--proxy': { nargs: '?', help: 'Use the specified proxy e.g. http://127.0.0.1:8080' },
    '--no-verify': { nargs: 0, dest: 'verify', action: 'store_false', default: true, help: 'Do not validate the TLS certificate chain (for debug mitm proxy)' },
    '--downloadFilesMime': {nargs: '?', default: /^application\/xml/, action: 'store_regexp', help: 'MIME type exected for the downloaded files (actually a RegExp)'},
    'url': { nargs: '+', help: 'Resource URLs to be downloaded' }
}
/** @type {Request} */
let request;
let logger = {
    /**
     * @param {string} message
     * @returns void
     */
    info: function(message){
        console.log(message)
    }
};
module.exports = {
    collection_download: main, parseArgs, newRequest, argsDefs
}
if (require.main === module) {
    try {
        main(parseArgs(["https://arche.acdh.oeaw.ac.at/api/17183", "--recursive", "--skipUrl", "https://arche.acdh.oeaw.ac.at/api/171860"], argsDefs));
    } catch (err) {
        /** @type {Error} */
        const e = err;
        console.error(e.stack || e.message);
    }
}

/**
 * 
 * @param {URL} url
 * @returns {{filename: string, location: string}}
 */
async function getFilename(url) {
    const locationProp = '<https://vocabs.acdh.oeaw.ac.at/schema#hasLocationPath>',
        filenameProp = '<https://vocabs.acdh.oeaw.ac.at/schema#hasFilename>',
        requestOpts = urlToHttpOptions(url)
    requestOpts.headers = { 'Accept': 'application/n-triples', 'X-METADATA-READ-MODE': 'resource' }
    requestOpts.path += '/metadata'
    let resp = await request.get(requestOpts, /^application\/n-triples/)
    let filename,
        location = ''
    // logger.info(resp)
    for (let l of resp.split('\n')) {
        l = l.slice(url.toString().length + 3)
        if (l.startsWith(locationProp))
            location = l.slice(locationProp.length + 2, -46)
        if (l.startsWith(filenameProp))
            filename = l.slice(filenameProp.length + 2, -46)
        //logger.info(JSON.stringify({ filename, location }))
    }
    return { filename, location }
}

/**
 * 
 * @param {string} url 
 */
async function getChildren(url) {
    const searchUrl = new URL(url.replace(/\/[0-9]+$/, '/search')),
        data = {
            'sql': 'SELECT id FROM relations WHERE property = ? AND target_id = ?',
            'sqlParam[0]': 'https://vocabs.acdh.oeaw.ac.at/schema#isPartOf',
            'sqlParam[1]': url.replace(/^.*\//, '')
        },
        requestOpts = urlToHttpOptions(searchUrl)
    requestOpts.headers = { 'Accept': 'application/n-triples', 'X-METADATA-READ-MODE': 'resource' }
    let resp = await request.post(requestOpts, data, /^application\/n-triples/),
        children = []
    //logger.info(resp)
    for (let l of resp.split('\n')) {
        if (l.match(/ <search:\/\/match> /)) {
            children.push(l.slice(1, l.indexOf('>')))
        }
    }
    return children
}

/**
 * Start downloading a resource
 * 
 * @param {{url: string, path: string, depth: number}} res resource to fetch
 * @param {Record<string, any>} args parsed arguments (e.g. passed to the script)
 */
async function download(res, args) {
    const resUrl = new URL(res.url)    
    request = newRequest(resUrl, args)
    const { filename, location } = await getFilename(resUrl),
    // TODO: This fetches the content to memory concatenating chunks. It would be better to hand in a file stream to write to.
    // req is a simple string. In the python variant it is an object containing status code etc.
    req = await request.get(resUrl, filename ? args.downloadFilesMime : /^text\/turtle/) // TODO if --user, -pswd add auth

    let toDwnld = [],
        _path = ''
    if (filename) {
        _path = path.join(res.path, filename)
        logger.info(`Downloading ${res.url} as ${_path}`)
        let pathNotExists = true
        try {
           await access(res.path)
           pathNotExists = false
        } catch(err) {}
        if (pathNotExists) {
           await mkdir(res.path, {recursive: true})
        }
        let of = await open(_path, 'w+')
        try {
            await of.writeFile(req)
        } finally {
            await of.close()
        }
    } else if (args.recursive && (args.maxDepth === -1 || res.depth < args.maxDepth)) {
        logger.info(`Going into ${res.url}${location}`)
        if (args.flat) {
            _path = res.path
        } else {
            _path = path.join(res.path, location)
        }
        toDwnld = await getChildren(resUrl.toString())
        toDwnld = toDwnld.map((value) => ({ url: value, path: _path, depth: res.depth + 1 }))
    }
    // logger.info(JSON.stringify(toDwnld))
    return toDwnld
}

/**
 * 
 * @param {Record<string, any>} args parsed arguments (e.g. passed to the script)
 */
async function main(args) {
    if (args.logger && args.logger.info)
    {
        logger.info = args.logger.info
    }
    if (args.h || args.help) {
        showHelp(argsDefs);
    } else {
        let stack = [];
        for (let url of Array.isArray(args.url) ? args.url : [args.url]) {
            stack.push({ url, path: args.targetDir, depth: 0 });
        }
        //logger.info(JSON.stringify(stack))
        while (stack.length > 0) {
            let res = stack.pop();
            if (
                Array.isArray(args.matchUrl) &&
                args.matchUrl.length > 0 &&
                args.matchUrl.indexOf(res["url"]) === -1
            )
                continue;
            if (
                Array.isArray(args.skipUrl) &&
                args.skipUrl.length > 0 &&
                args.skipUrl.indexOf(res["url"]) > -1
            )
                continue;
            if (
                args.maxDepth &&
                args.maxDepth >= 0 &&
                res["depth"] > args.maxDepth
            )
                continue;
            stack = stack.concat(await download(res, args));
        }
    }
}

/**
 * Creates an object of the Request class also declared here.
 * The reason for writing it like this is to bring the whole
 * somewhat complicated implementation (mostly according to
 * the example in the nodejs documentation) to the bottom of
 * the file so it is simpler to see the code specific to
 * ARCHE downloads.
 * 
 * @param {URL} resUrl 
 * @param {Record<string, any>} args parsed arguments (e.g. passed to the script)
 * @returns {Request}
 */
function newRequest(resUrl, args) {
    class Request {
        /**
         * @type {http|https}
         */
        request
        /**
         * @type {https.RequestOptions}
         */
        proxy
        /**
         * @type {boolean}
         */
        verify
        /**
         * @type {https.Agent}
         */
        tlsAgent
        /**
         * An instance is constructed with the actual protocol
         * used to communicate with the endpoint
         * As there are these two modules used in nodejs
         * One of them needs to be set
         * 
         * @param {http|https} protocol
         * @param {string|URL|undefined} proxy
         * @param {boolean|undefined} verify
         */
        constructor(protocol, proxy, verify) {
            this.request = protocol
            const proxyURL = proxy === undefined ? undefined : typeof (proxy) === 'string' ? new URL(proxy) : proxy
            this.proxy = proxy === undefined ? undefined : urlToHttpOptions(proxyURL)
            this.verify = verify === false ? false : true
            if (this.proxy) {
                try {
                    const HttpsProxyAgent = require('https-proxy-agent');
                    this.proxy.rejectUnauthorized = this.verify
                    this.tlsAgent = new HttpsProxyAgent(this.proxy)
                } catch (err) {
                    console.error(
                        `To use a proxy an "agent" is needed to handle the connection.
Such an agent module is too big to be included here.
To make this work you need to run 
"npm install https-proxy-agent" wherever this script is run from
${err.message}`)
                    process.exitCode = -1
                    process.exit()
                }
            }
        }
        /**
         * Exposes a promisified version of the http.get method
         * 
         * Mostly this is the example code from the nodejs documentation.
         * That version handles putting chunks together.
         * Additionally this was changed so it follows redirects.
         * 
         * @param {string | URL | https.RequestOptions} url 
         * @param {RegExp} contentTypeTest 
         * @returns {Promise<string>} Response as string
         */
        async get(url, contentTypeTest) {
            url = typeof url === 'string' ? new URL(url) : url
            /** @type {https.RequestOptions} */
            const requestOpts = url instanceof URL ? urlToHttpOptions(url) : url
            const _contentTypeTest = contentTypeTest || /^text\/html/
            requestOpts.agent = this.tlsAgent
            requestOpts.rejectUnauthorized = this.verify
            return new Promise((resolve, reject) => {
                this.request.get(requestOpts, res => this.processRes(res, _contentTypeTest, resolve, reject))
                    .on('error', (e) => {
                        console.error(`Got error: ${e.message}`);
                        reject(e)
                    });
            })
        }
        /**
         * Helper function that http.get calls on success
         * 
         * As we are not looking using text/html here the content type
         * that should be recieved is an additional parameter
         * Also the two methods for reporting the outcome of a promised
         * need to be passed as this now isn't in the closure
         * the Promise is created in.
         * 
         * @param {http.IncomingMessage} res 
         * @param {RegExp} contentTypeTest 
         * @param {(value: string | PromiseLike<string>) => void} resolve 
         * @param {(reason?: any) => void} reject 
         * @returns 
         */
        processRes = (res, contentTypeTest, resolve, reject) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];

            let error;
            // Any 2xx status code signals a successful response but
            // here we're only checking for 200.
            if (statusCode !== 200 && statusCode !== 204 && statusCode !== 301 && statusCode !== 302) {
                error = new Error('Request Failed.\n' +
                    `Status Code: ${statusCode}`);
            } else if ((statusCode === 200 || statusCode === 204) && !contentTypeTest.test(contentType)) {
                error = new Error('Invalid content-type.\n' +
                    `Expected ${contentTypeTest} but received ${contentType} from ${res.req.protocol}//${res.req.host}${res.req.path} (${res.statusCode})`);
            }
            if (error) {
                console.error(error.message);
                // Consume response data to free up memory
                res.resume();
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    if (statusCode === 301 || statusCode === 302) {
                        const requestOpts = urlToHttpOptions((new URL(res.headers['location'])))
                        requestOpts.headers = res.req.getHeaders()
                        resolve(this.get(requestOpts, contentTypeTest))
                    }
                    else resolve(rawData);
                } catch (e) {
                    console.error(e.message);
                    reject(e)
                }
            });
        }
        /**
         * Post data to URL.
         * application/x-www-form-urlencoded is hard coded as data format
         * @param {string | URL | https.RequestOptions} url 
         * @param {any} data Date to be encoded as application/x-www-form-urlencoded
         * @param {RegExp} contentTypeTest
         * @returns {Promise<string>} Response as string
         */
        async post(url, data, contentTypeTest) {
            url = typeof url === 'string' ? new URL(url) : url
            /** @type {https.RequestOptions} */
            const requestOpts = url instanceof URL ? urlToHttpOptions(url) : url,
                _contentTypeTest = contentTypeTest || /^text\/html/,
                postData = (new URLSearchParams(data)).toString()
            requestOpts.agent = this.tlsAgent
            requestOpts.rejectUnauthorized = this.verify
            requestOpts.method = 'POST'
            requestOpts.headers = Object.assign(requestOpts.headers, {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            })
            return new Promise((resolve, reject) => {
                const req = this.request.request(requestOpts, res => this.processRes(res, _contentTypeTest, resolve, reject))
                    .on('error', (e) => {
                        console.error(`Got error: ${e.message}`);
                        reject(e)
                    });
                req.write(postData)
                req.end();
            })
        }
    }
    return new Request(resUrl.protocol === 'https:' ? https :
        resUrl.protocol === 'http:' ? http :
            http,
        args.proxy,
        args.verify)
}

/**
 * Quick and dirty argument parser that returns a JS object with the parameter names as keys and the values
 * 
 * @param {string[]} defArgs
 * @param {Record<string, {nargs: 0|1|'?'|'+'|'*'|undefined, help: string, default: any}>} argsDefs
 * @returns {Record<string, any>} 
 */
function parseArgs(defArgs, argsDefs) {
    const helpArgs = {
        '--help': { nargs: '0', help: 'Show this help text' },
        '-h': { nargs: '0', help: 'Show this help text' }
    },
        args = (defArgs || []).length === 0 ? process.argv : ["", ""].concat(defArgs)
    let ret = {}
    Object.assign(argsDefs, helpArgs)
    for (let pos = 2; pos < args.length; pos++) {
        const arg = argsDefs[args[pos]] ? args[pos] : Object.keys(argsDefs).filter((value) => !value.startsWith('--'))[0]
        const { nargs, dest, action } = argsDefs[arg]
        const key = dest ? dest : arg.startsWith('--') ? arg.slice(2) : arg.startsWith('-') ? arg.slice(1) : arg
        if (arg.startsWith('--') && nargs != 0) { pos++ }
        let val
        switch (nargs) {
            case '+':
            case '*': val = (ret[key] || []); val.push(args[pos]); break;
            case 0: val = action === 'store_false' ? false : true; break;
            case '?':
            case 1:
            default: val = action === 'store_regexp' ?
              new RegExp(args[pos]) :
              args[pos];
        }
        ret[key] = val
    }
    for (let arg of Object.keys(argsDefs)) {
        const { dest } = argsDefs[arg]
        const key = dest ? dest : arg.startsWith('--') ? arg.slice(2) : arg.startsWith('-') ? arg.slice(1) : arg
        const defVal = argsDefs[arg]['default']
        if (ret[key] === undefined && defVal) ret[key] = defVal
    }
    if ((defArgs || []).length === 0)
        return ret
    else return Object.assign(ret, parseArgs([], argsDefs))
}

/**
 * 
 * @param {Record<string, {nargs: 0|1|'?'|'+'|'*'|undefined, help: string, default: any}>} argsDefs
 */
function showHelp(argsDefs) {
    for (let key of Object.keys(argsDefs)) {
        const { nargs, help } = argsDefs[key],
            defVal = Array.isArray(argsDefs[key]['default']) ? JSON.stringify(argsDefs[key]['default']) : argsDefs[key]['default']
        let numHint
        switch (nargs) {
            case '+': numHint = ' (mandatory, can be specified multiple times)'
            case '*': numHint = ' (can be specified multiple times)'
            case 0: numHint = ' (enabled if present, no value)'
            case 1: numHint = ' (mandatory)'
            default: numHint = ''
        }
        logger.info(key + ': ' + help + numHint + (defVal ? ` (default: ${defVal})` : ''))
    }
}