function dv_rolloutManager(handlersDefsArray, baseHandler) {
    this.handle = function () {
        var errorsArr = [];

        var handler = chooseEvaluationHandler(handlersDefsArray);
        if (handler) {
            var errorObj = handleSpecificHandler(handler);
            if (errorObj === null)
                return errorsArr;
            else {
                var debugInfo = handler.onFailure();
                if (debugInfo) {
                    for (var key in debugInfo) {
                        if (debugInfo.hasOwnProperty(key)) {
                            if (debugInfo[key] !== undefined || debugInfo[key] !== null) {
                                errorObj[key] = encodeURIComponent(debugInfo[key]);
                            }
                        }
                    }
                }
                errorsArr.push(errorObj);
            }
        }

        var errorObjHandler = handleSpecificHandler(baseHandler);
        if (errorObjHandler) {
            errorObjHandler['dvp_isLostImp'] = 1;
            errorsArr.push(errorObjHandler);
        }
        return errorsArr;
    }

    function handleSpecificHandler(handler) {
        var url;
        var errorObj = null;

        try {
            url = handler.createRequest();
            if (url) {
                if (!handler.sendRequest(url))
                    errorObj = createAndGetError('sendRequest failed.',
                        url,
                        handler.getVersion(),
                        handler.getVersionParamName(),
                        handler.dv_script);
            } else
                errorObj = createAndGetError('createRequest failed.',
                    url,
                    handler.getVersion(),
                    handler.getVersionParamName(),
                    handler.dv_script,
                    handler.dvScripts,
                    handler.dvStep,
                    handler.dvOther
                    );
        }
        catch (e) {
            errorObj = createAndGetError(e.name + ': ' + e.message, url, handler.getVersion(), handler.getVersionParamName(), (handler ? handler.dv_script : null));
        }

        return errorObj;
    }

    function createAndGetError(error, url, ver, versionParamName, dv_script, dvScripts, dvStep, dvOther) {
        var errorObj = {};
        errorObj[versionParamName] = ver;
        errorObj['dvp_jsErrMsg'] = encodeURIComponent(error);
        if (dv_script && dv_script.parentElement && dv_script.parentElement.tagName && dv_script.parentElement.tagName == 'HEAD')
            errorObj['dvp_isOnHead'] = '1';
        if (url)
            errorObj['dvp_jsErrUrl'] = url;
        if (dvScripts) {
            var dvScriptsResult = '';
            for (var id in dvScripts) {
                if (dvScripts[id] && dvScripts[id].src) {
                    dvScriptsResult += encodeURIComponent(dvScripts[id].src) + ":" + dvScripts[id].isContain + ",";
                }
            }
            //errorObj['dvp_dvScripts'] = encodeURIComponent(dvScriptsResult);
           // errorObj['dvp_dvStep'] = dvStep;
           // errorObj['dvp_dvOther'] = dvOther;
        }
        return errorObj;
    }

    function chooseEvaluationHandler(handlersArray) {
        var config = window._dv_win.dv_config;
        var index = 0;
        var isEvaluationVersionChosen = false;
        if (config.handlerVersionSpecific) {
            for (var i = 0; i < handlersArray.length; i++) {
                if (handlersArray[i].handler.getVersion() == config.handlerVersionSpecific) {
                    isEvaluationVersionChosen = true;
                    index = i;
                    break;
                }
            }
        }
        else if (config.handlerVersionByTimeIntervalMinutes) {
            var date = config.handlerVersionByTimeInputDate || new Date();
            var hour = date.getUTCHours();
            var minutes = date.getUTCMinutes();
            index = Math.floor(((hour * 60) + minutes) / config.handlerVersionByTimeIntervalMinutes) % (handlersArray.length + 1);
            if (index != handlersArray.length) //This allows a scenario where no evaluation version is chosen
                isEvaluationVersionChosen = true;
        }
        else {
            var rand = config.handlerVersionRandom || (Math.random() * 100);
            for (var i = 0; i < handlersArray.length; i++) {
                if (rand >= handlersArray[i].minRate && rand < handlersArray[i].maxRate) {
                    isEvaluationVersionChosen = true;
                    index = i;
                    break;
                }
            }
        }

        if (isEvaluationVersionChosen == true && handlersArray[index].handler.isApplicable())
            return handlersArray[index].handler;
        else
            return null;
    }    
}

function dv_GetParam(url, name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    if (results == null)
        return null;
    else
        return results[1];
}

function dv_SendErrorImp(serverUrl, errorsArr) {

    for (var j = 0; j < errorsArr.length; j++) {
        var errorQueryString = '';
        var errorObj = errorsArr[j];
        for (key in errorObj) {
            if (errorObj.hasOwnProperty(key)) {
                if (key.indexOf('dvp_jsErrUrl') == -1) {
                    errorQueryString += '&' + key + '=' + errorObj[key];
                }
                else {
                    var params = ['ctx', 'cmp', 'plc', 'sid'];
                    for (var i = 0; i < params.length; i++) {
                        var pvalue = dv_GetParam(errorObj[key], params[i]);
                        if (pvalue) {
                            errorQueryString += '&dvp_js' + params[i] + '=' + pvalue;
                        }
                    }
                }
            }
        }

        var windowProtocol = 'http:';
        var sslFlag = '&ssl=0';
        if (window.location.protocol === 'https:') {
            windowProtocol = 'https:';
            sslFlag = '&ssl=1';
        }
        var errorImp = windowProtocol + '//' + serverUrl + sslFlag + errorQueryString;
        dv_sendRequest(errorImp);
    }
}

