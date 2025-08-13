(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["msak"] = factory();
	else
		root["msak"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 232:
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;/////////////////////////////////////////////////////////////////////////////////
/* UAParser.js v1.0.37
   Copyright © 2012-2021 Faisal Salman <f@faisalman.com>
   MIT License *//*
   Detect Browser, Engine, OS, CPU, and Device type/model from User-Agent data.
   Supports browser & node.js environment. 
   Demo   : https://faisalman.github.io/ua-parser-js
   Source : https://github.com/faisalman/ua-parser-js */
/////////////////////////////////////////////////////////////////////////////////

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '1.0.37',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major',
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded',
        UA_MAX_LENGTH = 500;

    var AMAZON  = 'Amazon',
        APPLE   = 'Apple',
        ASUS    = 'ASUS',
        BLACKBERRY = 'BlackBerry',
        BROWSER = 'Browser',
        CHROME  = 'Chrome',
        EDGE    = 'Edge',
        FIREFOX = 'Firefox',
        GOOGLE  = 'Google',
        HUAWEI  = 'Huawei',
        LG      = 'LG',
        MICROSOFT = 'Microsoft',
        MOTOROLA  = 'Motorola',
        OPERA   = 'Opera',
        SAMSUNG = 'Samsung',
        SHARP   = 'Sharp',
        SONY    = 'Sony',
        XIAOMI  = 'Xiaomi',
        ZEBRA   = 'Zebra',
        FACEBOOK    = 'Facebook',
        CHROMIUM_OS = 'Chromium OS',
        MAC_OS  = 'Mac OS';

    ///////////
    // Helper
    //////////

    var extend = function (regexes, extensions) {
            var mergedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    mergedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    mergedRegexes[i] = regexes[i];
                }
            }
            return mergedRegexes;
        },
        enumerize = function (arr) {
            var enums = {};
            for (var i=0; i<arr.length; i++) {
                enums[arr[i].toUpperCase()] = arr[i];
            }
            return enums;
        },
        has = function (str1, str2) {
            return typeof str1 === STR_TYPE ? lowerize(str2).indexOf(lowerize(str1)) !== -1 : false;
        },
        lowerize = function (str) {
            return str.toLowerCase();
        },
        majorize = function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g, EMPTY).split('.')[0] : undefined;
        },
        trim = function (str, len) {
            if (typeof(str) === STR_TYPE) {
                str = str.replace(/^\s\s*/, EMPTY);
                return typeof(len) === UNDEF_TYPE ? str : str.substring(0, UA_MAX_LENGTH);
            }
    };

    ///////////////
    // Map helper
    //////////////

    var rgxMapper = function (ua, arrays) {

            var i = 0, j, k, p, q, matches, match;

            // loop through all regexes maps
            while (i < arrays.length && !matches) {

                var regex = arrays[i],       // even sequence (0,2,4,..)
                    props = arrays[i + 1];   // odd sequence (1,3,5,..)
                j = k = 0;

                // try matching uastring with regexes
                while (j < regex.length && !matches) {

                    if (!regex[j]) { break; }
                    matches = regex[j++].exec(ua);

                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length === 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        this[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        this[q[0]] = q[1];
                                    }
                                } else if (q.length === 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        this[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length === 4) {
                                        this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                this[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
        },

        strMapper = function (str, map) {

            for (var i in map) {
                // check if current value is array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
    };

    ///////////////
    // String map
    //////////////

    // Safari < 3.0
    var oldSafariMap = {
            '1.0'   : '/8',
            '1.2'   : '/1',
            '1.3'   : '/3',
            '2.0'   : '/412',
            '2.0.2' : '/416',
            '2.0.3' : '/417',
            '2.0.4' : '/419',
            '?'     : '/'
        },
        windowsVersionMap = {
            'ME'        : '4.90',
            'NT 3.11'   : 'NT3.51',
            'NT 4.0'    : 'NT4.0',
            '2000'      : 'NT 5.0',
            'XP'        : ['NT 5.1', 'NT 5.2'],
            'Vista'     : 'NT 6.0',
            '7'         : 'NT 6.1',
            '8'         : 'NT 6.2',
            '8.1'       : 'NT 6.3',
            '10'        : ['NT 6.4', 'NT 10.0'],
            'RT'        : 'ARM'
    };

    //////////////
    // Regex map
    /////////////

    var regexes = {

        browser : [[

            /\b(?:crmo|crios)\/([\w\.]+)/i                                      // Chrome for Android/iOS
            ], [VERSION, [NAME, 'Chrome']], [
            /edg(?:e|ios|a)?\/([\w\.]+)/i                                       // Microsoft Edge
            ], [VERSION, [NAME, 'Edge']], [

            // Presto based
            /(opera mini)\/([-\w\.]+)/i,                                        // Opera Mini
            /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i,                 // Opera Mobi/Tablet
            /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i                           // Opera
            ], [NAME, VERSION], [
            /opios[\/ ]+([\w\.]+)/i                                             // Opera mini on iphone >= 8.0
            ], [VERSION, [NAME, OPERA+' Mini']], [
            /\bopr\/([\w\.]+)/i                                                 // Opera Webkit
            ], [VERSION, [NAME, OPERA]], [

            // Mixed
            /\bb[ai]*d(?:uhd|[ub]*[aekoprswx]{5,6})[\/ ]?([\w\.]+)/i            // Baidu
            ], [VERSION, [NAME, 'Baidu']], [
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i,      // Lunascape/Maxthon/Netfront/Jasmine/Blazer
            // Trident based
            /(avant|iemobile|slim)\s?(?:browser)?[\/ ]?([\w\.]*)/i,             // Avant/IEMobile/SlimBrowser
            /(?:ms|\()(ie) ([\w\.]+)/i,                                         // Internet Explorer

            // Webkit/KHTML based                                               // Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser/QupZilla/Falkon
            /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i,
                                                                                // Rekonq/Puffin/Brave/Whale/QQBrowserLite/QQ, aka ShouQ
            /(heytap|ovi)browser\/([\d\.]+)/i,                                  // Heytap/Ovi
            /(weibo)__([\d\.]+)/i                                               // Weibo
            ], [NAME, VERSION], [
            /(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i                 // UCBrowser
            ], [VERSION, [NAME, 'UC'+BROWSER]], [
            /microm.+\bqbcore\/([\w\.]+)/i,                                     // WeChat Desktop for Windows Built-in Browser
            /\bqbcore\/([\w\.]+).+microm/i,
            /micromessenger\/([\w\.]+)/i                                        // WeChat
            ], [VERSION, [NAME, 'WeChat']], [
            /konqueror\/([\w\.]+)/i                                             // Konqueror
            ], [VERSION, [NAME, 'Konqueror']], [
            /trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i                       // IE11
            ], [VERSION, [NAME, 'IE']], [
            /ya(?:search)?browser\/([\w\.]+)/i                                  // Yandex
            ], [VERSION, [NAME, 'Yandex']], [
            /slbrowser\/([\w\.]+)/i                                             // Smart Lenovo Browser
            ], [VERSION, [NAME, 'Smart Lenovo '+BROWSER]], [
            /(avast|avg)\/([\w\.]+)/i                                           // Avast/AVG Secure Browser
            ], [[NAME, /(.+)/, '$1 Secure '+BROWSER], VERSION], [
            /\bfocus\/([\w\.]+)/i                                               // Firefox Focus
            ], [VERSION, [NAME, FIREFOX+' Focus']], [
            /\bopt\/([\w\.]+)/i                                                 // Opera Touch
            ], [VERSION, [NAME, OPERA+' Touch']], [
            /coc_coc\w+\/([\w\.]+)/i                                            // Coc Coc Browser
            ], [VERSION, [NAME, 'Coc Coc']], [
            /dolfin\/([\w\.]+)/i                                                // Dolphin
            ], [VERSION, [NAME, 'Dolphin']], [
            /coast\/([\w\.]+)/i                                                 // Opera Coast
            ], [VERSION, [NAME, OPERA+' Coast']], [
            /miuibrowser\/([\w\.]+)/i                                           // MIUI Browser
            ], [VERSION, [NAME, 'MIUI '+BROWSER]], [
            /fxios\/([-\w\.]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, FIREFOX]], [
            /\bqihu|(qi?ho?o?|360)browser/i                                     // 360
            ], [[NAME, '360 ' + BROWSER]], [
            /(oculus|sailfish|huawei|vivo)browser\/([\w\.]+)/i
            ], [[NAME, /(.+)/, '$1 ' + BROWSER], VERSION], [                    // Oculus/Sailfish/HuaweiBrowser/VivoBrowser
            /samsungbrowser\/([\w\.]+)/i                                        // Samsung Internet
            ], [VERSION, [NAME, SAMSUNG + ' Internet']], [
            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [
            /metasr[\/ ]?([\d\.]+)/i                                            // Sogou Explorer
            ], [VERSION, [NAME, 'Sogou Explorer']], [
            /(sogou)mo\w+\/([\d\.]+)/i                                          // Sogou Mobile
            ], [[NAME, 'Sogou Mobile'], VERSION], [
            /(electron)\/([\w\.]+) safari/i,                                    // Electron-based App
            /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i,                   // Tesla
            /m?(qqbrowser|2345Explorer)[\/ ]?([\w\.]+)/i                        // QQBrowser/2345 Browser
            ], [NAME, VERSION], [
            /(lbbrowser)/i,                                                     // LieBao Browser
            /\[(linkedin)app\]/i                                                // LinkedIn App for iOS & Android
            ], [NAME], [

            // WebView
            /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i       // Facebook App for iOS & Android
            ], [[NAME, FACEBOOK], VERSION], [
            /(Klarna)\/([\w\.]+)/i,                                             // Klarna Shopping Browser for iOS & Android
            /(kakao(?:talk|story))[\/ ]([\w\.]+)/i,                             // Kakao App
            /(naver)\(.*?(\d+\.[\w\.]+).*\)/i,                                  // Naver InApp
            /safari (line)\/([\w\.]+)/i,                                        // Line App for iOS
            /\b(line)\/([\w\.]+)\/iab/i,                                        // Line App for Android
            /(alipay)client\/([\w\.]+)/i,                                       // Alipay
            /(chromium|instagram|snapchat)[\/ ]([-\w\.]+)/i                     // Chromium/Instagram/Snapchat
            ], [NAME, VERSION], [
            /\bgsa\/([\w\.]+) .*safari\//i                                      // Google Search Appliance on iOS
            ], [VERSION, [NAME, 'GSA']], [
            /musical_ly(?:.+app_?version\/|_)([\w\.]+)/i                        // TikTok
            ], [VERSION, [NAME, 'TikTok']], [

            /headlesschrome(?:\/([\w\.]+)| )/i                                  // Chrome Headless
            ], [VERSION, [NAME, CHROME+' Headless']], [

            / wv\).+(chrome)\/([\w\.]+)/i                                       // Chrome WebView
            ], [[NAME, CHROME+' WebView'], VERSION], [

            /droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i           // Android Browser
            ], [VERSION, [NAME, 'Android '+BROWSER]], [

            /(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i       // Chrome/OmniWeb/Arora/Tizen/Nokia
            ], [NAME, VERSION], [

            /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i                      // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [
            /version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i                // Safari & Safari Mobile
            ], [VERSION, NAME], [
            /webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i                      // Safari < 3.0
            ], [NAME, [VERSION, strMapper, oldSafariMap]], [

            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape\d?)\/([-\w\.]+)/i                              // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /mobile vr; rv:([\w\.]+)\).+firefox/i                               // Firefox Reality
            ], [VERSION, [NAME, FIREFOX+' Reality']], [
            /ekiohf.+(flow)\/([\w\.]+)/i,                                       // Flow
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror/Klar
            /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(firefox)\/([\w\.]+)/i,                                            // Other Firefox-based
            /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i,                         // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir/Obigo/Mosaic/Go/ICE/UP.Browser
            /(links) \(([\w\.]+)/i,                                             // Links
            /panasonic;(viera)/i                                                // Panasonic Viera
            ], [NAME, VERSION], [
            
            /(cobalt)\/([\w\.]+)/i                                              // Cobalt
            ], [NAME, [VERSION, /master.|lts./, ""]]
        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i                     // AMD64 (x64)
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32 (x86)
            ], [[ARCHITECTURE, 'ia32']], [

            /\b(aarch64|arm(v?8e?l?|_?64))\b/i                                 // ARM64
            ], [[ARCHITECTURE, 'arm64']], [

            /\b(arm(?:v[67])?ht?n?[fl]p?)\b/i                                   // ARMHF
            ], [[ARCHITECTURE, 'armhf']], [

            // PocketPC mistakenly identified as PowerPC
            /windows (ce|mobile); ppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i                            // PowerPC
            ], [[ARCHITECTURE, /ower/, EMPTY, lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, lowerize]]
        ],

        device : [[

            //////////////////////////
            // MOBILES & TABLETS
            /////////////////////////

            // Samsung
            /\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i
            ], [MODEL, [VENDOR, SAMSUNG], [TYPE, TABLET]], [
            /\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i,
            /samsung[- ]([-\w]+)/i,
            /sec-(sgh\w+)/i
            ], [MODEL, [VENDOR, SAMSUNG], [TYPE, MOBILE]], [

            // Apple
            /(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i                          // iPod/iPhone
            ], [MODEL, [VENDOR, APPLE], [TYPE, MOBILE]], [
            /\((ipad);[-\w\),; ]+apple/i,                                       // iPad
            /applecoremedia\/[\w\.]+ \((ipad)/i,
            /\b(ipad)\d\d?,\d\d?[;\]].+ios/i
            ], [MODEL, [VENDOR, APPLE], [TYPE, TABLET]], [
            /(macintosh);/i
            ], [MODEL, [VENDOR, APPLE]], [

            // Sharp
            /\b(sh-?[altvz]?\d\d[a-ekm]?)/i
            ], [MODEL, [VENDOR, SHARP], [TYPE, MOBILE]], [

            // Huawei
            /\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i
            ], [MODEL, [VENDOR, HUAWEI], [TYPE, TABLET]], [
            /(?:huawei|honor)([-\w ]+)[;\)]/i,
            /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i
            ], [MODEL, [VENDOR, HUAWEI], [TYPE, MOBILE]], [

            // Xiaomi
            /\b(poco[\w ]+|m2\d{3}j\d\d[a-z]{2})(?: bui|\))/i,                  // Xiaomi POCO
            /\b; (\w+) build\/hm\1/i,                                           // Xiaomi Hongmi 'numeric' models
            /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i,                             // Xiaomi Hongmi
            /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i,                   // Xiaomi Redmi
            /oid[^\)]+; (m?[12][0-389][01]\w{3,6}[c-y])( bui|; wv|\))/i,        // Xiaomi Redmi 'numeric' models
            /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i // Xiaomi Mi
            ], [[MODEL, /_/g, ' '], [VENDOR, XIAOMI], [TYPE, MOBILE]], [
            /oid[^\)]+; (2\d{4}(283|rpbf)[cgl])( bui|\))/i,                     // Redmi Pad
            /\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i                        // Mi Pad tablets
            ],[[MODEL, /_/g, ' '], [VENDOR, XIAOMI], [TYPE, TABLET]], [

            // OPPO
            /; (\w+) bui.+ oppo/i,
            /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i
            ], [MODEL, [VENDOR, 'OPPO'], [TYPE, MOBILE]], [

            // Vivo
            /vivo (\w+)(?: bui|\))/i,
            /\b(v[12]\d{3}\w?[at])(?: bui|;)/i
            ], [MODEL, [VENDOR, 'Vivo'], [TYPE, MOBILE]], [

            // Realme
            /\b(rmx[1-3]\d{3})(?: bui|;|\))/i
            ], [MODEL, [VENDOR, 'Realme'], [TYPE, MOBILE]], [

            // Motorola
            /\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,
            /\bmot(?:orola)?[- ](\w*)/i,
            /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i
            ], [MODEL, [VENDOR, MOTOROLA], [TYPE, MOBILE]], [
            /\b(mz60\d|xoom[2 ]{0,2}) build\//i
            ], [MODEL, [VENDOR, MOTOROLA], [TYPE, TABLET]], [

            // LG
            /((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i
            ], [MODEL, [VENDOR, LG], [TYPE, TABLET]], [
            /(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,
            /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i,
            /\blg-?([\d\w]+) bui/i
            ], [MODEL, [VENDOR, LG], [TYPE, MOBILE]], [

            // Lenovo
            /(ideatab[-\w ]+)/i,
            /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            // Nokia
            /(?:maemo|nokia).*(n900|lumia \d+)/i,
            /nokia[-_ ]?([-\w\.]*)/i
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Nokia'], [TYPE, MOBILE]], [

            // Google
            /(pixel c)\b/i                                                      // Google Pixel C
            ], [MODEL, [VENDOR, GOOGLE], [TYPE, TABLET]], [
            /droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i                         // Google Pixel
            ], [MODEL, [VENDOR, GOOGLE], [TYPE, MOBILE]], [

            // Sony
            /droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i
            ], [MODEL, [VENDOR, SONY], [TYPE, MOBILE]], [
            /sony tablet [ps]/i,
            /\b(?:sony)?sgp\w+(?: bui|\))/i
            ], [[MODEL, 'Xperia Tablet'], [VENDOR, SONY], [TYPE, TABLET]], [

            // OnePlus
            / (kb2005|in20[12]5|be20[12][59])\b/i,
            /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            // Amazon
            /(alexa)webm/i,
            /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i,                             // Kindle Fire without Silk / Echo Show
            /(kf[a-z]+)( bui|\)).+silk\//i                                      // Kindle Fire HD
            ], [MODEL, [VENDOR, AMAZON], [TYPE, TABLET]], [
            /((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i                     // Fire Phone
            ], [[MODEL, /(.+)/g, 'Fire Phone $1'], [VENDOR, AMAZON], [TYPE, MOBILE]], [

            // BlackBerry
            /(playbook);[-\w\),; ]+(rim)/i                                      // BlackBerry PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [
            /\b((?:bb[a-f]|st[hv])100-\d)/i,
            /\(bb10; (\w+)/i                                                    // BlackBerry 10
            ], [MODEL, [VENDOR, BLACKBERRY], [TYPE, MOBILE]], [

            // Asus
            /(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i
            ], [MODEL, [VENDOR, ASUS], [TYPE, TABLET]], [
            / (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i
            ], [MODEL, [VENDOR, ASUS], [TYPE, MOBILE]], [

            // HTC
            /(nexus 9)/i                                                        // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [
            /(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i,                         // HTC

            // ZTE
            /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,
            /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i         // Alcatel/GeeksPhone/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            // Acer
            /droid.+; ([ab][1-7]-?[0178a]\d\d?)/i
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            // Meizu
            /droid.+; (m[1-5] note) bui/i,
            /\bmz-([-\w]{2,})/i
            ], [MODEL, [VENDOR, 'Meizu'], [TYPE, MOBILE]], [
                
            // Ulefone
            /; ((?:power )?armor(?:[\w ]{0,8}))(?: bui|\))/i
            ], [MODEL, [VENDOR, 'Ulefone'], [TYPE, MOBILE]], [

            // MIXED
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron|infinix|tecno)[-_ ]?([-\w]*)/i,
                                                                                // BlackBerry/BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
            /(hp) ([\w ]+\w)/i,                                                 // HP iPAQ
            /(asus)-?(\w+)/i,                                                   // Asus
            /(microsoft); (lumia[\w ]+)/i,                                      // Microsoft Lumia
            /(lenovo)[-_ ]?([-\w]+)/i,                                          // Lenovo
            /(jolla)/i,                                                         // Jolla
            /(oppo) ?([\w ]+) bui/i                                             // OPPO
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /(kobo)\s(ereader|touch)/i,                                         // Kobo
            /(archos) (gamepad2?)/i,                                            // Archos
            /(hp).+(touchpad(?!.+tablet)|tablet)/i,                             // HP TouchPad
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(nook)[\w ]+build\/(\w+)/i,                                        // Nook
            /(dell) (strea[kpr\d ]*[\dko])/i,                                   // Dell Streak
            /(le[- ]+pan)[- ]+(\w{1,9}) bui/i,                                  // Le Pan Tablets
            /(trinity)[- ]*(t\d{3}) bui/i,                                      // Trinity Tablets
            /(gigaset)[- ]+(q\w{1,9}) bui/i,                                    // Gigaset Tablets
            /(vodafone) ([\w ]+)(?:\)| bui)/i                                   // Vodafone
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(surface duo)/i                                                    // Surface Duo
            ], [MODEL, [VENDOR, MICROSOFT], [TYPE, TABLET]], [
            /droid [\d\.]+; (fp\du?)(?: b|\))/i                                 // Fairphone
            ], [MODEL, [VENDOR, 'Fairphone'], [TYPE, MOBILE]], [
            /(u304aa)/i                                                         // AT&T
            ], [MODEL, [VENDOR, 'AT&T'], [TYPE, MOBILE]], [
            /\bsie-(\w*)/i                                                      // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [
            /\b(rct\w+) b/i                                                     // RCA Tablets
            ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [
            /\b(venue[\d ]{2,7}) b/i                                            // Dell Venue Tablets
            ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [
            /\b(q(?:mv|ta)\w+) b/i                                              // Verizon Tablet
            ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [
            /\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i                       // Barnes & Noble Tablet
            ], [MODEL, [VENDOR, 'Barnes & Noble'], [TYPE, TABLET]], [
            /\b(tm\d{3}\w+) b/i
            ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [
            /\b(k88) b/i                                                        // ZTE K Series Tablet
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, TABLET]], [
            /\b(nx\d{3}j) b/i                                                   // ZTE Nubia
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [
            /\b(gen\d{3}) b.+49h/i                                              // Swiss GEN Mobile
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [
            /\b(zur\d{3}) b/i                                                   // Swiss ZUR Tablet
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [
            /\b((zeki)?tb.*\b) b/i                                              // Zeki Tablets
            ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [
            /\b([yr]\d{2}) b/i,
            /\b(dragon[- ]+touch |dt)(\w{5}) b/i                                // Dragon Touch Tablet
            ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [
            /\b(ns-?\w{0,9}) b/i                                                // Insignia Tablets
            ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [
            /\b((nxa|next)-?\w{0,9}) b/i                                        // NextBook Tablets
            ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [
            /\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i                  // Voice Xtreme Phones
            ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [
            /\b(lvtel\-)?(v1[12]) b/i                                           // LvTel Phones
            ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [
            /\b(ph-1) /i                                                        // Essential PH-1
            ], [MODEL, [VENDOR, 'Essential'], [TYPE, MOBILE]], [
            /\b(v(100md|700na|7011|917g).*\b) b/i                               // Envizen Tablets
            ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [
            /\b(trio[-\w\. ]+) b/i                                              // MachSpeed Tablets
            ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [
            /\btu_(1491) b/i                                                    // Rotor Tablets
            ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [
            /(shield[\w ]+) b/i                                                 // Nvidia Shield Tablets
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, TABLET]], [
            /(sprint) (\w+)/i                                                   // Sprint Phones
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, MICROSOFT], [TYPE, MOBILE]], [
            /droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i             // Zebra
            ], [MODEL, [VENDOR, ZEBRA], [TYPE, TABLET]], [
            /droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i
            ], [MODEL, [VENDOR, ZEBRA], [TYPE, MOBILE]], [

            ///////////////////
            // SMARTTVS
            ///////////////////

            /smart-tv.+(samsung)/i                                              // Samsung
            ], [VENDOR, [TYPE, SMARTTV]], [
            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, SAMSUNG], [TYPE, SMARTTV]], [
            /(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i        // LG SmartTV
            ], [[VENDOR, LG], [TYPE, SMARTTV]], [
            /(apple) ?tv/i                                                      // Apple TV
            ], [VENDOR, [MODEL, APPLE+' TV'], [TYPE, SMARTTV]], [
            /crkey/i                                                            // Google Chromecast
            ], [[MODEL, CHROME+'cast'], [VENDOR, GOOGLE], [TYPE, SMARTTV]], [
            /droid.+aft(\w+)( bui|\))/i                                         // Fire TV
            ], [MODEL, [VENDOR, AMAZON], [TYPE, SMARTTV]], [
            /\(dtv[\);].+(aquos)/i,
            /(aquos-tv[\w ]+)\)/i                                               // Sharp
            ], [MODEL, [VENDOR, SHARP], [TYPE, SMARTTV]],[
            /(bravia[\w ]+)( bui|\))/i                                              // Sony
            ], [MODEL, [VENDOR, SONY], [TYPE, SMARTTV]], [
            /(mitv-\w{5}) bui/i                                                 // Xiaomi
            ], [MODEL, [VENDOR, XIAOMI], [TYPE, SMARTTV]], [
            /Hbbtv.*(technisat) (.*);/i                                         // TechniSAT
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i,                          // Roku
            /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i         // HbbTV devices
            ], [[VENDOR, trim], [MODEL, trim], [TYPE, SMARTTV]], [
            /\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i                   // SmartTV from Unidentified Vendors
            ], [[TYPE, SMARTTV]], [

            ///////////////////
            // CONSOLES
            ///////////////////

            /(ouya)/i,                                                          // Ouya
            /(nintendo) ([wids3utch]+)/i                                        // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [
            /droid.+; (shield) bui/i                                            // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [
            /(playstation [345portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, SONY], [TYPE, CONSOLE]], [
            /\b(xbox(?: one)?(?!; xbox))[\); ]/i                                // Microsoft Xbox
            ], [MODEL, [VENDOR, MICROSOFT], [TYPE, CONSOLE]], [

            ///////////////////
            // WEARABLES
            ///////////////////

            /((pebble))app/i                                                    // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [
            /(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i                              // Apple Watch
            ], [MODEL, [VENDOR, APPLE], [TYPE, WEARABLE]], [
            /droid.+; (glass) \d/i                                              // Google Glass
            ], [MODEL, [VENDOR, GOOGLE], [TYPE, WEARABLE]], [
            /droid.+; (wt63?0{2,3})\)/i
            ], [MODEL, [VENDOR, ZEBRA], [TYPE, WEARABLE]], [
            /(quest( 2| pro)?)/i                                                // Oculus Quest
            ], [MODEL, [VENDOR, FACEBOOK], [TYPE, WEARABLE]], [

            ///////////////////
            // EMBEDDED
            ///////////////////

            /(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i                              // Tesla
            ], [VENDOR, [TYPE, EMBEDDED]], [
            /(aeobc)\b/i                                                        // Echo Dot
            ], [MODEL, [VENDOR, AMAZON], [TYPE, EMBEDDED]], [

            ////////////////////
            // MIXED (GENERIC)
            ///////////////////

            /droid .+?; ([^;]+?)(?: bui|; wv\)|\) applew).+? mobile safari/i    // Android Phones from Unidentified Vendors
            ], [MODEL, [TYPE, MOBILE]], [
            /droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i       // Android Tablets from Unidentified Vendors
            ], [MODEL, [TYPE, TABLET]], [
            /\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i                      // Unidentifiable Tablet
            ], [[TYPE, TABLET]], [
            /(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i    // Unidentifiable Mobile
            ], [[TYPE, MOBILE]], [
            /(android[-\w\. ]{0,9});.+buil/i                                    // Generic Android Device
            ], [MODEL, [VENDOR, 'Generic']]
        ],

        engine : [[

            /windows.+ edge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, EDGE+'HTML']], [

            /webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i                         // Blink
            ], [VERSION, [NAME, 'Blink']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m/Goanna
            /ekioh(flow)\/([\w\.]+)/i,                                          // Flow
            /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i,                           // KHTML/Tasman/Links
            /(icab)[\/ ]([23]\.[\d\.]+)/i,                                      // iCab
            /\b(libweb)/i
            ], [NAME, VERSION], [

            /rv\:([\w\.]{1,9})\b.+(gecko)/i                                     // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows
            /microsoft (windows) (vista|xp)/i                                   // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i             // Windows Phone
            ], [NAME, [VERSION, strMapper, windowsVersionMap]], [
            /windows nt 6\.2; (arm)/i,                                        // Windows RT
            /windows[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i,
            /(?:win(?=3|9|n)|win 9x )([nt\d\.]+)/i
            ], [[VERSION, strMapper, windowsVersionMap], [NAME, 'Windows']], [

            // iOS/macOS
            /ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i,              // iOS
            /(?:ios;fbsv\/|iphone.+ios[\/ ])([\d\.]+)/i,
            /cfnetwork\/.+darwin/i
            ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [
            /(mac os x) ?([\w\. ]*)/i,
            /(macintosh|mac_powerpc\b)(?!.+haiku)/i                             // Mac OS
            ], [[NAME, MAC_OS], [VERSION, /_/g, '.']], [

            // Mobile OSes
            /droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i                    // Android-x86/HarmonyOS
            ], [VERSION, NAME], [                                               // Android/WebOS/QNX/Bada/RIM/Maemo/MeeGo/Sailfish OS
            /(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i,
            /(blackberry)\w*\/([\w\.]*)/i,                                      // Blackberry
            /(tizen|kaios)[\/ ]([\w\.]+)/i,                                     // Tizen/KaiOS
            /\((series40);/i                                                    // Series 40
            ], [NAME, VERSION], [
            /\(bb(10);/i                                                        // BlackBerry 10
            ], [VERSION, [NAME, BLACKBERRY]], [
            /(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i         // Symbian
            ], [VERSION, [NAME, 'Symbian']], [
            /mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i // Firefox OS
            ], [VERSION, [NAME, FIREFOX+' OS']], [
            /web0s;.+rt(tv)/i,
            /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i                              // WebOS
            ], [VERSION, [NAME, 'webOS']], [
            /watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i                              // watchOS
            ], [VERSION, [NAME, 'watchOS']], [

            // Google Chromecast
            /crkey\/([\d\.]+)/i                                                 // Google Chromecast
            ], [VERSION, [NAME, CHROME+'cast']], [
            /(cros) [\w]+(?:\)| ([\w\.]+)\b)/i                                  // Chromium OS
            ], [[NAME, CHROMIUM_OS], VERSION],[

            // Smart TVs
            /panasonic;(viera)/i,                                               // Panasonic Viera
            /(netrange)mmh/i,                                                   // Netrange
            /(nettv)\/(\d+\.[\w\.]+)/i,                                         // NetTV

            // Console
            /(nintendo|playstation) ([wids345portablevuch]+)/i,                 // Nintendo/Playstation
            /(xbox); +xbox ([^\);]+)/i,                                         // Microsoft Xbox (360, One, X, S, Series X, Series S)

            // Other
            /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i,                            // Joli/Palm
            /(mint)[\/\(\) ]?(\w*)/i,                                           // Mint
            /(mageia|vectorlinux)[; ]/i,                                        // Mageia/VectorLinux
            /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,
                                                                                // Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware/Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus/Raspbian/Plan9/Minix/RISCOS/Contiki/Deepin/Manjaro/elementary/Sabayon/Linspire
            /(hurd|linux) ?([\w\.]*)/i,                                         // Hurd/Linux
            /(gnu) ?([\w\.]*)/i,                                                // GNU
            /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, // FreeBSD/NetBSD/OpenBSD/PC-BSD/GhostBSD/DragonFly
            /(haiku) (\w+)/i                                                    // Haiku
            ], [NAME, VERSION], [
            /(sunos) ?([\w\.\d]*)/i                                             // Solaris
            ], [[NAME, 'Solaris'], VERSION], [
            /((?:open)?solaris)[-\/ ]?([\w\.]*)/i,                              // Solaris
            /(aix) ((\d)(?=\.|\)| )[\w\.])*/i,                                  // AIX
            /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, // BeOS/OS2/AmigaOS/MorphOS/OpenVMS/Fuchsia/HP-UX/SerenityOS
            /(unix) ?([\w\.]*)/i                                                // UNIX
            ], [NAME, VERSION]
        ]
    };

    /////////////////
    // Constructor
    ////////////////

    var UAParser = function (ua, extensions) {

        if (typeof ua === OBJ_TYPE) {
            extensions = ua;
            ua = undefined;
        }

        if (!(this instanceof UAParser)) {
            return new UAParser(ua, extensions).getResult();
        }

        var _navigator = (typeof window !== UNDEF_TYPE && window.navigator) ? window.navigator : undefined;
        var _ua = ua || ((_navigator && _navigator.userAgent) ? _navigator.userAgent : EMPTY);
        var _uach = (_navigator && _navigator.userAgentData) ? _navigator.userAgentData : undefined;
        var _rgxmap = extensions ? extend(regexes, extensions) : regexes;
        var _isSelfNav = _navigator && _navigator.userAgent == _ua;

        this.getBrowser = function () {
            var _browser = {};
            _browser[NAME] = undefined;
            _browser[VERSION] = undefined;
            rgxMapper.call(_browser, _ua, _rgxmap.browser);
            _browser[MAJOR] = majorize(_browser[VERSION]);
            // Brave-specific detection
            if (_isSelfNav && _navigator && _navigator.brave && typeof _navigator.brave.isBrave == FUNC_TYPE) {
                _browser[NAME] = 'Brave';
            }
            return _browser;
        };
        this.getCPU = function () {
            var _cpu = {};
            _cpu[ARCHITECTURE] = undefined;
            rgxMapper.call(_cpu, _ua, _rgxmap.cpu);
            return _cpu;
        };
        this.getDevice = function () {
            var _device = {};
            _device[VENDOR] = undefined;
            _device[MODEL] = undefined;
            _device[TYPE] = undefined;
            rgxMapper.call(_device, _ua, _rgxmap.device);
            if (_isSelfNav && !_device[TYPE] && _uach && _uach.mobile) {
                _device[TYPE] = MOBILE;
            }
            // iPadOS-specific detection: identified as Mac, but has some iOS-only properties
            if (_isSelfNav && _device[MODEL] == 'Macintosh' && _navigator && typeof _navigator.standalone !== UNDEF_TYPE && _navigator.maxTouchPoints && _navigator.maxTouchPoints > 2) {
                _device[MODEL] = 'iPad';
                _device[TYPE] = TABLET;
            }
            return _device;
        };
        this.getEngine = function () {
            var _engine = {};
            _engine[NAME] = undefined;
            _engine[VERSION] = undefined;
            rgxMapper.call(_engine, _ua, _rgxmap.engine);
            return _engine;
        };
        this.getOS = function () {
            var _os = {};
            _os[NAME] = undefined;
            _os[VERSION] = undefined;
            rgxMapper.call(_os, _ua, _rgxmap.os);
            if (_isSelfNav && !_os[NAME] && _uach && _uach.platform != 'Unknown') {
                _os[NAME] = _uach.platform  
                                    .replace(/chrome os/i, CHROMIUM_OS)
                                    .replace(/macos/i, MAC_OS);           // backward compatibility
            }
            return _os;
        };
        this.getResult = function () {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return _ua;
        };
        this.setUA = function (ua) {
            _ua = (typeof ua === STR_TYPE && ua.length > UA_MAX_LENGTH) ? trim(ua, UA_MAX_LENGTH) : ua;
            return this;
        };
        this.setUA(_ua);
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER =  enumerize([NAME, VERSION, MAJOR]);
    UAParser.CPU = enumerize([ARCHITECTURE]);
    UAParser.DEVICE = enumerize([MODEL, VENDOR, TYPE, CONSOLE, MOBILE, SMARTTV, TABLET, WEARABLE, EMBEDDED]);
    UAParser.ENGINE = UAParser.OS = enumerize([NAME, VERSION]);

    ///////////
    // Export
    //////////

    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if ("object" !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if ("function" === FUNC_TYPE && __webpack_require__.amdO) {
            !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
                return UAParser;
            }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
        } else if (typeof window !== UNDEF_TYPE) {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = typeof window !== UNDEF_TYPE && (window.jQuery || window.Zepto);
    if ($ && !$.ua) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (ua) {
            parser.setUA(ua);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);


/***/ }),

/***/ 782:
/***/ ((module) => {

"use strict";
module.exports = "data:application/javascript;base64,dmFyIHdvcmtlck1haW4gPSBmdW5jdGlvbiB3b3JrZXJNYWluKGV2KSB7CiAgLy8gRXN0YWJsaXNoIFdlYlNvY2tldCBjb25uZWN0aW9uIHRvIHRoZSBVUkwgcGFzc2VkIGJ5IHRoZSBjYWxsZXIuCiAgdmFyIHVybCA9IG5ldyBVUkwoZXYuZGF0YS51cmwpOwogIHZhciBieXRlTGltaXQgPSBldi5kYXRhLmJ5dGVzOwogIGNvbnNvbGUubG9nKCJDb25uZWN0aW5nIHRvICIgKyB1cmwpOwogIHZhciBzb2NrID0gbmV3IFdlYlNvY2tldCh1cmwsICduZXQubWVhc3VyZW1lbnRsYWIudGhyb3VnaHB1dC52MScpOwogIGNvbnNvbGUubG9nKCJDb25uZWN0aW9uIGVzdGFibGlzaGVkIik7CgogIC8vIERlZmluZSBub3coKSBhcyBlaXRoZXIgcGVyZm9ybWFuY2Uubm93KCkgb3IgRGF0ZS5ub3coKS4gVGhpcyBhbGxvd3MgdG8KICAvLyBzdXBwb3J0IGJyb3dzZXJzIHRoYXQgZG8gbm90IHN1cHBvcnQgcGVyZm9ybWFuY2Uubm93KCkgKGUuZy4gSUUxMSkuCiAgdmFyIG5vdzsKICBpZiAodHlwZW9mIHBlcmZvcm1hbmNlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgcGVyZm9ybWFuY2Uubm93ID09PSAnZnVuY3Rpb24nKSB7CiAgICAvLyBUaGUgfn4gb3BlcmF0b3IgaXMgYSBmYXN0ZXIgd2F5IG9mIGRvaW5nIE1hdGguZmxvb3IoKS4KICAgIG5vdyA9IGZ1bmN0aW9uIG5vdygpIHsKICAgICAgcmV0dXJuIH5+cGVyZm9ybWFuY2Uubm93KCk7CiAgICB9OwogIH0gZWxzZSB7CiAgICBub3cgPSBmdW5jdGlvbiBub3coKSB7CiAgICAgIHJldHVybiBEYXRlLm5vdygpOwogICAgfTsKICB9CiAgZG93bmxvYWRUZXN0KHNvY2ssIGJ5dGVMaW1pdCwgbm93KTsKfTsKdmFyIGRvd25sb2FkVGVzdCA9IGZ1bmN0aW9uIGRvd25sb2FkVGVzdChzb2NrLCBieXRlTGltaXQsIG5vdykgewogIHZhciBzdGFydDsKICB2YXIgcHJldmlvdXM7CiAgdmFyIGJ5dGVzUmVjZWl2ZWQ7CiAgdmFyIGJ5dGVzU2VudDsKICBzb2NrLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7CiAgICAvLyBDcmVhdGUgYW5kIHBvc3Qgb25lIGxhc3QgbWVhc3VyZW1lbnQgb2JqZWN0IHRvIHRoZSBtYWluIHRocmVhZC4KICAgIHZhciB0ID0gbm93KCk7CiAgICB2YXIgbWVhc3VyZW1lbnQgPSB7CiAgICAgIEFwcGxpY2F0aW9uOiB7CiAgICAgICAgQnl0ZXNSZWNlaXZlZDogYnl0ZXNSZWNlaXZlZCwKICAgICAgICBCeXRlc1NlbnQ6IGJ5dGVzU2VudAogICAgICB9LAogICAgICBFbGFwc2VkVGltZTogKHQgLSBzdGFydCkgKiAxMDAwCiAgICB9OwogICAgcG9zdE1lc3NhZ2UoewogICAgICB0eXBlOiAnbWVhc3VyZW1lbnQnLAogICAgICBjbGllbnQ6IG1lYXN1cmVtZW50CiAgICB9KTsKICAgIHBvc3RNZXNzYWdlKHsKICAgICAgdHlwZTogJ2Nsb3NlJwogICAgfSk7CiAgfTsKICBzb2NrLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXYpIHsKICAgIHBvc3RNZXNzYWdlKHsKICAgICAgdHlwZTogJ2Vycm9yJywKICAgICAgZXJyb3I6IGV2LnR5cGUKICAgIH0pOwogIH07CiAgc29jay5vbm9wZW4gPSBmdW5jdGlvbiAoKSB7CiAgICBzdGFydCA9IG5vdygpOwogICAgcHJldmlvdXMgPSBzdGFydDsKICAgIGJ5dGVzUmVjZWl2ZWQgPSAwOwogICAgYnl0ZXNTZW50ID0gMDsKICAgIHBvc3RNZXNzYWdlKHsKICAgICAgdHlwZTogJ2Nvbm5lY3QnLAogICAgICBzdGFydFRpbWU6IHN0YXJ0CiAgICB9KTsKICB9OwogIHNvY2sub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2KSB7CiAgICBieXRlc1JlY2VpdmVkICs9IHR5cGVvZiBldi5kYXRhLnNpemUgIT09ICd1bmRlZmluZWQnID8gZXYuZGF0YS5zaXplIDogZXYuZGF0YS5sZW5ndGg7CiAgICB2YXIgdCA9IG5vdygpOwogICAgdmFyIGV2ZXJ5ID0gMjAwOyAvLyBtcwoKICAgIGlmICh0IC0gcHJldmlvdXMgPiBldmVyeSkgewogICAgICAvLyBDcmVhdGUgYSBNZWFzdXJlbWVudCBvYmplY3QuCiAgICAgIHZhciBtZWFzdXJlbWVudCA9IHsKICAgICAgICBBcHBsaWNhdGlvbjogewogICAgICAgICAgQnl0ZXNSZWNlaXZlZDogYnl0ZXNSZWNlaXZlZCwKICAgICAgICAgIEJ5dGVzU2VudDogYnl0ZXNTZW50IC8vIFRPRE8KICAgICAgICB9LAogICAgICAgIEVsYXBzZWRUaW1lOiAodCAtIHN0YXJ0KSAqIDEwMDAKICAgICAgfTsKICAgICAgdmFyIG1lYXN1cmVtZW50U3RyID0gSlNPTi5zdHJpbmdpZnkobWVhc3VyZW1lbnQpOwogICAgICBzb2NrLnNlbmQobWVhc3VyZW1lbnRTdHIpOwogICAgICBieXRlc1NlbnQgKz0gbWVhc3VyZW1lbnRTdHIubGVuZ3RoOwogICAgICBwb3N0TWVzc2FnZSh7CiAgICAgICAgdHlwZTogJ21lYXN1cmVtZW50JywKICAgICAgICBjbGllbnQ6IG1lYXN1cmVtZW50CiAgICAgIH0pOwogICAgICBwcmV2aW91cyA9IHQ7CiAgICB9CgogICAgLy8gUGFzcyBhbG9uZyBldmVyeSBzZXJ2ZXItc2lkZSBtZWFzdXJlbWVudC4KICAgIGlmICh0eXBlb2YgZXYuZGF0YSA9PT0gJ3N0cmluZycpIHsKICAgICAgcG9zdE1lc3NhZ2UoewogICAgICAgIHR5cGU6ICdtZWFzdXJlbWVudCcsCiAgICAgICAgc2VydmVyOiBldi5kYXRhCiAgICAgIH0pOwogICAgfQogIH07Cn07CnNlbGYub25tZXNzYWdlID0gd29ya2VyTWFpbjs=";

/***/ }),

/***/ 727:
/***/ ((module) => {

"use strict";
module.exports = "data:application/javascript;base64,dmFyIE1BWF9NRVNTQUdFX1NJWkUgPSA4Mzg4NjA4OyAvKiA9ICgxPDwyMykgPSA4TUIgKi8KdmFyIE1FQVNVUkVNRU5UX0lOVEVSVkFMID0gMjUwOyAvLyBtcwp2YXIgU0NBTElOR19GUkFDVElPTiA9IDE2Owp2YXIgd29ya2VyTWFpbiA9IGZ1bmN0aW9uIHdvcmtlck1haW4oZXYpIHsKICAvLyBFc3RhYmxpc2ggV2ViU29ja2V0IGNvbm5lY3Rpb24gdG8gdGhlIFVSTCBwYXNzZWQgYnkgdGhlIGNhbGxlci4KICB2YXIgdXJsID0gbmV3IFVSTChldi5kYXRhLnVybCk7CiAgdmFyIGJ5dGVMaW1pdCA9IGV2LmRhdGEuYnl0ZXMgfHwgMDsKICBjb25zb2xlLmxvZygiQ29ubmVjdGluZyB0byAiICsgdXJsKTsKICB2YXIgc29jayA9IG5ldyBXZWJTb2NrZXQodXJsLCAnbmV0Lm1lYXN1cmVtZW50bGFiLnRocm91Z2hwdXQudjEnKTsKICBjb25zb2xlLmxvZygiQ29ubmVjdGlvbiBlc3RhYmxpc2hlZCIpOwoKICAvLyBEZWZpbmUgbm93KCkgYXMgZWl0aGVyIHBlcmZvcm1hbmNlLm5vdygpIG9yIERhdGUubm93KCkuIFRoaXMgYWxsb3dzIHRvCiAgLy8gc3VwcG9ydCBicm93c2VycyB0aGF0IGRvIG5vdCBzdXBwb3J0IHBlcmZvcm1hbmNlLm5vdygpIChlLmcuIElFMTEpLgogIHZhciBub3c7CiAgaWYgKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHBlcmZvcm1hbmNlLm5vdyA9PT0gJ2Z1bmN0aW9uJykgewogICAgLy8gVGhlIH5+IG9wZXJhdG9yIGlzIGEgZmFzdGVyIHdheSBvZiBkb2luZyBNYXRoLmZsb29yKCkuCiAgICBub3cgPSBmdW5jdGlvbiBub3coKSB7CiAgICAgIHJldHVybiB+fnBlcmZvcm1hbmNlLm5vdygpOwogICAgfTsKICB9IGVsc2UgewogICAgbm93ID0gZnVuY3Rpb24gbm93KCkgewogICAgICByZXR1cm4gRGF0ZS5ub3coKTsKICAgIH07CiAgfQogIHVwbG9hZFRlc3Qoc29jaywgYnl0ZUxpbWl0LCBub3cpOwp9Owp2YXIgdXBsb2FkVGVzdCA9IGZ1bmN0aW9uIHVwbG9hZFRlc3Qoc29jaywgYnl0ZUxpbWl0LCBub3cpIHsKICB2YXIgY2xvc2VkID0gZmFsc2U7CiAgdmFyIGJ5dGVzUmVjZWl2ZWQ7CiAgdmFyIGJ5dGVzU2VudDsKICBzb2NrLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7CiAgICBpZiAoIWNsb3NlZCkgewogICAgICBjbG9zZWQgPSB0cnVlOwogICAgICBwb3N0TWVzc2FnZSh7CiAgICAgICAgdHlwZTogJ2Nsb3NlJwogICAgICB9KTsKICAgIH0KICB9OwogIHNvY2sub25lcnJvciA9IGZ1bmN0aW9uIChldikgewogICAgcG9zdE1lc3NhZ2UoewogICAgICB0eXBlOiAnZXJyb3InLAogICAgICBlcnJvcjogZXYudHlwZQogICAgfSk7CiAgfTsKCiAgLy8gb25tZXNzYWdlIGNhbGxzIHRoZSBtZWFzdXJlbWVudCBjYWxsYmFjayBmb3IgZXZlcnkgY291bnRlcmZsb3cKICAvLyBtZXNzYWdlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlciBkdXJpbmcgdGhlIHVwbG9hZCBtZWFzdXJlbWVudC4KICBzb2NrLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldikgewogICAgaWYgKHR5cGVvZiBldi5kYXRhICE9PSAndW5kZWZpbmVkJykgewogICAgICBieXRlc1JlY2VpdmVkICs9IHR5cGVvZiBldi5kYXRhLnNpemUgIT09ICd1bmRlZmluZWQnID8gZXYuZGF0YS5zaXplIDogZXYuZGF0YS5sZW5ndGg7CiAgICAgIHBvc3RNZXNzYWdlKHsKICAgICAgICB0eXBlOiAnbWVhc3VyZW1lbnQnLAogICAgICAgIHNlcnZlcjogZXYuZGF0YQogICAgICB9KTsKICAgIH0KICB9OwogIHNvY2sub25vcGVuID0gZnVuY3Rpb24gKCkgewogICAgYnl0ZXNSZWNlaXZlZCA9IDA7CiAgICBieXRlc1NlbnQgPSAwOwogICAgdmFyIGluaXRpYWxNZXNzYWdlU2l6ZSA9IDgxOTI7IC8qICgxPDwxMykgPSA4a0J5dGVzICovCiAgICB2YXIgZGF0YSA9IG5ldyBVaW50OEFycmF5KGluaXRpYWxNZXNzYWdlU2l6ZSk7CiAgICB2YXIgc3RhcnQgPSBub3coKTsgLy8gbXMgc2luY2UgZXBvY2gKICAgIHZhciBkdXJhdGlvbiA9IDEwMDAwOyAvLyBtcwogICAgdmFyIGVuZCA9IHN0YXJ0ICsgZHVyYXRpb247IC8vIG1zIHNpbmNlIGVwb2NoCgogICAgcG9zdE1lc3NhZ2UoewogICAgICB0eXBlOiAnY29ubmVjdCcsCiAgICAgIHN0YXJ0VGltZTogc3RhcnQKICAgIH0pOwoKICAgIC8vIFN0YXJ0IHRoZSB1cGxvYWQgbG9vcC4KICAgIHVwbG9hZGVyKGRhdGEsIHN0YXJ0LCBlbmQsIHN0YXJ0LCAwKTsKICB9OwoKICAvKioKICAgKiB1cGxvYWRlciBpcyB0aGUgbWFpbiBsb29wIHRoYXQgdXBsb2FkcyBkYXRhIGluIHRoZSB3ZWIgYnJvd3Nlci4gSXQgbXVzdAogICAqIGNhcmVmdWxseSBiYWxhbmNlIGEgYnVuY2ggb2YgZmFjdG9yczoKICAgKiAgIDEpIG1lc3NhZ2Ugc2l6ZSBkZXRlcm1pbmVzIG1lYXN1cmVtZW50IGdyYW51bGFyaXR5IG9uIHRoZSBjbGllbnQgc2lkZSwKICAgKiAgIDIpIHRoZSBKUyBldmVudCBsb29wIGNhbiBvbmx5IGZpcmUgb2ZmIHNvIG1hbnkgdGltZXMgcGVyIHNlY29uZCwgYW5kCiAgICogICAzKSB3ZWJzb2NrZXQgYnVmZmVyIHRyYWNraW5nIHNlZW1zIGluY29uc2lzdGVudCBiZXR3ZWVuIGJyb3dzZXJzLgogICAqCiAgICogQmVjYXVzZSBvZiAoMSksIHdlIG5lZWQgdG8gaGF2ZSBzbWFsbCBtZXNzYWdlcyBvbiBzbG93IGNvbm5lY3Rpb25zLCBvcgogICAqIGVsc2UgdGhpcyB3aWxsIG5vdCBhY2N1cmF0ZWx5IG1lYXN1cmUgc2xvdyBjb25uZWN0aW9ucy4gQmVjYXVzZSBvZiAoMiksIGlmCiAgICogd2UgdXNlIHNtYWxsIG1lc3NhZ2VzIG9uIGZhc3QgY29ubmVjdGlvbnMsIHRoZW4gd2Ugd2lsbCBub3QgZmlsbCB0aGUgbGluay4KICAgKiBCZWNhdXNlIG9mICgzKSwgd2UgY2FuJ3QgZGVwZW5kIG9uIHRoZSB3ZWJzb2NrZXQgYnVmZmVyIHRvICJmaWxsIHVwIiBpbiBhCiAgICogcmVhc29uYWJsZSBhbW91bnQgb2YgdGltZS4KICAgKgogICAqIFNvIG9uIGZhc3QgY29ubmVjdGlvbnMgd2UgbmVlZCBhIGJpZyBtZXNzYWdlIHNpemUgKG9uY2UgdGhlIG1lc3NhZ2UgaGFzCiAgICogYmVlbiBoYW5kZWQgb2ZmIHRvIHRoZSBicm93c2VyLCBpdCBydW5zIG9uIHRoZSBicm93c2VyJ3MgZmFzdCBjb21waWxlZAogICAqIGludGVybmFscykgYW5kIG9uIHNsb3cgY29ubmVjdGlvbnMgd2UgbmVlZCBhIHNtYWxsIG1lc3NhZ2UuIEJlY2F1c2UgdGhpcwogICAqIGlzIHVzZWQgYXMgYSBzcGVlZCB0ZXN0LCB3ZSBkb24ndCBrbm93IGJlZm9yZSB0aGUgdGVzdCB3aGljaCBzdHJhdGVneSB3ZQogICAqIHdpbGwgYmUgdXNpbmcsIGJlY2F1c2Ugd2UgZG9uJ3Qga25vdyB0aGUgc3BlZWQgYmVmb3JlIHdlIHRlc3QgaXQuCiAgICogVGhlcmVmb3JlLCB3ZSB1c2UgYSBzdHJhdGVneSB3aGVyZSB3ZSBncm93IHRoZSBtZXNzYWdlIGV4cG9uZW50aWFsbHkgb3ZlcgogICAqIHRpbWUuIEluIGFuIGVmZm9ydCB0byBiZSBraW5kIHRvIHRoZSBtZW1vcnkgYWxsb2NhdG9yLCB3ZSBhbHdheXMgZG91YmxlCiAgICogdGhlIG1lc3NhZ2Ugc2l6ZSBpbnN0ZWFkIG9mIGdyb3dpbmcgaXQgYnkgZS5nLiAxLjN4LgogICAqCiAgICogQHBhcmFtIHtVaW50OEFycmF5fSBkYXRhCiAgICogQHBhcmFtIHsqfSBzdGFydAogICAqIEBwYXJhbSB7Kn0gZW5kCiAgICogQHBhcmFtIHsqfSBwcmV2aW91cwogICAqLwogIGZ1bmN0aW9uIHVwbG9hZGVyKGRhdGEsIHN0YXJ0LCBlbmQsIHByZXZpb3VzKSB7CiAgICBpZiAoY2xvc2VkKSB7CiAgICAgIC8vIHNvY2tldC5zZW5kKCkgd2l0aCB0b28gbXVjaCBidWZmZXJpbmcgY2F1c2VzIHNvY2tldC5jbG9zZSgpLiBXZSBvbmx5CiAgICAgIC8vIG9ic2VydmVkIHRoaXMgYmVoYXZpb3VyIHdpdGggcHJlLUNocm9taXVtIEVkZ2UuCiAgICAgIHJldHVybjsKICAgIH0KICAgIHZhciB0ID0gbm93KCk7CiAgICBpZiAodCA+PSBlbmQpIHsKICAgICAgc29jay5jbG9zZSgpOwogICAgICAvLyBzZW5kIG9uZSBsYXN0IG1lYXN1cmVtZW50LgogICAgICAvLyBUT0RPCiAgICAgIHJldHVybjsKICAgIH0KCiAgICAvLyBDaGVjayBpZiB3ZSBhcmUgb3ZlciB0aGUgbGltaXQgYW5kLCBpZiBzbywgc3RvcCB0aGUgdXBsb2FkZXIgbG9vcC4KICAgIC8vIFRoZSBzZXJ2ZXIgaXMgZ29pbmcgdG8gY2xvc2UgdGhlIGNvbm5lY3Rpb24gYWZ0ZXIgdGhlIGJ5dGUgbGltaXQgaGFzCiAgICAvLyBiZWVuIHJlYWNoZWQgb3IgdGhlIGR1cmF0aW9uIHRpbWVvdXQgaGFzIGV4cGlyZWQuIE1lYW53aGlsZSwgdGhlIGNsaWVudAogICAgLy8ga2VlcHMgcnVubmluZyBhbmQgaGFuZGxpbmcgV2ViU29ja2V0IGV2ZW50cy4KICAgIGlmIChieXRlTGltaXQgPiAwICYmIGJ5dGVzU2VudCA+PSBieXRlTGltaXQpIHsKICAgICAgcmV0dXJuOwogICAgfQoKICAgIC8vIFdlIGtlZXAgNyBtZXNzYWdlcyBpbiB0aGUgc2VuZCBidWZmZXIsIHNvIHRoZXJlIGlzIGFsd2F5cyBzb21lIG1vcmUKICAgIC8vIGRhdGEgdG8gc2VuZC4gVGhlIG1heGltdW0gYnVmZmVyIHNpemUgaXMgOCAqIDhNQiAtIDEgYnl0ZSB+PSA2NE0uCiAgICB2YXIgZGVzaXJlZEJ1ZmZlciA9IDcgKiBkYXRhLmxlbmd0aDsKICAgIGlmIChzb2NrLmJ1ZmZlcmVkQW1vdW50IDwgZGVzaXJlZEJ1ZmZlcikgewogICAgICBzb2NrLnNlbmQoZGF0YSk7CiAgICAgIGJ5dGVzU2VudCArPSBkYXRhLmxlbmd0aDsKICAgIH0KCiAgICAvLyBNZXNzYWdlIHNpemUgaXMgZG91YmxlZCBhZnRlciB0aGUgZmlyc3QgMTYgbWVzc2FnZXMsIGFuZCBzdWJzZXF1ZW50bHkKICAgIC8vIGV2ZXJ5IDgsIHVwIHRvIG1heE1lc3NhZ2VTaXplLgogICAgdmFyIG9yaWdTaXplID0gZGF0YS5sZW5ndGg7CiAgICBpZiAob3JpZ1NpemUgPj0gTUFYX01FU1NBR0VfU0laRSB8fCBvcmlnU2l6ZSA+IGJ5dGVzU2VudCAvIFNDQUxJTkdfRlJBQ1RJT04pIHsKICAgICAgc2l6ZSA9IHNjYWxlTWVzc2FnZShvcmlnU2l6ZSk7CiAgICB9IGVsc2UgewogICAgICBjb25zb2xlLmxvZygiSW5jcmVhc2luZyBtZXNzYWdlIHNpemUgdG8gIiArIG9yaWdTaXplICogMiArICIgYnl0ZXMiKTsKICAgICAgc2l6ZSA9IHNjYWxlTWVzc2FnZShvcmlnU2l6ZSAqIDIpOwogICAgfQogICAgaWYgKHNpemUgIT0gb3JpZ1NpemUpIHsKICAgICAgZGF0YSA9IG5ldyBVaW50OEFycmF5KHNpemUpOwogICAgfQogICAgaWYgKHQgPj0gcHJldmlvdXMgKyBNRUFTVVJFTUVOVF9JTlRFUlZBTCkgewogICAgICAvLyBDcmVhdGUgYSBNZWFzdXJlbWVudCBvYmplY3QuCiAgICAgIHZhciBtZWFzdXJlbWVudCA9IHsKICAgICAgICBBcHBsaWNhdGlvbjogewogICAgICAgICAgQnl0ZXNSZWNlaXZlZDogYnl0ZXNSZWNlaXZlZCwKICAgICAgICAgIEJ5dGVzU2VudDogYnl0ZXNTZW50CiAgICAgICAgfSwKICAgICAgICBFbGFwc2VkVGltZTogKHQgLSBzdGFydCkgKiAxMDAwCiAgICAgIH07CiAgICAgIHZhciBtZWFzdXJlbWVudFN0ciA9IEpTT04uc3RyaW5naWZ5KG1lYXN1cmVtZW50KTsKICAgICAgc29jay5zZW5kKG1lYXN1cmVtZW50U3RyKTsKICAgICAgYnl0ZXNTZW50ICs9IG1lYXN1cmVtZW50U3RyLmxlbmd0aDsKICAgICAgcG9zdE1lc3NhZ2UoewogICAgICAgIHR5cGU6ICdtZWFzdXJlbWVudCcsCiAgICAgICAgY2xpZW50OiBtZWFzdXJlbWVudAogICAgICB9KTsKICAgICAgcHJldmlvdXMgPSB0OwogICAgfQoKICAgIC8vIExvb3AgdGhlIHVwbG9hZGVyIGZ1bmN0aW9uIGluIGEgd2F5IHRoYXQgcmVzcGVjdHMgdGhlIEpTIGV2ZW50IGhhbmRsZXIuCiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsKICAgICAgcmV0dXJuIHVwbG9hZGVyKGRhdGEsIHN0YXJ0LCBlbmQsIHByZXZpb3VzKTsKICAgIH0sIDApOwogIH0KICBmdW5jdGlvbiBzY2FsZU1lc3NhZ2UobXNnU2l6ZSkgewogICAgLy8gQ2hlY2sgaWYgdGhlIG5leHQgcGF5bG9hZCBzaXplIHdpbGwgcHVzaCB0aGUgdG90YWwgbnVtYmVyIG9mIGJ5dGVzIG92ZXIgdGhlIGxpbWl0LgogICAgdmFyIGV4Y2VzcyA9IGJ5dGVzU2VudCArIG1zZ1NpemUgLSBieXRlTGltaXQ7CiAgICBpZiAoYnl0ZUxpbWl0ID4gMCAmJiBleGNlc3MgPiAwKSB7CiAgICAgIG1zZ1NpemUgLT0gZXhjZXNzOwogICAgfQogICAgcmV0dXJuIG1zZ1NpemU7CiAgfQp9OwpzZWxmLm9ubWVzc2FnZSA9IHdvcmtlck1haW47";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/amd options */
/******/ 	(() => {
/******/ 		__webpack_require__.amdO = {};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = document.baseURI || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			238: 0,
/******/ 			200: 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Client: () => (/* binding */ Client)
});

;// CONCATENATED MODULE: ./src/consts.js
var LIBRARY_NAME = 'msak-js',
  LIBRARY_VERSION = '0.3.1';
var DEFAULT_PROTOCOL = 'wss';
var DEFAULT_STREAMS = 2;
var DEFAULT_CC = 'bbr';
var DEFAULT_DURATION = 5000;
var SUPPORTED_CC_ALGORITHMS = ['bbr', 'cubic'];
var LOCATE_BASE_URL = 'https://locate.measurementlab.net/v2/nearest/';
var LOCATE_RESOURCE_PATH = 'msak/throughput1';
var DOWNLOAD_PATH = '/throughput/v1/download';
var UPLOAD_PATH = '/throughput/v1/upload';
;// CONCATENATED MODULE: ./src/locate.js
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }


/**
 * discoverServerURLs contacts a web service (likely the Measurement Lab
 * locate service, but not necessarily) and gets URLs with access tokens in
 * them for the client.
 *
 * @param {string} clientName - The name of the client.
 * @param {string} clientVersion - The client version.
 * @param {string} [lbBaseURL] - The base URL of the load balancer. (optional)
 *
 * It uses the callback functions `error`, `serverDiscovery`, and
 * `serverChosen`.
 *
 * @name discoverServerURLs
 * @public
 */
function discoverServerURLs(_x, _x2, _x3) {
  return _discoverServerURLs.apply(this, arguments);
}
function _discoverServerURLs() {
  _discoverServerURLs = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(clientName, clientVersion, lbBaseURL) {
    var lbURL, params, response, js;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!lbBaseURL) {
            lbBaseURL = LOCATE_BASE_URL;
          }
          lbURL = new URL(lbBaseURL + LOCATE_RESOURCE_PATH); // Pass client/library name and versions to the load balancer in the
          // querystring.
          params = new URLSearchParams();
          params.set('client_name', clientName);
          params.set('client_version', clientVersion);
          params.set("client_library_name", LIBRARY_NAME);
          params.set('client_library_version', LIBRARY_VERSION);
          params.set('mid', 't3st');
          lbURL.search = params.toString();
          _context.next = 10;
          return fetch(lbURL)["catch"](function (err) {
            throw new Error(err);
          });
        case 10:
          response = _context.sent;
          _context.next = 13;
          return response.json();
        case 13:
          js = _context.sent;
          if ("results" in js) {
            _context.next = 17;
            break;
          }
          console.log("Could not understand response from ".concat(lbURL, ": ").concat(js));
          return _context.abrupt("return", {});
        case 17:
          // TODO: do not discard unused results. If the first server is unavailable
          // the client should quickly try the next server.
          //
          // Choose the first result sent by the load balancer. This ensures that
          // in cases where we have a single pod in a metro, that pod is used to
          // run the measurement. When there are multiple pods in the same metro,
          // they are randomized by the load balancer already.

          console.log(js.results);
          return _context.abrupt("return", js.results);
        case 19:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _discoverServerURLs.apply(this, arguments);
}
;// CONCATENATED MODULE: ./src/callbacks.js
// cb creates a default-empty callback function, allowing library users to
// only need to specify callback functions for the events they care about.
var cb = function cb(name, callbacks, defaultFn) {
  if (typeof callbacks !== 'undefined' && name in callbacks) {
    return callbacks[name];
  } else if (typeof defaultFn !== 'undefined') {
    return defaultFn;
  } else {
    // If no default function is provided, use the empty function.
    return function () {};
  }
};

// The default response to an error is to throw an exception.
var defaultErrCallback = function defaultErrCallback(err) {
  throw new Error(err);
};
// EXTERNAL MODULE: ./node_modules/ua-parser-js/src/ua-parser.js
var ua_parser = __webpack_require__(232);
;// CONCATENATED MODULE: ./src/msak.js
function msak_typeof(o) { "@babel/helpers - typeof"; return msak_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, msak_typeof(o); }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function msak_regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ msak_regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == msak_typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw new Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(msak_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw new Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function msak_asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function msak_asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { msak_asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { msak_asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == msak_typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != msak_typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != msak_typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classPrivateMethodInitSpec(obj, privateSet) { _checkPrivateRedeclaration(obj, privateSet); privateSet.add(obj); }
function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateMethodGet(receiver, privateSet, fn) { if (!privateSet.has(receiver)) { throw new TypeError("attempted to get private field on non-instance"); } return fn; }
function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }
function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }
function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }
function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }
function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }





/**
 * Client is a client for the MSAK test protocol.
 */
var _debugEnabled = /*#__PURE__*/new WeakMap();
var _cc = /*#__PURE__*/new WeakMap();
var _protocol = /*#__PURE__*/new WeakMap();
var _streams = /*#__PURE__*/new WeakMap();
var _duration = /*#__PURE__*/new WeakMap();
var _byteLimit = /*#__PURE__*/new WeakMap();
var _server = /*#__PURE__*/new WeakMap();
var _startTime = /*#__PURE__*/new WeakMap();
var _locateCache = /*#__PURE__*/new WeakMap();
var _bytesReceivedPerStream = /*#__PURE__*/new WeakMap();
var _bytesSentPerStream = /*#__PURE__*/new WeakMap();
var _lastTCPInfoPerStream = /*#__PURE__*/new WeakMap();
var _debug = /*#__PURE__*/new WeakSet();
var _setSearchParams = /*#__PURE__*/new WeakSet();
var _makeURLPairForServer = /*#__PURE__*/new WeakSet();
var _handleWorkerEvent = /*#__PURE__*/new WeakSet();
var _nextServerFromLocate = /*#__PURE__*/new WeakSet();
var Client = /*#__PURE__*/function () {
  /**
   *
   * Client is a client for the MSAK test protocol. Client name and version
   * are mandatory and passed to the server as metadata.
   *
   * @param {string} clientName - A unique name for this client.
   * @param {string} clientVersion - The client's version.
   * @param {Object} [userCallbacks] - An object containing user-defined callbacks.
   */
  function Client(clientName, clientVersion, userCallbacks) {
    _classCallCheck(this, Client);
    /**
     * Retrieves the next download/upload server from the Locate service. On
     * the first invocation, it requests new nearby servers  from the Locate
     * service. On subsequent invocations, it returns the next cached result.
     *
     * All the returned download/upload URLs include protocol options and
     * metadata in the querystring.
     *
     * @returns {Object} An object containing download/upload URLs and
     * location/machine metadata.
     */
    _classPrivateMethodInitSpec(this, _nextServerFromLocate);
    _classPrivateMethodInitSpec(this, _handleWorkerEvent);
    _classPrivateMethodInitSpec(this, _makeURLPairForServer);
    /**
     * Sets standard client metadata, protocol options and custom metadata on
     * the provided URLSearchParams. If a URLSearchParams is not provided, a new
     * one is created.
     *
     * @param {URLSearchParams} [sp] - Starting URLSearchParams to modify (optional)
     * @returns {URLSearchParams} The complete URLSearchParams
     */
    _classPrivateMethodInitSpec(this, _setSearchParams);
    //
    // Private methods
    //
    /**
     *
     * @param {Object} obj - The object to print to the console.
     */
    _classPrivateMethodInitSpec(this, _debug);
    _classPrivateFieldInitSpec(this, _debugEnabled, {
      writable: true,
      value: false
    });
    _classPrivateFieldInitSpec(this, _cc, {
      writable: true,
      value: DEFAULT_CC
    });
    _classPrivateFieldInitSpec(this, _protocol, {
      writable: true,
      value: DEFAULT_PROTOCOL
    });
    _classPrivateFieldInitSpec(this, _streams, {
      writable: true,
      value: DEFAULT_STREAMS
    });
    _classPrivateFieldInitSpec(this, _duration, {
      writable: true,
      value: DEFAULT_DURATION
    });
    _classPrivateFieldInitSpec(this, _byteLimit, {
      writable: true,
      value: 0
    });
    _classPrivateFieldInitSpec(this, _server, {
      writable: true,
      value: ""
    });
    _classPrivateFieldInitSpec(this, _startTime, {
      writable: true,
      value: undefined
    });
    _classPrivateFieldInitSpec(this, _locateCache, {
      writable: true,
      value: []
    });
    /**
     * Application-level bytes received for each stream.
     * Streams are identifed by the array index.
     * @type {number[]}
     */
    _classPrivateFieldInitSpec(this, _bytesReceivedPerStream, {
      writable: true,
      value: []
    });
    /**
     * Application-level bytes sent for each stream.
     * Streams are identifed by the array index.
     * @type {number[]}
     */
    _classPrivateFieldInitSpec(this, _bytesSentPerStream, {
      writable: true,
      value: []
    });
    /**
     * Last TCPInfo object received for each stream.
     * Streams are identifed by the array index.
     * @type {Object[]}
     */
    _classPrivateFieldInitSpec(this, _lastTCPInfoPerStream, {
      writable: true,
      value: []
    });
    if (!clientName || !clientVersion) throw new Error("client name and version are required");
    this.downloadWorkerFile = undefined;
    this.uploadWorkerFile = undefined;
    this.clientName = clientName;
    this.clientVersion = clientVersion;
    this.callbacks = userCallbacks;
    this.metadata = {};
  }

  //
  // Setters
  //

  /**
   * @param {boolean} value - Whether to print debug messages to the console.
   */
  _createClass(Client, [{
    key: "debug",
    set: function set(value) {
      _classPrivateFieldSet(this, _debugEnabled, value);
    }

    /**
     * @param {number} value - The number of streams to use.
     * Must be between 1 and 4.
     */
  }, {
    key: "streams",
    set: function set(value) {
      if (value <= 0 || value > 4) {
        throw new Error("number of streams must be between 1 and 4");
      }
      _classPrivateFieldSet(this, _streams, value);
    }

    /**
     * @param {string} value - The congestion control algorithm to use.
     * Must be one of the supported CC algorithms.
     */
  }, {
    key: "cc",
    set: function set(value) {
      if (!SUPPORTED_CC_ALGORITHMS.includes(value)) {
        throw new Error("supported algorithm are " + SUPPORTED_CC_ALGORITHMS);
      }
      _classPrivateFieldSet(this, _cc, value);
    }

    /**
     * @param {string} value - The protocol to use. Must be 'ws' or 'wss'.
     */
  }, {
    key: "protocol",
    set: function set(value) {
      if (value !== 'ws' && value !== 'wss') {
        throw new Error("protocol must be 'ws' or 'wss'");
      }
      _classPrivateFieldSet(this, _protocol, value);
    }

    /**
    * @param {number} value - The duration of the test in milliseconds.
    */
  }, {
    key: "duration",
    set: function set(value) {
      if (value <= 0 || value > 20000) {
        throw new Error("duration must be between 1 and 20000");
      }
      _classPrivateFieldSet(this, _duration, value);
    }

    /**
     * @param {number} value - The maximum number of bytes to send/receive.
     */
  }, {
    key: "bytes",
    set: function set(value) {
      if (value < 0) {
        throw new Error("bytes must be greater than 0");
      }
      _classPrivateFieldSet(this, _byteLimit, value);
    }
  }, {
    key: "start",
    value: // Public methods
    /**
     *
     * @param {string} [serverStr] - The server to connect to.  If not specified,
     * will query the Locate service to get a nearby server.
     */
    function () {
      var _start = msak_asyncToGenerator( /*#__PURE__*/msak_regeneratorRuntime().mark(function _callee(serverStr) {
        var server;
        return msak_regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              if (serverStr) { // I changed this from !serverStr to serverStr to it would skip location - JC 10/5/24
                _context.next = 4;
                break;
              }
              server = _classPrivateMethodGet(this, _makeURLPairForServer, _makeURLPairForServer2).call(this, serverStr);
              _context.next = 7;
              break;
            case 4:
              _context.next = 6;
              return _classPrivateMethodGet(this, _nextServerFromLocate, _nextServerFromLocate2).call(this);
            case 6:
              server = _context.sent;
            case 7:
              _context.next = 9;
              return this.download(server);
            case 9:
              _context.next = 11;
              return this.upload(server);
            case 11:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function start(_x) {
        return _start.apply(this, arguments);
      }
      return start;
    }()
    /**
     * @param {Object} server
     */
  }, {
    key: "download",
    value: (function () {
      var _download = msak_asyncToGenerator( /*#__PURE__*/msak_regeneratorRuntime().mark(function _callee2(server) {
        var workerFile, workerPromises, i;
        return msak_regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              workerFile = this.downloadWorkerFile || new URL(/* asset import */ __webpack_require__(782), __webpack_require__.b);
              _classPrivateMethodGet(this, _debug, _debug2).call(this, 'Starting ' + _classPrivateFieldGet(this, _streams) + ' download streams with URL ' + server.download);

              // Set callbacks.
              this.callbacks = _objectSpread(_objectSpread({}, this.callbacks), {}, {
                onStart: cb('onDownloadStart', this.callbacks),
                onResult: cb('onDownloadResult', this.callbacks),
                onMeasurement: cb('onDownloadMeasurement', this.callbacks),
                onError: cb('onError', this.callbacks, defaultErrCallback)
              });

              // Reset byte counters and start time.
              _classPrivateFieldSet(this, _bytesReceivedPerStream, []);
              _classPrivateFieldSet(this, _bytesSentPerStream, []);
              _classPrivateFieldSet(this, _lastTCPInfoPerStream, []);
              _classPrivateFieldSet(this, _startTime, undefined);
              workerPromises = [];
              for (i = 0; i < _classPrivateFieldGet(this, _streams); i++) {
                workerPromises.push(this.runWorker('download', workerFile, server, i));
              }
              _context2.next = 11;
              return Promise.all(workerPromises);
            case 11:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function download(_x2) {
        return _download.apply(this, arguments);
      }
      return download;
    }())
  }, {
    key: "upload",
    value: function () {
      var _upload = msak_asyncToGenerator( /*#__PURE__*/msak_regeneratorRuntime().mark(function _callee3(server) {
        var workerFile, workerPromises, i;
        return msak_regeneratorRuntime().wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              workerFile = this.uploadWorkerFile || new URL(/* asset import */ __webpack_require__(727), __webpack_require__.b);
              _classPrivateMethodGet(this, _debug, _debug2).call(this, 'Starting ' + _classPrivateFieldGet(this, _streams) + ' upload streams with URL ' + server.upload);

              // Set callbacks.
              this.callbacks = _objectSpread(_objectSpread({}, this.callbacks), {}, {
                onStart: cb('onUploadStart', this.callbacks),
                onResult: cb('onUploadResult', this.callbacks),
                onMeasurement: cb('onUploadMeasurement', this.callbacks),
                onError: cb('onError', this.callbacks, defaultErrCallback)
              });

              // Reset byte counters and start time.
              _classPrivateFieldSet(this, _bytesReceivedPerStream, []);
              _classPrivateFieldSet(this, _bytesSentPerStream, []);
              _classPrivateFieldSet(this, _lastTCPInfoPerStream, []);
              _classPrivateFieldSet(this, _startTime, undefined);
              workerPromises = [];
              for (i = 0; i < _classPrivateFieldGet(this, _streams); i++) {
                workerPromises.push(this.runWorker('upload', workerFile, server, i));
              }
              _context3.next = 11;
              return Promise.all(workerPromises);
            case 11:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function upload(_x3) {
        return _upload.apply(this, arguments);
      }
      return upload;
    }()
  }, {
    key: "runWorker",
    value: function runWorker(testType, workerfile, server, streamID) {
      var _this = this;
      var worker = new Worker(workerfile);

      // Create a Promise that will be resolved when the worker terminates
      // successfully and rejected when the worker terminates with an error.
      var workerPromise = new Promise(function (resolve, reject) {
        worker.resolve = function (returnCode) {
          worker.terminate();
          resolve(returnCode);
        };
        worker.reject = function (error) {
          worker.terminate();
          reject(error);
        };
      });

      // If the server did not close the connection already by then, terminate
      // the worker and resolve the promise after the expected duration + 1s.
      setTimeout(function () {
        return worker.resolve(0);
      }, _classPrivateFieldGet(this, _duration) + 1000);
      worker.onmessage = function (ev) {
        _classPrivateMethodGet(_this, _handleWorkerEvent, _handleWorkerEvent2).call(_this, ev, testType, streamID, worker);
      };
      this.callbacks.onStart(server);
      worker.postMessage({
        url: server[testType].toString(),
        bytes: _classPrivateFieldGet(this, _byteLimit)
      });
      return workerPromise;
    }
  }]);
  return Client;
}();
function _debug2(obj) {
  if (_classPrivateFieldGet(this, _debugEnabled)) console.log(obj);
}
function _setSearchParams2(sp) {
  if (!sp) {
    sp = new URLSearchParams();
  }
  // Set standard client_ metadata.
  sp.set("client_name", this.clientName);
  sp.set("client_version", this.clientVersion);
  sp.set("client_library_name", LIBRARY_NAME);
  sp.set("client_library_version", LIBRARY_VERSION);
  sp.set('mid', 't3st');

  // Extract metadata from the UA.
  var parser = new ua_parser.UAParser(navigator.userAgent);
  if (parser.getBrowser().name) sp.set("client_browser", parser.getBrowser().name.toLowerCase());
  if (parser.getOS().name) sp.set("client_os", parser.getOS().name.toLowerCase());
  if (parser.getDevice().type) sp.set("client_device", parser.getDevice().type.toLowerCase());
  if (parser.getCPU().architecture) sp.set("client_arch", parser.getCPU().architecture.toLowerCase());

  // Set protocol options.
  sp.set("streams", _classPrivateFieldGet(this, _streams).toString());
  sp.set("cc", _classPrivateFieldGet(this, _cc));
  sp.set('duration', _classPrivateFieldGet(this, _duration).toString());
  sp.set("bytes", _classPrivateFieldGet(this, _byteLimit).toString());

  // Set additional custom metadata.
  if (this.metadata) {
    for (var _i = 0, _Object$entries = Object.entries(this.metadata); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];
      sp.set(key, value);
    }
  }
  return sp;
}
function _makeURLPairForServer2(server) {
  var downloadURL = new URL(_classPrivateFieldGet(this, _protocol) + "://" + "msakserver.calspeed.org" + DOWNLOAD_PATH);
  var uploadURL = new URL(_classPrivateFieldGet(this, _protocol) + "://" + "msakserver.calspeed.org" + UPLOAD_PATH);
  var sp = _classPrivateMethodGet(this, _setSearchParams, _setSearchParams2).call(this);
  downloadURL.search = sp.toString();
  uploadURL.search = sp.toString();

  // Set protocol.
  downloadURL.protocol = _classPrivateFieldGet(this, _protocol);
  uploadURL.protocol = _classPrivateFieldGet(this, _protocol);
  return {
    download: downloadURL.toString(),
    upload: uploadURL.toString()
  };
}
function _handleWorkerEvent2(ev, testType, id, worker) {
  var message = ev.data;
  if (message.type == 'connect') {
    if (!_classPrivateFieldGet(this, _startTime)) {
      _classPrivateFieldSet(this, _startTime, performance.now());
      _classPrivateMethodGet(this, _debug, _debug2).call(this, 'setting global start time to ' + performance.now());
    }
  }
  if (message.type == 'error') {
    _classPrivateMethodGet(this, _debug, _debug2).call(this, 'error: ' + message.error);
    this.callbacks.onError(message.error);
    worker.reject(message.error);
  }
  if (message.type == 'close') {
    _classPrivateMethodGet(this, _debug, _debug2).call(this, 'stream #' + id + ' closed');
    worker.resolve(0);
  }
  if (message.type == 'measurement') {
    var measurement;
    var source = "";
    var parsedMeasurement;

    // If this is a server-side measurement, read data from TCPInfo
    // regardless of the test direction.
    if (message.server) {
      // Keep the parsed measurement aside to avoid calling JSON.parse
      // twice in case this is an upload.
      parsedMeasurement = JSON.parse(message.server);
      if (parsedMeasurement.TCPInfo) {
        _classPrivateFieldGet(this, _lastTCPInfoPerStream)[id] = parsedMeasurement.TCPInfo;
      }
    }
    switch (testType) {
      case 'download':
        if (message.client) {
          source = 'client';
          measurement = message.client;
        }
        break;
      case 'upload':
        if (message.server) {
          source = 'server';
          measurement = parsedMeasurement;
        }
        break;
      default:
        throw new Error('unknown test type: ' + testType);
    }
    if (measurement) {
      _classPrivateFieldGet(this, _bytesReceivedPerStream)[id] = measurement.Application.BytesReceived || 0;
      _classPrivateFieldGet(this, _bytesSentPerStream)[id] = measurement.Application.BytesSent || 0;
      var elapsed = (performance.now() - _classPrivateFieldGet(this, _startTime)) / 1000;
      var goodput = _classPrivateFieldGet(this, _bytesReceivedPerStream)[id] / measurement.ElapsedTime * 8;
      var aggregateGoodput = _classPrivateFieldGet(this, _bytesReceivedPerStream).reduce(function (a, b) {
        return a + b;
      }, 0) / elapsed / 1e6 * 8;

      // Compute the average retransmission of all streams.
      var avgRetrans = 0;
      if (_classPrivateFieldGet(this, _lastTCPInfoPerStream).length > 0) {
        avgRetrans = _classPrivateFieldGet(this, _lastTCPInfoPerStream).reduce(function (a, b) {
          return a + b.BytesRetrans;
        }, 0) / _classPrivateFieldGet(this, _lastTCPInfoPerStream).reduce(function (a, b) {
          return a + b.BytesSent;
        }, 0);
      }
      _classPrivateMethodGet(this, _debug, _debug2).call(this, 'stream #' + id + ' elapsed ' + (measurement.ElapsedTime / 1e6).toFixed(2) + 's' + ' application r/w: ' + _classPrivateFieldGet(this, _bytesReceivedPerStream)[id] + '/' + _classPrivateFieldGet(this, _bytesSentPerStream)[id] + ' bytes' + ' stream goodput: ' + goodput.toFixed(2) + ' Mb/s' + ' aggr goodput: ' + aggregateGoodput.toFixed(2) + ' Mb/s' + ' stream minRTT: ' + (_classPrivateFieldGet(this, _lastTCPInfoPerStream)[id] !== undefined ? _classPrivateFieldGet(this, _lastTCPInfoPerStream)[id].MinRTT : "n/a") + ' retrans: ' + (_classPrivateFieldGet(this, _lastTCPInfoPerStream)[id] !== undefined ? _classPrivateFieldGet(this, _lastTCPInfoPerStream)[id].BytesRetrans / _classPrivateFieldGet(this, _lastTCPInfoPerStream)[id].BytesSent : "n/a") + ' avg retrans: ' + avgRetrans);
      this.callbacks.onMeasurement({
        elapsed: elapsed,
        stream: id,
        goodput: goodput,
        measurement: measurement,
        source: source
      });
      this.callbacks.onResult({
        elapsed: elapsed,
        goodput: aggregateGoodput,
        retransmission: avgRetrans,
        minRTT: Math.min.apply(Math, _toConsumableArray(_classPrivateFieldGet(this, _lastTCPInfoPerStream).map(function (x) {
          return x.MinRTT;
        }))),
        RTTVar: Math.min.apply(Math, _toConsumableArray(_classPrivateFieldGet(this, _lastTCPInfoPerStream).map(function (x) {
          return x.RTTVar;
        })))
      });
    }
  }
}
function _nextServerFromLocate2() {
  return _nextServerFromLocate3.apply(this, arguments);
}
function _nextServerFromLocate3() {
  _nextServerFromLocate3 = msak_asyncToGenerator( /*#__PURE__*/msak_regeneratorRuntime().mark(function _callee4() {
    var _this2 = this;
    var getFromCache, results;
    return msak_regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          /**
           * Gets the next result from the locate cache and adds metadata to the
           * download/upload URLs.
           * @returns {Object} An object containing download/upload URLs and
           * location/machine metadata.
           */
          getFromCache = function getFromCache() {
            var res = _classPrivateFieldGet(_this2, _locateCache).shift();
            //var downloadURL = new URL(res.urls[_classPrivateFieldGet(_this2, _protocol) + '://' + DOWNLOAD_PATH]);
            //var uploadURL = new URL(res.urls[_classPrivateFieldGet(_this2, _protocol) + '://' + UPLOAD_PATH]);
            var downloadURL = new URL('wss://msakserver.calspeed.org' + DOWNLOAD_PATH);
            var uploadURL = new URL('wss://msakserver.calspeed.org' + UPLOAD_PATH);
            downloadURL.search = _classPrivateMethodGet(_this2, _setSearchParams, _setSearchParams2).call(_this2, downloadURL.searchParams);
            uploadURL.search = _classPrivateMethodGet(_this2, _setSearchParams, _setSearchParams2).call(_this2, uploadURL.searchParams);
            return {
              location: res.location,
              machine: res.machine,
              download: downloadURL,
              upload: uploadURL
            };
          }; // If this is the first call or the cache is empty, query the Locate service.
          if (!(_classPrivateFieldGet(this, _locateCache).length == 0)) {
            _context4.next = 9;
            break;
          }
          _context4.next = 4;
          return discoverServerURLs(this.clientName, this.clientVersion);
        case 4:
          results = _context4.sent;
          _classPrivateFieldSet(this, _locateCache, results);
          return _context4.abrupt("return", getFromCache());
        case 9:
          return _context4.abrupt("return", getFromCache());
        case 10:
        case "end":
          return _context4.stop();
      }
    }, _callee4, this);
  }));
  return _nextServerFromLocate3.apply(this, arguments);
}
})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=msak.js.map