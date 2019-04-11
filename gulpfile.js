'use strict'

/**
 * Dependencies
 */

const $                 = require('gulp-load-plugins')()
const bs                = require('browser-sync')
const cp                = require('child_process')
const fs                = require('fs')
const fsp               = require('fs-path')
const del               = require('del')
const gulp              = require('gulp')
const {promisify}       = require('util')
const {compileTemplate} = require('statil')
const {md}              = require('./md')

const readFile = promisify(fs.readFile)
const writeFile = promisify(fsp.writeFile)

/**
 * Globals
 */

const SRC_TEMPLATE_DIR   = 'templates'
const SRC_TEMPLATE_FILES = 'templates/**/*'
const SRC_STATIC_FILES   = 'static/**/*'
const SRC_STYLE_FILES    = 'styles/**/*.scss'
const SRC_STYLE_ENTRY    = 'styles/main.scss'
const SRC_IMAGES         = 'images/**/*'

const OUT_DIR       = 'public'
const OUT_STYLE_DIR = 'public/styles'
const OUT_IMAGE_DIR = 'public/images'

const COMMIT = cp.execSync('git rev-parse --short HEAD').toString().trim()

const PAGES = [
  {
    path: '404.html',
    title: '404 Page Not Found',
  },
  {
    path: 'index.html',
    title: 'NA:about',
  },
]

/**
 * Clear
 */

gulp.task('clear', () => (
  // Skips dotfiles like `.git` and `.gitignore`
  del(`${OUT_DIR}/*`).catch(console.error.bind(console))
))

/**
 * Static
 */

gulp.task('static:copy', () => (
  gulp.src(SRC_STATIC_FILES).pipe(gulp.dest(OUT_DIR))
))

gulp.task('static:watch', () => {
  $.watch(SRC_STATIC_FILES, gulp.series('static:copy'))
})

/**
 * Templates
 */

gulp.task('templates:build', async () => {
  for (const page of PAGES) {
    const pageInput  = await readFile(`${SRC_TEMPLATE_DIR}/${page.path}`, 'utf8')
    const pageOutput = compileTemplate(pageInput)({
      md,
      template,
      COMMIT,
      TITLE: page.title,
    })

    await writeFile(`${OUT_DIR}/${page.path}`, pageOutput)
  }
})

gulp.task('templates:watch', () => {
  $.watch(SRC_TEMPLATE_FILES, gulp.series('templates:build'))
})

function template(path, props) {
  const template = fs.readFileSync(`${SRC_TEMPLATE_DIR}/${path}`, 'utf8')
  return compileTemplate(template)(props)
}

/**
 * Styles
 */

gulp.task('styles:build', () => (
  gulp.src(SRC_STYLE_ENTRY)
    .pipe($.sass())
    .pipe($.autoprefixer({
      browsers: ['> 1%', 'IE >= 10', 'iOS 7'],
    }))
    .pipe($.cleanCss({
      keepSpecialComments: 0,
      aggressiveMerging: false,
      advanced: false,
      compatibility: {properties: {colors: false}},
    }))
    .pipe(gulp.dest(OUT_STYLE_DIR))
))

gulp.task('styles:watch', () => {
  $.watch(SRC_STYLE_FILES, gulp.series('styles:build'))
})

/**
 * Images
 */

gulp.task('images:build', () => (
  gulp.src(SRC_IMAGES)
    // Requires `graphicsmagick` or `imagemagick`. Install via Homebrew or
    // the package manager of your Unix distro.
    .pipe($.imageResize({quality: 1, width: 1920}))
    .pipe(gulp.dest(OUT_IMAGE_DIR))
))


gulp.task('images:watch', () => {
  $.watch(SRC_IMAGES, gulp.series('images:build'))
})

/**
 * Server
 */

gulp.task('server', () => (
  bs.init({
    server: {
      baseDir: OUT_DIR,
    },
    port: 36462,
    files: OUT_DIR,
    open: false,
    online: false,
    ui: false,
    ghostMode: false,
    notify: false,
  }, (err, bs) => {
    bs.addMiddleware('*', async (req, res) => {
      const content_404 = await readFile(`${OUT_DIR}/404.html`, 'utf8')
      res.write(content_404)
      res.end()
    })
  })
))

/**
 * Default
 */

gulp.task('buildup', gulp.parallel(
  'static:copy',
  'templates:build',
  'styles:build',
  'images:build'
))

gulp.task('watch', gulp.parallel(
  'static:watch',
  'templates:watch',
  'styles:watch',
  'images:watch',
  'server'
))

gulp.task('build', gulp.series('clear', 'buildup'))

gulp.task('default', gulp.series('clear', 'buildup', 'watch'))
