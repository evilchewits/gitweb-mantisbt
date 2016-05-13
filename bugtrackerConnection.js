// Settings
var bugtrackerConnection_config = {
  repositories: ['occt', 'occt-wok'],                  // A list of repositories. If empty, fetches statuses for all repositories
  bugtrackerURL: 'http://tracker.dev.opencascade.org', // The link to MantisBT
  bugtrackerBackend:
    '/plugins/SubsidiaryServices/php/getBugsInfo.php', // Path to backend script on MantisBT side
  branchRegExpString: {
    prefix: 'CR',                    // RegExp for branch prefix
    bugId:  '0*([0-9]{1,7})',        // RegExp for issue ID
    suffix: '_{0,1}[-A-Za-z0-9_:.]*' // RegExp for branch suffix
  },
  branchRegExpStringExclude: '^20[0-9]{2}$', // RegExp to exclude some branches
  commitRegExpString: '0*([0-9]{3,7})',      // RegExp for detecting issue IDs in commits
  commitParseWordsLimit: 9,                  // The number of first words in a commit message to search a bugId
  packetSize: 50,                            // The number of issues in a single HTTP request
};

// Other global variables
var gitwebHeadsRows;
var gitwebHeadsRowsOffset = 0;
var gitwebShortlogRows;
var branchRegExp = new RegExp('^\\s*' + bugtrackerConnection_config.branchRegExpString.prefix + bugtrackerConnection_config.branchRegExpString.bugId + bugtrackerConnection_config.branchRegExpString.suffix + '\\s*$');
var branchRegExpSimple = new RegExp(bugtrackerConnection_config.branchRegExpString.prefix + bugtrackerConnection_config.branchRegExpString.bugId);
var branchRegExpExclude = new RegExp(bugtrackerConnection_config.branchRegExpStringExclude);
var commitRegExp = new RegExp(bugtrackerConnection_config.commitRegExpString);
var PageUtil = new PageUtil(bugtrackerConnection_config.repositories);

// Initialization
if (PageUtil.isSummaryPage() || PageUtil.isHeadsPage() || PageUtil.isShortlogPage()) {
  defineGetElementsByClassNameIE();
  document.addEventListener('DOMContentLoaded', bugtrackerConnection_init, false);
}


/**
 * Main function: run a crossdomain request about bug
 * states, update DOM (inject links to the bugtracker).
 */
function bugtrackerConnection_init() {
  // Insert links for branches
  if (PageUtil.isHeadsPage() || PageUtil.isSummaryPage()) {
    gitwebHeadsRows = document.getElementsByClassName('heads')[0].getElementsByTagName('tr');

    while (gitwebHeadsRowsOffset < gitwebHeadsRows.length) {
      var bugsString = '';
      var count = 0;

      for (var i = gitwebHeadsRowsOffset; i < gitwebHeadsRows.length
          && count < bugtrackerConnection_config.packetSize; i++
      ) {
        if (gitwebHeadsRows[i].getElementsByTagName('td').length < 3) {
          continue;
        }

        var branch = gitwebHeadsRows[i].getElementsByTagName('td')[1].getElementsByTagName('a')[0];

        if (branchRegExpSimple.test(branch)) {
          bugsString += leadingZeros(branch.innerHTML.replace(branchRegExp, _gitExtractBugId), 7);
          count++;
        }
      }

      // JSONP request
      (function () {
        var bugsInfo = document.createElement('script');
        bugsInfo.async = false;
        bugsInfo.src = bugtrackerConnection_config.bugtrackerURL
          + bugtrackerConnection_config.bugtrackerBackend
          + '?offset=' + gitwebHeadsRowsOffset + '&length='
          + (i - gitwebHeadsRowsOffset) + '&bugs=' + bugsString;
        document.getElementsByTagName('head')[0].appendChild(bugsInfo);
      })();

      gitwebHeadsRowsOffset = i;
    }
  }

  // Insert links for commits
  if (PageUtil.isShortlogPage() || PageUtil.isSummaryPage()) {
    var rowShortlogInnards; // A node with bug number info
    var currBugId = '';

    gitwebShortlogRows = document.getElementsByClassName('shortlog')[0].getElementsByTagName('tr');

    for (var i = 0; i < gitwebShortlogRows.length; i++) {
      if (gitwebShortlogRows[i].getElementsByTagName('td').length < 4) {
        continue;
      }

      rowShortlogInnards = gitwebShortlogRows[i].getElementsByTagName('td')[2].getElementsByTagName('a')[0];
      var commitMessageString = rowShortlogInnards.title ? rowShortlogInnards.title : rowShortlogInnards.innerHTML;
      var commitMessageWordsArray = commitMessageString.split(' ', bugtrackerConnection_config.commitParseWordsLimit);
      var commitMessageStringTruncated = commitMessageWordsArray.join(' ');

      if (currBugId = commitRegExp.exec(commitMessageStringTruncated)) {
        if (branchRegExpExclude.test(currBugId[1])) {
          continue;
        }

        gitwebShortlogRows[i].getElementsByTagName('td')[3].innerHTML += ' | '
          + '<a href="' + bugtrackerConnection_config.bugtrackerURL + '/view.php?id='
          + currBugId[1] + '">issue</a>';
      }
    }
  }

}

