"use client"

import { useEffect, useState } from "react"

export default function CharSetInput({ charSet, defCharSetV3, version, onChange }) {
    const [selectedSets, setSelectedSets] = useState(charSet)
    const [charSetV3, setCharSetV3] = useState(defCharSetV3)

    if (version == 3) {
        useEffect(() => {
            setSelectedSets(Object.keys(charSetV3))
            setCharSetV3(defCharSetV3)
        }, [charSet])
        useEffect(() => {
            onChange(charSetV3)
        }, [charSetV3])
    } else {
        useEffect(() => {
            onChange(selectedSets)
        }, [selectedSets])
    }

    const handleChange = (e) => {        
        const { value, checked } = e.target
        const updatedSets = checked ? [...selectedSets, value] : selectedSets.filter(set => set !== value)
        const updatedV3Set = checked ? {...charSetV3, [value]: 1} : {...charSetV3, [value]: 0}

        setSelectedSets(updatedSets)
        setCharSetV3(updatedV3Set)

        if (version == 3) {
            onChange(updatedV3Set)
        } else {
            onChange(updatedSets)
        }

    }

    return (
        <div className="charsetinput w-full h-fit grid place-items-center">
            <div className="grid gap-1">
                <label className="w-full h-full">
                    Character Sets
                </label>
                <div className="flex flex-row justify-between align-center accent-complimentary">
                    <div className="flex flex-row justify-center items-center gap-2">
                        <input
                            type="checkbox"
                            value="lowercase"
                            checked={selectedSets.includes("lowercase")}
                            onChange={handleChange}
                        />
                        Lowercase
                    </div>
                    {version == 3 & selectedSets.includes("lowercase") ? 
                        <input 
                            className='text-base text-center w-11 h-full'
                            type="number" 
                            name='lowercase' 
                            value={charSetV3.lowercase}
                            onChange={(e) => setCharSetV3({...charSetV3, "lowercase": e.target.valueAsNumber})}
                            min={1}
                            autoComplete='off'
                            required={true}
                        />
                    : 
                        null
                    }
                </div>
                <div className="flex flex-row justify-between align-center accent-complimentary">
                    <div className="flex flex-row justify-center items-center gap-2">
                        <input
                            type="checkbox"
                            value="uppercase"
                            checked={selectedSets.includes("uppercase")}
                            onChange={handleChange}
                        />
                        Uppercase
                    </div>
                    {version == 3 & selectedSets.includes("uppercase") ? 
                        <input 
                            className='text-base text-center w-11 h-full'
                            type="number" 
                            name='uppercase' 
                            value={charSetV3.uppercase}
                            onChange={(e) => setCharSetV3({...charSetV3, "uppercase": e.target.valueAsNumber})}
                            min={1}
                            autoComplete='off'
                            required={true}
                        />
                    : 
                        null
                    }
                </div>
                <div className="flex flex-row justify-between align-center accent-complimentary">
                    <div className="flex flex-row justify-center items-center gap-2">
                        <input
                            type="checkbox"
                            value="digits"
                            checked={selectedSets.includes("digits")}
                            onChange={handleChange}
                        />
                        Digits
                    </div>
                    {version == 3 & selectedSets.includes("digits") ? 
                        <input 
                            className='text-base text-center w-11 h-full'
                            type="number" 
                            name='digits' 
                            value={charSetV3.digits}
                            onChange={(e) => setCharSetV3({...charSetV3, "digits": e.target.valueAsNumber})}
                            min={1}
                            autoComplete='off'
                            required={true}
                        />
                    : 
                        null
                    }
                </div>
                <div className="flex flex-row justify-between align-center gap-2 accent-complimentary">
                    <div className="flex flex-row justify-center items-center gap-2">
                        <input
                            type="checkbox"
                            value="special"
                            checked={selectedSets.includes("special")}
                            onChange={handleChange}
                        />
                        Special Characters
                    </div>
                    {version == 3 & selectedSets.includes("special") ? 
                        <input 
                            className='text-base text-center w-11 h-full'
                            type="number" 
                            name='special' 
                            value={charSetV3.special}
                            onChange={(e) => setCharSetV3({...charSetV3, "special": e.target.valueAsNumber})}
                            min={1}
                            autoComplete='off'
                            required={true}
                        />
                    : 
                        null
                    }
                </div>
            </div>
        </div>
    )
}