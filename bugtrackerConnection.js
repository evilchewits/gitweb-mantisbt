// Settings. You can tune variables in this object.
var bugtrackerConnection_config = {
	repositories: ['occt', 'occt-wok'], // A list of repositories. If empty, fetchs statuses for all repositories
	bugtrackerURL: 'http://tracker.dev.opencascade.org/', // Link to MantisBT
	bugtrackerGetBugsInfoPath: '/plugins/SubsidiaryServices/php/getBugsInfo.php', // Path to backend script on MantisBT side
	branchRegExpString: {
		prefix: 'CR',  // Branch (head) prefix
		bugId: '0*([0-9]{1,7})',   // RegExp for issue ID
		suffix: '_{0,1}[-A-Za-z0-9_:.]*' // Branch (head) suffix
	},
	branchRegExpExceptionString: '^20[0-9]{2}$', // RegExp to exclude some branches
	commitRegExpString: '0*([0-9]{3,7})', // RegExp for detecting issue IDs in commits
	commitParseWordsLimit: 9, // The number of first words in a commit message to search a bugId
	maxGetLength: 7 * 290, // 2030 bytes. Some proxies do not allow long GET requests
};

var gitwebHeadsRows;
var gitwebShortlogRows;
var branchRegExp = new RegExp('^\\s*' + bugtrackerConnection_config.branchRegExpString.prefix + bugtrackerConnection_config.branchRegExpString.bugId + bugtrackerConnection_config.branchRegExpString.suffix + '\\s*$');
var branchRegExpSimple = new RegExp(bugtrackerConnection_config.branchRegExpString.prefix + bugtrackerConnection_config.branchRegExpString.bugId);
var branchRegExpException = new RegExp(bugtrackerConnection_config.branchRegExpExceptionString);
var commitRegExp = new RegExp(bugtrackerConnection_config.commitRegExpString);
var PageUtil = new PageUtil(bugtrackerConnection_config.repositories);

// If it's a 'heads', 'summary' or 'shortlog' page initialize the script
if (PageUtil.isSummaryPage() || PageUtil.isHeadsPage() || PageUtil.isShortlogPage()) {
	defineGetElementsByClassNameIE();
	document.addEventListener('DOMContentLoaded', bugtrackerConnection_init, false);
}

/**
 * Main function: run crossdomain request about bug states, update DOM (inject links to the bugtracker).
 */
function bugtrackerConnection_init() {
	// Insert links for branches
	if ( PageUtil.isHeadsPage() || PageUtil.isSummaryPage() ) {
		var rowHeadsInnards; // A node with bug number info
		var bugsString = '';

		gitwebHeadsRows = document.getElementsByClassName('heads')[0].getElementsByTagName('tr');
	
		for ( var i = 0; i < gitwebHeadsRows.length && gitwebHeadsRows[i].className; i++ ) {
			rowHeadsInnards = gitwebHeadsRows[i].getElementsByTagName('td')[1].getElementsByTagName('a')[0];
			rowHeadsInnards.id = rowHeadsInnards.innerHTML.replace( /[^-A-Za-z0-9_:.]/, "_" ); // HTML restriction on the ID: http://www.w3.org/TR/html4/types.html#type-name
	
			if ( branchRegExpSimple.test(rowHeadsInnards) ) {
				bugsString += leadingZeros( rowHeadsInnards.innerHTML.replace( branchRegExp, _gitExtractBugId ), 7 );
			}
		}

		// We truncate a GET query string due to limitation of some proxies (~2Kb in our case)
		// In fact, it's better to configure CORS and use AJAX POST requests to avoid such a limitation
		if ( bugsString.length > bugtrackerConnection_config.maxGetLength ) {
			bugsString = bugsString.substr(0, bugtrackerConnection_config.maxGetLength); // max GET length (2030 bytes for us)
		}
	
		// JSONP request
		(function() {
			var bugsInfo = document.createElement('script'); bugsInfo.async = true;
			bugsInfo.src = bugtrackerConnection_config.bugtrackerURL + bugtrackerConnection_config.bugtrackerGetBugsInfoPath + '?bugs=' + bugsString;
			bugsInfo.id = 'bugsInfo';
			document.getElementsByTagName('head')[0].appendChild(bugsInfo);
		})();
	}

	// Insert links for commits
	if ( PageUtil.isShortlogPage() || PageUtil.isSummaryPage() ) {
		var rowShortlogInnards; // A node with bug number info
		var currBugId = '';
		var tempCurrBugId;
	
		gitwebShortlogRows = document.getElementsByClassName('shortlog')[0].getElementsByTagName('tr');
	
		for ( var i = 0; i < gitwebShortlogRows.length && gitwebShortlogRows[i].className; i++ ) {
			rowShortlogInnards = gitwebShortlogRows[i].getElementsByTagName('td')[2].getElementsByTagName('a')[0];
			var commitMessageString = rowShortlogInnards.title ? rowShortlogInnards.title : rowShortlogInnards.innerHTML;
			var commitMessageWordsArray = commitMessageString.split(' ', bugtrackerConnection_config.commitParseWordsLimit);
			var commitMessageStringTruncated = commitMessageWordsArray.join(' ');
	
			if ( currBugId = commitRegExp.exec( commitMessageStringTruncated ) ) {
				if ( branchRegExpException.test( currBugId[1] ) ) continue;
	
				gitwebShortlogRows[i].getElementsByTagName('td')[3].innerHTML += ' | ' + '<a href="' + bugtrackerConnection_config.bugtrackerURL + '/view.php?id=' + currBugId[1] + '">issue</a>';
			}
		}
	}

}

