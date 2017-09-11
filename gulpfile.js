var gulp = require('gulp');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint')

var src = 'src/**/*.ts';
var tsProject = ts.createProject('tsconfig.json');

gulp.task('server', function () {
    var tsResult = gulp.src('src/server/**/*.ts')
        .pipe(tsProject());
    return tsResult.js.pipe(gulp.dest("./dist/server"));
});

gulp.task('ui', function () {
    gulp.src('src/web/*')
        .pipe(gulp.dest('dist/ui'));
});

gulp.task('lint', function () {
    gulp.src(src)
        .pipe(tslint({
            formatter: "verbose",
            configuration: 'tslint.json'
        }))
        .pipe(tslint.report())
});

gulp.task('default', [ 'lint', 'server', 'ui'] );