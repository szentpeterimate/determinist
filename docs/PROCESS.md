# How Determinist Works
Determinist is a **deterministic** password generator where the same inputs will always yield the same outputs. How each algorithm works is explained below.

Determinist supports three algorithm versions. For new passwords, **v3 is recommended**. The v1 and v2 algorithms are present to allow old passwords to be regenerated. 

## Algorithms

Determinist is powered by underlying generation algorithms. These algorithms are parts of major releases of Determinist and are **not** updated once they're publically available. All new features, bug and security issue fixes are released with a new algorithm version to ensure compatibility with previously generated passwords.
### v1

#### Details
- Released: 2026. 07. 24. 
- Commit hash: `248d1d9`

#### Source code
```python
from argon2.low_level import Type, hash_secret
from typing import Literal

def generate(master_pass: str, site_name: str, pass_length: int, spec_mode: Literal["replace", "insert"], char_map: dict[str, str], spec_chars: list, spec_freq: int) -> set:
    hashed_str = hash_secret(secret=master_pass.encode('utf-8'),
                             salt=site_name.encode('utf-8'),
                             time_cost=2,
                             memory_cost=65536, # Only uses 64kb of memory to save system  resources
                             parallelism=4,
                             hash_len=32,
                             type=Type.ID
                            ).decode('utf-8')
    stripped = hashed_str.split('$')[-1]

    chars_added = ""
    if spec_mode == "insert":
        for i, char in enumerate(stripped):
            chars_added += char
            if (i + 1) % spec_freq == 0:
                chars_added += spec_chars[i % len(spec_chars)]
    elif spec_mode == "replace":
        for _, char in enumerate(stripped):
            if char.lower() in char_map:
                chars_added += char_map[char.lower()]
            else:
                chars_added += char

    final_password = chars_added[-pass_length:]

    return (final_password, True)
```

#### Inputs
- `master_pass`: Your master password
- `site_name`: The name of the website you're generating a password for
- `pass_length`: Desired password length
- `spec_mode`: Special character mode
- `char_map`: Special character map
- `spec_chars`: Special characters
- `spec_freq`: Special character frequency

#### How it works
1. The master password is hashed using Argon2ID, with the site name as the salt. The returned hash is 32 bytes long. Please note that the output of Argon2ID looks something like this: `$argon2id$v=19$m=65536,t=2,p=4$VGVzdDEyMzQ$puZK9CwUrwz/xWbUfr7astwCbThDnnPb1JHb0ZHURE4`
2. The output bytes of Argon2 are turned into a string and the string is split up by dollar signs `$`, and the algorithm takes the last section which is the encrypted master password
3. After that, the characters are added to a string according to the selected special character mode:
    - In the case of `insert`, the special characters given in `spec_chars` are inserted into the string after every nth character where n is the `spec_freq` integer
    - If it is `replace`, characters are replaced by special characters according to the `char_map`
4. Finally, the algorithm cuts off the beginning of the constructed password, leaving only the generated password with the desired character count

### v2
- Released: 2026. 07. 31.
- Commit hash: `5d4c8c5`

#### Source code
```python
from argon2.low_level import Type, hash_secret
from string import punctuation, ascii_lowercase, ascii_uppercase, digits
from random import Random
from io import BytesIO

def generate(master_pass: str, site_name: str, pass_length: int, char_map: dict[str,str], char_types: list) -> set:
    types_set = set(char_types)
    charset = ""

    if "special" in types_set:
        charset += punctuation
    if "lowercase" in types_set:
        charset += ascii_lowercase
    if "uppercase" in types_set:
        charset += ascii_uppercase
    if "digits" in types_set:
        charset += digits

    charset_list = list(charset)
    salt = master_pass + site_name + str(pass_length) + str(char_map) + charset # DO NOT REMOVE! char_map is included in the salt due to it being left in. Although unused, it would change derived passwords

    random = Random(salt)
    random.shuffle(charset_list)

    hashed_bytes = hash_secret(secret=master_pass.encode('utf-8'),
                                salt=salt.encode('utf-8'),
                                time_cost=2,
                                memory_cost=65536,
                                parallelism=4,
                                hash_len=32*pass_length, # 32 * the length of the password should give more than enough bytes to pass rejection sampling
                                type=Type.ID
                            )
    stream = BytesIO(hashed_bytes) # Converts it into a byte stream for easier handling
    password = ""

    limit = 256 - (256 % len(charset_list))
    for i, _ in enumerate(hashed_bytes):
        byte = stream.getvalue()[i]
        if i == pass_length:
            break
        elif byte < limit:
            password += charset_list[byte % len(charset_list)]

    password_to_shuffle = list(password)
    random.shuffle(password_to_shuffle)
    final = "".join(password_to_shuffle)

    return (final, True)
```

#### Inputs
- `master_pass`: Your master password
- `site_name`: The name of the website you're generating a password for
- `pass_length`: Desired password length
- `char_types`: Character types that you want in your password (lowercase, uppercase, special, digits)

> Note: You can see `char_map` is present. Leaving in this input was an oversight and the value is unused, but an empty dictionary from it must be present in the constructed salt in order to keep the algorithm compatible with previously generated passwords, therefore it cannot be removed.

