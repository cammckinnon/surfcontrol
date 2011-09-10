var maxTopSites = 3;
var refreshDateLimit = 99999; // number of days to track referrers
var mDBConn;
function rmrfstar(){
	dbCreateTables();
	mDBConn.executeSimpleSQL("DROP TABLE surfcontrol_dailytracker");
	mDBConn.executeSimpleSQL("DROP TABLE surfcontrol_domainprofiles");
	mDBConn.executeSimpleSQL("DROP TABLE surfcontrol_referrers");
	mDBConn.executeSimpleSQL("DROP TABLE surfcontrol_block");
	dbCreateTables();
}
function dbDomainInsertedToday (domain) {
	if (is_undefined(domain)) 
		return;

	var insertedToday = false;
	var statement = mDBConn.createStatement("SELECT * FROM surfcontrol_dailytracker WHERE domain = '"+domain+"' AND date = '"+getTodayDate()+"'");
	
	while (statement.executeStep()) {
		insertedToday = true;
		break;
	}

	return insertedToday;
}

function dbGetDayRangeProductivity (begin, end) {
	var good = 0;
	var bad = 0;

	// good
	var statement = mDBConn.createStatement("SELECT SUM(surfcontrol_dailytracker.timeSpent) as productivity FROM surfcontrol_dailytracker,surfcontrol_domainprofiles WHERE surfcontrol_dailytracker.domain=surfcontrol_domainprofiles.domain AND surfcontrol_domainprofiles.rating='good' AND surfcontrol_dailytracker.date>='"+begin+"' AND surfcontrol_dailytracker.date<='"+end+"' GROUP BY surfcontrol_dailytracker.domain ORDER BY SUM(surfcontrol_dailytracker.timeSpent) DESC");
	while (statement.executeStep()) {
		good = statement.row.productivity;
		break;
	}

	// bad
	var statement = mDBConn.createStatement("SELECT SUM(surfcontrol_dailytracker.timeSpent) as productivity FROM surfcontrol_dailytracker,surfcontrol_domainprofiles WHERE surfcontrol_dailytracker.domain=surfcontrol_domainprofiles.domain AND surfcontrol_domainprofiles.rating='bad' AND surfcontrol_dailytracker.date>='"+begin+"' AND surfcontrol_dailytracker.date<='"+end+"' GROUP BY surfcontrol_dailytracker.domain ORDER BY SUM(surfcontrol_dailytracker.timeSpent) DESC");
	while (statement.executeStep()) {
		bad = statement.row.productivity;
		break;
	}

	good = parseInt(good);
	bad = parseInt(bad);

	if (good == 0 && bad == 0)
		return 0;
	else
		return (good/(good+bad));
}

function dbGetDayProductivity (date) {
	var good = 0;
	var bad = 0;

	// good
	var statement = mDBConn.createStatement("SELECT SUM(surfcontrol_dailytracker.timeSpent) as productivity FROM surfcontrol_dailytracker,surfcontrol_domainprofiles WHERE surfcontrol_dailytracker.domain=surfcontrol_domainprofiles.domain AND surfcontrol_domainprofiles.rating='good' AND surfcontrol_dailytracker.date='"+date+"' GROUP BY surfcontrol_dailytracker.domain ORDER BY SUM(surfcontrol_dailytracker.timeSpent) DESC");
	while (statement.executeStep()) {
		good = statement.row.productivity;
		break;
	}

	// bad
	var statement = mDBConn.createStatement("SELECT SUM(surfcontrol_dailytracker.timeSpent) as productivity FROM surfcontrol_dailytracker,surfcontrol_domainprofiles WHERE surfcontrol_dailytracker.domain=surfcontrol_domainprofiles.domain AND surfcontrol_domainprofiles.rating='bad' AND surfcontrol_dailytracker.date='"+date+"' GROUP BY surfcontrol_dailytracker.domain ORDER BY SUM(surfcontrol_dailytracker.timeSpent) DESC");
	while (statement.executeStep()) {
		bad = statement.row.productivity;
		break;
	}

	good = parseInt(good);
	bad = parseInt(bad);

	if (good == 0 && bad == 0)
		return 0;
	else
		return (good/(good+bad));
}

function dbDomainProfile (domain) {
	if (is_undefined(domain)) 
    	return;

	var profile = '';
	var statement = mDBConn.createStatement("SELECT * FROM surfcontrol_domainprofiles WHERE domain = '"+domain+"'");
	while (statement.executeStep()) {
		profile = statement.row.rating;
		break;
	}

	if (is_undefined(profile))
		profile = 'neutral';

	return profile;
}

