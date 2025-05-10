
class Player {

    constructor(obj) {
        this.index = obj.index;
        this.originalIndex = obj.originalIndex || obj.index; // index into setup.playerTypes
        this.type = obj.type;
        this.name = obj.name;
        this.defaultName = obj.defaultName;
        this.colorStart = obj.colorStart;
        this.colorEnd = obj.colorEnd;
        this.highlightStart = obj.highlightStart;
        this.highlightEnd = obj.highlightEnd;
        this.personality = obj.personality;
    }

    getName() {
        const textName = this.getTextName();
        return textName === CONSTS.OPEN_LABEL ? '<span style="color: #ccc;"><i>' + textName + '</i></span>' : textName;
    }

    getTextName() {
        // this is a hack. should find better way. Use type if it exists, else fall back to what is in storage
        const pType = (typeof this.type === 'string') ? this.type : gameStorage.gameSetup.playerTypes[this.originalIndex];
        switch(pType) {
            case CONSTS.PLAYER_OFF:
                return '&nbsp;';
            case CONSTS.PLAYER_HUMAN_SET:
                return getTrimmedName(this.name || domUtils.userid());
            case CONSTS.PLAYER_HUMAN_OPEN:
                return CONSTS.OPEN_LABEL;
            default: return this.defaultName;
        }
        function getTrimmedName(name) {
            return (name.length > 16) ? name.substring(0, 15) + '&#8230;' : name;
        }
    }
}