/**
 * A JSONP callback function: parse bugs info and inject links into DOM.
 */
function bugtrackerConnection_callback(o) {
	var currBugId = '';
	var row;
	var rowId;
	
	for (var i = 0; i < gitwebHeadsRows.length && gitwebHeadsRows[i].className; i++) {
		row = gitwebHeadsRows[i].getElementsByTagName('td')[1].getElementsByTagName('a')[0];
		rowId = row.id;
		currBugId = rowId.replace(branchRegExp, _gitExtractBugId);
	
		if ( o['bugsInfo'][currBugId] !== undefined ) {
			var tdBugInfoNbsp1 = document.createElement('td');
			var tdBugInfoStatus = document.createElement('td');
			var tdBugInfoNbsp2 = document.createElement('td');
			var tdBugInfoSummary = document.createElement('td');
	
			row.parentNode.parentNode.appendChild(tdBugInfoNbsp1);
			row.parentNode.parentNode.appendChild(tdBugInfoStatus);
			row.parentNode.parentNode.appendChild(tdBugInfoNbsp2);
			row.parentNode.parentNode.appendChild(tdBugInfoSummary);
	
			tdBugInfoNbsp1.innerHTML = '&#160;&#160;';
			tdBugInfoStatus.style.border = '1px dotted grey';
			tdBugInfoStatus.style.textAlign = 'center';
			tdBugInfoStatus.style.backgroundColor = o['statuses'][o['bugsInfo'][currBugId]['status']];
			tdBugInfoStatus.innerHTML = o['bugsInfo'][currBugId]['status'];
			tdBugInfoNbsp2.innerHTML = '&#160;';
			tdBugInfoSummary.innerHTML = '<a href="' + bugtrackerConnection_config.bugtrackerURL + '/view.php?id=' + currBugId + '">' + o['bugsInfo'][currBugId]['summary'] + '</a>';
		}
	}
}

/**
 * Auxiliary function: return a bug ID.
 */
function _gitExtractBugId(str, p1, p2, offset, s) {
	return p1 ? p1 : p2;
}

/**
 * Auxiliary function: fill leadins zeros.
 */
function leadingZeros(number, length) {
	while (number.toString().length < length) {
		number = '0' + number;
	}

	return number;
}

/**
 * Utility class: detect the type of current page (isSummaryPage(), isHeadsPage(), etc.).
 * Constructor may also take a list of repositories. If the list is not empty it checks
 * additionally (apart from a page is of type 'summary', 'heads', etc.) whether the page
 * belongs to some repository in that list and will return 'true' only in case of positive outcome.
 * If a repositories list is empty it will check only the type of page.
 */
function PageUtil(repositories) {
	var _repositories = ( (Object.prototype.toString.call( repositories ) === '[object Array]') && repositories.length > 0 ) ? repositories : undefined;
	var _repositoriesRegExpString = '';
	var _repositoriesRegExpSummaryPageString = '';
	var _repositoriesRegExp;
	var _repositoriesRegExpSummaryPage;
	
	if (_repositories) {
		for (var i = 0; i < _repositories.length; i++) {
			_repositoriesRegExpString += '(?:\\?p=' + _repositories[i] + '\\.git;?)|';

			_repositoriesRegExpSummaryPageString += '(?:\\?p=' + _repositories[i] + '\\.git;?$)|';
		}
		
		_repositoriesRegExp = new RegExp( _repositoriesRegExpString.substr(0, _repositoriesRegExpString.length - 1) );
		_repositoriesRegExpSummaryPage = new RegExp( _repositoriesRegExpSummaryPageString.substr(0, _repositoriesRegExpSummaryPageString.length - 1) );
	}
	
	var _checkRepositories = function() {
		if (_repositories) {
			return _repositoriesRegExp.test( document.location.href );
		}

		return true;
	};
	
	this.isSummaryPage = function() {
		return _checkRepositories() && ( /a=summary/.test( document.location.href ) || _repositories && _repositoriesRegExpSummaryPage.test( document.location.href ) );
	};
	this.isShortlogPage = function() {
		return _checkRepositories() && ( /a=shortlog/.test( document.location.href ) );
	};
	this.isHeadsPage = function() {
		return _checkRepositories() && ( /a=heads/.test( document.location.href ) );
	}
}

/**
 * Shim function: define getElementsByClassName() for IE.
 */
function defineGetElementsByClassNameIE() {
	if (document.getElementsByClassName == undefined) {
		document.getElementsByClassName = function(cl) {
			var retnode = [];
			var myclass = new RegExp('\\b' + cl + '\\b');
			var elem = this.getElementsByTagName('*');

			for (var i = 0; i < elem.length; i++) {
				var classes = elem[i].className;

				if (myclass.test(classes)) {
					retnode.push(elem[i]);
				}
			}

			return retnode;
		};
	}
}