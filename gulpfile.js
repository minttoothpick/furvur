'use strict';

// Load vars from package.json
const pkg = require('./package.json');

// Gulp
const gulp = require('gulp');

// Load everything in `devDependencies` into the variable `$`
const $ = require('gulp-load-plugins')({
  pattern: ['*'],
  scope: ['devDependencies'],
});

const onError = (err) => {
  console.log(err);
};

/* Styles
   ========================================================================== */

gulp.task('css', () => {
  $.fancyLog('→ Compiling CSS');
  return gulp
    .src(pkg.paths.src.css + pkg.vars.cssName)
    .pipe($.plumber({ errorHandler: onError }))
    // Initialize sourcemaps
    // TODO: Maybe we don't need sourcemaps?
    // .pipe($.sourcemaps.init({ loadMaps: true }))
    // Run through all PostCSS plugins
    .pipe($.postcss([
      $.postcssEasyImport(),
      $.tailwindcss(pkg.paths.config.tailwind),
      $.postcssFontFamilySystemUi(),
      $.cssnano({
        autoprefixer: {
          add: true, // browserslist settings are in package.json
        },
        core: false, // Don't minimize whitespace yet
      }),
      $.postcssReporter({
        clearMessages: true,
        throwError: true,
      }),
    ]))
    // Run through Purgecss to remove unused styles
    .pipe($.purgecss({
      content: [ pkg.vars.purgecssFiles ]
    }))
    // TODO: Ensure this works after Purgecss
    // .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest(pkg.paths.dist.css));
});

/* Scripts
   ========================================================================== */

/**
 * Copy JS files from `src` to `dist`
 */
gulp.task('js', () => {
  $.fancyLog('→ Copying JS from src to dist');
  gulp
    .src(pkg.paths.src.js + '**/*.js')
    // Only run on unminified source JS that isn't newer than the dist versions
    .pipe($.if(['*.js', '!*.min.js'],
      $.newer({ dest: pkg.paths.dist.js, ext: '.min.js' }),
      $.newer({ dest: pkg.paths.dist.js })
    ))
    // Only run uglify on JS files that aren't already minified
    .pipe($.if([ '*.js', '!*.min.js' ],
      $.uglify()
    ))
    // Rename uglified files to `.min.js`
    .pipe($.if([ '*.js', '!*.min.js' ],
      $.rename({ suffix: '.min' })
    ))
    .pipe(gulp.dest(pkg.paths.dist.js));
});

/* Images
   ========================================================================== */

/**
 * Optimize images with `gulp-imageoptim`
 *
 * This is slow, so don't use it as part of a regular task.
 */
gulp.task('imagemin', () => {
  $.fancyLog('→ Optimizing images');
  return gulp
    .src(pkg.paths.src.images + '**/*.{' + pkg.vars.imageminExtensions + '}')
    // Only run on source files that aren't newer than the dist versions
    .pipe($.newer(pkg.paths.dist.images))
    .pipe($.imagemin([
      $.imagemin.gifsicle({ interlaced: true }),
      $.imagemin.jpegtran({ progressive: true }),
      $.imagemin.optipng({ optimizationLevel: 5 }),
      $.imagemin.svgo({
        plugins: [
          { removeViewBox: true },
          { cleanupIDs: false }
        ]
      })
    ], {
      verbose: true
    }))
    .pipe(gulp.dest(pkg.paths.dist.images));
})

/* HTML
   ========================================================================== */

/**
 * Copy HTML files from `src` to `dist`
 */
gulp.task('html', () => {
  $.fancyLog('→ Copying HTML from src to dist');
  gulp
    .src(pkg.paths.src.base + '**/*.html')
    .pipe($.newer(pkg.paths.dist + '**/*.html'))
    .pipe(gulp.dest(pkg.paths.dist.base));
});

/**
 * Minify HTML files
 *
 * This basically does the same thing as the above task, with the addition
 * of minifying before copying. Depending on templating engine, whether
 * we're using PHP, etc., this might not be necessary.
 */
gulp.task('html:minify', () => {
  $.fancyLog('→ Minifying HTML and copying from src to dist');
  gulp
    .src(pkg.paths.src.base + '**/*.html')
    .pipe($.newer(pkg.paths.dist + '**/*.html'))
    .pipe($.htmlmin({
      collapseWhitespace: true,
      minifyJS: true,
      removeComments: true
    }))
    .pipe(gulp.dest(pkg.paths.dist.base));
});

/* Browser Sync/Watch
   ========================================================================== */

$.browserSync.create();

gulp.task('serve', ['html', 'css', 'js'], () => {
  $.fancyLog('→ Serving with Browser Sync and watching');
  $.browserSync.init({
    open: false, // Whether to automatically open browser
    server: {
      baseDir: pkg.paths.dist.base,
    }
  });

  /**
   * Watch source CSS and build on change
   *
   * Append with `.on('change', $.browserSync.reload)` to reload browser.
   */
  gulp.watch(pkg.paths.src.css + '**/*.css', ['css']);

  // Watch Tailwind config and build CSS on change
  gulp.watch(pkg.paths.config.tailwind, ['css']);

  // Watch source JS and build on change
  gulp.watch(pkg.paths.src.js + '**/*.js', ['js']);

  // Watch source HTML and transfer and reload on change
  gulp.watch(pkg.paths.src.base + '**/*.html', ['html']).on('change', $.browserSync.reload);
});

gulp.task('default', ['serve']);

/**
 * Order of PostCSS plugins from previous setup
 *
 // * $.postcssEasyImport(),
 * $.postcssModularScale(),
 // * $.postcssNormalize({ forceImport: true }),
 * $.postcssCustomProperties({
 *   // Use this to keep the literal custom property in the CSS
 *   // preserve: true
 * }),
 * $.postcssCalc(),
 * $.postcssCustomMedia(),
 * $.postcssMediaMinmax(),
 * $.postcssCustomSelectors(),
 * $.postcssNesting(),
 * $.postcssImageSetPolyfill(),
 * $.postcssColorFunction(),
 * $.postcssColorHwb(),
 * $.postcssColorGray(),
 * $.postcssColorHexAlpha(),
 * $.postcssColorRgbaFallback(),
 * $.postcssColorRebeccapurple(),
 * $.postcssFontVariant(),
 * $.pleeeaseFilters(),
 * $.postcssInitial(),
 * $.postcssPseudoClassAnyLink(),
 * $.postcssSelectorMatches(),
 * $.postcssSelectorNot(),
 * $.postcssPseudoelements(),
 * $.postcssReplaceOverflowWrap({
 *   method: 'copy', // Keep `word-wrap` and `overflow-wrap`
 * }),
 * $.postcssColorRgb(),
 * $.postcssColorHsl(),
 // * $.postcssFontFamilySystemUi(),
 // * $.cssnano({
 // *   autoprefixer: {
 // *     add: true, // browserslist settings in package.json
 // *   },
 // *   core: false, // Don't minimize whitespace yet
 // * }),
 // * $.postcssReporter({
 // *   clearMessages: true,
 // *   throwError: true,
 // * }),
 */