function dv_sendRequest(url) {
    document.write('<scr' + 'ipt language="javascript" src="' + url + '"></scr' + 'ipt>');
}

function dv_GetRnd() {
    return ((new Date()).getTime() + "" + Math.floor(Math.random() * 1000000)).substr(0, 16);
}

function doesBrowserSupportHTML5Push() {
    "use strict";
    return typeof window.parent.postMessage === 'function' && window.JSON;
}
    

function dvBsrType() {
    'use strict';
    var that = this;
    var eventsForDispatch = {};


    this.pubSub = new function () {

        var subscribers = [];

        this.subscribe = function(eventName, uid, actionName, func) {
            if (!subscribers[eventName + uid])
                subscribers[eventName + uid] = [];
            subscribers[eventName + uid].push({ Func: func, ActionName: actionName });
        };

        this.publish = function (eventName, uid) {
            var actionsResults = [];
            if (eventName && uid && subscribers[eventName + uid] instanceof Array)
                for (var i = 0; i < subscribers[eventName + uid].length; i++) {
                    var funcObject = subscribers[eventName + uid][i];
                    if (funcObject && funcObject.Func && typeof funcObject.Func == "function" && funcObject.ActionName) {
                        var isSucceeded = runSafely(function () {
                            return funcObject.Func(uid);
                        });
                        actionsResults.push(encodeURIComponent(funcObject.ActionName) + '=' + (isSucceeded ? '1' : '0'));
                    }
                }
            return actionsResults.join('&');
        };
    };

    this.domUtilities = new function () {

        this.addImage = function (url, parentElement) {
            var image = parentElement.ownerDocument.createElement("img");
            image.width = 0;
            image.height = 0;
            image.style.display = 'none';
            image.src = appendCacheBuster(url);
            parentElement.insertBefore(image, parentElement.firstChild);
        };

        this.addScriptResource = function (url, parentElement) {
            var scriptElem = parentElement.ownerDocument.createElement("script");
            scriptElem.type = 'text/javascript';
            scriptElem.src = appendCacheBuster(url);
            parentElement.insertBefore(scriptElem, parentElement.firstChild);
        };

        this.addScriptCode = function (srcCode, parentElement) {
            var scriptElem = parentElement.ownerDocument.createElement("script");
            scriptElem.type = 'text/javascript';
            scriptElem.innerHTML = srcCode;
            parentElement.insertBefore(scriptElem, parentElement.firstChild);
        };

        this.addHtml = function(srcHtml, parentElement) {
            var divElem = parentElement.ownerDocument.createElement("div");
            divElem.style = "display: inline";
            divElem.innerHTML = srcHtml;
            parentElement.insertBefore(divElem, parentElement.firstChild);
        };
    };

    this.resolveMacros = function (str, tag) {
        var viewabilityData = tag.getViewabilityData();
        var viewabilityBuckets = viewabilityData && viewabilityData.buckets ? viewabilityData.buckets : {};
        var upperCaseObj = objectsToUpperCase(tag, viewabilityData, viewabilityBuckets);
        var newStr = str.replace('[DV_PROTOCOL]', upperCaseObj.DV_PROTOCOL);
        newStr = newStr.replace('[PROTOCOL]', upperCaseObj.PROTOCOL);
        newStr = newStr.replace(/\[(.*?)\]/g, function (match, p1) {
            var value = upperCaseObj[p1];
            if (value === undefined || value === null)
                value = '[' + p1 + ']';
            return encodeURIComponent(value);
        });
        return newStr;
    };

    this.settings = new function () {
    };

    this.tagsType = function () { };

    this.tagsPrototype = function () {
        this.add = function(tagKey, obj) {
            if (!that.tags[tagKey])
                that.tags[tagKey] = new that.tag();
            for (var key in obj)
                that.tags[tagKey][key] = obj[key];
        };
    };

    this.tagsType.prototype = new this.tagsPrototype();
    this.tagsType.prototype.constructor = this.tags;
    this.tags = new this.tagsType();

    this.tag = function () { }
    this.tagPrototype = function () {
        this.set = function (obj) {
            for (var key in obj)
                this[key] = obj[key];
        };
        
        this.getViewabilityData = function () {
        };
    };

    this.tag.prototype = new this.tagPrototype();
    this.tag.prototype.constructor = this.tag;


    this.getTagObjectByService = function (serviceName) {
    
        for (var impressionId in this.tags) {
            if (typeof this.tags[impressionId] === 'object'
                && this.tags[impressionId].services
                && this.tags[impressionId].services[serviceName]
                && !this.tags[impressionId].services[serviceName].isProcessed) {
                this.tags[impressionId].services[serviceName].isProcessed = true;
                return this.tags[impressionId];
            }
        }
        

        return null;
    };

    this.addService = function (impressionId, serviceName, paramsObject) {

        if (!impressionId || !serviceName)
            return;

        if (!this.tags[impressionId])
            return;
        else {
            if (!this.tags[impressionId].services)
                this.tags[impressionId].services = { };

            this.tags[impressionId].services[serviceName] = {
                params: paramsObject,
                isProcessed: false
            };
        }
    };

    this.Enums = {
        BrowserId: { Others: 0, IE: 1, Firefox: 2, Chrome: 3, Opera: 4, Safari: 5 },
        TrafficScenario: { OnPage: 1, SameDomain: 2, CrossDomain: 128 }
    };

    this.CommonData = {};

    var runSafely = function (action) {
        try {
            var ret = action();
            return ret !== undefined ? ret : true;
        } catch (e) { return false; }
    };

    var objectsToUpperCase = function () {
        var upperCaseObj = {};
        for (var i = 0; i < arguments.length; i++) {
            var obj = arguments[i];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    upperCaseObj[key.toUpperCase()] = obj[key];
                }
            }
        }
        return upperCaseObj;
    };

    var appendCacheBuster = function (url) {
        if (url !== undefined && url !== null && url.match("^http") == "http") {
            if (url.indexOf('?') !== -1) {
                if (url.slice(-1) == '&')
                    url += 'cbust=' + dv_GetRnd();
                else
                    url += '&cbust=' + dv_GetRnd();
            }
            else
                url += '?cbust=' + dv_GetRnd();
        }
        return url;
    };

    this.dispatchRegisteredEventsFromAllTags = function () {
        for (var impressionId in this.tags) {
            if (typeof this.tags[impressionId] !== 'function' && typeof this.tags[impressionId] !== 'undefined')
                dispatchEventCalls(impressionId, this);
        }
    };

    var dispatchEventCalls = function (impressionId, dvObj) {
        var tag = dvObj.tags[impressionId];
        var eventObj = eventsForDispatch[impressionId];
        if (typeof eventObj !== 'undefined' && eventObj != null) {
            var url = tag.protocol + '//' + tag.ServerPublicDns + "/bsevent.gif?impid=" + impressionId + '&' + createQueryStringParams(eventObj);
            dvObj.domUtilities.addImage(url, tag.tagElement.parentElement);
            eventsForDispatch[impressionId] = null;
        }
    };

    this.registerEventCall = function (impressionId, eventObject, timeoutMs) {
        addEventCallForDispatch(impressionId, eventObject);

        if (typeof timeoutMs === 'undefined' || timeoutMs == 0 || isNaN(timeoutMs))
            dispatchEventCallsNow(this, impressionId, eventObject);
        else {
            if (timeoutMs > 2000)
                timeoutMs = 2000;

            var dvObj = this;
            setTimeout(function () {
                dispatchEventCalls(impressionId, dvObj);
            }, timeoutMs);
        }
    };

    var dispatchEventCallsNow = function (dvObj, impressionId, eventObject) {
        addEventCallForDispatch(impressionId, eventObject);
        dispatchEventCalls(impressionId, dvObj);
    };

    var addEventCallForDispatch = function (impressionId, eventObject) {
        for (var key in eventObject) {
            if (typeof eventObject[key] !== 'function' && eventObject.hasOwnProperty(key)) {
                if (!eventsForDispatch[impressionId])
                    eventsForDispatch[impressionId] = {};
                eventsForDispatch[impressionId][key] = eventObject[key];
            }
        }
    };

    if (window.addEventListener) {
        window.addEventListener('unload', function () { that.dispatchRegisteredEventsFromAllTags(); }, false);
        window.addEventListener('beforeunload', function () { that.dispatchRegisteredEventsFromAllTags(); }, false);
    }
    else if (window.attachEvent) {
        window.attachEvent('onunload', function () { that.dispatchRegisteredEventsFromAllTags(); }, false);
        window.attachEvent('onbeforeunload', function () { that.dispatchRegisteredEventsFromAllTags(); }, false);
    }
    else {
        window.document.body.onunload = function () { that.dispatchRegisteredEventsFromAllTags(); };
        window.document.body.onbeforeunload = function () { that.dispatchRegisteredEventsFromAllTags(); };
    }

    var createQueryStringParams = function (values) {
        var params = '';
        for (var key in values) {
            if (typeof values[key] !== 'function') {
                var value = encodeURIComponent(values[key]);
                if (params === '')
                    params += key + '=' + value;
                else
                    params += '&' + key + '=' + value;
            }
        }

        return params;
    };

 
}