#### How it works
1. The `char_types` list is turned into a set for easy lookups, and the charset as well as the salt/random seed is constructed
2. The random number generator is initialized with the seed in order to produce deterministic results, and the charset is shuffled
3. The master password is hashed using Argon2ID, with the constructed seed as the salt. The returned hash is 32*`pass_length` bytes long in order to generate enough bytes to pass rejection sampling.
4. The output is converted into a byte stream, and the characters are added to the final password using rejection sampling, where if a byte's value is larger than the length of the charset, it is discarded.

    > Note: The issue with this implementation is that the password might be shorter than `pass_length` allows as bytes are discarded.
5. In the end, the password is shuffled with the same seed that was constructed in the beginning, and is returned to the user.

### v3
#### Details
- Released: 2026. 09. 06.
- Commit hash: `271e7b2`

#### Source code
```python
from argon2.low_level import Type, hash_secret_raw
from string import punctuation, ascii_lowercase, ascii_uppercase, digits
from random import Random
from io import BytesIO
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from rich import print
import re

def _construct_pass(argon2_output: bytes, charset_list: list, pass_length: int, min_chars: dict[str, int], add_info: str | None) -> str:
    stream = BytesIO(b"")
    limit = 256 - (256 % len(charset_list))
    chunk_idx = 0

    password = ""

    while len(password) < pass_length:
        byte_data = stream.read(1)

        if not byte_data:
            hkdf = HKDF(algorithm=hashes.SHA256(),
                        length=255,
                        salt=add_info.encode() if add_info else None, 
                        info=f"generation-chunk-{chunk_idx}".encode()
                        )

            stream = BytesIO(hkdf.derive(argon2_output))
            byte_data = stream.read(1)
            chunk_idx += 1

        byte = byte_data[0]

        if byte < limit:
            char = charset_list[byte % len(charset_list)]
            char_type = "lowercase" if char in ascii_lowercase else "uppercase" if char in ascii_uppercase else "digits" if char in digits else "special"

            match char_type:
                case "lowercase":
                    needed = len(re.findall(r"[a-z]", password)) < min_chars[char_type]
                case "uppercase":
                    needed = len(re.findall(r"[A-Z]", password)) < min_chars[char_type]
                case "digits":
                    needed = len(re.findall(r"[0-9]", password)) < min_chars[char_type]
                case "special":
                    needed = len(re.findall(f"[{re.escape(punctuation)}]", password)) < min_chars[char_type]

            if needed:
                password += char
            else:
                missing_total = 0
                for i in min_chars:
                    curr = len(re.findall(r"[a-z]" if i == "lowercase" else r"[A-Z]" if i == "uppercase" else r"[0-9]" if i == "digits" else f"[{re.escape(punctuation)}]", password))
                    missing_total += max(0, min_chars[i] - curr)

                slots_remaining = pass_length - len(password)

                if slots_remaining > missing_total:
                    password += char
                else:
                    pass

    return password
    
def generate(master_pass: str, site_name: str, pass_length: int, char_types: dict[str, int], add_info: str | None) -> set:

    if pass_length < sum(char_types.values()):
        return ("Password length must always be more or equal to the sum of minimum required characters.", False)
    if sum(char_types.values()) == 0:
        return ("The password must have at least one type of character.", False)

    types_set = set()
    for key, val in char_types.items():
        if val > 0:
            types_set.add(key)

    salt = master_pass + site_name + str(pass_length) + str(char_types)

    random = Random(salt)

    charset = ""
    if "special" in types_set:
        charset += punctuation
    if "lowercase" in types_set:
        charset += ascii_lowercase
    if "uppercase" in types_set:
        charset += ascii_uppercase
    if "digits" in types_set:
        charset += digits
    charset_list = list(charset)
    random.shuffle(charset_list)

    hashed_bytes = hash_secret_raw(secret=master_pass.encode('utf-8'),
                                    salt=salt.encode('utf-8'),
                                    time_cost=2,
                                    memory_cost=65536,
                                    parallelism=4,
                                    hash_len=32,
                                    type=Type.ID
                                )

    password = _construct_pass(argon2_output=hashed_bytes, charset_list=charset_list, pass_length=pass_length, min_chars=char_types, add_info=add_info)
    
    password_to_shuffle = list(password)

    random.shuffle(password_to_shuffle)

    final = "".join(password_to_shuffle)

    return (final, True)
```

#### Inputs
- `master_pass`: Your master password
- `site_name`: The name of the website you're generating a password for
- `pass_length`: Desired password length
- `char_types`: Character types that you want in your password (lowercase, uppercase, special, digits), and how many of them at minimum
- `add_info`: A string used to generate two different passwords for the same site without having to add anything to the other inputs

#### How it works
1. The inputs are validated, making sure that `pass_length` is more or equal to the minimum required characters, as well as making sure that there is at least one type of character selected
2. The charset and seed are constructed, and the charset is shuffled
3. The master password is hashed using Argon2ID, with the constructed seed as the salt. The returned hash is 32 bytes long
4. The output hash, charset, password length, minimum required characters, and differentiator are passed to a helper function
    1. The helper function handles the rejection sampling, this time using HKDF to expand the generated 32 bytes, with the differentiator being applied in the salt here
    2. The function ensures that all the character requirements are met, and only then returns the password
5. The password is shuffled, and is returned to the user.