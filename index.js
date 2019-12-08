const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs')
const path = require('path')
const querystring = require('querystring');
const app = express();

const port = 4000
let rootPaths = []
const rootFolderName = "sites"
const staticFolderName = "static"
const requestFileName = "answer.json"
const configFileName = "config.json"
const queryDirReplacer = "queryDir"
const { rootPath, staticPath } = createFoldersIfNeed()
const defaultHeaders = { 'Content-Type': 'application/json' }
const defaultStatusCode = 200
const querySymbol = "?" // use "+" on linux, here and in folders name

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: false
}));

app.use('/', express.static(staticPath));

app.route('/').all(function (req, res) {
    res.end('Hi, i am Responder!');
});

scanDirAndUpdatePathArray(rootPath, rootPaths)
let routesArray = filterAndMakeRouteObject(rootPaths)
let filteredDublicates = filterDublicatesInRouteObjects(routesArray)
makeRoutes(filteredDublicates)

console.log("filteredDublicates", filteredDublicates)


app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err,
    });
});

var server = app.listen(port, function () {
    console.log('Server running on port! ' + port);
});


function scanDirAndUpdatePathArray(pathForScan, rootPaths) {
    let dirArray = fs.readdirSync(pathForScan)
    dirArray.forEach((item) => {
        let tmpPath = path.join(pathForScan, item)
        if (fs.statSync(tmpPath).isDirectory()) {
            rootPaths.push(tmpPath)
            scanDirAndUpdatePathArray(tmpPath, rootPaths)
        } else if (item == requestFileName) {
            rootPaths.push(tmpPath)
        }
    })
}

function filterAndMakeRouteObject(rootPaths) {

    let arrayOfObjects = []

    function getModifiedPath(fullPath, fileName) {
        return path.sep + path.join(...path.dirname(fullPath).split(path.sep).map((innerDirName) => {
            if (innerDirName.indexOf(querySymbol) !== -1) {
                return queryDirReplacer
            }
            return innerDirName
        }), fileName)
    }

    function getRoute(pathComponents) {
        let route = path.join(...pathComponents.slice(1, -1)).split(querySymbol)[0]
        if (route[route.length - 1] === path.sep) {
            route = route.slice(0, -1)
        }
        return route
    }

    rootPaths.forEach(item => {
        if (path.basename(item) == requestFileName) {
            let shortPath = path.relative(rootPath, item)
            let pathComponents = shortPath.split(path.sep)
            let resultObject = {
                method: pathComponents[0],
                configPath: getModifiedPath(item, configFileName),
                responcePath: getModifiedPath(item, requestFileName),
                route: getRoute(pathComponents),
                withQuery: (item.indexOf(querySymbol) !== -1)
            }
            arrayOfObjects.push(resultObject)
        }
    })
    return arrayOfObjects
}

function sendJsonByPathOrRedirect(routeObject) {
    return function (req, res) {

        let subPath = ""
        if (Object.keys(req.query).length > 0) {
            subPath = querySymbol + querystring.stringify(req.query)
        }

        let config = getConfig(routeObject.configPath.replace(queryDirReplacer, subPath))

        if (req.headers["redirect"]) {
            res.writeHead(302, {
                'Location': req.headers["redirect"]
            });
            res.end();
            return
        }

        for (let key in config.headers) {
            res.setHeader(key, config.headers[key])
        }

        res.statusCode = config.statusCode

        var readable = fs.createReadStream(routeObject.responcePath.replace(queryDirReplacer, subPath));
        readable.pipe(res);
    }
}

function makeRoutes(routesArray) {
    routesArray.forEach(routeObject => {
        switch (routeObject.method) {
            case 'get':
                app.route('/' + routeObject.route)
                    .get(sendJsonByPathOrRedirect(routeObject));
            case 'post':
                app.route('/' + routeObject.route)
                    .post(sendJsonByPathOrRedirect(routeObject));
            case 'delete':
                app.route('/' + routeObject.route)
                    .delete(sendJsonByPathOrRedirect(routeObject));
            case 'patch':
                app.route('/' + routeObject.route)
                    .patch(sendJsonByPathOrRedirect(routeObject));
            case 'put':
                app.route('/' + routeObject.route)
                    .put(sendJsonByPathOrRedirect(routeObject));
            default: break
        }
    })
}

function filterDublicatesInRouteObjects(routesArray) {
    let filteredArray = []

    let filteredWithQuery = routesArray.filter(item => item.withQuery == true)
    filteredWithQuery.forEach((elem) => {
        if (!filteredArray.some(item => item.route == elem.route)) {
            filteredArray.push(elem)
        }
    })

    let filteredWithoutQuery = routesArray.filter(item => item.withQuery == false)
    filteredWithoutQuery.forEach((elem) => {
        if (!filteredArray.some(item => item.route == elem.route)) {
            filteredArray.push(elem)
        }
    })

    return filteredArray
}

process.on('unhandledRejection', function (err, p) {

    console.log(p);
    server.close(function () {
        console.log("Closed out remaining connections.");
        // Close db connections, etc.
    });
});

process.on('rejectionHandled', function (p) {
    console.log(p);
    // const index = unhandledRejections.indexOf(p);
    // unhandledRejections.splice(index, 1);
    server.close(function () {
        console.log("Closed out remaining connections.");
        // Close db connections, etc.
    });
});

process.on('SIGTERM', function () {

    server.close(function () {
        console.log("Closed out remaining connections.");
        // Close db connections, etc.
    });

    setTimeout(function () {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 30 * 1000);

});

function createFoldersIfNeed() {

    let showError = function (e) {
        if (!e || (e && e.code === 'EEXIST')) {
            //do something with contents
        } else {
            console.log(e);
        }
    }

    let rootPath = path.join(__dirname, rootFolderName)
    fs.mkdir(rootPath, showError);

    let staticPath = path.join(__dirname, staticFolderName)
    fs.mkdir(staticPath, showError);

    return { rootPath, staticPath }
}

function getConfig(configPath) {

    let result = {}

    if (fs.existsSync(configPath)) {
        var config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log("config", config)
        if (config.statusCode) {
            result.statusCode = config.statusCode
        } else {
            result.statusCode = defaultStatusCode
        }
        if (config.headers) {
            result.headers = config.headers
        } else {
            result.headers = defaultHeaders
        }
    } else {
        result.statusCode = defaultStatusCode
        result.headers = defaultHeaders
    }

    return result
}