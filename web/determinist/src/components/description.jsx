export default function Description() {
    return (
        <div className="description mx-4 md:mx-0">
            <h2 className="text-center mb-4">About Determinist</h2>
            <p className="mb-8 max-w-1/2 my-0 mx-auto">Determinist is a deterministic password generator designed with ease of recovery in mind. It takes various inputs such as a master password, the name of the website you're generating a password for, and what characters you'd like, and you get a password you can recover anytime, as the same inputs will always return the exact same password.</p>
            <div className="md:card">
                <h3 className="ml-4 mt-2">Algorithms</h3>
                <div className="flex flex-col md:flex-row gap-4 mx-8 my-4">
                    <div id="v1" className="card shadow-none md:max-w-1/3">
                        <h4 className="mb-2">v1</h4>
                        <div className="ml-4">
                            <p>Version 1 of the algorithm is the first one ever created, an therefore the most basic. It has a switch for how it handles special characters: you can either choose to add them in from a list of special characters periodically, or have certain characters be replaced by one.</p>
                            <h5 className="mt-4 mb-2">Process</h5>
                            <ol className="ml-10">
                                <li>The master password is hashed using the entered website name as the salt with Argon2ID, and is turned into a string</li>
                                <li>The special characters are inserted according to the selected mode</li>
                                <li>The last n characters are returned as the password, where n is the entered password length</li>
                            </ol>
                        </div>
                    </div>
                    <div id="v2" className="card shadow-none md:max-w-1/3">
                        <h4 className="mb-2">v2</h4>
                        <div className="ml-4">
                            <p>The v2 algorithm is a major improvement over the v1 as it allows you to choose what kind of characters you'd like in your passwords. It also uses a more complex seed creation as it includes all of the inputs. Along with that, there is also a leftover variable from v1 which must now be kept in to ensure backwards compatibility.</p>
                            <h5 className="mt-4 mb-2">Process</h5>
                            <ol className="ml-10">
                                <li>The master password is hashed using the entered website name, the password length, the character set and the (obsolete) character map as the salt with Argon2ID, and is turned into bytes. It is important to note that it keeps the entire Argon2ID output, NOT just the hash</li>
                                <li>The characters are turned into a string and the password is constructed</li>
                                <li>The password is shuffled and then returned</li>
                            </ol>
                        </div>
                    </div>
                    <div id="v3" className="card shadow-none md:max-w-1/3">
                        <h4 className="mb-2">v3</h4>
                        <div className="ml-4">
                            <p>The v3 algorithm is the latest addition, having fixed all the issues I've found in v2. It uses the hash of the master password, and has multiple additions: you can choose how much of each type of character minimum you'd like, as well as enter a differentiator which will make the passwords different if the rest of the inputs are unchanged. This can be useful if you have multiple of accounts on one site, and you need to tell the difference between them.</p>
                            <h5 className="mt-4 mb-2">Process</h5>
                            <ol className="ml-10">
                                <li>The master password is hashed using the entered website name, the password length and the character sets as the salt with Argon2ID, and is passed into a helper function</li>
                                <li>The bytes of the hash are passed into HKDF which expands it into a practically unlimited amount of bytes with the differentiator as the salt.</li>
                                <li>Using rejection sampling, the function makes sure that all bytes can fit into the character set and if not, it discards them. The previous step makes sure that there are enough bytes for the password</li>
                                <li>The characters are put together to form the password, making sure that the required amount of characters are met before allowing in others</li>
                                <li>The password is passed back and shuffled, and is then returned</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}