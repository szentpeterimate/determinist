"use client"
import Generator from "../components/generator"

export default function Home() {
  return (
    <main className="container grid place-items-center gap-16">
      <div className="title">
        <h1 className="text-center" id="logo">Determinist</h1>
        <p>A deterministic password generator</p>
      </div>
      <Generator />
    </main>
  )
}
