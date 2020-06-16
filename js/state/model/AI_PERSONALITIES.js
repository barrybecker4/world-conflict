import UPGRADES from './UPGRADES.js';
import AiPersonality from './AiPersonality.js';

const WATER = UPGRADES.WATER;
const EARTH = UPGRADES.EARTH;
const FIRE = UPGRADES.FIRE;

// AI personalities - how eagerly it builds soldiers, and what upgrades it prefers
export default [
    new AiPersonality(1, []),
    new AiPersonality(0.2, [WATER, EARTH]),
    new AiPersonality(0.25, [WATER, FIRE, FIRE]),
    new AiPersonality(0.15, [WATER, WATER, EARTH, EARTH]),
    new AiPersonality(0.4, [WATER]),
    new AiPersonality(0.3, [WATER, WATER]),
    new AiPersonality(0.25, [FIRE, FIRE]),
    new AiPersonality(0.2, [EARTH, EARTH]),
];