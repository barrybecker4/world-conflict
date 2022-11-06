#!/usr/bin/env bash
# copy common source file to client side so that they can be shared before calling "clasp push"
{ echo "<script>"; cat server/utils/utils.gs; echo "</script>"; } > client/js/utils/utils.js.html
{ echo "<script>"; cat server/utils/sequenceUtils.gs; echo "</script>"; } > client/js/utils/sequenceUtils.js.html
mkdir -p client/js/state
mkdir -p client/js/state/classes
{ echo "<script>"; cat server/state/gameData.gs; echo "</script>"; } > client/js/state/gameData.js.html
{ echo "<script>"; cat server/state/CONSTS.gs; echo "</script>"; } > client/js/state/CONSTS.js.html
{ echo "<script>"; cat server/makeMove.gs; echo "</script>"; } > client/js/makeMove.js.html
{ echo "<script>"; cat server/state/classes/AiPersonality.gs; echo "</script>"; } > client/js/state/classes/AiPersonality.js.html
{ echo "<script>"; cat server/state/classes/GameState.gs; echo "</script>"; } > client/js/state/classes/GameState.js.html
{ echo "<script>"; cat server/state/classes/Move.gs; echo "</script>"; } > client/js/state/classes/Move.js.html
{ echo "<script>"; cat server/state/classes/Player.gs; echo "</script>"; } > client/js/state/classes/Player.js.html
{ echo "<script>"; cat server/state/classes/Region.gs; echo "</script>"; } > client/js/state/classes/Region.js.html
{ echo "<script>"; cat server/state/classes/Temple.gs; echo "</script>"; } > client/js/state/classes/Temple.js.html
{ echo "<script>"; cat server/state/classes/Upgrade.gs; echo "</script>"; } > client/js/state/classes/Upgrade.js.html

firestore=$(<server/persistence/firestore.txt)
firestorePrivateKey=$(<server/persistence/firestorePrivateKey.txt)
echo "${firestore//%PRIVATE_KEY%/$firestorePrivateKey}" > server/persistence/firestore.gs

# append to
clasp push
