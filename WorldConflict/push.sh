#!/usr/bin/env bash
# copy common source file to client side so that they can be shared before calling "clasp push"
{ echo "<script>"; cat server/utils/utils.gs; echo "</script>"; } > client/js/utils/utils.js.html
{ echo "<script>"; cat server/utils/sequenceUtils.gs; echo "</script>"; } > client/js/utils/sequenceUtils.js.html
{ echo "<script>"; cat server/state/gameData.gs; echo "</script>"; } > client/js/state/gameData.js.html
{ echo "<script>"; cat server/state/BASE_CONSTS.gs; echo "</script>"; } > client/js/state/BASE_CONSTS.js.html
{ echo "<script>"; cat server/state/classes.gs; echo "</script>"; } > client/js/state/classes.js.html
{ echo "<script>"; cat server/state/CONSTS.gs; echo "</script>"; } > client/js/state/CONSTS.js.html
{ echo "<script>"; cat server/makeMove.gs; echo "</script>"; } > client/js/makeMove.js.html

firestore=$(<server/persistence/firestore.txt)
firestorePrivateKey=$(<server/persistence/firestorePrivateKey.txt)
echo "${firestore//%PRIVATE_KEY%/$firestorePrivateKey}" > server/persistence/firestore.gs

# append to
clasp push
