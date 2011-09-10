var current_domain = '';
var current_ref = '';
var max_inactive_time = 10000;  // 10 seconds
var last_active = getCurrentTimestamp();
var url_history = new Array();
var intervalTime = 1000;  // 1 second
var inactive = false;

var surfcontrol = {
  onLoad: function() {

    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("surfcontrol-strings");  

    dbConnect();  // connect to db
    dbCreateTables();  // call db initiator
    url_history = dbPopulate(); // populate

    setTimeout("oneSecondCheck()", intervalTime);
  },

  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    openDashboard();
  },
  clearSurfControlData : function(e){
//    console.log(gBrowser.contentDocument);
    if (confirm("Are you sure you want to delete all your SurfControl Data?\n\nAfter this operation, all charts and tables in the SurfControl dashboard will be empty.\n\nClick OK if this is what you want.")){
      rmrfstar();
      alert("All SurfControl data has been deleted.")
    }
  },

  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    surfcontrol.onMenuItemCommand(e);
  }
};

function openDashboard () {
    var w = getTopWin();
    w.loadURI("chrome://surfcontrol/content/ui/index.html");
}

function toolbarButtonAction (type) {
    var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]  
                        .getService(Components.interfaces.nsIPrivateBrowsingService);  
    if (pbs.privateBrowsingEnabled){
      //if in private browsing mode, never store the domain name
      alert("You're in private browsing mode.\n\nTo respect your privacy, SurfControl cannot save the rating you just selected. Please exit private browsing mode and try again.")
      return;
    }
    var currentTab = gBrowser.contentDocument;
    var domain = getMainDomain(currentTab.location.href);
    var profileExists = dbDomainProfileExists(domain);
    
    // insert/update our new select
    if (!profileExists) 
      dbProfileInsert(domain, type);
    else    
      dbProfileUpdate(domain, type);

    if (type == 'good') {
      var toolbar_button = document.getElementById('surfcontrol-thumbs-up'); 
      var other_toolbar_button = document.getElementById('surfcontrol-thumbs-down');
    } else if (type == 'bad') {
      var toolbar_button = document.getElementById('surfcontrol-thumbs-down'); 
      var other_toolbar_button = document.getElementById('surfcontrol-thumbs-up');
    }

    // enable other button and disable the one that was just selected
    if (!is_undefined(domain)){
      other_toolbar_button.removeAttribute('disabled');
      toolbar_button.disabled = "true";
    }
}

function oneSecondCheck() {
  var current_time = getCurrentTimestamp();

  // check activity
  if (current_time-last_active > max_inactive_time)
    inactive = true;
  else
    inactive = false;
  
  if (!inactive) {
    // increment counter
    initializeNewDomain(current_domain);

    url_history[current_domain] += intervalTime;

    // add to db
    var insertedToday = dbDomainInsertedToday(current_domain);

    if (insertedToday)
        dbUpdate(current_domain, url_history[current_domain]);
    else
        dbInsert(current_domain, url_history[current_domain]);

    if (!is_undefined(current_domain) && !is_undefined(current_ref)) {
      if ((current_ref != current_domain) && (current_ref.search(current_domain) == -1) && (current_domain.search(current_ref) == -1)) {
        if (dbDomainReferrerExists(current_ref, current_domain)) {
          dbReferrerUpdate(current_ref, current_domain, intervalTime);
        } else {
          dbReferrerInsert(current_ref, current_domain, intervalTime);
        }
      }
    }
  }

  setTimeout("oneSecondCheck()", intervalTime);
}

const STATE_START = Components.interfaces.nsIWebProgressListener.STATE_START;
const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;
var myListener =
{

  onLocationChange: function(aProgress, aRequest, aURI)
  {
    var w = getTopWin();
    var usage = dbRetrieveBlockProfile(getMainDomain(aURI.spec));
    if (usage != -1) {
      // blocking is enabled for this domain
      if (url_history[getMainDomain(aURI.spec)] > usage) {
        w.loadURI('chrome://surfcontrol/content/ui/page_blocked.html#'+getMainDomain(aURI.spec));
      } else if (usage == 0) {
         w.loadURI('chrome://surfcontrol/content/ui/page_blocked.html#'+getMainDomain(aURI.spec))
      }
    }
  }
}

gBrowser.addProgressListener(myListener);

