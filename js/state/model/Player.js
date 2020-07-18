
export default class Player {

    // params: index, name, colorStart, colorEnd, highlightStart, highlightEnd
    constructor(obj) {
        this.index = obj.index;
        this.name = obj.name;
        this.colorStart = obj.colorStart;
        this.colorEnd = obj.colorEnd;
        this.highlightStart = obj.highlightStart;
        this.highlightEnd = obj.highlightEnd;
        this.personality = null;
    }
}

