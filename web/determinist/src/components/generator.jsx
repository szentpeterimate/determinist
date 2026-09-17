"use client"

import argon2 from 'argon2-browser/dist/argon2-bundled.min.js'
import CharMapInput from './charmapinput';
import CharSetInput from './charsetinput';
import { useState, useEffect } from 'react'
import { PythonRandom } from './python-random'
import PresetHandler from './presethandler';
import GenError from './generror';

const encoder = new TextEncoder()
const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
const asciiLowercase = "abcdefghijklmnopqrstuvwxyz"
const asciiUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const digits = "0123456789"

export default function Generator() {
    const [masterpass, setMasterpass] = useState("")
    const [sitename, setSitename] = useState("")
    const [passlength, setPassLength] = useState(8)
    const [version, setVersion] = useState(3)
    const [specmode, setSpecMode] = useState("insert")
    const [charmap, setCharMap] = useState({})
    const [specchars, setSpecChars] = useState(punctuation)
    const [specfreq, setSpecFreq] = useState(4)
    const [charset, setCharSet] = useState(["lowercase", "uppercase", "digits", "special"])
    const [charsetV3, setCharSetV3] = useState({"lowercase": 1, "uppercase": 1, "digits": 1, "special": 1})
    const [hash, setHash] = useState("")
    const [error, setError] = useState("")
    const [differentiator, setDifferentiator] = useState(undefined)

    function handlePresets(presetData) {

        setVersion(presetData.general.version)
        setPassLength(presetData.general.pass_length)

        if (presetData.general.version == 1) {
            setSpecChars(presetData.v1.spec_chars)
            setSpecFreq(presetData.v1.spec_freq)
            setSpecMode(presetData.v1.spec_mode)
            setCharMap(presetData.v1.char_map)
        } else if (presetData.general.version == 2) {
            setCharSet(presetData.v2.char_types)
        }
    }

    async function v1(masterPass, siteName, passLength = 8, specMode = "insert", charMap = {}, specChars = punctuation, specFreq = 4) {
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

    async function v2(masterPass, siteName, passLength = 8, charTypes = ["digits", "special", "lowercase", "uppercase"]) {
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

    async function v3(masterPass, siteName, passLength = 8, charTypes = {"digits": 1, "special": 1, "lowercase": 1, "uppercase": 1}, add_info = null) {
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

    async function handleGenerate(e) {
        e.preventDefault()

        if (charset.length == 0) {
            setError("no_types")
            return
        } else {
            setError("")
        }

        let totalLength = Object.values(charsetV3).reduce((sum, value) => sum + value, 0)
        if (passlength < totalLength) {
            setError("sum_len")
            return
        } else {
            setError("")
        }

        if (totalLength == 0) {
            setError("no_types")
            return
        } else {
            setError("")
        }

        let result = ""

        if (version == 1) {
            result = await v1(masterpass, sitename, passlength, specmode, charmap, specchars, specfreq)
        } else if (version == 2) {
            result = await v2(masterpass, sitename, passlength, charset)
        } else if (version == 3) {
            result = await v3(masterpass, sitename, passlength, charsetV3, differentiator)
        }

        setHash(result)
    }

    return (
        <>
            <div className='card flex flex-col items-center justify-center gap-0'>
                <form onSubmit={handleGenerate} className='generator grid place-items-center'>
                    <div className="flex flex-col gap-2">
                        <div className='w-full h-full'>
                            <div className="maininputs mb-2 grid grid-cols-2 grid-rows-1 gap-4 w-full">
                                <label className='flex flex-col justify-center'>
                                    Master Pass
                                    <input 
                                        className='masterpass text-base font-normal'
                                        type="text" 
                                        name='masterpass' 
                                        value={masterpass}
                                        onChange={(e) => setMasterpass(e.target.value)}
                                        autoComplete='off'
                                        required={true}
                                    />
                                </label>
                                <label className='flex flex-col justify-center'>
                                    Site Name
                                    <input 
                                        className='text text-base font-normal'
                                        type="text" 
                                        name='sitename' 
                                        value={sitename}
                                        onChange={(e) => setSitename(e.target.value)}
                                        autoComplete='off'
                                        required={true}
                                    />
                                </label>
                            </div>
                            <div className="grid grid-cols-2 grid-rows-1 place-items-end gap-x-4 gap-y-2 w-full">
                                <label className='w-full'>Algorithm Version</label>
                                <div className="w-full h-full grid place-items-center">
                                    <select 
                                        name="version"
                                        value={version}
                                        onChange={(e) => setVersion(e.target.value)}
                                        required={true}
                                    >
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                        <option value={3}>3</option>
                                    </select>
                                </div>
                                <label className='w-full'>Password Length</label>
                                <div className="w-full h-full grid place-items-center">
                                    <input 
                                        className='text-base text-center w-11 h-full'
                                        type="number" 
                                        name='passlength' 
                                        value={passlength}
                                        onChange={(e) => setPassLength(e.target.value)}
                                        min={6}
                                        max={32}
                                        autoComplete='off'
                                        required={true}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="options h-min w-full">
                            {version == 1 ? 
                                <div className="v1only">
                                    <div className="grid grid-cols-2 grid-rows-1 place-items-end gap-x-4 gap-y-2 w-full h-full">
                                        <label className='w-full'>Special Character Mode</label>
                                        <div className="grid place-items-center w-full h-full">
                                            <select 
                                                className='w-fit h-full'
                                                value={specmode}
                                                name="specmode" 
                                                onChange={(e) => setSpecMode(e.target.value)} 
                                                required={true} 
                                            >
                                                <option value="insert">Insert</option>
                                                <option value="replace">Replace</option>
                                            </select>
                                        </div>
                                        {specmode == "replace" ? 
                                            <div className="flex flex-col col-span-2 w-full">
                                                <label className='w-full h-full'>Special Character Mapping</label>
                                                <div id="charmapinput">
                                                    <CharMapInput charMap={charmap} onChange={(dictResult) => setCharMap(dictResult)} />
                                                </div>
                                            </div> 
                                        :
                                            <div className="grid grid-cols-2 grid-rows-2 col-span-2 gap-2">
                                                <div className="grid grid-cols-2 grid-rows-1 gap-4 col-span-2 w-full">
                                                    <label className='w-full'>Special Characters</label>
                                                    <div className="grid place-items-center w-full h-full">
                                                        <input 
                                                            className='w-full'
                                                            type="text" 
                                                            name='specchars' 
                                                            value={specchars}
                                                            onChange={(e) => setSpecChars(e.target.value)}
                                                            placeholder="Special Characters"
                                                            autoComplete='off'
                                                            required={true}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-2 grid grid-cols-2 grid-rows-1 gap-4 place-items-end">
                                                    <label className='w-full'>Special Character Frequency</label>
                                                    <div className="grid place-items-center w-full h-full">
                                                        <input 
                                                            className='w-11 h-full text-center'
                                                            type="number" 
                                                            name='specfreq' 
                                                            value={specfreq}
                                                            onChange={(e) => setSpecFreq(e.target.value)}
                                                            autoComplete='off'
                                                            required={true}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div> 
                            : version == 2 ?
                                <CharSetInput charSet={charset} version={version} onChange={(sets) => {version == 2 ? setCharSet(sets) : setCharSetV3(sets)} } />
                            : version == 3 ?
                                <div className="">
                                    <CharSetInput charSet={charset} version={version} onChange={(sets) => {version == 2 ? setCharSet(sets) : setCharSetV3(sets)} } />
                                    <label className='flex flex-row justify-center'>
                                        Differentiator
                                        <input 
                                            className='differentiator text-base font-normal'
                                            type="text" 
                                            name='differentiator' 
                                            value={differentiator}
                                            onChange={(e) => {if (e.target.value.trim() !== "") {setDifferentiator(e.target.value)} else setDifferentiator(undefined)}}
                                            autoComplete='off'
                                            required={false}
                                        />
                                    </label>
                                </div>
                            :
                                null
                            }
                            <GenError version={version} error={error}></GenError>
                        </div>
                        <PresetHandler onChange={(presetText) => handlePresets(presetText)}/>
                        <div className="w-full h-full grid place-items-center">
                            <button className='btn text-center' type='submit'>Generate</button>
                        </div>
                    </div>
                </form>
            <div className="flex relative justify-center items-center w-full h-full">
                <div className={`card-success absolute top-6 md:top-10 lg:top-20 w-fit ${hash ? 'show' : ''}`}>
                    <p className='result font-bold'>{hash}</p>
                </div>
            </div>
            </div>
        </>
    );
}
