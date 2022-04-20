const async = require('async')
const fs = require('fs')
const addPackagesToIndex = require('license-report/lib/addPackagesToIndex')
const getPackageReportData = require('license-report/lib/getPackageReportData.js')
const packageDataToReportData = require('license-report/lib/packageDataToReportData')
const getInstalledVersions = require('license-report/lib/getInstalledVersions.js')
const tabelify = require('@kessler/tableify')

const packageJson = require('./package.json')
const packageLockJson = require('./package-lock.json')

const config = {
    fields: ['name', 'author', 'licenseType', 'link', 'installedVersion', 'remoteVersion'].reverse(),
    name: {label: 'Name'},
    author: {label: 'Author'},
    licenseType: {label: 'License Type'},
    link: {label: 'Link'},
    installedVersion: {label: 'Installed Version'},
    remoteVersion: {label: 'Available Version'},
}

const deps = packageJson.dependencies
const devDeps = packageJson.devDependencies
let depsIndex = []
addPackagesToIndex(deps, depsIndex, [])
addPackagesToIndex(devDeps, depsIndex, [])
const installedVersions = getInstalledVersions(packageLockJson, depsIndex)

async function myGetPackageReportData(packageEntry) {
    return await getPackageReportData(packageEntry, installedVersions)
}

async.map(depsIndex, myGetPackageReportData, function(err, results) {
	if (err) return console.error(err)
	if (results.length === 0) return console.log('nothing to do')

	try {
		let packagesData = results.map(element => packageDataToReportData(element, config))
        packagesData = packagesData.map(row => renameRowsProperties(row, config))
        let html = `<html>
    <head>
        <title>License and dependencies for project ${packageJson.name}</title>
    </head>
    <body>
        <style>
        ${fs.readFileSync('node_modules/license-report/defaultHtmlStyle.css')}
        </style>
        <h2>Project ${packageJson.name}</h2>
        Version: ${packageJson.version}<br/>
        Author: ${packageJson.author.name}<br/>
        ${packageJson.contributors.map(contributor => `Contributor: ${contributor.name}</br>`)}
        Source: <a href="${packageJson.repository.url}">${packageJson.repository.url}</a></br>
        License: ${packageJson.license}<br/>
        <a href="/api-docs">See here for the documentation about this API</a><br/>
        <pre>${fs.readFileSync('LICENSE')}</pre>
        <h2>Search engine</h2>
        <img alt="NoSketchEngine" src="NoSkE_logo.png" style="float: left;"/><p>This API uses the <a href="https://nlp.fi.muni.cz/trac/noske">NoSketchEngine https://nlp.fi.muni.cz/trac/noske</a> for searching.<br/>
        The ACDH-CH provides a container image <a href="https://hub.docker.com/r/acdhch/noske">acdhch/noske:4.24.6-2.167.10-open</a> for NoSketchEngine</p>
        <p>Credits:<br/>
        Kilgarriff, Adam; et al. 2014. “The Sketch Engine: ten years on”. <i>Lexicography 1(1)</i>, 7-36.<br/>
        Rychlý, Pavel. 2007. “Manatee/Bonito: a modular corpus manager”. <i>RASLAN</i>, 65-70.</p>
        <h2 style="clear: left;">Dependencies</h2>
 ${tabelify(packagesData)}
    </body>
</html>`
		console.log(html)
	} catch (e) {
		console.error(e.stack)
		process.exit(1)
	}
})

/**
 * Rename the property of an object
 * @param {string} oldProp - old name of the property
 * @param {string} newProp - new name of the property
 * @param {object} anonymous - object with the property to be renamed
 * @returns {object} object with the renamed property
 */
 function renameProp(oldProp, newProp, { [oldProp]: old, ...others }) {
    const newObject = {[newProp]:old, ...others}
    return newObject
  }
  
  /**
   * Rename each property of row with the value of its label from config
   * @param {object} row - object with data of one row to be displayed
   * @param {object} config - configuration object
   */
  function renameRowsProperties(row, config) {
      let renamedRow = row
      for (const fieldname of config.fields) {
          renamedRow = renameProp(fieldname, config[fieldname].label, renamedRow)
      }
      return renamedRow
  }