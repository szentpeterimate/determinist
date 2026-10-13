"use client"

import CharMapInput from './charmapinput';
import CharSetInput from './charsetinput';
import { useEffect, useState } from 'react'
import PresetHandler from './presethandler';
import GenError from './generror';
import { dump } from 'js-toml';
import { v1, v2, v3, punctuation } from '@/modules/algorithms';

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
    const [copy, setCopy] = useState(false)

    function handlePresets(presetData) {
        setVersion(presetData.general.version)
        setPassLength(presetData.general.pass_length)

        if (presetData.general.version == 1) {
            setSpecMode(presetData.v1.spec_mode)
            if (presetData.v1.spec_mode == "insert") {
                setSpecChars(presetData.v1.spec_chars)
                setSpecFreq(presetData.v1.spec_freq)
            } else {
                setCharMap(presetData.v1.char_map)
            }
        } else if (presetData.general.version == 2) {
            setCharSet(presetData.v2.char_types)
        } else if (presetData.general.version == 3) {
            setCharSet(Object.keys(presetData.v3.char_types))
            setCharSetV3(presetData.v3.char_types)
            setDifferentiator(presetData.v3.differentiator)
        }
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

        if (copy) {
            navigator.clipboard.writeText(result)
        }

        setHash(result)
    }

    async function handlePresetGenerate() {
        let presetName = prompt("Enter a preset name")
        let presetDesc = prompt("Enter a preset description")

        if (presetName != null || presetName != "") {
            let presetTemplate = {
                "preset": {
                    "name": presetName,
                    "description": presetDesc ? presetDesc : "",
                    "is_default": false,
                },
                "general": {
                    "version": version,
                    "pass_length": passlength,
                }
            }

            if (version == 1) {
                presetTemplate.v1 = {}
                presetTemplate.v1.spec_mode = specmode

                if (specmode == "insert") {
                    presetTemplate.v1.spec_freq = specfreq
                    presetTemplate.v1.spec_chars = specchars
                } else {
                    presetTemplate.v1.char_map = charmap
                }
            } else if (version == 2) {
                presetTemplate.v2 = {}
                presetTemplate.v2.char_types = charset
            } else {
                presetTemplate.v3 = {}
                presetTemplate.v3.char_types = charsetV3
                presetTemplate.v3.differentiator = differentiator ? differentiator : ""
            }

            const tomlString = dump(presetTemplate)

            const blob = new Blob([tomlString], {type: 'text/plain;charset=utf-8'})
            const link = document.createElement("a")
            link.href = URL.createObjectURL(blob)
            link.download = presetName + ".toml"

            document.body.appendChild(link)
            link.click()

            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        }
    }

    return (
        <>
            <div className='maincard md:card m-4 mb-0 flex flex-col items-center justify-center gap-0'>
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
                                        onChange={(e) => setVersion(Number(e.target.value))}
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
                                        onChange={(e) => setPassLength(Number(e.target.value))}
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
                                <div className="flex flex-col justify-center align-center gap-2">
                                    <CharSetInput charSet={charset} defCharSetV3={charsetV3} version={version} onChange={(sets) => {version == 2 ? setCharSet(sets) : setCharSetV3(sets)} } />
                                    <div className="grid grid-rows-1 grid-cols-2">
                                        <label className=''>
                                            Differentiator
                                        </label>
                                        <div className="flex">
                                            <input
                                                className='differentiator text-base font-normal w-full'
                                                type="text" 
                                                name='differentiator' 
                                                value={differentiator}
                                                onChange={(e) => {if (e.target.value.trim() !== "") {setDifferentiator(e.target.value)} else setDifferentiator(undefined)}}
                                                autoComplete='off'
                                                required={false}
                                            />
                                        </div>
                                    </div>
                                    
                                </div>
                            :
                                null
                            }
                            <GenError version={version} error={error}></GenError>
                        </div>
                        <label className='flex flex-row gap-4 justify-center items-center'>
                            Copy to Clipboard
                            <label className='switch'>
                                <input checked={copy} onChange={() => {setCopy(!copy)}} type="checkbox" />
                                <span className='slider' />
                            </label>
                        </label>
                        <PresetHandler onChange={(presetText) => handlePresets(presetText)}/>
                        <div className="w-full h-full grid place-items-center">
                            <button className='btn text-center' type='submit'>Generate</button>
                        </div>
                    </div>
                </form>
                <button className='btn btn-secondary mt-2' onClick={handlePresetGenerate}>Export as Preset</button>
            <div>
                <div className={`card-success ${hash ? 'show' : ''}`}>
                    <p className='result font-bold'>{hash}</p>
                </div>
            </div>
            </div>
        </>
    );
}