var urlTracker = {
  init: function() {
    var appcontent = document.getElementById("appcontent");   // browser
    if(appcontent)
      appcontent.addEventListener("DOMContentLoaded", urlTracker.onPageLoad, true);
    var messagepane = document.getElementById("messagepane"); // mail
    if(messagepane)
      messagepane.addEventListener("load", function(event) { urlTracker.onPageLoad(event); }, true);
  },
  onPageLoad: function(aEvent) {
    var profile = '';
    var toolbar_button = '';
    var other_toolbar_button = '';

    var doc = aEvent.originalTarget; // doc is document that triggered "onload" event
    var win = doc.defaultView;      

    if (win != win.top) return; //only top window
    if (win.frameElement) return; // skip iframes/frames

    var currentTab = gBrowser.contentDocument;
    var currentTab_domain = getMainDomain(currentTab.location.href);
    var domain = getMainDomain(doc.location.href);
    var referrer = getMainDomain(win.document.referrer);

    if (doc.location.href == 'chrome://surfcontrol/content/ui/index.html') {      
      if (document.getElementById("surfcontrol-rating-buttons") == null) {
        win.showtoolbarnotice=1;
      }else
        win.showtoolbarnotice=0;
      
      widget_top(win);

      var topsites = dbTopSites();
      win.init_topsites(topsites['domains'], topsites['totalMinutes'], topsites['ratings']);

      var today_timewasting = dbDateSum('bad', 'day');
      var today_neutral = dbDateSum('neutral', 'day');
      var today_productive = dbDateSum('good', 'day');
      win.init_pie_today(today_timewasting, today_neutral, today_productive);

      var week_timewasting = dbDateSum('bad', 'week');
      var week_neutral = dbDateSum('neutral', 'week');
      var week_productive = dbDateSum('good', 'week');
      win.init_pie_7days(week_timewasting, week_neutral, week_productive);

      var area = dbAreaChart();
      win.init_areagraph(area['dates'], area['bad'], area['neutral'], area['good']);
    } else if (doc.location.href == 'chrome://surfcontrol/content/ui/details.html') {
      widget_top(win);
      
      var topbadsites = dbTopSites('bad');
      var topgoodsites = dbTopSites('good');
      win.init_topsites_productive(topgoodsites['domains'], topgoodsites['totalMinutes']);
      win.init_topsites_wasting(topbadsites['domains'], topbadsites['totalMinutes']);

      var timewaster = dbTimeWaster();
      win.init_funnel(timewaster['referrers'],timewaster['targetDomains'],timewaster['timeSpent'],timewaster['totalTime']);
    } else if (doc.location.href == 'chrome://surfcontrol/content/ui/block.html') {
      var listblock = dbListBlockProfile();
      win.populate(listblock);

      function f (arr, s) {
        if (s=='limited')
          dbDeleteBlockProfile('limited');
        else
          dbDeleteBlockProfile('notlimited');

        for (i=0;i<arr.length;i++) {
          var elem = arr[i];
          var dom = getMainDomain(elem[0]);
          var limit = parseInt(elem[1])*60000;

          dbBlockProfileInsert(dom, limit);
        }
      }

      win.provideSaveCallback(f);
      win.provideGetDomain(getMainDomain);
    }

    if (!is_undefined(domain) && !is_undefined(currentTab_domain) && domain==currentTab_domain) {
      // begin timer for new domain
      current_domain = domain;
      current_ref = referrer;
      initializeNewDomain(current_domain);
      checkUsageLimit(current_domain, win);

      // get domain profile
      profile = dbDomainProfile(current_domain);
      toolbar_button = document.getElementById('surfcontrol-thumbs-up'); 
      other_toolbar_button = document.getElementById('surfcontrol-thumbs-down');

      if (profile == 'bad') {
        toolbar_button.removeAttribute('disabled');
        other_toolbar_button.disabled = "true";
      } else if (profile == 'good') {
        toolbar_button.disabled = "true";
        other_toolbar_button.removeAttribute('disabled');
      } else {
        toolbar_button.removeAttribute('disabled');
        other_toolbar_button.removeAttribute('disabled');
      }
    }
        
    // add event listener for page unload 
    aEvent.originalTarget.defaultView.addEventListener("unload", function(event){ urlTracker.onPageUnload(event); }, true);
  },

  onPageUnload: function(aEvent) {
    // do something
    var doc = aEvent.originalTarget; // doc is document that triggered "onload" event
    var win = doc.defaultView;      

    if (win != win.top) return; //only top window
    if (win.frameElement) return; // skip iframes/frames

    var currentTab = gBrowser.contentDocument;
    var currentTab_domain = getMainDomain(currentTab.location.href);
    var domain = getMainDomain(doc.location.href);
    var referrer = getMainDomain(win.document.referrer);

    // reset the referrer to blank
    current_ref = '';

    if (!is_undefined(domain) && !is_undefined(currentTab_domain) && domain==currentTab_domain) {
      // end timer for domain that was just closed
      current_domain = domain;
    }
  }
}