function dbDomainProfileExists (domain) {
	if (is_undefined(domain)) 
	    return;

	var profileExists = false;
	var statement = mDBConn.createStatement("SELECT * FROM surfcontrol_domainprofiles WHERE domain = '"+domain+"'");
	while (statement.executeStep()) {
		profileExists = true;
		break;
	}

  return profileExists;
}

function dbDomainReferrerExists (ref, domain) {
	if (is_undefined(domain)) 
	    return;

	var refExists = false;
	var statement = mDBConn.createStatement("SELECT * FROM surfcontrol_referrers WHERE targetDomain = '"+domain+"' AND referrer='"+ref+"'");
	while (statement.executeStep()) {
		refExists = true;
		break;
	}

  return refExists;
}

function dbPopulate () {
	var history = Array();
	var statement = mDBConn.createStatement("SELECT * FROM surfcontrol_dailytracker WHERE date = '"+getTodayDate()+"'");

	while (statement.executeStep()) {
		history[statement.row.domain] = parseInt(statement.row.timeSpent);
	}

	return history;
}

function dbUpdate (domain, timeSpent) {
	if (is_undefined(domain)) 
		return;

  	if (domain.search('#') != -1)
  		return;

	mDBConn.executeSimpleSQL("UPDATE surfcontrol_dailytracker SET timeSpent = '"+timeSpent+"' WHERE domain = '"+domain+"' AND date = '"+getTodayDate()+"'");
}

function dbInsert (domain, timeSpent) {
	if (is_undefined(domain)) 
	    return;
  
  	if (domain.search('#') != -1)
  		return;

	mDBConn.executeSimpleSQL("INSERT INTO surfcontrol_dailytracker (domain, date, timeSpent) VALUES ('"+domain+"', '"+getTodayDate()+"', "+timeSpent+")");

	if (!dbDomainProfileExists(domain)) 
		dbProfileInsert(domain, 'neutral');
}

function dbReferrerExpired (referrer, target) {
	if (is_undefined(referrer) || is_undefined(target)) 
	    return;

	var expired = false;
	var statement = mDBConn.createStatement("SELECT * FROM surfcontrol_referrers WHERE referrer = '"+referrer+"' AND targetDomain = '"+target+"' AND dateRefreshed <= '"+getPreviousDate(refreshDateLimit)+"'");
	while (statement.executeStep()) {
		expired = true;
		break;
	}	
	
	return expired;	
}

function dbReferrerInsert (referrer, target, timeSpent) {
	if (is_undefined(referrer) || is_undefined(target)) 
	    return;

	mDBConn.executeSimpleSQL("INSERT INTO surfcontrol_referrers (referrer, targetDomain, timeSpent, dateRefreshed) VALUES ('"+referrer+"', '"+target+"', '"+timeSpent+"', '"+getTodayDate()+"')");
}

function dbReferrerRetrieve (referrer, target) {
	if (is_undefined(referrer) || is_undefined(target)) 
		return;
		
	var timeSpent = 0;
	var statement = mDBConn.createStatement("SELECT timeSpent FROM surfcontrol_referrers WHERE targetDomain = '"+target+"' AND referrer='"+referrer+"'");
	while (statement.executeStep()) {
		timeSpent = parseInt(statement.row.timeSpent);
		break;
	}

	return timeSpent;
}

function dbReferrerUpdate (referrer, target, timeSpent) {
	if (is_undefined(referrer) || is_undefined(target)) 
		return;

	if (dbReferrerExpired(referrer, target)) {
		mDBConn.executeSimpleSQL("UPDATE surfcontrol_referrers SET timeSpent='"+timeSpent+"', dateRefreshed='"+getTodayDate()+"' WHERE referrer='"+referrer+"' AND targetDomain='"+target+"'");
	} else {
		var previous = dbReferrerRetrieve(referrer, target);
		mDBConn.executeSimpleSQL("UPDATE surfcontrol_referrers SET timeSpent='"+(previous+timeSpent)+"' WHERE referrer='"+referrer+"' AND targetDomain='"+target+"'");
	}
}

function dbProfileInsert (domain, rating) {
	if (is_undefined(domain)) 
	    return;
  
	mDBConn.executeSimpleSQL("INSERT INTO surfcontrol_domainprofiles(domain, rating) VALUES ('"+domain+"', '"+rating+"')");
}

function dbProfileUpdate (domain, rating) {
	if (is_undefined(domain) || is_undefined(rating)) 
		return;

	mDBConn.executeSimpleSQL("UPDATE surfcontrol_domainprofiles SET rating = '"+rating+"' WHERE domain = '"+domain+"'");
}