/**
 * A JSONP callback: parse bugs info and inject links into DOM.
 */
function bugtrackerConnection_callback(o) {
  var offset = parseInt(o['offset']);
  var length = parseInt(o['length']);

  for (var i = offset; i < offset + length; i++) {
    if (gitwebHeadsRows[i].getElementsByTagName('td').length < 3) {
      continue;
    }

    var branch = gitwebHeadsRows[i].getElementsByTagName('td')[1].getElementsByTagName('a')[0];
    var curBugId = branch.innerHTML.replace(branchRegExp, _gitExtractBugId);

    if (o['bugsInfo'][curBugId] !== undefined) {
      var tdBugInfoNbsp1 = document.createElement('td');
      var tdBugInfoStatus = document.createElement('td');
      var tdBugInfoNbsp2 = document.createElement('td');
      var tdBugInfoSummary = document.createElement('td');

      gitwebHeadsRows[i].appendChild(tdBugInfoNbsp1);
      gitwebHeadsRows[i].appendChild(tdBugInfoStatus);
      gitwebHeadsRows[i].appendChild(tdBugInfoNbsp2);
      gitwebHeadsRows[i].appendChild(tdBugInfoSummary);

      tdBugInfoNbsp1.innerHTML = '&#160;&#160;';
      tdBugInfoStatus.style.border = '1px dotted #808080';
      tdBugInfoStatus.style.textAlign = 'center';
      tdBugInfoStatus.style.backgroundColor = o['statuses'][o['bugsInfo'][curBugId]['status']];
      tdBugInfoStatus.innerHTML = o['bugsInfo'][curBugId]['status'];
      tdBugInfoNbsp2.innerHTML = '&#160;';
      tdBugInfoSummary.innerHTML = '<a href="' + bugtrackerConnection_config.bugtrackerURL + '/view.php?id=' + curBugId + '">' + o['bugsInfo'][curBugId]['summary'] + '</a>';
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
 * Auxiliary function: fill leading zeros.
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
  var _repositories = ( (Object.prototype.toString.call(repositories) === '[object Array]') && repositories.length > 0 ) ? repositories : undefined;
  var _repositoriesRegExpString = '';
  var _repositoriesRegExpSummaryPageString = '';
  var _repositoriesRegExp;
  var _repositoriesRegExpSummaryPage;

  if (_repositories) {
    for (var i = 0; i < _repositories.length; i++) {
      _repositoriesRegExpString += '(?:\\?p=' + _repositories[i] + '\\.git;?)|';

      _repositoriesRegExpSummaryPageString += '(?:\\?p=' + _repositories[i] + '\\.git;?$)|';
    }

    _repositoriesRegExp = new RegExp(_repositoriesRegExpString.substr(0, _repositoriesRegExpString.length - 1));
    _repositoriesRegExpSummaryPage = new RegExp(_repositoriesRegExpSummaryPageString.substr(0, _repositoriesRegExpSummaryPageString.length - 1));
  }

  var _checkRepositories = function () {
    if (_repositories) {
      return _repositoriesRegExp.test(document.location.href);
    }

    return true;
  };

  this.isSummaryPage = function () {
    return _checkRepositories() && ( /a=summary/.test(document.location.href) || _repositories && _repositoriesRegExpSummaryPage.test(document.location.href) );
  };

  this.isShortlogPage = function () {
    return _checkRepositories() && ( /a=shortlog/.test(document.location.href) );
  };

  this.isHeadsPage = function () {
    return _checkRepositories() && ( /a=heads/.test(document.location.href) );
  }
}

/**
 * Shim function: define getElementsByClassName() for IE.
 */
function defineGetElementsByClassNameIE() {
  if (document.getElementsByClassName == undefined) {
    document.getElementsByClassName = function (cl) {
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
