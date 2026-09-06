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
