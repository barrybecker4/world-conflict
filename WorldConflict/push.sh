#!/usr/bin/env bash
# copy common source files to client side so that they can be shared before calling "clasp push"
{ echo "<script>"; cat server/utils/utils.gs; echo "</script>"; } > client/js/utils/utils.js.html
{ echo "<script>"; cat server/utils/sequenceUtils.gs; echo "</script>"; } > client/js/utils/sequenceUtils.js.html
mkdir -p client/js/state
mkdir -p client/js/state/classes
{ echo "<script>"; cat server/makeMove.gs; echo "</script>"; } > client/js/makeMove.js.html
{ echo "<script>"; cat server/state/gameData.gs; echo "</script>"; } > client/js/state/gameData.js.html
{ echo "<script>"; cat server/state/CONSTS.gs; echo "</script>"; } > client/js/state/CONSTS.js.html

declare -a CLASSES=("AiPersonality" "GameState" "Move" "AttackSequenceGenerator" "Player" "Region" "Queue" "Temple" "Upgrade")
for clazz in "${CLASSES[@]}"
do
  { echo "<script>"; cat server/state/classes/$clazz.gs; echo "</script>"; } > client/js/state/classes/$clazz.js.html
done

firestore=$(<server/persistence/firestore.txt)
firestorePrivateKey=$(<server/persistence/firestorePrivateKey.txt)
echo "${firestore//%PRIVATE_KEY%/$firestorePrivateKey}" > server/persistence/firestore.gs

# append to
clasp push
