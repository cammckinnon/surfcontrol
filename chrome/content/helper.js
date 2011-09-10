function is_undefined (o) {
  if (o == '' || o == null || typeof o == "undefined") 
    return true;
  else if (typeof o == "string" && (o.search('localhost') != -1 || o.search('about:') != -1 || o.search('surfcontrol/content') != -1))
    return true;
  else
    return false;
}

function revertFormat (s) {
  s = s.toString();
  return s.substring(0,4)+'-'+s.substring(4,6)+'-'+s.substring(6,8);
}

function getMainDomain (url) {
  /* begin private browsing mode compliance */
  var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]  
                      .getService(Components.interfaces.nsIPrivateBrowsingService);  
  if (pbs.privateBrowsingEnabled){
    //if in private browsing mode, never store the domain name
    return '';
  }
  /* end private browsing mode compliance */
  var matches = url.match(/^.*?\/\/.*?(?:www\.)?(([^.]+?\.){1,2}(co\.)?[^.]+?)(?:\/)/);
  if (matches==null)
    matches = url.match(/^.*?\/\/.*?(?:www\.)?(([^.]+?\.){1,2}(co\.)?[^.]+)/);
  if (matches != null)
    return matches[1].toLowerCase();
}

function getPreviousDate (negative_offset) {
  var d = new Date();
  d.setDate(d.getDate() - negative_offset);

  return getFormattedDate(d);
}

function getTodayDate () {
  return getFormattedDate(new Date());
}

// returns a date in yyyymmdd format
function getFormattedDate (date) {
  var dd = date.getDate(); 
  var mm = date.getMonth()+1;//January is 0! 
  var yyyy = date.getFullYear().toString(); 
  if(dd<10){dd='0'+dd} 
  if(mm<10){mm='0'+mm} 
  return yyyy+mm+dd;
}

function getCurrentTimestamp () { var tstamp = new Date().getTime(); return parseInt(tstamp); }
function appendErro(str){ throw new Error("DEBUG: "+str) }
function li(str) { setTimeout(function(){appendErro(str)}, 1) }
