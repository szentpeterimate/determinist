from argon2.low_level import Type, hash_secret
from typing import Literal

def generate(master_pass: str, site_name: str, pass_length: int, spec_mode: Literal["replace", "insert"], char_map: dict[str, str], spec_chars: list, spec_freq: int) -> str:
    hashed_str = hash_secret(secret=master_pass.encode('utf-8'),
                                salt=site_name.encode('utf-8'),
                                time_cost=2,
                                memory_cost=65536, # Only uses 64kb of memory to save system resources
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