"%","com");wc(e,d.google,c);var w=a.substring(2);if(w)if(/^[a-z.]{1,6}$/.test(w)){var ha="https://www.google.%/ads/ga-audiences".replace("%",w);wc(ha,d.google,ua)}else ge("tld","bcc",w)}else ge("xhr","brc",b),c()}}catch(ue){ge("xhr","rsp"),c()}else c();g=null}};g.send(b);return!0},x=function(a,b,c){return O.navigator.sendBeacon?O.navigator.sendBeacon(a,b)?(c(),!0):!1:!1},ge=function(a,b,c){1<=100*Math.random()||G("?")||
(a=["t=error","_e="+a,"_v=j66","sr=1"],b&&a.push("_f="+b),c&&a.push("_m="+K(c.substring(0,100))),a.push("aip=1"),a.push("z="+hd()),wc(oe()+"/collect",a.join("&"),ua))};var h=function(a){var b=O.gaData=O.gaData||{};return b[a]=b[a]||{}};var Ha=function(){this.M=[]};Ha.prototype.add=function(a){this.M.push(a)};Ha.prototype.D=function(a){try{for(var b=0;b<this.M.length;b++){var c=a.get(this.M[b]);c&&ea(c)&&c.call(O,a)}}catch(d){}b=a.get(Ia);b!=ua&&ea(b)&&(a.set(Ia,ua,!0),setTimeout(b,10))};function Ja(a){if(100!=a.get(Ka)&&La(P(a,Q))%1E4>=100*R(a,Ka))throw"abort";}function Ma(a){if(G(P(a,Na)))throw"abort";}function Oa(){var a=M.location.protocol;if("http:"!=a&&"https:"!=a)throw"abort";}
function Pa(a){try{O.navigator.sendBeacon?J(42):O.XMLHttpRequest&&"withCredentials"in new O.XMLHttpRequr nb=S("language","ul"),ob=S("encoding","de");S("title","dt",function(){return M.title||void 0});cb("contentGroup([0-9]+)",function(a){return new bb(a[0],"cg"+a[1])});var pb=S("screenColors","sd"),qb=S("screenResolution","sr"),rb=S("viewportSize","vp"),sb=S("javaEnabled","je"),tb=S("flashVersion","fl");S("campaignId","ci");S("campaignName","cn");S("campaignSource","cs");
S("campaignMedium","cm");S("campaign0]+"."+e[1]+" r"+e[2]);return ,b].join("."):""},Xd=function(a,b){return na(b,P(a,W),P(a,Yb))},na=function(a,b,c){if(!a||1>a.length)J(12);else{for(var d=[],e=0;e<a.length;e++){var g=a[e];var ca=g.split(".");var l=ca.shift();("GA1"==l||"1"==l)&&1<ca.length?(g=ca.shift().split("-"),1==g.length&&(g[1]="1"),g[0]*=1,g[1]*=1,ca={H:g,s:ca.join(".")}):ca=kd.test(g)?{H:[0,0],s:g}:void 0;ca&&d.push(ca)}if(1==d.length)return J(13),d[0].s;if(0==d.length)J(12);else{J(14);
d=Gc(d,lc(b).split(".").length,0);if(1==d.length)return d[0].s;d=Gc(d,jc(c),1);1<d.length&&J(41);return d[0]&&d[0].s}}},Gc=function(a,b,c){for(var d=[],e=[],g,ca=0;ca<a.length;ca++){var l=a[ca];l.H[c]==b?d.push(l):void 0==g||l.H[c]<g?(e=[l],g=l.H[c]):l.H[c]==g&&e.push(l)}return 0<d.length?d:e},lc=function(a){return 0==a.indexOf(".")?a.substr(1):a},id=function(){var a=[],b=xa().split(".");if(4==b.length){var c=b[b.length-1];if(parseInt(c,10)==c)return["none"]}for(c=b.length-2;0<=c;c--)a.push(b.slice(c).join("."));
a.push("none");return a},kc=function(a){if(!a)return"/";1<a.length&&a.lastIndexOf("/")==a.length-1&&(a=a.substr(0,a.length-1));0!=a.indexOf("/")&&(a="/"+a);return a},jc=function(a){a=kc(a);return"/"==a?1:a.split("/").length},le=function(a){a.ta&&J(77);a.na&&J(74);a.pa&&J(73);a.ua&&J(69)};function Xc(a,b,c){"none"==b&&(b="");var d=[],e=Ca(a);a="__utma"==a?6:2;for(var g=0;g<e.length;g++){var ca=(""+e[g]).split(".");ca.length>=a&&d.push({hash:ca[0],R:e[g],O:ca})}if(0!=d.length)return 1==d.length?d[0]:Zc(b,d)||Zc(c,d)||Zc(null,d)||d[0]}function Zc(a,b){if(null==a)var c=a=1;else c=La(a),a=La(D(a,".")?a.substring(1):"."+a);for(var d=0;d<b.length;d++)if(b[d].hash==c||b[d].hash==a)return b[d]};var od=new RegExp(/^https?:\/\/([^\/:]+)/),pd=/(.*)([?&#])(?:_ga=[^&#]*)(?:&?)(.*)/,me=/(.*)([?&#])(?:_gac=[^&#]*)(?:&?)(.*)/;function Bc(a){var b=a.get(Q),c=a.get(I)||"";b="_ga=2."+K(pa(c+b,0)+"."+c+"-"+b);if((c=a.get(ce))&&a.get(je)){var d=R(a,fe);1E3*d+R(a,he)<=(new Date).getTime()?(J(76),a=""):(J(44),a="&_gac=1."+K([pa(c,0),d,c].join(".")))}else a="";return b+a}
function Ic(a,b){var c=new Date,d=O.navigator,e=d.plugins||[];a=[a,d.userAgent,c.getTimezoneOffset(),c.getYear(),c.getDate(),c.getHours(),c.getMinutes()+b];for(b=0;b<e.length;++b)a.push(e[b].description);return La(a.join("."))}function pa(a,b){var c=new Date,d=O.navigator,e=c.getHours()+Math.floor((c.getMinutes()+b)/60);return La([a,d.userAgent,d.language||"",c.getTimezoneOffset(),c.getYear(),c.getDate()+Math.floor(e/24),(24+e)%24,(60+c.getMinutes()+b)%60].join("."))}
var Dc=function(a){J(48);this.target=a;this.T=!1};Dc.prototype.ca=function(a,b){if(a.tagName){if("a"==a.tagName.toLowerCase()){a.href&&(a.href=qd(this,a.href,b));return}if("form"==a.tagName.toLowerCase())return rd(this,a)}if("string"==typeof a)return qd(this,a,b)};
var qd=function(a,b,c){var d=pd.exec(b);d&&3<=d.length&&(b=d[1]+(d[3]?d[2]+d[3]:""));(d=me.exec(b))&&3<=d.length&&(b=d[1]+(d[3]?d[2]+d[3]:""));a=a.target.get("linkerParam");var e=b.indexOf("?");d=b.indexOf("#");c?b+=(-1==d?"#":"&")+a:(c=-1==e?"?":"&",b=-1==d?b+(c+a):b.substring(0,d)+c+a+b.substring(d));b=b.replace(/&+_ga=/,"&_ga=");return b=b.replace(/&+_gac=/,"&_gac=")},rd=function(a,b){if(b&&b.action)if("get"==b.method.toLowerCase()){a=a.target.get("linkerParam").split("&");for(var c=0;c<a.length;c++){var d=
a[c].split("="),e=d[1];d=d[0];for(var g=b.childNodes||[],ca=!1,l=0;l<g.length;l++)if(g[l].name==d){g[l].setAttribute("value",e);ca=!0;break}ca||(g=M.createElement("input"),g.setAttribute("type","hidden"),g.setAttribute("name",d),g.setAttribute("value",e),b.appendChild(g))}}else"post"==b.method.toLowerCase()&&(b.action=qd(a,b.action))};
Dc.prototype.S=function(a,b,c){function d(c){try{c=c&&zc(aH(ca.domainLookupEnd-ca.domainLookupStart),bn:H(l.domainLookupEnd-l.domainLookupStart),ac:H(ca.connectEnd-ca.connectStart),bc:H(l.connectEnd-l.connectStart),as:d};d=[];d.push("_v=j66");d.push("id=10");for(var w in k)k.hasOwnProperty(w)&&d.push(w+"="+K(k[w]));d.push("z="+hd());wc("https://www.google-analytics.com/u/d",d.join("&"),ua)}}catch(ha){}})}};var wb=/^(UA|YT|MO|GP)-(\d+)-(\d+)$/,pc=function(a){function b(a,b){d.b.data.set(a,b)}function c(a,c){b(a,c);d.filters.add(a)}var d=this;this.b=new Ya;this.filters=new Ha;b(V,a[V]);b(Na,sa(a[Na]));b(U,a[U]);b(W,a[W]||xa());b(Yb,a[Yb]);b(Zb,a[Zb]);b(Hd,a[Hd]);b($b,a[$b]);b(Wc,a[Wc]);b(bc,a[bc]);b(cc,a[cc]);b(Ka,a[Ka]);b(dc,a[dc]);b(ec,a[ec]);b(ac,a[ac]);b(Ad,a[Ad]);b(n,a[n]);b(Kd,a[Kd]);b(je,a[je]);b(hb,1);b(ib,"j66");c(Qb,Ma);c(oa,ua);c(dd,cd);c(Rb,Oa);c(md,vb);c(Sb,nc);c(Uc,Yc);c(Tb,Ja);c(Vb,Ta);
