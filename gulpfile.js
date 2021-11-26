const { parallel} = require('gulp');
const { collection_download } = require('./collection_download_script')
const { gitDescribeSync } = require('git-describe')
const logger = require('gulplog')
const replace = require('gulp-token-replace')

function gitVersion() {    
    const gitInfo = gitDescribeSync()
    gitInfo.semverString = gitInfo.semverString || gitInfo.raw
    logger.info(gitInfo.semverString)
    logger.warn("Replaces placeholders in place. Do not git that.")
    return src(['app.js'])
    .pipe(replace({global:gitInfo}))
    .pipe(dest('./'))
  }

async function downloadData() {
  logger.info('Downloading VOICE XML data')
  return collection_download({
    url: 'https://arche-curation.acdh-dev.oeaw.ac.at/api/568138',
    targetDir: "xmlfiles",
    recursive: true,
    maxDepth: -1,
    downloadFilesMime: /^(application\/xml|image\/tiff)/,
    logger
  })
}

exports.default = parallel(gitVersion, downloadData)