/**
	creates necessary tables
**/
function dbCreateTables () {
	// date is a text so it can be saved in yyyy-mm-dd format
	mDBConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS surfcontrol_dailytracker (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, date INTEGER, timeSpent INTEGER)");
	mDBConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS surfcontrol_domainprofiles (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, rating TEXT NOT NULL)");
	mDBConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS surfcontrol_referrers (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, referrer TEXT NOT NULL, targetDomain TEXT NOT NULL, timeSpent INTEGER, dateRefreshed INTEGER)");
	mDBConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS surfcontrol_block (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, allowedUsage INTEGER, dateRefreshed INTEGER)");
}

function dbListBlockProfile () {
	var list = new Array();
	var statement = mDBConn.createStatement("SELECT * FROM surfcontrol_block");

	while (statement.executeStep()) {
		var a = new Array();
		a['domain'] = statement.row.domain;
		a['limit'] = parseInt(statement.row.allowedUsage);
		
		list.push(a);
	}
	
	return list;
}

function dbResetDateBlockProfile (domain) {
	if (is_undefined(domain))
		return ;

	mDBConn.executeSimpleSQL("UPDATE surfcontrol_block SET dateRefreshed='"+getTodayDate()+"' WHERE domain='"+domain+"'");
}

function dbDeleteBlockProfile (type) {
	if (is_undefined(type)) 
		return;

	if (type == 'limited') {
		mDBConn.executeSimpleSQL("DELETE FROM surfcontrol_block WHERE allowedUsage > 0");
	} else if (type == 'notlimited') {
		mDBConn.executeSimpleSQL("DELETE FROM surfcontrol_block WHERE allowedUsage = 0");
	}
}

function dbRetrieveBlockProfile (domain) {	
	if (is_undefined(domain))
		return ;

	var allowedUsage = -1;
	var statement = mDBConn.createStatement("SELECT allowedUsage, dateRefreshed FROM surfcontrol_block WHERE domain = '"+domain+"'");
	while (statement.executeStep()) {
		allowedUsage = parseInt(statement.row.allowedUsage);
		break;
	}

	return allowedUsage;
}

function dbBlockProfileInsert (domain, allowedUsage) {
	if (is_undefined(domain)) 
	    return ;
  
  	var currentUsage = dbRetrieveBlockProfile(domain);
  	if (currentUsage == -1) {
		mDBConn.executeSimpleSQL("INSERT INTO surfcontrol_block (domain, allowedUsage, dateRefreshed) VALUES ('"+domain+"', '"+allowedUsage+"', '"+getTodayDate()+"')");
	} else {
		mDBConn.executeSimpleSQL("UPDATE surfcontrol_block SET allowedUsage='"+allowedUsage+"', dateRefreshed='"+getTodayDate()+"' WHERE domain='"+domain+"'");
	}
}

/**
	initiates db connection
**/
function dbConnect () {
	var file = Components.classes["@mozilla.org/file/directory_service;1"]
						.getService(Components.interfaces.nsIProperties)
						.get("ProfD", Components.interfaces.nsIFile);
	file.append("surfcontrol.sqlite");

	var storageService = Components.classes["@mozilla.org/storage/service;1"]
						.getService(Components.interfaces.mozIStorageService);
	mDBConn = storageService.openDatabase(file); // Will also create the file if it does not exist
}

/**
	returns the top domain for a type
	params:
		type (string): good, bad, neutral
**/
function dbTopTimeSpent (type) {
	var top = '';
	var statement = mDBConn.createStatement("SELECT surfcontrol_dailytracker.domain FROM surfcontrol_dailytracker,surfcontrol_domainprofiles WHERE surfcontrol_dailytracker.domain=surfcontrol_domainprofiles.domain AND surfcontrol_domainprofiles.rating='"+type+"' GROUP BY surfcontrol_dailytracker.domain ORDER BY SUM(surfcontrol_dailytracker.timeSpent) DESC");

	while (statement.executeStep()) {
		top = statement.row.domain;
		break;
	}

	return top;
}

