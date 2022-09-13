import gulp from "gulp";
import bs from "browser-sync";
import fileinclude from "gulp-file-include";
import {deleteAsync} from "del";
import sass from 'sass';
import gulpSass from 'gulp-sass';
import autoprefixer from "gulp-autoprefixer";
import group_media from "gulp-group-css-media-queries";
import clean_css from "gulp-clean-css";
import rename from "gulp-rename";
import uglify from "gulp-uglify-es";
import imagemin from "gulp-imagemin";
import webp from "gulp-webp";
import webphtml from "gulp-webp-html";
import webpcss from "gulp-webpcss";
import svgSprite from "gulp-svg-sprite";
import ttf2woff from "gulp-ttf2woff";
import ttf2woff2 from "gulp-ttf2woff2";
import fonter from "gulp-fonter";
import fs from "fs";
import babel from "gulp-babel";

let project_folder = "dist";
let source_folder = "src";

let path = {
    build: {
        html: project_folder + "/",
        css: project_folder + "/css/",
        js: project_folder + "/js/",
        img: project_folder + "/img/",
        fonts: project_folder + "/fonts/"
    },
    src: {
        html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
        scss: source_folder + "/scss/style.scss",
        js: source_folder + "/js/script.js",
        img: source_folder + "/img/**/*.+(png|jpg|gif|ico|svg|webp)",
        fonts: source_folder + "/fonts/*.ttf"
    },
    watch: {
        html: source_folder + "/**/*.html",
        scss: source_folder + "/scss/**/*.scss",
        js: source_folder + "/js/**/*.js",
        img: source_folder + "/img/**/*.+(png|jpg|gif|ico|svg|webp)"
    },
    clean: "./" + project_folder + "/"
}

let {src, dest} = gulp,
    browsersync = bs.create(),
    scss = gulpSass(sass);

function browserSync() {
    browsersync.init({
        server: {
            baseDir: "./" + project_folder + "/"
        },
        port: 3000,
        notify: false
    });
}

function html() {
    return src(path.src.html)
        .pipe(fileinclude())
        .pipe(webphtml())
        .pipe(dest(path.build.html))
        .pipe(browsersync.stream());
}

function css() {
    return src(path.src.scss)
        .pipe(scss({
            outputStyle: "expanded"
        }))
        .pipe(group_media())
        .pipe(autoprefixer({
            overrideBrowserslist: ["last 5 versions"],
            cascade: true
        }))
        .pipe(webpcss({
            webpClass: '.webp',
            noWebpClass: '.no-webp'
        }))
        .pipe(dest(path.build.css))
        .pipe(clean_css())
        .pipe(rename({
            extname: ".min.css"
        }))
        .pipe(dest(path.build.css))
        .pipe(browsersync.stream());
}

function js() {
        src(path.src.js)
        .pipe(fileinclude())
        .pipe(dest(path.build.js))
        .pipe(babel({
            presets: [["@babel/preset-env", {
                "modules": "umd"
            }]]
        }))
        .pipe(uglify.default())
        .pipe(rename({
            extname: ".min.js"
        }))
        .pipe(dest(path.build.js))
        .pipe(browsersync.stream());
}

function images() {
    return src(path.src.img)
        .pipe(webp({
            quality: 70
        }))
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            interlaced: true,
            optimizationLevel: 3
        }))
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream());
}

gulp.task('otf2ttf', function () {
    return src([source_folder + "/fonts/*.otf"])
        .pipe(fonter({
            formats: ["ttf"]
        }))
        .pipe(dest(source_folder + "/fonts/"));
})
gulp.task('svgSprite', function () {
    return gulp.src([source_folder + "/iconsprite/*.svg"])
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "../icons/icons.svg",
                    example: true
                }
            }
        }))
        .pipe(dest(path.build.img))
})

function fontsStyle() {
    let file_content = fs.readFileSync(source_folder + '/scss/core/fonts.scss');
    if (file_content == '') {
        fs.writeFile(source_folder + '/scss/core/fonts.scss', '', () => {});
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(source_folder + '/scss/core/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', () => {});
                    }
                    c_fontname = fontname;
                }
            }
        })
    }
}

function fonts() {
    src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(dest(path.build.fonts))
    return src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts))
}

function watchFiles() {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.scss], css);
    gulp.watch([path.watch.js], js);
}

function clean() {
    return deleteAsync(path.clean);
}

let build = gulp.series(clean, gulp.parallel(js, css, html, images, fonts), fontsStyle);
let watch = gulp.parallel(build, watchFiles, browserSync);

export default watch;