﻿(function(g,h,O){function u(a,b,c){return function(){try{return a.apply(this,arguments)}catch(d){c||xa(d,b)}}}function xa(a,b){var c;if(.01>Math.random())try{var d=a&&a.message||"";(c=-1<d.indexOf("network error occurred")||-1<d.indexOf("send beacon")&&-1<d.indexOf("Content Security Policy"))||(new ga).log("jserrs",X,a.message,b,D.href,"","string"===typeof a.stack&&a.stack.replace(/\n/g,"\\n"))}catch(e){}}function mb(a,b,c,d,e){function l(a){var b=(new Date).getTime();a&&b<a&&(Na+=a-b+20);f.setTimeout(function(){l(b)},
20,"timeCorrector")}function n(){var a=(new Date).getTime()+Na;a<S&&(a=S+10);return S=a}function r(){return Math.round((n()-X)/50)}function H(a,b){b=Math.max(0,Math.min(b,65535));f.mergeArrays(a,[b>>8,b&255])}function t(a,b){f.mergeArrays(a,[b&255])}function p(a,b){for(b=Math.max(0,b|0);127<b;)f.mergeArrays(a,[b&127|128]),b>>=7;f.mergeArrays(a,[b])}function q(a,b){255<b.length&&(b=b.substr(0,255));f.mergeArrays(a,[b.length]);for(var c=0;c<b.length;c++)H(a,b.charCodeAt(c))}function w(a,b){p(a,b.length);
for(var c=0;c<b.length;c++)p(a,b.charCodeAt(c))}function Oa(a,b,c,d,e,f){for(var y;c&&(y=m.getElementSize(c))&&(!y[0]||!y[1]);)c=m.getElementParent(c);if(!c)return null;y=c[E];if(!y||0>y)return null;var l={mousemove:2,click:32,dblclick:33,mousedown:4,mouseup:30,touch:12}[b];if(!l)return null;var Ma=m.getElementXY(c);c=[];t(c,l);p(c,a);p(c,y);p(c,Math.max(0,d[0]-Ma[0]));p(c,Math.max(0,d[1]-Ma[1]));/^mouse(up|down)|click$/.test(b)&&(a=e||f,t(c,2>a?1:a==(e?2:4)?4:2));return c}function Pa(a,b,c,d){b=
b[E];if(!b||0>b)return null;varELECT|TEXTAREA$/.test(a.nodeName)||!a.form||Y(a.form))return null;var c=m.getFormNumber(a.form);if(0>c)return null;var d="INPUT"==a.nodeName?{text:0,color:0,date:0,datetime:0,"datetime-local":0,email:0,number:0,range:0,search:0,tel:0,time:0,url:0,month:0,week:0,password:2,radio:3,checkbox:4,file:6,image:7}[a.type]:{SELECT:1,TEXTAREA:5}[a.nodeName];if("number"!=typeof d)return null;for(var e=-1,f=a.form.elements,y=f.length,l=0,n=0;l<y;l++)if(f[l].name==
a.name){if(f[l]==a){e=n;break}n++}if(0>e)return null;f=[];t(f,7);p(f,b);p(f,c);p(f,d);w(f,a.name||"");p(f,e);return f}function M(a,b){var c=m.getFormNumber(b);if(0>c)return null;for(var d=b.elements,e=d.length,y=[],l=0;l<e;l++)if(!m.isEmptyField(d[l])){var n=d[l][E];n&&0<n&&f.mergeArrays(y,[n])}d=[];t(d,11);p(d,a);p(d,c);p(d,y.length);for(c=0;c<y.length;c++)p(d,y[c]);return d}function R(){var a=[];t(a,13);return a}function I(a,b,c){a=a.apply(g,b);na.append(a,c)}function B(a){if(a[E])a:{var b=r(),
c=a[E];if(0<c){var d=[];a=m.getElementRegion(a);var e=za[c],f=a[0]+"x"+a[1],l=a[2]+"x"+a[3];f!=e.pos&&(e.pos=f,t(d,9),p(d,b),p(d,c),p(d,a[0]),p(d,a[1]));l!=e.size&&(e.size=l,t(d,10),p(d,b),p(d,c),p(d,a[2]),p(d,a[3]));if(d.length){a=d;break a}}a=null}else{(c=m.getElementParent(a))&&B(c);a[E]=T;za[T]={};T++;if(a.nodeName)if(c=+a[E],!isFinite(c)||0>=c)b=null;else{var d=64,e=0,y=m.getElementParent(a),f=y&&y[E]?y[E]:0;0>f&&(f=0);var l=a.nodeName.toUpperCase(),n=sb[l];n||(d|=2);var g=m.getElementNeighborPosition(a);
g||(d|=4);var h=m.getElementRegion(a);(y=y?m.getElementRegion(y):na);else k.on(h,"wheel",Dthis.meta,this._packetNumber);this._packetNumber++;this.clear()},_saveToStorage:function(){this.storage&&this._data.length&&this.storage.set(this.storageKey,{data:this._data,meta:this.meta,pnum:this._packetNumber,time:+new Date})}}),w={storage:{},init:function(){var a=this;u(function(){g.Ya=g.Ya||{};g.Ya._metrika=g.Ya._metrika||{};a.storage=g.Ya._metrika},"",!0)();return this},setSafe:function(a,b){var c=
this;u(function(){c.storage[a]||(c.storage[a]=b)},"",!0)();return this},set:function(a,b){u(function(){g.Ya._metrika[a]=b},"",!0)();return this},get:function(a,b){return u(function(){var c=g.Ya._metrika[a];return c===O?b:c},"",!0)()}};f.forEachKey=function(a,b,c){for(var d in a)a.hasOwnProperty(d)&&b.call(c,d,a[d],a)};f.isEqual=function(a,b){var c=!0;f.forEachKey(a,function(a,e){b.hasOwnProperty(a)&&b[a]===e||(c=!1)});if(!c)return c;f.forEachKey(b,function(b,e){a.hasOwnProperty(b)&&a[b]===e||(c=!1)});
return c};var k=A.inherit({_initComponent:function(){k.(e){e.data===c&&(e.stopPropagation&&e.stopPropagation(),a.call(b),k.un(g,"message",d,null,{passive:!1}))};k.on(g,"message",d,null,{passive:!1});g.postMessage(c,"*")}else f.setTimeout(function(){a.call(b)},0)};var oa=A.inherit({transports:[],globalConfig:w,postParams:[],isDisabled:function(){return this.globalConfig.get("oo")},send:function(a,b,c,d){var e=[a],l=this,n=c||function(){};l.isDisabled()?n.call(d):function H(a){if(a<this.transports.length)try{var c=
new this.transports[a]({postParams:this.postParams,quern(a,b,c,d){var e=this._doc;if(!e)return c.call(d,!1);b=this._splitParams(b);var l="ifr"+f.random();var g=e.createElement("div");g.style.position="absolute";g.style.left="-99999px";g.style.top="-99999px";var h=['\x3ciframe name\x3d"',l,'"\x3e\x3c/iframe\x3e','\x3cform action\x3d"',this._buildUrl(a,b.get),'" method\x3d"post" target\x3d"',l,'" enctype\x3d"',this.enctype,'"\x3e'];f.forEachKey(b.post,function(a){f.mergeArrays(h,['\x3cinput type\x3d"hidden" autocomplete\x3d"off" autocorrect\x3d"off"',
' autocapitalize\x3d"off" spellcheck\x3d"false" name\x3d"',a,'"/\x3e'])});f.mergeArrays(h,["\x3c/form\x3e"]);g.innerHTML=h.join("");e.body.appendChild(g);var k=g.getElementsByTagName("form")[0];f.forEachKey(b.post,function(a,b){k[a].value=b});k.submit();f.setTimeout(function(){e.body.removeChild(g)},1E4,"TransportForm.request.2");return c.call(d,!0)},_createHtmlfile:function(){try{if(g.ActiveXObject){var a=new ActiveXObject("htmlfile");a.open();a.write("\x3chtml\x3e\x3cbody\x3e\x3c/body\x3e\x3c/html\x3e");
a.close();return a}}catch(b){}return null}}),Db=T.inherit({id:"htmlfile",index:3,htmlfileOnly:!0}),Z=S.inherit({id:"img",index:4,request:function(a,b,c,d){a=this._buildUrl(a,b);var e=!1;b=h.createElement("img");c=c||function(){};b.onload=u(function(){e||(c.call(d,!0),e=!0)},"TransportImage.request");b.onerror=u(function(){e||(c.call(d,!1),e=!0)},"TransportImage.request");b.src=a;this.timeout&&f.setTimeout(function(){e||(c.call(d,!1),e=!0)},this.timeout)}}),ia={stringify:function(a){try{return JSON.stringify(a)}catch(b){return"null"}}};
f.toJSON=function(a){var b;if(a===O)return"";if(null===a)return"null";switch(a.constructor){case Boolean:return a.toString();case Number:return isFinite(a)?a.toString():"null";case String:return'"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r")+'"';case Array:var c=[];var d=0;for(b=a.length;d<b;d++)c[c.length]=f.toJSON(a[d]);return"["+c.join(",")+"]";case Object:c=[];for(d in a)a.hasOwnProperty(d)&&a[d]!==O&&(c[c.length]=f.toJSON(d)+":"+f.toJSON(a[d]));return"{"+
c.join(",")+"}";default:return ia.stringify(a)}};var Q=A.inherit({counterId:"",_initComponent:function(){Q.superclass._initComponent.apply(this,arguments);this._ls=null;try{this._ls=g.localStorage}catch(a){}},set:function(a,b){if(this.isEnabled())try{!b||b&&f.isArray(b)&&!b.length?this.remove(a):this._ls.setItem(this._getLsKey(a),f.toJSON(b))}catch(c){}},get:function(a){if(this.isEnabled())try{return JSON.parse(this._ls.getItem(this._getLsKey(a)))}catch(b){}return null},remove:function(a){if(this.isEnabled())try{this._ls.removeItem(this._getLsKey(a))}catch(b){}},
isEnabled:function(){return this._ls&&g.JSON&&"object"==typeof this._ls&&"object"==typeof g.JSON},getStorageId:function(){var a=this.get("lsid");a||(a=Math.round(Math.random()*new Date),this.set("lsid",a));return a},clearStorageId:function(){this.remove("lsid")},_getLsKey:function(a){return"_ym"+this.counterId+"_"+a}}),F=A.inherit({counterId:"",onlyCurrentDomain:!1,skipPrefix:!1,_initComponent:function(){var a;F.superclass._initComponent.apply(this,arguments);this._domain=null;if(!this.onlyCurrentDomain){var b=
D.host.split(".");for(a=2;;)if(a<=b.length){if(this._domain="."+b.slice(-a).join("."),a++,this.isEnabled())break}else{this._domain=null;break}}},create:function(a,b,c){a=[this._prepareName(a)+"\x3d"+encodeURIComponent(b)];c&&(b=new Date,b.setTime(b.getTime()+6E4*c),a.push("expires\x3d"+b.toGMTString()));this._domain&&a.push("domain\x3d"+this._domain);a.push("path\x3d/");try{h.cookie=a.join(";")}catch(d){}},read:function(a){try{var b=h.cookie}catch(c){}return b&&b.match(new RegExp("(?:^|;\\s*)"+this._prepareName(a)+
"\x3d([^;]*)"))?decodeURIComponent(RegExp.$1):null},erase:function(a){this.create(a,"",-1)},isEnabled:function(){this.create("metrika_enabled","1",60);var a=!!this.read("metrika_enabled");this.erase("metrika_enabled");return a},_prepareName:function(a){return(this.skipPrefix?"":"_ym_")+a+(this.counterId?"_"+this.counterId:"")}});F.get=function(a){return(new F({onlyCurrentDomain:!0})).read(a)};F.set=function(a,b,c){return(new F({onlyCurrentDomain:!0})).create(a,b,c)};F.isEnabled=function(){return(new F({onlyCurrentDomain:!0})).isEnabled()};
var G={getSeconds:function(){return Math.round(+new Date/1E3)}};q.isSafari=function(){try{return navigator.vendor&&-1<navigator.vendor.indexOf("Apple")&&navigator.userAgent&&!navigator.userAgent.match("CriOS")}catch(a){}return!1};var N=oa.inherit({protocol:"",host:J.host,queryStringParams:{firstOrdering:["wmode","callback","cnt-class"],lastOrdering:["browser-info"]},resource:"",counterId:"",counterType:0,retry:!1,transports:[Cb,W,Z,Db],_initComponent:function(){N.superclass._initComponent.apply(this,
arguments);this.retry&&(this._storage=new Q)},send:function(a,b,c,d){var e=this._registerRequest(a,b);this._sendSavedRequest(e,a,b,c,d)},_sendSavedRequest:function(a,b,c,d,e){var l=this.globalConfig.get("firstReqStatus");if("process"==l)this.globalConfig.set("firstReqCallbacks",f.mergeArrays(this.globalConfig.get("firstReqCallbacks")||[],[[this,arguments]]));else{l||this.globalConfig.set("firstReqStatus","process");this.counterType&&(b["cnt-class"]=this.counterType);c.st=G.getSeconds();c.u=N._userID;
l=[this.protocol,"//",this.host,"/",this.resource,"/",this.counterId].join("");var g=[];c&&(f.forEachKey(c,function(a,b){"t"!=a&&f.mergeArrays(g,[a,b])}),c.t&&f.mergeArrays(g,["t",c.t]));g.length&&(b["browser-info"]=g.join(":"));return N.superclass.send.call(this,l,b,function(){var b;this.globalConfig.set("firstReqStatus","complete");this._unregisterRequest(a);var c=this.globalConfig.get("firstReqCallbacks");this.globalConfig.set("firstReqCallbacks",null);if(c)for(b=0;b<c.length;b++)c[b][0]._sendSavedRequest.apply(c[b][0],
c[b][1]);d&&d.apply(e,arguments)},this)}},_isRetryEnabled:function(){return this.retry&&this._storage&&this._storage.isEnabled()},_registerRequest:function(a,b){var c;if(this._isRetryEnabled()){b.rqnl=b.rqnl||0;b.rqnl++;var d=this._storage.get("retryReqs")||{};for(c=1;d[c];)c++;d[c]={protocol:this.protocol,host:this.host,resource:this.resource,counterId:this.counterId,counterType:this.counterType,postParams:this.postParams,params:a,browserInfo:b,ghid:this.globalConfig.get("_globalMetrikaHitId"),time:+new Date};
this._storage.set("retryReqs",d);return c}},_unregisterRequest:function(a){if(a&&this._isRetryEnable.warn&&console.warn.apply(console,arguments)};f.isObject=function(a){try{return a&&null!==a&&"[object Object]"==Object.prototype.toString.call(a)}catch(b){return!1}};f._playerRegexp=/^.+\.mtproxy\.yandex\.net$/;f.isMetrikaPlayer=function(){return"MetrikaPlayer"==g.name||this._playerRegexp.test(g.location.hostname)};var m={getDocumentCharset:function(){return(""+(h.characterSet||h.charset||
"")).toLowerCase()},getRootElement:function(){var a=h.documentElement;return"CSS1Compat"==h.compatMode?a:h.body||a},getViewportSize:function(){var a=m.getRootElement();return[a.clientWidth||g.innerWidth,a.clientHeight||g.innerHeight]},getDocumentTitle:function(){var a=h.title;"string"!=typeof a&&(a=(a=h.getElementsByTagName("title"))&&a.length?a[0].innerHTML:"");return a}};q._silverlightVersion="";q.getSilverlightVersion=function(){if(!q._silverlightVersion)if(g.ActiveXObject)try{var a=new ActiveXObject("AgControl.AgControl");
var b=function(a,b,d,f){for(;c(a,b);)b[d]+=f;b[d]-=f};var c=function(a,b){return a.isVersionSupported(b[0]+"."+b[1]+"."+b[2]+"."+b[3])};var d=[1,0,0,0];b(a,d,0,1);b(a,d,1,1);b(a,d,2,1E4);b(a,d,2,1E3);b(a,d,2,100);b(a,d,2,10);b(a,d,2,1);b(a,d,3,1);q._silverlightVersion=d.join(".")}catch(e){}else if(b=g.navigator,b=b.plugins&&b.plugins["Silverlight Plug-In"])q._silverlightVersion=b.description;return q._silverlightVersion||""};q._flashVersion=0;q.getFlashVersion=function(){if(!q._flashVersion){var a=
g.navigator;if("undefined"!=typeof a.plugins&&"object"==typeof a.pluginsmg");b.onload=function(){a._saveReq(!1);m.removeNode(this)};b.onerror=function(){a._saveReq(!0);m.removeNode(this)};b.src=a.url+String.fromCharCode(97,100,118,101,114,116,46,103,105,102);q.isSafari()&&(b.style.position="absolute",b.style.visibility="hidden",b.style.width="0px",b.style.height="0px",m.getRootElement().appendChild(b))})},_saveReq:function(a){this._value=a=a?"1":"2";this._setReqStatus("complete");this._getLs().create("isad",
a,1200)},_setReqStatus:function(a){try{this.globalConfig.set("adStatus",a)}catch(b){}},_getReqStatus:function(){try{return this.globalConfig.get("adStatus")}catch(a){return"complete"}},_getLs:function(){this._ls||(this._ls=new F);return this._ls}},ca={encode:function(a){var b=[],c;var d=0;for(c=a.length;d<c;d++){var e=a.charCodeAt(d);128>e?b.push(e):(127<e&&2048>e?b.push(e>>6|192):(b.push(e>>12|224),b.push(e>>6&63|128)),b.push(e&63|128))}return b},decode:function(a){for(var b="",c=0,d,e,f;c<a.length;)d=
a.charCodeAt(c),128>d?(b+=String.fromCharCode(d),c++):191<d&&224>d?(e=a.charCodeAt(c+1),b+=String.fromCharCode((d&31)<<6|e&63),c+=2):(e=a.charCodeAt(c+1),f=a.charCodeAt(c+2),b+=String.fromCharCode((d&15)<<12|(e&63)<<6|f&63),c+=3);return b}};M.decode=function(a,b){for(var c=M.abc+(b?M.tailSafe:M.tail),d=0,e="",f,g,h,k,m;a.length%4;)a+="\x3d";do{f=c.indexOf(a.charAt(d++));g=c.indexOf(a.charAt(d++));k=c.indexOf(a.charAt(d++));m=c.indexOf(a.charAt(d++));if(0>f||0>g||0>k||0>m)return null;h=f<<18|g<<12|
k<<6|m;f=h>>16&255;g=h>>8&255;h&=255;e=64==k?e+String.fromCharCode(f):64==m?e+String.fromCharCode(f,g):e+String.fromCharCode(f,g,h)}while(d<a.length);return e};ia.parse=function(a){try{return JSON.parse(a)}catch(b){return null}};var da=N.inherit({hitId:0,trackHash:!1,trimParams:!1,webvisor:!1,counter:null,counterNum:0,resource:"watch",retry:!0,postParams:["site-info"],countersNoTitle:"22836271 1143050 29626870 9928105 26128362 29850769".split(" "),fake:!1,sendTitle:!0,_initComponent:function(){da.superclass._initComponent.apply(this,
arguments);this._trackHash=this.trackHash;"0"===""+this.counterType&&(this.sendTitle=-1===f.arrayIndexOf(this.countersNoTitle,""+this.counterId))},setTrackHash:function(a){this._trackHash=a},sendHit:function(a){this._hitExt({url:a.url,title:a.title,referrer:a.referrer,vParams:a.vParams,modes:{ar:!0,saveRef:!0,pv:!0},callback:a.callback,ctx:a.ctx})},sendExperiments:function(a){this._hitExt({url:x().href,title:"",referrer:"",modes:{ex:!0,ar:!0},experiments:a.experiments,callback:a.callback,ctx:a.ctx})},
sendPrerenderHit:function(a){this._hitExt({url:a.urln(a,b){return Object.prototype.hasOwnProperty.call(a,b)};b.p="";return b(b.s=3)})({0:function(a,b,c){b.__esModule=!0;b.listToArray=function(a){return a?[].slice.call(a):[]}},1:function(a,b,c){b.__esModule=!0;var d=[".googlesyndication.com/","/googleads"];b.isGoogleSrc=function(a){return!(!a||!d.filter(function(b){return 0<a.indexOf(b)}).length)}},3:function(a,b,c){b.__esModule=!0;a={detectAd:c(4).detectAd};g.Ya?g.Ya.AdDetector?a=g.Ya.AdDetector:
g.Ya.AdDetector=a:g.Ya={AdDetector:a};b.AdDetector=a},34:function(a,b,c){b.__esModule=!0;b.getParentElementsCount=function(a){for(var b=0;;)if(a=a.parentElement)b++;else return b}},4:function(a,b,c){b.__esModule=!0;var d=c(5),e=c(9),f=c(34),k=c(6),m=h.body,q=h.documentElement;b.detectAd=function(){var a=g.pageYOffset||q.scrollTop||m.scrollTop,b=g.pageXOffset||q.scrollLeft||m.scrollLeft,c=q.clientTop||m.clientTop||0,h=q.clientLeft||m.clientLeft||0,l=q.scrollWidth||q.offsetWidth||g.innerWidth,n=q.scrollHeight||
q.offsetHeight||g.innerHeight,r=k.getFrienlyWindowsTree(g),u=[];k.windounction(a){return-1===w.indexOf(a)}));c("adriver",k.filter(function(a){return(a=a.src)&&-1<a.indexOf(".adriver.ru/")}));c("adfox",k.filter(function(a){return(a=a.id)&&-1<a.toLowerCase().indexOf("adfox")}));c("adfox",h.filter(function(a){return(a=a.src)&&-1<a.indexOf("/banners.adfox.ru/")}));c("adfox",m.filter(function(a){return-1<a.id.indexOf("AdFox_banner_")}));f&&h.filter(function(a){return(a=a.src)&&-1<a.indexOf(".adfox.ru/")}).length&&
q.push("adfox");k.filter(function(a){return e.isGoogleSrc(a.src)}).forEach(function(a){n.push({provider:"google",element:a})});f&&l.filter(function(a){return e.isGoogleSrc(a.src)}).length&&q.push("google");c("awaps",k.filter(function(a){return(a=a.src)&&-1<a.indexOf("awaps.yandex.net/")}));c("criteo",k.filter(function(a){var b=a.src;a=a.id;return b&&(-1<b.indexOf(".criteo.com/")||a&&-1<a.indexOf("cto_iframe_"))?!0:!1}));return{adElements:n,iframeProviders:q}}}})},"",!0)();var Nb={init:function(a,
b){if(Math.random()<(b||.005)&&!w.get("adDetect")){w.set("adDetect",!0);var c=function(b){var c=g.Ya.AdDetector.detectAd();var d=c.window;var e=c.page;a.sendParams({__ym:{ads:{w:{t:d.top,l:d.left,w:d.width,h:d.height},p:{w:e.width,h:e.height},a:f.map(function(a){return{t:a.top,l:a.left,w:a.width,h:a.height,p:a.provider}},c.ads),full:b?1:0}}})};var d=u(function(){k.un(g,"load",d);c(!0)},"",!0);k.on(g,"load",d);g.setTimeout(u(c,"setTimeout",!0),1E4)}}};U.parse=function(a,b){var c={},d;a=a&&a.replace(/^\?/,
"")||"";if(a.length){var e=a.split("\x26");for(d=0;d<e.length;d++)if(e[d]){var g=e[d].split("\x3d");if(g[0]){var h=f.safeDecodeURIComponent(g[0]);g=f.safeDecodeURIComponent((g[1]||"").replace(/\+/g,"%20"));b&&h in c?f.isArray(c[h])?c[h].push(g):c[h]=[c[h],g]:c[h]=g}}}return c};var V=[],D=x(),ua=G.getTimezone(),va=G.getTimestamp(),aa=g.screen,Eb=64,pa=q.isIE()?512:2048,Fb=q.isIE()?512:2048,eb=q.isIE()?100:400,hb=100,Ja="noindex",lb=/\.(3gp|7z|aac|ac3|acs|ai|avi|ape|apk|asf|bmp|bz2|cab|cdr|crc32|css|csv|cue|divx|dmg|djvu?|doc(x|m|b)?|emf|eps|exe|flac?|flv|iso|swf|gif|t?gz|jpe?g?|js|m3u8?|m4a|mp(3|4|e?g?)|m4v|md5|mkv|mov|msi|ods|og(g|m|v)|psd|rar|rss|rtf|sea|sfv|sit|sha1|svg|tar|tif?f|torrent|ts|txt|vob|wave?|wma|wmv|wmf|webm|ppt(x|m|b)?|xls(x|m|b)?|pdf|phps|png|xpi|g?zip)$/i,
Ob=+new Date,La,ka,X="917";w.init().setSafe("counters",{}).setSafe("hitParam",{}).setSafe("counterNum",0).setSafe("hitId",f.random(1,1073741824)).setSafe("_globalMetrikaHitId",f.random()).setSafe("v",X);g.Ya.Metrika=function(a,b,c,d){var e=this;return u(function(){function l(l){var v=!1;if(w.get("hitParam")[ha]){if(1!=c||w.get("counters")[ha])return!1;v=!0}w.get("counters")[ha]=e;w.get("hitParam")[ha]=1;e._webvisor=z&&z.webvisor||!1;e._directCampaign=z&&z.directCampaign;z&&z.trackHash&&J(!0);if(!v){var K=
new fb({protocol:"https:",globalConfig:w,counterId:a,counterType:c,hid:la,tz:ua,ts:va,url:D.href,enabled:e._webvisor});e.replacePhones();v=new ib({globalConfig:w});var p=function(v){var n=new Ka({protocol:"https:",counterType:c,counterId:a,trackHash:Y,hitId:la,webvisor:e._webvisor,counter:e,globalConfig:w,counterNum:oa}),L={ut:T,he:z?~~z.httpError:0,ad:1==c&&g.Ya&&g.Ya.Direct,pv:!0,cpf:q.isChromePdf(),saveRef:!0};La=+new Date;n.sendHit({url:ma,referrer:X,title:m.getDocumentTitle(),vParams:b,userParams:Z,
nohit:d,experiments:aa,modes:L,visitColor:K.getVc(),hasPrerender:l,ts:va,tz:ua,callback:function(d,l){d=d||{};var m="0"!==d.pcs;ea.init(l);Mb.match();Jb.sync(a,c,m,w);fa.log("PageView. Counter ",a,". URL: ",D.href,". Referrer: "+h.referrer,". Params: ",b);ka||(ka=+new Date);K.start(d.webvisor);var n=d.mp2;m=new F({counterId:a});m.erase("mp2_substs");if(n){b:{var L=n.conditions;var p;if(L&&L.length)for(p=0;p<L.length;p++){var q=L[p];if("ref"==q.type)q=Ab(q);else if("adv"==q.type){var r;var P=q;var u=
Ya._metrika.counter._directCampaign;var t=P.ServiceNamePattern;var ba=P.RefererPattern;q=u?P.direct_orders:P.direct_camp;var qa=h.referrer,z=U.parse(D.search),A=Bb(D.search,D.hash),B={};var x=["source","medium","campaign","term","content"];for(r=0;r<x.length;r++)z["utm_"+x[r]]&&(B[x[r]]=z["utm_"+x[r]]);var C=u?"direct.yandex.ru":A&&A.service||B.source;r=!1;if(!r&&t&&t.length)for(x=0;x<t.length;x++)if((new RegExp(t[x],"i")).test(C)){r=!0;break}if(!r&&!P.yandex_direct&&ba&&ba.length)for(t=0;t<ba.length;t++)if((new RegExp(ba[t],
"i")).test(qa)){r=!0;break}!r&&P.google_adwords&&z.gclid&&(r=!0);if(r&&q&&q.length&&(r=!1,u=u||A&&A.campaign||B&&B.campaign))for(P=0;P<q.length;P++)if(q[P]==u){r=!0;break}q=r}else q=!1;if(q){L[p].track_id&&m.create("mp2_track",L[p].track_id,43200);break b}}}L=m.read("mp2_track");n=n.substs&&n.substs[L];L&&n?(m.create("mp2_substs",f.toJSON(n)),m=ab(n),e.params("__ym",m?"mp_trackid":"mp_trackid_bad",L)):bb()}else bb();k.on(g,"load",e.replacePhones,e);e._inited=!0;v&&v()}})};v.sync(p)}r();z&&(z.enableAll?
(n(!0),t(!0),A()):(z.clickmap&&t(z.clickmap),z.trackLinks&&n(z.trackLinks),z.accurateTrackBounce&&A(z.accurateTrackBounce)),(z.ecommerce||z.useDataLayer)&&new kb({counter:e,prefsEcommerce:z.ecommerce}),z.triggerEvent&&f.async(function(){C.dispatchCustomEvent("yacounter"+a+"inited")}))}function n(a){var b={};switch(typeof a){case "string":b.on=!0;break;case "object":b.on=!0;break;case "boolean":b.on=a;break;default:return}e._trackLinks=b}function r(){n(!1);k.on(h,"click",function(a){e._trackLinks&&
e._trackLinks.on&&H(a)})}function H(a){var b=vb(a),c;if(b){a=!1;var d=(c=""+b.href)?c.split(/\?/)[0]:"";var e=function(a){var d=Xa(b);R.sendClickLink({url:c,title:c==d?"":d,modes:a})};if(lb.test(d)||lb.test(c)||Za(c,B)||Za(d,B))a=!0;var g=m.classNameExists(b,"ym-disable-tracklink");d=m.classNameExists(b,"ym-external-link");g||(g={ln:!0,dl:a},d?e(g):(d=b.hostname||f.parseUrl(b.href).hostname||"",wb(x().hostname,d)?a?(g.ln=!1,e(g)):(a=Xa(b))&&a!=c&&I.set("il",f.trim(a,hb)):c&&-1!=c.search(/^ *(data|javascript):/i)||
(g.ut=Ja,e(g))))}}function t(b){"undefined"==typeof b&&(b=!0);!0===b&&(b={});e._clickmap&&e._clickmap.destroy();b&&(e._clickmap=new Lb({globalConfig:w,filter:b.filter,ignoreTags:b.ignoreTags,quota:b.quota,isTrackHash:b.isTrackHash,protocol:"https:",counterId:a,counterType:c,startTime:Ob}))}function p(a,b){function c(){if(!r){p&&f.clearTimeout(p);var c=m?K:K+ +new Date-n;c=b-c;0>c&&(c=0);p=f.setTimeout(function(){r=!0;e(!1);a()},c,"trackUserTime")}}function d(){l||(v=!0,m=!1,l=!0,c())}function e(a){var b;
for(b=0;b<t.length;b+=3)if(a)k.on(t[b],t[b+1],t[b+2]);else k.un(t[b],t[b+1],t[b+2])}var v=!1,l=!1,m=!0,K=0,n=+new Date,p=null,r=!1;if(q.isIE())f.setTimeout(a,b,"trackUserTime");else{var t=[g,"blur",function(){m=v=l=!0;K+=+new Date-n;n=+new Date;c()},g,"focus",function(){v||l||(K=0);n=+new Date;v=l=!0;m=!1;c()},h,"click",d,h,"mousemove",d,h,"keydown",d,h,"scroll",d];e(!0);c()}}function A(b){"number"!=typeof b&&(b=15E3);if(!e._isAccurateTrackBounce){e._isAccurateTrackBounce=!0;var c=new Q({counterId:a});
var d=c.get("lastHit");c.set("lastHit",+new Date);((c=c.get("lastHit"))&&(!d||d<c-18E5)||!xb(h.referrer,x().href)||.1>Math.random())&&p(function(){e.notBounce()},b)}}function G(a){var b=function(){var a=x().hash.split("#")[1];if("undefined"==typeof a)return!1;var b=a.indexOf("?");0<b&&(a=a.substring(0,b));return a};var c=b();(function ba(){var d=b();d!==c&&(a(),c=d);pa=f.setTimeout(ba,200,"trackHash")})()}function J(a){if(!1===a)Y&&("onhashchange"in g?k.un(g,"hashchange",M):f.clearTimeout(pa),Y=!1);
else if(a=M,!Y){if("onhashchange"in g)k.on(g,"hashchange",a);else G(a);Y=!0}R.setTrackHash(Y);e._trackHash=Y}function M(){var a={ut:T,ad:1==c&&g.Ya&&g.Ya.Direct,wh:!0,saveRef:!0,pv:!0};V=ja.lastReferrer=W;R.sendAjaxHit({url:x().href,title:m.getDocumentTitle(),referrer:V,modes:a});W=x().href}function S(a,b,c){a=xa.parseValidate(a,b);b=[];a&&(b.push(a),c=c||{},f.isFunction(c.callback)&&(b.push(c.callback),c.ctx&&b.push(c.ctx)));b.length&&e.params.apply(e,b)}var T="",V="",W=ja.lastReferrer=D.href;w.setSafe("counter",
e);if("object"==typeof a){var z=a;d=a.defer;T=a.ut;c=a.type;b=a.params;var Z=a.userParams;var aa=z.experiments;var ca=z.nck;var ma=a.url;var X=a.referrer;a=a.id}(function(a){if(g.performance&&"function"===typeof performance.getEntries&&(a===O&&(a=1),!(Math.random()>=a))){a={1882689622:1,2318205080:1,3115871109:1,3604875100:1,339366994:1,2890452365:1,849340123:1,173872646:1,2343947156:1,655012937:1,1996539654:1,2065498185:1,823651274:1,12282461:1,1555719328:1,1417229093:1,138396985:1};var b=performance.getEntries(),
c={},d;for(d=0;d<b.length;d++){var e=b[d];var h=e.name.replace(/^https?:\/\//,"").split("?")[0];var k=f.fnv32a(h);a[k]&&!c[h]&&(c[h]={dns:Math.round(e.domainLookupEnd-e.domainLookupStart),tcp:Math.round(e.connectEnd-e.connectStart),duration:Math.round(e.duration),response:Math.round(e.responseEnd-e.requestStart),pages:D.href})}f.keys(c).length&&(new ga).logParams({timings8:c})}})(24226447==a?1:.002);ma=ma?ma:D.href;X=X?X:h.referrer;a=a||0;/^\d+$/.test(a)||(a=0);c=c||0;var ha=a+":"+c;if(w.get("counters")[ha])return w.get("counters")[ha];
var la=w.get("hitId");w.set("counterNum",w.get("counterNum")+1);var oa=w.get("counterNum");ca||(N.initCookie(),db.init(w));N.retransmit(w);var R=new da({protocol:"https:",counterType:c,counterId:a,hitId:la,counter:e,globalConfig:w,counterNum:oa});e.replacePhones=u(function(){var b,c;try{(b=(new F({counterId:a})).read("mp2_substs"))&&(c=ia.parse(b))&&ab(c,!0)}catch(L){}return e},"counter.replacePhones");e.reachGoal=u(function(b,c,d,f){2<=arguments.length&&"function"===typeof c&&(f=d,d=c,c=O);fa.log("Reach goal. Counter: "+
a+". Goal id: "+b+". Params: ",c);R.sendGoal(b,{vParams:c,callback:d,ctx:f});return e},"counter.reachGoal");e.trackLinks=u(function(a){n(a);return e},"counter.trackLinks");var I=new Q({counterId:a});e.hit=u(function(b,c,d,g,h,k){b?(f.isObject(c)&&(d=c.referer,g=c.params,h=c.callback,k=c.ctx,c=c.title),fa.log("PageView. Counter "+a,". URL: "+b,". Referrer: "+d,". Params: ",g),R.sendHit({url:b,title:c,referrer:d,vParams:g,callback:h,ctx:k})):f.warning("Empty hit url");return e},"counter.hit");e.params=
u(function(b){var c=arguments.length,d=c,g=[].slice.call(arguments,0);if(b){if(1<arguments.length){if(f.isFunction(arguments[c-1])){var h=arguments[c-1];d=c-1}else if(f.isFunction(arguments[c-2])){h=arguments[c-2];var k=arguments[c-1];d=c-2}g=[].slice.call(g,0,d);1<g.length&&(g=[f.array2Props(g)])}fa.log("User params. Counter "+a+". Params: ",g[0]);R.sendParams(g[0],h,k)}else f.warning("Wrong params");return e},"counter.params");e.file=u(function(a,b){a?(b=b||{},R.sendFileUpload({url:a,title:b.title,
vParams:b.params,callback:b.callback,ctx:b.ctx})):f.warning("Empty file url");return e},"counter.file");e.extLink=u(function(a,b){a?(b=b||{},R.sendExtLink({url:a,title:b.title,vParams:b.params,callback:b.callback,ctx:b.ctx})):f.warning("Empty link");return e},"counter.extLink");e.notBounce=u(function(a){var b=0;a=a||{};La&&ka&&(b=ka-La);R.sendNotBounce(b,{callback:a.callback,ctx:a.ctx});return e},"counter.notBounce");var B=[];e.addFileExtension=function(a){if(!a)return f.warning("Empty extension"),
e;"string"==typeof a?B.push(a):B=B.concat(a);return e};e.clickmap=function(a){t(a);return e};e.accurateTrackBounce=function(a){A(a);return e};var pa=null;var Y=!1;e.trackHash=function(a){J(a);return e};var xa={requiredEcommerceFields:["currency","goods"],parseValidate:function(a,b){var c=this.validate(a,b),d;if(!c.isValid)return console&&console.log(c.message),!1;c={};c[a]={};b.currency&&(c.currencyCode=b.currency);b.goods&&(c[a].products=b.goods);for(d in b)b.hasOwnProperty(d)&&-1===f.arrayIndexOf(this.requiredEcommerceFields,
d)&&(c[a].actionField||(c[a].actionField={}),c[a].actionField[d]=b[d]);return{__ym:{ecommerce:[c]}}},validate:function(a,b){var c=!1,d="";if(f.isObject(b))switch(a){case "detail":case "add":case "remove":f.isArray(b.goods)&&b.goods.length?(c=f.arrayEvery(b.goods,function(a){return f.isObject(a)&&(f.isString(a.id)||f.isNumber(a.id)||f.isString(a.name)||f.isString(a.name))}))||(d="All items in 'goods' should be objects and contain 'id' or 'name' field"):d="Ecommerce data should contain 'goods' non-empty array";
break;case "purchase":f.isNumber(b.id)||f.isString(b.id)?c=!0:d="Purchase object should contain string or number 'id' field"}else d="Ecommerce data should be an object";return{isValid:c,message:d}}};e.ecommerceDetail=u(function(a,b){S("detail",a,b);return e},"ecommerce.detail");e.ecommerceAdd=u(function(a,b){S("add",a,b);return e},"ecommerce.add");e.ecommerceRemove=u(function(a,b){S("remove",a,b);return e},"ecommerce.remove");e.ecommercePurchase=u(function(a,b){S("purchase",a,b);return e},"ecommerce.purchase");
e.userParams=u(function(a,b,c){f.isObject(a)?e.params({__ymu:a},b||function(){},c):f.warning("Wrong user params");return e},"uparams");e.experiments=u(function(a,b,c){R.sendExperiments({callback:b,ctx:c,experiments:a});return e},"exps");e.id=e.setUserID=u(function(a,b,c){f.isString(a)||f.isNumber(a)?e.params({__ym:{user_id:a}},b||function(){},c):f.warning("Incorrect user ID");return e},"id");var Ea=new F;e.getClientID=u(function(){return Ea.read("uid")},"guid");e.enableAll=function(){n(!0);t(!0);
A();return e};e.uploadPage=function(){};Nb.init(R);e._performanceTiming=$a;if(a)if("prerender"==h.webkitVisibilityState){R.sendPrerenderHit({url:D.href,title:m.getDocumentTitle(),referrer:h.referrer});var wa=function(){"prerender"!=h.webkitVisibilityState&&(k.un(h,"webkitvisibilitychange",wa),l(!0))};k.on(h,"webkitvisibilitychange",wa)}else l(!1)},"init")()};new jb({globalConfig:w});g.Ya.Metrika.counters=function(){var a=[];f.forEachKey(w.get("counters"),function(b,c){var d=b.split(":");a.push({id:+d[0],
type:+d[1],accurateTrackBounce:c._isAccurateTrackBounce,clickmap:c._clickmap&&c._clickmap._start,oldCode:!!g.ya_cid,trackHash:!!c._trackHash,trackLinks:c._trackLinks&&c._trackLinks.on,webvisor:!!c._webvisor})});return a};w.setSafe("getCounters",function(){var a=[];f.forEachKey(w.get("counters"),function(b,c){var d=b.split(":");a.push({id:+d[0],type:+d[1],accurateTrackBounce:c._isAccurateTrackBounce,clickmap:c._clickmap&&c._clickmap._start,oldCode:!!g.ya_cid,trackHash:!!c._trackHash,trackLinks:c._trackLinks&&
c._trackLinks.on,webvisor:!!c._webvisor})});return a});g.ya_cid&&Ya.Metrika&&new Ya.Metrika(g.ya_cid,g.ya_params,g.ya_class);g.ya_cid&&!g.ya_hit&&(g.ya_hit=function(a,b){Ya._metrika.counter&&Ya._metrika.counter.reachGoal(a,b)});(function(){function a(a){try{delete g[a]}catch(l){g[a]=O}}var b=g.yandex_metrika_callback,c=g.yandex_metrika_callbacks,d;"function"==typeof b&&b();if("object"==typeof c)for(b=0;b<c.length;b++)if(d=c[b])c[b]=null,d();a("yandex_metrika_callback");a("yandex_metrika_callbacks")})();
g.Ya.Metrika.informer=function(a){var b=!!Ya.Metrika._informer;Ya.Metrika._informer=a;b||m.loadScript({src:"https://informer.yandex.ru/metrika/informer.js"})};k.on(h,"click",u(function(a){var b=C.getTarget(a);if(b&&"ym-advanced-informer"==b.className){var c=b.getAttribute("data-lang");var d=b.getAttribute("data-cid");Ya.Metrika.informer({i:b,id:+d,lang:c});C.prevent(a)}},"adv-inf"),null,{passive:!1})})(this,this.document);
