import argon2 from 'argon2-browser/dist/argon2-bundled.min.js'
import { PythonRandom } from './python-random'

export const name = "algorithms"

const encoder = new TextEncoder()
export const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
const asciiLowercase = "abcdefghijklmnopqrstuvwxyz"
const asciiUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const digits = "0123456789"

export async function v1(masterPass, siteName, passLength = 8, specMode = "insert", charMap = {}, specChars = punctuation, specFreq = 4) {
    const hashedString = await argon2.hash({
        pass: masterPass,
        salt: siteName,
        time: 2,
        mem: 65536,
        parallelism: 4,
        hashLen: 32,
        type: argon2.ArgonType.Argon2id
    })
    const stripped = hashedString.encoded.split('$').at(-1)

    let charsAdded = ""
    if (specMode == "insert") {
        for (let i = 0; i < stripped.length; i++) {
            charsAdded += stripped[i]
            if ((i + 1) % specFreq == 0) {
                charsAdded += specChars[i % specChars.length]
            }
        }
    } else if (specMode == "replace") {
        for (let i = 0; i < stripped.length; i++) {
            if (stripped[i].toLowerCase() in charMap) {
                charsAdded += charMap[stripped[i].toLowerCase()]
            } else {
                charsAdded += stripped[i]
            }
        }
    }

    const finalPassword = charsAdded.slice(-passLength)

    return finalPassword
}

export async function v2(masterPass, siteName, passLength = 8, charTypes = ["digits", "special", "lowercase", "uppercase"]) {
    const typesSet = new Set(charTypes)
    let charSet = ""

    if (typesSet.has("special")) {
        charSet += punctuation
    }
    if (typesSet.has("lowercase")) {
        charSet += asciiLowercase
    }
    if (typesSet.has("uppercase")) {
        charSet += asciiUppercase
    }
    if (typesSet.has("digits")) {
        charSet += digits
    }

    const salt = masterPass + siteName + String(passLength) + "{}" + charSet
    
    const rng = new PythonRandom(salt)
    
    const charSetList = rng.shuffle(charSet.split(''))

    const hashedBytes = await argon2.hash({
        pass: encoder.encode(masterPass),
        salt: encoder.encode(salt),
        time: 2,
        mem: 65536,
        parallelism: 4,
        hashLen: 32*passLength,
        type: argon2.ArgonType.Argon2id
    })

    const stream = encoder.encode(hashedBytes.encoded) 

    let password = ""
    const limit = 256 - (256 % charSetList.length)
    for (let i = 0; i < stream.length; i++) {
        const byte = stream[i]
        if (password.length == passLength) {
            break
        } else if (byte < limit) {
            password += charSetList[byte % charSetList.length]
        }
    }
    let passwordToShuffle = password.split('')
    const shuffled_pass = rng.shuffle(passwordToShuffle)
    const final = shuffled_pass.join('')
    
    return final
}

async function constructV3Pass(argon2Output, charsetList, passLength, minChars, addInfo = null) {
    let stream = new Uint8Array(0)
    let streamOffset = 0
    const limit = 256 - (256 % charsetList.length)
    let chunkIdx = 0

    let password = ""

    const countTypes = (str, regex) => (str.match(regex) || []).length
    const regexes = {
        lowercase: /[a-z]/g,
        uppercase: /[A-Z]/g,
        digits: /[0-9]/g,
        special: /[^a-zA-Z0-9]/g
    }

    const importedKey = await crypto.subtle.importKey(
        "raw",
        argon2Output,
        { name: "HKDF" },
        false,
        ["deriveBits"]
    )

    while (password.length < passLength) {
        if (streamOffset >= stream.length) {
            const hkdf = await crypto.subtle.deriveBits({
                    name: "HKDF",
                    hash: "SHA-256",
                    salt: addInfo ? encoder.encode(addInfo) : new Uint8Array(0),
                    info: encoder.encode(`generation-chunk-${chunkIdx}`)
                }, 
                importedKey,
                255 * 8
            )

            stream = new Uint8Array(hkdf)
            streamOffset = 0
            chunkIdx += 1
        }

        const byte = stream[streamOffset++]

        if (byte < limit) {
            const char = charsetList[byte % charsetList.length]

            let charType = "special"
            if (asciiLowercase.includes(char)) charType = "lowercase"
            else if (asciiUppercase.includes(char)) charType = "uppercase"
            else if (digits.includes(char)) charType = "digits"
            
            const typeCount = countTypes(password, regexes[charType])
            const needed = typeCount < (minChars[charType] || 0)

            if (needed) {
                password += char
            } else {
                let missingTotal = 0
                for (const type in minChars) {
                    const curr = countTypes(password, regexes[type])
                    missingTotal += Math.max(0, minChars[type] - curr)
                }

                const slotsRemaining = passLength - password.length

                if (slotsRemaining > missingTotal) {
                    password += char
                }
            }
        }
    }

    return password
}

export async function v3(masterPass, siteName, passLength = 8, charTypes = {"digits": 1, "special": 1, "lowercase": 1, "uppercase": 1}, add_info = null) {
    const charTypesStr = "{" + Object.entries(charTypes).map(([key, val]) => `'${key}': ${val}`).join(', ') + "}";

    const typesSet = new Set()
    for (const [charType, amount] of Object.entries(charTypes)) {
        if (amount > 0) {
            typesSet.add(charType)
        }
    }

    const salt = masterPass + siteName + String(passLength) + charTypesStr

    const rng = new PythonRandom(salt)

    let charSet = ""
    if (typesSet.has("special")) {
        charSet += punctuation
    }
    if (typesSet.has("lowercase")) {
        charSet += asciiLowercase
    }
    if (typesSet.has("uppercase")) {
        charSet += asciiUppercase
    }
    if (typesSet.has("digits")) {
        charSet += digits
    }       
    const charSetList = rng.shuffle(charSet.split(''))

    const hashedBytes = await argon2.hash({
        pass: encoder.encode(masterPass),
        salt: encoder.encode(salt),
        time: 2,
        mem: 65536,
        parallelism: 4,
        hashLen: 32,
        type: argon2.ArgonType.Argon2id
    })

    const password = (await constructV3Pass(hashedBytes.hash, charSetList, passLength, charTypes, add_info)).split('')
    const shuffledPass = rng.shuffle(password)
    const final = shuffledPass.join('')

    return final
}