function tabTracker(aEvent) {
    //fix by aamir. NICE ONE
    
    var profile = '';
    var toolbar_button = '';

    var browser = gBrowser.selectedBrowser;  
    var doc = aEvent.originalTarget;
    var win = doc.defaultView;      
    
    var new_domain = getMainDomain(content.location.href);
    var referrer = getMainDomain(browser.contentWindow.document.referrer);
    // we reset the domain even if its blank
    current_domain = new_domain;
    current_ref = referrer;

    if (!is_undefined(current_domain)) {
      // begin timer for new domain
      initializeNewDomain(current_domain);
      checkUsageLimit(current_domain, win);

      // get domain profile
      profile = dbDomainProfile(current_domain);
      toolbar_button = document.getElementById('surfcontrol-thumbs-up'); 
      other_toolbar_button = document.getElementById('surfcontrol-thumbs-down');

      // set toolbar button attributes
      if (profile == 'bad') {
        toolbar_button.removeAttribute('disabled');
        other_toolbar_button.disabled = "true";
      } else if (profile == 'good') {
        toolbar_button.disabled = "true";
        other_toolbar_button.removeAttribute('disabled');
      } else {
        toolbar_button.removeAttribute('disabled');
        other_toolbar_button.removeAttribute('disabled');
      }
    }
}

function widget_top (win) {
      // day widget
      var yesterday = dbGetDayProductivity(getPreviousDate(1));
      var today = dbGetDayProductivity(getTodayDate());
      if (yesterday != 0 && today != 0) {
        var day_pct = Math.floor((today-yesterday)*100);
        win.init_widget_productivity_day(day_pct);
      }

      // week widget
      var last_week = dbGetDayRangeProductivity(getPreviousDate(14), getPreviousDate(7));
      var this_week = dbGetDayRangeProductivity(getPreviousDate(7), getTodayDate());
      if (this_week != 0 && last_week != 0) {
        var week_pct = Math.floor((this_week-last_week)*100);
        win.init_widget_productivity_week(week_pct);
      }

      win.init_widget_badsite(dbTopTimeSpent('bad'));
      win.init_widget_goodsite(dbTopTimeSpent('good'));
}

gBrowser.tabContainer.addEventListener("TabSelect", tabTracker, false);
window.addEventListener("load", function() { surfcontrol.onLoad(); }, false);
window.addEventListener("load", function() { urlTracker.init(); }, false);

// activity detection
window.addEventListener("click", function() { updateActivity(); }, false);
window.addEventListener("dblclick", function() { updateActivity(); }, false);
window.addEventListener("mousemove", function() { updateActivity(); }, false);
window.addEventListener("DOMMouseScroll", function() { updateActivity(); }, false);
window.addEventListener("keydown", function() { updateActivity(); }, false);
window.addEventListener("keypress", function() { updateActivity(); }, false);
window.addEventListener("keyup", function() { updateActivity(); }, false);

function updateActivity () {
  last_active = getCurrentTimestamp(); 
  if (inactive)
    inactive = false;
}

function checkUsageLimit (current_domain, win) {
  var usage = dbRetrieveBlockProfile(current_domain);
  if (usage != -1) {
    // blocking is enabled for this domain
    if (url_history[current_domain] > usage) {
      win.location.href='chrome://surfcontrol/content/ui/page_blocked.html#'+current_domain;
      win.setDomain(current_domain);
    } else if (usage == 0) {
      win.location.href='chrome://surfcontrol/content/ui/page_blocked.html#'+current_domain;
      win.setDomain(current_domain);
    }
  }
}

function initializeNewDomain (domain) {
  if (is_undefined(domain))
    return ;

  if (is_undefined(url_history[domain])) {
    url_history[domain] = 0;
  }
}
