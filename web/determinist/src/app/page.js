"use client"
import Generator from "@/components/generator"
import Description from "@/components/description"

export default function Home() {
  return (
    <main className="container flex flex-col justify-center items-center gap-4">
      <div className="title m-4">
        <h1 className="text-center" id="logo">Determinist</h1>
        <p className="text-center">A deterministic password generator</p>
      </div>
      <Generator />
      <Description />
    </main>
  )
}
