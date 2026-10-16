"use client"

import { useState, useEffect } from "react"

export default function GenError({ error }) {
    const [errorText, setErrorText] = useState("")

    const Errors = {
        NO_TYPES: "At least one type of character must be selected",
        SUM_LEN: "The password length cannot be shorter than the sum of required characters"
    }

    useEffect(() => {
        switch (error) {
            case "no_types":
                setErrorText(Errors.NO_TYPES)
                break

            case "sum_len":
                setErrorText(Errors.SUM_LEN)
                break

            default:
                setErrorText("")
                break
        }
    }, [error])

    return (
        <>
        {errorText ? 
            <p className='text-red-500 mt-4 text-center'>{errorText}</p>
        :
            null
        }
        </>
    )
}