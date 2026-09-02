from argon2.low_level import Type, hash_secret
from string import punctuation, ascii_lowercase, ascii_uppercase, digits
from random import Random
from io import BytesIO

def generate(master_pass: str, site_name: str, pass_length: int, char_map: dict[str,str], char_types: list) -> str:
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