/**
	returns an array of the top websites
	params:
		type (optional, string): good, bad, neutral
**/
function dbTopSites (type) {
  var count = 0;
  var top = new Array();
  var extra_where = '';
  top['domains'] = new Array();
  top['totalMinutes'] = new Array();
  top['ratings'] = new Array();

  if (!is_undefined(type)) {
	  extra_where = "AND surfcontrol_domainprofiles.rating='"+type+"'";
  }

  var statement = mDBConn.createStatement("SELECT surfcontrol_dailytracker.domain, SUM(surfcontrol_dailytracker.timeSpent) as totalMinutes, surfcontrol_domainprofiles.rating FROM surfcontrol_dailytracker, surfcontrol_domainprofiles WHERE surfcontrol_dailytracker.domain=surfcontrol_domainprofiles.domain "+extra_where+" GROUP BY surfcontrol_dailytracker.domain ORDER BY SUM(surfcontrol_dailytracker.timeSpent) DESC");

  while (statement.executeStep()) {  	
    top['domains'][count] = statement.row.domain;
    top['totalMinutes'][count] = parseFloat(statement.row.totalMinutes/60000).toFixed(2);
    top['ratings'][count] = statement.row.rating;
    count++;

    if (top['totalMinutes'][count] == 0)
    	top['totalMinutes'][count] = 0.01;

    if (count > maxTopSites) 
      break;
  }

  return top;
}

/**
	returns an array for area chart. groups by date
**/
function dbAreaChart () {
	var count = 0;
	var area = new Array();
	area['dates'] = new Array();
	area['bad'] = new Array();
	area['good'] = new Array();
	area['neutral'] = new Array();

	var statement = mDBConn.createStatement("SELECT DISTINCT date FROM surfcontrol_dailytracker");
	while (statement.executeStep()) {
		var bad = dbDateSum('bad', 'day', statement.row.date);
		var good = dbDateSum('good', 'day', statement.row.date);
		var neutral = dbDateSum('neutral', 'day', statement.row.date);		

		area['dates'][count] = revertFormat(statement.row.date);
		area['bad'][count] = bad;
		area['good'][count] = good;
		area['neutral'][count] = neutral;

		count++;
	}

	return area;
}

function dbTimeWaster () {
	var chart = new Array();
	chart['referrers'] = new Array();
	chart['targetDomains'] = new Array();
	chart['timeSpent'] = new Array();
	chart['totalTime'] = new Array();

	var statement = mDBConn.createStatement("SELECT DISTINCT referrer FROM surfcontrol_referrers LIMIT 0, 7");
	while (statement.executeStep()) {
		var a = [];
		var b = [];
		var c = [];
		var s2 = mDBConn.createStatement("SELECT *,sumtable.tss as tss FROM surfcontrol_referrers INNER JOIN surfcontrol_domainprofiles ON targetDomain = domain INNER JOIN (SELECT domain as d, targetDomain as t, SUM(timeSpent) as tss FROM surfcontrol_referrers INNER JOIN surfcontrol_domainprofiles ON t = domain WHERE referrer = '"+statement.row.referrer+"' AND rating = 'bad' LIMIT 0,5) as sumtable WHERE referrer = '"+statement.row.referrer+"' AND rating = 'bad' ORDER BY tss DESC,timeSpent DESC LIMIT 0, 5");
		var fail = 1;
		while (s2.executeStep()){
			fail=0;
			a.push(s2.row.targetDomain);
			b.push(parseFloat(s2.row.timeSpent/60000).toFixed(2));
			c = parseFloat(s2.row.tss/60000).toFixed(2);
		}
		if (!fail){
			chart['referrers'].push(statement.row.referrer);
			chart['targetDomains'].push(a);
			chart['timeSpent'].push(b);
			chart['totalTime'].push(c);
		}
	}

	return chart;
}

/**
	returns the total sum for a specific rating, type and date
	params:
		rating (string): good, bad, neutral
		type (string): day, week
**/
function dbDateSum (rating, type, date) {
	var sum = '';
	var query = "SELECT SUM(surfcontrol_dailytracker.timeSpent) as totalMinutes FROM surfcontrol_dailytracker,surfcontrol_domainprofiles WHERE surfcontrol_dailytracker.domain=surfcontrol_domainprofiles.domain AND surfcontrol_domainprofiles.rating='"+rating+"'";

	switch (type) {
		case 'day':
			if (is_undefined(date))
				query += " AND surfcontrol_dailytracker.date='"+getTodayDate()+"'";
			else
				query += " AND surfcontrol_dailytracker.date='"+date+"'";
			break;
		case 'week':
			query += " AND surfcontrol_dailytracker.date>='"+getPreviousDate(7)+"'";
			break;
	}

	var statement = mDBConn.createStatement(query);
	while (statement.executeStep()) {
		sum = parseInt(statement.row.totalMinutes/60000);
		break;
	}

	return sum;
}
