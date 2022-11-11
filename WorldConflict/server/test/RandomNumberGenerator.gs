
/**
 * This can be used to creat a deterministic sequence of random numbers.
 * To use it in unit tests, just set
 * utils.random = new RandomNumberGenerator(seed).nextRandom;
 */
class RandomNumberGenerator {

    constructor(seed) {
        this.seed = seed;
    }

    // See https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    nextRandom() {
        var t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        this.seed = ((t ^ t >>> 14) >>> 0) / 4294967296;
        return this.seed;
    }
}