function dv_baseHandler(){function B(e,d,b,a,k,c,p){var i,m,n;n=window._dv_win.dv_config&&window._dv_win.dv_config.bst2tid?window._dv_win.dv_config.bst2tid:dv_GetRnd();var H,B=window.parent.postMessage&&window.JSON,h=!0,r=!1;if("0"==dv_GetParam(e.dvparams,"t2te")||window._dv_win.dv_config&&!0==window._dv_win.dv_config.supressT2T)r=!0;if(B&&!1==r)try{r="https://cdn3.doubleverify.com/bst2tv3.html";window._dv_win&&(window._dv_win.dv_config&&window._dv_win.dv_config.bst2turl)&&(r=window._dv_win.dv_config.bst2turl);
var D="bst2t_"+n,q;if(document.createElement&&(q=document.createElement("iframe")))q.name=q.id="iframe_"+dv_GetRnd(),q.width=0,q.height=0,q.id=D,q.style.display="none",q.src=r;H=q;if(window._dv_win.document.body)window._dv_win.document.body.insertBefore(H,window._dv_win.document.body.firstChild),h=!0;else{var K=0,L=function(){if(window._dv_win.document.body)try{window._dv_win.document.body.insertBefore(H,window._dv_win.document.body.firstChild)}catch(b){}else K++,150>K&&setTimeout(L,20)};setTimeout(L,
20);h=!1}}catch(X){}r=e.rand;q="__verify_callback_"+r;r="__tagObject_callback_"+r;window[q]=function(b){try{if(void 0==b.ResultID)document.write(1!=b?e.tagsrc:e.altsrc);else switch(b.ResultID){case 1:b.Passback?document.write(decodeURIComponent(b.Passback)):document.write(e.altsrc);break;case 2:case 3:document.write(e.tagsrc)}}catch(a){}};var M="http:",N="http:",O="0";"https"==window._dv_win.location.toString().match("^https")&&(M="https:","https"==p.src.match("^https")&&(N="https:",O="1"));var I=
window._dv_win.document.visibilityState;window[r]=function(b){try{var a={};a.protocol=M;a.ssl=O;a.dv_protocol=N;a.serverPublicDns=b.ServerPublicDns;a.ServerPublicDns=b.ServerPublicDns;a.tagElement=p;a.redirect=e;a.impressionId=b.ImpressionID;window._dv_win.$dvbsr.tags.add(b.ImpressionID,a);if("prerender"===I)if("prerender"!==window._dv_win.document.visibilityState&&"unloaded"!==visibilityStateLocal)window._dv_win.$dvbsr.registerEventCall(b.ImpressionID,{prndr:0});else{var c;"undefined"!==typeof window._dv_win.document.hidden?
c="visibilitychange":"undefined"!==typeof window._dv_win.document.mozHidden?c="mozvisibilitychange":"undefined"!==typeof window._dv_win.document.msHidden?c="msvisibilitychange":"undefined"!==typeof window._dv_win.document.webkitHidden&&(c="webkitvisibilitychange");var d=function(){var a=window._dv_win.document.visibilityState;"prerender"===I&&("prerender"!==a&&"unloaded"!==a)&&(I=a,window._dv_win.$dvbsr.registerEventCall(b.ImpressionID,{prndr:0}),window._dv_win.document.removeEventListener(c,d))};
window._dv_win.document.addEventListener(c,d,!1)}}catch(f){}};void 0==e.dvregion&&(e.dvregion=0);var D="http:",P="0";"https"==window.location.toString().match("^https")&&(D="https:",P="1");try{for(var f=b,w=0;10>w&&f!=window.top;)w++,f=f.parent;b.depth=w;var j=S(b);m="&aUrl="+encodeURIComponent(j.url);i="&aUrlD="+j.depth;var Q=b.depth+a;k&&b.depth--}catch(Y){i=m=Q=b.depth=""}void 0!=e.aUrl&&(m="&aUrl="+e.aUrl);var C;a=function(){try{return!!window.sessionStorage}catch(b){return!0}};k=function(){try{return!!window.localStorage}catch(b){return!0}};
j=function(){var b=document.createElement("canvas");if(b.getContext&&b.getContext("2d")){var a=b.getContext("2d");a.textBaseline="top";a.font="14px 'Arial'";a.textBaseline="alphabetic";a.fillStyle="#f60";a.fillRect(0,0,62,20);a.fillStyle="#069";a.fillText("!image!",2,15);a.fillStyle="rgba(102, 204, 0, 0.7)";a.fillText("!image!",4,17);return b.toDataURL()}return null};try{f=[];f.push(["lang",navigator.language||navigator.browserLanguage]);f.push(["tz",(new Date).getTimezoneOffset()]);f.push(["hss",
a()?"1":"0"]);f.push(["hls",k()?"1":"0"]);f.push(["odb",typeof window.openDatabase||""]);f.push(["cpu",navigator.cpuClass||""]);f.push(["pf",navigator.platform||""]);f.push(["dnt",navigator.doNotTrack||""]);f.push(["canv",j()]);var l=f.join("=!!!=");if(null==l||""==l)C="";else{for(var a=function(a){for(var b="",c,d=7;0<=d;d--)c=a>>>4*d&15,b+=c.toString(16);return b},k=[1518500249,1859775393,2400959708,3395469782],l=l+String.fromCharCode(128),x=Math.ceil((l.length/4+2)/16),y=Array(x),j=0;j<x;j++){y[j]=
Array(16);for(f=0;16>f;f++)y[j][f]=l.charCodeAt(64*j+4*f)<<24|l.charCodeAt(64*j+4*f+1)<<16|l.charCodeAt(64*j+4*f+2)<<8|l.charCodeAt(64*j+4*f+3)}y[x-1][14]=8*(l.length-1)/Math.pow(2,32);y[x-1][14]=Math.floor(y[x-1][14]);y[x-1][15]=8*(l.length-1)&4294967295;for(var l=1732584193,f=4023233417,w=2562383102,E=271733878,F=3285377520,s=Array(80),z,t,u,v,G,j=0;j<x;j++){for(var g=0;16>g;g++)s[g]=y[j][g];for(g=16;80>g;g++)s[g]=(s[g-3]^s[g-8]^s[g-14]^s[g-16])<<1|(s[g-3]^s[g-8]^s[g-14]^s[g-16])>>>31;z=l;t=f;u=
w;v=E;G=F;for(g=0;80>g;g++){var R=Math.floor(g/20),T=z<<5|z>>>27,A;c:{switch(R){case 0:A=t&u^~t&v;break c;case 1:A=t^u^v;break c;case 2:A=t&u^t&v^u&v;break c;case 3:A=t^u^v;break c}A=void 0}var U=T+A+G+k[R]+s[g]&4294967295;G=v;v=u;u=t<<30|t>>>2;t=z;z=U}l=l+z&4294967295;f=f+t&4294967295;w=w+u&4294967295;E=E+v&4294967295;F=F+G&4294967295}C=a(l)+a(f)+a(w)+a(E)+a(F)}}catch(Z){C=null}b=(window._dv_win&&window._dv_win.dv_config&&window._dv_win.dv_config.verifyJSCURL?dvConfig.verifyJSCURL+"?":D+"//rtb"+
e.dvregion+".doubleverify.com/verifyc.js?")+e.dvparams+"&num=5&srcurlD="+b.depth+"&callback="+q+"&jsTagObjCallback="+r+"&ssl="+P+"&refD="+Q+"&htmlmsging="+(B?"1":"0")+"&guid="+n+(null!=C?"&aadid="+C:"");d="dv_url="+encodeURIComponent(d);if(!1==h||c)b=b+("&dvp_isBodyExistOnLoad="+(h?"1":"0"))+("&dvp_isOnHead="+(c?"1":"0"));if((c=window[J("=@42E:@?")][J("2?46DE@C~C:8:?D")])&&0<c.length){h=[];h[0]=window.location.protocol+"//"+window.location.hostname;for(n=0;n<c.length;n++)h[n+1]=c[n];c=h.reverse().join(",")}else c=
null;c&&(d+="&ancChain="+encodeURIComponent(c));if(!1==/MSIE (\d+\.\d+);/.test(navigator.userAgent)||7<new Number(RegExp.$1)||2E3>=m.length+i.length+b.length)b+=i,d+=m;if(void 0!=window._dv_win.$dvbsr.CommonData.BrowserId&&void 0!=window._dv_win.$dvbsr.CommonData.BrowserVersion&&void 0!=window._dv_win.$dvbsr.CommonData.BrowserIdFromUserAgent)c=window._dv_win.$dvbsr.CommonData.BrowserId,i=window._dv_win.$dvbsr.CommonData.BrowserVersion,m=window._dv_win.$dvbsr.CommonData.BrowserIdFromUserAgent;else{c=
[{id:4,brRegex:"OPR|Opera",verRegex:"(OPR/|Version/)"},{id:1,brRegex:"MSIE|Trident/7.*rv:11|rv:11.*Trident/7|Edge/",verRegex:"(MSIE |rv:| Edge/)"},{id:2,brRegex:"Firefox",verRegex:"Firefox/"},{id:0,brRegex:"Mozilla.*Android.*AppleWebKit(?!.*Chrome.*)|Linux.*Android.*AppleWebKit.* Version/.*Chrome",verRegex:null},{id:0,brRegex:"AOL/.*AOLBuild/|AOLBuild/.*AOL/|Puffin|Maxthon|Valve|Silk|PLAYSTATION|PlayStation|Nintendo|wOSBrowser",verRegex:null},{id:3,brRegex:"Chrome",verRegex:"Chrome/"},{id:5,brRegex:"Safari|(OS |OS X )[0-9].*AppleWebKit",
verRegex:"Version/"}];m=0;i="";n=navigator.userAgent;for(h=0;h<c.length;h++)if(null!=n.match(RegExp(c[h].brRegex))){m=c[h].id;if(null==c[h].verRegex)break;n=n.match(RegExp(c[h].verRegex+"[0-9]*"));null!=n&&(i=n[0].match(RegExp(c[h].verRegex)),i=n[0].replace(i[0],""));break}c=h=V();i=h===m?i:"";window._dv_win.$dvbsr.CommonData.BrowserId=c;window._dv_win.$dvbsr.CommonData.BrowserVersion=i;window._dv_win.$dvbsr.CommonData.BrowserIdFromUserAgent=m}b+="&brid="+c+"&brver="+i+"&bridua="+m;"prerender"===
window._dv_win.document.visibilityState&&(b+="&prndr=1");m=W();b+="&vavbkt="+m.vdcd;b+="&lvvn="+m.vdcv;return b+"&eparams="+encodeURIComponent(J(d))}function W(){try{return{vdcv:8,vdcd:eval(function(d,b,a,e,c,p){c=function(a){return(a<b?"":c(parseInt(a/b)))+(35<(a%=b)?String.fromCharCode(a+29):a.toString(36))};if(!"".replace(/^/,String)){for(;a--;)p[c(a)]=e[a]||c(a);e=[function(a){return p[a]}];c=function(){return"\\w+"};a=1}for(;a--;)e[a]&&(d=d.replace(RegExp("\\b"+c(a)+"\\b","g"),e[a]));return d}("(v(){1i{m Q=[1h];1i{m 6=1h;2n(6!=6.1Q&&6.1k.2i.2h){Q.1l(6.1k);6=6.1k}}1f(e){}v 1m(H){1i{W(m i=0;i<Q.1j;i++){11(H(Q[i]))b Q[i]==1h.1Q?-1:1}b 0}1f(e){b 1g}}v 1G(K){b 1m(v(6){b 6[K]!=1g})}v 3i(6,1E,H){W(m K 2F 6){11(K.1N(1E)>-1&&(!H||H(6[K])))b 3x}b 2R}v g(s){m h=\"\",t=\"36.;j&38}3d/0:31'32=B(30-2Z!,2X)2Y\\\\{ >33+34\\\"39<\";W(i=0;i<s.1j;i++)f=s.1R(i),e=t.1N(f),0<=e&&(f=t.1R((e+41)%37)),h+=f;b h}m c=['35\"18-2W\"2V\"2K','p','l','2L&p','p','{','-5,!u<}\"2J}\"','p','J','-2I}\"<2G','p','=o',':<2H}T}<\"','p','h','\\\\<}4-2}\"E(d\"G}8?\\\\<}4-2}\"E(d\"1w<N\"[1d*1t\\\\\\\\1s-2N<1r\"1n\"2O]V}C\"O','e','2T','\"1o\\\\<}1u\"I<-2U\"1p\"5\"2S}1x<}2P\"1o\\\\<}10}1a>19-13}2}\"1p\"5\"2Q}1x<}3a','e','=J','17}U\"<5}3b\"y}F\\\\<}[3v}3w:3u]9}7\\\\<}[t:1P\"3t]9}7\\\\<}[3r})5-u<}t]9}7\\\\<}[3s]9}7\\\\<}[3y}3C]9}3B','e','3z',':3A}<\"D-3q/2M','p','3p','\\\\<}w<U/X}7\\\\<}w<U/!9}8','e','=l','\\\\<}1q!3g\\\\<}1q!3h)p?\"k','e','3f','3e:,','p','3c','17}U\"<5}1S:3j\\\\<}4-2}\"3o\".42-2}\"3n-3m<N\"3k<3l<3E}C\"3H<2B<23[<]E\"27\"18}\"2}\"1W[<]E\"27\"18}\"2}\"E<}1e&1U\"1\\\\<}14\\\\1X\\\\<}14\\\\10}1a>19-13}2}\"z<26-2}\"22\"2.42-2}\"1Z=20\"y}24\"y}P=25','e','x','1Y)','p','+','\\\\<}1y)u\"28\\\\<}1y)u\"1V?\"k','e','21','\\\\<}4-2}\"E(d\"G}8?\\\\<}4-2}\"E(d\"2E<:[\\\\2v}}2M][\\\\2u,5}2]2t}C\"O','e','2q',':2r<Z','p','2w','\\\\<}E\"2x\\\\<}E\"2C-29?\"k','e','2A','1D\\\\<}2y:,2z}U\"<5}2p\"y}2o<2e<2g}2d','e','2c','\\\\<}w<U/2a&1K\"E/1O\\\\<}w<U/2b}C\"1T\\\\<}w<U/f[&1K\"E/1O\\\\<}w<U/2m[S]]1u\"2l}8?\"k','e','2j','2k}3D}43>2s','p','4Y','\\\\<}16:<15}s<55}7\\\\<}16:<15}s<4U<}f\"u}1I\\\\<}1J\\\\<}16:<15}s<C[S]E:1P\"X}8','e','l{','4G\\'<}14\\\\T}4B','p','==','\\\\<}E\"2f\"4A\\\\<}4H<4I?\"k','e','o{',' &D)&4K','p','4F','\\\\<}E.:2}\"c\"<4M}7\\\\<}4L}7\\\\<}4J<}f\"u}1I\\\\<}1J\\\\<}10:}\"9}8','e','3F','\\\\<}4-2}\"E(d\"G}8?\\\\<}4-2}\"E(d\"1w<N\"[1d*1t\\\\\\\\1s-1r\"1n/4O<4S]V}C\"O','e','4R',')4Q!4P}s<C','p','4z','\\\\<}1z.L>g;D\\'T)Y.4y\\\\<}1z.L>g;4x&&4C>D\\'T)Y.I?\"k','e','l=','D:<Z<:5','p','4E','\\\\<}9\\\\<}E\"4D\\\\<}n\"<5}1v\"1F}/1B\\\\<}4-2}\"1M<}1e&4T\\\\<}n\"<5}1c\"}u-54=?17}U\"<5}1S\"51\"y}52\\\\<}4Z}\"n\"<5}50\"4X\"y}F\"4V','e','4W','53-N:4v','p','3X','\\\\<}1b\"3W\\\\<}1b\"3V\"<5}3U\\\\<}1b\"3Y||\\\\<}3Z?\"k','e','h+','\\\\<}n\"<5}1c\"}u-45\\\\<}10}1a>19-13}2}\"q\\\\<}n\"<5}1c\"}u-2D','e','=S','c>A','p','=','\\\\<}4-2}\"E(d\"G}8?\\\\<}4-2}\"E(d\"1A<:[<Z*1t:Z,1C]F:<44[<Z*4w]V}C\"O','e','h=','40-2}\"n\"<5}9}8','e','3T','\\\\<}4-2}\"E(d\"G}8?\\\\<}4-2}\"E(d\"1A<:[<Z*3S}1C]R<-C[1d*3L]V}C\"O','e','3K','1D\\\\<}1H\"\\\\3J\\\\<}1H\"\\\\3G','e','3I','\\\\<}3M}Z<}3N}7\\\\<}3R<f\"9}7\\\\<}3Q/<}C!!3P<\"42.42-2}\"X}7\\\\<}3O\"<5}9}8?\"k','e','46','T>;47\"<4f','p','h{','\\\\<}4o\\\\<}4n}<(4m?\"k','e','4l','\\\\<}4p<4q a}4u}7\\\\<}E}4t\"4s 4r- X}8','e','4k','4j\\\\<}n\"<5}4b}4a\"49&M<C<}48}C\"1T\\\\<}n\"<5}1v\"1F}/1B\\\\<}4-2}\"4c\\\\<}4-2}\"1M<}1e&4d[S]4i=?\"k','e','l+'];m 12=[];W(m j=0;j<c.1j;j+=3){m r=c[j+1]=='p'?1G(g(c[j])):1m(v(6){b 4h(g(c[j]))});11(r>0||r<0)12.1l(r*1L(g(c[j+2])));4g 11(r==1g)12.1l(-4e*1L(g(c[j+2])))}b 12}1f(e){b[-4N]}})();",
62,316,"    EZ5Ua  win a44OO a44 P1  return  a2MQ0242U       Ma2vsu4f2  var E45Uu        function EBM  aM     _   5ML44P1 func   prop    3RSvsu4f2  wins     WDE42 for fP1   E2 if results N5 Z5 ZU5 E_ qsa g5 Tg5 U5Z2c EuZ E35f fMU Z27 catch null window try length parent push ch MuU QN25sF ENM5 E_Y kN7 BuZfEU5  Ef2 E3M2sP1tuB5a 5ML44qWfUM Z2s EufB EcIT_0 5ML44qWZ tOO _t U5q str vB4u ex zt__ U25sF ELMMuQOO BV2U parseInt EM2s2MM2ME indexOf 2Qfq uf top charAt qD8 3RSOO sqt ujuM OO2 E2fUuN2z21 Ld0 tDRm DM2 oo EUM2u sq2 PSHM2 HnDqD 1Z5Ua  u_Z2U5Z2OO NTZ fOO fDE42 lJ a44nD f32M_faB  ZP1 href location ox M2 aNP1 fD while F5ENaB4 q5D8M2 eS u_faB  tDE42 Um UmBu hJ UIuCTZOO zt_M tzsa oJ 99D UT  5ML44qtZ in u4f ZBu fgM2Z2 g5a Q42 60  kUM EVft 2ZtOO QN2P1ta false QN211ta eo 25a 2Z0 Na LnG 5r uic2EHVO Q6T s7 Kt NhCZ lkSvfxWX C2 Ue 82 PzA 1bqyJIma 2Zt qD8M2 he YDoMw8FRp3gd94 _M lS AOO AEBuf2g co uMF21 tDHs5Mq 1SH 2qtfUM fbQIuCpu EC2 ho uM tUZ tUBt r5Z2t 24t tf5a ZA2 true tB ee u_a a44nDqD LMMt 5IMu i2E42 ll B_UB_tD  lh B__tDOOU5q oe 1tNk4CEN3Nt E4u CcM4P1 Eu445Uu gI ENuM Ef2A 1tB2uU5 eh OOq CfEf2U CfOO le CfE35aMfUuN E35aMfUuND Z5Ua   fY45 Z25 2P1 lo _c fzuOOuE42 5M U2f Eu EM2s2MM2MOO squ 100  else eval D11m u1 lx ol a2TZ E_NUCEYp_c E_NUCOO EUuU 4Zf M5 5M2f _f UP1 _ZBf 1tfMmN4uQ2Mt _I IOO oh fNNOO s5 AbL 5NOO hh hl UufUuZ2 E0N2U u4buf2Jl ErF rLTp ErP1 4P1 999 kZ 4Qg5 2u4 eJ fN4uQLZfEVft sq CF Ma2nnDqDvsu4f2 oS U3q2D8M2 hx ENuM2 E3M2szsu4f2nUu MQ8M2 FN1 ___U 2DRm CP1".split(" "),
0,{}))}}catch(e){return{vdcv:8,vdcd:"0"}}}function S(e){try{if(1>=e.depth)return{url:"",depth:""};var d,b=[];b.push({win:window.top,depth:0});for(var a,k=1,c=0;0<k&&100>c;){try{if(c++,a=b.shift(),k--,0<a.win.location.toString().length&&a.win!=e)return 0==a.win.document.referrer.length||0==a.depth?{url:a.win.location,depth:a.depth}:{url:a.win.document.referrer,depth:a.depth-1}}catch(p){}d=a.win.frames.length;for(var i=0;i<d;i++)b.push({win:a.win.frames[i],depth:a.depth+1}),k++}return{url:"",depth:""}}catch(m){return{url:"",
depth:""}}}function J(e){new String;var d=new String,b,a,k;for(b=0;b<e.length;b++)k=e.charAt(b),a="!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".indexOf(k),0<=a&&(k="!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".charAt((a+47)%94)),d+=k;return d}function V(){try{if("function"===typeof window.callPhantom)return 99;try{if("function"===typeof window.top.callPhantom)return 99}catch(e){}if(void 0!=window.opera&&
void 0!=window.history.navigationMode||void 0!=window.opr&&void 0!=window.opr.addons&&"function"==typeof window.opr.addons.installExtension)return 4;if(void 0!=window.chrome&&"function"==typeof window.chrome.csi&&"function"==typeof window.chrome.loadTimes&&void 0!=document.webkitHidden&&(!0==document.webkitHidden||!1==document.webkitHidden))return 3;if(void 0!=window.mozInnerScreenY&&"number"==typeof window.mozInnerScreenY&&void 0!=window.mozPaintCount&&0<=window.mozPaintCount&&void 0!=window.InstallTrigger&&
void 0!=window.InstallTrigger.install)return 2;if(void 0!=document.uniqueID&&"string"==typeof document.uniqueID&&(void 0!=document.documentMode&&0<=document.documentMode||void 0!=document.all&&"object"==typeof document.all||void 0!=window.ActiveXObject&&"function"==typeof window.ActiveXObject)||window.document&&window.document.updateSettings&&"function"==typeof window.document.updateSettings)return 1;var d=!1;try{var b=document.createElement("p");b.innerText=".";b.style="text-shadow: rgb(99, 116, 171) 20px -12px 2px";
d=void 0!=b.style.textShadow}catch(a){}return 0<Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor")&&d&&void 0!=window.innerWidth&&void 0!=window.innerHeight?5:0}catch(k){return 0}}this.createRequest=function(){var e=!1,d=window,b=0,a=!1;try{for(dv_i=0;10>=dv_i;dv_i++)if(null!=d.parent&&d.parent!=d)if(0<d.parent.location.toString().length)d=d.parent,b++,e=!0;else{e=!1;break}else{0==dv_i&&(e=!0);break}}catch(k){e=!1}0==d.document.referrer.length?e=d.location:e?e=d.location:(e=
d.document.referrer,a=!0);var c=document.getElementsByTagName("script");for(dv_i in c)if(c[dv_i].src){var p=c[dv_i].src;if(p=p&&p.match(/bsredirect5(_plain)?\.js\?callback=/)?p.replace(/^.+?callback=(.+?)(&|$)/,"$1"):null)if((this.redirect=eval(p+"()"))&&!this.redirect.done)return this.redirect.done=!0,d=B(this.redirect,e,d,b,a,c[dv_i]&&c[dv_i].parentElement&&c[dv_i].parentElement.tagName&&"HEAD"===c[dv_i].parentElement.tagName,c[dv_i]),d+="&"+this.getVersionParamName()+"="+this.getVersion()}};this.isApplicable=
function(){return!0};this.onFailure=function(){};this.sendRequest=function(e){dv_sendRequest(e);return!0};if(window.debugScript&&(!window.minDebugVersion||10>=window.minDebugVersion))window.DvVerify=B,window.createRequest=this.createRequest;this.getVersionParamName=function(){return"ver"};this.getVersion=function(){return"26"}};


