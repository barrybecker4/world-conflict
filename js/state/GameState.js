
export default class GameState {
    constructor (players, regions, o, temples, soldiers, c, level, move) {
        this.p = players;
        this.r = regions;
        this.o = o;  // what is o?
        this.t = temples;
        this.s = soldiers;
        this.c = c;   // cash or cost?
        this.l = level;
        this.m = move;
    }
}

