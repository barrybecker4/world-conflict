
export default class Node {

    constructor(parent, activePlayer, depth, move, state, possibleMoves) {
        this.parent = parent;
        this.activePlayer = activePlayer,
        this.depth = depth;
        this.move = move;
        this.state = state;
        this.possibleMoves = possibleMoves;
        this.bestMove = null;
        this.value = null;
    }
}
