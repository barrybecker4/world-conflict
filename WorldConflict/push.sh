#!/usr/bin/env bash
# copy common source file to client side so that they can be shared before calling "clasp push"
{ echo "<script>"; cat server/utils/utils.gs; echo "</script>"; } > client/js/utils/utils.js.html
{ echo "<script>"; cat server/utils/sequenceUtils.gs; echo "</script>"; } > client/js/utils/sequenceUtils.js.html

# append to
clasp push
