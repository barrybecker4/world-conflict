
export default class Region {
    constructor (index, points, d, neighbors) {
        this.i = index;
        this.p = points;
        this.d = d;
        this.n = neighbors ? neighbors : [];
    }
}