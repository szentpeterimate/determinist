import crypto from 'crypto';

export class PythonRandom {
    constructor(seed = null) {
      this.N = 624;
      this.M = 397;
      this.MATRIX_A = 0x9908b0df;
      this.UPPER_MASK = 0x80000000;
      this.LOWER_MASK = 0x7fffffff;

      this.mt = new Array(this.N);
      this.mti = this.N + 1;

      if (seed !== null) {
        this.seed(seed);
      } else {
        this.seed(Math.floor(Math.random() * 0xffffffff));
      }
    }

    init_genrand(s) {
      this.mt[0] = s >>> 0;
      for (this.mti = 1; this.mti < this.N; this.mti++) {
        let s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
        this.mt[this.mti] =
          (Math.imul(1812433253, s) + this.mti) >>> 0;
      }
    }

    _stringToBigInt(str) {
      const encoder = new TextEncoder();
      const strBytes = encoder.encode(str);

      const hash = crypto.createHash('sha512').update(strBytes).digest();

      const combined = Buffer.concat([Buffer.from(strBytes), hash]);

      let bigIntVal = 0n;
      for (const byte of combined) {
        bigIntVal = (bigIntVal << 8n) | BigInt(byte);
      }
      return bigIntVal;
    }

    seed(a) {
      let n;

      if (typeof a === 'string') {
        n = this._stringToBigInt(a);
      } else if (typeof a === 'number' || typeof a === 'bigint') {
        n = BigInt(a);
      } else {
        throw new Error("Seed must be a String, Integer, or BigInt");
      }

      let key = [];

      if (n < 0n) {
        n = -n;
      }

      if (n === 0n) {
        key = [0];
      } else {
        while (n > 0n) {
          key.push(Number(n & 0xffffffffn));
          n >>= 32n;
        }
      }

      this.init_genrand(19650218);
      let i = 1;
      let j = 0;
      let k = this.N > key.length ? this.N : key.length;

      for (; k > 0; k--) {
        let s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
        this.mt[i] =
          ((this.mt[i] ^ Math.imul(s, 1664525)) + key[j] + j) >>> 0;
        i++;
        j++;
        if (i >= this.N) {
          this.mt[0] = this.mt[this.N - 1];
          i = 1;
        }
        if (j >= key.length) j = 0;
      }

      for (k = this.N - 1; k > 0; k--) {
        let s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
        this.mt[i] =
          ((this.mt[i] ^ Math.imul(s, 1566083941)) - i) >>> 0;
        i++;
        if (i >= this.N) {
          this.mt[0] = this.mt[this.N - 1];
          i = 1;
        }
      }

      this.mt[0] = 0x80000000;
    }

    genrand_int32() {
      let y;
      const mag01 = [0x0, this.MATRIX_A];

      if (this.mti >= this.N) {
        let kk;

        for (kk = 0; kk < this.N - this.M; kk++) {
          y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
          this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        for (; kk < this.N - 1; kk++) {
          y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
          this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        y = (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
        this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

        this.mti = 0;
      }

      y = this.mt[this.mti++];

      y ^= y >>> 11;
      y ^= (y << 7) & 0x9d2c5680;
      y ^= (y << 15) & 0xefc60000;
      y ^= y >>> 18;

      return y >>> 0;
    }

    getrandbits(k) {
      if (k <= 0) throw new Error("number of bits must be > 0");
      let words = Math.floor((k - 1) / 32) + 1;
      let result = 0n;
      for (let i = 0; i < words; i++) {
        let r = BigInt(this.genrand_int32());
        if (i === words - 1 && k % 32 !== 0) {
          r >>= BigInt(32 - (k % 32));
        }
        result |= r << BigInt(i * 32);
      }
      return result;
    }

    _randbelow(n) {
      if (n <= 1) return 0;
      let k = n.toString(2).length;
      let r = Number(this.getrandbits(k));
      while (r >= n) {
        r = Number(this.getrandbits(k));
      }
      return r;
    }

    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        let j = this._randbelow(i + 1);
        let temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
      return arr;
    }
    }

    export function shuffleWithSeed(array, seed) {
    const rng = new PythonRandom(seed);
    return rng.shuffle(array);
}