function dv_bs5_main(dv_baseHandlerIns, dv_handlersDefs) {

    this.baseHandlerIns = dv_baseHandlerIns;
    this.handlersDefs = dv_handlersDefs;

    this.exec = function () {
        try {
            window._dv_win = (window._dv_win || window);
            window._dv_win.$dvbsr = (window._dv_win.$dvbsr || new dvBsrType());

            window._dv_win.dv_config = window._dv_win.dv_config || {};
            window._dv_win.dv_config.bsErrAddress = window._dv_win.dv_config.bsAddress || 'rtb0.doubleverify.com';
            
            var errorsArr = (new dv_rolloutManager(this.handlersDefs, this.baseHandlerIns)).handle();
            if (errorsArr && errorsArr.length > 0)
                dv_SendErrorImp(window._dv_win.dv_config.bsErrAddress + '/verifyc.js?ctx=818052&cmp=1619415&num=5', errorsArr);
        }
        catch (e) {
            try {
                dv_SendErrorImp(window._dv_win.dv_config.bsErrAddress + '/verifyc.js?ctx=818052&cmp=1619415&num=5&dvp_isLostImp=1', { dvp_jsErrMsg: encodeURIComponent(e) });
            } catch (e) { }
        }
    }
}

try {
    window._dv_win = window._dv_win || window;
    var dv_baseHandlerIns = new dv_baseHandler();
	

    var dv_handlersDefs = [];

    if(!window.debugScript) {
        (new dv_bs5_main(dv_baseHandlerIns, dv_handlersDefs)).exec();
    }
} catch (e) { }