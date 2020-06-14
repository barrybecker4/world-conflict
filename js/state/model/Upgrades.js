import utils from '../../utils/utils.js';
import Upgrade from './Upgrade.js';

// Possible temple upgrades
const UPGRADES = [
    new Upgrade('Extra soldier', '', utils.map(utils.range(0, 100), function(n) { return 8 + n * 4; }), []),
    new Upgrade('X of Water', 'Income: X% more each turn.', [15, 25], [20, 40], '#66f'),
    new Upgrade('X of Fire', 'Attack: X invincible soldier(s).', [20, 30], [1, 2], '#f88'),
    new Upgrade('X of Air', 'Move: X extra move(s) per turn.', [25, 35], [1, 2], '#ffa'),
    new Upgrade('X of Earth', 'Defense: Always kill X invader(s).', [30, 45], [1, 2], '#696'),
    new Upgrade('Rebuild temple', 'Switch to a different upgrade.', [0], []),
];

export default {
     SOLDIER: UPGRADES[0],
     WATER: UPGRADES[1],
     FIRE: UPGRADES[2],
     AIR: UPGRADES[3],
     EARTH: UPGRADES[4],
     RESPECT: UPGRADES[5],

     all: UPGRADES,
}


