# A simple GitWeb to MantisBT connection

This tool populates GitWeb pages with links to related MantisBT issues:
- for commits, shows link to the corresponding issue,
- for branches (heads), shows color indication of the  issue status, summary, and link to it.

This connection was initailly developed for use on [Open CASCADE Technology Collaborative development portal](http://dev.opencascade.org/) and tested with GitWeb 1.7.2.x and MantisBT 1.2.x. See it in action:
 - GitWeb: http://git.dev.opencascade.org/gitweb/?p=occt.git
 - MantisBT: http://tracker.dev.opencascade.org/

## Installation

To take advantage of this connection you should do 3 steps:
  1. Use naming conventions:
    - encode issue number in branch name: `git checkout -b CR0012345_v2`, where `CR` - a prefix (CR means "Contribution Request"), `0012345` - issue number in MantisBT, `v2` - suffix. A RegExp pattern for branch name is configurable.
    - include issue number in the first line of a commit message, e.g. `git commit -m "0012345: Issue Summary"`.
    
  2. Tune your configuration (bugtrackerURL, etc.) editing *bugtrackerConnection_config* variable in *bugtrackerConnection.js* file and put the file to your GitWeb directory. Plug it, e.g. by editing GitWeb *header.html* file as follows:
  `... <script src="bugtrackerConnection.js"></script> ...`

     Don't use "async" attribute of `<script>` tag.
  3. Put a *getBugsInfo.php* file to some directory on MantisBT side, e.g. `<MantisBT root>/plugins/SubsidiaryServices/php/`.

That's it!

## How it works

When a GitWeb page is loaded, the *bugtrackerConnection.js* script parses an HTML and searches for branch names and commits containing issue numbers.
This script gathers all the issue numbers and asks a *getBugsInfo.php* on MantisBT side for more information (issue subjects and statuses) in JSONP request.
Then the *bugtrackerConnection.js* script updates HTML page properly.

Please note that the described approach allows to fetch issue subject and status anonymously. It does not matter whether an issue is public or private.

## Further development

These scripts will be re-developed to use [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) instead of [JSONP](https://en.wikipedia.org/wiki/JSONP) due to limitation of the latter, which can use only GET-request with limited length.
It means also more modularity because allows to incapsulate the script to its own namespace.
